// ============================================================================
// GOLD TRADING CHART ENGINE - MT5 Style
// ============================================================================

let canvas, ctx;
let chartData = [];
let currentTimeframe = 300; // 5 minutes
let ws = null;
let isConnected = false;

// Chart State
let zoom = 1.0;
let scroll = 0;
let crosshairEnabled = false;
let crosshairX = 0;
let crosshairY = 0;
let isDragging = false;
let lastTouchX = 0;

// Indicators State
let indicators = {
    ma: false,
    ema: false,
    bb: false,
    rsi: false,
    macd: false
};

// Chart Dimensions
let chartPadding = {
    top: 40,
    right: 60,
    bottom: 40,
    left: 10
};

// ============================================================================
// INITIALIZATION
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('chartCanvas');
    ctx = canvas.getContext('2d');
    
    // Setup canvas
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Touch/Mouse events for dragging and crosshair
    setupInteraction();
    
    // Connect to Deriv WebSocket
    connectWebSocket();
});

function resizeCanvas() {
    const container = document.getElementById('chartContainer');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    if (chartData.length > 0) drawChart();
}

// ============================================================================
// WEBSOCKET CONNECTION - REAL GOLD DATA
// ============================================================================
function connectWebSocket() {
    if (ws) ws.close();
    
    console.log('Connecting to Deriv WebSocket...');
    ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');
    
    ws.onopen = () => {
        console.log('✓ Connected to Deriv WebSocket');
        isConnected = true;
        requestCandles();
    };
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data.msg_type || 'unknown');
        
        if (data.error) {
            console.error('API Error:', data.error);
            alert('Error loading Gold data: ' + data.error.message);
            hideLoading();
            
            // Try alternative symbol
            console.log('Trying alternative symbol...');
            setTimeout(() => {
                requestCandlesAlternative();
            }, 2000);
            return;
        }
        
        if (data.candles) {
            // Historical candles received
            console.log('✓ Received candles:', data.candles.length);
            chartData = data.candles.map(c => ({
                time: c.epoch * 1000,
                o: parseFloat(c.open),
                h: parseFloat(c.high),
                l: parseFloat(c.low),
                c: parseFloat(c.close)
            }));
            
            console.log('✓ Chart data loaded, first price:', chartData[0]?.c);
            hideLoading();
            drawChart();
            updatePriceTicker();
            
            // Subscribe to live ticks
            subscribeTicks();
        } else if (data.tick) {
            // Live tick received
            console.log('✓ Live tick:', data.tick.quote);
            updateTick(parseFloat(data.tick.quote), data.tick.epoch * 1000);
        } else if (data.ohlc) {
            // Live candle update
            const candle = data.ohlc;
            updateCandle({
                time: candle.epoch * 1000,
                o: parseFloat(candle.open),
                h: parseFloat(candle.high),
                l: parseFloat(candle.low),
                c: parseFloat(candle.close)
            });
        }
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        isConnected = false;
        hideLoading();
    };
    
    ws.onclose = () => {
        console.log('WebSocket closed, will reconnect...');
        isConnected = false;
        setTimeout(connectWebSocket, 5000);
    };
}

function requestCandles() {
    console.log('Requesting Gold candles (frxGOLD)...');
    ws.send(JSON.stringify({
        ticks_history: 'frxGOLD',
        adjust_start_time: 1,
        count: 300,
        end: 'latest',
        start: 1,
        style: 'candles',
        granularity: currentTimeframe
    }));
}

function requestCandlesAlternative() {
    console.log('Requesting Gold candles (alternative: 1HZ100V)...');
    ws.send(JSON.stringify({
        ticks_history: '1HZ100V',
        adjust_start_time: 1,
        count: 300,
        end: 'latest',
        start: 1,
        style: 'candles',
        granularity: currentTimeframe
    }));
}

function subscribeTicks() {
    console.log('Subscribing to live ticks...');
    ws.send(JSON.stringify({
        ticks: 'frxGOLD',
        subscribe: 1
    }));
}

function updateTick(price, time) {
    const candleStart = Math.floor(time / (currentTimeframe * 1000)) * (currentTimeframe * 1000);
    
    if (!chartData.length || candleStart > chartData[chartData.length - 1].time) {
        chartData.push({ 
            time: candleStart, 
            o: price, 
            h: price, 
            l: price, 
            c: price 
        });
        if (chartData.length > 1000) chartData.shift();
    } else {
        const last = chartData[chartData.length - 1];
        last.c = price;
        last.h = Math.max(last.h, price);
        last.l = Math.min(last.l, price);
    }
    
    drawChart();
    updatePriceTicker();
}

function updateCandle(candle) {
    if (!chartData.length) return;
    
    const last = chartData[chartData.length - 1];
    if (candle.time === last.time) {
        chartData[chartData.length - 1] = candle;
    } else {
        chartData.push(candle);
        if (chartData.length > 1000) chartData.shift();
    }
    
    drawChart();
    updatePriceTicker();
}

// ============================================================================
// CHART DRAWING
// ============================================================================
function drawChart() {
    if (!chartData.length) return;
    
    const width = canvas.width;
    const height = canvas.height;
    const chartWidth = width - chartPadding.left - chartPadding.right;
    const chartHeight = height - chartPadding.top - chartPadding.bottom;
    
    // Clear canvas
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(0, 0, width, height);
    
    // Calculate visible candles based on zoom
    // Add 20% extra space at the end
    const effectiveChartWidth = chartWidth * 0.8; // Use only 80% of width for candles
    const visibleCandles = Math.floor(effectiveChartWidth / (4 * zoom + 2));
    const startIdx = Math.max(0, chartData.length - visibleCandles - scroll);
    const endIdx = Math.min(chartData.length, startIdx + visibleCandles);
    const visibleData = chartData.slice(startIdx, endIdx);
    
    if (visibleData.length === 0) return;
    
    // Calculate price range
    const prices = visibleData.flatMap(d => [d.h, d.l]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    const priceScale = chartHeight / priceRange;
    
    // Draw grid lines
    drawGrid(minPrice, maxPrice, priceRange, chartWidth, chartHeight);
    
    // Draw candles with 20% right padding
    const effectiveChartWidth = chartWidth * 0.8; // Use 80% of width
    const candleWidth = Math.max(2, (effectiveChartWidth / visibleData.length) - 2);
    
    visibleData.forEach((candle, i) => {
        const x = chartPadding.left + (i * (effectiveChartWidth / visibleData.length));
        drawCandle(candle, x, candleWidth, minPrice, maxPrice, priceScale);
    });
    
    // Draw indicators (with 20% right padding consideration)
    const effectiveChartWidth = chartWidth * 0.8;
    if (indicators.ma) drawMA(visibleData, effectiveChartWidth, chartHeight, minPrice, maxPrice, priceScale);
    if (indicators.ema) drawEMA(visibleData, effectiveChartWidth, chartHeight, minPrice, maxPrice, priceScale);
    if (indicators.bb) drawBollingerBands(visibleData, effectiveChartWidth, chartHeight, minPrice, maxPrice, priceScale);
    
    // Draw price scale
    drawPriceScale(minPrice, maxPrice, priceRange, width, height);
    
    // Draw time scale (with 20% right padding)
    const effectiveTimeWidth = chartWidth * 0.8;
    drawTimeScale(visibleData, effectiveTimeWidth, height);
    
    // Draw crosshair
    if (crosshairEnabled) {
        drawCrosshair(minPrice, maxPrice, priceScale, visibleData, effectiveChartWidth);
    }
}

function drawCandle(candle, x, width, minPrice, maxPrice, priceScale) {
    const yHigh = chartPadding.top + (maxPrice - candle.h) * priceScale;
    const yLow = chartPadding.top + (maxPrice - candle.l) * priceScale;
    const yOpen = chartPadding.top + (maxPrice - candle.o) * priceScale;
    const yClose = chartPadding.top + (maxPrice - candle.c) * priceScale;
    
    const isBullish = candle.c >= candle.o;
    const color = isBullish ? '#26a69a' : '#ef5350';
    
    // Draw wick
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + width / 2, yHigh);
    ctx.lineTo(x + width / 2, yLow);
    ctx.stroke();
    
    // Draw body
    ctx.fillStyle = color;
    const bodyTop = Math.min(yOpen, yClose);
    const bodyHeight = Math.abs(yClose - yOpen) || 1;
    ctx.fillRect(x, bodyTop, width, bodyHeight);
}

function drawGrid(minPrice, maxPrice, priceRange, chartWidth, chartHeight) {
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines (price levels)
    for (let i = 0; i <= 5; i++) {
        const y = chartPadding.top + (chartHeight * i / 5);
        ctx.beginPath();
        ctx.moveTo(chartPadding.left, y);
        ctx.lineTo(chartPadding.left + chartWidth, y);
        ctx.stroke();
    }
}

function drawPriceScale(minPrice, maxPrice, priceRange, width, height) {
    ctx.fillStyle = '#999';
    ctx.font = '11px Roboto';
    ctx.textAlign = 'left';
    
    for (let i = 0; i <= 5; i++) {
        const price = minPrice + (priceRange * i / 5);
        const y = chartPadding.top + height - chartPadding.bottom - chartPadding.top - ((height - chartPadding.top - chartPadding.bottom) * i / 5);
        
        // Draw price label with background
        const text = price.toFixed(2);
        const textWidth = ctx.measureText(text).width;
        
        ctx.fillStyle = '#2c2c2c';
        ctx.fillRect(width - chartPadding.right + 2, y - 8, textWidth + 8, 16);
        
        ctx.fillStyle = '#999';
        ctx.fillText(text, width - chartPadding.right + 6, y + 4);
    }
}

function drawTimeScale(visibleData, chartWidth, height) {
    if (visibleData.length === 0) return;
    
    ctx.fillStyle = '#999';
    ctx.font = '10px Roboto';
    ctx.textAlign = 'center';
    
    const numLabels = 4;
    const step = Math.floor(visibleData.length / numLabels);
    
    for (let i = 0; i < numLabels; i++) {
        const idx = i * step;
        if (idx >= visibleData.length) continue;
        
        const candle = visibleData[idx];
        const x = chartPadding.left + (idx * (chartWidth / visibleData.length));
        const time = new Date(candle.time);
        const timeStr = formatTime(time);
        
        ctx.fillText(timeStr, x, height - 10);
    }
}

function formatTime(date) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

// ============================================================================
// INDICATORS
// ============================================================================
function drawMA(data, chartWidth, chartHeight, minPrice, maxPrice, priceScale) {
    if (data.length < 20) return;
    
    const period = 20;
    ctx.strokeStyle = '#2196f3';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for (let i = period - 1; i < data.length; i++) {
        const sum = data.slice(i - period + 1, i + 1).reduce((acc, d) => acc + d.c, 0);
        const ma = sum / period;
        const x = chartPadding.left + (i * (chartWidth / data.length));
        const y = chartPadding.top + (maxPrice - ma) * priceScale;
        
        if (i === period - 1) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    
    ctx.stroke();
}

function drawEMA(data, chartWidth, chartHeight, minPrice, maxPrice, priceScale) {
    if (data.length < 2) return;
    
    const period = 12;
    const multiplier = 2 / (period + 1);
    let ema = data[0].c;
    
    ctx.strokeStyle = '#ff9800';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    data.forEach((candle, i) => {
        ema = (candle.c - ema) * multiplier + ema;
        const x = chartPadding.left + (i * (chartWidth / data.length));
        const y = chartPadding.top + (maxPrice - ema) * priceScale;
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    
    ctx.stroke();
}

function drawBollingerBands(data, chartWidth, chartHeight, minPrice, maxPrice, priceScale) {
    if (data.length < 20) return;
    
    const period = 20;
    const stdDev = 2;
    
    ctx.strokeStyle = 'rgba(156, 39, 176, 0.5)';
    ctx.lineWidth = 1;
    
    for (let i = period - 1; i < data.length; i++) {
        const slice = data.slice(i - period + 1, i + 1);
        const sum = slice.reduce((acc, d) => acc + d.c, 0);
        const ma = sum / period;
        
        const variance = slice.reduce((acc, d) => acc + Math.pow(d.c - ma, 2), 0) / period;
        const sd = Math.sqrt(variance);
        
        const upper = ma + (sd * stdDev);
        const lower = ma - (sd * stdDev);
        
        const x = chartPadding.left + (i * (chartWidth / data.length));
        const yUpper = chartPadding.top + (maxPrice - upper) * priceScale;
        const yLower = chartPadding.top + (maxPrice - lower) * priceScale;
        
        if (i === period - 1) {
            ctx.beginPath();
            ctx.moveTo(x, yUpper);
        } else {
            ctx.lineTo(x, yUpper);
        }
    }
    ctx.stroke();
    
    ctx.beginPath();
    for (let i = period - 1; i < data.length; i++) {
        const slice = data.slice(i - period + 1, i + 1);
        const sum = slice.reduce((acc, d) => acc + d.c, 0);
        const ma = sum / period;
        
        const variance = slice.reduce((acc, d) => acc + Math.pow(d.c - ma, 2), 0) / period;
        const sd = Math.sqrt(variance);
        
        const lower = ma - (sd * stdDev);
        
        const x = chartPadding.left + (i * (chartWidth / data.length));
        const yLower = chartPadding.top + (maxPrice - lower) * priceScale;
        
        if (i === period - 1) {
            ctx.moveTo(x, yLower);
        } else {
            ctx.lineTo(x, yLower);
        }
    }
    ctx.stroke();
}

// ============================================================================
// CROSSHAIR
// ============================================================================
function drawCrosshair(minPrice, maxPrice, priceScale, visibleData, chartWidth) {
    if (!crosshairX || !crosshairY) return;
    
    // Only show crosshair within the effective chart area (80% width)
    const effectiveWidth = chartWidth;
    const maxX = chartPadding.left + effectiveWidth;
    
    if (crosshairX > maxX) {
        // Don't show crosshair in the 20% padding area
        return;
    }
    
    // Draw crosshair lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    
    // Vertical line
    ctx.beginPath();
    ctx.moveTo(crosshairX, 0);
    ctx.lineTo(crosshairX, canvas.height);
    ctx.stroke();
    
    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(0, crosshairY);
    ctx.lineTo(canvas.width, crosshairY);
    ctx.stroke();
    
    ctx.setLineDash([]);
    
    // Find nearest candle and update info box
    const candleIndex = Math.floor((crosshairX - chartPadding.left) / (effectiveWidth / visibleData.length));
    if (candleIndex >= 0 && candleIndex < visibleData.length) {
        const candle = visibleData[candleIndex];
        updateCrosshairInfo(candle);
    }
}

function updateCrosshairInfo(candle) {
    document.getElementById('crossO').textContent = candle.o.toFixed(2);
    document.getElementById('crossH').textContent = candle.h.toFixed(2);
    document.getElementById('crossL').textContent = candle.l.toFixed(2);
    document.getElementById('crossC').textContent = candle.c.toFixed(2);
}

// ============================================================================
// INTERACTION
// ============================================================================
function setupInteraction() {
    // Mouse events
    canvas.addEventListener('mousedown', handleTouchStart);
    canvas.addEventListener('mousemove', handleTouchMove);
    canvas.addEventListener('mouseup', handleTouchEnd);
    canvas.addEventListener('mouseleave', handleTouchEnd);
    
    // Touch events
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchend', handleTouchEnd);
    
    // Prevent default touch behavior
    canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
}

function handleTouchStart(e) {
    const touch = e.touches ? e.touches[0] : e;
    lastTouchX = touch.clientX;
    
    if (crosshairEnabled) {
        const rect = canvas.getBoundingClientRect();
        crosshairX = touch.clientX - rect.left;
        crosshairY = touch.clientY - rect.top;
        drawChart();
    } else {
        isDragging = true;
    }
}

function handleTouchMove(e) {
    const touch = e.touches ? e.touches[0] : e;
    const rect = canvas.getBoundingClientRect();
    
    if (crosshairEnabled) {
        crosshairX = touch.clientX - rect.left;
        crosshairY = touch.clientY - rect.top;
        drawChart();
    } else if (isDragging) {
        const deltaX = touch.clientX - lastTouchX;
        const sensitivity = 0.5;
        scroll -= Math.round(deltaX * sensitivity);
        scroll = Math.max(0, Math.min(scroll, chartData.length - 10));
        lastTouchX = touch.clientX;
        drawChart();
    }
}

function handleTouchEnd(e) {
    isDragging = false;
}

// ============================================================================
// CONTROLS
// ============================================================================
window.changeTimeframe = function(tf) {
    currentTimeframe = tf;
    chartData = [];
    scroll = 0;
    
    // Update active button
    document.querySelectorAll('.tf-button').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Request new data
    if (isConnected) {
        showLoading();
        requestCandles();
    }
};

window.zoomIn = function() {
    zoom = Math.min(3.0, zoom + 0.2);
    drawChart();
};

window.zoomOut = function() {
    zoom = Math.max(0.5, zoom - 0.2);
    drawChart();
};

window.toggleCrosshair = function() {
    crosshairEnabled = !crosshairEnabled;
    const info = document.getElementById('crosshairInfo');
    
    if (crosshairEnabled) {
        info.classList.add('active');
    } else {
        info.classList.remove('active');
    }
    
    drawChart();
};

window.autoScale = function() {
    zoom = 1.0;
    scroll = 0;
    drawChart();
};

window.showIndicators = function() {
    document.getElementById('indicatorsPanel').classList.add('open');
};

window.closeIndicators = function() {
    document.getElementById('indicatorsPanel').classList.remove('open');
};

window.toggleIndicator = function(indicator) {
    indicators[indicator] = !indicators[indicator];
    const toggle = document.getElementById(indicator + 'Toggle');
    toggle.classList.toggle('active');
    drawChart();
};

window.openTrade = function() {
    window.location.href = 'gold-trade.html';
};

window.toggleTemplate = function() {
    alert('Chart templates coming soon!');
};

window.showSettings = function() {
    alert('Settings coming soon!');
};

// ============================================================================
// PRICE TICKER
// ============================================================================
function updatePriceTicker() {
    if (!chartData.length) return;
    
    const current = chartData[chartData.length - 1];
    const prev = chartData[0];
    
    const bid = current.c;
    const ask = bid + 0.05; // Typical gold spread
    const change = bid - prev.o;
    const changePercent = (change / prev.o) * 100;
    
    // Find high/low/open
    const high = Math.max(...chartData.map(d => d.h));
    const low = Math.min(...chartData.map(d => d.l));
    const open = chartData[0].o;
    
    // Update UI
    document.getElementById('bidPrice').textContent = bid.toFixed(2);
    document.getElementById('askPrice').textContent = `Ask: ${ask.toFixed(2)}`;
    
    const changeEl = document.getElementById('changeValue');
    const percentEl = document.getElementById('changePercent');
    
    changeEl.textContent = (change >= 0 ? '+' : '') + change.toFixed(2);
    percentEl.textContent = (changePercent >= 0 ? '+' : '') + changePercent.toFixed(2) + '%';
    
    changeEl.className = 'change-value ' + (change >= 0 ? 'positive' : 'negative');
    percentEl.className = 'change-percent ' + (change >= 0 ? 'positive' : 'negative');
    
    document.getElementById('highPrice').textContent = high.toFixed(2);
    document.getElementById('lowPrice').textContent = low.toFixed(2);
    document.getElementById('openPrice').textContent = open.toFixed(2);
}

// ============================================================================
// UTILITIES
// ============================================================================
function showLoading() {
    document.getElementById('loadingOverlay').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.add('hidden');
}

console.log('Gold Chart Engine Loaded');

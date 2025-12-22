// ============================================================================
// TRADING TERMINAL - REAL-TIME DATA ENGINE
// ============================================================================

// Symbol Configuration
const SYMBOLS = {
    US30: {
        name: 'US30',
        description: 'Dow Jones Industrial Average',
        apiSymbol: 'WLDUS30',
        basePrice: 38000
    },
    US100: {
        name: 'US100',
        description: 'NASDAQ 100',
        apiSymbol: 'WLDNAS100',
        basePrice: 16500
    },
    GER40: {
        name: 'GER40',
        description: 'Germany 40 (DAX)',
        apiSymbol: 'WLDGDAXI',
        basePrice: 17500
    },
    XAUUSD: {
        name: 'XAUUSD',
        description: 'Gold vs USD',
        apiSymbol: 'frxGOLD',
        basePrice: 2650
    }
};

// Global State
let canvas, ctx;
let chartData = [];
let currentSymbol = 'US30';
let currentTimeframe = 300; // 5 minutes in seconds
let ws = null;
let isConnected = false;
let retryCount = 0;
let maxRetries = 3;

// Chart Settings
let zoom = 1.0;
let scroll = 0;
let crosshairEnabled = false;
let crosshairX = 0;
let crosshairY = 0;
let isDragging = false;
let lastTouchX = 0;

const chartPadding = {
    top: 40,
    right: 70,
    bottom: 30,
    left: 10
};

// ============================================================================
// INITIALIZATION
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('chartCanvas');
    ctx = canvas.getContext('2d');
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    setupInteraction();
    connectWebSocket();
});

function resizeCanvas() {
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    if (chartData.length > 0) drawChart();
}

// ============================================================================
// WEBSOCKET CONNECTION
// ============================================================================
function connectWebSocket() {
    updateConnectionStatus(false);
    
    if (ws) {
        ws.close();
        ws = null;
    }
    
    console.log(`Connecting to Deriv WebSocket... (Attempt ${retryCount + 1}/${maxRetries})`);
    
    try {
        ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');
        
        ws.onopen = () => {
            console.log('✓ Connected to Deriv WebSocket');
            updateConnectionStatus(true);
            retryCount = 0; // Reset retry count on success
            requestCandles();
        };
        
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            if (data.error) {
                console.error('WebSocket Error:', data.error);
                
                if (retryCount < maxRetries) {
                    retryCount++;
                    handleError(data.error.message);
                } else {
                    alert(`Failed to load data after ${maxRetries} attempts. Please:\n1. Check your internet connection\n2. Try a different symbol\n3. Refresh the page`);
                    hideLoading();
                }
                return;
            }
            
            if (data.candles) {
                console.log(`✓ Received ${data.candles.length} candles for ${currentSymbol}`);
                retryCount = 0; // Reset on successful data
                processCandles(data.candles);
                hideLoading();
                subscribeTicks();
            } else if (data.tick) {
                updateTick(parseFloat(data.tick.quote), data.tick.epoch * 1000);
            } else if (data.ohlc) {
                updateOHLC(data.ohlc);
            }
        };
        
        ws.onerror = (error) => {
            console.error('WebSocket Connection Error:', error);
            updateConnectionStatus(false);
        };
        
        ws.onclose = () => {
            console.log('WebSocket closed');
            updateConnectionStatus(false);
            
            // Only auto-reconnect if we're not at max retries
            if (retryCount < maxRetries) {
                console.log('Reconnecting in 3 seconds...');
                setTimeout(connectWebSocket, 3000);
            }
        };
    } catch (error) {
        console.error('Failed to create WebSocket:', error);
        alert('Connection failed. Please check your internet connection and refresh the page.');
        hideLoading();
    }
}

function requestCandles() {
    const symbol = SYMBOLS[currentSymbol];
    
    console.log(`Requesting candles: ${symbol.apiSymbol}, timeframe: ${currentTimeframe}s`);
    
    ws.send(JSON.stringify({
        ticks_history: symbol.apiSymbol,
        adjust_start_time: 1,
        count: 500,
        end: 'latest',
        start: 1,
        style: 'candles',
        granularity: currentTimeframe
    }));
}

function subscribeTicks() {
    const symbol = SYMBOLS[currentSymbol];
    
    console.log(`Subscribing to ticks: ${symbol.apiSymbol}`);
    
    ws.send(JSON.stringify({
        ticks: symbol.apiSymbol,
        subscribe: 1
    }));
}

function processCandles(candles) {
    chartData = candles.map(c => ({
        time: c.epoch * 1000,
        o: parseFloat(c.open),
        h: parseFloat(c.high),
        l: parseFloat(c.low),
        c: parseFloat(c.close)
    }));
    
    drawChart();
    updatePriceDisplay();
}

function updateTick(price, time) {
    const candleStart = Math.floor(time / (currentTimeframe * 1000)) * (currentTimeframe * 1000);
    
    if (!chartData.length || candleStart > chartData[chartData.length - 1].time) {
        // New candle
        chartData.push({
            time: candleStart,
            o: price,
            h: price,
            l: price,
            c: price
        });
        
        if (chartData.length > 1000) chartData.shift();
    } else {
        // Update current candle
        const last = chartData[chartData.length - 1];
        last.c = price;
        last.h = Math.max(last.h, price);
        last.l = Math.min(last.l, price);
    }
    
    drawChart();
    updatePriceDisplay();
}

function updateOHLC(ohlc) {
    const candle = {
        time: ohlc.epoch * 1000,
        o: parseFloat(ohlc.open),
        h: parseFloat(ohlc.high),
        l: parseFloat(ohlc.low),
        c: parseFloat(ohlc.close)
    };
    
    if (!chartData.length) return;
    
    const last = chartData[chartData.length - 1];
    if (candle.time === last.time) {
        chartData[chartData.length - 1] = candle;
    } else {
        chartData.push(candle);
        if (chartData.length > 1000) chartData.shift();
    }
    
    drawChart();
    updatePriceDisplay();
}

function handleError(message) {
    console.error('API Error:', message);
    
    // Try alternative symbols based on current selection
    const alternatives = getAlternativeSymbols(currentSymbol);
    
    if (alternatives.length > 0) {
        console.log(`Trying alternative symbol: ${alternatives[0]}`);
        tryAlternativeSymbol(alternatives[0]);
    } else {
        alert(`Unable to load ${currentSymbol} data. Please try another symbol.`);
        hideLoading();
    }
}

function getAlternativeSymbols(symbol) {
    const alternatives = {
        'US30': ['1HZ100V', 'R_100'],     // Volatility indices as fallback
        'US100': ['1HZ100V', 'R_100'],
        'GER40': ['1HZ100V', 'R_100'],
        'XAUUSD': ['frxXAUUSD', '1HZ100V'] // Try forex gold, then volatility
    };
    
    return alternatives[symbol] || [];
}

function tryAlternativeSymbol(apiSymbol) {
    console.log(`Requesting alternative symbol: ${apiSymbol}`);
    
    ws.send(JSON.stringify({
        ticks_history: apiSymbol,
        adjust_start_time: 1,
        count: 500,
        end: 'latest',
        start: 1,
        style: 'candles',
        granularity: currentTimeframe
    }));
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
    ctx.fillStyle = '#0e0e0e';
    ctx.fillRect(0, 0, width, height);
    
    // Calculate visible candles (80% width, 20% right padding)
    const effectiveWidth = chartWidth * 0.8;
    const visibleCandles = Math.floor(effectiveWidth / (4 * zoom + 2));
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
    
    // Draw grid
    drawGrid(minPrice, maxPrice, priceRange, chartWidth, chartHeight);
    
    // Draw candles
    const candleWidth = Math.max(2, (effectiveWidth / visibleData.length) - 2);
    
    visibleData.forEach((candle, i) => {
        const x = chartPadding.left + (i * (effectiveWidth / visibleData.length));
        drawCandle(candle, x, candleWidth, minPrice, maxPrice, priceScale);
    });
    
    // Draw price scale
    drawPriceScale(minPrice, maxPrice, priceRange, width, height);
    
    // Draw time scale
    drawTimeScale(visibleData, effectiveWidth, height);
    
    // Draw crosshair
    if (crosshairEnabled) {
        drawCrosshair(minPrice, maxPrice, priceScale, visibleData, effectiveWidth);
    }
}

function drawGrid(minPrice, maxPrice, priceRange, chartWidth, chartHeight) {
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
        const y = chartPadding.top + (chartHeight * i / 5);
        ctx.beginPath();
        ctx.moveTo(chartPadding.left, y);
        ctx.lineTo(chartPadding.left + chartWidth, y);
        ctx.stroke();
    }
}

function drawCandle(candle, x, width, minPrice, maxPrice, priceScale) {
    const yHigh = chartPadding.top + (maxPrice - candle.h) * priceScale;
    const yLow = chartPadding.top + (maxPrice - candle.l) * priceScale;
    const yOpen = chartPadding.top + (maxPrice - candle.o) * priceScale;
    const yClose = chartPadding.top + (maxPrice - candle.c) * priceScale;
    
    const isBullish = candle.c >= candle.o;
    const color = isBullish ? '#00ff88' : '#ff3366';
    
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

function drawPriceScale(minPrice, maxPrice, priceRange, width, height) {
    ctx.fillStyle = '#888';
    ctx.font = '11px Roboto';
    ctx.textAlign = 'left';
    
    for (let i = 0; i <= 5; i++) {
        const price = minPrice + (priceRange * i / 5);
        const y = chartPadding.top + height - chartPadding.bottom - chartPadding.top - ((height - chartPadding.top - chartPadding.bottom) * i / 5);
        
        const text = price.toFixed(2);
        const textWidth = ctx.measureText(text).width;
        
        // Background
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(width - chartPadding.right + 2, y - 8, textWidth + 8, 16);
        
        // Text
        ctx.fillStyle = '#888';
        ctx.fillText(text, width - chartPadding.right + 6, y + 4);
    }
    
    // Current price line
    if (chartData.length > 0) {
        const currentPrice = chartData[chartData.length - 1].c;
        const y = chartPadding.top + (maxPrice - currentPrice) * (height - chartPadding.top - chartPadding.bottom) / priceRange;
        
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(chartPadding.left, y);
        ctx.lineTo(width - chartPadding.right, y);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Price label
        const text = currentPrice.toFixed(2);
        const textWidth = ctx.measureText(text).width;
        
        ctx.fillStyle = '#00ff88';
        ctx.fillRect(width - chartPadding.right + 2, y - 8, textWidth + 8, 16);
        
        ctx.fillStyle = '#0e0e0e';
        ctx.font = 'bold 11px Roboto';
        ctx.fillText(text, width - chartPadding.right + 6, y + 4);
    }
}

function drawTimeScale(visibleData, chartWidth, height) {
    if (visibleData.length === 0) return;
    
    ctx.fillStyle = '#888';
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
        const timeStr = time.getHours().toString().padStart(2, '0') + ':' + 
                       time.getMinutes().toString().padStart(2, '0');
        
        ctx.fillText(timeStr, x, height - 10);
    }
}

function drawCrosshair(minPrice, maxPrice, priceScale, visibleData, chartWidth) {
    if (!crosshairX || !crosshairY) return;
    
    const maxX = chartPadding.left + chartWidth;
    if (crosshairX > maxX) return;
    
    // Draw lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    
    ctx.beginPath();
    ctx.moveTo(crosshairX, 0);
    ctx.lineTo(crosshairX, canvas.height);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(0, crosshairY);
    ctx.lineTo(canvas.width, crosshairY);
    ctx.stroke();
    
    ctx.setLineDash([]);
    
    // Find candle at crosshair
    const candleIndex = Math.floor((crosshairX - chartPadding.left) / (chartWidth / visibleData.length));
    if (candleIndex >= 0 && candleIndex < visibleData.length) {
        const candle = visibleData[candleIndex];
        updateInfoBox(candle);
    }
}

function updateInfoBox(candle) {
    document.getElementById('infoOpen').textContent = candle.o.toFixed(2);
    document.getElementById('infoHigh').textContent = candle.h.toFixed(2);
    document.getElementById('infoLow').textContent = candle.l.toFixed(2);
    document.getElementById('infoClose').textContent = candle.c.toFixed(2);
}

// ============================================================================
// INTERACTION
// ============================================================================
function setupInteraction() {
    canvas.addEventListener('mousedown', handleTouchStart);
    canvas.addEventListener('mousemove', handleTouchMove);
    canvas.addEventListener('mouseup', handleTouchEnd);
    canvas.addEventListener('mouseleave', handleTouchEnd);
    
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchend', handleTouchEnd);
    
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
        scroll += Math.round(deltaX * 0.5); // Natural scrolling (not inverse)
        scroll = Math.max(0, Math.min(scroll, chartData.length - 10));
        lastTouchX = touch.clientX;
        drawChart();
    }
}

function handleTouchEnd(e) {
    isDragging = false;
}

// ============================================================================
// UI CONTROLS
// ============================================================================
window.changeSymbol = function() {
    currentSymbol = document.getElementById('symbolSelector').value;
    chartData = [];
    scroll = 0;
    retryCount = 0; // Reset retry count for new symbol
    
    showLoading();
    
    if (isConnected) {
        requestCandles();
    } else {
        connectWebSocket();
    }
};

window.changeTimeframe = function(tf) {
    currentTimeframe = tf;
    chartData = [];
    scroll = 0;
    retryCount = 0; // Reset retry count for new timeframe
    
    // Update active button
    document.querySelectorAll('.tf-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    showLoading();
    
    if (isConnected) {
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
    const btn = document.getElementById('crosshairBtn');
    const infoBox = document.getElementById('infoBox');
    
    if (crosshairEnabled) {
        btn.classList.add('active');
        infoBox.classList.add('visible');
    } else {
        btn.classList.remove('active');
        infoBox.classList.remove('visible');
    }
    
    drawChart();
};

window.resetView = function() {
    zoom = 1.0;
    scroll = 0;
    drawChart();
};

// ============================================================================
// UI UPDATES
// ============================================================================
function updatePriceDisplay() {
    if (!chartData.length) return;
    
    const current = chartData[chartData.length - 1];
    const prev = chartData[0];
    
    const price = current.c;
    const change = price - prev.o;
    const changePercent = (change / prev.o) * 100;
    
    document.getElementById('currentPrice').textContent = price.toFixed(2);
    
    const changeEl = document.getElementById('priceChange');
    changeEl.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`;
    changeEl.className = 'price-change ' + (change >= 0 ? 'positive' : 'negative');
}

function updateConnectionStatus(connected) {
    isConnected = connected;
    const status = document.getElementById('connectionStatus');
    
    if (connected) {
        status.classList.remove('disconnected');
    } else {
        status.classList.add('disconnected');
    }
}

function showLoading() {
    document.getElementById('loadingOverlay').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.add('hidden');
}

console.log('Trading Terminal Loaded');

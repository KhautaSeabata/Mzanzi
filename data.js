// ============================================================================
// GOLD TRADING TERMINAL - DERIV DATA ONLY
// ============================================================================

// Gold Configuration
const GOLD_SYMBOL = 'frxGOLD'; // Deriv Gold symbol
const BACKUP_SYMBOL = 'frxXAUUSD'; // Backup if primary fails

// Global State
let canvas, ctx;
let chartData = [];
let currentTimeframe = 300; // 5 minutes
let ws = null;
let isConnected = false;
let useBackupSymbol = false;

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
    
    console.log('🏅 Gold Trading Terminal Starting...');
    console.log(`📊 Symbol: ${GOLD_SYMBOL}`);
    
    // Check internet connection
    if (!navigator.onLine) {
        alert('No internet connection detected.\n\nPlease connect to the internet and refresh the page.');
        hideLoading();
        return;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    setupInteraction();
    connectWebSocket();
});

function handleOnline() {
    console.log('🌐 Internet connection restored');
    if (!isConnected && chartData.length === 0) {
        alert('Connection restored! Reconnecting...');
        connectWebSocket();
    }
}

function handleOffline() {
    console.log('📡 Internet connection lost');
    updateConnectionStatus(false);
    alert('Internet connection lost.\n\nPlease check your connection.');
}

function resizeCanvas() {
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    if (chartData.length > 0) drawChart();
}

// ============================================================================
// WEBSOCKET CONNECTION - DERIV ONLY
// ============================================================================
function connectWebSocket() {
    updateConnectionStatus(false);
    
    if (ws) {
        ws.close();
        ws = null;
    }
    
    console.log('🔌 Connecting to Deriv WebSocket...');
    showLoading();
    
    try {
        ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');
        
        // Set timeout for connection
        const connectionTimeout = setTimeout(() => {
            if (!isConnected) {
                console.error('❌ Connection timeout');
                ws.close();
                retryConnection();
            }
        }, 10000); // 10 second timeout
        
        ws.onopen = () => {
            clearTimeout(connectionTimeout);
            console.log('✅ Connected to Deriv');
            updateConnectionStatus(true);
            requestCandles();
        };
        
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            if (data.error) {
                console.error('❌ Deriv Error:', data.error.message);
                
                // Try backup symbol if primary fails
                if (!useBackupSymbol && data.error.code !== 'RateLimit') {
                    console.log('⚠️ Trying backup symbol:', BACKUP_SYMBOL);
                    useBackupSymbol = true;
                    setTimeout(() => requestCandles(), 1000);
                } else {
                    hideLoading();
                    alert('Unable to load Gold data from Deriv.\n\nError: ' + data.error.message + '\n\nPlease:\n• Check your internet connection\n• Wait a moment and refresh\n• Try again later');
                }
                return;
            }
            
            if (data.candles) {
                if (data.candles.length === 0) {
                    console.warn('⚠️ No candles received');
                    if (!useBackupSymbol) {
                        useBackupSymbol = true;
                        requestCandles();
                    }
                    return;
                }
                
                console.log(`✅ Received ${data.candles.length} candles`);
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
            clearTimeout(connectionTimeout);
            console.error('❌ WebSocket Error:', error);
            updateConnectionStatus(false);
            hideLoading();
            retryConnection();
        };
        
        ws.onclose = (event) => {
            clearTimeout(connectionTimeout);
            console.log('🔌 WebSocket closed', event.code, event.reason);
            updateConnectionStatus(false);
            
            // Auto-reconnect after 3 seconds if we have data
            if (chartData.length > 0) {
                setTimeout(() => {
                    if (!isConnected) {
                        console.log('🔄 Attempting to reconnect...');
                        connectWebSocket();
                    }
                }, 3000);
            } else {
                retryConnection();
            }
        };
        
    } catch (error) {
        console.error('❌ Failed to create WebSocket:', error);
        hideLoading();
        alert('Connection failed.\n\nError: ' + error.message + '\n\nPlease check your internet and refresh the page.');
    }
}

let retryAttempts = 0;
const maxRetries = 3;

function retryConnection() {
    if (retryAttempts < maxRetries) {
        retryAttempts++;
        const delay = retryAttempts * 2000; // 2s, 4s, 6s
        console.log(`🔄 Retry ${retryAttempts}/${maxRetries} in ${delay/1000}s...`);
        
        setTimeout(() => {
            connectWebSocket();
        }, delay);
    } else {
        hideLoading();
        alert('Unable to connect to Deriv after ' + maxRetries + ' attempts.\n\nPlease:\n• Check your internet connection\n• Disable any VPN or proxy\n• Refresh the page\n• Try again later');
        retryAttempts = 0;
    }
}

function requestCandles() {
    const symbol = useBackupSymbol ? BACKUP_SYMBOL : GOLD_SYMBOL;
    
    console.log(`📊 Requesting candles: ${symbol}, Timeframe: ${currentTimeframe}s`);
    
    ws.send(JSON.stringify({
        ticks_history: symbol,
        adjust_start_time: 1,
        count: 500,
        end: 'latest',
        start: 1,
        style: 'candles',
        granularity: currentTimeframe
    }));
}

function subscribeTicks() {
    const symbol = useBackupSymbol ? BACKUP_SYMBOL : GOLD_SYMBOL;
    
    console.log(`📡 Subscribing to live ticks: ${symbol}`);
    
    ws.send(JSON.stringify({
        ticks: symbol,
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
    
    retryAttempts = 0; // Reset retry counter on success
    console.log(`✅ Chart data loaded: ${chartData.length} candles`);
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
        const y = chartPadding.top + height - chartPadding.bottom - chartPadding.top - 
                  ((height - chartPadding.top - chartPadding.bottom) * i / 5);
        
        const text = price.toFixed(2);
        const textWidth = ctx.measureText(text).width;
        
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(width - chartPadding.right + 2, y - 8, textWidth + 8, 16);
        
        ctx.fillStyle = '#888';
        ctx.fillText(text, width - chartPadding.right + 6, y + 4);
    }
    
    // Current price line
    if (chartData.length > 0) {
        const currentPrice = chartData[chartData.length - 1].c;
        const chartH = height - chartPadding.top - chartPadding.bottom;
        const y = chartPadding.top + (maxPrice - currentPrice) * chartH / priceRange;
        
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(chartPadding.left, y);
        ctx.lineTo(width - chartPadding.right, y);
        ctx.stroke();
        ctx.setLineDash([]);
        
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
        scroll += Math.round(deltaX * 0.5); // Natural scrolling
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
window.changeTimeframe = function(tf) {
    currentTimeframe = tf;
    chartData = [];
    scroll = 0;
    
    document.querySelectorAll('.tf-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    showLoading();
    
    if (isConnected) {
        // Unsubscribe from old timeframe
        ws.send(JSON.stringify({ forget_all: 'ticks' }));
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

console.log('🏅 Gold Trading Terminal Loaded - Deriv Data Only');

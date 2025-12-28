// ============================================================================
// MULTI-CURRENCY TRADING TERMINAL - DERIV WEBSOCKET ENGINE
// Supports: Gold, Silver, Major & Minor Forex Pairs
// ============================================================================

// Symbol Configuration with Deriv API mapping
const SYMBOLS = {
    // Precious Metals
    'XAUUSD': { 
        name: 'Gold / US Dollar', 
        apiSymbol: 'frxXAUUSD',
        category: 'metals',
        basePrice: 2650
    },
    'XAGUSD': { 
        name: 'Silver / US Dollar', 
        apiSymbol: 'frxXAGUSD',
        category: 'metals',
        basePrice: 30
    },
    
    // Major Pairs
    'EURUSD': { 
        name: 'Euro / US Dollar', 
        apiSymbol: 'frxEURUSD',
        category: 'major',
        basePrice: 1.10
    },
    'GBPUSD': { 
        name: 'British Pound / US Dollar', 
        apiSymbol: 'frxGBPUSD',
        category: 'major',
        basePrice: 1.27
    },
    'USDJPY': { 
        name: 'US Dollar / Japanese Yen', 
        apiSymbol: 'frxUSDJPY',
        category: 'major',
        basePrice: 149
    },
    'USDCHF': { 
        name: 'US Dollar / Swiss Franc', 
        apiSymbol: 'frxUSDCHF',
        category: 'major',
        basePrice: 0.88
    },
    'AUDUSD': { 
        name: 'Australian Dollar / US Dollar', 
        apiSymbol: 'frxAUDUSD',
        category: 'major',
        basePrice: 0.64
    },
    'USDCAD': { 
        name: 'US Dollar / Canadian Dollar', 
        apiSymbol: 'frxUSDCAD',
        category: 'major',
        basePrice: 1.43
    },
    'NZDUSD': { 
        name: 'New Zealand Dollar / US Dollar', 
        apiSymbol: 'frxNZDUSD',
        category: 'major',
        basePrice: 0.57
    },
    
    // Minor Pairs (Cross Pairs)
    'EURGBP': { 
        name: 'Euro / British Pound', 
        apiSymbol: 'frxEURGBP',
        category: 'minor',
        basePrice: 0.87
    },
    'EURJPY': { 
        name: 'Euro / Japanese Yen', 
        apiSymbol: 'frxEURJPY',
        category: 'minor',
        basePrice: 163
    },
    'GBPJPY': { 
        name: 'British Pound / Japanese Yen', 
        apiSymbol: 'frxGBPJPY',
        category: 'minor',
        basePrice: 189
    },
    'EURCHF': { 
        name: 'Euro / Swiss Franc', 
        apiSymbol: 'frxEURCHF',
        category: 'minor',
        basePrice: 0.97
    },
    'EURAUD': { 
        name: 'Euro / Australian Dollar', 
        apiSymbol: 'frxEURAUD',
        category: 'minor',
        basePrice: 1.72
    },
    'EURCAD': { 
        name: 'Euro / Canadian Dollar', 
        apiSymbol: 'frxEURCAD',
        category: 'minor',
        basePrice: 1.57
    },
    'GBPCHF': { 
        name: 'British Pound / Swiss Franc', 
        apiSymbol: 'frxGBPCHF',
        category: 'minor',
        basePrice: 1.11
    },
    'GBPAUD': { 
        name: 'British Pound / Australian Dollar', 
        apiSymbol: 'frxGBPAUD',
        category: 'minor',
        basePrice: 1.97
    },
    'GBPCAD': { 
        name: 'British Pound / Canadian Dollar', 
        apiSymbol: 'frxGBPCAD',
        category: 'minor',
        basePrice: 1.81
    },
    'AUDJPY': { 
        name: 'Australian Dollar / Japanese Yen', 
        apiSymbol: 'frxAUDJPY',
        category: 'minor',
        basePrice: 95
    },
    'AUDNZD': { 
        name: 'Australian Dollar / New Zealand Dollar', 
        apiSymbol: 'frxAUDNZD',
        category: 'minor',
        basePrice: 1.12
    },
    'AUDCAD': { 
        name: 'Australian Dollar / Canadian Dollar', 
        apiSymbol: 'frxAUDCAD',
        category: 'minor',
        basePrice: 0.92
    },
    'AUDCHF': { 
        name: 'Australian Dollar / Swiss Franc', 
        apiSymbol: 'frxAUDCHF',
        category: 'minor',
        basePrice: 0.56
    },
    'NZDJPY': { 
        name: 'New Zealand Dollar / Japanese Yen', 
        apiSymbol: 'frxNZDJPY',
        category: 'minor',
        basePrice: 85
    },
    'CADJPY': { 
        name: 'Canadian Dollar / Japanese Yen', 
        apiSymbol: 'frxCADJPY',
        category: 'minor',
        basePrice: 104
    },
    'CHFJPY': { 
        name: 'Swiss Franc / Japanese Yen', 
        apiSymbol: 'frxCHFJPY',
        category: 'minor',
        basePrice: 169
    }
};

// Initialize SMC Analyzer
let smcAnalyzer = null;
if (typeof SMCAnalyzer !== 'undefined') {
    smcAnalyzer = new SMCAnalyzer();
    console.log('✅ SMC Analyzer initialized');
}

// Firebase configuration
const FIREBASE_URL = 'https://mzanzifx-default-rtdb.firebaseio.com';

// Global State
let canvas, ctx;
let chartData = [];
let currentSymbol = 'XAUUSD'; // Default to Gold
let currentTimeframe = 300; // 5 minutes
let ws = null;
let isConnected = false;

// Chart Settings (match working code exactly)
let zoom = 80;
let scroll = 0;
let crosshairEnabled = false;
let crosshairX = 0;
let crosshairY = 0;
let isDragging = false;
let lastTouchX = 0;
let autoScroll = true;

const chartPadding = {
    top: 20,
    right: 60,
    bottom: 20,
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
// WEBSOCKET CONNECTION - EXACT COPY FROM WORKING CODE
// ============================================================================
function connectWebSocket() {
    updateConnectionStatus(false);
    
    if (ws) ws.close();
    
    console.log('🔌 Connecting to Deriv WebSocket...');
    showLoading();
    
    ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');
    
    ws.onopen = () => {
        console.log('✅ Connected to Deriv');
        updateConnectionStatus(true);
        
        const apiSymbol = SYMBOLS[currentSymbol].apiSymbol;
        console.log(`📊 Requesting: ${currentSymbol} (${apiSymbol})`);
        
        // Subscribe to ticks
        ws.send(JSON.stringify({ 
            ticks: apiSymbol, 
            subscribe: 1 
        }));
        
        // Request historical candles
        ws.send(JSON.stringify({
            ticks_history: apiSymbol,
            count: 1000,
            end: 'latest',
            style: 'candles',
            granularity: currentTimeframe
        }));
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.error) {
            console.error('❌ Deriv Error:', data.error.message);
            hideLoading();
            alert(`Unable to load ${SYMBOLS[currentSymbol].name} data.\n\nError: ${data.error.message}\n\nPlease try another symbol or refresh.`);
            return;
        }
        
        // Handle candles response (same as working code)
        if (data.candles) {
            console.log(`✅ Received ${data.candles.length} candles`);
            chartData = data.candles.map(c => ({
                x: c.epoch * 1000,
                o: parseFloat(c.open),
                h: parseFloat(c.high),
                l: parseFloat(c.low),
                c: parseFloat(c.close)
            }));
            drawChart();
            updatePriceDisplay();
            hideLoading();
        } 
        // Handle tick updates (same as working code)
        else if (data.tick) {
            updateTick(parseFloat(data.tick.quote), data.tick.epoch * 1000);
        } 
        // Handle OHLC updates (same as working code)
        else if (data.ohlc) {
            const candle = data.ohlc;
            updateCandle({
                x: candle.epoch * 1000,
                o: parseFloat(candle.open),
                h: parseFloat(candle.high),
                l: parseFloat(candle.low),
                c: parseFloat(candle.close)
            });
        }
    };

    ws.onerror = (error) => {
        console.error('❌ WebSocket Error:', error);
        updateConnectionStatus(false);
    };

    ws.onclose = () => {
        console.log('🔌 WebSocket closed');
        updateConnectionStatus(false);
        
        // Auto-reconnect if we have data
        if (chartData.length > 0) {
            setTimeout(() => {
                if (!isConnected) {
                    console.log('🔄 Reconnecting...');
                    connectWebSocket();
                }
            }, 3000);
        }
    };
}

// ============================================================================
// DATA UPDATES - EXACT COPY FROM WORKING CODE
// ============================================================================
function updateTick(price, time) {
    const candleStart = Math.floor(time / (currentTimeframe * 1000)) * (currentTimeframe * 1000);
    
    if (!chartData.length || candleStart > chartData[chartData.length - 1].x) {
        // New candle
        chartData.push({ 
            x: candleStart, 
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

function updateCandle(candle) {
    if (!chartData.length) return;
    
    const last = chartData[chartData.length - 1];
    if (candle.x === last.x) {
        chartData[chartData.length - 1] = candle;
    } else {
        chartData.push(candle);
        if (chartData.length > 1000) chartData.shift();
    }
    
    drawChart();
    updatePriceDisplay();
}

// ============================================================================
// CHART DRAWING - EXACT COPY FROM WORKING CODE
// ============================================================================
function drawChart() {
    if (!chartData.length) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const padding = chartPadding;
    const chartW = canvas.width - padding.left - padding.right;
    const chartH = canvas.height - padding.top - padding.bottom;
    
    const candlesPerScreen = Math.floor(zoom);
    if (autoScroll) {
        scroll = Math.max(0, chartData.length - candlesPerScreen);
    }
    
    const visible = chartData.slice(scroll, scroll + candlesPerScreen);
    if (!visible.length) return;
    
    const prices = visible.flatMap(c => [c.h, c.l]);
    const maxP = Math.max(...prices);
    const minP = Math.min(...prices);
    const range = maxP - minP || 0.01;
    const buffer = range * 0.05;
    
    const priceToY = (price) => {
        return padding.top + chartH - ((price - (minP - buffer)) / (range + 2 * buffer)) * chartH;
    };
    
    const candleW = chartW / candlesPerScreen;
    const wickW = Math.max(1, candleW * 0.1);
    const bodyW = Math.max(2, candleW * 0.8);
    
    // Draw grid
    drawGrid(minP - buffer, maxP + buffer, chartH, padding, chartW);
    
    // Draw candles
    visible.forEach((candle, i) => {
        const x = padding.left + i * candleW + candleW / 2;
        const isGreen = candle.c >= candle.o;
        
        // Draw wick
        ctx.strokeStyle = isGreen ? '#00ff88' : '#ff3366';
        ctx.lineWidth = wickW;
        ctx.beginPath();
        ctx.moveTo(x, priceToY(candle.h));
        ctx.lineTo(x, priceToY(candle.l));
        ctx.stroke();
        
        // Draw body
        const yTop = priceToY(Math.max(candle.o, candle.c));
        const yBottom = priceToY(Math.min(candle.o, candle.c));
        const bodyHeight = Math.max(1, yBottom - yTop);
        
        ctx.fillStyle = isGreen ? '#00ff88' : '#ff3366';
        ctx.fillRect(x - bodyW / 2, yTop, bodyW, bodyHeight);
    });
    
    // Draw SMC objects
    if (smcAnalyzer && smcAnalyzer.settings.drawObjects) {
        smcAnalyzer.drawSMCObjects(ctx, chartData, visible, scroll, candleW, priceToY, padding);
    }
    
    // Draw price scale
    drawPriceScale(minP - buffer, maxP + buffer, chartH, padding);
    
    // Draw crosshair
    if (crosshairEnabled) {
        drawCrosshair(minP - buffer, maxP + buffer, visible, candleW, padding, chartW);
    }
}

function drawGrid(minPrice, maxPrice, height, padding, width) {
    const steps = 6;
    const priceStep = (maxPrice - minPrice) / steps;
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= steps; i++) {
        const y = padding.top + height - (i / steps) * height;
        
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + width, y);
        ctx.stroke();
    }
}

function drawPriceScale(minPrice, maxPrice, height, padding) {
    const steps = 6;
    const priceStep = (maxPrice - minPrice) / steps;
    
    ctx.fillStyle = '#888';
    ctx.font = '11px Roboto';
    ctx.textAlign = 'right';
    
    const precision = getPrecision((minPrice + maxPrice) / 2);
    
    for (let i = 0; i <= steps; i++) {
        const price = minPrice + i * priceStep;
        const y = padding.top + height - (i / steps) * height;
        
        ctx.fillText(price.toFixed(precision), canvas.width - padding.right + 55, y + 4);
    }
    
    // Current price line
    if (chartData.length > 0) {
        const currentPrice = chartData[chartData.length - 1].c;
        const y = padding.top + height - ((currentPrice - minPrice) / (maxPrice - minPrice)) * height;
        
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(canvas.width - padding.right, y);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Price label
        const text = currentPrice.toFixed(precision);
        const textWidth = ctx.measureText(text).width;
        
        ctx.fillStyle = '#00ff88';
        ctx.fillRect(canvas.width - padding.right + 2, y - 8, textWidth + 8, 16);
        
        ctx.fillStyle = '#0e0e0e';
        ctx.font = 'bold 11px Roboto';
        ctx.fillText(text, canvas.width - padding.right + 6, y + 4);
    }
    
    ctx.textAlign = 'left';
}

function drawCrosshair(minPrice, maxPrice, visibleData, candleW, padding, chartW) {
    if (!crosshairX || !crosshairY) return;
    
    const maxX = padding.left + chartW;
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
    
    const candleIndex = Math.floor((crosshairX - padding.left) / candleW);
    if (candleIndex >= 0 && candleIndex < visibleData.length) {
        const candle = visibleData[candleIndex];
        const precision = getPrecision(candle.c);
        document.getElementById('infoOpen').textContent = candle.o.toFixed(precision);
        document.getElementById('infoHigh').textContent = candle.h.toFixed(precision);
        document.getElementById('infoLow').textContent = candle.l.toFixed(precision);
        document.getElementById('infoClose').textContent = candle.c.toFixed(precision);
    }
}

// ============================================================================
// INTERACTION - EXACT COPY FROM WORKING CODE
// ============================================================================
function setupInteraction() {
    let startX, startOffset;
    
    canvas.addEventListener('touchstart', (e) => {
        if (crosshairEnabled) {
            const rect = canvas.getBoundingClientRect();
            crosshairX = e.touches[0].clientX - rect.left;
            crosshairY = e.touches[0].clientY - rect.top;
            drawChart();
        } else {
            isDragging = true;
            startX = e.touches[0].clientX;
            startOffset = scroll;
            autoScroll = false;
        }
    });
    
    canvas.addEventListener('touchmove', (e) => {
        if (!isDragging && !crosshairEnabled) return;
        e.preventDefault();
        
        if (crosshairEnabled) {
            const rect = canvas.getBoundingClientRect();
            crosshairX = e.touches[0].clientX - rect.left;
            crosshairY = e.touches[0].clientY - rect.top;
            drawChart();
        } else {
            const deltaX = e.touches[0].clientX - startX;
            const candlesPerScreen = Math.floor(zoom);
            const pixelsPerCandle = canvas.width / candlesPerScreen;
            const candlesDelta = Math.round(deltaX / pixelsPerCandle);
            scroll = Math.max(0, Math.min(chartData.length - candlesPerScreen, startOffset - candlesDelta));
            drawChart();
        }
    }, { passive: false });
    
    canvas.addEventListener('touchend', () => {
        isDragging = false;
        if (scroll >= chartData.length - zoom - 5) {
            autoScroll = true;
        }
    });
    
    // Mouse support
    canvas.addEventListener('mousedown', (e) => {
        if (crosshairEnabled) {
            const rect = canvas.getBoundingClientRect();
            crosshairX = e.clientX - rect.left;
            crosshairY = e.clientY - rect.top;
            drawChart();
        } else {
            isDragging = true;
            startX = e.clientX;
            startOffset = scroll;
            autoScroll = false;
        }
    });
    
    canvas.addEventListener('mousemove', (e) => {
        if (crosshairEnabled) {
            const rect = canvas.getBoundingClientRect();
            crosshairX = e.clientX - rect.left;
            crosshairY = e.clientY - rect.top;
            drawChart();
        } else if (isDragging) {
            const deltaX = e.clientX - startX;
            const candlesPerScreen = Math.floor(zoom);
            const pixelsPerCandle = canvas.width / candlesPerScreen;
            const candlesDelta = Math.round(deltaX / pixelsPerCandle);
            scroll = Math.max(0, Math.min(chartData.length - candlesPerScreen, startOffset - candlesDelta));
            drawChart();
        }
    });
    
    canvas.addEventListener('mouseup', () => {
        isDragging = false;
        if (scroll >= chartData.length - zoom - 5) {
            autoScroll = true;
        }
    });
    
    canvas.addEventListener('mouseleave', () => {
        isDragging = false;
    });
}

// ============================================================================
// UI CONTROLS
// ============================================================================
window.changeTimeframe = function(tf) {
    currentTimeframe = tf;
    chartData = [];
    scroll = 0;
    autoScroll = true;
    
    document.querySelectorAll('.tf-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    showLoading();
    
    if (isConnected && ws) {
        const apiSymbol = SYMBOLS[currentSymbol].apiSymbol;
        
        ws.send(JSON.stringify({ forget_all: 'ticks' }));
        
        ws.send(JSON.stringify({ 
            ticks: apiSymbol, 
            subscribe: 1 
        }));
        
        ws.send(JSON.stringify({
            ticks_history: apiSymbol,
            count: 1000,
            end: 'latest',
            style: 'candles',
            granularity: currentTimeframe
        }));
    }
};

window.changeSymbol = function() {
    const newSymbol = document.getElementById('symbolSelector').value;
    
    if (newSymbol === currentSymbol) return;
    
    console.log(`🔄 Switching from ${currentSymbol} to ${newSymbol}`);
    
    currentSymbol = newSymbol;
    chartData = [];
    scroll = 0;
    autoScroll = true;
    
    showLoading();
    
    // Close existing WebSocket
    if (ws) {
        ws.close();
    }
    
    // Reconnect with new symbol
    setTimeout(() => {
        connectWebSocket();
    }, 500);
};

window.zoomIn = function() {
    zoom = Math.max(20, zoom - 10);
    drawChart();
};

window.zoomOut = function() {
    zoom = Math.min(200, zoom + 10);
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
    zoom = 80;
    scroll = 0;
    autoScroll = true;
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
    
    const precision = getPrecision(price);
    
    document.getElementById('currentPrice').textContent = price.toFixed(precision);
    
    const changeEl = document.getElementById('priceChange');
    changeEl.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(precision)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`;
    changeEl.className = 'price-change ' + (change >= 0 ? 'positive' : 'negative');
}

function getPrecision(price) {
    // Gold typically uses 2 decimal places
    if (price < 1) return 5;
    if (price < 100) return 4;
    if (price < 1000) return 3;
    return 2;
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

// ============================================================================
// SIGNAL GENERATION & DISPLAY
// ============================================================================
window.generateSignal = async function() {
    if (!chartData || chartData.length < 100) {
        alert('Insufficient data for analysis. Please wait for more candles.');
        return;
    }
    
    if (!smcAnalyzer) {
        alert('SMC Analyzer not loaded. Please refresh the page.');
        return;
    }
    
    console.log('⚡ Generating signal...');
    
    const btn = document.getElementById('generateSignalBtn');
    btn.style.opacity = '0.5';
    btn.style.pointerEvents = 'none';
    
    try {
        // Run SMC analysis with current symbol
        const signal = smcAnalyzer.analyze(chartData, currentTimeframe, currentSymbol);
        
        if (signal) {
            // Add current symbol info
            signal.symbol = currentSymbol;
            signal.symbolName = SYMBOLS[currentSymbol].name;
            signal.category = SYMBOLS[currentSymbol].category;
            
            // Display signal
            displaySignal(signal);
            
            // Save to Firebase
            await saveSignalToFirebase(signal);
            
            console.log('✅ Signal generated:', signal.bias, signal.confidence + '%');
        } else {
            alert('No high-confidence signal detected at this time.\n\nConfidence threshold: 70%');
        }
    } catch (error) {
        console.error('❌ Error generating signal:', error);
        alert('Error generating signal. Check console for details.');
    } finally {
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
    }
};

window.toggleAutoAnalyze = function() {
    if (!smcAnalyzer) return;
    
    const btn = document.getElementById('autoAnalyzeBtn');
    
    if (smcAnalyzer.settings.autoAnalyze) {
        smcAnalyzer.stopAutoAnalysis();
        btn.classList.remove('active');
        console.log('⏹️ Auto-analyze stopped');
    } else {
        smcAnalyzer.startAutoAnalysis(chartData, currentTimeframe, currentSymbol, (signal) => {
            console.log('🔔 Auto-signal detected!');
            displaySignal(signal);
            saveSignalToFirebase(signal);
        });
        btn.classList.add('active');
        console.log('▶️ Auto-analyze started');
    }
};

function displaySignal(signal) {
    const panel = document.getElementById('signalPanel');
    
    // Update bias
    const biasEl = document.getElementById('signalBias');
    biasEl.textContent = signal.bias.toUpperCase();
    biasEl.className = 'signal-bias ' + signal.bias;
    
    // Update confidence
    document.getElementById('signalConfidence').textContent = signal.confidence + '% Confidence';
    
    // Update levels
    document.getElementById('signalEntry').textContent = signal.entry;
    document.getElementById('signalTP1').textContent = signal.tp1;
    document.getElementById('signalTP2').textContent = signal.tp2;
    document.getElementById('signalTP3').textContent = signal.tp3;
    document.getElementById('signalSL').textContent = signal.sl;
    
    // Update meta
    document.getElementById('signalRR').textContent = signal.rr;
    document.getElementById('signalVol').textContent = signal.volatility || '--';
    document.getElementById('signalZone').textContent = signal.zone.toUpperCase();
    
    // Update reasons
    const reasonsEl = document.getElementById('signalReasons');
    if (signal.reasons && signal.reasons.length > 0) {
        reasonsEl.innerHTML = signal.reasons.map(r => `• ${r}`).join('<br>');
    } else {
        reasonsEl.innerHTML = 'Technical analysis complete';
    }
    
    // Show panel
    panel.classList.remove('hidden');
}

window.closeSignal = function() {
    document.getElementById('signalPanel').classList.add('hidden');
};

async function saveSignalToFirebase(signal) {
    try {
        const response = await fetch(`${FIREBASE_URL}/signals.json`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(signal)
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Signal saved to Firebase:', data.name);
        } else {
            console.error('❌ Failed to save signal');
        }
    } catch (error) {
        console.error('❌ Error saving to Firebase:', error);
    }
}

console.log('🏅 Gold Trading Terminal - Using Proven Code Structure');

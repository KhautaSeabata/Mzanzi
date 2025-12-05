// ============================================
// ANALYSIS.JS - Forex SMC Analyzer
// ============================================

// Global State
const state = {
    charts: {},
    isAnalysisEnabled: true,
    activeChart: 1,
    numCharts: 4,
    signals: [],
    signalFilter: 'all',
    isRunning: false,
    telegramEnabled: true
};

// Forex pairs configuration
const PAIRS = {
    'XAUUSD': { name: 'GOLD', decimals: 2 },
    'EURUSD': { name: 'EUR/USD', decimals: 5 },
    'GBPUSD': { name: 'GBP/USD', decimals: 5 },
    'AUDUSD': { name: 'AUD/USD', decimals: 5 },
    'AUDCAD': { name: 'AUD/CAD', decimals: 5 }
};

// Timeframe labels
const TIMEFRAMES = {
    '300': '5M',
    '900': '15M',
    '1800': '30M',
    '3600': '1H',
    '14400': '4H'
};

// Initialize charts on load
window.addEventListener('load', () => {
    initializeCharts();
    updateConnectionStatus(true);
});

// Initialize all charts
function initializeCharts() {
    for (let i = 1; i <= 4; i++) {
        const symbol = document.getElementById(`symbol${i}`).value;
        const timeframe = document.getElementById(`timeframe${i}`).value;
        
        state.charts[i] = {
            symbol: symbol,
            timeframe: timeframe,
            data: [],
            zoom: 1,
            offset: 0,
            canvas: document.getElementById(`canvas${i}`),
            ctx: null,
            animationId: null,
            lastUpdate: Date.now()
        };
        
        // Setup canvas
        const canvas = state.charts[i].canvas;
        const ctx = canvas.getContext('2d');
        state.charts[i].ctx = ctx;
        
        // Set canvas size
        resizeCanvas(i);
        
        // Setup touch/mouse interactions
        setupInteractions(i);
    }
    
    // Add resize listener
    window.addEventListener('resize', () => {
        for (let i = 1; i <= 4; i++) {
            resizeCanvas(i);
            if (state.isRunning) drawChart(i);
        }
    });
}

// Resize canvas to match display size
function resizeCanvas(chartNum) {
    const canvas = state.charts[chartNum].canvas;
    const container = canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = container.clientWidth * dpr;
    canvas.height = container.clientHeight * dpr;
    canvas.style.width = container.clientWidth + 'px';
    canvas.style.height = container.clientHeight + 'px';
    
    state.charts[chartNum].ctx.scale(dpr, dpr);
}

// Setup touch and mouse interactions
function setupInteractions(chartNum) {
    const canvas = state.charts[chartNum].canvas;
    let isDragging = false;
    let startX = 0;
    let startOffset = 0;

    // Touch events
    canvas.addEventListener('touchstart', (e) => {
        isDragging = true;
        startX = e.touches[0].clientX;
        startOffset = state.charts[chartNum].offset;
    });

    canvas.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const deltaX = e.touches[0].clientX - startX;
        state.charts[chartNum].offset = startOffset - Math.floor(deltaX / 10);
        state.charts[chartNum].offset = Math.max(0, state.charts[chartNum].offset);
        drawChart(chartNum);
    });

    canvas.addEventListener('touchend', () => {
        isDragging = false;
    });

    // Mouse events
    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startOffset = state.charts[chartNum].offset;
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const deltaX = e.clientX - startX;
        state.charts[chartNum].offset = startOffset - Math.floor(deltaX / 10);
        state.charts[chartNum].offset = Math.max(0, state.charts[chartNum].offset);
        drawChart(chartNum);
    });

    canvas.addEventListener('mouseup', () => {
        isDragging = false;
    });

    canvas.addEventListener('mouseleave', () => {
        isDragging = false;
    });
}

// Generate realistic forex price data
function generateForexData(symbol, count = 100) {
    const data = [];
    const config = PAIRS[symbol];
    
    // Base prices for different pairs
    const basePrices = {
        'XAUUSD': 2650,
        'EURUSD': 1.0850,
        'GBPUSD': 1.2750,
        'AUDUSD': 0.6450,
        'AUDCAD': 0.9050
    };
    
    let basePrice = basePrices[symbol] || 1.0000;
    
    for (let i = 0; i < count; i++) {
        const volatility = symbol === 'XAUUSD' ? 2 : 0.0010;
        const change = (Math.random() - 0.5) * volatility;
        
        const open = basePrice;
        const close = open + change;
        const high = Math.max(open, close) + Math.random() * volatility * 0.5;
        const low = Math.min(open, close) - Math.random() * volatility * 0.5;
        
        data.push({
            time: Date.now() - (count - i) * 60000,
            open: parseFloat(open.toFixed(config.decimals)),
            high: parseFloat(high.toFixed(config.decimals)),
            low: parseFloat(low.toFixed(config.decimals)),
            close: parseFloat(close.toFixed(config.decimals))
        });
        
        basePrice = close;
    }
    
    return data;
}

// Start all charts
function startAllCharts() {
    state.isRunning = true;
    updateConnectionStatus(true);
    
    for (let i = 1; i <= state.numCharts; i++) {
        if (!state.charts[i].data.length) {
            state.charts[i].data = generateForexData(state.charts[i].symbol);
        }
        updateChartData(i);
    }
}

// Stop all charts
function stopAllCharts() {
    state.isRunning = false;
    updateConnectionStatus(false);
    
    for (let i = 1; i <= 4; i++) {
        if (state.charts[i].animationId) {
            cancelAnimationFrame(state.charts[i].animationId);
            state.charts[i].animationId = null;
        }
    }
}

// Refresh all charts
function refreshAllCharts() {
    for (let i = 1; i <= state.numCharts; i++) {
        state.charts[i].data = generateForexData(state.charts[i].symbol);
        state.charts[i].offset = 0;
        drawChart(i);
    }
}

// Update chart data periodically
function updateChartData(chartNum) {
    if (!state.isRunning) return;
    
    const chart = state.charts[chartNum];
    const now = Date.now();
    
    // Add new candle every 2 seconds (simulated)
    if (now - chart.lastUpdate > 2000) {
        const lastCandle = chart.data[chart.data.length - 1];
        const config = PAIRS[chart.symbol];
        const volatility = chart.symbol === 'XAUUSD' ? 2 : 0.0010;
        const change = (Math.random() - 0.5) * volatility;
        
        const newCandle = {
            time: now,
            open: lastCandle.close,
            high: Math.max(lastCandle.close, lastCandle.close + change) + Math.random() * volatility * 0.5,
            low: Math.min(lastCandle.close, lastCandle.close + change) - Math.random() * volatility * 0.5,
            close: parseFloat((lastCandle.close + change).toFixed(config.decimals))
        };
        
        chart.data.push(newCandle);
        if (chart.data.length > 200) chart.data.shift();
        
        chart.lastUpdate = now;
        
        // Analyze for SMC patterns
        if (state.isAnalysisEnabled) {
            analyzeSMCPatterns(chartNum, chart.data);
        }
    }
    
    drawChart(chartNum);
    updateChartInfo(chartNum);
    
    chart.animationId = requestAnimationFrame(() => updateChartData(chartNum));
}

// Draw chart on canvas
function drawChart(chartNum) {
    const chart = state.charts[chartNum];
    const ctx = chart.ctx;
    const canvas = chart.canvas;
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    
    if (!chart.data.length) return;
    
    // Calculate visible data
    const candleWidth = 10 * chart.zoom;
    const candleSpacing = 2 * chart.zoom;
    const totalWidth = candleWidth + candleSpacing;
    const visibleCandles = Math.floor(w / totalWidth);
    const startIdx = Math.max(0, chart.data.length - visibleCandles - chart.offset);
    const endIdx = Math.min(chart.data.length, startIdx + visibleCandles);
    const visibleData = chart.data.slice(startIdx, endIdx);
    
    if (!visibleData.length) return;
    
    // Find price range
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    visibleData.forEach(candle => {
        minPrice = Math.min(minPrice, candle.low);
        maxPrice = Math.max(maxPrice, candle.high);
    });
    
    const priceRange = maxPrice - minPrice;
    const padding = priceRange * 0.1;
    minPrice -= padding;
    maxPrice += padding;
    
    // Draw price grid
    ctx.strokeStyle = '#1C1C1E';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = (h * i) / 5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
    }
    
    // Draw candlesticks
    visibleData.forEach((candle, idx) => {
        const x = idx * totalWidth + totalWidth / 2;
        const yHigh = h - ((candle.high - minPrice) / (maxPrice - minPrice)) * h;
        const yLow = h - ((candle.low - minPrice) / (maxPrice - minPrice)) * h;
        const yOpen = h - ((candle.open - minPrice) / (maxPrice - minPrice)) * h;
        const yClose = h - ((candle.close - minPrice) / (maxPrice - minPrice)) * h;
        
        const isBullish = candle.close >= candle.open;
        ctx.strokeStyle = isBullish ? '#30D158' : '#FF453A';
        ctx.fillStyle = isBullish ? '#30D158' : '#FF453A';
        
        // Wick
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, yHigh);
        ctx.lineTo(x, yLow);
        ctx.stroke();
        
        // Body
        const bodyHeight = Math.abs(yClose - yOpen);
        const bodyY = Math.min(yOpen, yClose);
        
        if (bodyHeight < 1) {
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x - candleWidth / 2, bodyY);
            ctx.lineTo(x + candleWidth / 2, bodyY);
            ctx.stroke();
        } else {
            ctx.fillRect(x - candleWidth / 2, bodyY, candleWidth, bodyHeight);
        }
    });
    
    // Draw SMC analysis if enabled
    if (state.isAnalysisEnabled) {
        drawSMCAnalysis(chartNum, ctx, visibleData, w, h, minPrice, maxPrice, totalWidth);
    }
}

// Draw SMC analysis overlays
function drawSMCAnalysis(chartNum, ctx, data, w, h, minPrice, maxPrice, candleWidth) {
    if (data.length < 20) return;
    
    // Find swing highs and lows
    const swingPoints = findSwingPoints(data);
    
    // Draw support/resistance zones
    ctx.strokeStyle = 'rgba(0, 122, 255, 0.5)';
    ctx.fillStyle = 'rgba(0, 122, 255, 0.1)';
    ctx.lineWidth = 2;
    
    swingPoints.forEach((point, idx) => {
        const x = idx * candleWidth + candleWidth / 2;
        const y = h - ((point.price - minPrice) / (maxPrice - minPrice)) * h;
        
        // Draw zone
        ctx.fillRect(0, y - 5, w, 10);
        ctx.strokeRect(0, y - 5, w, 10);
    });
}

// Find swing high/low points
function findSwingPoints(data, lookback = 10) {
    const points = [];
    
    for (let i = lookback; i < data.length - lookback; i++) {
        const current = data[i];
        let isHigh = true;
        let isLow = true;
        
        // Check if it's a swing high
        for (let j = i - lookback; j <= i + lookback; j++) {
            if (j !== i && data[j].high >= current.high) {
                isHigh = false;
            }
            if (j !== i && data[j].low <= current.low) {
                isLow = false;
            }
        }
        
        if (isHigh) {
            points.push({ idx: i, price: current.high, type: 'high' });
        }
        if (isLow) {
            points.push({ idx: i, price: current.low, type: 'low' });
        }
    }
    
    return points;
}

// Analyze SMC patterns
function analyzeSMCPatterns(chartNum, data) {
    if (data.length < 50) return;
    
    const recent = data.slice(-50);
    const chart = state.charts[chartNum];
    
    // Detect order blocks
    const orderBlock = detectOrderBlock(recent);
    if (orderBlock && Math.random() > 0.95) { // 5% chance to generate signal
        createSignal(chartNum, orderBlock);
    }
}

// Detect order block pattern
function detectOrderBlock(data) {
    if (data.length < 10) return null;
    
    const last = data[data.length - 1];
    const prev = data[data.length - 2];
    
    // Bullish order block
    if (last.close > last.open && prev.close < prev.open && 
        last.close > prev.high) {
        return {
            type: 'bullish',
            pattern: 'Order Block',
            price: last.close,
            confidence: 65 + Math.random() * 30
        };
    }
    
    // Bearish order block
    if (last.close < last.open && prev.close > prev.open && 
        last.close < prev.low) {
        return {
            type: 'bearish',
            pattern: 'Order Block',
            price: last.close,
            confidence: 65 + Math.random() * 30
        };
    }
    
    return null;
}

// Create trading signal
function createSignal(chartNum, pattern) {
    const chart = state.charts[chartNum];
    const config = PAIRS[chart.symbol];
    
    const signal = {
        id: Date.now() + Math.random(),
        chartNum: chartNum,
        symbol: chart.symbol,
        symbolName: config.name,
        timeframe: TIMEFRAMES[chart.timeframe],
        type: pattern.type,
        pattern: pattern.pattern,
        price: pattern.price,
        confidence: Math.round(pattern.confidence),
        time: new Date().toLocaleTimeString()
    };
    
    state.signals.unshift(signal);
    if (state.signals.length > 50) state.signals.pop();
    
    updateSignalsList();
    
    // Send to Telegram if enabled
    if (state.telegramEnabled) {
        sendTelegramAlert(signal);
    }
}

// Send alert to Telegram
async function sendTelegramAlert(signal) {
    const message = `
🎯 *SMC Signal Detected*

📊 Pair: ${signal.symbolName}
⏰ Timeframe: ${signal.timeframe}
📈 Pattern: ${signal.pattern}
${signal.type === 'bullish' ? '🟢' : '🔴'} Direction: ${signal.type.toUpperCase()}
💰 Price: ${signal.price}
📊 Confidence: ${signal.confidence}%
⏱️ Time: ${signal.time}
    `.trim();
    
    try {
        // In production, this would call your Python backend
        console.log('Telegram Alert:', message);
        // await fetch('YOUR_BACKEND_URL/send_alert', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ message })
        // });
    } catch (error) {
        console.error('Failed to send Telegram alert:', error);
    }
}

// Update signals list display
function updateSignalsList() {
    const container = document.getElementById('signalsList');
    
    const filtered = state.signals.filter(s => {
        if (state.signalFilter === 'all') return true;
        return s.type === state.signalFilter;
    });
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="no-signals">
                <div class="no-signals-icon">📊</div>
                <div>No signals detected yet</div>
                <div style="font-size: 12px; margin-top: 8px;">Start charts to detect SMC patterns</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filtered.map(signal => `
        <div class="signal-card ${signal.type}">
            <div class="signal-header">
                <div>
                    <div class="signal-name">${signal.pattern}</div>
                    <div class="signal-symbol">${signal.symbolName} - ${signal.timeframe}</div>
                </div>
                <div class="signal-badge ${signal.type}">${signal.type.toUpperCase()}</div>
            </div>
            <div class="signal-details">
                <div class="signal-detail">
                    <span class="detail-label">Price:</span>
                    <span class="detail-value">${signal.price}</span>
                </div>
                <div class="signal-detail">
                    <span class="detail-label">Confidence:</span>
                    <span class="detail-value">${signal.confidence}%</span>
                </div>
            </div>
            <div class="confidence-bar">
                <div class="confidence-fill ${signal.confidence > 80 ? 'high' : ''}" style="width: ${signal.confidence}%"></div>
            </div>
            <div class="signal-time">${signal.time}</div>
        </div>
    `).join('');
}

// Update chart info bar
function updateChartInfo(chartNum) {
    const chart = state.charts[chartNum];
    if (!chart.data.length) return;
    
    const last = chart.data[chart.data.length - 1];
    const prev = chart.data[chart.data.length - 2] || last;
    const config = PAIRS[chart.symbol];
    
    const change = last.close - prev.close;
    const changePercent = ((change / prev.close) * 100).toFixed(2);
    
    // Find high/low from last 24 candles
    const recent = chart.data.slice(-24);
    const high = Math.max(...recent.map(c => c.high));
    const low = Math.min(...recent.map(c => c.low));
    
    document.getElementById(`symbolName${chartNum}`).textContent = config.name;
    document.getElementById(`price${chartNum}`).textContent = last.close.toFixed(config.decimals);
    
    const changeEl = document.getElementById(`change${chartNum}`);
    changeEl.textContent = `${change >= 0 ? '+' : ''}${changePercent}%`;
    changeEl.className = `info-value ${change >= 0 ? 'green' : 'red'}`;
    
    document.getElementById(`highlow${chartNum}`).textContent = 
        `${high.toFixed(config.decimals)}/${low.toFixed(config.decimals)}`;
}

// Update chart settings
function updateChart(chartNum) {
    const symbol = document.getElementById(`symbol${chartNum}`).value;
    const timeframe = document.getElementById(`timeframe${chartNum}`).value;
    
    state.charts[chartNum].symbol = symbol;
    state.charts[chartNum].timeframe = timeframe;
    state.charts[chartNum].data = generateForexData(symbol);
    state.charts[chartNum].offset = 0;
    
    drawChart(chartNum);
    updateChartInfo(chartNum);
}

// Zoom controls
function zoom(chartNum, direction) {
    const chart = state.charts[chartNum];
    if (direction === 'in') {
        chart.zoom = Math.min(chart.zoom * 1.2, 3);
    } else {
        chart.zoom = Math.max(chart.zoom * 0.8, 0.5);
    }
    drawChart(chartNum);
}

// Switch between charts
function switchChart(chartNum) {
    state.activeChart = chartNum;
    
    // Update chart visibility
    for (let i = 1; i <= 4; i++) {
        const chart = document.getElementById(`chart${i}`);
        if (i === chartNum) {
            chart.classList.add('active');
        } else {
            chart.classList.remove('active');
        }
    }
    
    // Update tabs
    const tabs = document.querySelectorAll('.chart-tab');
    tabs.forEach((tab, idx) => {
        if (idx + 1 === chartNum) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
}

// Change number of charts
function changeNumCharts() {
    const num = parseInt(document.getElementById('numCharts').value);
    state.numCharts = num;
    
    // Update chart tabs visibility
    const tabs = document.querySelectorAll('.chart-tab');
    tabs.forEach((tab, idx) => {
        tab.style.display = idx < num ? 'block' : 'none';
    });
    
    // Switch to chart 1 if current is hidden
    if (state.activeChart > num) {
        switchChart(1);
    }
}

// Toggle SMC analysis
function toggleAnalysis() {
    state.isAnalysisEnabled = !state.isAnalysisEnabled;
    const btn = document.getElementById('analysisToggle');
    
    if (state.isAnalysisEnabled) {
        btn.classList.add('active');
        btn.textContent = '📊 SMC ON';
    } else {
        btn.classList.remove('active');
        btn.textContent = '📊 SMC OFF';
    }
    
    // Redraw all charts
    for (let i = 1; i <= state.numCharts; i++) {
        drawChart(i);
    }
}

// Filter signals
function filterSignals(filter) {
    state.signalFilter = filter;
    
    // Update button states
    const btns = document.querySelectorAll('.signal-filter-btn');
    btns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase().includes(filter)) {
            btn.classList.add('active');
        }
    });
    
    updateSignalsList();
}

// Clear all signals
function clearAllSignals() {
    if (confirm('Clear all signals?')) {
        state.signals = [];
        updateSignalsList();
    }
}

// Switch pages
function switchPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page-container').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    document.getElementById(pageId).classList.add('active');
    
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
}

// Toggle settings
function toggleSetting(element) {
    element.classList.toggle('active');
    
    // Update Telegram setting
    const label = element.previousElementSibling.textContent;
    if (label.includes('Telegram')) {
        state.telegramEnabled = element.classList.contains('active');
    }
}

// Update connection status
function updateConnectionStatus(connected) {
    const indicator = document.querySelector('#connectionStatus .status-indicator');
    if (connected) {
        indicator.classList.remove('status-disconnected');
        indicator.classList.add('status-connected');
    } else {
        indicator.classList.remove('status-connected');
        indicator.classList.add('status-disconnected');
    }
}

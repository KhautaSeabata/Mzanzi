// ============================================
// ANALYSIS.JS - Complete Forex SMC Analyzer with OB, FVG, ChoCh
// ============================================

// Global State
const state = {
    charts: {},
    isAnalysisEnabled: true,
    activeChart: 1,
    numCharts: 1,
    signals: [],
    signalFilter: 'all',
    isRunning: false,
    settings: {
        showOB: true,
        showFVG: true,
        showChoCh: true,
        soundAlerts: true
    }
};

// Forex pairs configuration
const PAIRS = {
    'US100': { name: 'US 100', decimals: 2, basePrice: 25670 },
    'XAUUSD': { name: 'GOLD', decimals: 2, basePrice: 2650 },
    'EURUSD': { name: 'EUR/USD', decimals: 5, basePrice: 1.0850 },
    'GBPUSD': { name: 'GBP/USD', decimals: 5, basePrice: 1.2750 },
    'AUDUSD': { name: 'AUD/USD', decimals: 5, basePrice: 0.6450 },
    'AUDCAD': { name: 'AUD/CAD', decimals: 5, basePrice: 0.9050 }
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
    updateConnectionStatus(false);
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
            lastUpdate: Date.now(),
            smcData: {
                orderBlocks: [],
                fvgs: [],
                chochs: [],
                swingHighs: [],
                swingLows: []
            }
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
function generateForexData(symbol, count = 150) {
    const data = [];
    const config = PAIRS[symbol];
    let basePrice = config.basePrice;
    
    // Volatility settings
    const volatility = symbol === 'XAUUSD' || symbol === 'US100' ? 
        (Math.random() * 3 + 1) : 0.0015;
    
    for (let i = 0; i < count; i++) {
        const change = (Math.random() - 0.48) * volatility; // Slight upward bias
        const trendFactor = Math.sin(i / 20) * volatility * 0.5;
        
        const open = basePrice;
        const close = open + change + trendFactor;
        const high = Math.max(open, close) + Math.random() * volatility * 0.6;
        const low = Math.min(open, close) - Math.random() * volatility * 0.6;
        
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
            analyzeSMCStructure(i);
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
        analyzeSMCStructure(i);
        drawChart(i);
    }
}

// Update chart data periodically
function updateChartData(chartNum) {
    if (!state.isRunning) return;
    
    const chart = state.charts[chartNum];
    const now = Date.now();
    
    // Add new candle every 1.5 seconds (simulated)
    if (now - chart.lastUpdate > 1500) {
        const lastCandle = chart.data[chart.data.length - 1];
        const config = PAIRS[chart.symbol];
        const volatility = chart.symbol === 'XAUUSD' || chart.symbol === 'US100' ? 
            (Math.random() * 3 + 1) : 0.0015;
        const change = (Math.random() - 0.48) * volatility;
        
        const newCandle = {
            time: now,
            open: lastCandle.close,
            high: Math.max(lastCandle.close, lastCandle.close + change) + Math.random() * volatility * 0.6,
            low: Math.min(lastCandle.close, lastCandle.close + change) - Math.random() * volatility * 0.6,
            close: parseFloat((lastCandle.close + change).toFixed(config.decimals))
        };
        
        chart.data.push(newCandle);
        if (chart.data.length > 250) chart.data.shift();
        
        chart.lastUpdate = now;
        
        // Analyze SMC structure
        if (state.isAnalysisEnabled) {
            analyzeSMCStructure(chartNum);
            
            // Check for new signals
            if (Math.random() > 0.97) { // 3% chance per update
                detectAndCreateSignal(chartNum);
            }
        }
    }
    
    drawChart(chartNum);
    updateChartInfo(chartNum);
    
    chart.animationId = requestAnimationFrame(() => updateChartData(chartNum));
}

// Analyze complete SMC structure
function analyzeSMCStructure(chartNum) {
    const chart = state.charts[chartNum];
    const data = chart.data;
    
    if (data.length < 30) return;
    
    // Find swing points
    chart.smcData.swingHighs = findSwingPoints(data, 'high', 8);
    chart.smcData.swingLows = findSwingPoints(data, 'low', 8);
    
    // Detect Order Blocks
    chart.smcData.orderBlocks = detectOrderBlocks(data);
    
    // Detect Fair Value Gaps (FVG)
    chart.smcData.fvgs = detectFVG(data);
    
    // Detect Change of Character (ChoCh)
    chart.smcData.chochs = detectChoCh(data, chart.smcData.swingHighs, chart.smcData.swingLows);
}

// Find swing high/low points
function findSwingPoints(data, type = 'high', lookback = 8) {
    const points = [];
    
    for (let i = lookback; i < data.length - lookback; i++) {
        const current = data[i];
        let isSwing = true;
        
        // Check if it's a swing point
        for (let j = i - lookback; j <= i + lookback; j++) {
            if (j !== i) {
                if (type === 'high' && data[j].high >= current.high) {
                    isSwing = false;
                    break;
                }
                if (type === 'low' && data[j].low <= current.low) {
                    isSwing = false;
                    break;
                }
            }
        }
        
        if (isSwing) {
            points.push({
                idx: i,
                price: type === 'high' ? current.high : current.low,
                type: type
            });
        }
    }
    
    return points;
}

// Detect Order Blocks
function detectOrderBlocks(data) {
    const orderBlocks = [];
    
    for (let i = 5; i < data.length - 1; i++) {
        const curr = data[i];
        const prev = data[i - 1];
        const next = data[i + 1];
        
        // Bullish Order Block: Strong up move after down candle
        if (prev.close < prev.open && // Previous candle bearish
            curr.close > curr.open && // Current candle bullish
            curr.close > prev.high && // Break above
            (curr.close - curr.open) > (prev.open - prev.close) * 1.5) { // Strong move
            
            orderBlocks.push({
                type: 'bullish',
                startIdx: i - 1,
                endIdx: i + 3,
                high: prev.high,
                low: prev.low,
                detected: i
            });
        }
        
        // Bearish Order Block: Strong down move after up candle
        if (prev.close > prev.open && // Previous candle bullish
            curr.close < curr.open && // Current candle bearish
            curr.close < prev.low && // Break below
            (curr.open - curr.close) > (prev.close - prev.open) * 1.5) { // Strong move
            
            orderBlocks.push({
                type: 'bearish',
                startIdx: i - 1,
                endIdx: i + 3,
                high: prev.high,
                low: prev.low,
                detected: i
            });
        }
    }
    
    // Keep only recent order blocks
    return orderBlocks.filter(ob => ob.endIdx >= data.length - 100);
}

// Detect Fair Value Gaps (FVG)
function detectFVG(data) {
    const fvgs = [];
    
    for (let i = 2; i < data.length; i++) {
        const candle1 = data[i - 2];
        const candle2 = data[i - 1];
        const candle3 = data[i];
        
        // Bullish FVG: Gap between candle1 high and candle3 low
        if (candle1.high < candle3.low && candle2.close > candle2.open) {
            fvgs.push({
                type: 'bullish',
                startIdx: i - 2,
                endIdx: i + 5,
                high: candle3.low,
                low: candle1.high,
                detected: i
            });
        }
        
        // Bearish FVG: Gap between candle1 low and candle3 high
        if (candle1.low > candle3.high && candle2.close < candle2.open) {
            fvgs.push({
                type: 'bearish',
                startIdx: i - 2,
                endIdx: i + 5,
                high: candle1.low,
                low: candle3.high,
                detected: i
            });
        }
    }
    
    // Keep only recent FVGs
    return fvgs.filter(fvg => fvg.endIdx >= data.length - 80);
}

// Detect Change of Character (ChoCh)
function detectChoCh(data, swingHighs, swingLows) {
    const chochs = [];
    
    // Need at least 2 swing points to detect ChoCh
    if (swingHighs.length < 2 || swingLows.length < 2) return chochs;
    
    // Bullish ChoCh: Price breaks above previous swing high
    for (let i = 1; i < swingHighs.length; i++) {
        const prevHigh = swingHighs[i - 1];
        const currHigh = swingHighs[i];
        
        if (currHigh.price > prevHigh.price * 1.001) { // 0.1% threshold
            chochs.push({
                type: 'bullish',
                idx: currHigh.idx,
                price: prevHigh.price,
                label: 'ChoCH'
            });
        }
    }
    
    // Bearish ChoCh: Price breaks below previous swing low
    for (let i = 1; i < swingLows.length; i++) {
        const prevLow = swingLows[i - 1];
        const currLow = swingLows[i];
        
        if (currLow.price < prevLow.price * 0.999) { // 0.1% threshold
            chochs.push({
                type: 'bearish',
                idx: currLow.idx,
                price: prevLow.price,
                label: 'ChoCH'
            });
        }
    }
    
    return chochs;
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
    
    // Helper function to convert price to Y coordinate
    const priceToY = (price) => {
        return h - ((price - minPrice) / (maxPrice - minPrice)) * h;
    };
    
    // Helper function to convert index to X coordinate
    const idxToX = (localIdx) => {
        return localIdx * totalWidth + totalWidth / 2;
    };
    
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
    
    // Draw SMC Analysis overlays (behind candlesticks)
    if (state.isAnalysisEnabled) {
        // Draw Order Blocks
        if (state.settings.showOB) {
            chart.smcData.orderBlocks.forEach(ob => {
                if (ob.startIdx >= startIdx && ob.startIdx < endIdx) {
                    const localStart = ob.startIdx - startIdx;
                    const localEnd = Math.min(ob.endIdx - startIdx, visibleCandles);
                    const x1 = idxToX(localStart);
                    const x2 = idxToX(localEnd);
                    const y1 = priceToY(ob.high);
                    const y2 = priceToY(ob.low);
                    
                    // Draw Order Block zone
                    ctx.fillStyle = ob.type === 'bullish' ? 
                        'rgba(139, 92, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)';
                    ctx.fillRect(x1 - candleWidth/2, y1, x2 - x1 + candleWidth, y2 - y1);
                    
                    ctx.strokeStyle = ob.type === 'bullish' ? 
                        'rgba(139, 92, 246, 0.6)' : 'rgba(239, 68, 68, 0.6)';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(x1 - candleWidth/2, y1, x2 - x1 + candleWidth, y2 - y1);
                    
                    // Label
                    ctx.fillStyle = ob.type === 'bullish' ? '#8B5CF6' : '#EF4444';
                    ctx.font = '10px sans-serif';
                    ctx.fillText('OB', x1, y1 - 5);
                }
            });
        }
        
        // Draw Fair Value Gaps (FVG)
        if (state.settings.showFVG) {
            chart.smcData.fvgs.forEach(fvg => {
                if (fvg.startIdx >= startIdx && fvg.startIdx < endIdx) {
                    const localStart = fvg.startIdx - startIdx;
                    const localEnd = Math.min(fvg.endIdx - startIdx, visibleCandles);
                    const x1 = idxToX(localStart);
                    const x2 = idxToX(localEnd);
                    const y1 = priceToY(fvg.high);
                    const y2 = priceToY(fvg.low);
                    
                    // Draw FVG zone
                    ctx.fillStyle = fvg.type === 'bullish' ? 
                        'rgba(255, 215, 0, 0.15)' : 'rgba(255, 140, 0, 0.15)';
                    ctx.fillRect(x1 - candleWidth/2, y1, x2 - x1 + candleWidth, y2 - y1);
                    
                    ctx.strokeStyle = fvg.type === 'bullish' ? 
                        'rgba(255, 215, 0, 0.5)' : 'rgba(255, 140, 0, 0.5)';
                    ctx.lineWidth = 1;
                    ctx.setLineDash([5, 5]);
                    ctx.strokeRect(x1 - candleWidth/2, y1, x2 - x1 + candleWidth, y2 - y1);
                    ctx.setLineDash([]);
                    
                    // Label
                    ctx.fillStyle = fvg.type === 'bullish' ? '#FFD700' : '#FF8C00';
                    ctx.font = '10px sans-serif';
                    ctx.fillText('FVG', x1, y2 + 12);
                }
            });
        }
    }
    
    // Draw candlesticks
    visibleData.forEach((candle, idx) => {
        const x = idxToX(idx);
        const yHigh = priceToY(candle.high);
        const yLow = priceToY(candle.low);
        const yOpen = priceToY(candle.open);
        const yClose = priceToY(candle.close);
        
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
    
    // Draw ChoCh markers (on top of candlesticks)
    if (state.isAnalysisEnabled && state.settings.showChoCh) {
        chart.smcData.chochs.forEach(choch => {
            if (choch.idx >= startIdx && choch.idx < endIdx) {
                const localIdx = choch.idx - startIdx;
                const x = idxToX(localIdx);
                const y = priceToY(choch.price);
                
                // Draw ChoCh marker
                ctx.fillStyle = choch.type === 'bullish' ? '#30D158' : '#FF453A';
                ctx.font = 'bold 11px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('ChoCH', x, y + (choch.type === 'bullish' ? 15 : -5));
                
                // Draw small circle
                ctx.beginPath();
                ctx.arc(x, y, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }
    
    ctx.textAlign = 'left'; // Reset
}

// Detect and create trading signal
function detectAndCreateSignal(chartNum) {
    const chart = state.charts[chartNum];
    const data = chart.data;
    const smcData = chart.smcData;
    
    if (data.length < 20) return;
    
    const lastCandle = data[data.length - 1];
    const config = PAIRS[chart.symbol];
    
    // Check for Order Block + FVG confluence
    const recentOB = smcData.orderBlocks.filter(ob => 
        ob.endIdx >= data.length - 10
    );
    const recentFVG = smcData.fvgs.filter(fvg => 
        fvg.endIdx >= data.length - 10
    );
    
    if (recentOB.length > 0 || recentFVG.length > 0) {
        const pattern = recentOB.length > 0 ? recentOB[0] : recentFVG[0];
        const type = pattern.type;
        const patternName = recentOB.length > 0 ? 'Order Block' : 'Fair Value Gap';
        
        // Calculate targets
        const atr = calculateATR(data.slice(-20));
        const entry = lastCandle.close;
        const tp = type === 'bullish' ? 
            entry + (atr * 2) : 
            entry - (atr * 2);
        const sl = type === 'bullish' ? 
            entry - atr : 
            entry + atr;
        
        createSignal(chartNum, {
            type: type,
            pattern: patternName,
            price: entry,
            tp: tp,
            sl: sl,
            confidence: 70 + Math.random() * 25
        });
    }
}

// Calculate ATR (Average True Range)
function calculateATR(data, period = 14) {
    if (data.length < period) return 0;
    
    let sum = 0;
    for (let i = 1; i < period && i < data.length; i++) {
        const high = data[i].high;
        const low = data[i].low;
        const prevClose = data[i-1].close;
        const tr = Math.max(
            high - low,
            Math.abs(high - prevClose),
            Math.abs(low - prevClose)
        );
        sum += tr;
    }
    
    return sum / Math.min(period - 1, data.length - 1);
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
        price: pattern.price.toFixed(config.decimals),
        tp: pattern.tp.toFixed(config.decimals),
        sl: pattern.sl.toFixed(config.decimals),
        confidence: Math.round(pattern.confidence),
        time: new Date().toLocaleTimeString()
    };
    
    state.signals.unshift(signal);
    if (state.signals.length > 50) state.signals.pop();
    
    updateSignalsList();
    
    // Play sound if enabled
    if (state.settings.soundAlerts) {
        playAlertSound();
    }
}

// Play alert sound
function playAlertSound() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
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
                    <span class="detail-label">Entry:</span>
                    <span class="detail-value">${signal.price}</span>
                </div>
                <div class="signal-detail">
                    <span class="detail-label">Confidence:</span>
                    <span class="detail-value">${signal.confidence}%</span>
                </div>
                <div class="price-targets">
            <div class="target-label">Expected Move</div>
            <div class="target-range">
                <span class="target-price sl">SL ${signal.sl}</span>
                <div class="target-bar ${signal.type}"></div>
                <span class="target-price tp">TP ${signal.tp}</span>
            </div>
        </div>
        <div class="confidence-bar">
            <div class="confidence-fill ${signal.confidence > 80 ? 'high' : ''}" style="width: ${signal.confidence}%"></div>
        </div>
        <div class="signal-time">${signal.time}</div>
    </div>
`).join('');

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
    state.charts[chartNum].symbol = symbol;
state.charts[chartNum].timeframe = timeframe;
state.charts[chartNum].data = generateForexData(symbol);
state.charts[chartNum].offset = 0;

analyzeSMCStructure(chartNum);
drawChart(chartNum);
updateChartInfo(chartNum);

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

// Update chart tabs visibility
const tabs = document.querySelectorAll('.chart-tab');
tabs.forEach((tab, idx) => {
    tab.style.display = idx < num ? 'block' : 'none';
});

// Switch to chart 1 if current is hidden
if (state.activeChart > num) {
    switchChart(1);
}

    
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
// Update button states
const btns = document.querySelectorAll('.signal-filter-btn');
btns.forEach(btn => {
    btn.classList.remove('active');
    if (btn.textContent.toLowerCase().includes(filter)) {
        btn.classList.add('active');
    }
});

updateSignalsList();

// Show selected page
document.getElementById(pageId).classList.add('active');

// Update nav items
document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
});
event.currentTarget.classList.add('active');


// Update settings
switch(setting) {
    case 'smc':
        state.isAnalysisEnabled = element.classList.contains('active');
        toggleAnalysis();
        break;
    case 'ob':
        state.settings.showOB = element.classList.contains('active');
        break;
    case 'fvg':
        state.settings.showFVG = element.classList.contains('active');
        break;
    case 'choch':
        state.settings.showChoCh = element.classList.contains('active');
        break;
    case 'sound':
        state.settings.soundAlerts = element.classList.contains('active');
        break;
}

// Redraw charts
for (let i = 1; i <= state.numCharts; i++) {
    drawChart(i);
}

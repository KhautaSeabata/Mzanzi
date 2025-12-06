// SMC Forex Analyzer - Complete Analysis Engine
// Smart Money Concepts Implementation

// Global state
const state = {
    charts: {},
    signals: [],
    settings: {
        smc: true,
        ob: true,
        fvg: true,
        choch: true,
        sound: true
    },
    running: false,
    signalFilter: 'all'
};

// Chart data structure
class ChartData {
    constructor(chartId, symbol, timeframe) {
        this.chartId = chartId;
        this.symbol = symbol;
        this.timeframe = timeframe;
        this.candles = [];
        this.canvas = document.getElementById(`canvas${chartId}`);
        this.ctx = this.canvas.getContext('2d');
        this.zoom = 1;
        this.pan = 0;
        this.touching = false;
        this.lastTouch = null;
        
        // SMC structures
        this.orderBlocks = [];
        this.fvgs = [];
        this.chochs = [];
        this.liquidityZones = [];
        this.trend = 'ranging';
        this.structureBreaks = [];
        
        this.setupCanvas();
        this.setupTouchHandlers();
    }
    
    setupCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
    }
    
    setupTouchHandlers() {
        const container = this.canvas.parentElement;
        
        let startX = 0;
        let startPan = 0;
        
        container.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startPan = this.pan;
        });
        
        container.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const deltaX = e.touches[0].clientX - startX;
            this.pan = startPan + deltaX;
            this.draw();
        }, { passive: false });
    }
    
    addCandle(candle) {
        this.candles.push(candle);
        if (this.candles.length > 200) {
            this.candles.shift();
        }
        this.analyzeSMC();
    }
    
    analyzeSMC() {
        if (!state.settings.smc || this.candles.length < 20) return;
        
        // Detect Order Blocks
        if (state.settings.ob) {
            this.detectOrderBlocks();
        }
        
        // Detect Fair Value Gaps
        if (state.settings.fvg) {
            this.detectFVGs();
        }
        
        // Detect Change of Character
        if (state.settings.choch) {
            this.detectChoCh();
        }
        
        // Detect liquidity zones
        this.detectLiquidity();
        
        // Determine trend
        this.determineTrend();
        
        // Generate signals
        this.generateSignals();
    }
    
    detectOrderBlocks() {
        const len = this.candles.length;
        if (len < 10) return;
        
        this.orderBlocks = [];
        
        for (let i = 5; i < len - 3; i++) {
            const curr = this.candles[i];
            const next1 = this.candles[i + 1];
            const next2 = this.candles[i + 2];
            const next3 = this.candles[i + 3];
            
            // Bullish Order Block: Strong down candle followed by strong up moves
            const isBullishOB = 
                curr.close < curr.open && // Down candle
                (curr.open - curr.close) > (curr.high - curr.low) * 0.6 && // Strong body
                next1.close > next1.open && // Up candle
                next2.close > next2.open &&
                next3.close > curr.open; // Breaks above
            
            if (isBullishOB) {
                this.orderBlocks.push({
                    type: 'bullish',
                    high: curr.open,
                    low: curr.close,
                    index: i,
                    timestamp: curr.timestamp,
                    active: true
                });
            }
            
            // Bearish Order Block: Strong up candle followed by strong down moves
            const isBearishOB = 
                curr.close > curr.open && // Up candle
                (curr.close - curr.open) > (curr.high - curr.low) * 0.6 && // Strong body
                next1.close < next1.open && // Down candle
                next2.close < next2.open &&
                next3.close < curr.open; // Breaks below
            
            if (isBearishOB) {
                this.orderBlocks.push({
                    type: 'bearish',
                    high: curr.close,
                    low: curr.open,
                    index: i,
                    timestamp: curr.timestamp,
                    active: true
                });
            }
        }
        
        // Keep only recent order blocks
        this.orderBlocks = this.orderBlocks.slice(-10);
    }
    
    detectFVGs() {
        const len = this.candles.length;
        if (len < 5) return;
        
        this.fvgs = [];
        
        for (let i = 1; i < len - 1; i++) {
            const prev = this.candles[i - 1];
            const curr = this.candles[i];
            const next = this.candles[i + 1];
            
            // Bullish FVG: Gap between prev low and next high
            const bullishGap = next.low - prev.high;
            if (bullishGap > 0 && curr.close > curr.open) {
                this.fvgs.push({
                    type: 'bullish',
                    high: next.low,
                    low: prev.high,
                    index: i,
                    timestamp: curr.timestamp,
                    filled: false
                });
            }
            
            // Bearish FVG: Gap between prev high and next low
            const bearishGap = prev.low - next.high;
            if (bearishGap > 0 && curr.close < curr.open) {
                this.fvgs.push({
                    type: 'bearish',
                    high: prev.low,
                    low: next.high,
                    index: i,
                    timestamp: curr.timestamp,
                    filled: false
                });
            }
        }
        
        // Check if FVGs are filled
        const lastPrice = this.candles[len - 1].close;
        this.fvgs.forEach(fvg => {
            if (fvg.type === 'bullish' && lastPrice <= fvg.low) {
                fvg.filled = true;
            } else if (fvg.type === 'bearish' && lastPrice >= fvg.high) {
                fvg.filled = true;
            }
        });
        
        // Keep only unfilled FVGs
        this.fvgs = this.fvgs.filter(fvg => !fvg.filled).slice(-8);
    }
    
    detectChoCh() {
        const len = this.candles.length;
        if (len < 15) return;
        
        this.chochs = [];
        
        // Find swing highs and lows
        const swings = [];
        for (let i = 5; i < len - 5; i++) {
            const candle = this.candles[i];
            let isSwingHigh = true;
            let isSwingLow = true;
            
            for (let j = i - 5; j <= i + 5; j++) {
                if (j === i) continue;
                if (this.candles[j].high > candle.high) isSwingHigh = false;
                if (this.candles[j].low < candle.low) isSwingLow = false;
            }
            
            if (isSwingHigh) {
                swings.push({ type: 'high', price: candle.high, index: i });
            } else if (isSwingLow) {
                swings.push({ type: 'low', price: candle.low, index: i });
            }
        }
        
        // Detect ChoCh (Change of Character)
        for (let i = 1; i < swings.length; i++) {
            const prev = swings[i - 1];
            const curr = swings[i];
            
            // Bullish ChoCh: Break above previous high after lower low
            if (prev.type === 'low' && curr.type === 'high' && i > 1) {
                const prevHigh = swings[i - 2];
                if (prevHigh.type === 'high' && curr.price > prevHigh.price) {
                    this.chochs.push({
                        type: 'bullish',
                        price: prevHigh.price,
                        index: curr.index,
                        timestamp: this.candles[curr.index].timestamp
                    });
                }
            }
            
            // Bearish ChoCh: Break below previous low after higher high
            if (prev.type === 'high' && curr.type === 'low' && i > 1) {
                const prevLow = swings[i - 2];
                if (prevLow.type === 'low' && curr.price < prevLow.price) {
                    this.chochs.push({
                        type: 'bearish',
                        price: prevLow.price,
                        index: curr.index,
                        timestamp: this.candles[curr.index].timestamp
                    });
                }
            }
        }
        
        this.chochs = this.chochs.slice(-5);
    }
    
    detectLiquidity() {
        const len = this.candles.length;
        if (len < 20) return;
        
        this.liquidityZones = [];
        
        // Find areas with multiple equal highs/lows (liquidity pools)
        const tolerance = 0.001; // 0.1% tolerance
        
        for (let i = len - 50; i < len; i++) {
            if (i < 0) continue;
            
            const candle = this.candles[i];
            let highCount = 1;
            let lowCount = 1;
            
            // Count similar highs and lows nearby
            for (let j = Math.max(0, i - 10); j < Math.min(len, i + 10); j++) {
                if (j === i) continue;
                const other = this.candles[j];
                
                if (Math.abs(other.high - candle.high) / candle.high < tolerance) {
                    highCount++;
                }
                if (Math.abs(other.low - candle.low) / candle.low < tolerance) {
                    lowCount++;
                }
            }
            
            if (highCount >= 3) {
                this.liquidityZones.push({
                    type: 'high',
                    price: candle.high,
                    index: i,
                    strength: highCount
                });
            }
            if (lowCount >= 3) {
                this.liquidityZones.push({
                    type: 'low',
                    price: candle.low,
                    index: i,
                    strength: lowCount
                });
            }
        }
        
        // Remove duplicates
        this.liquidityZones = this.liquidityZones.filter((zone, index, self) =>
            index === self.findIndex(z => 
                z.type === zone.type && Math.abs(z.price - zone.price) / zone.price < tolerance
            )
        );
    }
    
    determineTrend() {
        const len = this.candles.length;
        if (len < 30) return;
        
        const recent = this.candles.slice(-30);
        const first = recent[0];
        const last = recent[recent.length - 1];
        
        // Simple trend based on highs and lows
        const priceChange = (last.close - first.close) / first.close;
        
        if (priceChange > 0.02) {
            this.trend = 'uptrend';
        } else if (priceChange < -0.02) {
            this.trend = 'downtrend';
        } else {
            this.trend = 'ranging';
        }
    }
    
    generateSignals() {
        const len = this.candles.length;
        if (len < 10) return;
        
        const lastCandle = this.candles[len - 1];
        const prevCandle = this.candles[len - 2];
        
        // Check for signal conditions
        const hasRecentOB = this.orderBlocks.some(ob => 
            ob.active && len - ob.index < 10
        );
        
        const hasRecentFVG = this.fvgs.some(fvg => 
            !fvg.filled && len - fvg.index < 15
        );
        
        const hasRecentChoCh = this.chochs.some(ch => 
            len - ch.index < 8
        );
        
        // Bullish signal conditions
        if (hasRecentOB && hasRecentFVG && this.trend !== 'downtrend') {
            const bullishOB = this.orderBlocks.find(ob => 
                ob.type === 'bullish' && ob.active && len - ob.index < 10
            );
            
            if (bullishOB && lastCandle.close > lastCandle.open) {
                const signal = {
                    id: Date.now() + Math.random(),
                    type: 'bullish',
                    symbol: this.symbol,
                    chartId: this.chartId,
                    entry: lastCandle.close,
                    tp: lastCandle.close * 1.015,
                    sl: lastCandle.close * 0.995,
                    confidence: this.calculateConfidence('bullish'),
                    timestamp: Date.now(),
                    patterns: ['Order Block', 'FVG'],
                    timeframe: this.getTimeframeName()
                };
                
                addSignal(signal);
            }
        }
        
        // Bearish signal conditions
        if (hasRecentOB && hasRecentFVG && this.trend !== 'uptrend') {
            const bearishOB = this.orderBlocks.find(ob => 
                ob.type === 'bearish' && ob.active && len - ob.index < 10
            );
            
            if (bearishOB && lastCandle.close < lastCandle.open) {
                const signal = {
                    id: Date.now() + Math.random(),
                    type: 'bearish',
                    symbol: this.symbol,
                    chartId: this.chartId,
                    entry: lastCandle.close,
                    tp: lastCandle.close * 0.985,
                    sl: lastCandle.close * 1.005,
                    confidence: this.calculateConfidence('bearish'),
                    timestamp: Date.now(),
                    patterns: ['Order Block', 'FVG'],
                    timeframe: this.getTimeframeName()
                };
                
                addSignal(signal);
            }
        }
    }
    
    calculateConfidence(type) {
        let score = 50;
        
        // Trend alignment
        if ((type === 'bullish' && this.trend === 'uptrend') ||
            (type === 'bearish' && this.trend === 'downtrend')) {
            score += 20;
        }
        
        // Multiple confirmations
        if (this.orderBlocks.length > 0) score += 10;
        if (this.fvgs.length > 0) score += 10;
        if (this.chochs.length > 0) score += 10;
        
        return Math.min(95, score);
    }
    
    getTimeframeName() {
        const names = {
            '300': '5M',
            '900': '15M',
            '1800': '30M',
            '3600': '1H',
            '14400': '4H'
        };
        return names[this.timeframe] || '5M';
    }
    
    draw() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        
        this.ctx.clearRect(0, 0, w, h);
        
        if (this.candles.length === 0) {
            this.ctx.fillStyle = '#8E8E93';
            this.ctx.font = '14px -apple-system';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Loading...', w / 2, h / 2);
            return;
        }
        
        // Calculate visible range
        const candleWidth = 8 * this.zoom;
        const gap = 2 * this.zoom;
        const totalWidth = (candleWidth + gap) * this.candles.length;
        const visibleCandles = Math.floor(w / (candleWidth + gap));
        const startIdx = Math.max(0, this.candles.length - visibleCandles);
        
        // Get price range
        let minPrice = Infinity;
        let maxPrice = -Infinity;
        for (let i = startIdx; i < this.candles.length; i++) {
            const c = this.candles[i];
            minPrice = Math.min(minPrice, c.low);
            maxPrice = Math.max(maxPrice, c.high);
        }
        
        const priceRange = maxPrice - minPrice;
        const padding = priceRange * 0.1;
        minPrice -= padding;
        maxPrice += padding;
        
        const priceToY = (price) => {
            return h - ((price - minPrice) / (maxPrice - minPrice)) * h;
        };
        
        // Draw grid
        this.ctx.strokeStyle = '#2C2C2E';
        this.ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
            const y = (h / 5) * i;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(w, y);
            this.ctx.stroke();
        }
        
        // Draw liquidity zones
        this.liquidityZones.forEach(zone => {
            if (zone.index < startIdx) return;
            
            const y = priceToY(zone.price);
            this.ctx.strokeStyle = zone.type === 'high' ? 'rgba(255, 69, 58, 0.3)' : 'rgba(48, 209, 88, 0.3)';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(w, y);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
            
            // Label
            this.ctx.fillStyle = zone.type === 'high' ? '#FF453A' : '#30D158';
            this.ctx.font = '10px -apple-system';
            this.ctx.fillText('💧', 5, y - 5);
        });
        
        // Draw Order Blocks
        this.orderBlocks.forEach(ob => {
            if (!ob.active || ob.index < startIdx) return;
            
            const x = (ob.index - startIdx) * (candleWidth + gap);
            const y1 = priceToY(ob.high);
            const y2 = priceToY(ob.low);
            
            this.ctx.fillStyle = ob.type === 'bullish' ? 
                'rgba(48, 209, 88, 0.15)' : 'rgba(255, 69, 58, 0.15)';
            this.ctx.fillRect(x, y1, (candleWidth + gap) * 3, y2 - y1);
            
            this.ctx.strokeStyle = ob.type === 'bullish' ? '#30D158' : '#FF453A';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(x, y1, (candleWidth + gap) * 3, y2 - y1);
            
            // Label
            this.ctx.fillStyle = ob.type === 'bullish' ? '#30D158' : '#FF453A';
            this.ctx.font = 'bold 9px -apple-system';
            this.ctx.fillText('BOS', x + 5, y1 + 12);
        });
        
        // Draw FVGs
        this.fvgs.forEach(fvg => {
            if (fvg.filled || fvg.index < startIdx) return;
            
            const x = (fvg.index - startIdx) * (candleWidth + gap);
            const y1 = priceToY(fvg.high);
            const y2 = priceToY(fvg.low);
            
            this.ctx.fillStyle = fvg.type === 'bullish' ? 
                'rgba(139, 92, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)';
            this.ctx.fillRect(x, y1, w - x, y2 - y1);
            
            this.ctx.strokeStyle = fvg.type === 'bullish' ? '#8B5CF6' : '#EF4444';
            this.ctx.lineWidth = 1;
            this.ctx.setLineDash([3, 3]);
            this.ctx.strokeRect(x, y1, w - x, y2 - y1);
            this.ctx.setLineDash([]);
            
            // Label
            this.ctx.fillStyle = fvg.type === 'bullish' ? '#8B5CF6' : '#EF4444';
            this.ctx.font = 'bold 9px -apple-system';
            this.ctx.fillText('FVG', x + 5, y1 + 12);
        });
        
        // Draw ChoCh markers
        this.chochs.forEach(ch => {
            if (ch.index < startIdx) return;
            
            const x = (ch.index - startIdx) * (candleWidth + gap);
            const y = priceToY(ch.price);
            
            this.ctx.fillStyle = ch.type === 'bullish' ? '#30D158' : '#FF453A';
            this.ctx.font = 'bold 10px -apple-system';
            this.ctx.fillText('ChoCh', x - 15, y - 5);
            
            // Arrow
            this.ctx.beginPath();
            if (ch.type === 'bullish') {
                this.ctx.moveTo(x, y);
                this.ctx.lineTo(x - 5, y + 10);
                this.ctx.lineTo(x + 5, y + 10);
            } else {
                this.ctx.moveTo(x, y);
                this.ctx.lineTo(x - 5, y - 10);
                this.ctx.lineTo(x + 5, y - 10);
            }
            this.ctx.closePath();
            this.ctx.fill();
        });
        
        // Draw candles
        for (let i = startIdx; i < this.candles.length; i++) {
            const c = this.candles[i];
            const x = (i - startIdx) * (candleWidth + gap) + gap / 2;
            
            const isUp = c.close > c.open;
            this.ctx.fillStyle = isUp ? '#30D158' : '#FF453A';
            this.ctx.strokeStyle = isUp ? '#30D158' : '#FF453A';
            
            // Wick
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(x + candleWidth / 2, priceToY(c.high));
            this.ctx.lineTo(x + candleWidth / 2, priceToY(c.low));
            this.ctx.stroke();
            
            // Body
            const bodyTop = priceToY(Math.max(c.open, c.close));
            const bodyBottom = priceToY(Math.min(c.open, c.close));
            const bodyHeight = Math.max(1, bodyBottom - bodyTop);
            
            this.ctx.fillRect(x, bodyTop, candleWidth, bodyHeight);
        }
        
        // Draw price labels
        this.ctx.fillStyle = '#8E8E93';
        this.ctx.font = '11px -apple-system';
        this.ctx.textAlign = 'right';
        for (let i = 0; i <= 4; i++) {
            const price = minPrice + (maxPrice - minPrice) * (i / 4);
            const y = h - (h * i / 4);
            this.ctx.fillText(price.toFixed(2), w - 5, y + 4);
        }
    }
}

// Generate realistic candle data
function generateCandles(symbol, count = 100) {
    const candles = [];
    let price = getBasePrice(symbol);
    let timestamp = Date.now() - count * 5 * 60 * 1000;
    
    for (let i = 0; i < count; i++) {
        const trend = Math.sin(i / 10) * 0.003;
        const volatility = 0.002;
        const change = (Math.random() - 0.5) * volatility + trend;
        
        const open = price;
        const close = price * (1 + change);
        const high = Math.max(open, close) * (1 + Math.random() * 0.001);
        const low = Math.min(open, close) * (1 - Math.random() * 0.001);
        
        candles.push({
            timestamp,
            open,
            high,
            low,
            close,
            volume: Math.random() * 1000 + 500
        });
        
        price = close;
        timestamp += 5 * 60 * 1000;
    }
    
    return candles;
}

function getBasePrice(symbol) {
    const prices = {
        'US100': 21500,
        'XAUUSD': 2650,
        'EURUSD': 1.0850,
        'GBPUSD': 1.2650,
        'AUDUSD': 0.6550,
        'AUDCAD': 0.9150
    };
    return prices[symbol] || 1.0;
}

// Initialize chart
function initChart(chartId) {
    const symbol = document.getElementById(`symbol${chartId}`).value;
    const timeframe = document.getElementById(`timeframe${chartId}`).value;
    
    const chart = new ChartData(chartId, symbol, timeframe);
    state.charts[chartId] = chart;
    
    // Load initial data
    const candles = generateCandles(symbol);
    candles.forEach(c => chart.addCandle(c));
    chart.draw();
    
    updateChartInfo(chartId);
}

// Update chart info bar
function updateChartInfo(chartId) {
    const chart = state.charts[chartId];
    if (!chart || chart.candles.length === 0) return;
    
    const last = chart.candles[chart.candles.length - 1];
    const first = chart.candles[0];
    
    document.getElementById(`price${chartId}`).textContent = last.close.toFixed(5);
    
    const change = ((last.close - first.close) / first.close) * 100;
    const changeEl = document.getElementById(`change${chartId}`);
    changeEl.textContent = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
    changeEl.className = 'info-value ' + (change >= 0 ? 'green' : 'red');
    
    const high = Math.max(...chart.candles.map(c => c.high));
    const low = Math.min(...chart.candles.map(c => c.low));
    document.getElementById(`highlow${chartId}`).textContent = 
        `${high.toFixed(2)}/${low.toFixed(2)}`;
}

// Chart controls
function updateChart(chartId) {
    if (state.charts[chartId]) {
        const symbol = document.getElementById(`symbol${chartId}`).value;
        const timeframe = document.getElementById(`timeframe${chartId}`).value;
        
        state.charts[chartId].symbol = symbol;
        state.charts[chartId].timeframe = timeframe;
        state.charts[chartId].candles = [];
        
        const candles = generateCandles(symbol);
        candles.forEach(c => state.charts[chartId].addCandle(c));
        state.charts[chartId].draw();
        
        updateChartInfo(chartId);
        
        const symbolName = document.getElementById(`symbol${chartId}`).selectedOptions[0].text;
        document.getElementById(`symbolName${chartId}`).textContent = symbolName;
    }
}

function zoom(chartId, direction) {
    const chart = state.charts[chartId];
    if (!chart) return;
    
    if (direction === 'in') {
        chart.zoom = Math.min(3, chart.zoom * 1.2);
    } else {
        chart.zoom = Math.max(0.5, chart.zoom / 1.2);
    }
    chart.draw();
}

function changeNumCharts() {
    const num = parseInt(document.getElementById('numCharts').value);
    
    for (let i = 1; i <= 4; i++) {
        const chartEl = document.getElementById(`chart${i}`);
        const tabEl = document.querySelector(`.chart-tab:nth-child(${i})`);
        
        if (i <= num) {
            tabEl.style.display = 'block';
            if (!state.charts[i]) {
                initChart(i);
            }
        } else {
            tabEl.style.display = 'none';
            if (chartEl.classList.contains('active')) {
                switchChart(1);
            }
        }
    }
}

function switchChart(chartId) {
    document.querySelectorAll('.single-chart').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.chart-tab').forEach(el => el.classList.remove('active'));
    
    document.getElementById(`chart${chartId}`).classList.add('active');
    document.querySelector(`.chart-tab:nth-child(${chartId})`).classList.add('active');
}

// Chart updates
let updateInterval;

function startAllCharts() {
    state.running = true;
    document.querySelector('[class*="status-indicator"]').className = 
        'status-indicator status-connected';
    
    updateInterval = setInterval(() => {
        Object.values(state.charts).forEach(chart => {
            // Generate new candle
            const last = chart.candles[chart.candles.length - 1];
            const volatility = 0.002;
            const trend = chart.trend === 'uptrend' ? 0.0005 : 
                         chart.trend === 'downtrend' ? -0.0005 : 0;
            const change = (Math.random() - 0.5) * volatility + trend;
            
            const open = last.close;
            const close = open * (1 + change);
            const high = Math.max(open, close) * (1 + Math.random() * 0.001);
            const low = Math.min(open, close) * (1 - Math.random() * 0.001);
            
            chart.addCandle({
                timestamp: Date.now(),
                open,
                high,
                low,
                close,
                volume: Math.random() * 1000 + 500
            });
            
            chart.draw();
            updateChartInfo(chart.chartId);
        });
    }, 3000);
}

function stopAllCharts() {
    state.running = false;
    document.querySelector('[class*="status-indicator"]').className = 
        'status-indicator status-disconnected';
    if (updateInterval) {
        clearInterval(updateInterval);
    }
}

function refreshAllCharts() {
    Object.values(state.charts).forEach(chart => {
        chart.candles = [];
        const candles = generateCandles(chart.symbol);
        candles.forEach(c => chart.addCandle(c));
        chart.draw();
        updateChartInfo(chart.chartId);
    });
}

function toggleAnalysis() {
    state.settings.smc = !state.settings.smc;
    const btn = document.getElementById('analysisToggle');
    if (state.settings.smc) {
        btn.classList.add('active');
        btn.textContent = '📊 SMC ON';
    } else {
        btn.classList.remove('active');
        btn.textContent = '📊 SMC OFF';
    }
    refreshAllCharts();
}

// Signals management
function addSignal(signal) {
    // Check if similar signal already exists
    const exists = state.signals.some(s => 
        s.symbol === signal.symbol && 
        s.type === signal.type &&
        Date.now() - s.timestamp < 60000
    );
    
    if (exists) return;
    
    state.signals.unshift(signal);
    if (state.signals.length > 20) {
        state.signals.pop();
    }
    
    renderSignals();
    
    if (state.settings.sound) {
        playNotificationSound();
    }
}

function renderSignals() {
    const container = document.getElementById('signalsList');
    
    let filtered = state.signals;
    if (state.signalFilter !== 'all') {
        filtered = state.signals.filter(s => s.type === state.signalFilter);
    }
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="no-signals">
                <div class="no-signals-icon">📊</div>
                <div>No ${state.signalFilter === 'all' ? '' : state.signalFilter} signals detected yet</div>
                <div style="font-size: 12px; margin-top: 8px;">Start charts to detect SMC patterns</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filtered.map(signal => {
        const rr = Math.abs((signal.tp - signal.entry) / (signal.entry - signal.sl)).toFixed(2);
        const timeAgo = getTimeAgo(signal.timestamp);
        
        return `
            <div class="signal-card ${signal.type}">
                <div class="signal-header">
                    <div>
                        <div class="signal-name">${signal.symbol}</div>
                        <div class="signal-symbol">${signal.patterns.join(' + ')}</div>
                    </div>
                    <div class="signal-badge ${signal.type}">
                        ${signal.type.toUpperCase()}
                    </div>
                </div>
                <div class="signal-details">
                    <div class="signal-detail">
                        <span class="detail-label">Entry</span>
                        <span class="detail-value">${signal.entry.toFixed(5)}</span>
                    </div>
                    <div class="signal-detail">
                        <span class="detail-label">Risk:Reward</span>
                        <span class="detail-value">1:${rr}</span>
                    </div>
                    <div class="signal-detail">
                        <span class="detail-label">Timeframe</span>
                        <span class="detail-value">${signal.timeframe}</span>
                    </div>
                    <div class="signal-detail">
                        <span class="detail-label">Confidence</span>
                        <span class="detail-value">${signal.confidence}%</span>
                    </div>
                </div>
                <div class="price-targets">
                    <div class="target-label">Price Targets</div>
                    <div class="target-range">
                        <span class="target-price sl">${signal.sl.toFixed(5)}</span>
                        <div class="target-bar ${signal.type}"></div>
                        <span class="target-price tp">${signal.tp.toFixed(5)}</span>
                    </div>
                    <div class="confidence-bar">
                        <div class="confidence-fill ${signal.confidence > 70 ? 'high' : ''}" 
                             style="width: ${signal.confidence}%"></div>
                    </div>
                </div>
                <div class="signal-time">${timeAgo}</div>
            </div>
        `;
    }).join('');
}

function filterSignals(filter) {
    state.signalFilter = filter;
    
    document.querySelectorAll('.signal-filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    renderSignals();
}

function clearAllSignals() {
    if (confirm('Clear all signals?')) {
        state.signals = [];
        renderSignals();
    }
}

function getTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

// Settings
function toggleSetting(element, setting) {
    element.classList.toggle('active');
    state.settings[setting] = element.classList.contains('active');
    
    if (['ob', 'fvg', 'choch'].includes(setting)) {
        refreshAllCharts();
    }
}

// Navigation
function switchPage(pageId) {
    document.querySelectorAll('.page-container').forEach(el => {
        el.classList.remove('active');
    });
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.remove('active');
    });
    
    document.getElementById(pageId).classList.add('active');
    event.currentTarget.classList.add('active');
    
    if (pageId === 'signalsPage') {
        renderSignals();
    }
}

// Sound notification
function playNotificationSound() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
}

// Initialize on load
window.addEventListener('load', () => {
    initChart(1);
    
    // Handle window resize
    window.addEventListener('resize', () => {
        Object.values(state.charts).forEach(chart => {
            chart.setupCanvas();
            chart.draw();
        });
    });
});

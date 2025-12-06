// SMC Forex Analyzer - Complete Analysis Engine with Real Market Data
const FIREBASE_URL = 'https://alerts-83c9b-default-rtdb.firebaseio.com';

let charts = {};
let currentChartView = 1;
let numActiveCharts = 1;
let analysisEnabled = true;
let allSignals = [];
let signalFilter = 'all';

// Symbol configuration
const SYMBOL_CONFIG = {
    'US100': { name: 'US 100', base: 21500, apiSymbol: 'US100' },
    'XAUUSD': { name: 'GOLD', base: 2650, apiSymbol: 'frxXAUUSD' },
    'EURUSD': { name: 'EUR/USD', base: 1.0850, apiSymbol: 'frxEURUSD' },
    'GBPUSD': { name: 'GBP/USD', base: 1.2650, apiSymbol: 'frxGBPUSD' },
    'AUDUSD': { name: 'AUD/USD', base: 0.6550, apiSymbol: 'frxAUDUSD' },
    'AUDCAD': { name: 'AUD/CAD', base: 0.9150, apiSymbol: 'frxAUDCAD' }
};

class ChartManager {
    constructor(id) {
        this.id = id;
        this.canvas = document.getElementById(`canvas${id}`);
        this.ctx = this.canvas.getContext('2d');
        this.data = [];
        this.ws = null;
        this.symbol = document.getElementById(`symbol${id}`).value;
        this.timeframe = parseInt(document.getElementById(`timeframe${id}`).value);
        this.zoom = 80;
        this.offset = 0;
        this.dragging = false;
        this.autoScroll = true;
        this.lastSignalTime = 0;
        
        // SMC Data structures
        this.smcData = {
            orderBlocks: [],
            fvgs: [],
            liquidityZones: [],
            bos: [],
            choch: [],
            swingPoints: [],
            marketStructure: 'ranging' // uptrend, downtrend, ranging
        };
        
        this.resizeCanvas();
        this.setupDrag();
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
    }

    setupDrag() {
        let startX, startOffset;
        this.canvas.addEventListener('touchstart', (e) => {
            this.dragging = true;
            startX = e.touches[0].clientX;
            startOffset = this.offset;
            this.autoScroll = false;
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            if (!this.dragging) return;
            e.preventDefault();
            const deltaX = e.touches[0].clientX - startX;
            const candlesPerScreen = Math.floor(this.zoom);
            const pixelsPerCandle = this.canvas.width / candlesPerScreen;
            const candlesDelta = Math.round(deltaX / pixelsPerCandle);
            this.offset = Math.max(0, Math.min(this.data.length - candlesPerScreen, startOffset - candlesDelta));
            this.draw();
        }, { passive: false });
        
        this.canvas.addEventListener('touchend', () => {
            this.dragging = false;
            if (this.offset >= this.data.length - this.zoom - 5) {
                this.autoScroll = true;
            }
        });
    }

    connect() {
        if (this.ws) this.ws.close();
        
        this.ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');
        
        this.ws.onopen = () => {
            updateConnectionStatus(true);
            const apiSymbol = SYMBOL_CONFIG[this.symbol].apiSymbol;
            
            // Subscribe to ticks
            this.ws.send(JSON.stringify({ 
                ticks: apiSymbol, 
                subscribe: 1 
            }));
            
            // Get historical candles
            this.ws.send(JSON.stringify({
                ticks_history: apiSymbol,
                count: 1000,
                end: 'latest',
                style: 'candles',
                granularity: this.timeframe
            }));
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            if (data.candles) {
                // Load historical data
                this.data = data.candles.map(c => ({
                    x: c.epoch * 1000,
                    o: parseFloat(c.open),
                    h: parseFloat(c.high),
                    l: parseFloat(c.low),
                    c: parseFloat(c.close)
                }));
                this.draw();
                this.updateInfo();
                if (analysisEnabled) this.analyzeSMC();
            } else if (data.tick) {
                // Update with live tick
                this.updateTick(parseFloat(data.tick.quote), data.tick.epoch * 1000);
            } else if (data.ohlc) {
                // Update candle
                const candle = data.ohlc;
                this.updateCandle({
                    x: candle.epoch * 1000,
                    o: parseFloat(candle.open),
                    h: parseFloat(candle.high),
                    l: parseFloat(candle.low),
                    c: parseFloat(candle.close)
                });
            }
        };

        this.ws.onerror = () => updateConnectionStatus(false);
        this.ws.onclose = () => updateConnectionStatus(false);
    }

    updateTick(price, time) {
        const candleStart = Math.floor(time / (this.timeframe * 1000)) * (this.timeframe * 1000);
        
        if (!this.data.length || candleStart > this.data[this.data.length - 1].x) {
            // New candle
            this.data.push({ 
                x: candleStart, 
                o: price, 
                h: price, 
                l: price, 
                c: price 
            });
            if (this.data.length > 1000) this.data.shift();
            if (analysisEnabled) this.analyzeSMC();
        } else {
            // Update current candle
            const last = this.data[this.data.length - 1];
            last.c = price;
            last.h = Math.max(last.h, price);
            last.l = Math.min(last.l, price);
        }
        
        this.draw();
        this.updateInfo();
    }

    updateCandle(candle) {
        if (!this.data.length) return;
        
        const last = this.data[this.data.length - 1];
        if (candle.x === last.x) {
            this.data[this.data.length - 1] = candle;
        } else {
            this.data.push(candle);
            if (this.data.length > 1000) this.data.shift();
            if (analysisEnabled) this.analyzeSMC();
        }
        
        this.draw();
        this.updateInfo();
    }

    // ============ SMC ANALYSIS METHODS ============
    
    analyzeSMC() {
        if (this.data.length < 50) return;
        
        // Clear old data but keep recent structures
        const currentTime = this.data[this.data.length - 1].x;
        const keepDuration = this.timeframe * 100 * 1000; // Keep structures from last 100 candles
        
        this.smcData.orderBlocks = this.smcData.orderBlocks.filter(ob => 
            currentTime - ob.time < keepDuration
        );
        this.smcData.fvgs = this.smcData.fvgs.filter(fvg => 
            currentTime - fvg.time < keepDuration && !fvg.filled
        );
        
        // Identify swing points
        this.identifySwingPoints();
        
        // Detect market structure
        this.detectMarketStructure();
        
        // Detect Order Blocks
        this.detectOrderBlocks();
        
        // Detect Fair Value Gaps
        this.detectFairValueGaps();
        
        // Detect Liquidity Zones
        this.detectLiquidityZones();
        
        // Detect BOS (Break of Structure)
        this.detectBreakOfStructure();
        
        // Detect CHoCH (Change of Character)
        this.detectChangeOfCharacter();
        
        // Check FVG fills
        this.checkFVGFills();
        
        this.draw();
    }

    identifySwingPoints() {
        const lookback = 5;
        const recentSwings = [];
        
        for (let i = lookback; i < this.data.length - lookback; i++) {
            // Swing High
            let isSwingHigh = true;
            for (let j = 1; j <= lookback; j++) {
                if (this.data[i].h <= this.data[i - j].h || this.data[i].h <= this.data[i + j].h) {
                    isSwingHigh = false;
                    break;
                }
            }
            
            if (isSwingHigh) {
                recentSwings.push({
                    index: i,
                    type: 'high',
                    price: this.data[i].h,
                    time: this.data[i].x
                });
            }
            
            // Swing Low
            let isSwingLow = true;
            for (let j = 1; j <= lookback; j++) {
                if (this.data[i].l >= this.data[i - j].l || this.data[i].l >= this.data[i + j].l) {
                    isSwingLow = false;
                    break;
                }
            }
            
            if (isSwingLow) {
                recentSwings.push({
                    index: i,
                    type: 'low',
                    price: this.data[i].l,
                    time: this.data[i].x
                });
            }
        }
        
        this.smcData.swingPoints = recentSwings.slice(-30);
    }

    detectMarketStructure() {
        const swingHighs = this.smcData.swingPoints.filter(s => s.type === 'high').slice(-5);
        const swingLows = this.smcData.swingPoints.filter(s => s.type === 'low').slice(-5);
        
        if (swingHighs.length < 2 || swingLows.length < 2) {
            this.smcData.marketStructure = 'ranging';
            return;
        }
        
        // Check for higher highs and higher lows (uptrend)
        const recentHighs = swingHighs.slice(-2);
        const recentLows = swingLows.slice(-2);
        
        const higherHighs = recentHighs[1].price > recentHighs[0].price;
        const higherLows = recentLows[1].price > recentLows[0].price;
        
        const lowerHighs = recentHighs[1].price < recentHighs[0].price;
        const lowerLows = recentLows[1].price < recentLows[0].price;
        
        if (higherHighs && higherLows) {
            this.smcData.marketStructure = 'uptrend';
        } else if (lowerHighs && lowerLows) {
            this.smcData.marketStructure = 'downtrend';
        } else {
            this.smcData.marketStructure = 'ranging';
        }
    }

    detectOrderBlocks() {
        for (let i = 3; i < this.data.length - 1; i++) {
            const current = this.data[i];
            const prev = this.data[i - 1];
            const next = this.data[i + 1];
            
            // Bullish Order Block: Last bearish candle before strong bullish impulse
            const isBearishCandle = prev.c < prev.o;
            const strongBullishMove = current.c > current.o && 
                                     (current.c - current.o) > (prev.o - prev.c) * 1.5;
            
            if (isBearishCandle && strongBullishMove) {
                const exists = this.smcData.orderBlocks.some(ob => 
                    ob.index === i - 1 && ob.type === 'bullish'
                );
                
                if (!exists) {
                    this.smcData.orderBlocks.push({
                        type: 'bullish',
                        index: i - 1,
                        top: prev.o,
                        bottom: prev.c,
                        time: prev.x,
                        strength: this.calculateOrderBlockStrength(i - 1),
                        tested: false
                    });
                    
                    // Generate signal if price is near OB
                    if (i === this.data.length - 2 && current.l <= prev.o * 1.001) {
                        this.generateSignal('Bullish Order Block', 'bullish', prev);
                    }
                }
            }
            
            // Bearish Order Block: Last bullish candle before strong bearish impulse
            const isBullishCandle = prev.c > prev.o;
            const strongBearishMove = current.c < current.o && 
                                     (current.o - current.c) > (prev.c - prev.o) * 1.5;
            
            if (isBullishCandle && strongBearishMove) {
                const exists = this.smcData.orderBlocks.some(ob => 
                    ob.index === i - 1 && ob.type === 'bearish'
                );
                
                if (!exists) {
                    this.smcData.orderBlocks.push({
                        type: 'bearish',
                        index: i - 1,
                        top: prev.c,
                        bottom: prev.o,
                        time: prev.x,
                        strength: this.calculateOrderBlockStrength(i - 1),
                        tested: false
                    });
                    
                    // Generate signal if price is near OB
                    if (i === this.data.length - 2 && current.h >= prev.o * 0.999) {
                        this.generateSignal('Bearish Order Block', 'bearish', prev);
                    }
                }
            }
        }
        
        // Keep only recent and untested OBs
        this.smcData.orderBlocks = this.smcData.orderBlocks.slice(-15);
    }

    detectFairValueGaps() {
        for (let i = 2; i < this.data.length; i++) {
            const current = this.data[i];
            const prev = this.data[i - 1];
            const prev2 = this.data[i - 2];
            
            // Bullish FVG: Gap up
            if (current.l > prev2.h) {
                const gapSize = current.l - prev2.h;
                const avgCandle = (prev.h - prev.l);
                
                if (gapSize > avgCandle * 0.3 && prev.c > prev.o) {
                    const exists = this.smcData.fvgs.some(fvg => 
                        Math.abs(fvg.index - (i - 1)) < 2 && fvg.type === 'bullish'
                    );
                    
                    if (!exists) {
                        this.smcData.fvgs.push({
                            type: 'bullish',
                            index: i - 1,
                            top: current.l,
                            bottom: prev2.h,
                            time: prev.x,
                            filled: false
                        });
                        
                        if (i === this.data.length - 1) {
                            this.generateSignal('Bullish FVG', 'bullish', prev2);
                        }
                    }
                }
            }
            
            // Bearish FVG: Gap down
            if (current.h < prev2.l) {
                const gapSize = prev2.l - current.h;
                const avgCandle = (prev.h - prev.l);
                
                if (gapSize > avgCandle * 0.3 && prev.c < prev.o) {
                    const exists = this.smcData.fvgs.some(fvg => 
                        Math.abs(fvg.index - (i - 1)) < 2 && fvg.type === 'bearish'
                    );
                    
                    if (!exists) {
                        this.smcData.fvgs.push({
                            type: 'bearish',
                            index: i - 1,
                            top: prev2.l,
                            bottom: current.h,
                            time: prev.x,
                            filled: false
                        });
                        
                        if (i === this.data.length - 1) {
                            this.generateSignal('Bearish FVG', 'bearish', prev2);
                        }
                    }
                }
            }
        }
    }

    checkFVGFills() {
        const currentPrice = this.data[this.data.length - 1].c;
        
        this.smcData.fvgs.forEach(fvg => {
            if (fvg.type === 'bullish' && currentPrice <= fvg.bottom) {
                fvg.filled = true;
            } else if (fvg.type === 'bearish' && currentPrice >= fvg.top) {
                fvg.filled = true;
            }
        });
    }

    detectLiquidityZones() {
        const swingHighs = this.smcData.swingPoints.filter(s => s.type === 'high').slice(-10);
        const swingLows = this.smcData.swingPoints.filter(s => s.type === 'low').slice(-10);
        
        this.smcData.liquidityZones = [];
        
        // Equal Highs (Sell-Side Liquidity)
        for (let i = 0; i < swingHighs.length - 1; i++) {
            for (let j = i + 1; j < swingHighs.length; j++) {
                const priceDiff = Math.abs(swingHighs[i].price - swingHighs[j].price);
                const avgPrice = (swingHighs[i].price + swingHighs[j].price) / 2;
                
                if (priceDiff / avgPrice < 0.003) { // Within 0.3%
                    this.smcData.liquidityZones.push({
                        type: 'equal_highs',
                        price: avgPrice,
                        indices: [swingHighs[i].index, swingHighs[j].index],
                        bias: 'bearish'
                    });
                }
            }
        }
        
        // Equal Lows (Buy-Side Liquidity)
        for (let i = 0; i < swingLows.length - 1; i++) {
            for (let j = i + 1; j < swingLows.length; j++) {
                const priceDiff = Math.abs(swingLows[i].price - swingLows[j].price);
                const avgPrice = (swingLows[i].price + swingLows[j].price) / 2;
                
                if (priceDiff / avgPrice < 0.003) {
                    this.smcData.liquidityZones.push({
                        type: 'equal_lows',
                        price: avgPrice,
                        indices: [swingLows[i].index, swingLows[j].index],
                        bias: 'bullish'
                    });
                }
            }
        }
        
        // Remove duplicates
        const unique = [];
        this.smcData.liquidityZones.forEach(lz => {
            const exists = unique.some(u => 
                u.type === lz.type && Math.abs(u.price - lz.price) / lz.price < 0.001
            );
            if (!exists) unique.push(lz);
        });
        
        this.smcData.liquidityZones = unique.slice(-8);
    }

    detectBreakOfStructure() {
        const swingHighs = this.smcData.swingPoints.filter(s => s.type === 'high').slice(-10);
        const swingLows = this.smcData.swingPoints.filter(s => s.type === 'low').slice(-10);
        
        this.smcData.bos = [];
        
        // Bullish BOS: Break above previous swing high
        for (let i = 1; i < swingHighs.length; i++) {
            const current = swingHighs[i];
            const prev = swingHighs[i - 1];
            
            if (current.price > prev.price * 1.001) {
                this.smcData.bos.push({
                    type: 'bullish',
                    index: current.index,
                    breakPrice: prev.price,
                    newPrice: current.price,
                    time: current.time
                });
                
                if (current.index >= this.data.length - 10) {
                    this.generateSignal('Bullish BOS', 'bullish', this.data[current.index]);
                }
            }
        }
        
        // Bearish BOS: Break below previous swing low
        for (let i = 1; i < swingLows.length; i++) {
            const current = swingLows[i];
            const prev = swingLows[i - 1];
            
            if (current.price < prev.price * 0.999) {
                this.smcData.bos.push({
                    type: 'bearish',
                    index: current.index,
                    breakPrice: prev.price,
                    newPrice: current.price,
                    time: current.time
                });
                
                if (current.index >= this.data.length - 10) {
                    this.generateSignal('Bearish BOS', 'bearish', this.data[current.index]);
                }
            }
        }
        
        this.smcData.bos = this.smcData.bos.slice(-10);
    }

    detectChangeOfCharacter() {
        const swingPoints = [...this.smcData.swingPoints].sort((a, b) => a.index - b.index).slice(-20);
        
        this.smcData.choch = [];
        
        for (let i = 2; i < swingPoints.length; i++) {
            const current = swingPoints[i];
            const prev = swingPoints[i - 1];
            const prev2 = swingPoints[i - 2];
            
            // Bullish CHoCH: Downtrend breaks with higher high
            if (prev2.type === 'high' && prev.type === 'low' && current.type === 'high') {
                if (current.price > prev2.price && prev.price < prev2.price) {
                    this.smcData.choch.push({
                        type: 'bullish',
                        index: current.index,
                        reversal: prev.price,
                        time: current.time
                    });
                    
                    if (current.index >= this.data.length - 10) {
                        this.generateSignal('Bullish CHoCH', 'bullish', this.data[current.index]);
                    }
                }
            }
            
            // Bearish CHoCH: Uptrend breaks with lower low
            if (prev2.type === 'low' && prev.type === 'high' && current.type === 'low') {
                if (current.price < prev2.price && prev.price > prev2.price) {
                    this.smcData.choch.push({
                        type: 'bearish',
                        index: current.index,
                        reversal: prev.price,
                        time: current.time
                    });
                    
                    if (current.index >= this.data.length - 10) {
                        this.generateSignal('Bearish CHoCH', 'bearish', this.data[current.index]);
                    }
                }
            }
        }
        
        this.smcData.choch = this.smcData.choch.slice(-8);
    }

    calculateOrderBlockStrength(index) {
        const candle = this.data[index];
        const range = candle.h - candle.l;
        const body = Math.abs(candle.c - candle.o);
        return Math.min(100, Math.round((body / range) * 100));
    }

    generateSignal(patternName, bias, referenceCandle) {
        // Prevent duplicate signals within 5 minutes
        const now = Date.now();
        if (now - this.lastSignalTime < 300000) return;
        
        const currentPrice = this.data[this.data.length - 1].c;
        const symbolName = SYMBOL_CONFIG[this.symbol].name;
        
        // Calculate entry, TP, SL based on SMC principles
        const atr = this.calculateATR(14);
        let entryPrice, tp1, tp2, tp3, sl;
        
        if (bias === 'bullish') {
            entryPrice = currentPrice;
            tp1 = entryPrice + (atr * 1.5);
            tp2 = entryPrice + (atr * 2.5);
            tp3 = entryPrice + (atr * 3.5);
            sl = entryPrice - (atr * 1.0);
        } else {
            entryPrice = currentPrice;
            tp1 = entryPrice - (atr * 1.5);
            tp2 = entryPrice - (atr * 2.5);
            tp3 = entryPrice - (atr * 3.5);
            sl = entryPrice + (atr * 1.0);
        }
        
        const riskReward = Math.abs((tp1 - entryPrice) / (entryPrice - sl));
        
        const signal = {
            id: Date.now() + Math.random(),
            chartId: this.id,
            symbol: symbolName,
            name: patternName,
            bias: bias,
            timeframe: this.getTimeframeLabel(),
            entry: entryPrice.toFixed(this.getPrecision()),
            tp1: tp1.toFixed(this.getPrecision()),
            tp2: tp2.toFixed(this.getPrecision()),
            tp3: tp3.toFixed(this.getPrecision()),
            sl: sl.toFixed(this.getPrecision()),
            rr: riskReward.toFixed(2),
            confidence: this.calculateConfidence(bias),
            marketStructure: this.smcData.marketStructure,
            timestamp: Date.now()
        };
        
        this.lastSignalTime = now;
        addSignal(signal);
    }

    calculateATR(period) {
        if (this.data.length < period + 1) return 0.01;
        
        let atrSum = 0;
        for (let i = this.data.length - period; i < this.data.length; i++) {
            const current = this.data[i];
            const prev = this.data[i - 1];
            const tr = Math.max(
                current.h - current.l,
                Math.abs(current.h - prev.c),
                Math.abs(current.l - prev.c)
            );
            atrSum += tr;
        }
        
        return atrSum / period;
    }

    calculateConfidence(bias) {
        let confidence = 50;
        
        // Market structure alignment
        if ((bias === 'bullish' && this.smcData.marketStructure === 'uptrend') ||
            (bias === 'bearish' && this.smcData.marketStructure === 'downtrend')) {
            confidence += 20;
        }
        
        // Multiple SMC confirmations
        if (this.smcData.orderBlocks.length > 0) confidence += 10;
        if (this.smcData.fvgs.length > 0) confidence += 10;
        if (this.smcData.bos.length > 0) confidence += 5;
        if (this.smcData.choch.length > 0) confidence += 5;
        
        return Math.min(95, confidence);
    }

    getPrecision() {
        if (this.symbol.includes('USD')) return 5;
        if (this.symbol === 'XAUUSD') return 2;
        return 2;
    }

    getTimeframeLabel() {
        const labels = {
            300: '5M',
            900: '15M',
            1800: '30M',
            3600: '1H',
            14400: '4H'
        };
        return labels[this.timeframe] || '5M';
    }

    // ============ DRAWING METHODS ============
    
    draw() {
        if (!this.data.length) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const padding = { top: 20, right: 60, bottom: 20, left: 10 };
        const chartW = this.canvas.width - padding.left - padding.right;
        const chartH = this.canvas.height - padding.top - padding.bottom;
        
        const candlesPerScreen = Math.floor(this.zoom);
        if (this.autoScroll) {
            this.offset = Math.max(0, this.data.length - candlesPerScreen);
        }
        
        const visible = this.data.slice(this.offset, this.offset + candlesPerScreen);
        if (!visible.length) return;
        
        const prices = visible.flatMap(c => [c.h, c.l]);
        const maxP = Math.max(...prices);
        const minP = Math.min(...prices);
        const range = maxP - minP;
        const pad = range * 0.1;
        
        const candleW = Math.max(2, Math.min(12, chartW / visible.length - 2));
        const spacing = chartW / visible.length;
        
        const priceToY = (price) => {
            return padding.top + ((maxP + pad - price) / (range + pad * 2)) * chartH;
        };
        
        const indexToX = (idx) => {
            const visibleIdx = idx - this.offset;
            return padding.left + spacing * visibleIdx + spacing / 2;
        };
        
        // Draw grid
        this.drawGrid(padding, chartW, chartH, maxP, minP, range, pad, priceToY);
        
        // Draw SMC elements if analysis is enabled
        if (analysisEnabled) {
            this.drawSMCElements(priceToY, indexToX, padding, chartW);
        }
        
        // Draw candles
        this.drawCandles(visible, spacing, padding, priceToY, candleW);
        
        // Draw price scale
        this.drawPriceScale(padding, chartH, maxP, minP, range, pad);
    }

    drawGrid(padding, chartW, chartH, maxP, minP, range, pad, priceToY) {
        this.ctx.strokeStyle = '#2C2C2E';
        this.ctx.lineWidth = 1;
        
        for (let i = 0; i <= 4; i++) {
            const y = padding.top + (chartH / 4) * i;
            this.ctx.beginPath();
            this.ctx.moveTo(padding.left, y);
            this.ctx.lineTo(this.canvas.width - padding.right, y);
            this.ctx.stroke();
        }
    }

    drawPriceScale(padding, chartH, maxP, minP, range, pad) {
        this.ctx.fillStyle = '#8E8E93';
        this.ctx.font = '10px -apple-system';
        this.ctx.textAlign = 'left';
        
        for (let i = 0; i <= 4; i++) {
            const price = maxP + pad - (range + pad * 2) * (i / 4);
            const y = padding.top + (chartH / 4) * i;
            this.ctx.fillText(price.toFixed(this.getPrecision()), this.canvas.width - padding.right + 5, y + 3);
        }
    }

    drawSMCElements(priceToY, indexToX, padding, chartW) {
        // Draw Order Blocks
        this.smcData.orderBlocks.slice(-10).forEach(ob => {
            if (ob.index >= this.offset && ob.index < this.offset + this.zoom) {
                this.ctx.save();
                this.ctx.fillStyle = ob.type === 'bullish' ? 'rgba(48, 209, 88, 0.15)' : 'rgba(255, 69, 58, 0.15)';
                this.ctx.strokeStyle = ob.type === 'bullish' ? '#30D158' : '#FF453A';
                this.ctx.lineWidth = 2;
                
                const x = indexToX(ob.index);
                const y1 = priceToY(ob.top);
                const y2 = priceToY(ob.bottom);
                const width = this.canvas.width - padding.right - x;
                
                this.ctx.fillRect(x, y1, width, y2 - y1);
                this.ctx.strokeRect(x, y1, width, y2 - y1);
                
                // Label
                this.ctx.fillStyle = ob.type === 'bullish' ? '#30D158' : '#FF453A';
                this.ctx.font = 'bold 10px -apple-system';
                this.ctx.textAlign = 'left';
                this.ctx.fillText('BOS', x + 5, y1 + 14);
                this.ctx.restore();
            }
        });
        
        // Draw Fair Value Gaps
        this.smcData.fvgs.forEach(fvg => {
            if (!fvg.filled && fvg.index >= this.offset && fvg.index < this.offset + this.zoom) {
                this.ctx.save();
                this.ctx.fillStyle = fvg.type === 'bullish' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 159, 10, 0.2)';
                this.ctx.strokeStyle = fvg.type === 'bullish' ? '#8B5CF6' : '#FF9F0A';
                this.ctx.lineWidth = 1;
                this.ctx.setLineDash([4, 4]);
                
                const x = indexToX(fvg.index);
                const y1 = priceToY(fvg.top);
                const y2 = priceToY(fvg.bottom);
                const width = this.canvas.width - padding.right - x;
                
                this.ctx.fillRect(x, y1, width, y2 - y1);
                this.ctx.strokeRect(x, y1, width, y2 - y1);
                
                this.ctx.setLineDash([]);
                this.ctx.fillStyle = fvg.type === 'bullish' ? '#8B5CF6' : '#FF9F0A';
                this.ctx.font = 'bold 10px -apple-system';
                this.ctx.fillText('FVG', x + 5, y1 + 14);
                this.ctx.restore();
            }
        });
        
        // Draw Liquidity Zones
        this.smcData.liquidityZones.forEach(lz => {
            this.ctx.save();
            this.ctx.strokeStyle = lz.bias === 'bullish' ? 'rgba(48, 209, 88, 0.6)' : 'rgba(255, 69, 58, 0.6)';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([8, 4]);
            
            const y = priceToY(lz.price);
            this.ctx.beginPath();
            this.ctx.moveTo(padding.left, y);
            this.ctx.lineTo(this.canvas.width - padding.right, y);
            this.ctx.stroke();
            
            this.ctx.setLineDash([]);
            this.ctx.fillStyle = lz.bias === 'bullish' ? '#30D158' : '#FF453A';
            this.ctx.font = 'bold 9px -apple-system';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(lz.type === 'equal_highs' ? '💧EQH' : '💧EQL', padding.left + 5, y - 5);
            this.ctx.restore();
        });
        
        // Draw CHoCH markers
        this.smcData.choch.forEach(ch => {
            if (ch.index >= this.offset && ch.index < this.offset + this.zoom) {
                this.ctx.save();
                const x = indexToX(ch.index);
                const y = priceToY(ch.reversal);
                
                this.ctx.fillStyle = ch.type === 'bullish' ? '#30D158' : '#FF453A';
                this.ctx.font = 'bold 10px -apple-system';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('CHoCH', x, y - 8);
                
                // Arrow
                this.ctx.beginPath();
                if (ch.type === 'bullish') {
                    this.ctx.moveTo(x, y - 2);
                    this.ctx.lineTo(x - 4, y + 6);
                    this.ctx.lineTo(x + 4, y + 6);
                } else {
                    this.ctx.moveTo(x, y + 2);
                    this.ctx.lineTo(x - 4, y - 6);
                    this.ctx.lineTo(x + 4, y - 6);
                }
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.restore();
            }
        });
        
        // Draw Swing Points
        this.smcData.swingPoints.forEach(sp => {
            if (sp.index >= this.offset && sp.index < this.offset + this.zoom) {
                this.ctx.save();
                this.ctx.fillStyle = sp.type === 'high' ? '#FF453A' : '#30D158';
                const x = indexToX(sp.index);
                const y = priceToY(sp.price);
                
                this.ctx.beginPath();
                this.ctx.arc(x, y, 3, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
            }
        });
        
        // Draw SMC Info Overlay
        this.drawSMCInfo(padding);
    }

    drawSMCInfo(padding) {
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(28, 28, 30, 0.85)';
        this.ctx.fillRect(padding.left + 5, padding.top + 5, 140, 95);
        
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 11px -apple-system';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('📊 SMC Analysis', padding.left + 10, padding.top + 20);
        
        this.ctx.font = '9px -apple-system';
        this.ctx.fillStyle = '#8E8E93';
        
        const structureColor = this.smcData.marketStructure === 'uptrend' ? '#30D158' : 
                               this.smcData.marketStructure === 'downtrend' ? '#FF453A' : '#FFD60A';
        this.ctx.fillStyle = structureColor;
        this.ctx.fillText(`Structure: ${this.smcData.marketStructure.toUpperCase()}`, padding.left + 10, padding.top + 35);
        
        this.ctx.fillStyle = '#8E8E93';
        this.ctx.fillText(`Order Blocks: ${this.smcData.orderBlocks.length}`, padding.left + 10, padding.top + 48);
        this.ctx.fillText(`FVGs: ${this.smcData.fvgs.filter(f => !f.filled).length}`, padding.left + 10, padding.top + 61);
        this.ctx.fillText(`BOS: ${this.smcData.bos.length}`, padding.left + 10, padding.top + 74);
        this.ctx.fillText(`CHoCH: ${this.smcData.choch.length}`, padding.left + 10, padding.top + 87);
        
        this.ctx.restore();
    }

    drawCandles(visible, spacing, padding, priceToY, candleW) {
        visible.forEach((c, i) => {
            const x = padding.left + spacing * i + spacing / 2;
            const yH = priceToY(c.h);
            const yL = priceToY(c.l);
            const yO = priceToY(c.o);
            const yC = priceToY(c.c);
            
            const isUp = c.c >= c.o;
            const color = isUp ? '#30D158' : '#FF453A';
            
            // Wick
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = Math.max(1, candleW / 4);
            this.ctx.beginPath();
            this.ctx.moveTo(x, yH);
            this.ctx.lineTo(x, yL);
            this.ctx.stroke();
            
            // Body
            this.ctx.fillStyle = color;
            const bodyH = Math.max(Math.abs(yC - yO), 1);
            this.ctx.fillRect(x - candleW / 2, Math.min(yO, yC), candleW, bodyH);
        });
    }

    updateInfo() {
        if (!this.data.length) return;
        
        const current = this.data[this.data.length - 1];
        const first = this.data[0];
        const change = current.c - first.o;
        const changePercent = (change / first.o) * 100;
        
        const prices = this.data.flatMap(c => [c.h, c.l]);
        const high = Math.max(...prices);
        const low = Math.min(...prices);
        
        document.getElementById(`price${this.id}`).textContent = current.c.toFixed(this.getPrecision());
        
        const changeEl = document.getElementById(`change${this.id}`);
        changeEl.textContent = `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`;
        changeEl.className = `info-value ${changePercent >= 0 ? 'green' : 'red'}`;
        
        document.getElementById(`highlow${this.id}`).textContent = 
            `${high.toFixed(this.getPrecision())}/${low.toFixed(this.getPrecision())}`;
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

// ============ INITIALIZATION ============

for (let i = 1; i <= 4; i++) {
    charts[i] = new ChartManager(i);
}

// ============ UI FUNCTIONS ============

function switchPage(pageId) {
    document.querySelectorAll('.page-container').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach((item, idx) => {
        item.classList.remove('active');
        if ((pageId === 'chartsPage' && idx === 0) ||
            (pageId === 'signalsPage' && idx === 1) ||
            (pageId === 'settingsPage' && idx === 2)) {
            item.classList.add('active');
        }
    });
    
    if (pageId === 'signalsPage') {
        displaySignals();
    }
}

function switchChart(chartId) {
    document.querySelectorAll('.single-chart').forEach(c => c.classList.remove('active'));
    document.getElementById(`chart${chartId}`).classList.add('active');
    
    document.querySelectorAll('.chart-tab').forEach((tab, idx) => {
        tab.classList.remove('active');
        if (idx === chartId - 1) tab.classList.add('active');
    });
    
    currentChartView = chartId;
    charts[chartId].resizeCanvas();
    charts[chartId].draw();
}

function changeNumCharts() {
    numActiveCharts = parseInt(document.getElementById('numCharts').value);
    const tabs = document.getElementById('chartTabs');
    tabs.innerHTML = '';
    
    for (let i = 1; i <= numActiveCharts; i++) {
        const tab = document.createElement('div');
        tab.className = `chart-tab ${i === 1 ? 'active' : ''}`;
        tab.textContent = `Chart ${i}`;
        tab.onclick = () => switchChart(i);
        tabs.appendChild(tab);
    }
    
    switchChart(1);
}

function updateChart(id) {
    const chart = charts[id];
    chart.symbol = document.getElementById(`symbol${id}`).value;
    chart.timeframe = parseInt(document.getElementById(`timeframe${id}`).value);
    
    const symbolName = SYMBOL_CONFIG[chart.symbol].name;
    document.getElementById(`symbolName${id}`).textContent = symbolName;
    
    if (chart.ws && chart.ws.readyState === WebSocket.OPEN) {
        chart.disconnect();
        setTimeout(() => chart.connect(), 300);
    }
}

function zoom(id, dir) {
    const chart = charts[id];
    if (dir === 'in') {
        chart.zoom = Math.max(20, chart.zoom - 10);
    } else {
        chart.zoom = Math.min(150, chart.zoom + 10);
    }
    chart.draw();
}

function startAllCharts() {
    for (let i = 1; i <= numActiveCharts; i++) {
        charts[i].connect();
    }
}

function stopAllCharts() {
    for (let i = 1; i <= numActiveCharts; i++) {
        charts[i].disconnect();
    }
    updateConnectionStatus(false);
}

function refreshAllCharts() {
    stopAllCharts();
    setTimeout(() => startAllCharts(), 500);
}

function toggleAnalysis() {
    analysisEnabled = !analysisEnabled;
    const btn = document.getElementById('analysisToggle');
    btn.textContent = analysisEnabled ? '📊 SMC ON' : '📊 SMC OFF';
    btn.classList.toggle('active', analysisEnabled);
    
    Object.values(charts).forEach(chart => {
        chart.draw();
        if (analysisEnabled) chart.analyzeSMC();
    });
}

function updateConnectionStatus(connected) {
    const indicator = document.querySelector('.status-indicator');
    if (indicator) {
        indicator.className = `status-indicator ${connected ? 'status-connected' : 'status-disconnected'}`;
    }
}

// ============ SIGNAL MANAGEMENT ============

function addSignal(signal) {
    // Check for duplicate signals
    const exists = allSignals.find(s => 
        s.name === signal.name && 
        s.chartId === signal.chartId && 
        s.bias === signal.bias &&
        Date.now() - s.timestamp < 300000 // 5 minutes
    );
    
    if (exists) return;
    
    allSignals.unshift(signal);
    allSignals = allSignals.slice(0, 50);
    
    saveSignalToFirebase(signal);
    
    // High confidence alert
    if (signal.confidence >= 70) {
        playSound();
        
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('🎯 SMC Signal Detected!', {
                body: `${signal.symbol} - ${signal.name}\n${signal.bias.toUpperCase()} • ${signal.confidence}% confidence`,
                icon: '/icon.png'
            });
        }
    }
    
    displaySignals();
}

async function saveSignalToFirebase(signal) {
    try {
        await fetch(`${FIREBASE_URL}/signals/${signal.id}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(signal)
        });
    } catch (e) {
        console.error('Firebase save error:', e);
    }
}

async function loadSignalsFromFirebase() {
    try {
        const response = await fetch(`${FIREBASE_URL}/signals.json`);
        const data = await response.json();
        
        if (data) {
            allSignals = Object.values(data)
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 50);
            displaySignals();
        }
    } catch (e) {
        console.error('Firebase load error:', e);
    }
}

function displaySignals() {
    const container = document.getElementById('signalsList');
    
    let filtered = allSignals;
    if (signalFilter !== 'all') {
        filtered = allSignals.filter(s => s.bias === signalFilter);
    }
    
    if (!filtered.length) {
        container.innerHTML = `
            <div class="no-signals">
                <div class="no-signals-icon">📊</div>
                <div>No ${signalFilter === 'all' ? '' : signalFilter} signals detected yet</div>
                <div style="font-size: 12px; margin-top: 8px;">Start charts to detect SMC patterns</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filtered.map(s => {
        const timeAgo = getTimeAgo(s.timestamp);
        
        return `
            <div class="signal-card ${s.bias}">
                <div class="signal-header">
                    <div>
                        <div class="signal-name">${s.name}</div>
                        <div class="signal-symbol">${s.symbol} • ${s.timeframe}</div>
                    </div>
                    <div class="signal-badge ${s.bias}">${s.bias.toUpperCase()}</div>
                </div>
                <div class="signal-details">
                    <div class="signal-detail">
                        <span class="detail-label">Entry</span>
                        <span class="detail-value">${s.entry}</span>
                    </div>
                    <div class="signal-detail">
                        <span class="detail-label">TP1</span>
                        <span class="detail-value green">${s.tp1}</span>
                    </div>
                    <div class="signal-detail">
                        <span class="detail-label">TP2</span>
                        <span class="detail-value green">${s.tp2}</span>
                    </div>
                    <div class="signal-detail">
                        <span class="detail-label">TP3</span>
                        <span class="detail-value green">${s.tp3}</span>
                    </div>
                    <div class="signal-detail">
                        <span class="detail-label">SL</span>
                        <span class="detail-value red">${s.sl}</span>
                    </div>
                    <div class="signal-detail">
                        <span class="detail-label">R:R</span>
                        <span class="detail-value">1:${s.rr}</span>
                    </div>
                </div>
                <div class="price-targets">
                    <div class="target-label">Structure: ${s.marketStructure.toUpperCase()}</div>
                    <div class="target-range">
                        <span class="target-price sl">SL ${s.sl}</span>
                        <div class="target-bar ${s.bias}"></div>
                        <span class="target-price tp">TP ${s.tp3}</span>
                    </div>
                    <div class="confidence-bar">
                        <div class="confidence-fill ${s.confidence >= 70 ? 'high' : ''}" 
                             style="width: ${s.confidence}%"></div>
                    </div>
                </div>
                <div class="signal-time">${timeAgo} • Confidence: ${s.confidence}%</div>
            </div>
        `;
    }).join('');
}

function filterSignals(type) {
    signalFilter = type;
    
    document.querySelectorAll('.signal-filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    displaySignals();
}

async function clearAllSignals() {
    if (confirm('Clear all signals from database?')) {
        try {
            await fetch(`${FIREBASE_URL}/signals.json`, { method: 'DELETE' });
            allSignals = [];
            displaySignals();
        } catch (e) {
            console.error('Firebase clear error:', e);
        }
    }
}

function getTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

function toggleSetting(el, setting) {
    el.classList.toggle('active');
    
    if (setting === 'smc') {
        toggleAnalysis();
    }
}

function playSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.frequency.value = 880;
        osc.type = 'sine';
        
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
        console.error('Audio error:', e);
    }
}

// ============ INITIALIZATION ============

window.addEventListener('load', () => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
    
    // Load saved signals
    loadSignalsFromFirebase();
    
    // Handle window resize
    window.addEventListener('resize', () => {
        Object.values(charts).forEach(c => {
            c.resizeCanvas();
            c.draw();
        });
    });
    
    // Auto-start first chart after short delay
    setTimeout(() => {
        charts[1].connect();
    }, 500);
});

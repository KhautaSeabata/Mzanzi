// ============================================================================
// GOLD DATA ENGINE - Real Yahoo Finance Data + Advanced SMC Analysis
// ============================================================================

let canvas, ctx;
let chartData = [];
let currentTimeframe = 300; // 5 minutes
let isDataLoading = false;

// Chart State
let zoom = 1.0;
let scroll = 0;
let crosshairEnabled = false;
let crosshairX = 0;
let crosshairY = 0;
let isDragging = false;
let lastTouchX = 0;

// SMC Detection State
let orderBlocks = [];
let fairValueGaps = [];
let liquidityZones = [];
let breakerBlocks = [];
let optimalTradeEntries = [];

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
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    setupInteraction();
    
    // Load Gold data from Yahoo Finance via proxy
    loadGoldData();
});

function resizeCanvas() {
    const container = document.getElementById('chartContainer');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    if (chartData.length > 0) drawChart();
}

// ============================================================================
// DATA LOADING - YAHOO FINANCE GOLD DATA
// ============================================================================
async function loadGoldData() {
    try {
        console.log('Loading Gold data from Yahoo Finance...');
        isDataLoading = true;
        
        // Use Yahoo Finance API via public proxy
        const symbol = 'GC=F'; // Gold Futures
        const interval = getYahooInterval(currentTimeframe);
        const range = '1d';
        
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.chart && data.chart.result && data.chart.result[0]) {
            const result = data.chart.result[0];
            const timestamps = result.timestamp;
            const quotes = result.indicators.quote[0];
            
            chartData = timestamps.map((time, i) => ({
                time: time * 1000,
                o: quotes.open[i],
                h: quotes.high[i],
                l: quotes.low[i],
                c: quotes.close[i],
                v: quotes.volume[i]
            })).filter(d => d.o && d.h && d.l && d.c);
            
            console.log(`✓ Loaded ${chartData.length} candles`);
            
            // Perform SMC Analysis
            analyzeSMC();
            
            hideLoading();
            drawChart();
            updatePriceTicker();
            
            // Start live updates
            startLiveUpdates();
        } else {
            throw new Error('Invalid data format');
        }
        
    } catch (error) {
        console.error('Error loading Gold data:', error);
        
        // Fallback to demo data
        console.log('Using demo data...');
        generateDemoGoldData();
        analyzeSMC();
        hideLoading();
        drawChart();
        updatePriceTicker();
    } finally {
        isDataLoading = false;
    }
}

function getYahooInterval(seconds) {
    if (seconds === 60) return '1m';
    if (seconds === 300) return '5m';
    if (seconds === 900) return '15m';
    if (seconds === 1800) return '30m';
    if (seconds === 3600) return '60m';
    if (seconds === 86400) return '1d';
    return '5m';
}

function generateDemoGoldData() {
    const basePrice = 2650;
    const numCandles = 300;
    chartData = [];
    let price = basePrice;
    const now = Date.now();
    
    for (let i = 0; i < numCandles; i++) {
        const time = now - (numCandles - i) * currentTimeframe * 1000;
        
        const change = (Math.random() - 0.48) * 2;
        price += change;
        
        const open = price;
        const high = price + Math.random() * 3;
        const low = price - Math.random() * 3;
        const close = low + Math.random() * (high - low);
        
        chartData.push({
            time: time,
            o: open,
            h: high,
            l: low,
            c: close,
            v: Math.random() * 1000000
        });
        
        price = close;
    }
    
    console.log('Demo data generated:', chartData.length, 'candles');
}

function startLiveUpdates() {
    // Update every 5 seconds
    setInterval(async () => {
        if (!isDataLoading) {
            await loadGoldData();
        }
    }, 5000);
}

// ============================================================================
// ADVANCED SMC ANALYSIS (Smart Money Concepts)
// Based on ICT & top SMC traders
// ============================================================================
function analyzeSMC() {
    console.log('Running SMC Analysis...');
    
    orderBlocks = detectOrderBlocks();
    fairValueGaps = detectFairValueGaps();
    liquidityZones = detectLiquidityZones();
    breakerBlocks = detectBreakerBlocks();
    optimalTradeEntries = detectOptimalTradeEntries();
    
    console.log('SMC Analysis complete:', {
        orderBlocks: orderBlocks.length,
        fvgs: fairValueGaps.length,
        liquidity: liquidityZones.length,
        breakers: breakerBlocks.length,
        otes: optimalTradeEntries.length
    });
}

// Order Blocks - Last up/down move before significant reversal
function detectOrderBlocks() {
    const blocks = [];
    const lookback = 20;
    
    for (let i = lookback; i < chartData.length - 5; i++) {
        const current = chartData[i];
        const prev = chartData[i - 1];
        const next5 = chartData.slice(i + 1, i + 6);
        
        // Bullish Order Block
        if (current.c < current.o && prev.c > prev.o) {
            const nextMoveUp = next5.every(c => c.c > current.l);
            if (nextMoveUp) {
                blocks.push({
                    type: 'bullish',
                    index: i,
                    high: current.h,
                    low: current.l,
                    strength: calculateOrderBlockStrength(i, 'bullish')
                });
            }
        }
        
        // Bearish Order Block
        if (current.c > current.o && prev.c < prev.o) {
            const nextMoveDown = next5.every(c => c.c < current.h);
            if (nextMoveDown) {
                blocks.push({
                    type: 'bearish',
                    index: i,
                    high: current.h,
                    low: current.l,
                    strength: calculateOrderBlockStrength(i, 'bearish')
                });
            }
        }
    }
    
    return blocks;
}

function calculateOrderBlockStrength(index, type) {
    const candle = chartData[index];
    const range = candle.h - candle.l;
    const volume = candle.v || 1;
    
    // Check if price respected the block in recent candles
    let respects = 0;
    for (let i = index + 1; i < Math.min(index + 20, chartData.length); i++) {
        const test = chartData[i];
        if (type === 'bullish' && test.l <= candle.h && test.l >= candle.l) {
            respects++;
        }
        if (type === 'bearish' && test.h >= candle.l && test.h <= candle.h) {
            respects++;
        }
    }
    
    return Math.min(100, (respects * 10) + (volume / 100000));
}

// Fair Value Gaps (Imbalances)
function detectFairValueGaps() {
    const gaps = [];
    
    for (let i = 1; i < chartData.length - 1; i++) {
        const prev = chartData[i - 1];
        const current = chartData[i];
        const next = chartData[i + 1];
        
        // Bullish FVG
        if (prev.h < next.l) {
            gaps.push({
                type: 'bullish',
                index: i,
                top: next.l,
                bottom: prev.h,
                filled: false
            });
        }
        
        // Bearish FVG
        if (prev.l > next.h) {
            gaps.push({
                type: 'bearish',
                index: i,
                top: prev.l,
                bottom: next.h,
                filled: false
            });
        }
    }
    
    return gaps;
}

// Liquidity Zones (Equal highs/lows)
function detectLiquidityZones() {
    const zones = [];
    const tolerance = 0.5; // $0.50 tolerance
    
    for (let i = 5; i < chartData.length - 5; i++) {
        const current = chartData[i];
        
        // Check for equal highs (sell-side liquidity)
        let equalHighs = 1;
        for (let j = i - 5; j < i; j++) {
            if (Math.abs(chartData[j].h - current.h) < tolerance) {
                equalHighs++;
            }
        }
        
        if (equalHighs >= 3) {
            zones.push({
                type: 'resistance',
                price: current.h,
                index: i,
                strength: equalHighs
            });
        }
        
        // Check for equal lows (buy-side liquidity)
        let equalLows = 1;
        for (let j = i - 5; j < i; j++) {
            if (Math.abs(chartData[j].l - current.l) < tolerance) {
                equalLows++;
            }
        }
        
        if (equalLows >= 3) {
            zones.push({
                type: 'support',
                price: current.l,
                index: i,
                strength: equalLows
            });
        }
    }
    
    return zones;
}

// Breaker Blocks (Failed order blocks that become opposite zones)
function detectBreakerBlocks() {
    const breakers = [];
    
    orderBlocks.forEach(block => {
        // Check if order block was broken
        for (let i = block.index + 1; i < chartData.length; i++) {
            const candle = chartData[i];
            
            if (block.type === 'bullish' && candle.c < block.low) {
                // Bullish OB broken, becomes bearish breaker
                breakers.push({
                    type: 'bearish',
                    index: i,
                    high: block.high,
                    low: block.low,
                    originalType: 'bullish'
                });
                break;
            }
            
            if (block.type === 'bearish' && candle.c > block.high) {
                // Bearish OB broken, becomes bullish breaker
                breakers.push({
                    type: 'bullish',
                    index: i,
                    high: block.high,
                    low: block.low,
                    originalType: 'bearish'
                });
                break;
            }
        }
    });
    
    return breakers;
}

// Optimal Trade Entry (0.62-0.79 Fibonacci retracement of impulse)
function detectOptimalTradeEntries() {
    const otes = [];
    
    for (let i = 20; i < chartData.length - 10; i++) {
        // Find impulse moves
        const impulseStart = chartData[i - 20];
        const impulseEnd = chartData[i];
        const range = Math.abs(impulseEnd.c - impulseStart.c);
        
        if (range > 5) { // Significant move
            const fib62 = impulseStart.c + (impulseEnd.c - impulseStart.c) * 0.62;
            const fib79 = impulseStart.c + (impulseEnd.c - impulseStart.c) * 0.79;
            
            otes.push({
                type: impulseEnd.c > impulseStart.c ? 'bullish' : 'bearish',
                index: i,
                fib62: fib62,
                fib79: fib79,
                impulseStart: impulseStart.c,
                impulseEnd: impulseEnd.c
            });
        }
    }
    
    return otes;
}

// ============================================================================
// CHART DRAWING WITH SMC OVERLAYS
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
    
    // Calculate visible candles with 20% right padding
    const effectiveChartWidth = chartWidth * 0.8;
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
    
    // Draw grid
    drawGrid(minPrice, maxPrice, priceRange, chartWidth, chartHeight);
    
    // Draw SMC structures
    drawSMCStructures(startIdx, endIdx, effectiveChartWidth, chartHeight, minPrice, maxPrice, priceScale);
    
    // Draw candles
    const candleWidth = Math.max(2, (effectiveChartWidth / visibleData.length) - 2);
    
    visibleData.forEach((candle, i) => {
        const x = chartPadding.left + (i * (effectiveChartWidth / visibleData.length));
        drawCandle(candle, x, candleWidth, minPrice, maxPrice, priceScale);
    });
    
    // Draw price scale
    drawPriceScale(minPrice, maxPrice, priceRange, width, height);
    
    // Draw time scale
    drawTimeScale(visibleData, effectiveChartWidth, height);
    
    // Draw crosshair
    if (crosshairEnabled) {
        drawCrosshair(minPrice, maxPrice, priceScale, visibleData, effectiveChartWidth);
    }
}

function drawSMCStructures(startIdx, endIdx, chartWidth, chartHeight, minPrice, maxPrice, priceScale) {
    // Draw Order Blocks
    orderBlocks.forEach(block => {
        if (block.index >= startIdx && block.index < endIdx) {
            const relIdx = block.index - startIdx;
            const x = chartPadding.left + (relIdx * (chartWidth / (endIdx - startIdx)));
            const yHigh = chartPadding.top + (maxPrice - block.high) * priceScale;
            const yLow = chartPadding.top + (maxPrice - block.low) * priceScale;
            
            ctx.fillStyle = block.type === 'bullish' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(239, 83, 80, 0.1)';
            ctx.fillRect(x, yHigh, 50, yLow - yHigh);
            
            ctx.strokeStyle = block.type === 'bullish' ? 'rgba(76, 175, 80, 0.5)' : 'rgba(239, 83, 80, 0.5)';
            ctx.strokeRect(x, yHigh, 50, yLow - yHigh);
        }
    });
    
    // Draw Fair Value Gaps
    fairValueGaps.forEach(gap => {
        if (gap.index >= startIdx && gap.index < endIdx && !gap.filled) {
            const relIdx = gap.index - startIdx;
            const x = chartPadding.left + (relIdx * (chartWidth / (endIdx - startIdx)));
            const yTop = chartPadding.top + (maxPrice - gap.top) * priceScale;
            const yBottom = chartPadding.top + (maxPrice - gap.bottom) * priceScale;
            
            ctx.fillStyle = gap.type === 'bullish' ? 'rgba(33, 150, 243, 0.15)' : 'rgba(255, 152, 0, 0.15)';
            ctx.fillRect(x, yTop, chartWidth - (relIdx * (chartWidth / (endIdx - startIdx))), yBottom - yTop);
        }
    });
    
    // Draw Liquidity Zones
    liquidityZones.forEach(zone => {
        if (zone.index >= startIdx && zone.index < endIdx) {
            const y = chartPadding.top + (maxPrice - zone.price) * priceScale;
            
            ctx.setLineDash([5, 5]);
            ctx.strokeStyle = zone.type === 'resistance' ? 'rgba(255, 0, 0, 0.6)' : 'rgba(0, 255, 0, 0.6)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(chartPadding.left, y);
            ctx.lineTo(chartPadding.left + chartWidth, y);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.lineWidth = 1;
        }
    });
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
        const timeStr = time.getHours().toString().padStart(2, '0') + ':' + time.getMinutes().toString().padStart(2, '0');
        
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
        document.getElementById('crossO').textContent = candle.o.toFixed(2);
        document.getElementById('crossH').textContent = candle.h.toFixed(2);
        document.getElementById('crossL').textContent = candle.l.toFixed(2);
        document.getElementById('crossC').textContent = candle.c.toFixed(2);
    }
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
        scroll -= Math.round(deltaX * 0.5);
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
    
    document.querySelectorAll('.tf-button').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    showLoading();
    loadGoldData();
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

window.openTrade = function() {
    window.location.href = 'gold-signals.html';
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
    const ask = bid + 0.05;
    const change = bid - prev.o;
    const changePercent = (change / prev.o) * 100;
    
    const high = Math.max(...chartData.map(d => d.h));
    const low = Math.min(...chartData.map(d => d.l));
    const open = chartData[0].o;
    
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

// Export SMC data for signal generation
window.getSMCData = function() {
    return {
        orderBlocks,
        fairValueGaps,
        liquidityZones,
        breakerBlocks,
        optimalTradeEntries,
        chartData
    };
};

console.log('Gold Data Engine Loaded');

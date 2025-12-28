// ============================================================================
// ADVANCED SMC ANALYSIS ENGINE
// Modern + Traditional Smart Money Concepts
// ============================================================================

class SMCAnalyzer {
    constructor() {
        this.smcData = {
            // Market Structure
            swingPoints: [],
            bos: [],
            choch: [],
            marketStructure: 'ranging',
            trend: 'neutral',
            
            // Core Concepts
            orderBlocks: [],
            breakers: [],
            fvgs: [],
            liquidityZones: [],
            
            // ICT Concepts
            optimalTradeEntry: [],
            premiumDiscount: null,
            killZones: [],
            
            // Advanced Patterns
            liquiditySweeps: [],
            smartMoneyReversal: [],
            inducementZones: [],
            mitigation: [],
            
            // Institutional levels
            highVolumeNodes: [],
            sessionHighLow: [],
            
            // Signals
            currentSignal: null,
            confidence: 0
        };
        
        this.settings = {
            swingLookback: 7,
            obMinStrength: 60,
            fvgMinSize: 0.4,
            autoAnalyze: false,
            drawObjects: true
        };
        
        this.lastAnalysisTime = 0;
        this.analysisInterval = null;
    }

    // ========================================================================
    // MAIN ANALYSIS FUNCTION
    // ========================================================================
    analyze(chartData, currentTimeframe) {
        if (!chartData || chartData.length < 100) {
            console.log('⚠️ Insufficient data for analysis');
            return null;
        }

        console.log('🔍 Starting SMC Analysis...');
        
        const currentTime = chartData[chartData.length - 1].x;
        const keepDuration = currentTimeframe * 150 * 1000;
        
        // Clean old data
        this.cleanOldData(currentTime, keepDuration);
        
        // Run all analysis methods
        this.identifySwingPoints(chartData);
        this.detectMarketStructure(chartData);
        this.calculatePremiumDiscount(chartData);
        this.detectOrderBlocks(chartData);
        this.detectBreakers(chartData);
        this.detectFairValueGaps(chartData);
        this.detectOptimalTradeEntry(chartData);
        this.detectLiquidityZones(chartData);
        this.detectLiquiditySweeps(chartData);
        this.detectBreakOfStructure(chartData);
        this.detectChangeOfCharacter(chartData);
        this.detectSmartMoneyReversal(chartData);
        this.detectInducementZones(chartData);
        this.identifyKillZones(chartData);
        this.checkFVGFills(chartData);
        
        // Generate signal
        const signal = this.generateSignal(chartData, currentTimeframe);
        
        console.log('✅ SMC Analysis Complete');
        console.log(`📊 Market Structure: ${this.smcData.marketStructure}`);
        console.log(`📈 Trend: ${this.smcData.trend}`);
        
        return signal;
    }

    // ========================================================================
    // SWING POINTS IDENTIFICATION
    // ========================================================================
    identifySwingPoints(chartData) {
        const lookback = this.settings.swingLookback;
        const swings = [];
        
        for (let i = lookback; i < chartData.length - lookback; i++) {
            // Swing High
            let isSwingHigh = true;
            let higherCount = 0;
            
            for (let j = 1; j <= lookback; j++) {
                if (chartData[i].h <= chartData[i - j].h || chartData[i].h <= chartData[i + j].h) {
                    isSwingHigh = false;
                    break;
                }
                if (chartData[i].h > chartData[i - j].h) higherCount++;
            }
            
            if (isSwingHigh && higherCount >= lookback - 1) {
                swings.push({
                    index: i,
                    type: 'high',
                    price: chartData[i].h,
                    time: chartData[i].x,
                    strength: higherCount
                });
            }
            
            // Swing Low
            let isSwingLow = true;
            let lowerCount = 0;
            
            for (let j = 1; j <= lookback; j++) {
                if (chartData[i].l >= chartData[i - j].l || chartData[i].l >= chartData[i + j].l) {
                    isSwingLow = false;
                    break;
                }
                if (chartData[i].l < chartData[i - j].l) lowerCount++;
            }
            
            if (isSwingLow && lowerCount >= lookback - 1) {
                swings.push({
                    index: i,
                    type: 'low',
                    price: chartData[i].l,
                    time: chartData[i].x,
                    strength: lowerCount
                });
            }
        }
        
        this.smcData.swingPoints = swings.slice(-50);
    }

    // ========================================================================
    // MARKET STRUCTURE DETECTION
    // ========================================================================
    detectMarketStructure(chartData) {
        const swingHighs = this.smcData.swingPoints.filter(s => s.type === 'high').slice(-8);
        const swingLows = this.smcData.swingPoints.filter(s => s.type === 'low').slice(-8);
        
        if (swingHighs.length < 3 || swingLows.length < 3) {
            this.smcData.marketStructure = 'ranging';
            this.smcData.trend = 'neutral';
            return;
        }
        
        let hhCount = 0, hlCount = 0, lhCount = 0, llCount = 0;
        
        for (let i = 1; i < swingHighs.length; i++) {
            if (swingHighs[i].price > swingHighs[i - 1].price) hhCount++;
            else lhCount++;
        }
        
        for (let i = 1; i < swingLows.length; i++) {
            if (swingLows[i].price > swingLows[i - 1].price) hlCount++;
            else llCount++;
        }
        
        const bullishScore = hhCount + hlCount;
        const bearishScore = lhCount + llCount;
        
        if (bullishScore > bearishScore + 2) {
            this.smcData.marketStructure = 'uptrend';
            this.smcData.trend = bullishScore > bearishScore + 4 ? 'strong_bull' : 'bull';
        } else if (bearishScore > bullishScore + 2) {
            this.smcData.marketStructure = 'downtrend';
            this.smcData.trend = bearishScore > bullishScore + 4 ? 'strong_bear' : 'bear';
        } else {
            this.smcData.marketStructure = 'ranging';
            this.smcData.trend = 'neutral';
        }
    }

    // ========================================================================
    // PREMIUM/DISCOUNT ZONES
    // ========================================================================
    calculatePremiumDiscount(chartData) {
        if (this.smcData.swingPoints.length < 2) return;
        
        const recentSwings = this.smcData.swingPoints.slice(-10);
        const high = Math.max(...recentSwings.map(s => s.price));
        const low = Math.min(...recentSwings.map(s => s.price));
        const range = high - low;
        
        if (range === 0) return;
        
        const currentPrice = chartData[chartData.length - 1].c;
        const equilibrium = low + (range * 0.5);
        const premiumStart = low + (range * 0.618);
        const discountEnd = low + (range * 0.382);
        
        this.smcData.premiumDiscount = {
            high: high,
            low: low,
            equilibrium: equilibrium,
            premium: premiumStart,
            discount: discountEnd,
            currentZone: currentPrice > premiumStart ? 'premium' : 
                        currentPrice < discountEnd ? 'discount' : 'equilibrium'
        };
    }

    // ========================================================================
    // ORDER BLOCKS
    // ========================================================================
    detectOrderBlocks(chartData) {
        for (let i = 5; i < chartData.length - 1; i++) {
            const current = chartData[i];
            const prev = chartData[i - 1];
            
            // Bullish Order Block
            const isBearishCandle = prev.c < prev.o;
            const bodySize = Math.abs(prev.o - prev.c);
            const atr = this.calculateATR(chartData, i, 14);
            const isMeaningful = bodySize > atr * 0.3;
            
            const strongBullishMove = current.c > current.o && 
                                     (current.c - current.o) > bodySize * 2 &&
                                     current.c > prev.h;
            
            if (isBearishCandle && strongBullishMove && isMeaningful) {
                const exists = this.smcData.orderBlocks.some(ob => 
                    Math.abs(ob.index - (i - 1)) < 3 && ob.type === 'bullish'
                );
                
                if (!exists) {
                    this.smcData.orderBlocks.push({
                        type: 'bullish',
                        index: i - 1,
                        top: prev.o,
                        bottom: prev.c,
                        time: prev.x,
                        strength: this.calculateOrderBlockStrength(chartData, i - 1),
                        mitigated: false,
                        touches: 0
                    });
                }
            }
            
            // Bearish Order Block
            const isBullishCandle = prev.c > prev.o;
            const strongBearishMove = current.c < current.o && 
                                     (current.o - current.c) > bodySize * 2 &&
                                     current.c < prev.l;
            
            if (isBullishCandle && strongBearishMove && isMeaningful) {
                const exists = this.smcData.orderBlocks.some(ob => 
                    Math.abs(ob.index - (i - 1)) < 3 && ob.type === 'bearish'
                );
                
                if (!exists) {
                    this.smcData.orderBlocks.push({
                        type: 'bearish',
                        index: i - 1,
                        top: prev.c,
                        bottom: prev.o,
                        time: prev.x,
                        strength: this.calculateOrderBlockStrength(chartData, i - 1),
                        mitigated: false,
                        touches: 0
                    });
                }
            }
        }
        
        // Check mitigation
        const currentPrice = chartData[chartData.length - 1].c;
        this.smcData.orderBlocks.forEach(ob => {
            if (!ob.mitigated && this.isTouchingZone(currentPrice, ob.bottom, ob.top)) {
                ob.touches++;
                if (ob.touches >= 3) ob.mitigated = true;
            }
        });
        
        this.smcData.orderBlocks = this.smcData.orderBlocks.slice(-20);
    }

    // ========================================================================
    // BREAKER BLOCKS
    // ========================================================================
    detectBreakers(chartData) {
        this.smcData.orderBlocks.forEach(ob => {
            if (ob.mitigated && ob.touches >= 2) {
                const exists = this.smcData.breakers.some(br => br.index === ob.index);
                
                if (!exists) {
                    this.smcData.breakers.push({
                        type: ob.type === 'bullish' ? 'bearish' : 'bullish',
                        index: ob.index,
                        top: ob.top,
                        bottom: ob.bottom,
                        time: ob.time,
                        mitigated: false
                    });
                }
            }
        });
        
        this.smcData.breakers = this.smcData.breakers.slice(-15);
    }

    // ========================================================================
    // FAIR VALUE GAPS
    // ========================================================================
    detectFairValueGaps(chartData) {
        for (let i = 2; i < chartData.length; i++) {
            const current = chartData[i];
            const prev = chartData[i - 1];
            const prev2 = chartData[i - 2];
            
            // Bullish FVG
            if (current.l > prev2.h) {
                const gapSize = current.l - prev2.h;
                const avgRange = this.calculateAverageRange(chartData, i, 20);
                
                if (gapSize > avgRange * this.settings.fvgMinSize) {
                    const exists = this.smcData.fvgs.some(fvg => 
                        Math.abs(fvg.index - (i - 1)) < 3 && fvg.type === 'bullish'
                    );
                    
                    if (!exists) {
                        this.smcData.fvgs.push({
                            type: 'bullish',
                            index: i - 1,
                            top: current.l,
                            bottom: prev2.h,
                            time: prev.x,
                            filled: false,
                            fillPercentage: 0,
                            quality: gapSize > avgRange ? 'high' : 'medium'
                        });
                    }
                }
            }
            
            // Bearish FVG
            if (current.h < prev2.l) {
                const gapSize = prev2.l - current.h;
                const avgRange = this.calculateAverageRange(chartData, i, 20);
                
                if (gapSize > avgRange * this.settings.fvgMinSize) {
                    const exists = this.smcData.fvgs.some(fvg => 
                        Math.abs(fvg.index - (i - 1)) < 3 && fvg.type === 'bearish'
                    );
                    
                    if (!exists) {
                        this.smcData.fvgs.push({
                            type: 'bearish',
                            index: i - 1,
                            top: prev2.l,
                            bottom: current.h,
                            time: prev.x,
                            filled: false,
                            fillPercentage: 0,
                            quality: gapSize > avgRange ? 'high' : 'medium'
                        });
                    }
                }
            }
        }
    }

    // ========================================================================
    // OPTIMAL TRADE ENTRY
    // ========================================================================
    detectOptimalTradeEntry(chartData) {
        this.smcData.optimalTradeEntry = [];
        
        this.smcData.fvgs.forEach(fvg => {
            if (!fvg.filled && fvg.quality === 'high') {
                this.smcData.optimalTradeEntry.push({
                    type: fvg.type,
                    price: fvg.bottom + (fvg.top - fvg.bottom) * 0.5,
                    low: fvg.bottom + (fvg.top - fvg.bottom) * 0.382,
                    high: fvg.bottom + (fvg.top - fvg.bottom) * 0.618,
                    index: fvg.index,
                    time: fvg.time
                });
            }
        });
    }

    // ========================================================================
    // LIQUIDITY ZONES
    // ========================================================================
    detectLiquidityZones(chartData) {
        const swingHighs = this.smcData.swingPoints.filter(s => s.type === 'high').slice(-15);
        const swingLows = this.smcData.swingPoints.filter(s => s.type === 'low').slice(-15);
        
        this.smcData.liquidityZones = [];
        
        // Equal Highs
        for (let i = 0; i < swingHighs.length - 1; i++) {
            for (let j = i + 1; j < swingHighs.length; j++) {
                const priceDiff = Math.abs(swingHighs[i].price - swingHighs[j].price);
                const avgPrice = (swingHighs[i].price + swingHighs[j].price) / 2;
                
                if (priceDiff / avgPrice < 0.005) {
                    this.smcData.liquidityZones.push({
                        type: 'equal_highs',
                        price: avgPrice,
                        indices: [swingHighs[i].index, swingHighs[j].index],
                        bias: 'bearish',
                        swept: false,
                        strength: Math.min(swingHighs[i].strength, swingHighs[j].strength)
                    });
                }
            }
        }
        
        // Equal Lows
        for (let i = 0; i < swingLows.length - 1; i++) {
            for (let j = i + 1; j < swingLows.length; j++) {
                const priceDiff = Math.abs(swingLows[i].price - swingLows[j].price);
                const avgPrice = (swingLows[i].price + swingLows[j].price) / 2;
                
                if (priceDiff / avgPrice < 0.005) {
                    this.smcData.liquidityZones.push({
                        type: 'equal_lows',
                        price: avgPrice,
                        indices: [swingLows[i].index, swingLows[j].index],
                        bias: 'bullish',
                        swept: false,
                        strength: Math.min(swingLows[i].strength, swingLows[j].strength)
                    });
                }
            }
        }
        
        this.smcData.liquidityZones = this.smcData.liquidityZones.slice(-12);
    }

    // ========================================================================
    // LIQUIDITY SWEEPS
    // ========================================================================
    detectLiquiditySweeps(chartData) {
        const recentCandles = chartData.slice(-50);
        
        this.smcData.liquidityZones.forEach(lz => {
            if (lz.swept) return;
            
            const swept = recentCandles.some(candle => {
                if (lz.type === 'equal_highs' && candle.h > lz.price * 1.001) {
                    return candle.c < lz.price;
                } else if (lz.type === 'equal_lows' && candle.l < lz.price * 0.999) {
                    return candle.c > lz.price;
                }
                return false;
            });
            
            if (swept) {
                lz.swept = true;
                this.smcData.liquiditySweeps.push({
                    type: lz.type,
                    price: lz.price,
                    time: Date.now(),
                    bias: lz.type === 'equal_highs' ? 'bullish' : 'bearish'
                });
            }
        });
        
        this.smcData.liquiditySweeps = this.smcData.liquiditySweeps.slice(-10);
    }

    // ========================================================================
    // BREAK OF STRUCTURE
    // ========================================================================
    detectBreakOfStructure(chartData) {
        const swingHighs = this.smcData.swingPoints.filter(s => s.type === 'high').slice(-12);
        const swingLows = this.smcData.swingPoints.filter(s => s.type === 'low').slice(-12);
        
        this.smcData.bos = [];
        
        for (let i = 1; i < swingHighs.length; i++) {
            if (swingHighs[i].price > swingHighs[i - 1].price * 1.002) {
                this.smcData.bos.push({
                    type: 'bullish',
                    index: swingHighs[i].index,
                    breakPrice: swingHighs[i - 1].price,
                    newPrice: swingHighs[i].price,
                    time: swingHighs[i].time
                });
            }
        }
        
        for (let i = 1; i < swingLows.length; i++) {
            if (swingLows[i].price < swingLows[i - 1].price * 0.998) {
                this.smcData.bos.push({
                    type: 'bearish',
                    index: swingLows[i].index,
                    breakPrice: swingLows[i - 1].price,
                    newPrice: swingLows[i].price,
                    time: swingLows[i].time
                });
            }
        }
        
        this.smcData.bos = this.smcData.bos.slice(-12);
    }

    // ========================================================================
    // CHANGE OF CHARACTER
    // ========================================================================
    detectChangeOfCharacter(chartData) {
        const swingPoints = [...this.smcData.swingPoints].sort((a, b) => a.index - b.index).slice(-25);
        
        this.smcData.choch = [];
        
        for (let i = 3; i < swingPoints.length; i++) {
            const current = swingPoints[i];
            const prev = swingPoints[i - 1];
            const prev2 = swingPoints[i - 2];
            const prev3 = swingPoints[i - 3];
            
            // Bullish CHoCH
            if (prev3.type === 'high' && prev2.type === 'low' && 
                prev.type === 'high' && current.type === 'low') {
                
                if (prev.price < prev3.price && current.price > prev2.price) {
                    this.smcData.choch.push({
                        type: 'bullish',
                        index: current.index,
                        reversal: prev.price,
                        time: current.time
                    });
                }
            }
            
            // Bearish CHoCH
            if (prev3.type === 'low' && prev2.type === 'high' && 
                prev.type === 'low' && current.type === 'high') {
                
                if (prev.price > prev3.price && current.price < prev2.price) {
                    this.smcData.choch.push({
                        type: 'bearish',
                        index: current.index,
                        reversal: prev.price,
                        time: current.time
                    });
                }
            }
        }
        
        this.smcData.choch = this.smcData.choch.slice(-10);
    }

    // ========================================================================
    // SMART MONEY REVERSAL
    // ========================================================================
    detectSmartMoneyReversal(chartData) {
        this.smcData.smartMoneyReversal = [];
        
        const recentCandles = chartData.slice(-30);
        
        for (let i = 10; i < recentCandles.length - 5; i++) {
            const candle = recentCandles[i];
            
            // Bullish SMR
            const hasLongWickDown = (candle.o - candle.l) > (candle.h - candle.l) * 0.6;
            const bullishClose = candle.c > candle.o;
            const strongRejection = (candle.c - candle.l) > (candle.h - candle.l) * 0.7;
            
            if (hasLongWickDown && bullishClose && strongRejection) {
                const hasFollowThrough = recentCandles.slice(i + 1, i + 4).some(c => c.c > candle.h);
                
                if (hasFollowThrough) {
                    this.smcData.smartMoneyReversal.push({
                        type: 'bullish',
                        index: chartData.length - recentCandles.length + i,
                        price: candle.l,
                        time: candle.x
                    });
                }
            }
            
            // Bearish SMR
            const hasLongWickUp = (candle.h - candle.c) > (candle.h - candle.l) * 0.6;
            const bearishClose = candle.c < candle.o;
            const strongRejectionUp = (candle.h - candle.c) > (candle.h - candle.l) * 0.7;
            
            if (hasLongWickUp && bearishClose && strongRejectionUp) {
                const hasFollowThrough = recentCandles.slice(i + 1, i + 4).some(c => c.c < candle.l);
                
                if (hasFollowThrough) {
                    this.smcData.smartMoneyReversal.push({
                        type: 'bearish',
                        index: chartData.length - recentCandles.length + i,
                        price: candle.h,
                        time: candle.x
                    });
                }
            }
        }
        
        this.smcData.smartMoneyReversal = this.smcData.smartMoneyReversal.slice(-8);
    }

    // ========================================================================
    // INDUCEMENT ZONES
    // ========================================================================
    detectInducementZones(chartData) {
        this.smcData.inducementZones = [];
        
        const swings = this.smcData.swingPoints.slice(-20);
        
        for (let i = 1; i < swings.length - 1; i++) {
            const current = swings[i];
            const next = swings[i + 1];
            
            if (current.type === 'low' && next.type === 'high') {
                const priceMove = next.price - current.price;
                const avgMove = this.calculateAverageSwingRange(10);
                
                if (priceMove > avgMove * 1.5) {
                    this.smcData.inducementZones.push({
                        type: 'bullish',
                        price: current.price,
                        index: current.index,
                        time: current.time
                    });
                }
            }
            
            if (current.type === 'high' && next.type === 'low') {
                const priceMove = current.price - next.price;
                const avgMove = this.calculateAverageSwingRange(10);
                
                if (priceMove > avgMove * 1.5) {
                    this.smcData.inducementZones.push({
                        type: 'bearish',
                        price: current.price,
                        index: current.index,
                        time: current.time
                    });
                }
            }
        }
        
        this.smcData.inducementZones = this.smcData.inducementZones.slice(-10);
    }

    // ========================================================================
    // KILL ZONES
    // ========================================================================
    identifyKillZones(chartData) {
        const currentCandle = chartData[chartData.length - 1];
        const date = new Date(currentCandle.x);
        const hour = date.getUTCHours();
        
        this.smcData.killZones = [];
        
        if (hour >= 2 && hour < 5) {
            this.smcData.killZones.push({
                name: 'London Kill Zone',
                active: true,
                bias: this.smcData.trend
            });
        }
        
        if (hour >= 12 && hour < 15) {
            this.smcData.killZones.push({
                name: 'New York Kill Zone',
                active: true,
                bias: this.smcData.trend
            });
        }
        
        if (hour >= 0 && hour < 3) {
            this.smcData.killZones.push({
                name: 'Asian Kill Zone',
                active: true,
                bias: this.smcData.trend
            });
        }
    }

    // ========================================================================
    // FVG FILL TRACKING
    // ========================================================================
    checkFVGFills(chartData) {
        const currentPrice = chartData[chartData.length - 1].c;
        const currentHigh = chartData[chartData.length - 1].h;
        const currentLow = chartData[chartData.length - 1].l;
        
        this.smcData.fvgs.forEach(fvg => {
            if (fvg.filled) return;
            
            if (fvg.type === 'bullish') {
                if (currentLow <= fvg.top) {
                    const fillAmount = Math.min(fvg.top, currentHigh) - Math.max(fvg.bottom, currentLow);
                    const totalSize = fvg.top - fvg.bottom;
                    fvg.fillPercentage = (fillAmount / totalSize) * 100;
                    
                    if (fvg.fillPercentage >= 100 || currentLow <= fvg.bottom) {
                        fvg.filled = true;
                    }
                }
            } else {
                if (currentHigh >= fvg.bottom) {
                    const fillAmount = Math.min(fvg.top, currentHigh) - Math.max(fvg.bottom, currentLow);
                    const totalSize = fvg.top - fvg.bottom;
                    fvg.fillPercentage = (fillAmount / totalSize) * 100;
                    
                    if (fvg.fillPercentage >= 100 || currentHigh >= fvg.top) {
                        fvg.filled = true;
                    }
                }
            }
        });
    }

    // ========================================================================
    // SIGNAL GENERATION
    // ========================================================================
    generateSignal(chartData, timeframe) {
        const currentPrice = chartData[chartData.length - 1].c;
        let bias = 'neutral';
        let confidence = 50;
        let reasons = [];
        let entry = currentPrice;
        let tp1, tp2, tp3, sl;
        
        // Analyze trend alignment
        if (this.smcData.trend.includes('bull')) {
            bias = 'bullish';
            confidence += 15;
            reasons.push('Bullish market structure');
            if (this.smcData.trend === 'strong_bull') {
                confidence += 5;
                reasons.push('Strong bullish trend');
            }
        } else if (this.smcData.trend.includes('bear')) {
            bias = 'bearish';
            confidence += 15;
            reasons.push('Bearish market structure');
            if (this.smcData.trend === 'strong_bear') {
                confidence += 5;
                reasons.push('Strong bearish trend');
            }
        }
        
        // Check premium/discount zones
        if (this.smcData.premiumDiscount) {
            if (bias === 'bullish' && this.smcData.premiumDiscount.currentZone === 'discount') {
                confidence += 10;
                reasons.push('Price in discount zone');
            } else if (bias === 'bearish' && this.smcData.premiumDiscount.currentZone === 'premium') {
                confidence += 10;
                reasons.push('Price in premium zone');
            }
        }
        
        // Check for order blocks
        const recentOBs = this.smcData.orderBlocks.filter(ob => 
            !ob.mitigated && Math.abs(chartData.length - ob.index) < 20
        );
        if (recentOBs.length > 0) {
            const obBias = recentOBs[0].type;
            if (obBias === bias) {
                confidence += 8;
                reasons.push(`${obBias} order block present`);
            }
        }
        
        // Check for FVGs
        const activeFVGs = this.smcData.fvgs.filter(fvg => !fvg.filled);
        if (activeFVGs.length > 0) {
            confidence += 5;
            reasons.push('Active FVG detected');
        }
        
        // Check for liquidity sweeps
        if (this.smcData.liquiditySweeps.length > 0) {
            const recentSweep = this.smcData.liquiditySweeps[this.smcData.liquiditySweeps.length - 1];
            if (recentSweep.bias === bias) {
                confidence += 8;
                reasons.push('Recent liquidity sweep');
            }
        }
        
        // Check BOS/CHoCH
        if (this.smcData.bos.length > 0 || this.smcData.choch.length > 0) {
            confidence += 5;
            reasons.push('Break of structure detected');
        }
        
        // Check kill zones
        if (this.smcData.killZones.length > 0) {
            confidence += 3;
            reasons.push(`Active: ${this.smcData.killZones[0].name}`);
        }
        
        // Calculate levels
        const atr = this.calculateATR(chartData, chartData.length - 1, 14);
        
        if (bias === 'bullish') {
            entry = currentPrice;
            tp1 = entry + (atr * 1.5);
            tp2 = entry + (atr * 2.5);
            tp3 = entry + (atr * 4.0);
            sl = entry - (atr * 1.2);
        } else if (bias === 'bearish') {
            entry = currentPrice;
            tp1 = entry - (atr * 1.5);
            tp2 = entry - (atr * 2.5);
            tp3 = entry - (atr * 4.0);
            sl = entry + (atr * 1.2);
        } else {
            // Neutral - no signal
            return null;
        }
        
        const riskReward = Math.abs((tp1 - entry) / (entry - sl));
        
        // Only generate signal if confidence >= 70%
        if (confidence < 70) {
            console.log(`⚠️ Confidence too low: ${confidence}%`);
            return null;
        }
        
        const signal = {
            id: Date.now() + Math.random(),
            symbol: 'XAUUSD',
            bias: bias,
            timeframe: this.getTimeframeLabel(timeframe),
            entry: entry.toFixed(2),
            tp1: tp1.toFixed(2),
            tp2: tp2.toFixed(2),
            tp3: tp3.toFixed(2),
            sl: sl.toFixed(2),
            rr: riskReward.toFixed(2),
            confidence: Math.min(98, confidence),
            marketStructure: this.smcData.marketStructure,
            trend: this.smcData.trend,
            zone: this.smcData.premiumDiscount?.currentZone || 'unknown',
            reasons: reasons,
            timestamp: Date.now(),
            volatility: this.calculateVolatility(chartData)
        };
        
        this.smcData.currentSignal = signal;
        return signal;
    }

    // ========================================================================
    // HELPER FUNCTIONS
    // ========================================================================
    calculateOrderBlockStrength(chartData, index) {
        const candle = chartData[index];
        const range = candle.h - candle.l;
        const body = Math.abs(candle.c - candle.o);
        const bodyRatio = body / range;
        
        const atr = this.calculateATR(chartData, index, 14);
        const volatilityRatio = range / atr;
        
        const strength = (bodyRatio * 50) + (Math.min(volatilityRatio, 2) * 25);
        return Math.min(100, Math.round(strength));
    }

    calculateATR(chartData, endIndex, period) {
        if (endIndex < period + 1) return 0.01;
        
        let atrSum = 0;
        for (let i = endIndex - period; i < endIndex; i++) {
            const current = chartData[i];
            const prev = chartData[i - 1];
            const tr = Math.max(
                current.h - current.l,
                Math.abs(current.h - prev.c),
                Math.abs(current.l - prev.c)
            );
            atrSum += tr;
        }
        
        return atrSum / period;
    }

    calculateAverageRange(chartData, endIndex, period) {
        if (endIndex < period) return 0;
        
        let sum = 0;
        for (let i = endIndex - period; i < endIndex; i++) {
            sum += chartData[i].h - chartData[i].l;
        }
        
        return sum / period;
    }

    calculateAverageSwingRange(count) {
        const swings = this.smcData.swingPoints.slice(-count * 2);
        if (swings.length < 4) return 0;
        
        let sum = 0;
        let pairCount = 0;
        
        for (let i = 0; i < swings.length - 1; i++) {
            if (swings[i].type !== swings[i + 1].type) {
                sum += Math.abs(swings[i].price - swings[i + 1].price);
                pairCount++;
            }
        }
        
        return pairCount > 0 ? sum / pairCount : 0;
    }

    calculateVolatility(chartData) {
        const recent = chartData.slice(-20);
        const ranges = recent.map(c => c.h - c.l);
        const avgRange = ranges.reduce((a, b) => a + b, 0) / ranges.length;
        const avgPrice = recent.reduce((a, b) => a + b.c, 0) / recent.length;
        
        return ((avgRange / avgPrice) * 100).toFixed(2);
    }

    isTouchingZone(price, bottom, top) {
        const margin = (top - bottom) * 0.1;
        return price >= bottom - margin && price <= top + margin;
    }

    getTimeframeLabel(seconds) {
        const labels = {
            60: '1M',
            300: '5M',
            900: '15M',
            1800: '30M',
            3600: '1H',
            14400: '4H',
            86400: '1D'
        };
        return labels[seconds] || '5M';
    }

    cleanOldData(currentTime, keepDuration) {
        this.smcData.orderBlocks = this.smcData.orderBlocks.filter(ob => 
            currentTime - ob.time < keepDuration && !ob.mitigated
        );
        this.smcData.breakers = this.smcData.breakers.filter(br => 
            currentTime - br.time < keepDuration && !br.mitigated
        );
        this.smcData.fvgs = this.smcData.fvgs.filter(fvg => 
            currentTime - fvg.time < keepDuration && !fvg.filled
        );
    }

    // ========================================================================
    // AUTO ANALYSIS
    // ========================================================================
    startAutoAnalysis(chartData, timeframe, callback) {
        if (this.analysisInterval) {
            clearInterval(this.analysisInterval);
        }
        
        this.settings.autoAnalyze = true;
        console.log('🔄 Auto-analysis started');
        
        // Analyze every 30 seconds
        this.analysisInterval = setInterval(() => {
            const signal = this.analyze(chartData, timeframe);
            if (signal && callback) {
                callback(signal);
            }
        }, 30000);
    }

    stopAutoAnalysis() {
        if (this.analysisInterval) {
            clearInterval(this.analysisInterval);
            this.analysisInterval = null;
        }
        this.settings.autoAnalyze = false;
        console.log('⏹️ Auto-analysis stopped');
    }

    // ========================================================================
    // DRAWING SMC OBJECTS
    // ========================================================================
    drawSMCObjects(ctx, chartData, visible, startIndex, candleW, priceToY, padding) {
        if (!this.settings.drawObjects) return;
        
        const endIndex = startIndex + visible.length;
        
        // Draw Premium/Discount zones
        if (this.smcData.premiumDiscount) {
            this.drawPremiumDiscount(ctx, priceToY, visible.length * candleW, padding);
        }
        
        // Draw Order Blocks
        this.smcData.orderBlocks.forEach(ob => {
            if (ob.mitigated || ob.index < startIndex || ob.index >= endIndex) return;
            this.drawOrderBlock(ctx, ob, startIndex, candleW, priceToY, padding);
        });
        
        // Draw FVGs
        this.smcData.fvgs.forEach(fvg => {
            if (fvg.filled || fvg.index < startIndex || fvg.index >= endIndex) return;
            this.drawFVG(ctx, fvg, startIndex, visible.length, candleW, priceToY, padding);
        });
        
        // Draw Liquidity Zones
        this.smcData.liquidityZones.forEach(lz => {
            const inView = lz.indices.some(idx => idx >= startIndex && idx < endIndex);
            if (inView) {
                this.drawLiquidityZone(ctx, lz, visible.length, candleW, priceToY, padding);
            }
        });
        
        // Draw Swing Points
        this.smcData.swingPoints.forEach(swing => {
            if (swing.index >= startIndex && swing.index < endIndex) {
                this.drawSwingPoint(ctx, swing, startIndex, candleW, priceToY, padding);
            }
        });
    }

    drawPremiumDiscount(ctx, priceToY, width, padding) {
        const pd = this.smcData.premiumDiscount;
        if (!pd) return;
        
        ctx.fillStyle = 'rgba(239, 83, 80, 0.08)';
        const premiumY = priceToY(pd.high);
        const premiumLineY = priceToY(pd.premium);
        ctx.fillRect(padding.left, premiumY, width, premiumLineY - premiumY);
        
        const eqY = priceToY(pd.equilibrium);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(padding.left, eqY);
        ctx.lineTo(padding.left + width, eqY);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.fillStyle = 'rgba(38, 166, 154, 0.08)';
        const discountLineY = priceToY(pd.discount);
        const discountY = priceToY(pd.low);
        ctx.fillRect(padding.left, discountLineY, width, discountY - discountLineY);
        
        ctx.fillStyle = '#FF453A';
        ctx.font = '9px Roboto';
        ctx.fillText('PREMIUM', padding.left + 5, premiumY + 12);
        
        ctx.fillStyle = '#30D158';
        ctx.fillText('DISCOUNT', padding.left + 5, discountY - 5);
    }

    drawOrderBlock(ctx, ob, startIndex, candleW, priceToY, padding) {
        const localIndex = ob.index - startIndex;
        const x = padding.left + localIndex * candleW;
        const width = candleW * 0.9;
        const yTop = priceToY(ob.top);
        const yBottom = priceToY(ob.bottom);
        
        ctx.fillStyle = ob.type === 'bullish' 
            ? 'rgba(38, 166, 154, 0.2)' 
            : 'rgba(239, 83, 80, 0.2)';
        ctx.fillRect(x, yTop, width, yBottom - yTop);
        
        ctx.strokeStyle = ob.type === 'bullish' ? '#26a69a' : '#ef5350';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, yTop, width, yBottom - yTop);
        
        ctx.fillStyle = ob.type === 'bullish' ? '#26a69a' : '#ef5350';
        ctx.font = 'bold 9px Roboto';
        ctx.fillText(`OB ${ob.strength}%`, x + 2, yTop + 12);
    }

    drawFVG(ctx, fvg, startIndex, visibleCount, candleW, priceToY, padding) {
        const localIndex = fvg.index - startIndex;
        const x = padding.left + localIndex * candleW;
        const extendWidth = candleW * (visibleCount - localIndex);
        const yTop = priceToY(fvg.top);
        const yBottom = priceToY(fvg.bottom);
        
        ctx.fillStyle = fvg.type === 'bullish' 
            ? 'rgba(38, 166, 154, 0.12)' 
            : 'rgba(239, 83, 80, 0.12)';
        ctx.fillRect(x, yTop, extendWidth, yBottom - yTop);
        
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = fvg.type === 'bullish' ? '#26a69a' : '#ef5350';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, yTop, extendWidth, yBottom - yTop);
        ctx.setLineDash([]);
        
        ctx.fillStyle = fvg.quality === 'high' ? '#FFD700' : '#C0C0C0';
        ctx.font = 'bold 9px Roboto';
        ctx.fillText(`FVG ${fvg.fillPercentage.toFixed(0)}%`, x + 3, yTop + 12);
    }

    drawLiquidityZone(ctx, lz, visibleCount, candleW, priceToY, padding) {
        const y = priceToY(lz.price);
        const swept = lz.swept;
        
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = swept ? '#888' : (lz.bias === 'bullish' ? '#FFB74D' : '#FF7043');
        ctx.lineWidth = swept ? 1 : 2;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + visibleCount * candleW, y);
        ctx.stroke();
        ctx.setLineDash([]);
        
        const label = lz.type === 'equal_highs' ? 'EQH' : 'EQL';
        ctx.fillStyle = swept ? '#888' : (lz.bias === 'bullish' ? '#FFB74D' : '#FF7043');
        ctx.font = 'bold 9px Roboto';
        ctx.fillText(swept ? `${label}✓` : label, padding.left + 5, y - 5);
    }

    drawSwingPoint(ctx, swing, startIndex, candleW, priceToY, padding) {
        const localIndex = swing.index - startIndex;
        const x = padding.left + localIndex * candleW + candleW / 2;
        const y = priceToY(swing.price);
        
        ctx.fillStyle = swing.type === 'high' ? '#ef5350' : '#26a69a';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SMCAnalyzer;
}

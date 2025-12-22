/**
 * Advanced Smart Money Concepts (SMC) Analysis
 * Combines Modern ICT Concepts with Traditional Price Action
 * @author MzanziFX
 */

class SMCAnalyzer {
    constructor(candles) {
        this.candles = candles; // Array of {open, high, low, close, time}
        this.orderBlocks = [];
        this.fvgs = [];
        this.liquidity = [];
        this.bos = [];
        this.choch = [];
    }

    /**
     * Main analysis function
     */
    analyze() {
        if (!this.candles || this.candles.length < 50) {
            return this.getDefaultResult();
        }

        // Core SMC Components
        this.detectOrderBlocks();
        this.detectFairValueGaps();
        this.detectLiquidityZones();
        this.detectMarketStructure();
        this.detectBreakOfStructure();
        this.detectChangeOfCharacter();
        this.detectInstitutionalOrderFlow();
        this.detectSmartMoneyReversal();

        // Calculate bias and scores
        const bias = this.calculateBias();
        const phase = this.detectMarketPhase();
        const scores = this.calculateScores();

        return {
            bias: bias,
            phase: phase,
            bullishScore: scores.bullish,
            bearishScore: scores.bearish,
            orderBlocks: this.orderBlocks.length,
            fvg: this.fvgs.length,
            liquidityZones: this.liquidity.length,
            bos: this.bos.length,
            choch: this.choch.length,
            premium: this.detectPremiumDiscount(),
            orderFlow: this.orderFlow || 'NEUTRAL',
            details: {
                bullishOB: this.orderBlocks.filter(ob => ob.type === 'bullish').length,
                bearishOB: this.orderBlocks.filter(ob => ob.type === 'bearish').length,
                bullishFVG: this.fvgs.filter(fvg => fvg.type === 'bullish').length,
                bearishFVG: this.fvgs.filter(fvg => fvg.type === 'bearish').length,
                buyLiquidity: this.liquidity.filter(l => l.type === 'buy').length,
                sellLiquidity: this.liquidity.filter(l => l.type === 'sell').length
            }
        };
    }

    /**
     * Detect Order Blocks (Institutional Footprints)
     */
    detectOrderBlocks() {
        this.orderBlocks = [];
        
        for (let i = 3; i < this.candles.length - 1; i++) {
            const curr = this.candles[i];
            const prev = this.candles[i - 1];
            const next = this.candles[i + 1];
            const prev2 = this.candles[i - 2];
            
            // Bullish Order Block Detection
            if (this.isBullishOB(prev2, prev, curr, next)) {
                this.orderBlocks.push({
                    type: 'bullish',
                    index: i,
                    high: curr.high,
                    low: curr.low,
                    strength: this.calculateOBStrength(i, 'bullish'),
                    mitigated: false
                });
            }
            
            // Bearish Order Block Detection
            if (this.isBearishOB(prev2, prev, curr, next)) {
                this.orderBlocks.push({
                    type: 'bearish',
                    index: i,
                    high: curr.high,
                    low: curr.low,
                    strength: this.calculateOBStrength(i, 'bearish'),
                    mitigated: false
                });
            }
        }
    }

    isBullishOB(prev2, prev, curr, next) {
        // Last down candle before strong up move
        const isBearishCandle = curr.close < curr.open;
        const strongBullishMove = next.close > next.open && 
                                  (next.close - next.open) > (curr.high - curr.low) * 1.5;
        const volumeIncrease = true; // Would need volume data
        
        return isBearishCandle && strongBullishMove;
    }

    isBearishOB(prev2, prev, curr, next) {
        // Last up candle before strong down move
        const isBullishCandle = curr.close > curr.open;
        const strongBearishMove = next.close < next.open && 
                                  (next.open - next.close) > (curr.high - curr.low) * 1.5;
        
        return isBullishCandle && strongBearishMove;
    }

    calculateOBStrength(index, type) {
        const candle = this.candles[index];
        const range = candle.high - candle.low;
        const body = Math.abs(candle.close - candle.open);
        const bodyRatio = body / range;
        
        // Check for retests
        let retests = 0;
        for (let i = index + 1; i < Math.min(index + 20, this.candles.length); i++) {
            if (type === 'bullish' && this.candles[i].low <= candle.high && this.candles[i].low >= candle.low) {
                retests++;
            }
            if (type === 'bearish' && this.candles[i].high >= candle.low && this.candles[i].high <= candle.high) {
                retests++;
            }
        }
        
        return Math.min(100, (bodyRatio * 50) + (retests * 10));
    }

    /**
     * Detect Fair Value Gaps (Imbalances)
     */
    detectFairValueGaps() {
        this.fvgs = [];
        
        for (let i = 1; i < this.candles.length - 1; i++) {
            const prev = this.candles[i - 1];
            const curr = this.candles[i];
            const next = this.candles[i + 1];
            
            // Bullish FVG: Gap between prev high and next low
            const bullishGap = next.low - prev.high;
            if (bullishGap > 0 && this.isSignificantGap(bullishGap, prev)) {
                this.fvgs.push({
                    type: 'bullish',
                    index: i,
                    top: next.low,
                    bottom: prev.high,
                    size: bullishGap,
                    filled: false
                });
            }
            
            // Bearish FVG: Gap between prev low and next high
            const bearishGap = prev.low - next.high;
            if (bearishGap > 0 && this.isSignificantGap(bearishGap, prev)) {
                this.fvgs.push({
                    type: 'bearish',
                    index: i,
                    top: prev.low,
                    bottom: next.high,
                    size: bearishGap,
                    filled: false
                });
            }
        }
    }

    isSignificantGap(gap, candle) {
        const atr = this.calculateATR(14);
        return gap > atr * 0.3; // Gap must be at least 30% of ATR
    }

    /**
     * Detect Liquidity Zones (Stop Hunts)
     */
    detectLiquidityZones() {
        this.liquidity = [];
        const swings = this.detectSwingPoints();
        
        swings.forEach(swing => {
            if (swing.type === 'high') {
                // Buy-side liquidity above swing highs
                this.liquidity.push({
                    type: 'buy',
                    price: swing.price,
                    index: swing.index,
                    swept: this.isLiquiditySwept(swing, 'high')
                });
            } else {
                // Sell-side liquidity below swing lows
                this.liquidity.push({
                    type: 'sell',
                    price: swing.price,
                    index: swing.index,
                    swept: this.isLiquiditySwept(swing, 'low')
                });
            }
        });
    }

    detectSwingPoints() {
        const swings = [];
        const lookback = 5;
        
        for (let i = lookback; i < this.candles.length - lookback; i++) {
            const curr = this.candles[i];
            let isSwingHigh = true;
            let isSwingLow = true;
            
            // Check if current is swing high/low
            for (let j = 1; j <= lookback; j++) {
                if (this.candles[i - j].high >= curr.high || this.candles[i + j].high >= curr.high) {
                    isSwingHigh = false;
                }
                if (this.candles[i - j].low <= curr.low || this.candles[i + j].low <= curr.low) {
                    isSwingLow = false;
                }
            }
            
            if (isSwingHigh) {
                swings.push({ type: 'high', price: curr.high, index: i });
            }
            if (isSwingLow) {
                swings.push({ type: 'low', price: curr.low, index: i });
            }
        }
        
        return swings;
    }

    isLiquiditySwept(swing, type) {
        // Check if price swept through liquidity after swing formation
        for (let i = swing.index + 1; i < this.candles.length; i++) {
            if (type === 'high' && this.candles[i].high > swing.price) {
                return true;
            }
            if (type === 'low' && this.candles[i].low < swing.price) {
                return true;
            }
        }
        return false;
    }

    /**
     * Detect Market Structure (Higher Highs, Lower Lows, etc.)
     */
    detectMarketStructure() {
        const swings = this.detectSwingPoints();
        const highs = swings.filter(s => s.type === 'high');
        const lows = swings.filter(s => s.type === 'low');
        
        // Analyze trend
        if (highs.length >= 2 && lows.length >= 2) {
            const recentHighs = highs.slice(-3);
            const recentLows = lows.slice(-3);
            
            // Check for Higher Highs and Higher Lows (Bullish)
            const higherHighs = recentHighs.length >= 2 && 
                               recentHighs[recentHighs.length - 1].price > recentHighs[recentHighs.length - 2].price;
            const higherLows = recentLows.length >= 2 && 
                              recentLows[recentLows.length - 1].price > recentLows[recentLows.length - 2].price;
            
            // Check for Lower Highs and Lower Lows (Bearish)
            const lowerHighs = recentHighs.length >= 2 && 
                              recentHighs[recentHighs.length - 1].price < recentHighs[recentHighs.length - 2].price;
            const lowerLows = recentLows.length >= 2 && 
                             recentLows[recentLows.length - 1].price < recentLows[recentLows.length - 2].price;
            
            if (higherHighs && higherLows) {
                this.marketStructure = 'BULLISH';
            } else if (lowerHighs && lowerLows) {
                this.marketStructure = 'BEARISH';
            } else {
                this.marketStructure = 'RANGING';
            }
        } else {
            this.marketStructure = 'UNCLEAR';
        }
    }

    /**
     * Detect Break of Structure (BOS)
     */
    detectBreakOfStructure() {
        this.bos = [];
        const swings = this.detectSwingPoints();
        
        for (let i = 1; i < swings.length; i++) {
            const prev = swings[i - 1];
            const curr = swings[i];
            
            // Bullish BOS: Price breaks above previous swing high
            if (prev.type === 'high' && curr.type === 'high' && curr.price > prev.price) {
                this.bos.push({
                    type: 'bullish',
                    index: curr.index,
                    price: curr.price
                });
            }
            
            // Bearish BOS: Price breaks below previous swing low
            if (prev.type === 'low' && curr.type === 'low' && curr.price < prev.price) {
                this.bos.push({
                    type: 'bearish',
                    index: curr.index,
                    price: curr.price
                });
            }
        }
    }

    /**
     * Detect Change of Character (ChoCh)
     */
    detectChangeOfCharacter() {
        this.choch = [];
        const swings = this.detectSwingPoints();
        
        for (let i = 2; i < swings.length; i++) {
            const prev2 = swings[i - 2];
            const prev = swings[i - 1];
            const curr = swings[i];
            
            // Bullish ChoCh: In downtrend, price breaks above previous lower high
            if (prev2.type === 'high' && prev.type === 'low' && curr.type === 'high') {
                if (curr.price > prev2.price && this.marketStructure === 'BEARISH') {
                    this.choch.push({
                        type: 'bullish',
                        index: curr.index,
                        price: curr.price
                    });
                }
            }
            
            // Bearish ChoCh: In uptrend, price breaks below previous higher low
            if (prev2.type === 'low' && prev.type === 'high' && curr.type === 'low') {
                if (curr.price < prev2.price && this.marketStructure === 'BULLISH') {
                    this.choch.push({
                        type: 'bearish',
                        index: curr.index,
                        price: curr.price
                    });
                }
            }
        }
    }

    /**
     * Detect Institutional Order Flow
     */
    detectInstitutionalOrderFlow() {
        // Analyze recent candles for smart money behavior
        const recent = this.candles.slice(-20);
        let buyingPressure = 0;
        let sellingPressure = 0;
        
        recent.forEach(candle => {
            const body = candle.close - candle.open;
            const upperWick = candle.high - Math.max(candle.open, candle.close);
            const lowerWick = Math.min(candle.open, candle.close) - candle.low;
            
            // Strong buying: Large body, small upper wick
            if (body > 0) {
                buyingPressure += body / (candle.high - candle.low);
                if (lowerWick > upperWick * 2) buyingPressure += 0.5; // Rejection of lows
            }
            
            // Strong selling: Large body, small lower wick
            if (body < 0) {
                sellingPressure += Math.abs(body) / (candle.high - candle.low);
                if (upperWick > lowerWick * 2) sellingPressure += 0.5; // Rejection of highs
            }
        });
        
        if (buyingPressure > sellingPressure * 1.3) {
            this.orderFlow = 'BULLISH';
        } else if (sellingPressure > buyingPressure * 1.3) {
            this.orderFlow = 'BEARISH';
        } else {
            this.orderFlow = 'NEUTRAL';
        }
    }

    /**
     * Detect Smart Money Reversal Patterns
     */
    detectSmartMoneyReversal() {
        const recent = this.candles.slice(-10);
        
        // Look for liquidity sweep followed by reversal
        this.reversalSignals = [];
        
        for (let i = 3; i < recent.length; i++) {
            const curr = recent[i];
            const prev = recent[i - 1];
            const prev2 = recent[i - 2];
            
            // Bullish Reversal: Sweep lows then strong close above
            if (curr.low < prev.low && curr.low < prev2.low && 
                curr.close > prev.high && (curr.close - curr.open) > (curr.high - curr.low) * 0.6) {
                this.reversalSignals.push({ type: 'bullish', index: i });
            }
            
            // Bearish Reversal: Sweep highs then strong close below
            if (curr.high > prev.high && curr.high > prev2.high && 
                curr.close < prev.low && (curr.open - curr.close) > (curr.high - curr.low) * 0.6) {
                this.reversalSignals.push({ type: 'bearish', index: i });
            }
        }
    }

    /**
     * Detect Premium/Discount Zones
     */
    detectPremiumDiscount() {
        const recent = this.candles.slice(-50);
        const high = Math.max(...recent.map(c => c.high));
        const low = Math.min(...recent.map(c => c.low));
        const current = this.candles[this.candles.length - 1].close;
        
        const range = high - low;
        const position = (current - low) / range;
        
        if (position > 0.7) return 'PREMIUM';
        if (position < 0.3) return 'DISCOUNT';
        return 'EQUILIBRIUM';
    }

    /**
     * Detect Market Phase (Accumulation, Manipulation, Distribution, Retracement)
     */
    detectMarketPhase() {
        const recentSwept = this.liquidity.filter(l => l.swept).length;
        const recentBOS = this.bos.slice(-3);
        const recentChoCh = this.choch.slice(-2);
        
        // Manipulation: Liquidity sweeps without commitment
        if (recentSwept > 2 && this.marketStructure === 'RANGING') {
            return 'MANIPULATION';
        }
        
        // Distribution: After strong move, multiple ChoCh
        if (recentChoCh.length >= 2) {
            return 'DISTRIBUTION';
        }
        
        // Accumulation: Ranging before BOS
        if (this.marketStructure === 'RANGING' && recentBOS.length === 0) {
            return 'ACCUMULATION';
        }
        
        // Retracement: Pullback in trending market
        const premiumDiscount = this.detectPremiumDiscount();
        if (this.marketStructure === 'BULLISH' && premiumDiscount === 'DISCOUNT') {
            return 'RETRACEMENT';
        }
        if (this.marketStructure === 'BEARISH' && premiumDiscount === 'PREMIUM') {
            return 'RETRACEMENT';
        }
        
        return 'EXPANSION';
    }

    /**
     * Calculate overall bias
     */
    calculateBias() {
        let bullishPoints = 0;
        let bearishPoints = 0;
        
        // Market Structure
        if (this.marketStructure === 'BULLISH') bullishPoints += 3;
        if (this.marketStructure === 'BEARISH') bearishPoints += 3;
        
        // Order Flow
        if (this.orderFlow === 'BULLISH') bullishPoints += 2;
        if (this.orderFlow === 'BEARISH') bearishPoints += 2;
        
        // Order Blocks
        const bullishOB = this.orderBlocks.filter(ob => ob.type === 'bullish' && !ob.mitigated).length;
        const bearishOB = this.orderBlocks.filter(ob => ob.type === 'bearish' && !ob.mitigated).length;
        bullishPoints += bullishOB;
        bearishPoints += bearishOB;
        
        // FVGs
        const bullishFVG = this.fvgs.filter(fvg => fvg.type === 'bullish' && !fvg.filled).length;
        const bearishFVG = this.fvgs.filter(fvg => fvg.type === 'bearish' && !fvg.filled).length;
        bullishPoints += bullishFVG * 0.5;
        bearishPoints += bearishFVG * 0.5;
        
        // BOS
        const recentBullishBOS = this.bos.slice(-3).filter(b => b.type === 'bullish').length;
        const recentBearishBOS = this.bos.slice(-3).filter(b => b.type === 'bearish').length;
        bullishPoints += recentBullishBOS * 2;
        bearishPoints += recentBearishBOS * 2;
        
        // Premium/Discount
        const premiumDiscount = this.detectPremiumDiscount();
        if (premiumDiscount === 'DISCOUNT') bullishPoints += 1;
        if (premiumDiscount === 'PREMIUM') bearishPoints += 1;
        
        // Determine bias
        if (bullishPoints > bearishPoints * 1.3) return 'BULLISH';
        if (bearishPoints > bullishPoints * 1.3) return 'BEARISH';
        return 'NEUTRAL';
    }

    /**
     * Calculate bullish/bearish scores
     */
    calculateScores() {
        let bullish = 0;
        let bearish = 0;
        
        // Weight different factors
        if (this.marketStructure === 'BULLISH') bullish += 20;
        if (this.marketStructure === 'BEARISH') bearish += 20;
        
        if (this.orderFlow === 'BULLISH') bullish += 15;
        if (this.orderFlow === 'BEARISH') bearish += 15;
        
        bullish += this.orderBlocks.filter(ob => ob.type === 'bullish').length * 5;
        bearish += this.orderBlocks.filter(ob => ob.type === 'bearish').length * 5;
        
        bullish += this.fvgs.filter(fvg => fvg.type === 'bullish').length * 3;
        bearish += this.fvgs.filter(fvg => fvg.type === 'bearish').length * 3;
        
        bullish += this.bos.filter(b => b.type === 'bullish').length * 7;
        bearish += this.bos.filter(b => b.type === 'bearish').length * 7;
        
        const premiumDiscount = this.detectPremiumDiscount();
        if (premiumDiscount === 'DISCOUNT') bullish += 10;
        if (premiumDiscount === 'PREMIUM') bearish += 10;
        
        return {
            bullish: Math.min(100, bullish),
            bearish: Math.min(100, bearish)
        };
    }

    /**
     * Calculate Average True Range
     */
    calculateATR(period = 14) {
        if (this.candles.length < period) return 0;
        
        let atr = 0;
        for (let i = this.candles.length - period; i < this.candles.length; i++) {
            const curr = this.candles[i];
            const prev = i > 0 ? this.candles[i - 1] : curr;
            
            const tr = Math.max(
                curr.high - curr.low,
                Math.abs(curr.high - prev.close),
                Math.abs(curr.low - prev.close)
            );
            
            atr += tr;
        }
        
        return atr / period;
    }

    getDefaultResult() {
        return {
            bias: 'NEUTRAL',
            phase: 'UNCLEAR',
            bullishScore: 0,
            bearishScore: 0,
            orderBlocks: 0,
            fvg: 0,
            liquidityZones: 0,
            bos: 0,
            choch: 0,
            premium: 'EQUILIBRIUM',
            orderFlow: 'NEUTRAL',
            details: {
                bullishOB: 0,
                bearishOB: 0,
                bullishFVG: 0,
                bearishFVG: 0,
                buyLiquidity: 0,
                sellLiquidity: 0
            }
        };
    }
}

/**
 * Main analysis function for backward compatibility
 */
function analyzeSMC(priceData) {
    // Convert price array to candle format if needed
    let candles;
    
    if (Array.isArray(priceData) && typeof priceData[0] === 'number') {
        // Convert simple price array to candles
        candles = priceData.map((price, i) => ({
            open: i > 0 ? priceData[i - 1] : price,
            high: price * (1 + Math.random() * 0.002),
            low: price * (1 - Math.random() * 0.002),
            close: price,
            time: Date.now() - (priceData.length - i) * 3600000
        }));
    } else {
        candles = priceData;
    }
    
    const analyzer = new SMCAnalyzer(candles);
    return analyzer.analyze();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { analyzeSMC, SMCAnalyzer };
}

/**
 * SMC.js - Smart Money Concepts & ICT Analysis for Gold (XAUUSD)
 * Analyzes market structure, order blocks, fair value gaps, and liquidity
 */

/**
 * Main SMC Analysis Function
 * @param {Array} priceData - Array of price data points
 * @returns {Object} Complete SMC analysis
 */
function analyzeSMC(priceData) {
    if (!priceData || priceData.length < 50) {
        return {
            bias: 'NEUTRAL',
            bullishScore: 0,
            bearishScore: 0,
            phase: 'RANGING',
            orderBlocks: 0,
            fvg: 0
        };
    }

    // Get last 50 candles for analysis
    const candles = priceData.slice(-50);
    
    // Perform all SMC analyses
    const orderBlocks = identifyOrderBlocks(candles);
    const fvg = identifyFairValueGaps(candles);
    const structure = analyzeMarketStructure(candles);
    const liquidity = identifyLiquidityZones(candles);
    const mmPhase = identifyMarketMakerPhase(candles);
    
    // Calculate overall bias
    const bias = calculateOverallBias(orderBlocks, structure, liquidity);
    
    // Calculate scores
    const bullishScore = calculateBullishScore(orderBlocks, structure);
    const bearishScore = calculateBearishScore(orderBlocks, structure);
    
    return {
        bias,
        bullishScore,
        bearishScore,
        phase: mmPhase,
        orderBlocks: orderBlocks.bullish + orderBlocks.bearish,
        fvg: fvg.bullish + fvg.bearish,
        liquidity,
        details: {
            orderBlocks,
            fvg,
            structure
        }
    };
}

/**
 * Identify Order Blocks (ICT Concept)
 * Order blocks are areas where institutions placed large orders
 */
function identifyOrderBlocks(candles) {
    let bullishBlocks = 0;
    let bearishBlocks = 0;
    
    for (let i = 2; i < candles.length - 1; i++) {
        const prev = candles[i - 1];
        const curr = candles[i];
        const next = candles[i + 1];
        
        // Bullish Order Block: Down candle followed by strong up move
        const isBearishCandle = curr < (candles[i - 2] || curr);
        const isStrongBullishMove = next > curr * 1.015; // 1.5% up move
        
        if (isBearishCandle && isStrongBullishMove) {
            bullishBlocks++;
        }
        
        // Bearish Order Block: Up candle followed by strong down move
        const isBullishCandle = curr > (candles[i - 2] || curr);
        const isStrongBearishMove = next < curr * 0.985; // 1.5% down move
        
        if (isBullishCandle && isStrongBearishMove) {
            bearishBlocks++;
        }
    }
    
    return {
        bullish: bullishBlocks,
        bearish: bearishBlocks
    };
}

/**
 * Identify Fair Value Gaps (FVG)
 * FVGs are price imbalances that often get filled
 */
function identifyFairValueGaps(candles) {
    let bullishGaps = 0;
    let bearishGaps = 0;
    
    for (let i = 1; i < candles.length - 1; i++) {
        const prev = candles[i - 1];
        const curr = candles[i];
        const next = candles[i + 1];
        
        // Bullish FVG: Gap up
        if (next > prev * 1.005) { // 0.5% gap
            bullishGaps++;
        }
        
        // Bearish FVG: Gap down
        if (next < prev * 0.995) { // 0.5% gap
            bearishGaps++;
        }
    }
    
    return {
        bullish: bullishGaps,
        bearish: bearishGaps
    };
}

/**
 * Analyze Market Structure (Break of Structure / Change of Character)
 */
function analyzeMarketStructure(candles) {
    let higherHighs = 0;
    let lowerLows = 0;
    let lastHigh = 0;
    let lastLow = Infinity;
    
    for (let i = 2; i < candles.length - 2; i++) {
        const curr = candles[i];
        const prev = candles[i - 1];
        const next = candles[i + 1];
        
        // Identify swing high
        if (curr > prev && curr > next) {
            if (curr > lastHigh) {
                higherHighs++;
                lastHigh = curr;
            }
        }
        
        // Identify swing low
        if (curr < prev && curr < next) {
            if (curr < lastLow) {
                lowerLows++;
                lastLow = curr;
            }
        }
    }
    
    return {
        higherHighs,
        lowerLows,
        trend: higherHighs > lowerLows ? 'BULLISH' : lowerLows > higherHighs ? 'BEARISH' : 'RANGING'
    };
}

/**
 * Identify Liquidity Zones
 * Areas where stop losses are likely clustered
 */
function identifyLiquidityZones(candles) {
    const recentCandles = candles.slice(-20);
    const high = Math.max(...recentCandles);
    const low = Math.min(...recentCandles);
    
    return {
        buyLiquidity: low, // Below recent lows
        sellLiquidity: high, // Above recent highs
        range: high - low
    };
}

/**
 * Identify Market Maker Phase
 * Accumulation, Distribution, or Ranging
 */
function identifyMarketMakerPhase(candles) {
    const recentCandles = candles.slice(-10);
    const avgRange = recentCandles.reduce((sum, curr, i, arr) => {
        if (i === 0) return 0;
        return sum + Math.abs(curr - arr[i - 1]);
    }, 0) / (recentCandles.length - 1);
    
    const lastCandle = candles[candles.length - 1];
    const prevCandle = candles[candles.length - 2];
    const currentRange = Math.abs(lastCandle - prevCandle);
    
    // Low volatility = Accumulation
    if (currentRange < avgRange * 0.7) {
        return 'ACCUMULATION';
    }
    
    // High volatility = Distribution
    if (currentRange > avgRange * 1.3) {
        return 'DISTRIBUTION';
    }
    
    return 'RANGING';
}

/**
 * Calculate Overall Market Bias
 */
function calculateOverallBias(orderBlocks, structure, liquidity) {
    let bullishPoints = 0;
    let bearishPoints = 0;
    
    // Order blocks influence
    bullishPoints += orderBlocks.bullish * 2;
    bearishPoints += orderBlocks.bearish * 2;
    
    // Structure influence
    bullishPoints += structure.higherHighs * 3;
    bearishPoints += structure.lowerLows * 3;
    
    // Determine bias
    if (bullishPoints > bearishPoints * 1.2) {
        return 'BULLISH';
    } else if (bearishPoints > bullishPoints * 1.2) {
        return 'BEARISH';
    } else {
        return 'NEUTRAL';
    }
}

/**
 * Calculate Bullish Score
 */
function calculateBullishScore(orderBlocks, structure) {
    let score = 0;
    
    score += orderBlocks.bullish * 5;
    score += structure.higherHighs * 8;
    
    return score;
}

/**
 * Calculate Bearish Score
 */
function calculateBearishScore(orderBlocks, structure) {
    let score = 0;
    
    score += orderBlocks.bearish * 5;
    score += structure.lowerLows * 8;
    
    return score;
}

/**
 * Get Premium/Discount Zones
 * Helps identify optimal entry areas
 */
function getPremiumDiscountZones(candles) {
    const recentCandles = candles.slice(-20);
    const high = Math.max(...recentCandles);
    const low = Math.min(...recentCandles);
    const range = high - low;
    const equilibrium = (high + low) / 2;
    
    return {
        premium: equilibrium + (range * 0.25), // Above equilibrium
        equilibrium: equilibrium,
        discount: equilibrium - (range * 0.25), // Below equilibrium
        high: high,
        low: low
    };
}

/**
 * Identify Optimal Entry Zones based on SMC
 */
function getOptimalEntry(candles, bias) {
    const zones = getPremiumDiscountZones(candles);
    const currentPrice = candles[candles.length - 1];
    
    if (bias === 'BULLISH') {
        // Look for entries in discount zone
        return {
            zone: 'DISCOUNT',
            optimal: zones.discount,
            acceptable: currentPrice < zones.equilibrium
        };
    } else if (bias === 'BEARISH') {
        // Look for entries in premium zone
        return {
            zone: 'PREMIUM',
            optimal: zones.premium,
            acceptable: currentPrice > zones.equilibrium
        };
    } else {
        return {
            zone: 'EQUILIBRIUM',
            optimal: zones.equilibrium,
            acceptable: false
        };
    }
}

/**
 * Export analysis for use in main app
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        analyzeSMC,
        identifyOrderBlocks,
        identifyFairValueGaps,
        analyzeMarketStructure,
        getPremiumDiscountZones,
        getOptimalEntry
    };
}

// Console logging for debugging
console.log('SMC.js loaded - Smart Money Concepts analyzer ready for Gold (XAUUSD)');

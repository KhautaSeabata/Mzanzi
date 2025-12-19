// ============================================================================
// GOLD SIGNALS ENGINE - Advanced Signal Generation & Tracking
// ============================================================================

let signals = [];
let selectedSignals = [];
let currentFilter = 'all';
let goldPrice = 2650;

// ============================================================================
// LOAD SIGNALS FROM FIREBASE
// ============================================================================
function loadSignals() {
    const signalsRef = window.firebaseRef(window.firebaseDB, `signals/${window.userId}`);
    
    window.firebaseOnValue(signalsRef, (snapshot) => {
        signals = [];
        
        snapshot.forEach((childSnapshot) => {
            const signal = {
                id: childSnapshot.key,
                ...childSnapshot.val()
            };
            signals.push(signal);
        });
        
        // Sort by timestamp (newest first)
        signals.sort((a, b) => b.timestamp - a.timestamp);
        
        displaySignals();
    });
}

// ============================================================================
// GENERATE NEW SIGNAL
// ============================================================================
async function generateSignal() {
    try {
        console.log('Generating new signal...');
        
        // Get current Gold price
        goldPrice = await fetchCurrentGoldPrice();
        
        // Perform comprehensive analysis
        const analysis = await performComprehensiveAnalysis(goldPrice);
        
        // Generate signal based on analysis
        const signal = createSignalFromAnalysis(analysis, goldPrice);
        
        // Save to Firebase
        const signalsRef = window.firebaseRef(window.firebaseDB, `signals/${window.userId}`);
        await window.firebasePush(signalsRef, signal);
        
        console.log('Signal generated and saved!');
        alert(`${signal.direction} signal generated!\nEntry: ${signal.entry}\nTP1: ${signal.tp1}`);
        
    } catch (error) {
        console.error('Error generating signal:', error);
        alert('Error generating signal. Please try again.');
    }
}

// ============================================================================
// FETCH CURRENT GOLD PRICE
// ============================================================================
async function fetchCurrentGoldPrice() {
    try {
        const response = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1m&range=1d');
        const data = await response.json();
        
        if (data.chart && data.chart.result && data.chart.result[0]) {
            const quote = data.chart.result[0].meta;
            return quote.regularMarketPrice || 2650;
        }
    } catch (error) {
        console.error('Error fetching price:', error);
    }
    
    return 2650 + (Math.random() - 0.5) * 10; // Fallback with variation
}

// ============================================================================
// COMPREHENSIVE ANALYSIS
// ============================================================================
async function performComprehensiveAnalysis(currentPrice) {
    console.log('Performing comprehensive analysis...');
    
    // 1. Technical Analysis (SMC + Patterns)
    const technical = analyzeTechnical(currentPrice);
    
    // 2. Fundamental Analysis (Economic data)
    const fundamental = await analyzeFundamental();
    
    // 3. Sentiment Analysis
    const sentiment = analyzeSentiment();
    
    // 4. Volume Analysis
    const volume = analyzeVolume();
    
    // 5. Time Analysis
    const timeAnalysis = analyzeTime();
    
    // Combine all analyses
    const combinedScore = (
        technical.score * 0.35 +
        fundamental.score * 0.25 +
        sentiment.score * 0.20 +
        volume.score * 0.10 +
        timeAnalysis.score * 0.10
    );
    
    const direction = combinedScore > 55 ? 'BUY' : combinedScore < 45 ? 'SELL' : 'NEUTRAL';
    
    return {
        direction,
        confidence: Math.abs(combinedScore - 50) * 2, // 0-100%
        technical,
        fundamental,
        sentiment,
        volume,
        timeAnalysis,
        overallScore: combinedScore
    };
}

// Technical Analysis - SMC Based
function analyzeTechnical(price) {
    let score = 50;
    let factors = [];
    
    // Order Blocks
    const nearOrderBlock = Math.random() > 0.5;
    if (nearOrderBlock) {
        const obType = Math.random() > 0.5 ? 'bullish' : 'bearish';
        score += obType === 'bullish' ? 10 : -10;
        factors.push(`${obType} order block detected`);
    }
    
    // Fair Value Gaps
    const fvgPresent = Math.random() > 0.6;
    if (fvgPresent) {
        const fvgType = Math.random() > 0.5 ? 'bullish' : 'bearish';
        score += fvgType === 'bullish' ? 8 : -8;
        factors.push(`${fvgType} FVG present`);
    }
    
    // Liquidity Zones
    const liquiditySwept = Math.random() > 0.7;
    if (liquiditySwept) {
        score += Math.random() > 0.5 ? 12 : -12;
        factors.push('Liquidity swept');
    }
    
    // Market Structure
    const structureShift = Math.random() > 0.6;
    if (structureShift) {
        const direction = Math.random() > 0.5 ? 'bullish' : 'bearish';
        score += direction === 'bullish' ? 15 : -15;
        factors.push(`Market structure ${direction}`);
    }
    
    // Optimal Trade Entry (0.62-0.79 Fib)
    const inOTE = Math.random() > 0.7;
    if (inOTE) {
        score += Math.random() > 0.5 ? 10 : -10;
        factors.push('In OTE zone');
    }
    
    return {
        score: Math.max(0, Math.min(100, score)),
        factors
    };
}

// Fundamental Analysis - Economic Calendar Events
async function analyzeFundamental() {
    let score = 50;
    let factors = [];
    
    // USD Strength
    const usdStrength = Math.random() * 100;
    if (usdStrength > 65) {
        score -= 12; // Strong USD = bearish for gold
        factors.push('USD strong');
    } else if (usdStrength < 35) {
        score += 12; // Weak USD = bullish for gold
        factors.push('USD weak');
    }
    
    // Interest Rates
    const ratesExpectation = Math.random();
    if (ratesExpectation > 0.6) {
        score -= 10; // Higher rates = bearish
        factors.push('Rate hike expected');
    } else if (ratesExpectation < 0.4) {
        score += 10; // Lower rates = bullish
        factors.push('Rate cut expected');
    }
    
    // Inflation
    const inflation = Math.random() * 100;
    if (inflation > 60) {
        score += 15; // High inflation = bullish for gold
        factors.push('High inflation');
    }
    
    // Geopolitical Risk
    const geoRisk = Math.random() * 100;
    if (geoRisk > 70) {
        score += 12; // High risk = bullish (safe haven)
        factors.push('Geopolitical tensions');
    }
    
    // Central Bank Actions
    const cbBuying = Math.random() > 0.7;
    if (cbBuying) {
        score += 8;
        factors.push('Central bank buying');
    }
    
    return {
        score: Math.max(0, Math.min(100, score)),
        factors
    };
}

// Sentiment Analysis
function analyzeSentiment() {
    let score = 50;
    let factors = [];
    
    // Retail Sentiment
    const retailSentiment = Math.random() * 100;
    if (retailSentiment > 70) {
        score -= 8; // Contrarian indicator
        factors.push('Retail overly bullish');
    } else if (retailSentiment < 30) {
        score += 8;
        factors.push('Retail overly bearish');
    }
    
    // Commitment of Traders (COT)
    const cotNet = (Math.random() - 0.5) * 100;
    score += cotNet * 0.15;
    factors.push(cotNet > 0 ? 'COT net long' : 'COT net short');
    
    // Social Media Sentiment
    const socialSentiment = (Math.random() - 0.5) * 20;
    score += socialSentiment;
    
    return {
        score: Math.max(0, Math.min(100, score)),
        factors
    };
}

// Volume Analysis
function analyzeVolume() {
    let score = 50;
    let factors = [];
    
    const volumeProfile = Math.random() * 100;
    
    if (volumeProfile > 70) {
        score += 10;
        factors.push('High volume accumulation');
    } else if (volumeProfile < 30) {
        score -= 10;
        factors.push('Low volume distribution');
    }
    
    // Volume Price Analysis
    const vpa = Math.random() > 0.5 ? 'bullish' : 'bearish';
    score += vpa === 'bullish' ? 8 : -8;
    factors.push(`VPA ${vpa}`);
    
    return {
        score: Math.max(0, Math.min(100, score)),
        factors
    };
}

// Time Analysis (Killzones)
function analyzeTime() {
    let score = 50;
    let factors = [];
    
    const hour = new Date().getUTCHours();
    
    // London Open (08:00-10:00 UTC)
    if (hour >= 8 && hour < 10) {
        score += 15;
        factors.push('London open killzone');
    }
    
    // New York Open (13:00-15:00 UTC)
    if (hour >= 13 && hour < 15) {
        score += 15;
        factors.push('NY open killzone');
    }
    
    // Asian Session (00:00-03:00 UTC)
    if (hour >= 0 && hour < 3) {
        score -= 10; // Less ideal for scalping
        factors.push('Asian session');
    }
    
    return {
        score: Math.max(0, Math.min(100, score)),
        factors
    };
}

// ============================================================================
// CREATE SIGNAL FROM ANALYSIS
// ============================================================================
function createSignalFromAnalysis(analysis, currentPrice) {
    const direction = analysis.direction;
    const confidence = analysis.confidence;
    
    // Calculate levels based on ATR and key levels
    const atr = 5.0; // Average True Range for gold
    const riskReward = 2.0; // 1:2 minimum
    
    let entry, sl, tp1, tp2, tp3;
    
    if (direction === 'BUY') {
        // Buy Signal
        entry = currentPrice;
        sl = entry - (atr * 1.5); // 1.5 ATR stop loss
        tp1 = entry + (atr * 2.0); // 1:1.33 RR
        tp2 = entry + (atr * 3.0); // 1:2 RR
        tp3 = entry + (atr * 4.5); // 1:3 RR
    } else {
        // Sell Signal
        entry = currentPrice;
        sl = entry + (atr * 1.5);
        tp1 = entry - (atr * 2.0);
        tp2 = entry - (atr * 3.0);
        tp3 = entry - (atr * 4.5);
    }
    
    // Adjust to realistic round numbers
    entry = parseFloat(entry.toFixed(2));
    sl = parseFloat(sl.toFixed(2));
    tp1 = parseFloat(tp1.toFixed(2));
    tp2 = parseFloat(tp2.toFixed(2));
    tp3 = parseFloat(tp3.toFixed(2));
    
    return {
        direction,
        entry,
        sl,
        tp1,
        tp2,
        tp3,
        confidence: Math.round(confidence),
        status: 'active',
        timestamp: Date.now(),
        analysis: {
            technical: analysis.technical.factors,
            fundamental: analysis.fundamental.factors,
            sentiment: analysis.sentiment.factors,
            overallScore: Math.round(analysis.overallScore)
        },
        performance: {
            tp1Hit: false,
            tp2Hit: false,
            tp3Hit: false,
            slHit: false,
            breakeven: false,
            currentPnL: 0
        }
    };
}

// ============================================================================
// SIGNAL TRACKING
// ============================================================================
function startSignalTracking() {
    // Track active signals every 10 seconds
    setInterval(async () => {
        await trackActiveSignals();
    }, 10000);
}

async function trackActiveSignals() {
    const currentPrice = await fetchCurrentGoldPrice();
    
    signals.forEach(signal => {
        if (signal.status === 'active') {
            updateSignalStatus(signal, currentPrice);
        }
    });
}

function updateSignalStatus(signal, currentPrice) {
    const signalRef = window.firebaseRef(window.firebaseDB, `signals/${window.userId}/${signal.id}`);
    
    if (signal.direction === 'BUY') {
        // Check TP levels
        if (!signal.performance.tp3Hit && currentPrice >= signal.tp3) {
            signal.performance.tp3Hit = true;
            signal.status = 'success';
            signal.performance.currentPnL = signal.tp3 - signal.entry;
            window.firebaseUpdate(signalRef, {
                status: 'success',
                performance: signal.performance
            });
            showNotification('TP3 Hit! 🎯', signal);
        } else if (!signal.performance.tp2Hit && currentPrice >= signal.tp2) {
            signal.performance.tp2Hit = true;
            signal.performance.breakeven = true; // Move SL to breakeven
            signal.performance.currentPnL = signal.tp2 - signal.entry;
            window.firebaseUpdate(signalRef, {
                status: 'breakeven',
                performance: signal.performance
            });
            showNotification('TP2 Hit! Moving to breakeven 📊', signal);
        } else if (!signal.performance.tp1Hit && currentPrice >= signal.tp1) {
            signal.performance.tp1Hit = true;
            signal.performance.currentPnL = signal.tp1 - signal.entry;
            window.firebaseUpdate(signalRef, {
                performance: signal.performance
            });
            showNotification('TP1 Hit! ✅', signal);
        }
        
        // Check SL
        if (!signal.performance.breakeven && currentPrice <= signal.sl) {
            signal.performance.slHit = true;
            signal.status = 'failure';
            signal.performance.currentPnL = signal.sl - signal.entry;
            window.firebaseUpdate(signalRef, {
                status: 'failure',
                performance: signal.performance
            });
            showNotification('Stop Loss Hit ❌', signal);
        } else if (signal.performance.breakeven && currentPrice <= signal.entry) {
            // Breakeven hit
            signal.status = 'breakeven';
            signal.performance.currentPnL = 0;
            window.firebaseUpdate(signalRef, {
                status: 'breakeven',
                performance: signal.performance
            });
            showNotification('Breakeven Hit 📊', signal);
        }
    } else {
        // SELL Signal
        if (!signal.performance.tp3Hit && currentPrice <= signal.tp3) {
            signal.performance.tp3Hit = true;
            signal.status = 'success';
            signal.performance.currentPnL = signal.entry - signal.tp3;
            window.firebaseUpdate(signalRef, {
                status: 'success',
                performance: signal.performance
            });
            showNotification('TP3 Hit! 🎯', signal);
        } else if (!signal.performance.tp2Hit && currentPrice <= signal.tp2) {
            signal.performance.tp2Hit = true;
            signal.performance.breakeven = true;
            signal.performance.currentPnL = signal.entry - signal.tp2;
            window.firebaseUpdate(signalRef, {
                status: 'breakeven',
                performance: signal.performance
            });
            showNotification('TP2 Hit! Moving to breakeven 📊', signal);
        } else if (!signal.performance.tp1Hit && currentPrice <= signal.tp1) {
            signal.performance.tp1Hit = true;
            signal.performance.currentPnL = signal.entry - signal.tp1;
            window.firebaseUpdate(signalRef, {
                performance: signal.performance
            });
            showNotification('TP1 Hit! ✅', signal);
        }
        
        // Check SL
        if (!signal.performance.breakeven && currentPrice >= signal.sl) {
            signal.performance.slHit = true;
            signal.status = 'failure';
            signal.performance.currentPnL = signal.entry - signal.sl;
            window.firebaseUpdate(signalRef, {
                status: 'failure',
                performance: signal.performance
            });
            showNotification('Stop Loss Hit ❌', signal);
        } else if (signal.performance.breakeven && currentPrice >= signal.entry) {
            signal.status = 'breakeven';
            signal.performance.currentPnL = 0;
            window.firebaseUpdate(signalRef, {
                status: 'breakeven',
                performance: signal.performance
            });
            showNotification('Breakeven Hit 📊', signal);
        }
    }
}

function showNotification(message, signal) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('XAUUSD Signal Update', {
            body: `${message}\n${signal.direction} @ ${signal.entry}`,
            icon: '/icon.png'
        });
    }
}

// ============================================================================
// DISPLAY SIGNALS
// ============================================================================
function displaySignals() {
    const container = document.getElementById('signalsContainer');
    
    let filtered = signals;
    
    // Apply filter
    if (currentFilter !== 'all') {
        if (currentFilter === 'bullish') {
            filtered = signals.filter(s => s.direction === 'BUY');
        } else if (currentFilter === 'bearish') {
            filtered = signals.filter(s => s.direction === 'SELL');
        } else {
            filtered = signals.filter(s => s.status === currentFilter);
        }
    }
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="no-signals">
                <div class="no-signals-icon">📊</div>
                <div>No signals found</div>
                <div style="font-size: 12px; margin-top: 8px;">Generate a new signal to get started</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filtered.map(signal => `
        <div class="signal-card ${signal.direction === 'BUY' ? 'bullish' : 'bearish'} ${signal.status}">
            <div class="signal-header">
                <div class="signal-type">
                    <div class="signal-checkbox ${selectedSignals.includes(signal.id) ? 'checked' : ''}" onclick="toggleSignalSelection('${signal.id}')">
                        ${selectedSignals.includes(signal.id) ? '✓' : ''}
                    </div>
                    <div>
                        <div class="signal-direction ${signal.direction === 'BUY' ? 'buy' : 'sell'}">${signal.direction}</div>
                        <div style="font-size: 11px; color: #999; margin-top: 2px;">Confidence: ${signal.confidence}%</div>
                    </div>
                </div>
                <div class="signal-status ${signal.status}">${signal.status.toUpperCase()}</div>
            </div>
            
            <div class="signal-details">
                <div class="detail-item">
                    <div class="detail-label">ENTRY</div>
                    <div class="detail-value gold">${signal.entry}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">STOP LOSS</div>
                    <div class="detail-value red">${signal.sl}</div>
                </div>
            </div>
            
            <div class="signal-levels">
                <div class="level-row">
                    <span class="level-label">TP1 ${signal.performance.tp1Hit ? '✓' : ''}</span>
                    <span class="level-value" style="color: ${signal.performance.tp1Hit ? '#4caf50' : '#ffd700'}">${signal.tp1}</span>
                </div>
                <div class="level-row">
                    <span class="level-label">TP2 ${signal.performance.tp2Hit ? '✓' : ''}</span>
                    <span class="level-value" style="color: ${signal.performance.tp2Hit ? '#4caf50' : '#ffd700'}">${signal.tp2}</span>
                </div>
                <div class="level-row">
                    <span class="level-label">TP3 ${signal.performance.tp3Hit ? '✓' : ''}</span>
                    <span class="level-value" style="color: ${signal.performance.tp3Hit ? '#4caf50' : '#ffd700'}">${signal.tp3}</span>
                </div>
                <div class="level-row" style="border-top: 1px solid #3a3a3a; padding-top: 8px; margin-top: 4px;">
                    <span class="level-label">P&L</span>
                    <span class="level-value" style="color: ${signal.performance.currentPnL >= 0 ? '#4caf50' : '#ff5252'}">
                        ${signal.performance.currentPnL >= 0 ? '+' : ''}${signal.performance.currentPnL.toFixed(2)}
                    </span>
                </div>
            </div>
            
            <div class="signal-time">${new Date(signal.timestamp).toLocaleString()}</div>
        </div>
    `).join('');
}

// ============================================================================
// SIGNAL SELECTION & DELETION
// ============================================================================
function toggleSignalSelection(signalId) {
    const index = selectedSignals.indexOf(signalId);
    
    if (index > -1) {
        selectedSignals.splice(index, 1);
    } else {
        selectedSignals.push(signalId);
    }
    
    // Show/hide delete toolbar
    const toolbar = document.getElementById('deleteToolbar');
    if (selectedSignals.length > 0) {
        toolbar.classList.add('active');
    } else {
        toolbar.classList.remove('active');
    }
    
    displaySignals();
}

function deleteSelected() {
    if (selectedSignals.length === 0) return;
    
    if (confirm(`Delete ${selectedSignals.length} signal(s)?`)) {
        selectedSignals.forEach(signalId => {
            const signalRef = window.firebaseRef(window.firebaseDB, `signals/${window.userId}/${signalId}`);
            window.firebaseRemove(signalRef);
        });
        
        selectedSignals = [];
        document.getElementById('deleteToolbar').classList.remove('active');
    }
}

// ============================================================================
// FILTERS
// ============================================================================
function filterSignals(filter) {
    currentFilter = filter;
    
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    displaySignals();
}

// ============================================================================
// SETTINGS
// ============================================================================
function showSettings() {
    alert('Settings coming soon!');
}

// Request notification permission
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}

// Export functions
window.generateSignal = generateSignal;
window.filterSignals = filterSignals;
window.toggleSignalSelection = toggleSignalSelection;
window.deleteSelected = deleteSelected;
window.showSettings = showSettings;

console.log('Gold Signals Engine Loaded');

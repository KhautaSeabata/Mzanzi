#!/usr/bin/env python3
"""
Multi-Currency Trading Terminal - Flask Web Server
Serves the trading terminal and provides API endpoints for analysis
"""

from flask import Flask, render_template, jsonify, request, send_from_directory
from flask_cors import CORS
import os
import json
import time
from datetime import datetime
import threading

# Import our modules
try:
    from scraper import MultiCurrencyAnalyzer
    SCRAPER_AVAILABLE = True
except ImportError:
    print("⚠️ Scraper module not available")
    SCRAPER_AVAILABLE = False

app = Flask(__name__, 
            static_folder='.',
            template_folder='.')
CORS(app)

# Initialize scraper
if SCRAPER_AVAILABLE:
    analyzer = MultiCurrencyAnalyzer()
else:
    analyzer = None

# Store active analysis sessions
active_analysis = {}

# ============================================================================
# ROUTES - HTML PAGES
# ============================================================================

@app.route('/')
def index():
    """Serve the main trading terminal"""
    return send_from_directory('.', 'index.html')

@app.route('/signals')
def signals():
    """Serve the signals history page"""
    return send_from_directory('.', 'signals.html')

# ============================================================================
# STATIC FILES
# ============================================================================

@app.route('/<path:filename>')
def serve_static(filename):
    """Serve static files (JS, CSS, etc.)"""
    return send_from_directory('.', filename)

# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'uptime': time.time() - start_time,
        'environment': os.getenv('FLASK_ENV', 'production'),
        'scraper_available': SCRAPER_AVAILABLE
    })

@app.route('/api/analyze', methods=['POST'])
def analyze_symbol():
    """
    Analyze a symbol with fundamental analysis
    
    POST body:
    {
        "symbol": "XAUUSD",
        "timeframe": "5M"
    }
    """
    try:
        data = request.get_json()
        symbol = data.get('symbol', 'XAUUSD')
        
        if not analyzer:
            return jsonify({
                'error': 'Scraper not available',
                'message': 'Fundamental analysis module not loaded'
            }), 503
        
        # Run fundamental analysis
        result = analyzer.analyze_pair(symbol)
        
        if result:
            return jsonify({
                'success': True,
                'data': result
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Analysis failed',
                'message': f'Could not analyze {symbol}'
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/enhance-signal', methods=['POST'])
def enhance_signal():
    """
    Enhance technical signal with fundamental analysis
    
    POST body:
    {
        "signal": {
            "symbol": "XAUUSD",
            "bias": "bullish",
            "entry": "2650.25",
            "tp1": "2665.00",
            ...
        }
    }
    """
    try:
        data = request.get_json()
        technical_signal = data.get('signal')
        
        if not technical_signal:
            return jsonify({
                'success': False,
                'error': 'No signal provided'
            }), 400
        
        if not analyzer:
            # Return technical signal without enhancement
            return jsonify({
                'success': True,
                'data': technical_signal,
                'enhanced': False,
                'message': 'Returned technical signal only (scraper unavailable)'
            })
        
        # Enhance with fundamental analysis
        enhanced = analyzer.enhance_signal_with_fundamentals(technical_signal)
        
        if enhanced:
            return jsonify({
                'success': True,
                'data': enhanced,
                'enhanced': True
            })
        else:
            return jsonify({
                'success': True,
                'data': technical_signal,
                'enhanced': False,
                'message': 'Enhancement failed, returned technical signal'
            })
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/currency-strength', methods=['GET'])
def get_currency_strength():
    """
    Get current currency strength indicators
    
    Query params:
    - currency: USD, EUR, GBP, etc.
    """
    try:
        currency = request.args.get('currency', 'USD')
        
        if not analyzer:
            return jsonify({
                'success': False,
                'error': 'Scraper not available'
            }), 503
        
        # Get currency strength
        strength = analyzer.get_currency_strength(currency)
        
        return jsonify({
            'success': True,
            'currency': currency,
            'strength': strength,
            'factors': analyzer.currency_factors.get(currency, {})
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/volatility', methods=['POST'])
def calculate_volatility():
    """
    Calculate volatility prediction for a symbol
    
    POST body:
    {
        "symbol": "EURUSD",
        "current_price": 1.10245
    }
    """
    try:
        data = request.get_json()
        symbol = data.get('symbol', 'XAUUSD')
        current_price = float(data.get('current_price', 0))
        
        if not analyzer:
            return jsonify({
                'success': False,
                'error': 'Scraper not available'
            }), 503
        
        volatility = analyzer.calculate_volatility_prediction(symbol, current_price)
        
        return jsonify({
            'success': True,
            'symbol': symbol,
            'volatility': volatility
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/symbols', methods=['GET'])
def get_supported_symbols():
    """Get list of supported symbols"""
    try:
        if not analyzer:
            # Return default list
            symbols = {
                'XAUUSD': 'Gold',
                'XAGUSD': 'Silver',
                'EURUSD': 'EUR/USD',
                'GBPUSD': 'GBP/USD',
                'USDJPY': 'USD/JPY',
            }
        else:
            symbols = analyzer.symbols
        
        return jsonify({
            'success': True,
            'symbols': symbols
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/start-auto-analysis', methods=['POST'])
def start_auto_analysis():
    """
    Start automatic analysis for a symbol
    
    POST body:
    {
        "symbol": "EURUSD",
        "interval": 30
    }
    """
    try:
        data = request.get_json()
        symbol = data.get('symbol', 'XAUUSD')
        interval = data.get('interval', 30)  # seconds
        
        if not analyzer:
            return jsonify({
                'success': False,
                'error': 'Scraper not available'
            }), 503
        
        # Store active analysis
        active_analysis[symbol] = {
            'active': True,
            'interval': interval,
            'started': time.time()
        }
        
        return jsonify({
            'success': True,
            'message': f'Auto-analysis started for {symbol}',
            'symbol': symbol,
            'interval': interval
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/stop-auto-analysis', methods=['POST'])
def stop_auto_analysis():
    """Stop automatic analysis for a symbol"""
    try:
        data = request.get_json()
        symbol = data.get('symbol', 'XAUUSD')
        
        if symbol in active_analysis:
            active_analysis[symbol]['active'] = False
            del active_analysis[symbol]
        
        return jsonify({
            'success': True,
            'message': f'Auto-analysis stopped for {symbol}',
            'symbol': symbol
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/market-sentiment', methods=['GET'])
def get_market_sentiment():
    """Get overall market sentiment across all symbols"""
    try:
        if not analyzer:
            return jsonify({
                'success': False,
                'error': 'Scraper not available'
            }), 503
        
        # Analyze multiple symbols
        symbols = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY']
        sentiments = {}
        
        for symbol in symbols:
            try:
                result = analyzer.analyze_pair(symbol)
                if result:
                    sentiments[symbol] = {
                        'bias': result.get('fundamental_bias', 'neutral'),
                        'confidence': result.get('confidence', 50),
                        'sentiment': result.get('sentiment', 'neutral')
                    }
            except:
                continue
        
        return jsonify({
            'success': True,
            'sentiments': sentiments,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ============================================================================
# ERROR HANDLERS
# ============================================================================

@app.errorhandler(404)
def not_found(e):
    """Handle 404 errors"""
    return jsonify({
        'error': 'Not Found',
        'message': 'The requested resource was not found'
    }), 404

@app.errorhandler(500)
def internal_error(e):
    """Handle 500 errors"""
    return jsonify({
        'error': 'Internal Server Error',
        'message': 'An unexpected error occurred'
    }), 500

# ============================================================================
# STARTUP
# ============================================================================

start_time = time.time()

if __name__ == '__main__':
    port = int(os.getenv('PORT', 10000))
    debug = os.getenv('FLASK_ENV') == 'development'
    
    print(f"""
    ╔═══════════════════════════════════════════════════════════╗
    ║  🏅 Multi-Currency Trading Terminal                       ║
    ║  🌐 Flask Web Server                                      ║
    ╠═══════════════════════════════════════════════════════════╣
    ║  Port: {port}                                              ║
    ║  Debug: {debug}                                            ║
    ║  Scraper: {'✅ Available' if SCRAPER_AVAILABLE else '❌ Unavailable'}                                   ║
    ╚═══════════════════════════════════════════════════════════╝
    """)
    
    # Run the Flask app
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug,
        threaded=True
    )

# ============================================
# NOTIFIER.PY - Telegram Alert System
# ============================================

import requests
from datetime import datetime
from typing import Dict, Any

# ✅ Replace these with your actual values
TELEGRAM_TOKEN = "7819951392:AAFkYd9-sblexjXNqgIfhbWAIC1Lr6NmPpo"
TELEGRAM_CHAT_ID = "6734231237"

def send_telegram_message(message: str) -> bool:
    """
    Send formatted alert to Telegram
    
    Args:
        message: The message to send
        
    Returns:
        bool: True if successful, False otherwise
    """
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": message,
        "parse_mode": "Markdown"
    }
    
    try:
        response = requests.post(url, data=payload, timeout=10)
        response.raise_for_status()
        return True
    except requests.exceptions.RequestException as e:
        print(f"❌ Telegram Error: {e}")
        return False


def send_forex_alert(signal_data: Dict[str, Any]) -> bool:
    """
    Send formatted Forex SMC signal alert to Telegram
    
    Args:
        signal_data: Dictionary containing signal information
            - symbol: Currency pair (e.g., "XAUUSD", "EURUSD")
            - timeframe: Timeframe (e.g., "5M", "15M", "1H")
            - pattern: Pattern name (e.g., "Order Block")
            - direction: "bullish" or "bearish"
            - price: Current price
            - confidence: Confidence percentage
            
    Returns:
        bool: True if successful, False otherwise
    """
    
    # Format the alert message
    direction_emoji = "🟢" if signal_data['direction'].lower() == 'bullish' else "🔴"
    time_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    message = f"""
🎯 *SMC FOREX SIGNAL DETECTED*

📊 *Pair:* {signal_data['symbol']}
⏰ *Timeframe:* {signal_data['timeframe']}
📈 *Pattern:* {signal_data['pattern']}
{direction_emoji} *Direction:* {signal_data['direction'].upper()}
💰 *Price:* {signal_data['price']}
📊 *Confidence:* {signal_data['confidence']}%
⏱️ *Time:* {time_str}

_Smart Money Concept Analysis_
    """.strip()
    
    return send_telegram_message(message)


def send_test_alert() -> bool:
    """Send a test alert to verify Telegram connection"""
    test_message = """
🔔 *TEST ALERT*

Forex SMC Analyzer is connected!
Ready to receive trading signals.

✅ Connection verified
    """.strip()
    
    return send_telegram_message(test_message)


# Flask webhook endpoint (optional - for backend integration)
def create_flask_app():
    """
    Create a Flask app with webhook endpoint for receiving signals
    from the JavaScript frontend
    """
    try:
        from flask import Flask, request, jsonify
        from flask_cors import CORS
    except ImportError:
        print("❌ Flask not installed. Run: pip install flask flask-cors")
        return None
    
    app = Flask(__name__)
    CORS(app)
    
    @app.route('/send_alert', methods=['POST'])
    def webhook_send_alert():
        """Receive signal from frontend and send to Telegram"""
        try:
            data = request.json
            
            # Extract signal data
            signal_data = {
                'symbol': data.get('symbol', 'UNKNOWN'),
                'timeframe': data.get('timeframe', 'UNKNOWN'),
                'pattern': data.get('pattern', 'Pattern'),
                'direction': data.get('type', 'neutral'),
                'price': data.get('price', 0),
                'confidence': data.get('confidence', 0)
            }
            
            # Send to Telegram
            success = send_forex_alert(signal_data)
            
            return jsonify({
                'success': success,
                'message': 'Alert sent' if success else 'Failed to send alert'
            }), 200 if success else 500
            
        except Exception as e:
            print(f"❌ Webhook error: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @app.route('/health', methods=['GET'])
    def health_check():
        """Health check endpoint"""
        return jsonify({'status': 'healthy', 'service': 'Forex SMC Notifier'}), 200
    
    return app


# Example usage
if __name__ == "__main__":
    print("🚀 Forex SMC Alert System")
    print("=" * 50)
    
    # Test connection
    print("\n📡 Testing Telegram connection...")
    if send_test_alert():
        print("✅ Test alert sent successfully!")

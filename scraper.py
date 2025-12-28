#!/usr/bin/env python3
"""
Multi-Currency Fundamental Analysis Scraper
Supports: Gold, Silver, and Major/Minor Forex Pairs
Collects real-time data from multiple sources to predict movements
"""

import requests
from bs4 import BeautifulSoup
import json
import time
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, db
import schedule

class MultiCurrencyAnalyzer:
    def __init__(self):
        # Initialize Firebase
        self.firebase_url = 'https://mzanzifx-default-rtdb.firebaseio.com'
        try:
            firebase_admin.get_app()
        except ValueError:
            cred = credentials.Certificate({
                "type": "service_account",
                "project_id": "mzanzifx",
                "private_key_id": "your_private_key_id",
                "private_key": "your_private_key",
                "client_email": "your_client_email",
                "client_id": "your_client_id",
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs"
            })
            firebase_admin.initialize_app(cred, {
                'databaseURL': self.firebase_url
            })
        
        self.ref = db.reference('/')
        
        # Symbol configurations
        self.symbols = {
            'XAUUSD': {'name': 'Gold', 'url': 'https://www.investing.com/commodities/gold'},
            'XAGUSD': {'name': 'Silver', 'url': 'https://www.investing.com/commodities/silver'},
            'EURUSD': {'name': 'EUR/USD', 'url': 'https://www.investing.com/currencies/eur-usd'},
            'GBPUSD': {'name': 'GBP/USD', 'url': 'https://www.investing.com/currencies/gbp-usd'},
            'USDJPY': {'name': 'USD/JPY', 'url': 'https://www.investing.com/currencies/usd-jpy'},
            'USDCHF': {'name': 'USD/CHF', 'url': 'https://www.investing.com/currencies/usd-chf'},
            'AUDUSD': {'name': 'AUD/USD', 'url': 'https://www.investing.com/currencies/aud-usd'},
            'USDCAD': {'name': 'USD/CAD', 'url': 'https://www.investing.com/currencies/usd-cad'},
            'NZDUSD': {'name': 'NZD/USD', 'url': 'https://www.investing.com/currencies/nzd-usd'},
            'EURGBP': {'name': 'EUR/GBP', 'url': 'https://www.investing.com/currencies/eur-gbp'},
            'EURJPY': {'name': 'EUR/JPY', 'url': 'https://www.investing.com/currencies/eur-jpy'},
            'GBPJPY': {'name': 'GBP/JPY', 'url': 'https://www.investing.com/currencies/gbp-jpy'}
        }
        
        # Currency factors (for major currencies)
        self.currency_factors = {
            'USD': {'weight': 0.35, 'value': 0, 'data': {}},
            'EUR': {'weight': 0.20, 'value': 0, 'data': {}},
            'GBP': {'weight': 0.15, 'value': 0, 'data': {}},
            'JPY': {'weight': 0.15, 'value': 0, 'data': {}},
            'AUD': {'weight': 0.08, 'value': 0, 'data': {}},
            'CAD': {'weight': 0.07, 'value': 0, 'data': {}}
        }
        
        # Economic factors
        self.economic_factors = {
            'INTEREST_RATES': {'weight': 0.30, 'value': 0},
            'INFLATION': {'weight': 0.25, 'value': 0},
            'GDP': {'weight': 0.20, 'value': 0},
            'EMPLOYMENT': {'weight': 0.15, 'value': 0},
            'TRADE_BALANCE': {'weight': 0.10, 'value': 0}
        }
        
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    
    def scrape_symbol_data(self, symbol):
        """Scrape data for specific symbol from Investing.com"""
        try:
            if symbol not in self.symbols:
                print(f"⚠️ Symbol {symbol} not configured")
                return None
            
            url = self.symbols[symbol]['url']
            response = requests.get(url, headers=self.headers, timeout=10)
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract price
            price_elem = soup.find('span', {'data-test': 'instrument-price-last'})
            if price_elem:
                price = float(price_elem.text.replace(',', ''))
                
                # Extract change
                change_elem = soup.find('span', {'data-test': 'instrument-price-change'})
                change = float(change_elem.text.replace(',', '')) if change_elem else 0
                
                # Extract sentiment
                sentiment_elem = soup.find('div', class_='sentiment')
                sentiment = self.parse_sentiment(sentiment_elem) if sentiment_elem else 'neutral'
                
                return {
                    'symbol': symbol,
                    'name': self.symbols[symbol]['name'],
                    'price': price,
                    'change': change,
                    'change_percent': (change / price) * 100,
                    'sentiment': sentiment,
                    'source': 'investing.com',
                    'timestamp': datetime.now().isoformat()
                }
        except Exception as e:
            print(f"❌ Error scraping {symbol}: {e}")
            return None
    
    def get_currency_strength(self, currency):
        """Get strength of individual currency"""
        try:
            # DXY for USD
            if currency == 'USD':
                url = 'https://www.investing.com/currencies/us-dollar-index'
                response = requests.get(url, headers=self.headers, timeout=10)
                soup = BeautifulSoup(response.content, 'html.parser')
                
                price_elem = soup.find('span', {'data-test': 'instrument-price-last'})
                if price_elem:
                    dxy = float(price_elem.text.replace(',', ''))
                    
                    if dxy > 105:
                        self.currency_factors['USD']['value'] = 1  # Strong
                    elif dxy < 95:
                        self.currency_factors['USD']['value'] = -1  # Weak
                    else:
                        self.currency_factors['USD']['value'] = 0  # Neutral
                    
                    self.currency_factors['USD']['data']['dxy'] = dxy
                    return dxy
            
            # For other currencies, use EUR/USD, GBP/USD etc as proxy
            if currency == 'EUR':
                symbol_data = self.scrape_symbol_data('EURUSD')
                if symbol_data:
                    change_pct = symbol_data['change_percent']
                    if change_pct > 0.5:
                        self.currency_factors['EUR']['value'] = 1
                    elif change_pct < -0.5:
                        self.currency_factors['EUR']['value'] = -1
                    else:
                        self.currency_factors['EUR']['value'] = 0
                    
                    self.currency_factors['EUR']['data'] = symbol_data
                    return symbol_data['price']
            
        except Exception as e:
            print(f"❌ Error getting {currency} strength: {e}")
            return None
    
    def analyze_pair(self, pair):
        """Analyze specific currency pair or commodity"""
        print(f"🔍 Analyzing {pair}...")
        
        # Get symbol data
        symbol_data = self.scrape_symbol_data(pair)
        
        if not symbol_data:
            return None
        
        # Determine base and quote currencies
        base_curr = pair[:3]
        quote_curr = pair[3:6]
        
        # Get currency strengths
        if pair in ['XAUUSD', 'XAGUSD']:
            # For commodities, focus on USD strength
            usd_strength = self.get_currency_strength('USD')
            
            # Strong USD = bearish for Gold/Silver
            # Weak USD = bullish for Gold/Silver
            fundamental_bias = 'bearish' if self.currency_factors['USD']['value'] > 0 else 'bullish'
            confidence = abs(self.currency_factors['USD']['value']) * 40 + 50
        
        else:
            # For forex pairs, compare base vs quote
            base_strength = self.get_currency_strength(base_curr)
            quote_strength = self.get_currency_strength(quote_curr)
            
            if base_curr in self.currency_factors and quote_curr in self.currency_factors:
                base_val = self.currency_factors[base_curr]['value']
                quote_val = self.currency_factors[quote_curr]['value']
                
                diff = base_val - quote_val
                
                if diff > 0.5:
                    fundamental_bias = 'bullish'
                    confidence = min(70 + abs(diff) * 15, 95)
                elif diff < -0.5:
                    fundamental_bias = 'bearish'
                    confidence = min(70 + abs(diff) * 15, 95)
                else:
                    fundamental_bias = 'neutral'
                    confidence = 50
            else:
                fundamental_bias = 'neutral'
                confidence = 50
        
        # Add sentiment from price action
        if symbol_data['sentiment'] == fundamental_bias:
            confidence = min(confidence + 10, 98)
        
        prediction = {
            'symbol': pair,
            'name': symbol_data['name'],
            'fundamental_bias': fundamental_bias,
            'confidence': round(confidence, 2),
            'current_price': symbol_data['price'],
            'change_percent': round(symbol_data['change_percent'], 2),
            'sentiment': symbol_data['sentiment'],
            'timestamp': datetime.now().isoformat()
        }
        
        print(f"✅ {pair} Analysis:")
        print(f"   Bias: {fundamental_bias}")
        print(f"   Confidence: {confidence}%")
        print(f"   Price: {symbol_data['price']}")
        
        return prediction
    
    def calculate_volatility_prediction(self, symbol, current_price):
        """Predict volatility for any symbol"""
        # Base volatility varies by asset class
        if symbol in ['XAUUSD', 'XAGUSD']:
            base_vol = 60  # Commodities more volatile
        elif 'JPY' in symbol:
            base_vol = 55  # JPY pairs volatile
        elif symbol in ['EURUSD', 'GBPUSD', 'USDCHF']:
            base_vol = 45  # Major pairs moderate
        else:
            base_vol = 50  # Minor pairs
        
        # Adjust based on market conditions
        volatility_score = base_vol
        
        # Check USD strength volatility
        if 'USD' in symbol:
            usd_val = self.currency_factors.get('USD', {}).get('value', 0)
            if abs(usd_val) > 0.7:
                volatility_score += 15
        
        # Calculate expected range
        volatility_percentage = volatility_score / 10
        expected_range = current_price * (volatility_percentage / 100)
        
        return {
            'volatility_score': volatility_score,
            'volatility_percentage': round(volatility_percentage, 2),
            'expected_range': round(expected_range, 5),
            'expected_high': round(current_price + expected_range, 5),
            'expected_low': round(current_price - expected_range, 5)
        }
    
    def enhance_signal_with_fundamentals(self, technical_signal):
        """Enhance technical signal with fundamental analysis"""
        if not technical_signal:
            return None
        
        symbol = technical_signal.get('symbol', 'XAUUSD')
        
        # Get fundamental prediction
        fundamental = self.analyze_pair(symbol)
        
        if not fundamental:
            return technical_signal
        
        # Calculate volatility
        current_price = float(technical_signal.get('entry', 0))
        volatility = self.calculate_volatility_prediction(symbol, current_price)
        
        # Combine technical + fundamental confidence
        technical_confidence = technical_signal.get('confidence', 50)
        fundamental_confidence = fundamental['confidence']
        
        # If both agree, boost confidence
        if technical_signal['bias'] == fundamental['fundamental_bias']:
            combined_confidence = min(
                (technical_confidence * 0.6) + (fundamental_confidence * 0.4),
                98
            )
            confluence = 'strong'
        elif fundamental['fundamental_bias'] == 'neutral':
            combined_confidence = technical_confidence * 0.9
            confluence = 'moderate'
        else:
            # Conflicting signals
            combined_confidence = technical_confidence * 0.7
            confluence = 'weak'
        
        # Adjust TP/SL based on volatility
        entry = float(technical_signal['entry'])
        tp1 = float(technical_signal['tp1'])
        tp2 = float(technical_signal['tp2'])
        tp3 = float(technical_signal['tp3'])
        sl = float(technical_signal['sl'])
        
        # Expand TP in high volatility
        if volatility['volatility_score'] > 60:
            multiplier = 1.3
            if technical_signal['bias'] == 'bullish':
                tp1 = entry + (tp1 - entry) * multiplier
                tp2 = entry + (tp2 - entry) * multiplier
                tp3 = entry + (tp3 - entry) * multiplier
            else:
                tp1 = entry - (entry - tp1) * multiplier
                tp2 = entry - (entry - tp2) * multiplier
                tp3 = entry - (entry - tp3) * multiplier
        
        # Determine precision based on symbol
        if symbol in ['XAUUSD', 'XAGUSD']:
            precision = 2
        elif 'JPY' in symbol:
            precision = 3
        else:
            precision = 5
        
        enhanced_signal = {
            **technical_signal,
            'confidence': round(combined_confidence, 2),
            'tp1': round(tp1, precision),
            'tp2': round(tp2, precision),
            'tp3': round(tp3, precision),
            'fundamental_bias': fundamental['fundamental_bias'],
            'fundamental_confidence': fundamental['confidence'],
            'confluence': confluence,
            'volatility': volatility,
            'market_sentiment': fundamental['sentiment'],
            'enhanced': True,
            'timestamp': datetime.now().isoformat()
        }
        
        return enhanced_signal
    
    def parse_sentiment(self, element):
        """Parse sentiment from HTML element"""
        if not element:
            return 'neutral'
        
        text = element.text.lower()
        
        if 'bullish' in text or 'buy' in text or 'strong buy' in text:
            return 'bullish'
        elif 'bearish' in text or 'sell' in text or 'strong sell' in text:
            return 'bearish'
        else:
            return 'neutral'
    
    def save_signal_to_firebase(self, signal):
        """Save signal to Firebase"""
        try:
            signals_ref = self.ref.child('signals')
            new_signal_ref = signals_ref.push()
            new_signal_ref.set(signal)
            
            print(f"✅ Signal saved: {signal['symbol']} - {signal['bias']} @ {signal['entry']}")
            return new_signal_ref.key
        except Exception as e:
            print(f"❌ Error saving to Firebase: {e}")
            return None
    
    def run_full_analysis(self, symbol='XAUUSD'):
        """Run complete fundamental analysis for a symbol"""
        print(f"🔍 Running fundamental analysis for {symbol}...")
        
        # Analyze the symbol
        result = self.analyze_pair(symbol)
        
        if result:
            print(f"\n✅ Analysis Complete for {symbol}:")
            print(json.dumps(result, indent=2))
        
        return result

# Main execution
if __name__ == '__main__':
    analyzer = MultiCurrencyAnalyzer()
    
    # Test with different symbols
    symbols_to_test = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY']
    
    for symbol in symbols_to_test:
        result = analyzer.run_full_analysis(symbol)
        print("\n" + "="*60 + "\n")
        time.sleep(2)  # Rate limiting

    def __init__(self):
        # Initialize Firebase
        self.firebase_url = 'https://mzanzifx-default-rtdb.firebaseio.com'
        try:
            firebase_admin.get_app()
        except ValueError:
            cred = credentials.Certificate({
                "type": "service_account",
                "project_id": "mzanzifx",
                "private_key_id": "your_private_key_id",
                "private_key": "your_private_key",
                "client_email": "your_client_email",
                "client_id": "your_client_id",
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs"
            })
            firebase_admin.initialize_app(cred, {
                'databaseURL': self.firebase_url
            })
        
        self.ref = db.reference('/')
        
        # Data sources
        self.sources = {
            'investing': 'https://www.investing.com/commodities/gold',
            'cnbc': 'https://www.cnbc.com/quotes/GC.1',
            'marketwatch': 'https://www.marketwatch.com/investing/future/gc00',
            'tradingeconomics': 'https://tradingeconomics.com/commodity/gold'
        }
        
        # Major factors affecting Gold
        self.factors = {
            'USD': {'weight': 0.30, 'value': 0},  # US Dollar Index
            'DXY': {'weight': 0.25, 'value': 0},  # Dollar Index
            'YIELDS': {'weight': 0.20, 'value': 0},  # 10Y Treasury Yields
            'INFLATION': {'weight': 0.15, 'value': 0},  # Inflation data
            'GEOPOLITICAL': {'weight': 0.10, 'value': 0}  # Risk events
        }
        
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    
    def scrape_investing_com(self):
        """Scrape Gold data from Investing.com"""
        try:
            url = self.sources['investing']
            response = requests.get(url, headers=self.headers, timeout=10)
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract price
            price_elem = soup.find('span', {'data-test': 'instrument-price-last'})
            if price_elem:
                price = float(price_elem.text.replace(',', ''))
                
                # Extract change
                change_elem = soup.find('span', {'data-test': 'instrument-price-change'})
                change = float(change_elem.text.replace(',', '')) if change_elem else 0
                
                # Extract sentiment indicators
                sentiment_elem = soup.find('div', class_='sentiment')
                sentiment = self.parse_sentiment(sentiment_elem) if sentiment_elem else 'neutral'
                
                return {
                    'price': price,
                    'change': change,
                    'change_percent': (change / price) * 100,
                    'sentiment': sentiment,
                    'source': 'investing.com',
                    'timestamp': datetime.now().isoformat()
                }
        except Exception as e:
            print(f"❌ Error scraping Investing.com: {e}")
            return None
    
    def scrape_cnbc(self):
        """Scrape Gold data from CNBC"""
        try:
            url = self.sources['cnbc']
            response = requests.get(url, headers=self.headers, timeout=10)
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract key data points
            price_elem = soup.find('span', class_='QuoteStrip-lastPrice')
            if price_elem:
                price = float(price_elem.text.replace(',', '').replace('$', ''))
                
                # News sentiment
                news_items = soup.find_all('div', class_='Card-title')
                news_sentiment = self.analyze_news_sentiment(news_items)
                
                return {
                    'price': price,
                    'news_sentiment': news_sentiment,
                    'source': 'cnbc.com',
                    'timestamp': datetime.now().isoformat()
                }
        except Exception as e:
            print(f"❌ Error scraping CNBC: {e}")
            return None
    
    def get_usd_strength(self):
        """Get US Dollar Index (DXY) strength"""
        try:
            url = 'https://www.investing.com/currencies/us-dollar-index'
            response = requests.get(url, headers=self.headers, timeout=10)
            soup = BeautifulSoup(response.content, 'html.parser')
            
            price_elem = soup.find('span', {'data-test': 'instrument-price-last'})
            if price_elem:
                dxy = float(price_elem.text.replace(',', ''))
                
                # Strong USD = bearish for Gold
                # Weak USD = bullish for Gold
                if dxy > 105:
                    self.factors['USD']['value'] = -1  # Bearish
                elif dxy < 95:
                    self.factors['USD']['value'] = 1   # Bullish
                else:
                    self.factors['USD']['value'] = 0   # Neutral
                
                return dxy
        except Exception as e:
            print(f"❌ Error getting USD strength: {e}")
            return None
    
    def get_treasury_yields(self):
        """Get 10-Year Treasury Yields"""
        try:
            url = 'https://www.cnbc.com/quotes/US10Y'
            response = requests.get(url, headers=self.headers, timeout=10)
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Higher yields = bearish for Gold
            # Lower yields = bullish for Gold
            price_elem = soup.find('span', class_='QuoteStrip-lastPrice')
            if price_elem:
                yields = float(price_elem.text.replace('%', ''))
                
                if yields > 4.5:
                    self.factors['YIELDS']['value'] = -1
                elif yields < 3.5:
                    self.factors['YIELDS']['value'] = 1
                else:
                    self.factors['YIELDS']['value'] = 0
                
                return yields
        except Exception as e:
            print(f"❌ Error getting Treasury yields: {e}")
            return None
    
    def parse_sentiment(self, element):
        """Parse sentiment from HTML element"""
        if not element:
            return 'neutral'
        
        text = element.text.lower()
        
        if 'bullish' in text or 'buy' in text or 'strong buy' in text:
            return 'bullish'
        elif 'bearish' in text or 'sell' in text or 'strong sell' in text:
            return 'bearish'
        else:
            return 'neutral'
    
    def analyze_news_sentiment(self, news_items):
        """Analyze sentiment from news headlines"""
        if not news_items:
            return 'neutral'
        
        bullish_keywords = ['rise', 'up', 'gain', 'higher', 'rally', 'surge', 'climb', 'jump', 'boost']
        bearish_keywords = ['fall', 'down', 'drop', 'lower', 'decline', 'plunge', 'slide', 'sink', 'tumble']
        
        bullish_count = 0
        bearish_count = 0
        
        for item in news_items[:5]:  # Check top 5 headlines
            text = item.text.lower()
            
            for keyword in bullish_keywords:
                if keyword in text:
                    bullish_count += 1
            
            for keyword in bearish_keywords:
                if keyword in text:
                    bearish_count += 1
        
        if bullish_count > bearish_count:
            return 'bullish'
        elif bearish_count > bullish_count:
            return 'bearish'
        else:
            return 'neutral'
    
    def calculate_fundamental_score(self):
        """Calculate overall fundamental score for Gold"""
        score = 0
        
        for factor, data in self.factors.items():
            score += data['value'] * data['weight']
        
        # Convert to 0-100 scale
        normalized_score = ((score + 1) / 2) * 100
        
        return round(normalized_score, 2)
    
    def predict_movement(self):
        """Predict Gold movement based on fundamental data"""
        score = self.calculate_fundamental_score()
        
        if score > 65:
            bias = 'bullish'
            confidence = min(score, 95)
        elif score < 35:
            bias = 'bearish'
            confidence = min(100 - score, 95)
        else:
            bias = 'neutral'
            confidence = 50
        
        return {
            'bias': bias,
            'confidence': round(confidence, 2),
            'score': score,
            'factors': self.factors
        }
    
    def calculate_volatility_prediction(self, current_price):
        """Predict volatility based on market conditions"""
        # Get recent volatility indicators
        volatility_score = 50  # Base volatility
        
        # High USD strength increases volatility
        if abs(self.factors['USD']['value']) > 0.5:
            volatility_score += 15
        
        # High yields increase volatility
        if abs(self.factors['YIELDS']['value']) > 0.5:
            volatility_score += 10
        
        # Calculate expected price range
        volatility_percentage = volatility_score / 10  # Convert to percentage
        expected_range = current_price * (volatility_percentage / 100)
        
        return {
            'volatility_score': volatility_score,
            'volatility_percentage': round(volatility_percentage, 2),
            'expected_range': round(expected_range, 2),
            'expected_high': round(current_price + expected_range, 2),
            'expected_low': round(current_price - expected_range, 2)
        }
    
    def enhance_signal_with_fundamentals(self, technical_signal):
        """Enhance technical signal with fundamental analysis"""
        if not technical_signal:
            return None
        
        # Get fundamental prediction
        fundamental = self.predict_movement()
        
        # Calculate volatility
        current_price = float(technical_signal.get('entry', 2650))
        volatility = self.calculate_volatility_prediction(current_price)
        
        # Combine technical + fundamental confidence
        technical_confidence = technical_signal.get('confidence', 50)
        fundamental_confidence = fundamental['confidence']
        
        # If both agree, boost confidence
        if technical_signal['bias'] == fundamental['bias']:
            combined_confidence = min(
                (technical_confidence * 0.6) + (fundamental_confidence * 0.4),
                98
            )
            confluence = 'strong'
        elif fundamental['bias'] == 'neutral':
            combined_confidence = technical_confidence * 0.9
            confluence = 'moderate'
        else:
            # Conflicting signals - reduce confidence
            combined_confidence = technical_confidence * 0.7
            confluence = 'weak'
        
        # Adjust TP/SL based on volatility
        entry = float(technical_signal['entry'])
        tp1 = float(technical_signal['tp1'])
        tp2 = float(technical_signal['tp2'])
        tp3 = float(technical_signal['tp3'])
        sl = float(technical_signal['sl'])
        
        # Expand TP in high volatility
        if volatility['volatility_score'] > 60:
            tp1 = entry + (tp1 - entry) * 1.2
            tp2 = entry + (tp2 - entry) * 1.3
            tp3 = entry + (tp3 - entry) * 1.4
        
        enhanced_signal = {
            **technical_signal,
            'confidence': round(combined_confidence, 2),
            'tp1': round(tp1, 2),
            'tp2': round(tp2, 2),
            'tp3': round(tp3, 2),
            'fundamental_bias': fundamental['bias'],
            'fundamental_score': fundamental['score'],
            'confluence': confluence,
            'volatility': volatility,
            'factors': fundamental['factors'],
            'enhanced': True,
            'timestamp': datetime.now().isoformat()
        }
        
        return enhanced_signal
    
    def save_signal_to_firebase(self, signal):
        """Save signal to Firebase"""
        try:
            signals_ref = self.ref.child('signals')
            
            # Add signal
            new_signal_ref = signals_ref.push()
            new_signal_ref.set(signal)
            
            print(f"✅ Signal saved to Firebase: {signal['bias']} @ {signal['entry']}")
            return new_signal_ref.key
        except Exception as e:
            print(f"❌ Error saving to Firebase: {e}")
            return None
    
    def get_signals_from_firebase(self, days=7):
        """Retrieve signals from Firebase"""
        try:
            signals_ref = self.ref.child('signals')
            signals = signals_ref.get()
            
            if not signals:
                return []
            
            # Convert to list and sort by timestamp
            signal_list = []
            for key, signal in signals.items():
                signal['id'] = key
                signal_list.append(signal)
            
            signal_list.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
            
            return signal_list
        except Exception as e:
            print(f"❌ Error retrieving signals: {e}")
            return []
    
    def delete_signal_from_firebase(self, signal_id):
        """Delete signal from Firebase"""
        try:
            signal_ref = self.ref.child(f'signals/{signal_id}')
            signal_ref.delete()
            print(f"✅ Signal {signal_id} deleted")
            return True
        except Exception as e:
            print(f"❌ Error deleting signal: {e}")
            return False
    
    def run_full_analysis(self):
        """Run complete fundamental analysis"""
        print("🔍 Running fundamental analysis...")
        
        # Scrape data from sources
        investing_data = self.scrape_investing_com()
        cnbc_data = self.scrape_cnbc()
        
        # Get USD and yields data
        usd_strength = self.get_usd_strength()
        treasury_yields = self.get_treasury_yields()
        
        # Get prediction
        prediction = self.predict_movement()
        
        print(f"📊 Fundamental Analysis Complete:")
        print(f"   Bias: {prediction['bias']}")
        print(f"   Confidence: {prediction['confidence']}%")
        print(f"   Score: {prediction['score']}/100")
        
        if investing_data:
            print(f"   Current Price: ${investing_data['price']}")
            print(f"   Change: {investing_data['change_percent']:.2f}%")
        
        return prediction

# Main execution
if __name__ == '__main__':
    analyzer = GoldFundamentalAnalyzer()
    
    # Run analysis
    result = analyzer.run_full_analysis()
    
    print("\n✅ Analysis complete!")
    print(json.dumps(result, indent=2))

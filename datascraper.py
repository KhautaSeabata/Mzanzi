#!/usr/bin/env python3
"""
MzanziFX Data Scraper
Scrapes real-time data for US100, US30, and GER40 indices
"""

import requests
import json
from datetime import datetime
import time
import firebase_admin
from firebase_admin import credentials, db
from bs4 import BeautifulSoup
import yfinance as yf

# Firebase configuration
FIREBASE_URL = "https://mzanzifx-default-rtdb.firebaseio.com"

# Initialize Firebase (no credentials needed for public database)
try:
    firebase_admin.initialize_app(options={
        'databaseURL': FIREBASE_URL
    })
except:
    pass  # Already initialized

# Index symbols mapping
INDEX_SYMBOLS = {
    'US100': '^NDX',  # NASDAQ-100
    'US30': '^DJI',   # Dow Jones Industrial Average
    'GER40': '^GDAXI' # DAX 40
}

# Top companies for each index
TOP_COMPANIES = {
    'US100': ['AAPL', 'MSFT', 'AMZN', 'NVDA', 'GOOGL', 'META', 'TSLA', 'AVGO', 'COST', 'NFLX'],
    'US30': ['UNH', 'GS', 'MSFT', 'HD', 'CRM', 'V', 'MCD', 'BA', 'CAT', 'AAPL'],
    'GER40': ['SAP.DE', 'SIE.DE', 'ALV.DE', 'AIR.PA', 'BAS.DE', 'VOW3.DE', 'DTE.DE', 'BMW.DE', 'BAYN.DE', 'DBK.DE']
}


def scrape_index_data(index_name):
    """
    Scrape real-time data for a specific index
    """
    try:
        symbol = INDEX_SYMBOLS[index_name]
        ticker = yf.Ticker(symbol)
        
        # Get real-time data
        info = ticker.info
        hist = ticker.history(period='1d', interval='1m')
        
        if hist.empty:
            print(f"No data available for {index_name}")
            return None
        
        current_price = hist['Close'].iloc[-1]
        open_price = hist['Open'].iloc[0]
        high_price = hist['High'].max()
        low_price = hist['Low'].min()
        volume = hist['Volume'].sum()
        
        # Calculate change
        change = current_price - open_price
        change_percent = (change / open_price) * 100
        
        data = {
            'index': index_name,
            'symbol': symbol,
            'current_price': round(current_price, 2),
            'open': round(open_price, 2),
            'high': round(high_price, 2),
            'low': round(low_price, 2),
            'change': round(change, 2),
            'change_percent': round(change_percent, 2),
            'volume': int(volume),
            'timestamp': datetime.now().isoformat(),
            'price_history': hist['Close'].tolist()[-30:]  # Last 30 data points
        }
        
        print(f"✓ Scraped {index_name}: ${current_price:.2f} ({change_percent:+.2f}%)")
        return data
        
    except Exception as e:
        print(f"✗ Error scraping {index_name}: {str(e)}")
        return None


def scrape_company_data(index_name):
    """
    Scrape data for top companies in an index
    """
    companies_data = []
    symbols = TOP_COMPANIES.get(index_name, [])
    
    print(f"\nScraping top {len(symbols)} companies for {index_name}...")
    
    for symbol in symbols:
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            hist = ticker.history(period='1d')
            
            if hist.empty:
                continue
            
            current_price = hist['Close'].iloc[-1]
            open_price = hist['Open'].iloc[0]
            change = current_price - open_price
            change_percent = (change / open_price) * 100
            
            company_data = {
                'symbol': symbol,
                'name': info.get('longName', symbol),
                'current_price': round(current_price, 2),
                'change': round(change, 2),
                'change_percent': round(change_percent, 2),
                'volume': info.get('volume', 0),
                'market_cap': info.get('marketCap', 0),
                'timestamp': datetime.now().isoformat()
            }
            
            companies_data.append(company_data)
            print(f"  ✓ {company_data['name']}: ${current_price:.2f} ({change_percent:+.2f}%)")
            
        except Exception as e:
            print(f"  ✗ Error scraping {symbol}: {str(e)}")
            continue
    
    return companies_data


def calculate_volatility(price_history):
    """
    Calculate volatility from price history
    Returns: VH (Very High), H (High), M (Medium), L (Low)
    """
    if len(price_history) < 2:
        return 'L'
    
    # Calculate returns
    returns = []
    for i in range(1, len(price_history)):
        ret = (price_history[i] - price_history[i-1]) / price_history[i-1]
        returns.append(ret)
    
    # Calculate standard deviation
    import statistics
    std_dev = statistics.stdev(returns) * 100
    
    if std_dev > 0.5:
        return 'VH'
    elif std_dev > 0.3:
        return 'H'
    elif std_dev > 0.15:
        return 'M'
    else:
        return 'L'


def analyze_and_generate_signal(index_name, index_data, companies_data):
    """
    Analyze data and generate trading signal
    """
    print(f"\n📊 Analyzing {index_name}...")
    
    current_price = index_data['current_price']
    price_history = index_data['price_history']
    
    # Calculate volatility
    volatility = calculate_volatility(price_history)
    
    # Analyze company sentiment
    bullish_count = sum(1 for c in companies_data if c['change_percent'] > 0)
    bearish_count = len(companies_data) - bullish_count
    
    # Determine direction
    if bullish_count > len(companies_data) / 2:
        direction = 'BUY'
        sentiment = 'Bullish'
    else:
        direction = 'SELL'
        sentiment = 'Bearish'
    
    # Calculate volatility multiplier
    volatility_multiplier = {
        'VH': 2.5,
        'H': 2.0,
        'M': 1.5,
        'L': 1.0
    }[volatility]
    
    # Calculate signal parameters
    base_movement = current_price * 0.003 * volatility_multiplier
    
    if direction == 'BUY':
        entry = current_price - (base_movement * 0.2)
        tp1 = entry + base_movement
        tp2 = entry + (base_movement * 1.5)
        sl = entry - (base_movement * 0.6)
        expected_pips = int((tp1 - entry) * 10)
    else:
        entry = current_price + (base_movement * 0.2)
        tp1 = entry - base_movement
        tp2 = entry - (base_movement * 1.5)
        sl = entry + (base_movement * 0.6)
        expected_pips = int((entry - tp1) * 10)
    
    # Create signal
    signal = {
        'index': index_name,
        'timestamp': datetime.now().isoformat(),
        'direction': direction,
        'sentiment': sentiment,
        'current_price': round(current_price, 2),
        'entry': round(entry, 2),
        'tp1': round(tp1, 2),
        'tp2': round(tp2, 2),
        'sl': round(sl, 2),
        'volatility': volatility,
        'expected_pips': expected_pips,
        'bullish_companies': bullish_count,
        'bearish_companies': bearish_count,
        'total_companies': len(companies_data),
        'confidence': round((max(bullish_count, bearish_count) / len(companies_data)) * 100, 1)
    }
    
    print(f"✓ Signal Generated:")
    print(f"  Direction: {direction}")
    print(f"  Entry: {entry:.2f}")
    print(f"  TP1: {tp1:.2f} | TP2: {tp2:.2f}")
    print(f"  SL: {sl:.2f}")
    print(f"  Volatility: {volatility}")
    print(f"  Expected Pips: {expected_pips}")
    print(f"  Confidence: {signal['confidence']}%")
    
    return signal


def save_to_firebase(path, data):
    """
    Save data to Firebase Realtime Database
    """
    try:
        ref = db.reference(path)
        ref.push(data)
        print(f"✓ Data saved to Firebase: {path}")
        return True
    except Exception as e:
        print(f"✗ Error saving to Firebase: {str(e)}")
        return False


def main():
    """
    Main scraper function
    """
    print("=" * 60)
    print("MzanziFX Data Scraper")
    print("=" * 60)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    # Loop through all indices
    for index_name in INDEX_SYMBOLS.keys():
        print(f"\n{'='*60}")
        print(f"Processing {index_name}")
        print(f"{'='*60}")
        
        # Scrape index data
        index_data = scrape_index_data(index_name)
        if not index_data:
            continue
        
        # Scrape company data
        companies_data = scrape_company_data(index_name)
        if not companies_data:
            print(f"✗ No company data available for {index_name}")
            continue
        
        # Generate signal
        signal = analyze_and_generate_signal(index_name, index_data, companies_data)
        
        # Save to Firebase
        save_to_firebase('signals', signal)
        save_to_firebase(f'indices/{index_name}', index_data)
        save_to_firebase(f'companies/{index_name}', {
            'timestamp': datetime.now().isoformat(),
            'companies': companies_data
        })
        
        print(f"\n✓ {index_name} processing complete")
        time.sleep(2)  # Rate limiting
    
    print("\n" + "=" * 60)
    print("Scraping complete!")
    print("=" * 60)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nScraper stopped by user")
    except Exception as e:
        print(f"\n✗ Fatal error: {str(e)}")

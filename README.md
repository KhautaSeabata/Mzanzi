# MzanziFX Signal Generator

Real-time trading signal generator for US100 (NASDAQ-100), US30 (Dow Jones), and GER40 (DAX) indices with live data scraping, analysis, and Firebase integration.

## Features

- 📊 **Live Charts** - Real-time price charts for all three indices
- 🔍 **Data Scraping** - Automated scraping of top 10 companies affecting each index
- 🤖 **AI Analysis** - Intelligent signal generation based on market data
- 📈 **Volatility Analysis** - VH, H, M, L volatility classification
- 🎯 **Signal Generation** - Entry, TP1, TP2, SL, and expected pips calculations
- 💾 **Firebase Integration** - Real-time database storage and historical tracking
- 📊 **Analytics Dashboard** - Advanced performance metrics and visualization

## Files

- `index.html` - Main dashboard with live charts and signal generation
- `data-analyzer.html` - Advanced analytics and performance metrics
- `datascraper.py` - Python script for scraping and analyzing market data
- `vercel.json` - Vercel deployment configuration
- `requirements.txt` - Python dependencies
- `package.json` - Project metadata

## Quick Start

### Local Development

1. **Open the HTML files directly in your browser:**
   ```bash
   # Open index.html in your browser
   open index.html
   
   # Or for data analyzer
   open data-analyzer.html
   ```

2. **Run the Python scraper (requires Python 3.7+):**
   ```bash
   # Install dependencies
   pip install -r requirements.txt
   
   # Run the scraper
   python datascraper.py
   ```

### Deploy to Vercel

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel
   ```

3. **Follow the prompts:**
   - Link to existing project or create new one
   - Select your preferred settings
   - Deploy!

### Alternative: Deploy via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your Git repository (or upload files)
4. Vercel will auto-detect the configuration from `vercel.json`
5. Click "Deploy"

## Firebase Configuration

The app is pre-configured to use:
```
https://mzanzifx-default-rtdb.firebaseio.com
```

### Data Structure

```
/signals
  /{signalId}
    - index: "US100" | "US30" | "GER40"
    - timestamp: ISO timestamp
    - direction: "BUY" | "SELL"
    - entry: number
    - tp1: number
    - tp2: number
    - sl: number
    - volatility: "VH" | "H" | "M" | "L"
    - expected_pips: number
    - bullish_companies: number
    - total_companies: number

/indices
  /{indexName}
    - current_price: number
    - change_percent: number
    - price_history: array

/companies
  /{indexName}
    - companies: array of company data
```

## How It Works

### 1. Data Collection
The `datascraper.py` script:
- Fetches real-time data from Yahoo Finance
- Scrapes top 10 companies for each index
- Calculates price movements and volatility

### 2. Signal Generation
The app analyzes:
- Current price trends
- Company sentiment (bullish/bearish count)
- Historical volatility
- Price movements

### 3. Signal Parameters
- **Entry**: Calculated based on current price and volatility
- **TP1/TP2**: Target profit levels (1x and 1.5x expected movement)
- **SL**: Stop loss (0.6x movement in opposite direction)
- **Volatility**: VH (>0.5%), H (>0.3%), M (>0.15%), L (<0.15%)
- **Expected Pips**: Based on entry to TP1 distance

### 4. Storage
All signals are stored in Firebase Realtime Database for:
- Historical tracking
- Performance analysis
- Signal accuracy monitoring

## API Endpoints (When Deployed)

- `/` - Main dashboard
- `/analyzer` - Analytics dashboard
- `/api/scrape` - Trigger data scraping (Python script)

## Environment Variables

No environment variables required! The app uses a public Firebase database.

For production, you may want to:
1. Create your own Firebase project
2. Update the `databaseURL` in both HTML files
3. Configure Firebase security rules

## Customization

### Change Firebase Database
Update the `databaseURL` in:
- `index.html` (line ~290)
- `data-analyzer.html` (line ~390)
- `datascraper.py` (line ~20)

### Modify Signal Parameters
Edit the signal generation logic in:
- `index.html` - Function `generateSignal()`
- `datascraper.py` - Function `analyze_and_generate_signal()`

### Add More Indices
1. Add symbol to `INDEX_SYMBOLS` in `datascraper.py`
2. Add company list to `TOP_COMPANIES`
3. Add button in `index.html`

## Technologies Used

- **Frontend**: HTML5, CSS3, JavaScript
- **Charts**: Chart.js
- **Database**: Firebase Realtime Database
- **Backend**: Python 3
- **Data Source**: Yahoo Finance (via yfinance)
- **Hosting**: Vercel

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Performance

- Real-time updates every 30 seconds
- Firebase real-time synchronization
- Optimized chart rendering
- Responsive design for mobile/tablet

## Security Notes

⚠️ **Important**: This setup uses a public Firebase database. For production:

1. Enable Firebase Authentication
2. Set up security rules
3. Use environment variables for sensitive data
4. Implement rate limiting

## Support

For issues or questions:
1. Check Firebase connection status in the dashboard
2. Verify Python dependencies are installed
3. Check browser console for errors
4. Ensure Firebase URL is correct

## License

MIT License - Feel free to use and modify for your trading needs!

## Disclaimer

⚠️ **Trading Disclaimer**: This tool is for educational purposes only. Trading involves risk. Past performance does not guarantee future results. Always do your own research and consult with a financial advisor before making trading decisions.

---

**Happy Trading! 📈💰**

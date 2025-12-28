# Multi-Currency Trading Terminal 📊

Advanced SMC (Smart Money Concepts) Trading Terminal with support for Gold, Silver, and 25 Forex pairs.

## Features ✨

- **27 Trading Pairs**: Gold, Silver, Major & Minor Forex pairs
- **Smart Money Concepts**: Order Blocks, FVGs, Break of Structure, Liquidity Zones
- **Real-time Data**: Live WebSocket connection via Deriv API
- **Signal Generation**: AI-powered technical + fundamental analysis
- **Signal History**: Complete signal management with Firebase integration
- **Auto-Analysis**: Continuous monitoring and signal detection
- **Web Scraping**: Fundamental analysis from Investing.com and CNBC
- **Responsive Design**: Works on desktop and mobile

## Tech Stack 🛠️

**Frontend:**
- Pure JavaScript (Vanilla JS)
- HTML5 Canvas for charting
- CSS3 with modern styling
- WebSocket for real-time data

**Backend:**
- Node.js + Express
- Python (for web scraping)
- Firebase Realtime Database

**APIs:**
- Deriv WebSocket API
- Firebase REST API
- Investing.com (scraping)
- CNBC (scraping)

## Deployment on Render 🚀

### Step 1: Prepare Your Repository

1. **Create a GitHub repository:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Multi-currency trading terminal"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

### Step 2: Deploy on Render

1. **Go to Render Dashboard:**
   - Visit [https://render.com](https://render.com)
   - Sign up or log in
   - Click "New +" → "Web Service"

2. **Connect GitHub:**
   - Select your repository
   - Click "Connect"

3. **Configure Service:**
   ```
   Name: mzanzifx-trading-terminal
   Region: Choose closest to your users
   Branch: main
   Runtime: Node
   Build Command: npm install
   Start Command: npm start
   ```

4. **Set Environment Variables:**
   ```
   NODE_ENV=production
   PORT=10000
   FIREBASE_DATABASE_URL=https://mzanzifx-default-rtdb.firebaseio.com
   ```

5. **Advanced Settings:**
   - Instance Type: Free (or Starter for better performance)
   - Auto-Deploy: Yes
   - Health Check Path: /health

6. **Click "Create Web Service"**

### Step 3: Wait for Deployment

- Render will automatically:
  - Install dependencies (`npm install`)
  - Build the application
  - Start the server
  - Provide a URL like: `https://mzanzifx-trading-terminal.onrender.com`

### Step 4: Configure Firebase (Optional)

If using Firebase Admin SDK for the Python scraper:

1. **Get Firebase credentials:**
   - Go to Firebase Console
   - Project Settings → Service Accounts
   - Generate new private key
   - Download JSON file

2. **Add to Render:**
   - Go to Environment tab
   - Add environment variable:
   ```
   FIREBASE_SERVICE_ACCOUNT=<paste entire JSON content>
   ```

### Step 5: Deploy Python Scraper (Separate Service)

For the web scraper, create a second Render service:

1. **Create new Background Worker:**
   - New + → Background Worker
   - Connect same repository
   - Runtime: Python 3
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `python scraper.py`

2. **Environment Variables:**
   ```
   FIREBASE_DATABASE_URL=https://mzanzifx-default-rtdb.firebaseio.com
   FIREBASE_SERVICE_ACCOUNT=<JSON credentials>
   ```

## Local Development 💻

### Prerequisites

- Node.js 18+ 
- Python 3.9+
- npm or yarn

### Setup

1. **Clone repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
   cd YOUR_REPO
   ```

2. **Install Node dependencies:**
   ```bash
   npm install
   ```

3. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Create .env file:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Start development server:**
   ```bash
   npm run dev
   ```

6. **Run Python scraper (separate terminal):**
   ```bash
   python scraper.py
   ```

7. **Open browser:**
   ```
   http://localhost:3000
   ```

## Project Structure 📁

```
├── index.html              # Main trading terminal
├── signals.html            # Signal history page
├── data.js                 # Chart data & WebSocket logic
├── smc.js                  # SMC analysis engine
├── scraper.py              # Python web scraper
├── server.js               # Express server
├── package.json            # Node dependencies
├── requirements.txt        # Python dependencies
├── .env.example            # Environment template
├── .gitignore              # Git ignore rules
└── README.md               # This file
```

## Usage 📖

### Generate Signals

1. **Select Symbol**: Choose from dropdown (Gold, EUR/USD, etc.)
2. **Click ⚡ Generate Signal**: Analyzes current chart
3. **View Signal**: Shows entry, TP levels, SL, confidence
4. **Auto-Save**: Signal saved to Firebase automatically

### Auto-Analysis

1. **Click 🔄 Auto-Analyze**: Starts continuous monitoring
2. **Every 30 seconds**: Analyzes current symbol
3. **Auto-Alert**: Signals appear when detected (≥70% confidence)
4. **Click again to stop**

### View History

1. **Click 📋 Signal History**: Opens signals page
2. **Filter**: All, Bullish, Bearish, Active, Closed
3. **Date Range**: Select from/to dates
4. **Actions**: Close, View Chart, Delete

### Change Timeframes

- M1, M5, M15, M30, H1, H4, D1
- Click any timeframe button
- Chart reloads with new data

## Firebase Setup 🔥

1. **Create Firebase Project:**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Create new project
   - Enable Realtime Database

2. **Configure Rules:**
   ```json
   {
     "rules": {
       "signals": {
         ".read": true,
         ".write": true
       }
     }
   }
   ```

3. **Get Database URL:**
   - Database tab → Copy URL
   - Add to .env file

## API Endpoints 🔌

### Health Check
```
GET /health
Response: { status: "healthy", timestamp: "...", uptime: 123 }
```

### Generate Signal (Optional)
```
POST /api/generate-signal
Body: { "symbol": "EURUSD", "timeframe": "5M" }
Response: { success: true, message: "..." }
```

## Environment Variables 🔐

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment (production/development) | Yes |
| `PORT` | Server port (default: 3000) | No |
| `FIREBASE_DATABASE_URL` | Firebase Realtime DB URL | Yes |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase admin credentials (JSON) | No* |

*Required only for Python scraper with Firebase Admin

## Troubleshooting 🔧

### WebSocket Connection Issues
- Check Deriv API status
- Verify firewall allows WebSocket connections
- Try different browser

### Firebase Errors
- Verify database rules allow read/write
- Check database URL is correct
- Ensure proper authentication

### Render Deployment Fails
- Check build logs for errors
- Verify all dependencies in package.json
- Ensure Node version ≥18

### Python Scraper Issues
- Some websites block scraping
- Add delays between requests
- Use rotating user agents
- Check rate limits

## Performance Tips ⚡

1. **Free Tier Limitations:**
   - Render free tier sleeps after 15 min inactivity
   - First request after sleep takes ~30 seconds
   - Consider paid tier for 24/7 uptime

2. **Optimize:**
   - Enable compression (already configured)
   - Use CDN for static assets
   - Minimize WebSocket reconnections

3. **Monitoring:**
   - Use Render metrics dashboard
   - Monitor /health endpoint
   - Set up uptime monitoring (UptimeRobot)

## Support & Contact 📧

- GitHub Issues: [Create Issue](https://github.com/YOUR_USERNAME/YOUR_REPO/issues)
- Email: support@mzanzifx.com
- Website: https://mzanzifx.com

## License 📄

MIT License - See LICENSE file for details

## Credits 👏

- **Deriv API**: Real-time market data
- **Firebase**: Signal storage
- **Investing.com**: Fundamental data
- **SMC Community**: Trading concepts

---

Built with ❤️ by MzanziFX Team

**Happy Trading! 📈💰**

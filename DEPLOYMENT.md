# Quick Deployment Guide for Render 🚀

## Option 1: One-Click Deploy (Fastest) ⚡

1. **Fork this repository** to your GitHub account

2. **Click this button** (after updating your repo URL):
   
   [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/YOUR_USERNAME/YOUR_REPO)

3. **Fill in environment variables:**
   - `FIREBASE_DATABASE_URL`: Your Firebase Realtime Database URL
   
4. **Click "Create Web Service"**

5. **Done!** Your app will be live at `https://your-service.onrender.com`

---

## Option 2: Manual Deploy (More Control) 🛠️

### Step 1: Push to GitHub

```bash
# Initialize git (if not already)
git init
git add .
git commit -m "Initial commit"

# Add remote and push
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

### Step 2: Create Web Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Render auto-detects settings from `render.yaml`

### Step 3: Configure

**Detected Settings:**
```
Name: mzanzifx-trading-terminal
Runtime: Node
Build Command: npm install
Start Command: npm start
```

**Add Environment Variables:**
```
NODE_ENV=production
PORT=10000
FIREBASE_DATABASE_URL=https://mzanzifx-default-rtdb.firebaseio.com
```

### Step 4: Deploy

Click **"Create Web Service"**

Render will:
- ✅ Clone your repository
- ✅ Install dependencies
- ✅ Build the application
- ✅ Start the server
- ✅ Provide a live URL

**Deployment time:** ~2-3 minutes

---

## Option 3: CLI Deploy (For Developers) 💻

### Install Render CLI

```bash
brew install render  # macOS
# or
curl -s https://render.com/cli/install | bash  # Linux/macOS
```

### Login

```bash
render login
```

### Create Service

```bash
render services create \
  --name mzanzifx-trading-terminal \
  --type web \
  --runtime node \
  --build-command "npm install" \
  --start-command "npm start" \
  --plan free
```

### Set Environment Variables

```bash
render env set NODE_ENV=production
render env set FIREBASE_DATABASE_URL=https://mzanzifx-default-rtdb.firebaseio.com
```

### Deploy

```bash
render deploy
```

---

## Verify Deployment ✅

### 1. Check Health Endpoint

```bash
curl https://your-service.onrender.com/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-12-29T...",
  "uptime": 123,
  "environment": "production"
}
```

### 2. Test Main Page

Open in browser:
```
https://your-service.onrender.com
```

Should see: **Trading Terminal** with live chart

### 3. Test Signal History

```
https://your-service.onrender.com/signals
```

Should see: **Signal History** page

---

## Custom Domain (Optional) 🌐

### Add Your Domain

1. Go to your service settings
2. Click **"Custom Domains"**
3. Click **"Add Custom Domain"**
4. Enter: `trading.yourdomain.com`
5. Add CNAME record to your DNS:
   ```
   CNAME trading your-service.onrender.com
   ```
6. Wait for SSL certificate (automatic)

---

## Python Scraper Deployment (Optional) 🐍

### Deploy as Background Worker

1. **Uncomment** the worker section in `render.yaml`

2. **Add Firebase credentials** to Render:
   - Go to Environment tab
   - Add variable: `FIREBASE_SERVICE_ACCOUNT`
   - Paste your Firebase service account JSON

3. **Redeploy** (Render auto-detects worker)

4. **Monitor** in Render logs

---

## Free Tier Limitations ⚠️

| Feature | Free Tier | Paid Tier |
|---------|-----------|-----------|
| Sleep after inactivity | 15 minutes | Never |
| Startup time | ~30 seconds | Instant |
| Build minutes | 500/month | Unlimited |
| Bandwidth | 100 GB/month | Unlimited |
| Custom domain | ✅ | ✅ |
| SSL certificate | ✅ | ✅ |

**Tip:** To prevent sleep, use a uptime monitor like:
- [UptimeRobot](https://uptimerobot.com) (Free, pings every 5 min)
- [Cron-Job.org](https://cron-job.org) (Free scheduled pings)

---

## Troubleshooting 🔧

### Deployment Failed

**Check Build Logs:**
```bash
render logs --tail 100
```

**Common Issues:**
- ❌ Node version mismatch → Update `engines` in `package.json`
- ❌ Missing dependencies → Run `npm install` locally first
- ❌ Port conflict → Ensure using `process.env.PORT`

### App Not Loading

1. **Check health endpoint** first
2. **Review logs** for errors
3. **Verify environment variables** are set
4. **Check Firebase rules** allow public access

### WebSocket Issues

- ✅ Render supports WebSockets by default
- ✅ No additional configuration needed
- ✅ Secure WebSocket (wss://) works automatically

---

## Performance Optimization 🚀

### 1. Enable Compression

Already configured in `server.js`:
```javascript
app.use(compression());
```

### 2. Set Cache Headers

Add to `server.js`:
```javascript
app.use(express.static('.', {
  maxAge: '1d'  // Cache static files for 1 day
}));
```

### 3. Use CDN

For better performance, serve static assets via CDN:
- [Cloudflare](https://www.cloudflare.com)
- [Fastly](https://www.fastly.com)

### 4. Upgrade Plan

For production use, consider:
- **Starter Plan** ($7/month): No sleep, faster cold starts
- **Standard Plan** ($25/month): More CPU/RAM, better performance

---

## Monitoring 📊

### 1. Render Dashboard

Built-in metrics:
- CPU usage
- Memory usage
- Request count
- Response times

### 2. Health Check Monitoring

Set up external monitoring:

**UptimeRobot:**
```
Monitor Type: HTTP(s)
URL: https://your-service.onrender.com/health
Interval: 5 minutes
Alert: Email/SMS when down
```

### 3. Log Management

View real-time logs:
```bash
render logs --tail --follow
```

Or use external services:
- [Logtail](https://betterstack.com/logtail)
- [Papertrail](https://www.papertrail.com)

---

## Scaling 📈

### Horizontal Scaling

Render auto-scales on higher plans:
- Add more instances
- Load balancer included
- Zero-downtime deploys

### Vertical Scaling

Upgrade instance type:
- More CPU cores
- More RAM
- Faster disk I/O

---

## Support & Resources 🆘

- **Render Docs**: https://render.com/docs
- **Render Community**: https://community.render.com
- **GitHub Issues**: [Create Issue](https://github.com/YOUR_USERNAME/YOUR_REPO/issues)

---

**Ready to deploy?** Choose your option above and start trading! 📊💰

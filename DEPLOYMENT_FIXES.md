# 🔧 DEPLOYMENT FIXES - STEP BY STEP GUIDE

## Quick Summary
You need to make **4 critical code changes** and **configure environment variables** before deploying.

---

## 🚨 CRITICAL FIX #1: Remove google-oauth.json Dependency

### Current Code (server/index.js lines 79-86):
```javascript
// Load Google OAuth credentials
const googleCredentials = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'google-oauth.json'), 'utf8')
);

const CLIENT_ID = googleCredentials.web.client_id;
const CLIENT_SECRET = googleCredentials.web.client_secret;
const REDIRECT_URI = googleCredentials.web.redirect_uris[0];
```

### Replace With:
```javascript
// Load Google OAuth credentials from environment variables
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
  console.error('❌ Google OAuth credentials missing in environment variables');
  console.error('   Required: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI');
  process.exit(1);
}
```

### Also Remove This Import (line 11):
```javascript
const fs = require('fs');  // ← Remove this line if only used for google-oauth.json
```

---

## 🚨 CRITICAL FIX #2: Add FRONTEND_URL Variable

### Add After Line 66 in server/index.js:
```javascript
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5500')
  .split(',')
  .map(o => o.trim());

// ADD THIS LINE:
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5500';
```

---

## 🚨 CRITICAL FIX #3: Replace All Hardcoded Redirects

### Find and Replace in server/index.js:

**Line 264:**
```javascript
// BEFORE:
return res.redirect('http://localhost:5500/#/login?error=no_code');

// AFTER:
return res.redirect(`${FRONTEND_URL}/#/login?error=no_code`);
```

**Line 306:**
```javascript
// BEFORE:
return res.redirect('http://localhost:5500/#/login?error=session_failed');

// AFTER:
return res.redirect(`${FRONTEND_URL}/#/login?error=session_failed`);
```

**Line 315:**
```javascript
// BEFORE:
res.redirect(`http://localhost:5500/#/${dashboardRoute}`);

// AFTER:
res.redirect(`${FRONTEND_URL}/#/${dashboardRoute}`);
```

**Line 329:**
```javascript
// BEFORE:
return res.redirect('http://localhost:5500/#/login?error=session_failed');

// AFTER:
return res.redirect(`${FRONTEND_URL}/#/login?error=session_failed`);
```

**Line 333:**
```javascript
// BEFORE:
res.redirect('http://localhost:5500/#/select-role');

// AFTER:
res.redirect(`${FRONTEND_URL}/#/select-role`);
```

**Line 339:**
```javascript
// BEFORE:
res.redirect('http://localhost:5500/#/login?error=auth_failed');

// AFTER:
res.redirect(`${FRONTEND_URL}/#/login?error=auth_failed`);
```

---

## 🚨 CRITICAL FIX #4: Add Node Version to package.json

### Add to package.json (after "devDependencies"):
```json
{
  "name": "smart-tourist-safety-system",
  "version": "1.0.0",
  "description": "AI-powered tourist safety monitoring with blockchain ID",
  "scripts": {
    "dev": "concurrently \"npm run server\" \"npm run client\"",
    "server": "node server/index.js",
    "client": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    // ... existing dependencies
  },
  "devDependencies": {
    "concurrently": "^8.2.2",
    "vite": "^8.0.8"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
```

---

## 🔐 STEP 1: Update Google Cloud Console

### Go to: https://console.cloud.google.com/apis/credentials

1. Select your project: `friendly-aura-487215-s5`
2. Click on your OAuth 2.0 Client ID
3. Update **Authorized redirect URIs**:
   - Remove: `http://localhost:5000/auth/google/callback`
   - Add: `https://your-backend-name.onrender.com/auth/google/callback`
   - Keep: `http://localhost:5000/auth/google/callback` (for local dev)

4. Update **Authorized JavaScript origins**:
   - Remove: `http://localhost:5500`
   - Add: `https://your-frontend-name.vercel.app`
   - Keep: `http://localhost:5500` (for local dev)

5. Click **SAVE**

---

## 🔐 STEP 2: Rotate Exposed Credentials

### Twilio (if using SMS):
1. Go to: https://console.twilio.com/
2. Navigate to Account → API Keys & Tokens
3. Create new Auth Token
4. Update in Render environment variables

### Gemini API:
1. Go to: https://aistudio.google.com/app/apikey
2. Delete old key: `AIzaSyBSeQs9q98_JpfQcMFjx_CY0vYfreImWMw`
3. Create new API key
4. Update in Render environment variables

---

## 🚀 STEP 3: Deploy Backend to Render

### 3.1 Create New Web Service
1. Go to: https://dashboard.render.com/
2. Click **New +** → **Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Name:** `smart-tourist-backend` (or your choice)
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm run server`
   - **Plan:** Free (or paid)

### 3.2 Add Environment Variables in Render

Click **Environment** tab and add:

```bash
# Database
DATABASE_URL=postgresql://neondb_owner:npg_Y7OZqzfPNr3e@ep-square-frog-a134wnfe-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=verify-full

# Secrets (GENERATE NEW ONES!)
SESSION_SECRET=<run: openssl rand -base64 48>
JWT_SECRET=<run: openssl rand -base64 48>

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID=624443207563-mf4j63vpaa17qbe8i78q08e893auu6cb.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<NEW SECRET FROM GOOGLE CONSOLE>
GOOGLE_REDIRECT_URI=https://your-backend-name.onrender.com/auth/google/callback

# Frontend URL (will be your Vercel URL)
FRONTEND_URL=https://your-frontend-name.vercel.app

# CORS
ALLOWED_ORIGINS=https://your-frontend-name.vercel.app

# Environment
NODE_ENV=production
PORT=5000

# Optional: Gemini AI
GEMINI_API_KEY=<NEW KEY FROM GOOGLE AI STUDIO>

# Optional: Twilio SMS
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=<NEW SID>
TWILIO_AUTH_TOKEN=<NEW TOKEN>
TWILIO_FROM=+13204338091
```

### 3.3 Deploy
1. Click **Create Web Service**
2. Wait for deployment (5-10 minutes)
3. Note your backend URL: `https://your-backend-name.onrender.com`

---

## 🚀 STEP 4: Deploy Frontend to Vercel

### 4.1 Create New Project
1. Go to: https://vercel.com/new
2. Import your GitHub repository
3. Configure:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

### 4.2 Add Environment Variables in Vercel

Click **Environment Variables** and add:

```bash
VITE_API_URL=https://your-backend-name.onrender.com
```

**IMPORTANT:** Replace `your-backend-name` with your actual Render service name!

### 4.3 Deploy
1. Click **Deploy**
2. Wait for deployment (2-3 minutes)
3. Note your frontend URL: `https://your-frontend-name.vercel.app`

---

## 🔄 STEP 5: Update Backend with Frontend URL

### Go back to Render:
1. Open your backend service
2. Go to **Environment** tab
3. Update these variables with your actual Vercel URL:
   - `FRONTEND_URL=https://your-actual-frontend.vercel.app`
   - `ALLOWED_ORIGINS=https://your-actual-frontend.vercel.app`
4. Click **Save Changes**
5. Service will auto-redeploy

---

## 🔄 STEP 6: Update Google OAuth with Final URLs

### Go back to Google Cloud Console:
1. Update **Authorized redirect URIs**:
   - Replace placeholder with: `https://your-actual-backend.onrender.com/auth/google/callback`
2. Update **Authorized JavaScript origins**:
   - Replace placeholder with: `https://your-actual-frontend.vercel.app`
3. Click **SAVE**

---

## ✅ STEP 7: Test Deployment

### Test Backend:
1. Visit: `https://your-backend-name.onrender.com/health`
2. Should see:
```json
{
  "ok": true,
  "env": "production",
  "db": "connected",
  "websocket": "ready",
  "uptime": "5s"
}
```

### Test Frontend:
1. Visit: `https://your-frontend-name.vercel.app`
2. Should see landing page
3. Click **Sign in with Google**
4. Should redirect to Google login
5. After login, should redirect back to dashboard

### Test Features:
- [ ] Google OAuth login
- [ ] Email/password registration
- [ ] Dashboard loads
- [ ] SOS button works
- [ ] Chatbot responds
- [ ] Location tracking works
- [ ] WebSocket connection (check browser console)

---

## 🐛 TROUBLESHOOTING

### Issue: "Google OAuth Error"
**Solution:** Check Google Cloud Console redirect URIs match exactly

### Issue: "CORS Error"
**Solution:** Check `ALLOWED_ORIGINS` in Render matches Vercel URL exactly

### Issue: "Database Connection Failed"
**Solution:** Check `DATABASE_URL` is correct and database is accessible

### Issue: "Cannot GET /"
**Solution:** Check `dist` folder exists in Vercel deployment

### Issue: "WebSocket Connection Failed"
**Solution:** Check `VITE_API_URL` in Vercel points to Render backend

---

## 📊 MONITORING

### Render Logs:
- Go to: https://dashboard.render.com/
- Click your service → **Logs** tab
- Watch for errors during startup

### Vercel Logs:
- Go to: https://vercel.com/dashboard
- Click your project → **Deployments** → Click latest → **Logs**

### Database:
- Use Neon dashboard: https://console.neon.tech/
- Check connections and queries

---

## 🎉 SUCCESS CHECKLIST

After deployment, verify:
- [ ] Backend health endpoint returns 200 OK
- [ ] Frontend loads without errors
- [ ] Google OAuth flow works end-to-end
- [ ] Email registration works
- [ ] Dashboard displays correctly
- [ ] SOS button triggers incident
- [ ] Chatbot responds (if Gemini key set)
- [ ] Location tracking updates in real-time
- [ ] WebSocket events work (check browser console)
- [ ] No CORS errors in browser console
- [ ] No 404 errors in network tab

---

## 📞 NEED HELP?

If stuck, check:
1. **Render Logs:** Look for startup errors
2. **Vercel Logs:** Look for build errors
3. **Browser Console:** Look for network errors
4. **Google Cloud Console:** Verify OAuth settings

Common issues:
- Typo in environment variable names
- Forgot to update Google OAuth URLs
- CORS origin mismatch
- Database connection string wrong

---

**Good luck with your deployment! 🚀**

# 🚨 CRITICAL ISSUES - QUICK REFERENCE

## ⚠️ YOUR DEPLOYMENT WILL FAIL WITHOUT THESE FIXES

---

## 🔴 ISSUE #1: Google OAuth Hardcoded URLs
**Location:** `server/index.js` lines 264, 306, 315, 329, 333, 339

**Problem:**
```javascript
res.redirect('http://localhost:5500/#/login');  // ❌ WILL FAIL IN PRODUCTION
```

**Fix:**
```javascript
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5500';
res.redirect(`${FRONTEND_URL}/#/login`);  // ✅ WORKS IN PRODUCTION
```

**Impact:** Users cannot sign in with Google in production.

---

## 🔴 ISSUE #2: google-oauth.json File Dependency
**Location:** `server/index.js` lines 79-86

**Problem:**
- File doesn't exist in production
- Contains secrets in plaintext
- Not in environment variables

**Fix:**
```javascript
// ❌ REMOVE:
const googleCredentials = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'google-oauth.json'), 'utf8')
);

// ✅ ADD:
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
```

**Impact:** Server crashes on startup.

---

## 🔴 ISSUE #3: Missing Environment Variables
**Location:** Render dashboard

**Problem:** `.env.production` is empty

**Fix:** Add these to Render:
```bash
GOOGLE_CLIENT_ID=624443207563-mf4j63vpaa17qbe8i78q08e893auu6cb.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<from-google-console>
GOOGLE_REDIRECT_URI=https://your-backend.onrender.com/auth/google/callback
FRONTEND_URL=https://your-frontend.vercel.app
ALLOWED_ORIGINS=https://your-frontend.vercel.app
SESSION_SECRET=<64-char-random>
JWT_SECRET=<64-char-random>
DATABASE_URL=<your-postgres-url>
NODE_ENV=production
```

**Impact:** Authentication fails, CORS errors, crashes.

---

## 🔴 ISSUE #4: Google Cloud Console Not Updated
**Location:** https://console.cloud.google.com/apis/credentials

**Problem:** OAuth redirect URIs still point to localhost

**Fix:**
1. Go to Google Cloud Console
2. Edit OAuth 2.0 Client ID
3. Add: `https://your-backend.onrender.com/auth/google/callback`
4. Add: `https://your-frontend.vercel.app`
5. Save

**Impact:** Google OAuth returns error "redirect_uri_mismatch"

---

## 🟡 ISSUE #5: Exposed Credentials in Repository
**Location:** `.env` file (committed to Git)

**Problem:**
- Twilio credentials exposed
- Gemini API key exposed
- Anyone with repo access can see them

**Fix:**
1. Rotate Twilio credentials
2. Rotate Gemini API key
3. Set new values in Render
4. Never commit `.env` again

**Impact:** Security breach, unauthorized API usage.

---

## ✅ QUICK FIX CHECKLIST

Before deploying, complete these 5 steps:

### Step 1: Code Changes (5 minutes)
- [ ] Replace google-oauth.json with env vars
- [ ] Add FRONTEND_URL variable
- [ ] Replace 6 hardcoded redirects
- [ ] Add Node version to package.json

### Step 2: Google Cloud Console (2 minutes)
- [ ] Update OAuth redirect URIs
- [ ] Update JavaScript origins
- [ ] Save changes

### Step 3: Rotate Credentials (5 minutes)
- [ ] Generate new SESSION_SECRET
- [ ] Generate new JWT_SECRET
- [ ] Rotate Twilio credentials (if using)
- [ ] Rotate Gemini API key (if using)

### Step 4: Deploy Backend (10 minutes)
- [ ] Create Render web service
- [ ] Add all environment variables
- [ ] Deploy and wait
- [ ] Test /health endpoint

### Step 5: Deploy Frontend (5 minutes)
- [ ] Create Vercel project
- [ ] Add VITE_API_URL
- [ ] Deploy and wait
- [ ] Test landing page

**Total Time:** ~30 minutes

---

## 🔧 GENERATE SECRETS

Run these commands to generate secure secrets:

```bash
# SESSION_SECRET
openssl rand -base64 48

# JWT_SECRET
openssl rand -base64 48
```

Copy the output and paste into Render environment variables.

---

## 📋 ENVIRONMENT VARIABLES TEMPLATE

### Render (Backend):
```bash
DATABASE_URL=postgresql://neondb_owner:npg_Y7OZqzfPNr3e@ep-square-frog-a134wnfe-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=verify-full
SESSION_SECRET=<paste-from-openssl>
JWT_SECRET=<paste-from-openssl>
GOOGLE_CLIENT_ID=624443207563-mf4j63vpaa17qbe8i78q08e893auu6cb.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<from-google-console>
GOOGLE_REDIRECT_URI=https://YOUR-BACKEND.onrender.com/auth/google/callback
FRONTEND_URL=https://YOUR-FRONTEND.vercel.app
ALLOWED_ORIGINS=https://YOUR-FRONTEND.vercel.app
NODE_ENV=production
PORT=5000
GEMINI_API_KEY=<optional-new-key>
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=<optional-new-sid>
TWILIO_AUTH_TOKEN=<optional-new-token>
TWILIO_FROM=<optional-phone>
```

### Vercel (Frontend):
```bash
VITE_API_URL=https://YOUR-BACKEND.onrender.com
```

**IMPORTANT:** Replace `YOUR-BACKEND` and `YOUR-FRONTEND` with actual URLs!

---

## 🚀 DEPLOYMENT ORDER

**CORRECT ORDER:**
1. Make code changes
2. Update Google Cloud Console
3. Deploy backend to Render
4. Get backend URL
5. Deploy frontend to Vercel with backend URL
6. Get frontend URL
7. Update backend env vars with frontend URL
8. Update Google Cloud Console with final URLs
9. Test everything

**WRONG ORDER:**
- ❌ Deploy frontend first (no backend to connect to)
- ❌ Skip Google Cloud Console update (OAuth fails)
- ❌ Forget to update env vars (CORS errors)

---

## 🐛 COMMON ERRORS & FIXES

### Error: "redirect_uri_mismatch"
**Cause:** Google OAuth URLs not updated  
**Fix:** Update Google Cloud Console with production URLs

### Error: "CORS policy blocked"
**Cause:** ALLOWED_ORIGINS doesn't match frontend URL  
**Fix:** Update ALLOWED_ORIGINS in Render to exact Vercel URL

### Error: "Cannot read properties of undefined (reading 'web')"
**Cause:** google-oauth.json not found  
**Fix:** Use environment variables instead

### Error: "Database connection failed"
**Cause:** DATABASE_URL wrong or database down  
**Fix:** Check DATABASE_URL and test connection

### Error: "Session secret required"
**Cause:** SESSION_SECRET not set  
**Fix:** Add SESSION_SECRET to Render env vars

---

## ✅ SUCCESS INDICATORS

You'll know deployment succeeded when:
- ✅ `/health` returns `{"ok": true}`
- ✅ Frontend loads without console errors
- ✅ Google OAuth redirects correctly
- ✅ Dashboard displays after login
- ✅ No CORS errors in browser console
- ✅ WebSocket connects (check console)

---

## 📞 EMERGENCY CONTACTS

If deployment fails:
1. Check Render logs: https://dashboard.render.com/
2. Check Vercel logs: https://vercel.com/dashboard
3. Check browser console (F12)
4. Check Google Cloud Console OAuth settings

---

**Remember:** Fix these 4 critical issues BEFORE deploying!

1. ❌ Hardcoded localhost URLs
2. ❌ google-oauth.json dependency
3. ❌ Missing environment variables
4. ❌ Google Cloud Console not updated

**Good luck! 🚀**

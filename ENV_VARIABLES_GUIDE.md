# 🔑 ENVIRONMENT VARIABLES GUIDE

## ✅ UPDATED: Your .env File Now Includes All Required Variables

---

## 📋 REQUIRED VARIABLES (Server Won't Start Without These)

### **Google OAuth Credentials** ⚠️ **CRITICAL**

```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5000/auth/google/callback
```

**Why Required:**
- Server validates these on startup
- Server will **EXIT** with error if missing
- Needed for Google OAuth login to work

**Error if Missing:**
```
❌ Google OAuth credentials missing in environment variables
   Required: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
   Set these in your .env file or deployment platform
```

---

### **Frontend URL** ⚠️ **CRITICAL**

```bash
FRONTEND_URL=http://localhost:5500
```

**Why Required:**
- Used for OAuth redirects
- Without it, OAuth will redirect to wrong URL
- Must match your frontend URL exactly

**Local Development:** `http://localhost:5500`  
**Production:** `https://your-frontend.vercel.app`

---

### **Database URL** ⚠️ **CRITICAL**

```bash
DATABASE_URL=postgresql://username:password@host/database?sslmode=require
```

**Why Required:**
- Server needs database connection
- Will crash if missing or invalid

---

### **Session & JWT Secrets** ⚠️ **CRITICAL**

```bash
SESSION_SECRET=safetrip-secret-key-change-in-production
JWT_SECRET=safetrip-jwt-secret-change-in-production
```

**Why Required:**
- Used for session management
- Used for JWT token signing
- Should be long random strings in production

**Generate Production Secrets:**
```bash
openssl rand -base64 48
```

---

## 📋 RECOMMENDED VARIABLES

### **CORS Configuration**

```bash
ALLOWED_ORIGINS=http://localhost:5500
```

**Why Recommended:**
- Controls which domains can access your API
- Prevents unauthorized access

**Local Development:** `http://localhost:5500`  
**Production:** `https://your-frontend.vercel.app`

---

### **Node Environment**

```bash
NODE_ENV=development
PORT=5000
```

**Why Recommended:**
- Controls logging level
- Affects rate limiting
- PORT is used by Render (defaults to 5000)

---

## 📋 OPTIONAL VARIABLES

### **Gemini AI (Chatbot)**

```bash
GEMINI_API_KEY=your-gemini-api-key
```

**If Missing:**
- Chatbot will use rule-based fallback
- No AI-powered responses
- Still functional, just less intelligent

---

### **Twilio SMS (SOS Alerts)**

```bash
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_FROM=+1234567890
```

**If Missing:**
- SMS will use mock mode (console logging)
- No actual SMS sent
- SOS button still works, just no SMS

---

## 🔍 CURRENT STATUS OF YOUR .env FILE

### ✅ **Now Includes (After My Update):**

```bash
# Required
✅ DATABASE_URL
✅ SESSION_SECRET
✅ JWT_SECRET
✅ GOOGLE_CLIENT_ID
✅ GOOGLE_CLIENT_SECRET
✅ GOOGLE_REDIRECT_URI
✅ FRONTEND_URL
✅ ALLOWED_ORIGINS
✅ NODE_ENV
✅ PORT

# Optional
✅ VITE_API_URL
✅ GEMINI_API_KEY
✅ SMS_PROVIDER
✅ TWILIO_ACCOUNT_SID
✅ TWILIO_AUTH_TOKEN
✅ TWILIO_FROM
```

**Status:** ✅ **ALL REQUIRED VARIABLES PRESENT**

---

## 🚀 FOR PRODUCTION DEPLOYMENT

### **Render (Backend) - Set These in Dashboard:**

```bash
# Required
DATABASE_URL=<your-production-database>
SESSION_SECRET=<generate-with-openssl>
JWT_SECRET=<generate-with-openssl>
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<from-google-console>
GOOGLE_REDIRECT_URI=https://YOUR-BACKEND.onrender.com/auth/google/callback
FRONTEND_URL=https://YOUR-FRONTEND.vercel.app
ALLOWED_ORIGINS=https://YOUR-FRONTEND.vercel.app
NODE_ENV=production
PORT=5000

# Optional
GEMINI_API_KEY=<your-key>
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=<your-sid>
TWILIO_AUTH_TOKEN=<your-token>
TWILIO_FROM=<your-phone>
```

### **Vercel (Frontend) - Set This in Dashboard:**

```bash
VITE_API_URL=https://YOUR-BACKEND.onrender.com
```

---

## ⚠️ SECURITY WARNINGS

### **DO NOT:**
- ❌ Commit `.env` file to Git (it's in `.gitignore`)
- ❌ Share your secrets publicly
- ❌ Use development secrets in production

### **DO:**
- ✅ Keep `.env` file local only
- ✅ Use `.env.example` as template
- ✅ Generate new secrets for production
- ✅ Rotate secrets if exposed

---

## 🧪 TESTING YOUR CONFIGURATION

### **Test if Server Starts:**

```bash
npm run server
```

**Expected Output:**
```
🚀 Starting SafeTrip server...
✅ Database connected successfully
✅ Database schema up to date
✅ Demo users seeded
🚀 Server running on port 5000
📡 WebSocket server ready
🔐 Google OAuth configured
   Client ID: your-client-id...
   Redirect URI: http://localhost:5000/auth/google/callback
   Frontend URL: http://localhost:5500
🗄️  PostgreSQL connected
```

**If You See This Error:**
```
❌ Google OAuth credentials missing in environment variables
```

**Solution:**
1. Check your `.env` file exists
2. Check it has `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
3. Restart the server

---

## 📞 TROUBLESHOOTING

### **Issue: "Google OAuth credentials missing"**
**Cause:** `.env` file doesn't have OAuth variables  
**Fix:** I've already added them to your `.env` file ✅

### **Issue: "Cannot find module 'dotenv'"**
**Cause:** Dependencies not installed  
**Fix:** Run `npm install`

### **Issue: "Database connection failed"**
**Cause:** DATABASE_URL is wrong  
**Fix:** Check your database connection string

### **Issue: "Port 5000 already in use"**
**Cause:** Another process using port 5000  
**Fix:** Change PORT in `.env` or kill the other process

---

## ✅ SUMMARY

**Your `.env` file has been updated with:**
- ✅ All required Google OAuth credentials
- ✅ FRONTEND_URL variable
- ✅ JWT_SECRET variable
- ✅ Proper organization and comments

**Your server will now:**
- ✅ Start without errors
- ✅ Validate OAuth credentials on startup
- ✅ Work with Google OAuth login
- ✅ Redirect to correct frontend URL

**You can now:**
- ✅ Run `npm run server` successfully
- ✅ Test Google OAuth login locally
- ✅ Deploy to production (after setting production values)

---

**Generated:** April 22, 2026  
**Status:** ✅ .env FILE UPDATED  
**Next:** Run `npm run server` to test

# 🔍 PRE-DEPLOYMENT AUDIT REPORT
## Smart Tourist Safety System - Production Deployment Checklist

**Audit Date:** April 22, 2026  
**Target Deployment:** Render (Backend) + Vercel (Frontend)  
**Auditor:** Senior DevOps Engineer & Full-Stack Reviewer

---

## 🔴 CRITICAL ISSUES (WILL BREAK DEPLOYMENT)

### 1. **GOOGLE OAUTH - HARDCODED LOCALHOST URLs**
**Severity:** 🔴 CRITICAL - Will break authentication in production

**Issue:**
- `server/google-oauth.json` contains hardcoded localhost URLs
- Redirect URI: `http://localhost:5000/auth/google/callback`
- JavaScript origins: `http://localhost:5500`
- Backend redirects in `server/index.js` (lines 264, 306, 315, 329, 333, 339) use hardcoded `http://localhost:5500`

**Impact:** Google OAuth will fail completely in production. Users cannot sign in with Google.

**Fix Required:**
```javascript
// server/index.js - Replace ALL hardcoded localhost redirects
// Lines 264, 306, 315, 329, 333, 339

// ❌ WRONG (current):
return res.redirect('http://localhost:5500/#/login?error=no_code');

// ✅ CORRECT:
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5500';
return res.redirect(`${FRONTEND_URL}/#/login?error=no_code`);
```

**Action Items:**
1. Add `FRONTEND_URL` to `.env.production`
2. Update Google Cloud Console OAuth credentials:
   - Authorized redirect URIs: `https://your-backend.onrender.com/auth/google/callback`
   - Authorized JavaScript origins: `https://your-frontend.vercel.app`
3. Replace `server/google-oauth.json` with environment variables:
```javascript
// server/index.js
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
```

---

### 2. **MISSING ENVIRONMENT VARIABLES**
**Severity:** 🔴 CRITICAL

**Missing from `.env.production`:**
```bash
# Required for Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://your-backend.onrender.com/auth/google/callback
FRONTEND_URL=https://your-frontend.vercel.app

# Required for JWT
JWT_SECRET=  # Must be 64+ character random string

# Required for sessions
SESSION_SECRET=  # Must be 64+ character random string

# Required for CORS
ALLOWED_ORIGINS=https://your-frontend.vercel.app

# Required for frontend API calls
VITE_API_URL=https://your-backend.onrender.com
```

**Action:** Fill in ALL values in `.env.production` before deploying.

---

### 3. **GOOGLE OAUTH FILE SECURITY RISK**
**Severity:** 🔴 CRITICAL - Security vulnerability

**Issue:**
- `server/google-oauth.json` contains client secret in plaintext
- File is in `.gitignore` but exists in repository
- Should use environment variables instead

**Fix:**
```javascript
// server/index.js - Replace file reading with env vars
// ❌ REMOVE:
const googleCredentials = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'google-oauth.json'), 'utf8')
);
const CLIENT_ID = googleCredentials.web.client_id;
const CLIENT_SECRET = googleCredentials.web.client_secret;
const REDIRECT_URI = googleCredentials.web.redirect_uris[0];

// ✅ ADD:
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
  console.error('❌ Google OAuth credentials missing in environment variables');
  process.exit(1);
}
```

---

### 4. **PORT CONFIGURATION**
**Severity:** 🟢 GOOD - Already correct

**Status:** ✅ Backend correctly uses `process.env.PORT || 5000`
- Line 1331: `const PORT = process.env.PORT || 5000;`
- Render will automatically set PORT environment variable

---

## 🟡 WARNING ISSUES (MAY CAUSE PROBLEMS)

### 5. **FRONTEND API BASE URL - Localhost Fallbacks**
**Severity:** 🟡 WARNING

**Issue:** Multiple files use `http://localhost:5000` as fallback:
- `src/services/incident.js` (line 6)
- `src/services/socket.js` (line 4)
- `src/services/auth-api.js` (line 4)
- `src/services/apiClient.js` (line 9)
- `src/pages/TouristDashboard.js` (line 958)
- `src/pages/LoginPage.js` (line 49)
- `src/pages/AuthorityDashboard.js` (line 10)
- `src/pages/AdminDashboard.js` (line 9)
- `src/pages/RoleSelectionPage.js` (line 4)

**Current Pattern:**
```javascript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
```

**Status:** ✅ This is acceptable IF `VITE_API_URL` is set in production
- Vercel will use environment variable from dashboard
- Fallback only used in local development

**Action:** Ensure `VITE_API_URL` is set in Vercel environment variables.

---

### 6. **VITE PROXY CONFIGURATION**
**Severity:** 🟡 WARNING

**Issue:** `vite.config.js` has proxy settings that only work in development:
```javascript
proxy: {
  '/api': { target: 'http://localhost:5000' },
  '/auth': { target: 'http://localhost:5000' },
  '/socket.io': { target: 'http://localhost:5000' }
}
```

**Status:** ✅ This is fine - proxies are only used in `npm run dev`
- Production build doesn't use Vite dev server
- Frontend will use `VITE_API_URL` directly

---

### 7. **CORS CONFIGURATION**
**Severity:** 🟡 WARNING - Needs production update

**Current:**
```javascript
// server/index.js line 66
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5500')
  .split(',')
  .map(o => o.trim());
```

**Status:** ✅ Good pattern, but needs production value

**Action:** Set in Render environment variables:
```bash
ALLOWED_ORIGINS=https://your-frontend.vercel.app,https://your-frontend-preview.vercel.app
```

---

### 8. **DATABASE CONNECTION**
**Severity:** 🟢 GOOD

**Status:** ✅ Properly configured
- Uses `process.env.DATABASE_URL`
- Has SSL enabled: `ssl: { rejectUnauthorized: false }`
- Has connection pooling and timeouts
- Has retry logic in `testConnection()`

**Current `.env` has Neon PostgreSQL:**
```
DATABASE_URL=postgresql://neondb_owner:npg_Y7OZqzfPNr3e@ep-square-frog-a134wnfe-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=verify-full
```

**Action:** Verify this is the production database or update in Render.

---

### 9. **DATABASE MIGRATIONS**
**Severity:** 🟢 GOOD

**Status:** ✅ Excellent migration system
- Automatic migration runner on startup
- Advisory locks prevent race conditions
- Checksum validation prevents tampering
- 3 migrations found:
  - `001_init_schema.sql` - Base tables
  - `002_add_location_active.sql` - Location tracking
  - `003_add_sms_logs.sql` - SMS audit logs

**All tables verified:**
- ✅ users
- ✅ incidents
- ✅ risk_zones
- ✅ sos_events
- ✅ tourist_locations
- ✅ chat_logs
- ✅ voice_logs
- ✅ system_logs
- ✅ consent_logs
- ✅ sms_logs

---

### 10. **SMS SERVICE (TWILIO)**
**Severity:** 🟡 WARNING - Credentials exposed

**Issue:** `.env` file contains real Twilio credentials:
```bash
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_FROM=+1234567890
```

**Status:** ⚠️ These credentials are in the repository
- `.env` should be in `.gitignore` (it is)
- But if already committed, credentials are exposed

**Action:**
1. Rotate Twilio credentials in Twilio console
2. Set new credentials in Render environment variables
3. Never commit `.env` file

---

### 11. **GEMINI API KEY**
**Severity:** 🟡 WARNING - API key exposed

**Issue:** `.env` contains Gemini API key:
```bash
GEMINI_API_KEY=your-gemini-api-key
```

**Status:** ⚠️ API key is in repository
- Should be rotated if committed to Git

**Action:**
1. Rotate API key in Google AI Studio
2. Set new key in Render environment variables

---

## 🟢 GOOD PRACTICES FOUND

### 12. **AUTHENTICATION**
**Status:** ✅ Excellent implementation
- JWT + Session hybrid auth
- Bcrypt password hashing (10 rounds)
- Token refresh mechanism
- Secure cookie settings
- Rate limiting on auth endpoints

### 13. **SECURITY HEADERS**
**Status:** ✅ Helmet.js configured
```javascript
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
```

### 14. **RATE LIMITING**
**Status:** ✅ Properly configured
- General: 200 req/15min (2000 in dev)
- Auth: 20 req/15min (200 in dev)
- SOS: 5 req/min (100 in dev)

### 15. **ERROR HANDLING**
**Status:** ✅ Good try-catch coverage
- All async routes wrapped in try-catch
- Proper error logging
- User-friendly error messages

### 16. **WEBSOCKET (SOCKET.IO)**
**Status:** ✅ Properly configured
- CORS enabled for allowed origins
- Reconnection logic
- Event-based architecture
- Cleanup on disconnect

---

## 📋 BUILD & DEPLOYMENT CONFIG

### 17. **PACKAGE.JSON SCRIPTS**
**Status:** ✅ Correct for deployment

**Current scripts:**
```json
{
  "dev": "concurrently \"npm run server\" \"npm run client\"",
  "server": "node server/index.js",
  "client": "vite",
  "build": "vite build",
  "preview": "vite preview"
}
```

**Render (Backend) will use:**
- Build Command: `npm install`
- Start Command: `npm run server`

**Vercel (Frontend) will use:**
- Build Command: `npm run build`
- Output Directory: `dist`

---

### 18. **NODE VERSION**
**Status:** ⚠️ Not specified

**Action:** Add to `package.json`:
```json
{
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
```

---

### 19. **DEPENDENCIES**
**Status:** ✅ All production dependencies present
- No missing dependencies detected
- All imports have corresponding packages

**Key dependencies:**
- Express, Socket.IO, PostgreSQL (pg)
- Google Auth, JWT, Bcrypt
- Gemini AI, Twilio (optional)
- Vite (dev dependency)

---

## 🔒 SECURITY AUDIT

### 20. **EXPOSED SECRETS IN FRONTEND**
**Status:** ✅ GOOD - No secrets in frontend code
- All API keys used only in backend
- Frontend only has `VITE_API_URL` (public)

### 21. **INPUT VALIDATION**
**Status:** ✅ Express-validator used
- Email validation
- Phone number validation
- SQL injection protection (parameterized queries)

### 22. **SQL INJECTION PROTECTION**
**Status:** ✅ All queries use parameterized statements
- No string concatenation in SQL
- Proper use of `$1, $2` placeholders

### 23. **XSS PROTECTION**
**Status:** ✅ Helmet.js provides basic protection
- Content-Type headers set
- No `eval()` or `innerHTML` with user input

---

## ⚡ PERFORMANCE & RELIABILITY

### 24. **DATABASE CONNECTION POOLING**
**Status:** ✅ Configured
```javascript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10
});
```

### 25. **ERROR RECOVERY**
**Status:** ✅ Good
- Database connection retry (3 attempts)
- SMS retry logic (3 attempts)
- WebSocket reconnection

### 26. **LOGGING**
**Status:** ✅ Morgan logger configured
- Production: 'combined' format
- Development: 'dev' format

---

## 🚀 RENDER-SPECIFIC CHECKS

### 27. **START COMMAND**
**Status:** ✅ Correct
- Uses `npm run server` → `node server/index.js`
- No hardcoded ports

### 28. **ENVIRONMENT VARIABLES**
**Status:** ⚠️ Must be set in Render dashboard

**Required in Render:**
```bash
DATABASE_URL=postgresql://...
SESSION_SECRET=<64-char-random-string>
JWT_SECRET=<64-char-random-string>
ALLOWED_ORIGINS=https://your-frontend.vercel.app
GOOGLE_CLIENT_ID=<from-google-console>
GOOGLE_CLIENT_SECRET=<from-google-console>
GOOGLE_REDIRECT_URI=https://your-backend.onrender.com/auth/google/callback
FRONTEND_URL=https://your-frontend.vercel.app
NODE_ENV=production
PORT=5000
GEMINI_API_KEY=<optional>
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=<optional>
TWILIO_AUTH_TOKEN=<optional>
TWILIO_FROM=<optional>
```

### 29. **HEALTH CHECK ENDPOINT**
**Status:** ✅ Available at `/health`
```javascript
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    env: process.env.NODE_ENV || 'development',
    db: 'connected',
    websocket: 'ready',
    uptime: Math.floor(process.uptime()) + 's'
  });
});
```

---

## 📊 DEPLOYMENT CHECKLIST

### Before Deploying to Render (Backend):

- [ ] 1. Rotate Twilio credentials (if exposed in Git)
- [ ] 2. Rotate Gemini API key (if exposed in Git)
- [ ] 3. Generate new JWT_SECRET (64 chars): `openssl rand -base64 48`
- [ ] 4. Generate new SESSION_SECRET (64 chars): `openssl rand -base64 48`
- [ ] 5. Update Google OAuth credentials in Google Cloud Console
- [ ] 6. Set all environment variables in Render dashboard
- [ ] 7. Remove `server/google-oauth.json` dependency
- [ ] 8. Add `FRONTEND_URL` environment variable
- [ ] 9. Update all hardcoded localhost redirects in `server/index.js`
- [ ] 10. Add Node version to `package.json`
- [ ] 11. Test database connection from Render
- [ ] 12. Verify migrations run successfully

### Before Deploying to Vercel (Frontend):

- [ ] 1. Set `VITE_API_URL` in Vercel environment variables
- [ ] 2. Set to production Render URL: `https://your-backend.onrender.com`
- [ ] 3. Test build locally: `npm run build`
- [ ] 4. Verify `dist` folder is created
- [ ] 5. Check for build errors

### After Deployment:

- [ ] 1. Test `/health` endpoint
- [ ] 2. Test Google OAuth flow end-to-end
- [ ] 3. Test email/password registration
- [ ] 4. Test SOS button (with mock SMS)
- [ ] 5. Test WebSocket connection
- [ ] 6. Test chatbot (Gemini AI)
- [ ] 7. Test location tracking
- [ ] 8. Monitor Render logs for errors
- [ ] 9. Check database migrations applied
- [ ] 10. Test CORS from frontend

---

## 🔧 IMMEDIATE FIXES REQUIRED

### Priority 1 (Must fix before deployment):

1. **Replace Google OAuth file with environment variables**
2. **Update all hardcoded localhost URLs in server/index.js**
3. **Add FRONTEND_URL environment variable**
4. **Fill in .env.production with all required values**
5. **Update Google Cloud Console OAuth settings**

### Priority 2 (Should fix before deployment):

6. **Rotate exposed API keys (Twilio, Gemini)**
7. **Add Node version to package.json**
8. **Test full OAuth flow in staging**

---

## 📝 CODE FIXES NEEDED

### Fix 1: Remove google-oauth.json dependency

```javascript
// server/index.js - Replace lines 79-83

// ❌ REMOVE:
const googleCredentials = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'google-oauth.json'), 'utf8')
);
const CLIENT_ID = googleCredentials.web.client_id;
const CLIENT_SECRET = googleCredentials.web.client_secret;
const REDIRECT_URI = googleCredentials.web.redirect_uris[0];

// ✅ ADD:
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
  console.error('❌ Google OAuth credentials missing in environment variables');
  console.error('   Required: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI');
  process.exit(1);
}
```

### Fix 2: Add FRONTEND_URL environment variable

```javascript
// server/index.js - Add after line 66

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5500';
```

### Fix 3: Replace all hardcoded redirects

```javascript
// server/index.js - Replace lines 264, 306, 315, 329, 333, 339

// ❌ WRONG:
return res.redirect('http://localhost:5500/#/login?error=no_code');

// ✅ CORRECT:
return res.redirect(`${FRONTEND_URL}/#/login?error=no_code`);
```

**All occurrences to fix:**
- Line 264: `return res.redirect('http://localhost:5500/#/login?error=no_code');`
- Line 306: `return res.redirect('http://localhost:5500/#/login?error=session_failed');`
- Line 315: `res.redirect(\`http://localhost:5500/#/${dashboardRoute}\`);`
- Line 329: `return res.redirect('http://localhost:5500/#/login?error=session_failed');`
- Line 333: `res.redirect('http://localhost:5500/#/select-role');`
- Line 339: `res.redirect('http://localhost:5500/#/login?error=auth_failed');`

### Fix 4: Add Node version

```json
// package.json - Add after "devDependencies"

"engines": {
  "node": ">=18.0.0",
  "npm": ">=9.0.0"
}
```

---

## 🎯 FINAL VERDICT

### Overall Readiness: 🟡 **70% READY**

**Strengths:**
- ✅ Excellent database setup with migrations
- ✅ Good security practices (JWT, bcrypt, rate limiting)
- ✅ Proper error handling
- ✅ WebSocket properly configured
- ✅ No hardcoded ports

**Critical Blockers:**
- 🔴 Google OAuth hardcoded localhost URLs
- 🔴 Missing production environment variables
- 🔴 google-oauth.json file dependency

**Estimated Time to Production-Ready:** 2-3 hours

**Risk Level:** MEDIUM - Will work after fixes, but OAuth will fail without them.

---

## 📞 SUPPORT CONTACTS

If deployment fails, check:
1. Render logs: `https://dashboard.render.com/`
2. Vercel logs: `https://vercel.com/dashboard`
3. Database connection: Test with `psql` or pgAdmin
4. Google OAuth: Check Google Cloud Console for errors

---

**Report Generated:** April 22, 2026  
**Next Review:** After implementing fixes

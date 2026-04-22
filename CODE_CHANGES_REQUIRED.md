# 📝 EXACT CODE CHANGES REQUIRED

## File 1: server/index.js

### Change #1: Replace Lines 79-86 (Google OAuth File Loading)

**FIND THIS (lines 79-86):**
```javascript
// Load Google OAuth credentials
const googleCredentials = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'google-oauth.json'), 'utf8')
);

const CLIENT_ID = googleCredentials.web.client_id;
const CLIENT_SECRET = googleCredentials.web.client_secret;
const REDIRECT_URI = googleCredentials.web.redirect_uris[0];
```

**REPLACE WITH:**
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

---

### Change #2: Add FRONTEND_URL Variable (After Line 69)

**FIND THIS (line 66-69):**
```javascript
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5500')
  .split(',')
  .map(o => o.trim());
```

**ADD AFTER IT:**
```javascript
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5500')
  .split(',')
  .map(o => o.trim());

// ADD THIS LINE:
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5500';
```

---

### Change #3: Replace Line 264

**FIND:**
```javascript
return res.redirect('http://localhost:5500/#/login?error=no_code');
```

**REPLACE WITH:**
```javascript
return res.redirect(`${FRONTEND_URL}/#/login?error=no_code`);
```

---

### Change #4: Replace Line 306

**FIND:**
```javascript
return res.redirect('http://localhost:5500/#/login?error=session_failed');
```

**REPLACE WITH:**
```javascript
return res.redirect(`${FRONTEND_URL}/#/login?error=session_failed`);
```

---

### Change #5: Replace Line 315

**FIND:**
```javascript
res.redirect(`http://localhost:5500/#/${dashboardRoute}`);
```

**REPLACE WITH:**
```javascript
res.redirect(`${FRONTEND_URL}/#/${dashboardRoute}`);
```

---

### Change #6: Replace Line 329

**FIND:**
```javascript
return res.redirect('http://localhost:5500/#/login?error=session_failed');
```

**REPLACE WITH:**
```javascript
return res.redirect(`${FRONTEND_URL}/#/login?error=session_failed`);
```

---

### Change #7: Replace Line 333

**FIND:**
```javascript
res.redirect('http://localhost:5500/#/select-role');
```

**REPLACE WITH:**
```javascript
res.redirect(`${FRONTEND_URL}/#/select-role`);
```

---

### Change #8: Replace Line 339

**FIND:**
```javascript
res.redirect('http://localhost:5500/#/login?error=auth_failed');
```

**REPLACE WITH:**
```javascript
res.redirect(`${FRONTEND_URL}/#/login?error=auth_failed`);
```

---

### Optional: Remove Unused Import (Line 11)

**IF** `fs` is only used for google-oauth.json, remove:
```javascript
const fs = require('fs');  // ← Remove this line
```

**Check first:** Search for other `fs.` usage in the file. If found, keep the import.

---

## File 2: package.json

### Change #9: Add Node Version

**FIND THIS (end of file):**
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
    "@google/generative-ai": "^0.24.1",
    "bcrypt": "^6.0.0",
    "cookie-parser": "^1.4.6",
    "cors": "^2.8.5",
    "dotenv": "^17.4.0",
    "express": "^4.18.2",
    "express-rate-limit": "^8.3.2",
    "express-session": "^1.17.3",
    "express-validator": "^7.3.2",
    "google-auth-library": "^9.0.0",
    "helmet": "^8.1.0",
    "jsonwebtoken": "^9.0.3",
    "leaflet": "^1.9.4",
    "morgan": "^1.10.1",
    "pg": "^8.20.0",
    "qrcode": "^1.5.3",
    "socket.io": "^4.6.1",
    "socket.io-client": "^4.6.1"
  },
  "devDependencies": {
    "concurrently": "^8.2.2",
    "vite": "^8.0.8"
  }
}
```

**REPLACE WITH (add engines section):**
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
    "@google/generative-ai": "^0.24.1",
    "bcrypt": "^6.0.0",
    "cookie-parser": "^1.4.6",
    "cors": "^2.8.5",
    "dotenv": "^17.4.0",
    "express": "^4.18.2",
    "express-rate-limit": "^8.3.2",
    "express-session": "^1.17.3",
    "express-validator": "^7.3.2",
    "google-auth-library": "^9.0.0",
    "helmet": "^8.1.0",
    "jsonwebtoken": "^9.0.3",
    "leaflet": "^1.9.4",
    "morgan": "^1.10.1",
    "pg": "^8.20.0",
    "qrcode": "^1.5.3",
    "socket.io": "^4.6.1",
    "socket.io-client": "^4.6.1"
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

## File 3: .env.production

### Change #10: Fill in Production Environment Variables

**CURRENT (empty):**
```bash
# ── Production environment (fill in before deploying) ────────────────────────
DATABASE_URL=postgresql://username:password@host/database?sslmode=require
SESSION_SECRET=replace-with-secure-random-64-char-string
ALLOWED_ORIGINS=https://your-frontend.vercel.app
VITE_API_URL=https://your-backend.onrender.com
NODE_ENV=production
PORT=5000
```

**REPLACE WITH (fill in actual values):**
```bash
# ── Database ──────────────────────────────────────────────────────────────────
DATABASE_URL=postgresql://neondb_owner:npg_Y7OZqzfPNr3e@ep-square-frog-a134wnfe-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=verify-full

# ── Session & JWT ─────────────────────────────────────────────────────────────
SESSION_SECRET=<run: openssl rand -base64 48>
JWT_SECRET=<run: openssl rand -base64 48>

# ── Google OAuth ──────────────────────────────────────────────────────────────
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<get-from-google-cloud-console>
GOOGLE_REDIRECT_URI=https://YOUR-BACKEND.onrender.com/auth/google/callback

# ── Frontend URL ──────────────────────────────────────────────────────────────
FRONTEND_URL=https://YOUR-FRONTEND.vercel.app

# ── CORS ──────────────────────────────────────────────────────────────────────
ALLOWED_ORIGINS=https://YOUR-FRONTEND.vercel.app

# ── Environment ───────────────────────────────────────────────────────────────
NODE_ENV=production
PORT=5000

# ── Gemini AI (optional) ──────────────────────────────────────────────────────
GEMINI_API_KEY=<get-new-key-from-google-ai-studio>

# ── SMS SOS (optional) ────────────────────────────────────────────────────────
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=<get-new-from-twilio>
TWILIO_AUTH_TOKEN=<get-new-from-twilio>
TWILIO_FROM=+13204338091
```

**NOTE:** This file is for reference only. Set these in Render dashboard, not in the file.

---

## Summary of Changes

### Total Changes: 10

1. ✅ Replace google-oauth.json file loading with env vars
2. ✅ Add FRONTEND_URL variable
3. ✅ Replace redirect line 264
4. ✅ Replace redirect line 306
5. ✅ Replace redirect line 315
6. ✅ Replace redirect line 329
7. ✅ Replace redirect line 333
8. ✅ Replace redirect line 339
9. ✅ Add Node version to package.json
10. ✅ Fill in .env.production (reference only)

### Files Modified: 2
- `server/index.js` (8 changes)
- `package.json` (1 change)

### Time Required: ~10 minutes

---

## Verification Checklist

After making changes, verify:

- [ ] No syntax errors in server/index.js
- [ ] All 6 redirects use `${FRONTEND_URL}`
- [ ] FRONTEND_URL variable is defined
- [ ] Google OAuth uses env vars, not file
- [ ] package.json has engines section
- [ ] No hardcoded localhost:5500 in server/index.js

**Test locally:**
```bash
# Set env vars
export FRONTEND_URL=http://localhost:5500
export GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
export GOOGLE_CLIENT_SECRET=your-client-secret
export GOOGLE_REDIRECT_URI=http://localhost:5000/auth/google/callback

# Start server
npm run server

# Should start without errors
```

---

## Next Steps

After making these code changes:

1. Commit changes to Git
2. Push to GitHub
3. Update Google Cloud Console OAuth settings
4. Deploy to Render
5. Deploy to Vercel
6. Test production deployment

---

**All code changes are now documented. Ready to deploy! 🚀**

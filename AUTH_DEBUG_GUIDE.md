# Authentication 401 Error - Debug Guide

## What Was Fixed

### 1. Enhanced CORS Configuration
- Added explicit origin validation with logging
- Exposed `Set-Cookie` header for cross-origin requests
- Added all necessary HTTP methods
- Will log blocked origins to help diagnose issues

### 2. Detailed Authentication Logging
- Logs every authentication attempt
- Shows session ID and cookies present
- Indicates which auth method succeeded (JWT or session)
- Shows exactly why authentication fails

## How to Diagnose After Deployment

### Step 1: Check Server Logs
After deploying, when the 401 error occurs, check your server logs for:

```
[Auth] Request to: /api/users
[Auth] Session ID: <session-id>
[Auth] Session userId: <user-id or undefined>
[Auth] Cookies: <array of cookie names>
[Auth] ✅ Authenticated via session: <user-id>
```

OR

```
[Auth] ❌ No valid authentication found
```

### Step 2: Check Browser DevTools
1. Open DevTools (F12)
2. Go to Network tab
3. Click on the `/api/users` request
4. Check **Request Headers**:
   - Is `Cookie` header present?
   - Does it contain `connect.sid=...`?

5. Check **Response Headers**:
   - Status: 401?
   - Any CORS errors in console?

### Step 3: Check CORS Logs
If you see in server logs:
```
[CORS] Blocked origin: https://your-frontend.com
[CORS] Allowed origins: [...]
```

Then add your frontend URL to `ALLOWED_ORIGINS` environment variable.

## Common Issues & Solutions

### Issue 1: Session Cookie Not Being Sent
**Symptom**: `[Auth] Cookies: []` in logs

**Solution**: 
- Ensure frontend and backend are on same domain, OR
- Ensure `sameSite: 'none'` and `secure: true` in production
- Check browser isn't blocking third-party cookies

### Issue 2: Session Not Persisting
**Symptom**: `[Auth] Session userId: undefined`

**Solution**:
- User needs to log out and log back in
- Clear browser cookies
- Check `SESSION_SECRET` is set in environment

### Issue 3: CORS Blocking Origin
**Symptom**: `[CORS] Blocked origin: ...` in logs

**Solution**:
- Add frontend URL to `ALLOWED_ORIGINS` environment variable
- Format: `https://your-frontend.com,https://www.your-frontend.com`

### Issue 4: Wrong Domain
**Symptom**: Request going to wrong API URL

**Solution**:
- Check `VITE_API_URL` environment variable in frontend
- Should match your backend deployment URL

## Environment Variables to Check

### Backend (.env or deployment platform)
```env
ALLOWED_ORIGINS=https://your-frontend.com,https://www.your-frontend.com
SESSION_SECRET=your-secret-key
NODE_ENV=production
```

### Frontend (.env.production)
```env
VITE_API_URL=https://your-backend.com
```

## Quick Test
After deployment:
1. Log out completely
2. Clear all cookies for the site
3. Log back in as Authority
4. Try to access Tourists section
5. Check server logs for the authentication flow

## What Should Work Now
- ✅ Detailed logs show exactly what's failing
- ✅ CORS properly configured for cross-origin requests
- ✅ Session cookies work with `sameSite: 'none'` in production
- ✅ Navigation buttons work (separate fix)

## If Still Not Working
Share the server logs showing:
- `[Auth]` messages
- `[CORS]` messages (if any)
- `[Users API]` messages

This will pinpoint the exact issue!

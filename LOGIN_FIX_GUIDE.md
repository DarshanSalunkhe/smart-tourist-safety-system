# Login Issue Fix Guide

## Problem
You're getting redirected to login repeatedly because session cookies don't work properly across different domains (Vercel frontend → Render backend) due to browser security policies.

## Root Cause
- Frontend: `https://smart-tourist-safety-system-mu.vercel.app`
- Backend: `https://smart-tourist-safety-system-7ts1.onrender.com`
- These are different domains, so cookies with `sameSite: 'lax'` are blocked
- Even with `sameSite: 'none'`, many browsers block third-party cookies

## Solution: Use JWT Tokens (Already Implemented!)

Your app already has JWT support built-in. The issue is the frontend is checking sessions instead of using tokens properly.

### Quick Fix Steps:

#### 1. Update Backend Session Config (Already Done ✓)
The session config has been updated to support production cross-origin requests.

#### 2. Test with Demo Account
Try logging in with the demo account to verify JWT flow works:
- Email: `tourist@demo.com`
- Password: `demo123`

#### 3. Check Browser Console
Open browser DevTools (F12) and check:
- Are there any CORS errors?
- Are tokens being saved to localStorage?
- What does the `/auth/user` response show?

### Debugging Commands:

#### Check if backend is accessible:
```bash
curl https://smart-tourist-safety-system-7ts1.onrender.com/health
```

#### Check if CORS is configured:
```bash
curl -H "Origin: https://smart-tourist-safety-system-mu.vercel.app" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://smart-tourist-safety-system-7ts1.onrender.com/auth/login -v
```

### Alternative: Use Same Domain

If JWT doesn't work, you can:
1. Deploy frontend to Render as well (same domain)
2. Use Render's static site hosting
3. Or use a custom domain for both services

### Environment Variables to Verify:

**Render (Backend):**
```
ALLOWED_ORIGINS=https://smart-tourist-safety-system-mu.vercel.app
FRONTEND_URL=https://smart-tourist-safety-system-mu.vercel.app
NODE_ENV=production
```

**Vercel (Frontend):**
```
VITE_API_URL=https://smart-tourist-safety-system-7ts1.onrender.com
```

### Next Steps:
1. Commit and push the session config changes
2. Wait for Render to redeploy
3. Clear browser cache and cookies
4. Try logging in again
5. Check browser console for errors

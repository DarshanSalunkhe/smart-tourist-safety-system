# Vercel Deployment Troubleshooting Guide

## Current Status

✅ **Git Push**: Successfully pushed to GitHub (commit `bbd329f`)
✅ **Build**: Local build passes successfully
✅ **Changes**: User-specific theme preferences implemented

---

## Why Vercel Might Not Be Updating

### 1. **Vercel Not Connected to GitHub Repository**

Vercel needs to be connected to your GitHub repository to auto-deploy on push.

**Check:**
- Log in to [Vercel Dashboard](https://vercel.com/dashboard)
- Look for your project "smart-tourist-safety-system"
- Check if it shows "Connected to GitHub"

**Fix:**
1. Go to Vercel Dashboard → Projects
2. Click "Import Project" or "Add New"
3. Select "Import Git Repository"
4. Choose `DarshanSalunkhe/smart-tourist-safety-system`
5. Configure:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

---

### 2. **Auto-Deploy is Disabled**

**Check:**
- Go to Project Settings → Git
- Verify "Production Branch" is set to `main`
- Ensure "Automatic deployments" is enabled

**Fix:**
1. Project Settings → Git
2. Enable "Deploy on push to production branch"
3. Set production branch to `main`

---

### 3. **Build is Failing on Vercel**

Even though local build passes, Vercel might have different issues.

**Check:**
1. Go to Vercel Dashboard → Your Project
2. Click "Deployments" tab
3. Look for the latest deployment status
4. If failed, click on it to see build logs

**Common Vercel Build Issues:**

#### Missing Environment Variables
Vercel needs `VITE_API_URL` to be set.

**Fix:**
1. Project Settings → Environment Variables
2. Add:
   ```
   Name: VITE_API_URL
   Value: https://your-backend-url.onrender.com
   ```
3. Select "Production, Preview, Development"
4. Save
5. Redeploy: Deployments → Latest → "Redeploy"

#### Node Version Mismatch
**Fix:**
1. Project Settings → General
2. Set Node.js Version to `18.x` (matches package.json engines)

---

### 4. **Deployment Hook Not Triggered**

GitHub webhook might not be configured properly.

**Check:**
1. GitHub Repository → Settings → Webhooks
2. Look for a webhook pointing to `vercel.com`
3. Recent deliveries should show successful responses

**Fix:**
1. In Vercel: Project Settings → Git → Reconnect Repository
2. In GitHub: Settings → Webhooks → Edit the Vercel webhook
3. Click "Redeliver" on recent delivery to test

---

### 5. **Cache Issues**

Vercel might be serving cached version.

**Fix:**
1. Go to Deployments → Latest Deployment
2. Click three dots → "Redeploy"
3. Check "Use existing Build Cache" is **OFF**
4. Click "Redeploy"

---

## Manual Deployment (Quick Fix)

If auto-deploy isn't working, deploy manually:

```bash
# Install Vercel CLI (if not already)
npm install -g vercel

# Login
vercel login

# Deploy to production
vercel --prod
```

Follow prompts:
- Set up and deploy? **Y**
- Which scope? Choose your account
- Link to existing project? **Y** (if exists) or **N** (to create new)
- What's your project's name? `smart-tourist-safety-system`
- In which directory is your code located? `./`
- Override settings? **N**

---

## Verify Deployment

After deployment (auto or manual):

1. **Check Deployment URL**
   - Vercel Dashboard → Your Project → Visit button
   - URL format: `https://smart-tourist-safety-system.vercel.app`

2. **Test Theme Persistence**
   - Open DevTools → Application → Local Storage
   - Login as User A → Switch to Dark Mode
   - Verify `theme_user_1` key exists
   - Logout → Login as User B
   - Verify User B sees Light Mode (default)

3. **Check Console for Errors**
   - Open DevTools → Console
   - Look for any API connection errors
   - Verify `VITE_API_URL` is correct

---

## Common Deployment Errors

### Error: "Command 'npm run build' exited with 1"

**Cause**: Build failing on Vercel
**Fix**: Check build logs for specific error, often missing dependencies or environment variables

### Error: "Page Not Found"

**Cause**: Output directory mismatch
**Fix**: Verify Output Directory is set to `dist` in Project Settings

### Error: "Application Error"

**Cause**: Missing or incorrect `VITE_API_URL`
**Fix**: Add/update environment variable in Vercel dashboard

### Warning: "Your build spent significant time in plugins"

**Status**: ⚠️ Warning only (not blocking)
**Impact**: Build takes ~4-5 seconds instead of 2-3 seconds
**Action**: No action needed, build still succeeds

---

## Production Environment Variables

Ensure these are set in Vercel:

| Variable | Value | Purpose |
|----------|-------|---------|
| `VITE_API_URL` | `https://your-backend.onrender.com` | Backend API endpoint |
| `NODE_ENV` | `production` | Environment mode (auto-set by Vercel) |

**Note**: Only `VITE_*` variables are exposed to the frontend build.

---

## Latest Git Commit Pushed

```
commit bbd329f
Author: [Your Name]
Date: [Current Date]

feat: Implement user-specific theme preferences with proper isolation

- Created centralized theme service (src/services/theme.js)
- User-specific storage: theme_user_{userId}
- Integrated with auth lifecycle (login/logout)
- Updated all dashboards to use themeService
- Backward compatibility with migration
- Theme isolation between users verified
```

**Files Changed:**
- ✅ `src/services/theme.js` (NEW)
- ✅ `src/services/auth-api.js`
- ✅ `src/main.js`
- ✅ `src/pages/TouristDashboard.js`
- ✅ `src/pages/AuthorityDashboard.js`
- ✅ `src/pages/AdminDashboard.js`
- ✅ `THEME_USER_SPECIFIC_FIX.md` (NEW)

---

## Next Steps

1. ✅ **Verify Git Push**: `git log origin/main..HEAD` shows no unpushed commits
2. ⏳ **Check Vercel Dashboard**: See if deployment triggered
3. ⏳ **Review Build Logs**: If failed, identify the error
4. ⏳ **Test Production URL**: Verify theme persistence works
5. ⏳ **Monitor**: Wait 2-3 minutes for Vercel to detect push and build

---

## Quick Checklist

- [ ] Logged into Vercel Dashboard
- [ ] Project exists and is connected to GitHub
- [ ] Auto-deploy is enabled for `main` branch
- [ ] Latest deployment shows in Deployments tab
- [ ] Build logs show success (not failure)
- [ ] Environment variables are set (`VITE_API_URL`)
- [ ] Production URL loads without errors
- [ ] Theme persistence works on production

---

## Support

If Vercel still not updating:

1. **Check GitHub Webhook Status**: Repository → Settings → Webhooks
2. **Review Vercel Build Logs**: Full build output in Deployments → [Latest] → View Build Logs
3. **Test Manual Deploy**: Use `vercel --prod` CLI command
4. **Clear Build Cache**: Redeploy without cache
5. **Reconnect Repository**: Project Settings → Git → Disconnect & Reconnect

---

## Current Build Output

```
✓ 83 modules transformed
dist/index.html                    6.28 kB │ gzip: 2.25 kB
dist/assets/index-BWiWk99a.css    69.11 kB │ gzip: 12.30 kB
dist/assets/index-DNrgVPwo.js    244.05 kB │ gzip: 56.64 kB
✓ built in 4.28s
```

**Status**: ✅ Build successful locally
**Next**: Ensure Vercel receives and builds the same

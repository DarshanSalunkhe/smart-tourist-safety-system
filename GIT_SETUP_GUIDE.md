# ✅ Git Setup Complete!

## What Just Happened

1. ✅ Removed all secrets from documentation files
2. ✅ Pushed clean code to GitHub
3. ✅ Your code is now at: https://github.com/DarshanSalunkhe/smart-tourist-safety-system

---

## 🎯 Next Steps: Deploy to Production

### Step 1: Deploy Backend to Render

1. Go to: https://dashboard.render.com/
2. Click **New +** → **Web Service**
3. Click **Connect GitHub** → Select your repository: `smart-tourist-safety-system`
4. Configure:
   - **Name**: `smart-tourist-backend` (or your choice)
   - **Environment**: `Node`
   - **Branch**: `main`
   - **Build Command**: `npm install`
   - **Start Command**: `npm run server`
5. Click **Advanced** → **Add Environment Variables**
6. Copy values from `PRODUCTION_VALUES_COPY_PASTE.md` file
7. Click **Create Web Service**
8. Wait for deployment (5-10 minutes)
9. Copy your Render URL (e.g., `https://smart-tourist-backend.onrender.com`)

---

### Step 2: Update Google OAuth Redirect URIs

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click on your OAuth 2.0 Client ID
3. Under **Authorized redirect URIs**, add:
   ```
   https://YOUR-RENDER-URL.onrender.com/auth/google/callback
   ```
4. Keep the localhost URI for development
5. Click **Save**

---

### Step 3: Deploy Frontend to Vercel

1. Go to: https://vercel.com/new
2. Click **Import Git Repository**
3. Select: `DarshanSalunkhe/smart-tourist-safety-system`
4. Configure:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Click **Environment Variables** → Add:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://YOUR-RENDER-URL.onrender.com` (from Step 1)
   - **Environment**: Production, Preview, Development (all three)
6. Click **Deploy**
7. Wait for deployment (2-3 minutes)
8. Copy your Vercel URL (e.g., `https://smart-tourist-safety.vercel.app`)

---

### Step 4: Update Render Environment Variables

1. Go back to Render dashboard
2. Your service → **Environment** tab
3. Update these variables with your actual Vercel URL:
   - `FRONTEND_URL` = `https://YOUR-VERCEL-URL.vercel.app`
   - `ALLOWED_ORIGINS` = `https://YOUR-VERCEL-URL.vercel.app`
4. Click **Save Changes**
5. Render will automatically redeploy

---

### Step 5: Test Your Production Deployment

1. Visit your Vercel URL
2. Test Google OAuth login
3. Test chatbot
4. Test SOS button
5. Check Render logs for errors

---

## 📋 Environment Variables Checklist

### Render (Backend):
- [ ] DATABASE_URL
- [ ] SESSION_SECRET (generate new: `openssl rand -base64 48`)
- [ ] JWT_SECRET (generate new: `openssl rand -base64 48`)
- [ ] GOOGLE_CLIENT_ID
- [ ] GOOGLE_CLIENT_SECRET
- [ ] GOOGLE_REDIRECT_URI (with your Render URL)
- [ ] FRONTEND_URL (with your Vercel URL)
- [ ] ALLOWED_ORIGINS (with your Vercel URL)
- [ ] NODE_ENV=production
- [ ] PORT=5000
- [ ] GEMINI_API_KEY (optional)
- [ ] TWILIO credentials (optional)

### Vercel (Frontend):
- [ ] VITE_API_URL (with your Render URL)

---

## 🔒 Security Reminder

**DELETE** the `PRODUCTION_VALUES_COPY_PASTE.md` file after deployment!

It contains your actual secrets and should not be kept around.

---

## 🆘 Troubleshooting

### Issue: "OAuth redirect_uri_mismatch"
**Fix**: Update Google Cloud Console with your Render URL

### Issue: "CORS error"
**Fix**: Check `ALLOWED_ORIGINS` in Render matches your Vercel URL exactly

### Issue: "Cannot connect to database"
**Fix**: Verify DATABASE_URL in Render is correct

### Issue: "Server crashes on startup"
**Fix**: Check Render logs - likely missing environment variable

---

## ✅ Deployment Complete!

Once deployed, your app will be live at:
- **Frontend**: https://YOUR-VERCEL-URL.vercel.app
- **Backend**: https://YOUR-RENDER-URL.onrender.com

---

**Created:** April 22, 2026  
**Status:** ✅ Code pushed to GitHub  
**Next:** Deploy to Render and Vercel


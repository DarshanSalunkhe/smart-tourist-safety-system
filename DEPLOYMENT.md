# SafeTrip — Deployment Guide

## Prerequisites

- Node.js 18+
- npm
- PostgreSQL database (Neon recommended for free tier)
- Google OAuth credentials (`server/google-oauth.json`)

---

## Local Development

```bash
npm install
cp .env.example .env
# Fill in DATABASE_URL, SESSION_SECRET
npm run dev
```

| Service | URL |
|---------|-----|
| Frontend (Vite) | http://localhost:5500 |
| Backend (Express) | http://localhost:5000 |
| Health check | http://localhost:5000/health |

### Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Tourist | tourist@demo.com | demo123 |
| Authority | authority@demo.com | demo123 |
| Admin | admin@demo.com | demo123 |

---

## Environment Variables

### `.env` (development)

```env
DATABASE_URL=postgresql://user:pass@host/db?sslmode=verify-full
SESSION_SECRET=your-long-random-secret
JWT_SECRET=your-64-char-jwt-secret
PORT=5000
VITE_API_URL=http://localhost:5000
ALLOWED_ORIGINS=http://localhost:5500
NODE_ENV=development
GEMINI_API_KEY=your-gemini-api-key
SMS_PROVIDER=mock
```

### `.env.production`

```env
DATABASE_URL=postgresql://user:pass@host/db?sslmode=verify-full
SESSION_SECRET=replace-with-secure-64-char-string
JWT_SECRET=replace-with-secure-64-char-string
PORT=5000
VITE_API_URL=https://your-backend.onrender.com
ALLOWED_ORIGINS=https://your-frontend.vercel.app
NODE_ENV=production
GEMINI_API_KEY=your-gemini-api-key
SMS_PROVIDER=mock
```

`ALLOWED_ORIGINS` accepts comma-separated URLs for CORS.

---

## Production Build

```bash
npm run build        # builds frontend to dist/
npm run preview -- --host 0.0.0.0 --port 5500   # test production bundle locally
```

---

## Mobile / HTTPS Testing (Voice requires HTTPS)

```bash
# Terminal 1 — backend
npm run server

# Terminal 2 — production preview
npm run build
npm run preview -- --host 0.0.0.0 --port 5500

# Terminal 3 — HTTPS tunnel
cloudflared tunnel --url http://localhost:5500
```

Open the `https://...trycloudflare.com` URL on your phone. Voice recognition and mic permissions work over HTTPS only.

---

## Deploy: Frontend → Vercel / Netlify

1. Build: `npm run build`
2. Deploy `dist/` folder
3. Set environment variable: `VITE_API_URL=https://your-backend.onrender.com`

**Vercel:**
```bash
npm install -g vercel
vercel --prod
```

**Netlify:**
```bash
npm install -g netlify-cli
netlify deploy --prod --dir dist
```

---

## Deploy: Backend → Render / Railway

### Render

1. New Web Service → connect repo
2. Build command: `npm install`
3. Start command: `node server/index.js`
4. Add environment variables from `.env.production`
5. Health check path: `/health`

### Railway

```bash
railway login
railway init
railway up
railway variables set DATABASE_URL=... SESSION_SECRET=... ALLOWED_ORIGINS=...
```

---

## Database

The database auto-initializes on server start — all tables are created via `initializeDatabase()` in `server/db.js` if they don't exist.

Tables created automatically:

| Table | Purpose |
|-------|---------|
| `users` | Auth, profile, location tracking toggle |
| `incidents` | All incident reports and SOS events |
| `risk_zones` | Admin-defined danger areas |
| `sos_events` | SOS trigger log |
| `tourist_locations` | Location history |
| `chat_logs` | AI chatbot conversations |
| `voice_logs` | Voice note recordings |
| `system_logs` | Audit trail |

### Neon (recommended free tier)

1. Create project at [neon.tech](https://neon.tech)
2. Copy connection string → `DATABASE_URL` in `.env`
3. The app handles all schema creation on first boot

### Connection retry

The server retries DB connection 3 times with 3-second gaps — handles Neon's free-tier cold starts automatically. The first attempt timing out is normal and expected.

### Migration system

Migrations run automatically on every server start from `server/migrations/`. New migration files are applied in order; already-applied ones are skipped. Never edit an applied migration file — the SHA-256 checksum tamper detection will refuse to boot the server.

---

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials (Web application)
3. Add authorized redirect URI: `https://your-backend.onrender.com/auth/google/callback`
4. Also add `http://localhost:5000/auth/google/callback` for local dev
5. Download credentials → save as `server/google-oauth.json`

```json
{
  "web": {
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET",
    "redirect_uris": ["https://your-backend.onrender.com/auth/google/callback"]
  }
}
```

---

## Docker (optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["node", "server/index.js"]
```

```bash
docker build -t safetrip .
docker run -p 5000:5000 --env-file .env safetrip
```

---

## Security Checklist

- [ ] `SESSION_SECRET` is a long random string (64+ chars)
- [ ] `ALLOWED_ORIGINS` lists only your frontend domain
- [ ] `NODE_ENV=production` is set
- [ ] HTTPS is enforced on both frontend and backend
- [ ] `google-oauth.json` is in `.gitignore`
- [ ] `.env` is in `.gitignore`
- [ ] Database uses SSL (`sslmode=verify-full`)
- [ ] Rate limiting is active (default: 100 req/15min general, 10 req/15min auth)

---

## Health Check

`GET /health` returns:

```json
{
  "ok": true,
  "env": "production",
  "db": "connected",
  "websocket": "ready",
  "uptime": "42s"
}
```

Used by Render/Railway for automatic health monitoring.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `EADDRINUSE :5000` | Kill existing process: `netstat -ano \| findstr :5000` then `taskkill /PID <pid> /F` |
| DB connection timeout | Neon free tier sleeps — server retries 3x automatically, first timeout is normal |
| Voice not working on phone | Must use HTTPS — use cloudflared tunnel |
| Vite blocked host error | `allowedHosts: true` is set in `vite.config.js` |
| HMR timeout on tunnel | Use `npm run build && npm run preview` instead of `npm run dev` |
| CORS error | Add your frontend URL to `ALLOWED_ORIGINS` in `.env` |
| Google OAuth redirect mismatch | Ensure redirect URI in Google Console matches exactly (including http vs https) |
| Session not persisting | Check `SESSION_SECRET` is set and `NODE_ENV` is correct |
| Gemini 429 quota exceeded | Free tier daily limit hit — wait for midnight Pacific reset or use a different Google account |
| Migration tampered error | Never edit applied migration files — create a new numbered migration instead |
| `[object Object]` in chatbot | Fixed — `riskData.level` is now normalized to string label in `chatService.js` |

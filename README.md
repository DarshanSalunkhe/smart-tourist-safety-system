# SafeTrip — AI-Powered Predictive Tourist Safety & Smart Dispatch Platform

A full-stack real-time safety platform built for tourists across India. Moves beyond reactive alerts into predictive risk intelligence, multilingual voice AI, offline emergency recovery, and AI-driven authority dispatch.

---

## AI Intelligence Layers

| Layer | Description |
|-------|-------------|
| Real-time risk scoring | 5-factor engine: time, hotspot proximity, risk zones, movement, route deviation |
| Predictive escalation | Forecasts where risk is heading before it becomes critical |
| Route deviation AI | Detects abnormal direction changes using path history |
| Offline recovery | Queues SOS/incidents in localStorage, auto-syncs on reconnect |
| Smart dispatch | AI suggests authority actions per incident type + severity |
| Hotspot analytics | Peak hours, repeat zones, night escalation %, ranked cities |
| Hybrid chatbot | Rule-based instant replies + Gemini `gemini-2.0-flash-lite` fallback |

---

## Multilingual Support

5 languages, fully isolated per device via `localStorage`:

| Code | Language | Script |
|------|----------|--------|
| `en` | English | Latin |
| `hi` | Hindi | Devanagari |
| `mr` | Marathi | Devanagari |
| `ta` | Tamil | Tamil |
| `te` | Telugu | Telugu |

- First-time users get a browser-language suggestion banner (one-time, non-forced)
- Language preference is per-device — same role users can use different languages simultaneously
- All UI labels, toasts, voice prompts, and chatbot responses translate

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vite + Vanilla JS, Leaflet maps, Socket.IO client |
| Backend | Node.js + Express, Socket.IO, PostgreSQL (Neon) |
| Auth | Google OAuth 2.0 + session-based auth + JWT refresh |
| Realtime | Socket.IO bidirectional events |
| AI | Rule-based predictive engine + Gemini `gemini-2.0-flash-lite` hybrid chatbot |
| Offline | localStorage queue + auto-sync on reconnect |
| Voice | Web Speech API (recognition + synthesis) |
| i18n | Modular locale files (`src/i18n/*.js`) — 5 languages |
| Security | Helmet.js, rate limiting, bcrypt, express-validator |
| DB Migrations | Versioned SQL files + advisory lock + SHA-256 checksum tamper detection |

---

## Roles & Dashboards

### Tourist Dashboard (`src/pages/TouristDashboard.js`)

- Google OAuth + email login → Digital Safety ID (QR + Blockchain ID `BLK-XXXXXXXX`)
- Live GPS tracking with Socket.IO persistence
- Real-time Risk Score (0–100) + Predicted Score
- Voice alerts: high risk, zone entry, route deviation, predicted escalation
- Quick actions grid: SOS, Report Incident, AI Assistant, Share Location, SMS Fallback, My ID
- Incident reporting: GPS auto-detect or manual state/city/landmark
- Voice note recording attached to incidents
- SOS → offline queue + SMS fallback overlay if backend unreachable
- Floating AI chatbot with mic button — responds in selected language
- Settings: dark mode, language, voice commands, notifications, location sharing
- Full UI in selected language including all toasts and popups

### Authority Dashboard (`src/pages/AuthorityDashboard.js`)

- Command Center KPI strip — active tourists, unresolved, top hotspot, avg response time
- 70/30 command layout — large live map + alert rail with AI dispatch suggestions
- Incident heatmap overlay (leaflet.heat) with severity-weighted intensity
- Real-time incident feed with per-incident AI dispatch recommendations
- Demo Story Mode — 9-step guided simulation of the full safety flow
- Analytics: incident trends, severity distribution, tourist tracking rate
- AI Hotspot Intelligence — top unsafe city, peak hour, night escalation %, ranked zones

### Admin Panel (`src/pages/AdminDashboard.js`)

- Tabbed interface: Users · Risk Zones · Analytics · AI Thresholds · System Health · Demo · Logs
- User management with role/state/city filtering and deletion
- Risk zone map editor (add/delete zones, color-coded by level)
- AI threshold viewer (reads from `riskConfig.js`)
- System health check (pings `/health`, checks browser APIs, offline queue)
- Demo mode controls: generate fake tourists, zones, incidents

---

## Quick Start

```bash
npm install
cp .env.example .env
# Fill in DATABASE_URL and SESSION_SECRET
npm run dev
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5500 |
| Backend | http://localhost:5000 |
| Health | http://localhost:5000/health |

### Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Tourist | tourist@demo.com | demo123 |
| Authority | authority@demo.com | demo123 |
| Admin | admin@demo.com | demo123 |

---

## Risk Score System

Evaluated every 15 seconds across 5 factors:

| Factor | Max | Trigger |
|--------|-----|---------|
| Time of day | 25 | Night hours 22:00–05:00 |
| Incident proximity | 35 | Within 200m–2km of recent incident |
| Risk zone | 25 | Inside admin-defined danger area |
| Stationary | 15 | No movement for 10–30+ min |
| Route deviation | 12 | Abnormal direction change |

Safe (0–39) · Medium (40–69) · High (70–100)

Predictive score adds forward-looking bonuses to warn before risk becomes critical (threshold: 85). All thresholds are centralized in `src/constants/riskConfig.js`.

---

## Mobile / HTTPS Testing

Voice recognition requires HTTPS. For mobile testing:

```bash
# Build production bundle
npm run build
npm run preview -- --host 0.0.0.0 --port 5500

# HTTPS tunnel (new terminal)
cloudflared tunnel --url http://localhost:5500
```

Open the `https://...trycloudflare.com` URL on your phone.

---

## Project Structure

```
src/
├── i18n/           ← Locale files (en, hi, mr, ta, te)
├── components/     ← LocationFilter, ChatbotWidget, LanguageSwitcher
├── constants/      ← riskConfig.js (all AI thresholds)
├── pages/          ← TouristDashboard, AuthorityDashboard, AdminDashboard
├── services/       ← i18n, risk-engine, voice, offlineSync, apiClient, ...
└── utils/          ← notify.js (unified toast), apiHelper.js, time.js
server/
├── routes/         ← chatbot, voiceLogs, analytics, incidents, users, zones
├── services/       ← chatbotService (multilingual), dispatchRecommendation, smsService
├── middleware/     ← errorHandler, validation
├── utils/          ← dbHelper, time
└── index.js        ← Express + Socket.IO + all route registration
```

---

## Deployment

See `DEPLOYMENT.md` for full deployment instructions (Vercel, Render, Railway, Docker).

Update `.env.production` with your URLs, then:

```bash
npm run build
# Deploy dist/ to Vercel/Netlify
# Deploy server/ to Render/Railway
```

`ALLOWED_ORIGINS` in `.env` accepts comma-separated frontend URLs for CORS.

---

## Testing

See `TESTING.md` for step-by-step instructions on how to test every feature manually.

See `ROADMAP.md` for planned non-functional improvements (encryption, push notifications, GDPR compliance, etc.).

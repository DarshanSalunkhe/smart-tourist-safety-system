# SafeTrip — Complete Feature List

> Build status: Production-ready prototype · PostgreSQL · Real-time WebSocket · Hybrid Gemini AI · Multilingual voice · Predictive risk intelligence

---

## Authentication & Identity

- Email/password login and registration
- Google OAuth 2.0 — full redirect flow with role selection for new users
- Session-based auth (express-session) + JWT access/refresh tokens
- Dual auth support — Bearer token (JWT) and session cookie both accepted
- Blockchain-based Digital Safety ID — unique `BLK-XXXXXXXX` per user
- QR code generation from blockchain ID
- Emergency contact storage per user profile
- Profile editing (phone + emergency contact) with session sync
- Role-based access: Tourist, Authority, Admin

---

## Location & Tracking

- Real-time GPS tracking via browser Geolocation API
- Socket.IO persistence — location broadcast to all authority/admin clients
- Location active/inactive detection (30-second heartbeat window)
- Optimistic UI — tracking toggle updates instantly before server confirms
- Location filter by state/city across all dashboards
- Leaflet.js interactive map with OpenStreetMap tiles
- Incident heatmap overlay (leaflet.heat) with severity-weighted intensity
- Risk zone circles on map (color-coded by level)
- Tourist marker popups with name, blockchain ID, phone, last update
- Last known location fallback when GPS unavailable
- `location_active` column auto-migrated on existing DBs

---

## AI Risk Engine (`src/services/risk-engine.js`)

5-factor real-time scoring, evaluated every 15 seconds:

| Factor | Max Score | Trigger |
|--------|-----------|---------|
| Time of day (night hours) | 25 | 22:00–05:00 |
| Incident hotspot proximity | 35 | Within 200m–2km of recent incident |
| Risk zone proximity | 25 | Inside admin-defined danger area |
| Stationary detection | 15 | No movement for 10–30+ min |
| Route deviation | 12 | Abnormal direction change detected |

- Risk levels: Safe (0–39), Medium (40–69), High (70–100)
- Predictive score — forward-looking bonus calculation (`predictiveRiskService.js`), threshold 85
- Voice alerts fire on score change: high risk, zone entry, no movement, route deviation, predicted critical
- All thresholds centralized in `src/constants/riskConfig.js` (single source of truth)
- Path history (10 points) maintained for deviation detection
- Haversine distance calculation for accurate proximity detection
- `riskScoreUpdated` custom event dispatched for UI components to react

---

## Emergency & SOS

- One-tap SOS button (floating, always visible on tourist dashboard)
- SOS creates incident via `POST /api/incidents` with critical severity
- Offline fallback: SOS queued in `offlineQueue` localStorage key when backend unreachable
- SMS fallback overlay: pre-filled emergency SMS with GPS coords + Google Maps link + copy button
- Voice SOS: emergency phrases trigger SOS via continuous speech recognition
- SOS notification overlay on authority dashboard with RESPOND button
- Rate-limited SOS endpoint to prevent abuse

Emergency phrases detected: "help me", "help me now", "emergency", "i need help", "call police", "sos", "danger"

---

## Incident Management

- Incident types: Theft, Harassment, Medical Emergency, Lost/Stranded, Other, SOS
- Severity levels: Low, Medium, High, Critical
- Status workflow: new → in-progress → resolved
- Location capture: GPS auto-detect or manual state/city/landmark selection
- Voice note recording (MediaRecorder API) attached to incident, saved to `voice_logs` table
- Incident history per tourist with full details
- Authority actions: start progress, resolve, add notes
- AI dispatch suggestions per incident (type + severity based) — returned on every `GET /api/incidents`
- Real-time notifications via Socket.IO on new incident creation
- `PATCH /api/incidents/:id` — status update with Socket.IO broadcast

---

## Hybrid AI Chatbot

Architecture: Rules → Gemini fallback → Default

- Floating chat widget — redesigned with avatars, timestamps, typing indicator (`src/components/ChatbotWidget.js`)
- Unread badge on FAB when panel is closed
- Live risk banner at top of panel (updates via `riskScoreUpdated` event)
- Animated 3-dot typing indicator while waiting for response
- "🤖 Gemini is thinking…" label appears after 2s for slow Gemini calls
- Quick reply chips for common questions
- Speaker/mute toggle with icon feedback
- Multilingual responses in all 5 languages (en/hi/mr/ta/te)
- Keyword rules cover: risk, zone, SOS, safety, scam, night, help, local, SMS, offline, tracking
- Gemini `gemini-2.0-flash-lite` as fallback for free-form questions
- Response cache (50 entries) — identical questions reuse cached answer, zero API calls
- Circuit breaker — backs off 60s on 429, 10min on auth errors
- `maxOutputTokens: 80` — minimal token usage
- Chat logs saved to `chat_logs` PostgreSQL table
- Risk context (score + level label) normalized before sending to backend

---

## Voice AI (`src/services/voice.js`)

- Continuous SOS phrase detection (background mode, always listening)
- Single-shot AI query mode (triggered by mic button in chatbot)
- TTS prompt in selected language before mic starts
- `onend` fallback timer prevents mic never starting (browser bug workaround)
- `voiceInterimText` events show live transcript in chatbot input
- `voiceAIResponse` events push question + answer into chat panel
- `voiceAIError` events show user-friendly error messages
- Voice toggle persists per device in localStorage
- Voice alerts: speakAlert() for high-risk, zone entry, route deviation, predicted critical

---

## Multilingual System (`src/services/i18n.js`)

5 languages fully supported:

| Code | Language | Script |
|------|----------|--------|
| `en` | English | Latin |
| `hi` | Hindi | Devanagari |
| `mr` | Marathi | Devanagari |
| `ta` | Tamil | Tamil |
| `te` | Telugu | Telugu |

- Modular locale files: `src/i18n/en.js`, `hi.js`, `mr.js`, `ta.js`, `te.js`
- Per-device isolation via `localStorage` — no cross-user conflicts
- Language change triggers instant re-render via router (no page reload)
- Active sub-view preserved after language switch
- First-launch browser language suggestion (one-time, non-forced)
- No browser translate popup (`data-lang` attribute instead of `lang=`)
- Sidebar toggle cycles through all 5 languages
- Full translation coverage: UI labels, toasts, voice prompts, chatbot responses, all dashboards
- `riskData.level` object normalized to string label before chatbot API call

---

## Offline Resilience (`src/services/offlineSyncService.js`)

- Unified `offlineQueue` localStorage key for all event types
- Queues incidents and SOS when backend unreachable
- Auto-syncs on `window.addEventListener('online', syncOfflineQueue)`
- Failed items kept in queue for next attempt
- `offlineSyncComplete` event fires toast notification on success
- Online/offline status toasts in selected language

---

## Smart Alerts (`src/services/smart-alerts.js`)

- No movement detection alert
- Unsafe area entry alert
- Offline detection alert
- Risk threshold crossing alert
- All alerts delivered as toasts + optional voice

---

## Authority Command Center (`src/pages/AuthorityDashboard.js`)

- KPI strip: active tourists, unresolved incidents, top hotspot, avg response time, Run Demo button
- 70/30 command layout: large live map (left) + scrollable alert rail (right)
- Alert rail shows type, severity, user, city, first dispatch suggestion, Start/Resolve buttons
- Analytics band below map: Critical / High / Total / SOS counts
- AI Hotspot Intelligence card: top unsafe city, peak incident hour, night escalation %, ranked hotspot bar chart
- Tourists view: active tracking status, blockchain ID, contact info
- Full analytics: 7-day bar chart, incident type distribution, status donut, tourist stats
- Demo Story Mode button (9-step guided simulation)

---

## Demo Story Mode (`src/services/demoScenarioService.js`)

9-step guided simulation (4 seconds per step):

1. Tourist enters medium risk zone
2. Zone risk simulated
3. Route deviation simulated
4. Risk goes high — SOS triggered
5. SOS queued offline
6. SMS fallback shown
7. Reconnect + sync
8. Authority alerted with AI dispatch
9. Hotspot analytics updated

Each step includes voice narration via `speakAlert()`.

---

## Admin Panel (`src/pages/AdminDashboard.js`)

| Tab | Content |
|-----|---------|
| Users | List, filter by role/state/city, delete, stats by role |
| Risk Zones | Map editor, add/delete zones, color-coded by risk level |
| Analytics | Overview, severity distribution, monthly trends, top cities |
| AI Thresholds | Read-only view of `riskConfig.js` values |
| System Health | Pings `/health`, checks browser APIs, offline queue status |
| Demo | Activate/deactivate demo mode, generate fake tourists/zones |
| Logs | System activity log |

---

## Hotspot Analytics (`src/services/hotspotAnalyticsService.js`)

- City trend mapping: incident count per city
- Unsafe hours analysis: incident distribution by hour
- Top city ranking by incident count
- Peak hour detection: most dangerous time of day
- Night escalation risk: % of incidents between 20:00–05:00
- Heatmap visualization: Leaflet.heat overlay with severity-weighted intensity
- Real-time updates on incident creation

---

## Route Deviation (`src/services/routeDeviationService.js`)

- Abnormal direction detection using last 3 positions
- Path history tracking (up to 10 recent positions)
- Configurable threshold via `ROUTE_DEVIATION_THRESHOLD` in `riskConfig.js`
- Voice alert: "Warning. Your route has changed unexpectedly."
- Contributes 12 points to risk score when triggered

---

## Predictive Risk (`src/services/predictiveRiskService.js`)

- Forward-looking bonus calculation on top of real-time score
- Warns before risk becomes critical (threshold: 85)
- Factors in time-of-day trends and current score trajectory
- Voice alert fires when predicted score crosses critical threshold

---

## Database Migration System (`server/db.js`)

- Versioned SQL migrations in `server/migrations/`
- `schema_migrations` table tracks applied versions + SHA-256 checksum
- PostgreSQL advisory lock (`pg_advisory_lock`) prevents race conditions on multi-instance deploys
- Tamper detection — server refuses to boot if an applied migration file is modified
- Checksum backfill on first boot for pre-existing deployments
- Auto-runs on every server start, skips already-applied migrations

Current migrations:
- `001_init_schema.sql` — all 9 tables + indexes
- `002_add_location_active.sql` — location_active column

---

## Design System (`src/styles/main.css` v7)

- Command Center aesthetic: navy sidebar, trust blue primary, AI purple, state colors
- Components: `safety-status-card`, `quick-actions`, `ai-card`, `command-layout`, `alert-rail`, `metric-card`, `timeline`, `analytics-band`, `tab-bar`, `hotspot-bar`, `kpi-strip`, `spinner`, `tooltip`, `divider`
- Unified toast system (`src/utils/notify.js`) — `toast()` + `modal()`
- Central API client (`src/services/apiClient.js`) — all fetch calls in one place
- Dark mode fully supported across all components
- Mobile responsive with breakpoints at 1024px, 768px, 480px

---

## Security

- Helmet.js for security headers
- Rate limiting: 2000 req/15min general, 200 req/15min auth, 100 req/min SOS (dev); stricter in production
- CORS with allowed origins whitelist
- Input validation via express-validator
- Bcrypt password hashing (10 rounds)
- JWT tokens with 24h access / 7d refresh
- Session-based auth with httpOnly cookies
- Google OAuth credentials excluded from version control

---

## Database (PostgreSQL via Neon)

| Table | Purpose |
|-------|---------|
| `users` | Auth, profile, location tracking |
| `incidents` | All incident reports and SOS events |
| `risk_zones` | Admin-defined danger areas |
| `sos_events` | SOS trigger log |
| `tourist_locations` | Location history |
| `chat_logs` | AI chatbot conversations |
| `voice_logs` | Voice note recordings |
| `system_logs` | Audit trail |
| `consent_logs` | GDPR / IT Act compliance |
| `schema_migrations` | Migration version tracking |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check (db + websocket status) |
| POST | `/auth/login` | Email/password login |
| POST | `/auth/register` | New user registration |
| GET | `/auth/google` | OAuth redirect |
| GET | `/auth/google/callback` | OAuth callback |
| POST | `/auth/google/complete` | Complete OAuth with role selection |
| GET | `/auth/user` | Current session user |
| GET | `/auth/pending-google-user` | Pending OAuth user data |
| POST | `/auth/logout` | Destroy session |
| POST | `/auth/refresh` | Refresh JWT token |
| GET | `/api/incidents` | List incidents (with AI dispatch suggestions) |
| POST | `/api/incidents` | Create incident / SOS |
| PATCH | `/api/incidents/:id` | Update incident status + Socket.IO broadcast |
| GET | `/api/users` | List users (auth required) |
| PATCH | `/api/users/:id` | Update user profile (own profile only) |
| DELETE | `/api/users/:id` | Delete user (admin) |
| GET | `/api/risk-zones` | List risk zones |
| POST | `/api/risk-zones` | Create risk zone |
| DELETE | `/api/risk-zones/:id` | Delete risk zone |
| GET | `/api/analytics/overview` | Total incidents, resolved, SOS, severity breakdown |
| GET | `/api/analytics/severity` | Count per severity level |
| GET | `/api/analytics/monthly` | 12-month incident trend with critical count |
| GET | `/api/analytics/top-cities` | Ranked cities by incident count |
| GET | `/api/analytics/state-wise` | State-level incident breakdown |
| POST | `/api/chatbot` | Hybrid AI chatbot (rules + Gemini fallback) |
| POST | `/api/voice-log` | Save voice recording URL |

---

## Key Files

```
src/constants/riskConfig.js              ← All AI thresholds (single source of truth)
src/services/apiClient.js                ← All API calls centralized
src/utils/notify.js                      ← Unified toast + modal
src/services/chatService.js              ← riskData normalization before chatbot call
src/services/offlineSyncService.js       ← Offline queue + auto-sync
src/services/smsFallbackService.js       ← SMS emergency overlay
src/services/routeDeviationService.js    ← Route deviation detection
src/services/predictiveRiskService.js    ← Forward-looking risk score
src/services/hotspotAnalyticsService.js  ← City/hour analytics
src/services/demoScenarioService.js      ← 9-step demo simulation
src/services/smart-alerts.js             ← Smart alert triggers
src/components/ChatbotWidget.js          ← Redesigned chat UI with Gemini indicator
server/services/chatbotService.js        ← Hybrid AI (rules + Gemini + cache + circuit breaker)
server/services/dispatchRecommendationService.js ← AI dispatch suggestions
server/db.js                             ← Migration runner + advisory lock + checksum
server/migrations/                       ← Versioned SQL migration files
server/index.js                          ← Express + Socket.IO + all routes
```

---

Total features: 130+  |  Languages: 5  |  DB tables: 10  |  API endpoints: 25+  |  Migrations: 2

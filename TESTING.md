# SafeTrip — Feature Testing Guide

How to manually test and verify every feature in SafeTrip.

## Setup Before Testing

```bash
npm install
cp .env.example .env
# Set DATABASE_URL, SESSION_SECRET, GEMINI_API_KEY in .env
npm run dev
```

Open http://localhost:5500 in your browser.

---

## 1. Authentication

### Email Registration & Login

1. Go to http://localhost:5500
2. Click "Register" — fill in name, email, password, select role (Tourist)
3. Submit → redirected to Tourist Dashboard
4. Logout → Login with same credentials → verify redirect
5. Try wrong password → expect 401 error toast

### Google OAuth

1. Click "Sign in with Google"
2. Complete Google sign-in
3. New user → role selection page → pick role → submit
4. Returning user → redirected directly to dashboard
5. Verify name and email appear in profile

### JWT Token

1. Login → open DevTools → Application → Local Storage
2. Verify `st_access_token` and `st_refresh_token` are stored
3. Wait 24h or manually expire the token → verify auto-refresh works

### Role-Based Access

1. Login as tourist@demo.com / demo123 → Tourist Dashboard loads
2. Login as authority@demo.com / demo123 → Authority Dashboard loads
3. Login as admin@demo.com / demo123 → Admin Panel loads

---

## 2. Tourist Dashboard

### Digital Safety ID

1. Login as tourist → click "My ID"
2. Verify QR code and `BLK-XXXXXXXX` blockchain ID displayed
3. Verify QR encodes the blockchain ID

### GPS Tracking

1. Toggle "Share Location" ON → allow browser permission
2. Verify map centers on your location
3. Open Authority Dashboard in another tab → verify your marker appears
4. Toggle OFF → marker goes inactive within 30 seconds

### Risk Score

1. Enable location sharing
2. Observe risk score (0–100) updating every 15 seconds
3. Verify color: green (0–39), yellow (40–69), red (70–100)
4. Verify predicted score shown alongside live score

### Quick Actions Grid

All 6 buttons must be present and functional:
- SOS, Report Incident, AI Assistant, Share Location, SMS Fallback, My ID

### Profile Editing

1. Open settings → update phone + emergency contact → save
2. Refresh → verify changes persisted

---

## 3. Incident Reporting

### Report an Incident

1. Click "Report Incident" → select type, severity, location, description
2. Submit → success toast
3. Open Authority Dashboard → incident appears in alert rail

### Voice Note

1. Start reporting → click mic/record → speak → stop
2. Submit → verify voice note attached on authority view

### Status Workflow

1. Authority: click Start → status → in-progress
2. Authority: click Resolve → status → resolved
3. Tourist: verify incident history reflects change

### AI Dispatch Suggestions

1. Authority: open any incident in alert rail
2. Verify AI dispatch suggestion shown (varies by type + severity)

---

## 4. SOS

### Online SOS

1. Click SOS button → critical incident created
2. Authority Dashboard → SOS overlay appears with RESPOND button (no refresh)

### Offline SOS

1. Stop backend server
2. Click SOS → SMS fallback overlay appears with GPS coords
3. Check DevTools → Local Storage → `offlineQueue` has the SOS
4. Restart backend → auto-syncs → "Sync complete" toast

### Voice SOS

1. Enable voice commands (HTTPS required)
2. Say: "help me", "emergency", "sos", "call police", or "danger"
3. SOS triggers automatically

---

## 5. Hybrid AI Chatbot

### Panel UI

1. Click the 🤖 FAB (bottom right)
2. Verify panel opens with animation
3. Verify risk banner at top shows current score + level
4. Verify quick reply chips are shown on first open
5. Close panel → reopen → verify unread badge appears for new bot messages

### Rule-Based Replies (instant, ~2ms)

Type each and verify a relevant response:
- "risk score" → score + level response
- "SOS" → SOS instructions
- "night safety" → night tips
- "scam" → scam warnings
- "SMS" → SMS fallback explanation
- "offline" → offline sync explanation
- "tracking" → location tracking explanation

### Gemini Fallback (~8-12s on free tier)

Type something not covered by rules:
- "I lost my passport, what should I do?"
- "There's a flood near my hotel"
- "I feel sick and need a hospital"

Verify:
1. Typing indicator (3-dot bounce) appears immediately
2. After 2 seconds: "🤖 Gemini is thinking…" label appears
3. Response arrives (Gemini-generated, contextual)

### Multilingual Chat

1. Switch language to Hindi → type "रात में क्या करें?" → Hindi response
2. Switch to Tamil → type a question → Tamil response
3. Verify Gemini also responds in the selected language for free-form questions

### Voice Input

1. Click mic button → speak a question
2. Transcript appears live in input field
3. Response arrives and is spoken aloud (if speaker enabled)

### Speaker Toggle

1. Click 🔊 → becomes 🔇 (muted)
2. Send a message → no voice output
3. Click 🔇 → becomes 🔊 → voice resumes

### Chat Log Persistence

```sql
SELECT * FROM chat_logs ORDER BY created_at DESC LIMIT 5;
```
Verify messages saved with user_id and response.

---

## 6. Voice AI

### Continuous SOS Detection

1. Enable voice commands (HTTPS required)
2. Say "help me now" or "emergency"
3. SOS triggers without pressing any button

### Voice Alerts

1. Enter a risk zone → spoken alert fires
2. Risk score rises above 70 → spoken high-risk alert

### TTS Language

1. Switch to Tamil → trigger voice alert → spoken in Tamil

---

## 7. Multilingual System

### Language Switching

1. Settings → change to Hindi → all UI switches instantly
2. Active view preserved after switch
3. Refresh → language preference remembered

### All 5 Languages

For each (`en`, `hi`, `mr`, `ta`, `te`):
- Dashboard renders in that language
- Toasts appear in that language
- Chatbot responds in that language

---

## 8. Offline Resilience

1. Stop backend → report incident → check `offlineQueue` in localStorage
2. Trigger SOS → also queued
3. Restart backend → both auto-sync → "Sync complete" toast
4. Offline toast appears in selected language when backend stops
5. "Back online" toast when backend restarts

---

## 9. Authority Command Center

### KPI Strip

1. Verify: active tourists, unresolved incidents, top hotspot, avg response time
2. Create incident as tourist → unresolved count increments in real time

### Live Map

1. Tourist enables location → marker appears on authority map
2. Movement → marker updates position

### Heatmap

1. Create several incidents in same city
2. Authority map → heatmap intensity visible in that area

### Alert Rail

1. Create incident → appears in right-side rail
2. Verify: type, severity, user, city, AI dispatch suggestion
3. Start → Resolve → status updates in rail

### AI Hotspot Intelligence

1. Create multiple incidents in one city
2. Verify top unsafe city, peak hour, night escalation % calculated

---

## 10. Demo Story Mode

1. Authority → click "Run Demo"
2. Watch 9 steps (4s each) — map and alert rail update each step
3. Verify voice narration at each step

---

## 11. Admin Panel

### Users Tab

1. List all users → filter by role/state/city → delete test user

### Risk Zones Tab

1. Add zone on map → verify color-coded circle appears
2. Delete zone → removed from map
3. Tourist nearby → risk score increases

### Analytics Tab

1. Verify: total incidents, resolved, SOS count, severity chart, monthly trend, top cities

### AI Thresholds Tab

1. Verify all `riskConfig.js` values displayed, read-only

### System Health Tab

1. Click Check Health → `/health` returns `ok: true`
2. Browser API checks pass (geolocation, speech, notifications)

### Demo Tab

1. Generate fake tourists → markers on authority map
2. Generate fake zones → zones on map
3. Clear demo data → all removed

---

## 12. Risk Engine

### Real-Time Scoring

1. Enable location → score updates every 15 seconds
2. Night hours (22:00–05:00) → score higher
3. Create nearby incident → score increases
4. Enter risk zone → score increases
5. Stay still 10+ min → score increases

### Predictive Score

1. Rising live score → predicted score higher than live
2. Predicted score crosses 85 → voice alert fires

---

## 13. Route Deviation

1. Move consistently in one direction
2. Abruptly change direction
3. Route deviation adds ~12 points to risk score
4. Voice alert: "Warning. Your route has changed unexpectedly."

---

## 14. Hotspot Analytics

1. Create 5+ incidents in same city at different hours
2. Authority → AI Hotspot Intelligence card:
   - Top unsafe city correct
   - Peak hour reflects incident times
   - Night escalation % calculated
   - Bar chart ranks cities correctly

---

## 15. SMS Fallback

1. Click "SMS Fallback" → overlay shows pre-filled message with GPS + Maps link + risk score
2. Click Copy → message copied to clipboard

---

## 16. Smart Alerts

| Alert | Trigger |
|-------|---------|
| No movement | Stationary 10+ min with location enabled |
| Unsafe area entry | Enter admin-defined risk zone |
| Offline detection | Stop backend server |
| Risk threshold crossing | Score rises above 70 |

---

## 17. Database Migration System

1. Start server → verify `✅ Database schema up to date` in logs
2. Add a comment to `server/migrations/001_init_schema.sql` → restart server
3. Verify: `❌ Migration tampered: 001_init_schema.sql` — server refuses to boot
4. Revert the change → server boots normally
5. Create a new migration file `003_test.sql` with `SELECT 1;`
6. Restart → verify `✅ Migration applied: 003_test.sql`
7. Restart again → verify `✅ Database schema up to date` (not re-run)

---

## 18. API Endpoints (Direct Testing)

```bash
# Health
curl http://localhost:5000/health

# Login
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tourist@demo.com","password":"demo123"}'

# Chatbot (rule-based)
curl -X POST http://localhost:5000/api/chatbot \
  -H "Content-Type: application/json" \
  -d '{"message":"SOS help","lang":"en","riskData":{"score":45,"level":"Medium"}}'

# Chatbot (Gemini fallback)
curl -X POST http://localhost:5000/api/chatbot \
  -H "Content-Type: application/json" \
  -d '{"message":"I lost my passport","lang":"en","riskData":{"score":30,"level":"Safe"}}'

# Analytics
curl http://localhost:5000/api/analytics/overview
curl http://localhost:5000/api/analytics/top-cities
```

---

## 19. Real-Time Socket.IO

1. Tourist enables location → marker on authority map instantly
2. Tourist creates SOS → SOS overlay on authority dashboard (no refresh)
3. Tourist creates incident → appears in authority alert rail in real time
4. Authority resolves incident → status updates on tourist's history

---

## 20. Dark Mode

1. Settings → toggle Dark Mode ON → full UI switches
2. Refresh → preference remembered
3. Chatbot panel, cards, tables, forms all dark

---

## 21. Mobile Testing (HTTPS required for voice)

```bash
npm run build
npm run preview -- --host 0.0.0.0 --port 5500
cloudflared tunnel --url http://localhost:5500
```

Test on phone:
- Location permission prompt
- Mic permission prompt
- Voice SOS phrase detection
- Chatbot voice input/output
- SMS fallback copy button
- Responsive layout

---

## Quick Smoke Test Checklist

- [ ] Login with demo tourist account
- [ ] Location tracking toggles on/off
- [ ] Risk score updates every 15 seconds
- [ ] Report an incident successfully
- [ ] SOS button creates a critical incident
- [ ] Chatbot rule reply is instant (~2ms)
- [ ] Chatbot Gemini reply shows typing indicator + "thinking" label
- [ ] Language switch works (try Hindi)
- [ ] Authority dashboard shows live tourist markers
- [ ] Authority can start and resolve an incident
- [ ] Admin panel loads all tabs without errors
- [ ] `/health` returns `ok: true`
- [ ] Migration system shows "schema up to date" on restart

---

## 1. Authentication

### Email Registration & Login

1. Go to http://localhost:5500
2. Click "Register" — fill in name, email, password, select role (Tourist)
3. Submit → you should be redirected to the Tourist Dashboard
4. Click logout → go to Login → enter same credentials → verify redirect works
5. Try wrong password → expect error toast

### Google OAuth

1. Click "Sign in with Google" on the login page
2. Complete Google sign-in
3. If new user: you'll be redirected to role selection — pick a role and submit
4. If returning user: redirected directly to your dashboard
5. Verify your name and email appear in the profile

### Role-Based Access

1. Log in as tourist@demo.com / demo123 → verify Tourist Dashboard loads
2. Log in as authority@demo.com / demo123 → verify Authority Dashboard loads
3. Log in as admin@demo.com / demo123 → verify Admin Panel loads
4. Try navigating to `/authority` while logged in as tourist → should redirect

---

## 2. Tourist Dashboard

### Digital Safety ID

1. Log in as tourist
2. Click "My ID" in the quick actions grid
3. Verify a QR code and a `BLK-XXXXXXXX` blockchain ID are displayed
4. Verify the QR code encodes the blockchain ID

### GPS Tracking

1. On Tourist Dashboard, toggle "Share Location" ON
2. Browser will ask for location permission — allow it
3. Verify the map centers on your location with a marker
4. Open Authority Dashboard in another tab — verify your marker appears on the authority map
5. Toggle tracking OFF — verify the marker goes inactive on authority map within 30 seconds

### Risk Score

1. Enable location sharing
2. Observe the risk score (0–100) updating every 15 seconds
3. Verify the score color: green (0–39), yellow (40–69), red (70–100)
4. Check that a predicted score is also shown alongside the live score

### Quick Actions Grid

Verify all 6 buttons are present and functional:
- SOS — triggers SOS incident (see SOS section)
- Report Incident — opens incident form
- AI Assistant — opens chatbot widget
- Share Location — toggles GPS tracking
- SMS Fallback — opens SMS overlay
- My ID — shows Digital Safety ID

### Profile Editing

1. Open settings on Tourist Dashboard
2. Update phone number and emergency contact
3. Save → verify toast confirmation
4. Refresh page → verify changes persisted

---

## 3. Incident Reporting

### Report an Incident

1. Log in as tourist
2. Click "Report Incident"
3. Select type: Theft, Harassment, Medical Emergency, Lost/Stranded, or Other
4. Select severity: Low, Medium, High, or Critical
5. Location: click "Use GPS" or manually select state/city/landmark
6. Add a description
7. Submit → verify success toast
8. Open Authority Dashboard → verify the incident appears in the alert rail

### Voice Note on Incident

1. Start reporting an incident
2. Click the mic/record button in the incident form
3. Speak for a few seconds → stop recording
4. Submit the incident
5. On Authority Dashboard, open the incident → verify voice note is attached

### Incident Status Workflow

1. Log in as authority
2. Find an incident in the alert rail
3. Click "Start" → verify status changes to "in-progress"
4. Click "Resolve" → verify status changes to "resolved"
5. Log in as tourist → open incident history → verify status reflects the change

### AI Dispatch Suggestions

1. Log in as authority
2. Open any incident in the alert rail
3. Verify an AI dispatch suggestion is shown (e.g., "Deploy patrol unit" for theft)
4. Suggestions vary by incident type and severity

---

## 4. SOS

### Online SOS

1. Log in as tourist
2. Click the SOS button
3. Verify a critical incident is created
4. Open Authority Dashboard → verify SOS alert overlay appears with RESPOND button
5. Verify real-time Socket.IO notification (no page refresh needed)

### Offline SOS

1. Log in as tourist
2. Stop your backend server (Ctrl+C in the server terminal)
3. Click SOS on the tourist dashboard
4. Verify the SMS fallback overlay appears with pre-filled message including GPS coords
5. Verify the SOS is saved in localStorage (open DevTools → Application → Local Storage → `offlineQueue`)
6. Restart the backend server
7. Verify the queued SOS auto-syncs and a toast confirms sync completion

### Voice SOS

1. Log in as tourist (use HTTPS — see mobile testing in DEPLOYMENT.md)
2. Enable voice commands in settings
3. Say one of: "help me", "emergency", "sos", "call police", "danger"
4. Verify SOS is triggered automatically

---

## 5. AI Chatbot

### Basic Chat

1. Log in as tourist
2. Click the floating chat bubble (bottom right)
3. Type: "What is my risk score?" → verify a relevant response
4. Type: "What are common scams?" → verify safety tips response
5. Type: "How do I use SOS?" → verify feature explanation

### Multilingual Chat

1. Switch language to Hindi (hi) in settings
2. Open chatbot → type a question
3. Verify the response is in Hindi
4. Repeat for Marathi, Tamil, Telugu

### Voice Input in Chatbot

1. Open chatbot widget
2. Click the mic button
3. Speak a question (e.g., "What is my risk level?")
4. Verify the transcript appears in the input field
5. Verify the chatbot responds and speaks the answer aloud

### Chat Log Persistence

1. Send a few messages in the chatbot
2. Check the database: `SELECT * FROM chat_logs ORDER BY created_at DESC LIMIT 5;`
3. Verify messages are saved with user ID and language

---

## 6. Voice AI

### Continuous SOS Detection

1. Log in as tourist (HTTPS required for mic)
2. Enable voice commands in settings
3. Say "help me now" or "emergency"
4. Verify SOS is triggered without pressing any button

### Voice Alerts

1. Enable voice commands
2. Enter a risk zone (or use demo mode to simulate)
3. Verify a spoken alert fires: "Warning. You have entered a high risk area."
4. Let the risk score rise above 70 → verify spoken high-risk alert

### TTS Language

1. Switch language to Tamil
2. Trigger any voice alert (e.g., enter a risk zone)
3. Verify the spoken alert is in Tamil

---

## 7. Multilingual System

### Language Switching

1. Log in as tourist
2. Open settings → change language to Hindi
3. Verify all UI labels, button text, and toasts switch to Hindi instantly
4. Verify the active view (e.g., Map tab) is preserved after switching
5. Refresh the page → verify language preference is remembered

### All 5 Languages

Test each language code: `en`, `hi`, `mr`, `ta`, `te`

For each:
1. Switch to the language
2. Verify the dashboard renders in that language
3. Trigger a toast (e.g., toggle tracking) → verify toast is in that language
4. Open chatbot → verify response is in that language

### Browser Language Suggestion

1. Clear localStorage (DevTools → Application → Local Storage → Clear All)
2. Set your browser language to Hindi
3. Open the app → verify a one-time suggestion banner appears
4. Dismiss it → verify it doesn't appear again on refresh

---

## 8. Offline Resilience

### Queue and Sync

1. Log in as tourist
2. Stop the backend server
3. Report an incident → verify it's queued (check `offlineQueue` in localStorage)
4. Trigger SOS → verify it's also queued
5. Restart the backend
6. Verify both items auto-sync and a "Sync complete" toast appears

### Offline Status Toast

1. Stop the backend
2. Verify an "You are offline" toast appears in the selected language
3. Restart the backend
4. Verify a "Back online" toast appears

---

## 9. Authority Command Center

### KPI Strip

1. Log in as authority
2. Verify the top strip shows: active tourists, unresolved incidents, top hotspot, avg response time
3. Create a new incident as tourist → verify unresolved count increments in real time

### Live Map

1. Log in as tourist and enable location sharing
2. Log in as authority in another tab
3. Verify the tourist marker appears on the authority map
4. Move (or simulate movement) → verify marker updates position

### Heatmap

1. Create several incidents in the same city
2. Log in as authority → verify the heatmap shows intensity in that area
3. Higher severity incidents should show brighter/larger heat spots

### Alert Rail

1. Create an incident as tourist
2. Log in as authority → verify the incident appears in the right-side alert rail
3. Verify type, severity, user name, city, and AI dispatch suggestion are shown
4. Click Start → Resolve → verify status updates in the rail

### AI Hotspot Intelligence

1. Create multiple incidents in one city (e.g., Mumbai)
2. Log in as authority → scroll to the AI Hotspot Intelligence card
3. Verify that city appears as the top unsafe city
4. Verify peak hour and night escalation % are calculated

---

## 10. Demo Story Mode

1. Log in as authority
2. Click the "Run Demo" button in the KPI strip
3. Watch the 9-step simulation play out (4 seconds per step):
   - Step 1: Tourist enters medium risk zone
   - Step 2: Zone risk simulated
   - Step 3: Route deviation simulated
   - Step 4: Risk goes high — SOS triggered
   - Step 5: SOS queued offline
   - Step 6: SMS fallback shown
   - Step 7: Reconnect + sync
   - Step 8: Authority alerted with AI dispatch
   - Step 9: Hotspot analytics updated
4. Verify voice narration plays at each step
5. Verify the map and alert rail update during the simulation

---

## 11. Admin Panel

### Users Tab

1. Log in as admin
2. Open Users tab → verify all registered users are listed
3. Filter by role "tourist" → verify only tourists show
4. Filter by state/city → verify results narrow correctly
5. Delete a test user → verify they're removed from the list

### Risk Zones Tab

1. Open Risk Zones tab
2. Click on the map to add a new zone → set name, radius, risk level
3. Save → verify the zone appears on the map with correct color
4. Delete the zone → verify it's removed from the map
5. Log in as tourist → verify the zone affects the risk score when nearby

### Analytics Tab

1. Open Analytics tab
2. Verify overview stats: total incidents, resolved, new, in-progress, SOS count
3. Check severity distribution chart
4. Check monthly trend (6-month bar chart)
5. Check top cities ranked by incident count

### AI Thresholds Tab

1. Open AI Thresholds tab
2. Verify all values from `src/constants/riskConfig.js` are displayed
3. Confirm it's read-only (no edit controls)

### System Health Tab

1. Open System Health tab
2. Click "Check Health" → verify `/health` returns `ok: true`
3. Verify browser API checks (geolocation, speech, notifications)
4. Verify offline queue status shows current queue length

### Demo Tab

1. Open Demo tab
2. Click "Generate Fake Tourists" → verify 10 fake tourist markers appear on authority map
3. Click "Generate Fake Zones" → verify risk zones appear on the map
4. Click "Clear Demo Data" → verify all fake data is removed

### Logs Tab

1. Perform several actions (login, create incident, resolve incident)
2. Open Logs tab → verify entries appear with timestamps and action descriptions

---

## 12. Risk Engine

### Real-Time Scoring

1. Log in as tourist with location enabled
2. Observe the risk score updating every 15 seconds
3. Check each factor:
   - Time of day: score should be higher between 22:00–05:00
   - Incident proximity: create an incident nearby → score should increase
   - Risk zone: enter an admin-defined zone → score should increase
   - Stationary: stay still for 10+ minutes → score should increase
   - Route deviation: move in an unexpected direction → score should increase

### Predictive Score

1. Enable location and observe both live score and predicted score
2. When live score is rising, predicted score should be higher than live
3. When predicted score crosses 85, verify a voice alert fires

---

## 13. Route Deviation

1. Log in as tourist with location enabled
2. Walk or simulate a consistent direction for a few minutes
3. Abruptly change direction
4. Verify the route deviation factor adds ~12 points to the risk score
5. Verify a voice alert: "Warning. Your route has changed unexpectedly."

---

## 14. Hotspot Analytics

1. Create 5+ incidents in the same city at different hours
2. Log in as authority → open the AI Hotspot Intelligence card
3. Verify:
   - Top unsafe city is correct
   - Peak hour reflects when most incidents were created
   - Night escalation % is calculated (incidents between 20:00–05:00)
   - Bar chart ranks cities correctly

---

## 15. SMS Fallback

1. Log in as tourist
2. Click "SMS Fallback" in the quick actions grid
3. Verify the overlay shows a pre-filled SMS message with:
   - Your GPS coordinates
   - A Google Maps link
   - Your current risk score
4. Click "Copy" → verify the message is copied to clipboard
5. Verify the message is formatted for sending to emergency contacts

---

## 16. Smart Alerts

| Alert | How to Trigger |
|-------|---------------|
| No movement | Stay stationary for 10+ minutes with location enabled |
| Unsafe area entry | Enter an admin-defined risk zone |
| Offline detection | Stop the backend server |
| Risk threshold crossing | Let risk score rise above 70 |

Each alert should produce a toast notification and optionally a voice alert.

---

## 17. API Endpoints (Direct Testing)

Use curl or a tool like Postman/Insomnia.

```bash
# Health check
curl http://localhost:5000/health

# Login
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tourist@demo.com","password":"demo123"}'

# Get incidents (requires session cookie)
curl http://localhost:5000/api/incidents \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"

# Analytics overview
curl http://localhost:5000/api/analytics/overview \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"

# Top cities
curl http://localhost:5000/api/analytics/top-cities \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"

# Chatbot
curl -X POST http://localhost:5000/api/chatbot \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -d '{"message":"What is my risk score?","language":"en","riskScore":45,"riskLevel":"Medium"}'
```

Or use the included test scripts:

```bash
node test-users-api.js
node test-incidents-api.js
node test-analytics-api.js
```

---

## 18. Real-Time Socket.IO

1. Open Tourist Dashboard and Authority Dashboard side by side
2. Enable location on tourist → verify marker appears on authority map instantly
3. Create an SOS as tourist → verify SOS overlay appears on authority dashboard without refresh
4. Create a regular incident → verify it appears in the authority alert rail in real time
5. Resolve the incident as authority → verify status updates on tourist's incident history

---

## 19. Dark Mode

1. Log in as tourist
2. Open settings → toggle Dark Mode ON
3. Verify the entire UI switches to dark theme
4. Refresh → verify dark mode preference is remembered
5. Toggle OFF → verify it reverts to light mode

---

## 20. Mobile Testing

Voice recognition and mic permissions require HTTPS. Follow these steps:

```bash
# Terminal 1
npm run server

# Terminal 2
npm run build
npm run preview -- --host 0.0.0.0 --port 5500

# Terminal 3
cloudflared tunnel --url http://localhost:5500
```

On your phone, open the `https://...trycloudflare.com` URL and test:
- Location permission prompt
- Mic permission prompt
- Voice SOS phrase detection
- Chatbot voice input/output
- SMS fallback copy button
- Responsive layout (bottom nav should appear)

---

## Quick Smoke Test Checklist

Run through this after any major change:

- [ ] Login with demo tourist account
- [ ] Location tracking toggles on/off
- [ ] Risk score updates every 15 seconds
- [ ] Report an incident successfully
- [ ] SOS button creates a critical incident
- [ ] Chatbot responds to a message
- [ ] Language switch works (try Hindi)
- [ ] Authority dashboard shows live tourist markers
- [ ] Authority can start and resolve an incident
- [ ] Admin panel loads all tabs without errors
- [ ] `/health` returns `ok: true`

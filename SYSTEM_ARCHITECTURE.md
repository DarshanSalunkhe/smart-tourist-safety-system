# SafeTrip System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER (Browser)                                 │
│                                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐              │
│  │  Tourist         │  │  Authority       │  │  Admin           │              │
│  │  Dashboard       │  │  Dashboard       │  │  Dashboard       │              │
│  │  (Vite/Vanilla)  │  │  (Vite/Vanilla)  │  │  (Vite/Vanilla)  │              │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘              │
│           │                     │                     │                          │
│           └─────────────────────┴─────────────────────┘                          │
│                                 │                                                 │
│  ┌──────────────────────────────┴──────────────────────────────────┐            │
│  │              Frontend Services & Components                      │            │
│  │                                                                   │            │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │            │
│  │  │ i18n        │  │ Voice       │  │ Risk Engine │             │            │
│  │  │ Service     │  │ Service     │  │ (5-factor)  │             │            │
│  │  │ (5 langs)   │  │ (TTS/STT)   │  │ Real-time   │             │            │
│  │  └─────────────┘  └─────────────┘  └─────────────┘             │            │
│  │                                                                   │            │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │            │
│  │  │ Offline     │  │ Chatbot     │  │ Location    │             │            │
│  │  │ Sync Queue  │  │ Widget      │  │ Tracker     │             │            │
│  │  │ (localStorage)│ │ (AI)        │  │ (GPS)       │             │            │
│  │  └─────────────┘  └─────────────┘  └─────────────┘             │            │
│  │                                                                   │            │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │            │
│  │  │ Leaflet.js  │  │ Socket.IO   │  │ API Client  │             │            │
│  │  │ Maps        │  │ Client      │  │ (Fetch)     │             │            │
│  │  └─────────────┘  └─────────────┘  └─────────────┘             │            │
│  └───────────────────────────────────────────────────────────────┘            │
│                                                                                   │
└───────────────────────────────┬───────────────────────────────────────────────┘
                                │
                                │ 1. HTTP/HTTPS Requests
                                │ 2. WebSocket (Socket.IO)
                                │ 3. OAuth Redirects
                                │
┌───────────────────────────────┴───────────────────────────────────────────────┐
│                          MIDDLEWARE LAYER                                       │
│                                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Helmet.js    │  │ Rate Limiter │  │ CORS         │  │ Morgan       │      │
│  │ (Security)   │  │ (DDoS)       │  │ (Origins)    │  │ (Logging)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                         │
│  │ Session      │  │ JWT Auth     │  │ Validator    │                         │
│  │ (Cookie)     │  │ (Bearer)     │  │ (express-    │                         │
│  │              │  │              │  │  validator)  │                         │
│  └──────────────┘  └──────────────┘  └──────────────┘                         │
└───────────────────────────────┬───────────────────────────────────────────────┘
                                │
┌───────────────────────────────┴───────────────────────────────────────────────┐
│                        APPLICATION LAYER (Node.js/Express)                      │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                         REST API Routes                                  │  │
│  │                                                                           │  │
│  │  /auth/*          → Login, Register, OAuth, Logout, Refresh             │  │
│  │  /api/incidents   → Create, List, Update (PATCH), AI Dispatch           │  │
│  │  /api/users       → List, Update, Delete (RBAC)                         │  │
│  │  /api/risk-zones  → CRUD operations                                     │  │
│  │  /api/analytics/* → Overview, Severity, Monthly, Top Cities             │  │
│  │  /api/chatbot     → Hybrid AI (Rules + Gemini)                          │  │
│  │  /api/voice-log   → Save voice recordings                               │  │
│  │  /health          → System health check                                 │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                      Socket.IO Real-time Events                          │  │
│  │                                                                           │  │
│  │  location:update        → Tourist GPS broadcast                         │  │
│  │  newIncident            → New incident alert                            │  │
│  │  incident:status:broadcast → Status change notification                │  │
│  │  riskScoreUpdated       → Risk score change                             │  │
│  │  offlineSyncComplete    → Offline queue synced                          │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                         Backend Services                                 │  │
│  │                                                                           │  │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐     │  │
│  │  │ Chatbot Service  │  │ Dispatch AI      │  │ SMS Service      │     │  │
│  │  │ • Rule Engine    │  │ • Incident Type  │  │ • Twilio         │     │  │
│  │  │ • Gemini API     │  │ • Severity       │  │ • Emergency SMS  │     │  │
│  │  │ • Cache (50)     │  │ • Suggestions    │  │ • Fallback       │     │  │
│  │  │ • Circuit Breaker│  │                  │  │                  │     │  │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────┘     │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                      Database Migration System                           │  │
│  │                                                                           │  │
│  │  • Versioned SQL files (001_*, 002_*, ...)                              │  │
│  │  • SHA-256 checksum tamper detection                                    │  │
│  │  • PostgreSQL advisory lock (race condition prevention)                 │  │
│  │  • Auto-run on server start                                             │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬───────────────────────────────────────────────┘
                                │
                                │ SQL Queries
                                │ Connection Pool
                                │
┌───────────────────────────────┴───────────────────────────────────────────────┐
│                      DATABASE LAYER (PostgreSQL - Neon)                         │
│                                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ users        │  │ incidents    │  │ risk_zones   │  │ sos_events   │      │
│  │ • Auth       │  │ • Reports    │  │ • Danger     │  │ • SOS Log    │      │
│  │ • Profile    │  │ • SOS        │  │   Areas      │  │              │      │
│  │ • Location   │  │ • Status     │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ chat_logs    │  │ voice_logs   │  │ system_logs  │  │ consent_logs │      │
│  │ • AI Chat    │  │ • Voice      │  │ • Audit      │  │ • GDPR       │      │
│  │   History    │  │   Recordings │  │   Trail      │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                                                   │
│  ┌──────────────┐  ┌──────────────┐                                            │
│  │ tourist_     │  │ schema_      │                                            │
│  │ locations    │  │ migrations   │                                            │
│  │ • GPS        │  │ • Version    │                                            │
│  │   History    │  │ • Checksum   │                                            │
│  └──────────────┘  └──────────────┘                                            │
└───────────────────────────────────────────────────────────────────────────────┘


┌───────────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL SERVICES                                       │
│                                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐            │
│  │ Google OAuth 2.0 │  │ Gemini AI API    │  │ Twilio SMS       │            │
│  │ • Authentication │  │ • gemini-2.0-    │  │ • Emergency      │            │
│  │ • User Profile   │  │   flash-lite     │  │   Alerts         │            │
│  │                  │  │ • Chatbot        │  │                  │            │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘            │
│                                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐                                   │
│  │ OpenStreetMap    │  │ Web Speech API   │                                   │
│  │ • Map Tiles      │  │ • TTS (Browser)  │                                   │
│  │ • Leaflet.js     │  │ • STT (Browser)  │                                   │
│  └──────────────────┘  └──────────────────┘                                   │
└───────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### 1. User Authentication Flow

```
┌─────────┐                                    ┌─────────┐
│ Client  │                                    │ Server  │
└────┬────┘                                    └────┬────┘
     │                                              │
     │  1. POST /auth/login                         │
     │  { email, password }                         │
     ├─────────────────────────────────────────────>│
     │                                              │
     │                                         2. Query DB
     │                                         3. Verify Password
     │                                         4. Create Session
     │                                         5. Sign JWT Tokens
     │                                              │
     │  6. { accessToken, refreshToken, user }     │
     │<─────────────────────────────────────────────┤
     │                                              │
     │  7. Store tokens in localStorage             │
     │  8. Navigate to dashboard                    │
     │                                              │
```

### 2. Google OAuth Flow

```
┌─────────┐         ┌─────────┐         ┌─────────┐
│ Client  │         │ Server  │         │ Google  │
└────┬────┘         └────┬────┘         └────┬────┘
     │                   │                   │
     │ 1. Click "Sign in with Google"       │
     ├──────────────────>│                   │
     │                   │                   │
     │ 2. Redirect to Google OAuth           │
     ├──────────────────────────────────────>│
     │                   │                   │
     │ 3. User authenticates                 │
     │                   │                   │
     │ 4. Redirect to /auth/google/callback  │
     │<──────────────────────────────────────┤
     │                   │                   │
     │ 5. Exchange code for tokens           │
     │                   ├──────────────────>│
     │                   │                   │
     │                   │ 6. User profile   │
     │                   │<──────────────────┤
     │                   │                   │
     │                   │ 7. Check if user exists
     │                   │ 8. Create/update user
     │                   │ 9. Create session
     │                   │                   │
     │ 10. Redirect to dashboard             │
     │<──────────────────┤                   │
```

### 3. Real-time Location Tracking

```
┌──────────┐                    ┌─────────┐                    ┌──────────┐
│ Tourist  │                    │ Server  │                    │Authority │
│ Browser  │                    │         │                    │ Browser  │
└────┬─────┘                    └────┬────┘                    └────┬─────┘
     │                               │                              │
     │ 1. Enable tracking            │                              │
     ├──────────────────────────────>│                              │
     │                               │                              │
     │ 2. GPS position every 15s     │                              │
     ├──────────────────────────────>│                              │
     │                               │                              │
     │                          3. Update DB                        │
     │                          4. Calculate risk                   │
     │                               │                              │
     │                          5. Socket.IO broadcast              │
     │                               ├─────────────────────────────>│
     │                               │                              │
     │                               │  6. Update map marker        │
     │                               │                              │
     │ 7. Risk score updated         │                              │
     │<──────────────────────────────┤                              │
     │                               │                              │
     │ 8. Voice alert if high risk   │                              │
```

### 4. SOS Emergency Flow

```
┌──────────┐         ┌─────────┐         ┌──────────┐         ┌─────────┐
│ Tourist  │         │ Server  │         │Authority │         │ Twilio  │
│ Browser  │         │         │         │ Browser  │         │   SMS   │
└────┬─────┘         └────┬────┘         └────┬─────┘         └────┬────┘
     │                    │                    │                    │
     │ 1. Press SOS       │                    │                    │
     ├───────────────────>│                    │                    │
     │                    │                    │                    │
     │               2. Create incident        │                    │
     │               3. Save to DB             │                    │
     │                    │                    │                    │
     │               4. Send SMS alert         │                    │
     │                    ├────────────────────────────────────────>│
     │                    │                    │                    │
     │               5. Socket.IO broadcast    │                    │
     │                    ├───────────────────>│                    │
     │                    │                    │                    │
     │                    │  6. Show SOS notification              │
     │                    │  7. Play alert sound                   │
     │                    │                    │                    │
     │ 8. Confirmation    │                    │                    │
     │<───────────────────┤                    │                    │
     │                    │                    │                    │
     │ 9. Voice: "SOS activated"               │                    │
```

### 5. AI Chatbot Flow

```
┌─────────┐         ┌─────────┐         ┌─────────┐
│ Client  │         │ Server  │         │ Gemini  │
└────┬────┘         └────┬────┘         └────┬────┘
     │                   │                   │
     │ 1. User message   │                   │
     ├──────────────────>│                   │
     │                   │                   │
     │              2. Check cache           │
     │              3. Try rule engine       │
     │                   │                   │
     │              4. If no match, call Gemini
     │                   ├──────────────────>│
     │                   │                   │
     │                   │ 5. AI response    │
     │                   │<──────────────────┤
     │                   │                   │
     │              6. Cache response        │
     │              7. Save to chat_logs     │
     │                   │                   │
     │ 8. Response       │                   │
     │<──────────────────┤                   │
     │                   │                   │
     │ 9. TTS (if enabled)                   │
```

### 6. Risk Score Calculation

```
┌──────────────────────────────────────────────────────────┐
│              Risk Engine (Every 15 seconds)              │
└──────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Time of Day  │  │   Incident   │  │  Risk Zone   │
│   (0-25)     │  │  Proximity   │  │  Proximity   │
│              │  │   (0-35)     │  │   (0-25)     │
└──────────────┘  └──────────────┘  └──────────────┘
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Stationary   │  │    Route     │  │  Predictive  │
│  Detection   │  │  Deviation   │  │    Bonus     │
│   (0-15)     │  │   (0-12)     │  │   (0-15)     │
└──────────────┘  └──────────────┘  └──────────────┘
        │                 │                 │
        └─────────────────┴─────────────────┘
                          │
                          ▼
                ┌──────────────────┐
                │  Total Score     │
                │    (0-100)       │
                └──────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
   ┌────────┐       ┌────────┐       ┌────────┐
   │  Safe  │       │ Medium │       │  High  │
   │ (0-39) │       │(40-69) │       │(70-100)│
   └────────┘       └────────┘       └────────┘
```

## Technology Stack Details

### Frontend Stack
```
┌─────────────────────────────────────────┐
│ Build Tool: Vite 8.0.8                  │
├─────────────────────────────────────────┤
│ Framework: Vanilla JavaScript (ES6+)    │
├─────────────────────────────────────────┤
│ Maps: Leaflet.js + leaflet.heat         │
├─────────────────────────────────────────┤
│ Real-time: Socket.IO Client 4.6.1       │
├─────────────────────────────────────────┤
│ Voice: Web Speech API (Browser Native)  │
├─────────────────────────────────────────┤
│ QR Codes: qrcode 1.5.3                  │
├─────────────────────────────────────────┤
│ Storage: localStorage + IndexedDB       │
└─────────────────────────────────────────┘
```

### Backend Stack
```
┌─────────────────────────────────────────┐
│ Runtime: Node.js                        │
├─────────────────────────────────────────┤
│ Framework: Express 4.18.2               │
├─────────────────────────────────────────┤
│ Real-time: Socket.IO 4.6.1              │
├─────────────────────────────────────────┤
│ Database: PostgreSQL (Neon)             │
│ Driver: pg 8.20.0                       │
├─────────────────────────────────────────┤
│ Auth: express-session + JWT             │
│ OAuth: google-auth-library 9.0.0        │
│ Password: bcrypt 6.0.0                  │
├─────────────────────────────────────────┤
│ Security: helmet 8.1.0                  │
│ Rate Limit: express-rate-limit 8.3.2    │
│ Validation: express-validator 7.3.2     │
├─────────────────────────────────────────┤
│ AI: @google/generative-ai 0.24.1        │
│ SMS: Twilio (optional)                  │
├─────────────────────────────────────────┤
│ Logging: morgan 1.10.1                  │
└─────────────────────────────────────────┘
```

## Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Security Layers                          │
├─────────────────────────────────────────────────────────────┤
│ 1. Transport Layer                                          │
│    • HTTPS/TLS encryption                                   │
│    • Secure WebSocket (wss://)                              │
├─────────────────────────────────────────────────────────────┤
│ 2. Application Layer                                        │
│    • Helmet.js security headers                             │
│    • CORS with whitelist                                    │
│    • Rate limiting (DDoS protection)                        │
│    • Input validation (express-validator)                   │
├─────────────────────────────────────────────────────────────┤
│ 3. Authentication Layer                                     │
│    • Bcrypt password hashing (10 rounds)                    │
│    • JWT tokens (24h access / 7d refresh)                   │
│    • Session cookies (httpOnly, secure)                     │
│    • Google OAuth 2.0                                       │
├─────────────────────────────────────────────────────────────┤
│ 4. Authorization Layer                                      │
│    • Role-based access control (RBAC)                       │
│    • Resource ownership validation                          │
│    • Admin/Authority privilege checks                       │
├─────────────────────────────────────────────────────────────┤
│ 5. Data Layer                                               │
│    • SQL injection prevention (parameterized queries)       │
│    • Migration checksum validation                          │
│    • Advisory locks (race condition prevention)             │
└─────────────────────────────────────────────────────────────┘
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Production Setup                         │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Vercel     │         │   Render     │         │    Neon      │
│   (Frontend) │────────>│   (Backend)  │────────>│ (PostgreSQL) │
│              │  HTTPS  │              │   SSL   │              │
│  • Vite Build│         │  • Node.js   │         │  • Managed   │
│  • CDN       │         │  • Socket.IO │         │  • Backups   │
│  • SSL       │         │  • Auto-scale│         │  • Pooling   │
└──────────────┘         └──────────────┘         └──────────────┘
       │                        │
       │                        │
       └────────────────────────┘
                  │
                  ▼
         ┌──────────────┐
         │   Cloudflare │
         │   (Optional) │
         │  • DDoS      │
         │  • CDN       │
         │  • Firewall  │
         └──────────────┘
```

## Key Design Patterns

### 1. Service Layer Pattern
```
Controllers → Services → Database
   ↓            ↓          ↓
 Routes    Business Logic  Data
```

### 2. Real-time Event Pattern
```
Client Event → Socket.IO → Server → Broadcast → All Clients
```

### 3. Offline-First Pattern
```
Action → Try API → Success: Update UI
                 → Failure: Queue → Retry on reconnect
```

### 4. Circuit Breaker Pattern (Gemini AI)
```
Request → Check Circuit → Open: Return cached/default
                       → Closed: Call API → Success: Reset
                                          → Failure: Increment → Trip if threshold
```

### 5. Middleware Chain Pattern
```
Request → Security → Rate Limit → Auth → Validation → Controller → Response
```

## Performance Optimizations

1. **Database**
   - Connection pooling (pg)
   - Indexed columns (user_id, created_at, status)
   - Advisory locks for migrations

2. **Caching**
   - Chatbot response cache (50 entries)
   - Voice list cache (browser)
   - localStorage for offline data

3. **Real-time**
   - Socket.IO rooms for targeted broadcasts
   - Debounced location updates (15s)
   - Optimistic UI updates

4. **Frontend**
   - Vite code splitting
   - Lazy loading for maps
   - Service worker (future)

5. **API**
   - Rate limiting per endpoint
   - Pagination for large datasets
   - Compressed responses

---

**Total Components**: 50+  
**API Endpoints**: 25+  
**Database Tables**: 10  
**Real-time Events**: 5  
**Languages Supported**: 5  
**Security Layers**: 5

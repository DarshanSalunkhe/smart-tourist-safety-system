# SafeTrip — Non-Functional & Future Feature Roadmap

Everything that should be built to take SafeTrip from prototype to production-grade.
Items are grouped by category and prioritized High / Medium / Low.

---

## Security & Encryption

### High Priority

- **End-to-end encryption for incident reports**
  Encrypt sensitive incident data (description, location) at rest using AES-256 before storing in PostgreSQL. Only the reporting user and assigned authority can decrypt.

- **HTTPS enforcement**
  Force HTTPS redirect on all production routes. Currently relies on the hosting platform (Render/Vercel). Add `express-enforces-ssl` middleware for self-hosted deployments.

- **Secrets rotation**
  `SESSION_SECRET` and `JWT_SECRET` should be rotatable without downtime. Implement dual-secret validation window during rotation.

- **SQL injection hardening**
  All queries use parameterized statements — audit every raw query in `server/index.js` to confirm no string interpolation in SQL.

- **XSS protection**
  Sanitize all user-generated content (incident descriptions, chat messages) before rendering in the DOM. Use `DOMPurify` on the frontend.

- **CSRF protection**
  Add CSRF tokens for all state-changing POST/PATCH/DELETE requests. `csurf` middleware or `sameSite: strict` cookie policy.

- **Content Security Policy (CSP)**
  Currently `contentSecurityPolicy: false` in Helmet. Define a strict CSP that allows only known origins for scripts, styles, and API calls.

### Medium Priority

- **Voice note encryption**
  Audio files stored in `voice_logs` should be encrypted. Currently only the URL is stored — implement server-side encryption before saving to object storage.

- **Blockchain ID verification**
  The `BLK-XXXXXXXX` ID is currently a random string. Replace with a real cryptographic hash (SHA-256 of userId + timestamp + secret) for tamper-proof verification.

- **API key management**
  `GEMINI_API_KEY` is stored in `.env`. For production, use a secrets manager (AWS Secrets Manager, HashiCorp Vault, or Render's secret store).

- **Audit log integrity**
  `system_logs` table entries should be append-only with a hash chain so tampering is detectable.

---

## Privacy & Compliance

### High Priority

- **GDPR / Indian IT Act compliance**
  - Explicit consent before collecting GPS location (consent_logs table exists, needs UI)
  - Right to erasure: `DELETE /api/users/:id` exists but doesn't cascade to all related data
  - Data retention policy: auto-delete location history older than 30 days
  - Privacy policy page linked from login/register

- **Data minimization**
  Stop storing full location history in `tourist_locations`. Keep only last known position per user unless explicitly opted into history.

- **Anonymization for analytics**
  Analytics endpoints (`/api/analytics/*`) return raw city/state data. Aggregate and anonymize before exposing — no individual user data in analytics responses.

### Medium Priority

- **Cookie consent banner**
  Required for GDPR. Show on first visit, store preference in `consent_logs`.

- **Data export**
  Allow users to download all their data (incidents, chat logs, location history) as JSON — required by GDPR Article 20.

---

## Performance & Scalability

### High Priority

- **Database connection pooling**
  Currently using `pg.Pool` with `max: 10`. For production traffic, tune pool size based on expected concurrent users. Add connection pool monitoring.

- **API response caching**
  Analytics endpoints (`/overview`, `/top-cities`) are expensive queries. Cache responses in memory (node-cache) or Redis with a 60-second TTL.

- **Pagination**
  `GET /api/incidents` and `GET /api/users` return all rows. Add `limit` + `offset` or cursor-based pagination for large datasets.

- **Frontend bundle optimization**
  Run `npm run build` and analyze bundle size. Lazy-load heavy pages (AuthorityDashboard, AdminDashboard) using dynamic `import()`.

### Medium Priority

- **WebSocket scaling**
  Socket.IO currently uses in-memory adapter. For multiple server instances, add `@socket.io/redis-adapter` so events broadcast across all instances.

- **Rate limiting per user**
  Current rate limiting is IP-based. Add per-user rate limiting using JWT userId as the key to prevent authenticated abuse.

- **Database indexes**
  Add composite indexes for common query patterns:
  - `(user_id, created_at)` on incidents
  - `(state, city)` on incidents for filtered analytics
  - `(created_at)` on chat_logs for cleanup queries

- **Image/audio CDN**
  Voice note audio URLs currently point to placeholder URLs. Integrate with Cloudflare R2 or AWS S3 for actual audio storage with signed URLs.

### Low Priority

- **Read replicas**
  Separate read-heavy analytics queries to a Neon read replica.

- **Query result streaming**
  For large incident exports, stream results instead of loading all rows into memory.

---

## Reliability & Observability

### High Priority

- **Structured logging**
  Replace `console.log` with a structured logger (Winston or Pino). Log levels: error, warn, info, debug. Include request ID, userId, and timestamp in every log entry.

- **Error tracking**
  Integrate Sentry for both frontend and backend. Capture unhandled exceptions, promise rejections, and API errors with full stack traces.

- **Health check improvements**
  Current `/health` only checks DB connectivity. Add:
  - Gemini API reachability check
  - Socket.IO connection count
  - Memory usage
  - Pending migration count

- **Graceful shutdown**
  Handle `SIGTERM` and `SIGINT` to close DB connections, drain Socket.IO connections, and finish in-flight requests before exiting.

### Medium Priority

- **Uptime monitoring**
  Set up UptimeRobot or Better Uptime to ping `/health` every 60 seconds and alert on downtime.

- **Database backup**
  Neon provides automatic backups, but add a scheduled export to S3/R2 for disaster recovery.

- **Circuit breaker for external APIs**
  Gemini circuit breaker is implemented. Apply the same pattern to SMS provider and any future external API calls.

### Low Priority

- **Distributed tracing**
  Add OpenTelemetry for request tracing across frontend → backend → database → Gemini.

- **Metrics dashboard**
  Expose Prometheus metrics endpoint (`/metrics`) for Grafana dashboards.

---

## Push Notifications

### High Priority

- **Web Push Notifications (PWA)**
  Use the Push API + Service Worker to send notifications even when the app is closed:
  - SOS alert to authority
  - Risk score crossing threshold
  - Incident status change
  - Offline sync complete

  Implementation: `web-push` npm package, store push subscriptions in a new `push_subscriptions` table.

- **PWA manifest + Service Worker**
  Add `manifest.json` and a service worker for:
  - Installable on home screen
  - Offline page fallback
  - Background sync for offline queue

### Medium Priority

- **Email notifications**
  Send email alerts for:
  - SOS triggered (to emergency contact)
  - Account created (welcome email)
  - Password reset
  
  Use Resend or SendGrid with a simple template.

- **SMS notifications via Twilio**
  `SMS_PROVIDER=twilio` is already in `.env.example`. Wire up the Twilio integration in `server/services/smsService.js` for real SOS SMS delivery.

---

## AI & Intelligence Upgrades

### High Priority

- **Gemini context improvement**
  Pass more context to Gemini: nearby incident types, time of day, user's incident history. Better context = more relevant safety advice.

- **Gemini streaming responses**
  Use `generateContentStream()` instead of `generateContent()` to stream tokens as they arrive — eliminates the 10-second wait, shows response word by word.

- **Intent classification**
  Before hitting keyword rules or Gemini, run a lightweight intent classifier to route messages more accurately (e.g., detect "I need help" as SOS intent vs. general help).

### Medium Priority

- **Personalized risk scoring**
  Factor in user's incident history and travel patterns into the risk score. A tourist who has reported incidents before gets a higher baseline.

- **Predictive zone creation**
  Automatically suggest new risk zones to admins based on incident clustering (k-means on lat/lng).

- **Multilingual NLP improvement**
  Add more Hindi/regional language keywords to the rule engine. Currently ~10 keywords per language — expand to 50+ for better coverage before Gemini fallback.

### Low Priority

- **Offline AI**
  Bundle a tiny on-device model (ONNX Runtime Web) for basic intent detection when Gemini is unavailable.

- **Sentiment analysis on incident descriptions**
  Detect urgency/panic in incident text to auto-escalate severity.

---

## User Experience

### High Priority

- **Onboarding flow**
  First-time tourist gets a 3-step walkthrough: enable location, set emergency contact, test SOS.

- **Incident photo attachment**
  Allow tourists to attach a photo to incident reports. Store in object storage, reference URL in incidents table.

- **Authority response time tracking**
  Track time from incident creation to first authority action. Display avg response time in KPI strip (currently hardcoded).

### Medium Priority

- **Tourist panic button widget**
  Floating widget that's always visible, even when the app is in background (PWA + service worker).

- **Geofencing alerts**
  Notify tourist when they enter/exit a risk zone boundary, not just when the risk score changes.

- **Incident photo evidence**
  Allow authorities to attach photos/notes when resolving incidents.

- **Multi-language voice recognition**
  Currently mic uses `en-US` for reliability. Add language-specific recognition for Hindi (`hi-IN`), Tamil (`ta-IN`), Telugu (`te-IN`).

### Low Priority

- **Tourist social features**
  Allow tourists to mark locations as "safe" or "unsafe" — crowdsourced safety data.

- **Offline maps**
  Cache map tiles for the current area so the map works without internet.

- **Accessibility (a11y)**
  Full keyboard navigation, screen reader support (ARIA labels), high contrast mode.

---

## Infrastructure & DevOps

### High Priority

- **CI/CD pipeline**
  GitHub Actions workflow:
  1. Run linter on PR
  2. Run API test suite on merge to main
  3. Auto-deploy to Render/Vercel on merge to main

- **Environment separation**
  Separate dev / staging / production environments with separate databases and API keys.

- **Docker Compose for local dev**
  `docker-compose.yml` with PostgreSQL + Node.js so developers don't need a Neon account to run locally.

### Medium Priority

- **Automated database backups**
  Scheduled cron job to dump PostgreSQL to S3 daily.

- **Dependency vulnerability scanning**
  Add `npm audit` to CI pipeline. Currently 2 moderate vulnerabilities flagged.

- **Migration rollback**
  Add `down` SQL files alongside each migration for rollback capability:
  ```
  server/migrations/
    001_init_schema.up.sql
    001_init_schema.down.sql
  ```

### Low Priority

- **Kubernetes deployment**
  Helm chart for deploying SafeTrip on a Kubernetes cluster with horizontal pod autoscaling.

- **Multi-region deployment**
  Deploy backend in India region (Mumbai) for lower latency for Indian users.

---

## Testing

### High Priority

- **Automated API test suite**
  Replace the deleted manual test scripts with a proper test suite using Jest + Supertest. Cover all 25 API endpoints with happy path + error cases.

- **Frontend unit tests**
  Test risk engine calculations, i18n translations, and offline queue logic with Vitest.

- **Load testing**
  Use k6 or Artillery to simulate 100 concurrent tourists with location updates and verify Socket.IO handles the load.

### Medium Priority

- **End-to-end tests**
  Playwright tests for critical user flows: login → enable location → report incident → authority resolves.

- **Migration testing**
  Test that each migration is idempotent and that the tamper detection correctly rejects modified files.

### Low Priority

- **Visual regression testing**
  Percy or Chromatic snapshots of all dashboard views to catch unintended UI changes.

---

## Summary

| Category | High Priority Items | Est. Effort |
|----------|--------------------|----|
| Security | XSS, CSP, CSRF, HTTPS enforcement | 2-3 days |
| Privacy | GDPR consent UI, data retention, anonymization | 3-4 days |
| Performance | Pagination, caching, bundle optimization | 2-3 days |
| Reliability | Structured logging, Sentry, graceful shutdown | 1-2 days |
| Push Notifications | PWA + Web Push + Service Worker | 3-5 days |
| AI Upgrades | Gemini streaming, better context | 1-2 days |
| UX | Onboarding, photo attachments, response tracking | 3-4 days |
| DevOps | CI/CD, Docker Compose, env separation | 2-3 days |
| Testing | API test suite, load testing | 3-4 days |

Total estimated effort for all high-priority items: ~3-4 weeks of focused development.

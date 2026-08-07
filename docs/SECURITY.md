# Bite & Brew Cafe — Security Architecture

This document describes the production-grade authentication, session management, and anti-abuse system for the Bite & Brew Cafe backend.

> Stack: TypeScript · Node.js · Express · PostgreSQL (TypeORM) · Redis (ioredis) · JWT · Socket.IO · Docker · Nginx · Cloudflare

---

## 1. System Architecture

```
                    ┌──────────────────────────────┐
                    │       Frontend (React)        │
                    │  BroadcastChannel/locStorage  │
                    │  FingerprintJS (device hash)  │
                    └──────────────┬───────────────┘
                                   │ HTTPS / WSS
                                   ▼
              ┌────────────────────────────────────┐
              │   Cloudflare (CDN / WAF / DDoS)    │
              └──────────────┬─────────────────────┘
                             ▼
                    ┌────────────────────┐
                    │  Nginx (reverse    │
                    │  proxy / TLS)      │
                    └────────┬──────────┘
                             ▼
              ┌─────────────────────────────────────┐
              │        Express Application(s)        │
              │  ┌───────────────┐  ┌────────────┐  │
              │  │  Auth /       │  │  Socket.IO │  │
              │  │  Session /    │  │  (rooms)   │  │
              │  │  Security     │  └────────────┘  │
              │  │  Middleware   │                   │
              │  └───────────────┘                   │
              └──────┬──────────────┬───────────────┘
                     │              │
                     ▼              ▼
            ┌──────────────┐  ┌──────────────────────┐
            │  PostgreSQL   │  │      Redis           │
            │  (persistent  │  │  session:{userId}    │
            │   audit +     │  │  refresh:{tokenId}   │
            │   entities)   │  │  device:{hash}       │
            └──────────────┘  │  login_attempt:{ip}   │
                              │  registration:{ip}    │
                              │  rate_limit:{key}     │
                              └──────────────────────┘
```

**Key design principle:** Redis is the source of truth for active sessions (stateless, horizontally scalable API). PostgreSQL persists audit records, login history, registration attempts, and session metadata for the dashboard and forensics.

---

## 2. Auth Flow (Login → Active Session)

```
Login
  │
  ├─ validate credentials (bcrypt.compare)
  ├─ account lock check (lockedUntil)
  ├─ registration / login rate limiting
  ├─ build device fingerprint (FingerprintJS + UA parsing)
  ├─ create session UUID
  ├─ enforce single active session:
  │     • read current session:{userId} from Redis
  │     • if exists → mark revoked, delete Redis key
  │     • emit FORCE_LOGOUT to old socket + disconnect
  ├─ store session in Redis (TTL) + PostgreSQL
  ├─ create refresh token (rotation) → refresh:{tokenId}
  ├─ sign access token (15m) carrying {userId, sessionId, deviceHash}
  └─ return access_token + refresh_token + session_id (httpOnly cookies)
```

Every subsequent API request passes through `sessionAuth` middleware (see §5).

---

## 3. Single Active Session (Netflix-style)

- Key: `session:{userId}` (one active session per user).
- On a new login the previous session is revoked and the old Redis session deleted.
- The previous refresh token is invalidated.
- The previous socket receives `FORCE_LOGOUT` and is disconnected.
- Feature toggle: `SINGLE_ACTIVE_SESSION` (default `true`).

### Sequence

```
New login                    Prev session (Redis)        Prev socket
   │                              │                          │
   ├─ getActiveSession(userId) ──►│                          │
   │                              │                          │
   ├─ revokeSession(prevId) ─────►│ delete session:{userId}  │
   │                              │ mark DB revoked          │
   ├─ set session:{userId}=new ──► (new active session)      │
   │                              │                          │
   └─ FORCE_LOGOUT + disconnect ────────────────────────────►│
```

---

## 4. One Active Browser Tab

Implemented on the **frontend** (see `docs/FRONTEND_TAB_SYNC.md`):

- `BroadcastChannel` API to detect duplicate tabs.
- `localStorage` events as a fallback.
- Only the first tab remains active; secondary tabs show:
  > "This account is already active in another tab."
- A button transfers ownership to the new tab (revokes the old session and re-joins).
- Bound to the same `sessionId` to avoid infinite refresh loops.

---

## 5. Session Validation Middleware (`sessionAuth`)

Every protected request validates, in order:

| # | Check | Source |
|---|-------|--------|
| 1 | Access token present | Cookie / Bearer header |
| 2 | JWT signature + expiry | Access secret |
| 3 | User exists + `isActive` | PostgreSQL |
| 4 | Account not locked | `lockedUntil` |
| 5 | Redis session exists + `sessionId` match | `session:{userId}` |
| 6 | Device fingerprint match (configurable) | `x-device-id` hash |
| 7 | IP anomaly (configurable) | `x-forwarded-for` |

On success it attaches `req.user`, `req.sessionId`, `req.deviceHash`, `req.session` and touches the session activity timestamp.

---

## 6. Refresh Token Rotation

- Refresh token lifetime: 30 days (`JWT_REFRESH_EXPIRES_IN`).
- Each refresh token carries a unique `tokenId` + `sessionId`.
- On refresh:
  - Verify JWT signature + tokenId in Redis.
  - Mint a **new** refresh token (rotation).
  - Revoke the old token (Redis + DB).
  - Update the session.
- **Reuse detection:** if a used/revoked token is presented again, all sessions and tokens for the user are revoked (possible theft).

---

## 7. Device Fingerprinting

- Frontend integrates **FingerprintJS** → sends `x-device-id`.
- Backend `DeviceService.hashFingerprint()` produces a stable HMAC-SHA256 hash.
- Stored device attributes: browser, OS, platform, screen resolution, timezone, language, user agent.
- Fingerprint is a **risk signal**, never the sole auth factor.

---

## 8. Registration Anti-Abuse

- Per-IP windowed limit (`MAX_REGISTRATIONS_PER_IP`).
- Per-device windowed limit (`MAX_REGISTRATIONS_PER_DEVICE`).
- Velocity detection via Redis counters + DB fallback.
- Admin whitelist of trusted shared networks (`REGISTRATION_WHITELIST`).
- **No permanent IP bans** — limits are time-windowed.
- On exceed: `429` with a clear message.

---

## 9. Login History & Session Dashboard

- `GET /api/v1/bite-brew/sessions` — list active sessions + identify current device.
- `POST /api/v1/bite-brew/sessions/:sessionId/revoke` — revoke a session.
- `POST /api/v1/bite-brew/sessions/revoke-others` — revoke all except current.
- `POST /api/v1/bite-brew/sessions/logout-all` — logout all devices.
- `GET /api/v1/bite-brew/login-history` — recent login history (paginated).

---

## 10. Socket.IO Live Logout

- Socket.IO server authenticates each connection via the access token + Redis session.
- Sockets join `user:{id}` and `session:{id}` rooms.
- On session replacement / revocation, the old socket receives `FORCE_LOGOUT` and is disconnected.
- Frontend clears cookies/caches and redirects to login with:
  > "Your account was signed in from another device."

---

## 11. Redis Key Design

| Key | Purpose | TTL |
|-----|---------|-----|
| `session:{userId}` | Active session JSON | `SESSION_TTL_SECONDS` |
| `refresh:{tokenId}` | Refresh token metadata | refresh lifetime |
| `device:{deviceHash}` | Device risk signal | 30 days |
| `login_attempt:{ip}` | Failed-login counter | lock duration |
| `registration:{ip}` | Registrations per IP | window |
| `registration:device:{hash}` | Registrations per device | window |
| `rl:*` | rate-limiter-flexible | limiter duration |

---

## 12. Rate Limiting

Endpoint-specific, Redis-backed limiters (via `rate-limiter-flexible`):

| Endpoint | Points | Duration |
|----------|--------|----------|
| Login | 10 | 60s |
| Registration | 5 | 3600s |
| Refresh token | 30 | 60s |
| Password reset | per config | 60s |
| Public APIs | global limiter | 60s |

Global `rateLimit` middleware remains for all routes (auth: 80/60s, read: 900/60s, write: 240/60s).

---

## 13. Account Protection

- Temporary lock after `MAX_FAILED_LOGIN_ATTEMPTS` failed logins.
- Lock duration `ACCOUNT_LOCK_DURATION_SECONDS`.
- Password reset invalidates all sessions + tokens.
- Email verification before first login (configurable).
- Forced logout after password change.
- Idle session timeout `IDLE_SESSION_TIMEOUT_SECONDS`.
- Session expiration via Redis TTL.

---

## 14. Logging & Monitoring

- Structured security audit logs (`SecurityAuditService`) with correlation/request IDs.
- Security events (`SecurityEventService`) for login, logout, session lifecycle, refresh rotation, forced logout, device change, account lock, etc.
- **Sensitive data (passwords, tokens) are never logged.**

---

## 15. Error Handling

- Centralized global error handler returns consistent `{ message }` JSON.
- No stack traces or implementation details leak to clients.
- Maps known thrown errors to appropriate HTTP status codes.

---

## 16. Environment Variables

See `src/configs/env.config.ts`. Key security variables:

```
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
SESSION_TTL_SECONDS=2592000
SINGLE_ACTIVE_SESSION=true
DEVICE_FINGERPRINT_ENFORCED=true
IP_ANOMALY_ENFORCED=false
EMAIL_VERIFICATION_REQUIRED=false
IDLE_SESSION_TIMEOUT_SECONDS=172800
MAX_FAILED_LOGIN_ATTEMPTS=5
ACCOUNT_LOCK_DURATION_SECONDS=900
MAX_REGISTRATIONS_PER_IP=5
MAX_REGISTRATIONS_PER_DEVICE=3
REGISTRATION_WINDOW_SECONDS=86400
RATE_LIMIT_LOGIN_POINTS=10
RATE_LIMIT_LOGIN_DURATION=60
RATE_LIMIT_REGISTRATION_POINTS=5
RATE_LIMIT_REGISTRATION_DURATION=3600
RATE_LIMIT_REFRESH_POINTS=30
RATE_LIMIT_REFRESH_DURATION=60
SECURITY_AUDIT_ENABLED=true
DEVICE_HASH_SECRET=<random>
REGISTRATION_WHITELIST=<optional CIDR/IP list>
```

---

## 17. Deployment

1. Run migrations: `npm run build` then `node dist/index.js` (migrations auto-run on boot unless `RUN_MIGRATIONS=false`).
2. Docker image builds the app and runs migrations before serving.
3. Redis must be reachable (`REDIS_URL`).
4. Set `NODE_ENV=production` to enforce SQL SSL + stricter defaults.
5. Horizontal scaling: multiple replicas share the same Redis + PostgreSQL — no sticky sessions needed.

### Rollback Strategy

- **Schema:** reverse TypeORM migration (`typeorm migration:revert`) to drop new security tables.
- **Code:** redeploy the previous container image; the session middleware is additive and backward-compatible.
- **Behavior:** set `SINGLE_ACTIVE_SESSION=false` to disable single-active-session enforcement without a new deploy (env var).

### Migration Guide

- New tables are created by `1700000000000-CreateSecurityAndSessionTables.ts`.
- Existing `users` table is altered additively (columns added only if absent).
- All security writes are best-effort (never block requests) — Redis is the source of truth for active sessions.

---

## 18. Horizontal Scalability

- Stateless API: session state lives in Redis, not process memory.
- Connection pooling for PostgreSQL (`DB_POOL_MAX`).
- Redis pipelining for bulk session/refresh revocations.
- Socket.IO scales using the Redis adapter (add `socket.io-redis` for multi-instance live logout).

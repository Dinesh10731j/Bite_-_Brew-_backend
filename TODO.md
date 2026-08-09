# Load Balancer Implementation TODO

## Step 1: Config & Infrastructure Foundations
- [ ] `src/configs/instance.config.ts` — resolve/generate INSTANCE_ID
- [ ] `src/configs/shutdownState.ts` — isShuttingDown flag
- [ ] `src/configs/clientIp.ts` — safe client IP resolver (trust proxy hops)
- [ ] `src/configs/env.config.ts` — add INSTANCE_ID, TRUST_PROXY_HOPS, ENABLE_WORKERS, SHUTDOWN_TIMEOUT_MS
- [ ] `src/infrastructure/logger.ts` — structured JSON logger
- [ ] `src/infrastructure/redisHealth.ts` — Redis PING check
- [ ] `src/infrastructure/databaseHealth.ts` — DB SELECT 1 check + pool stats
- [ ] `src/infrastructure/shutdown.ts` — centralized graceful shutdown manager

## Step 2: Health & Readiness Endpoints
- [ ] `src/middleware/health.middleware.ts` — /health (liveness) + /ready (readiness)
- [ ] Wire /health, /ready into `src/configs/app.ts`

## Step 3: App Wiring & Trust Proxy
- [ ] `src/configs/app.ts` — env-driven trust proxy, mount health/metrics, request-id logging middleware
- [ ] `src/utils/logger.ts` — add structured JSON logging
- [ ] `src/observability/context.ts` — add OTel semantic attributes (instance.id, http.*)

## Step 4: Distributed Rate Limiting
- [ ] `src/middleware/rateLimit.middleware.ts` — force Redis limiter, use safe client IP
- [ ] `src/middleware/securityRateLimit.middleware.ts` — use shared Redis client + safe IP

## Step 5: Redis & Workers
- [ ] `src/configs/redis.config.ts` — export pingRedis()
- [ ] `src/queue/bullmq.config.ts` — reuse shared connection, expose close
- [ ] `src/queue/email.worker.ts` — gate worker by ENABLE_WORKERS

## Step 6: Bootstrap / Graceful Shutdown
- [ ] `src/index.ts` — instance ID, readiness flip on shutdown, close workers, structured logs

## Step 7: Tracing Resource Attributes
- [ ] `src/observability/tracing.ts` — add service.name, deployment.environment, instance.id

## Step 8: Docker & Environment
- [ ] `Dockerfile` — improve multi-stage (npm ci, non-root, health behavior)
- [ ] `.dockerignore` — improve
- [ ] `.env.example` — safe placeholders
- [ ] `docker-compose.yml` — nginx + api-1/2/3 + postgres + redis

## Step 9: Kubernetes Production Config
- [ ] `k8s/base/deployment.yaml` — probes /ready + /health, INSTANCE_ID downward API
- [ ] `k8s/base/configmap.yaml` — worker/runtime flags

## Step 10: Deployment Docs
- [ ] `deployment/README.md` — architecture, pool calc, deploy, rollback
- [ ] `deployment/load-balancer/nginx.conf` — local reverse proxy

## Step 11: Tests
- [ ] `tests/unit/health.spec.ts` — /health, /ready, request ID, shutdown, rate limit, proxy

---

# Redis Connection Fix (completed)

**Root cause:** `redis.config.ts` read `process.env.REDIS_URL` synchronously at module-load time before `env.config.ts` invoked `dotenv.config()`, causing a fallback to `127.0.0.1:6379` instead of the configured Upstash `REDIS_URL`.

**Fix applied:**
- [x] Added `REDIS_HOST` and `REDIS_PORT` to `src/configs/env.config.ts`
- [x] Updated `src/configs/redis.config.ts` to import `envConfig` and use `envConfig.REDIS_URL` / `REDIS_HOST` / `REDIS_PORT`
- [x] Verified build passes (`tsc -p tsconfig.json` succeeded)
- [ ] Restart dev server and confirm log shows `redis.connected`

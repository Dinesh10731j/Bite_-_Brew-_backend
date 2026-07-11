# Observability System Implementation TODO

## Scope
Production-grade observability: Prometheus metrics, OpenTelemetry tracing, structured/correlated logging, and stage-level breakdown for latency.

## Steps
- [x] 1) Create OTel tracing bootstrap under `src/observability/` and wire it in early app startup.

- [x] 2) Extend `src/observability/metrics.ts` with custom metrics (request duration histograms, throughput counters, error counters, bytes in/out).

- [x] 3) Add request correlation middleware (request_id, attach trace context) in `src/configs/app.ts`.

- [ ] 4) Instrument request lifecycle in `src/configs/app.ts` to observe total latency + serialization timing approximation.
- [ ] 5) Ensure `/metrics` still works and includes both default and custom metrics.
- [ ] 6) Add placeholder structured logging correlation (request_id/trace_id) without breaking existing Morgan.
- [ ] 7) Add DB + Redis stage spans/metrics instrumentation (after base wiring).
- [ ] 8) Add queue (BullMQ) job metrics instrumentation.
- [ ] 9) Add Grafana/Alertmanager dashboard + rules (provisioning artifacts).
- [ ] 10) Run tests and a smoke check: `GET /livez`, `GET /readyz`, `GET /metrics`.


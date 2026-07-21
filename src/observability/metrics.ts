import client from 'prom-client';
import { Request } from 'express';

const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

// ---- Custom metrics ----
// Label strategy: keep cardinality bounded.
// route: use route path if available, otherwise fallback to normalized target.
// status: 4xx/5xx buckets.
const statusBucket = (statusCode: number) => {
  if (statusCode >= 500) return '5xx';
  if (statusCode >= 400) return '4xx';
  if (statusCode >= 300) return '3xx';
  if (statusCode >= 200) return '2xx';
  return String(statusCode);
};

export const httpRequestDurationMs = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'HTTP request latency in milliseconds',
  labelNames: ['method', 'route', 'status_bucket'],
  buckets: [
    5, 10, 25, 50, 75, 100, 150, 200, 300, 400, 600, 800, 1000, 1500, 2000, 3000, 5000,
    8000, 10000,
  ],
  registers: [registry],
});

export const httpRequestTotal = new client.Counter({
  name: 'http_request_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_bucket'],
  registers: [registry],
});

export const httpRequestBytesInTotal = new client.Counter({
  name: 'http_request_bytes_in_total',
  help: 'Total bytes received from clients',
  labelNames: ['route'],
  registers: [registry],
});

export const httpResponseBytesOutTotal = new client.Counter({
  name: 'http_response_bytes_out_total',
  help: 'Total bytes sent to clients',
  labelNames: ['route'],
  registers: [registry],
});

export const httpSerializationDurationMs = new client.Histogram({
  name: 'http_serialization_duration_ms',
  help: 'Approx serialization/deserialization duration',
  labelNames: ['route'],
  buckets: [5, 10, 25, 50, 75, 100, 200, 400, 800, 1500, 3000],
  registers: [registry],
});

export const loyaltyPointsMovedTotal = new client.Counter({
  name: 'loyalty_points_moved_total',
  help: 'Total loyalty points moved by transaction type and source',
  labelNames: ['type', 'source'],
  registers: [registry],
});

export const loyaltyTransactionsTotal = new client.Counter({
  name: 'loyalty_transactions_total',
  help: 'Total loyalty transactions by type and source',
  labelNames: ['type', 'source'],
  registers: [registry],
});

export const loyaltyRewardRedemptionsTotal = new client.Counter({
  name: 'loyalty_reward_redemptions_total',
  help: 'Total reward redemptions grouped by reward type',
  labelNames: ['reward_type'],
  registers: [registry],
});

export const loyaltyReferralCompletionsTotal = new client.Counter({
  name: 'loyalty_referral_completions_total',
  help: 'Total completed loyalty referrals',
  registers: [registry],
});

export const recordLoyaltyTransaction = (params: { type: string; source?: string; amount: number }): void => {
  const source = params.source || 'UNKNOWN';
  loyaltyTransactionsTotal.labels(params.type, source).inc(1);
  loyaltyPointsMovedTotal.labels(params.type, source).inc(Math.abs(params.amount));
};

export const recordRewardRedemption = (rewardType: string): void => {
  loyaltyRewardRedemptionsTotal.labels(rewardType).inc(1);
};

export const recordReferralCompletion = (): void => {
  loyaltyReferralCompletionsTotal.inc(1);
};

export const getRouteLabel = (req: Request): string => {
  const routePath = req.route?.path;
  if (routePath) return String(routePath);
  // Normalize: remove querystring-ish patterns
  return String(req.originalUrl || req.url).split('?')[0];
};

export const recordHttpRequest = (params: {
  req: Request;
  resStatusCode: number;
  durationMs: number;
  bytesIn?: number;
  bytesOut?: number;
  serializationMs?: number;
}): void => {
  const route = getRouteLabel(params.req);
  const sb = statusBucket(params.resStatusCode);

  httpRequestTotal.labels(params.req.method, route, sb).inc(1);
  httpRequestDurationMs.labels(params.req.method, route, sb).observe(params.durationMs);

  if (typeof params.bytesIn === 'number' && Number.isFinite(params.bytesIn)) {
    httpRequestBytesInTotal.labels(route).inc(params.bytesIn);
  }

  if (typeof params.bytesOut === 'number' && Number.isFinite(params.bytesOut)) {
    httpResponseBytesOutTotal.labels(route).inc(params.bytesOut);
  }

  if (typeof params.serializationMs === 'number' && Number.isFinite(params.serializationMs)) {
    httpSerializationDurationMs.labels(route).observe(params.serializationMs);
  }
};

export const getMetrics = async (): Promise<string> => registry.metrics();
export const metricsContentType = registry.contentType;

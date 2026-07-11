import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
const otelEnabled = () => {
  const v = process.env.OTEL_ENABLED;
  if (v === undefined) return true;
  return v === 'true' || v === '1';
};


const setupDiagnostics = () => {
  const level = (process.env.OTEL_LOG_LEVEL || '').toLowerCase();
  if (level === 'debug') {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
  } else if (level === 'info') {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);
  }
};


export const initTracing = (): void => {
  setupDiagnostics();
  if (!otelEnabled()) return;

  const exporterEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

  if (!exporterEndpoint) {
    // Fail open: tracing disabled if no exporter endpoint.
    // Metrics will still work.
    console.warn('[Tracing] OTEL exporter endpoint not set; skipping tracing init');
    return;
  }

  const sdk = new NodeSDK({
    traceExporter: new OTLPTraceExporter({
      url: `${exporterEndpoint.replace(/\/$/, '')}/v1/traces`,
      headers: process.env.OTEL_EXPORTER_OTLP_HEADERS
        ? JSON.parse(process.env.OTEL_EXPORTER_OTLP_HEADERS)
        : undefined,
    }),
    instrumentations: [getNodeAutoInstrumentations()],
  });

  try {
    // sdk.start() typing can vary by package version; run fail-open.
    const maybePromise = (sdk as any).start();
    if (maybePromise && typeof maybePromise.then === 'function') {
      maybePromise
        .then(() => console.log('[Tracing] OpenTelemetry initialized'))
        .catch((err: unknown) =>
          console.error('[Tracing] Failed to initialize OpenTelemetry', err)
        );
    } else {
      console.log('[Tracing] OpenTelemetry initialized');
    }
  } catch (err: unknown) {
    console.error('[Tracing] Failed to initialize OpenTelemetry', err);
  }

};



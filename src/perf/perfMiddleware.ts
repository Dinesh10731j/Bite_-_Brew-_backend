 import { NextFunction, Request, Response } from 'express';
import { trace, context as otelContext, propagation } from '@opentelemetry/api';
import { PerformanceTracker, formatDevReport, formatJsonReport, shouldLogReport } from './performanceTracker';
import { runWithPerfContext } from './perfContext';

export const perfRequestMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const method = req.method;
  const target = req.originalUrl || req.url;
  const route = req.route?.path;

  const requestId = (req as any).requestId as string | undefined;
  const effectiveRequestId = requestId || 'unknown';

  const carrier = req.headers as Record<string, unknown>;
  const extracted = propagation.extract(otelContext.active(), carrier);
  const span = trace.getSpan(extracted);
  const traceId = span?.spanContext()?.traceId || 'unknown';

  const thresholdMs = Number(process.env.PERFORMANCE_LOG_THRESHOLD_MS ?? 500);
  const otelEnabled = (process.env.PERFORMANCE_TRACE_STAGES ?? 'true') === 'true';

  const tracker = new PerformanceTracker({
    requestId: effectiveRequestId,
    traceId,
    method,
    route,
    target,
    thresholdMs,
    otelEnabled,
    parentCtx: extracted,
  });

  runWithPerfContext({ tracker }, async () => {
    res.on('finish', () => {
      try {
        const durationMs = tracker.getTotalDurationMs();
        if (!shouldLogReport(durationMs)) return;

        const report = tracker.endAndBuildReport();
        report.statusCode = res.statusCode;

        const mode = (process.env.PERFORMANCE_LOG_MODE ?? 'prod').toLowerCase();
        if (mode === 'dev') {
          // eslint-disable-next-line no-console
          console.log(formatDevReport(report));
        } else {
          // eslint-disable-next-line no-console
          console.log(JSON.stringify(formatJsonReport(report)));
        }
      } catch (_e) {
        // fail open
      }
    });

    next();
  }).catch(() => next());
};


import { performance } from 'perf_hooks';
import { context as otelContext, trace, Span, SpanKind, SpanStatusCode } from '@opentelemetry/api';

export type StageSeverity = 'GREEN' | 'YELLOW' | 'RED';

export type PerformanceStage = {
  name: string;
  durationMs: number;
  severity: StageSeverity;
  metadata?: Record<string, unknown>;
};

export type PerformanceReport = {
  event: 'performance';
  traceId: string;
  requestId: string;
  method?: string;
  route?: string;
  target?: string;
  statusCode?: number;
  durationMs: number;
  breakdown: PerformanceStage[];
  totalSeverity: StageSeverity;
  thresholdMs: number;
};

const nowMs = () => performance.now();

const getSeverity = (ms: number): StageSeverity => {
  const yellowMin = Number(process.env.PERFORMANCE_YELLOW_MIN_MS ?? 100);
  const redMin = Number(process.env.PERFORMANCE_RED_MIN_MS ?? 500);

  if (ms > redMin) return 'RED';
  if (ms >= yellowMin) return 'YELLOW';
  return 'GREEN';
};

const enabled = () => {
  const v = process.env.PERFORMANCE_LOG_ENABLED;
  if (v === undefined) return true;
  return v === 'true' || v === '1';
};

export class PerformanceTracker {
  private readonly startedAt = nowMs();
  private stages = new Map<string, { start: number; metadata?: Record<string, unknown>; span?: Span }>();
  private ended = false;

  constructor(
    private readonly opts: {
      requestId: string;
      traceId: string;
      method?: string;
      route?: string;
      target?: string;
      statusCode?: number;
      thresholdMs: number;
      otelEnabled: boolean;
      parentCtx?: ReturnType<typeof otelContext.active>;
    },
  ) {}

  start(stageName: string, metadata?: Record<string, unknown>): void {
    if (this.ended) return;
    if (this.stages.has(stageName)) return; // idempotent within request

    const stageStart = nowMs();

    let span: Span | undefined;
    if (this.opts.otelEnabled) {
      const tracer = trace.getTracer('performance-tracker');
      const activeCtx = this.opts.parentCtx ?? otelContext.active();

      span = tracer.startSpan(`performance.stage.${stageName}`,
        {
          kind: SpanKind.INTERNAL,
          attributes: {
            'request.id': this.opts.requestId,
            'performance.stage': stageName,
            ...(this.opts.route ? { 'http.route': this.opts.route } : {}),
            ...(this.opts.method ? { 'http.method': this.opts.method } : {}),
          },
        },
        activeCtx,
      );
    }

    this.stages.set(stageName, { start: stageStart, metadata, span });
  }

  end(stageName: string, metadata?: Record<string, unknown>): void {
    if (this.ended) return;
    const s = this.stages.get(stageName);
    if (!s) return;

    const durationMs = nowMs() - s.start;

    if (s.span) {
      s.span.setAttribute('performance.duration_ms', durationMs);
      const sev = getSeverity(durationMs);
      s.span.setAttribute('performance.severity', sev);
      if (metadata) {
        for (const [k, v] of Object.entries(metadata)) s.span.setAttribute(`performance.meta.${k}`, String(v));
      }
      s.span.setStatus({ code: SpanStatusCode.OK });
      s.span.end();
    }

    // merge metadata for reporting
    if (metadata) {
      s.metadata = { ...(s.metadata ?? {}), ...metadata };
    }

    this.stages.set(stageName, { ...s, start: s.start, metadata: s.metadata });
    this.stages.delete(stageName);

    // Store as an ended record by using a special list approach:
    // We'll keep ended stages in a separate array lazily in report creation.
    this._endedStages.push({
      name: stageName,
      durationMs,
      severity: getSeverity(durationMs),
      metadata: s.metadata,
    });
  }

  private _endedStages: PerformanceStage[] = [];

  async measure<T>(stageName: string, fn: () => Promise<T>, metadata?: Record<string, unknown>): Promise<T> {
    this.start(stageName, metadata);
    try {
      return await fn();
    } finally {
      this.end(stageName, metadata);
    }
  }

  getTotalDurationMs(): number {
    return nowMs() - this.startedAt;
  }

  isBelowThreshold(durationMs: number): boolean {
    return durationMs < this.opts.thresholdMs;
  }

  endAndBuildReport(): PerformanceReport {
    if (this.ended) {
      // allow multiple calls; return last computed
      return this._lastReport as PerformanceReport;
    }
    this.ended = true;

    const durationMs = this.getTotalDurationMs();

    const breakdown = this._endedStages
      .slice()
      .sort((a, b) => b.durationMs - a.durationMs);

    const totalSeverity = getSeverity(durationMs);

    const report: PerformanceReport = {
      event: 'performance',
      traceId: this.opts.traceId,
      requestId: this.opts.requestId,
      method: this.opts.method,
      route: this.opts.route,
      target: this.opts.target,
      statusCode: this.opts.statusCode,
      durationMs,
      breakdown,
      totalSeverity,
      thresholdMs: this.opts.thresholdMs,
    };

    this._lastReport = report;
    return report;
  }

  private _lastReport?: PerformanceReport;
}

export const formatSeverityEmoji = (sev: StageSeverity) => {
  if (sev === 'RED') return '🔴';
  if (sev === 'YELLOW') return '🟡';
  return '🟢';
};

export const formatDevReport = (report: PerformanceReport) => {
  const routeLine = report.route ? `${report.method ?? ''} ${report.route}`.trim() : report.target ?? '';

  const header = [
    '================================',
    '[PERFORMANCE TRACE]',
    `Request: ${routeLine}`,
    report.traceId ? `Trace ID: ${report.traceId}` : '',
    `Total: ${Math.round(report.durationMs)}ms`,
    '',
    'Breakdown:',
  ].filter(Boolean).join('\n');

  const lines = report.breakdown.map(s => {
    const sev = formatSeverityEmoji(s.severity);
    return `${s.name}: ${Math.round(s.durationMs)}ms ${sev}`;
  });

  return [header, ...lines, '================================'].join('\n');
};

export const formatJsonReport = (report: PerformanceReport) => {
  // Report already in JSON-friendly shape; keep stable keys.
  return report;
};

export const shouldLogReport = (durationMs: number): boolean => {
  if (!enabled()) return false;
  const thresholdMs = Number(process.env.PERFORMANCE_LOG_THRESHOLD_MS ?? 0);
  return durationMs >= thresholdMs;
};


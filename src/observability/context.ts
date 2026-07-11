import { Request, Response, NextFunction } from 'express';
import { context, trace, propagation, SpanKind } from '@opentelemetry/api';
import { randomUUID } from 'crypto';

const REQUEST_ID_HEADER = 'x-request-id';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

/**
 * Ensures request correlation (request_id + trace context) and starts an active span for the request.
 */
export const requestContextMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const existing = (req.headers[REQUEST_ID_HEADER] as string | undefined) || undefined;
  const requestId = existing || randomUUID();
  req.requestId = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);

  const tracer = trace.getTracer('http-server');

  // Extract any incoming trace context.
  const extracted = propagation.extract(context.active(), req.headers as Record<string, unknown>);

  const method = req.method;
  const url = req.originalUrl || req.url;

  const span = tracer.startSpan(
    `${method} ${url}`,
    {
      kind: SpanKind.SERVER,
      attributes: {
        'http.method': method,
        'http.route': req.route?.path || url,
        'http.target': url,
        'http.request_id': requestId,
      },
    },
    extracted,
  );

  // Make span active for downstream middleware/handlers.
  const ctx = trace.setSpan(extracted, span);

  context.with(ctx, () => {
    res.on('finish', () => {
      span.setAttribute('http.status_code', res.statusCode);
      span.setAttribute('http.response_content_length', res.getHeader('content-length') as any);
      span.end();
    });
    next();
  });
};


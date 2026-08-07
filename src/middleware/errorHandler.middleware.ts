import { Request, Response, NextFunction } from "express";
import { HTTP_STATUS } from "../constant/statusCode.interface";
import { Message } from "../constant/message.interface";

/**
 * Centralized error handler.
 *
 * Returns a consistent JSON error envelope and never leaks implementation
 * details or sensitive information to clients. In production, generic messages
 * are returned; in development/test the actual error message is surfaced.
 */
export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const e = (err ?? {}) as {
    message?: string;
    statusCode?: number;
    status?: number;
    name?: string;
    code?: string | number;
    stack?: string;
  };

  // Log the full error server-side for debugging.
  if (e?.stack) {
    console.error("[ErrorHandler]", e);
  } else {
    console.error("[ErrorHandler]", e?.message || err || "Unknown error");
  }

  // Handle known error shapes with explicit status codes.
  let statusCode =
    e?.statusCode && Number.isInteger(e.statusCode) && e.statusCode >= 400 && e.statusCode < 600
      ? e.statusCode
      : e?.status && Number.isInteger(e.status)
        ? Number(e.status)
        : undefined;

  // Map common library errors to HTTP statuses.
  if (!statusCode) {
    if (e?.name === "JsonWebTokenError" || e?.name === "TokenExpiredError") {
      statusCode = HTTP_STATUS.UNAUTHORIZED;
    } else if (e?.name === "UnauthorizedError") {
      statusCode = HTTP_STATUS.UNAUTHORIZED;
    } else if (e?.code === "ERR_ASSERTION") {
      statusCode = HTTP_STATUS.BAD_REQUEST;
    } else if (e?.code === "LIMIT_FILE_SIZE") {
      statusCode = HTTP_STATUS.BAD_REQUEST;
    } else {
      statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
    }
  }

// Never leak internal details in production.
  const isProduction = process.env.NODE_ENV === "production";
  const message =
    statusCode >= 500
      ? isProduction
        ? Message.INTERNAL_SERVER_ERROR
        : e?.message || Message.INTERNAL_SERVER_ERROR
      : e?.message || Message.INTERNAL_SERVER_ERROR;

  res.status(statusCode).json({ message });
};

/**
 * Wrap async route handlers so thrown errors propagate to the error handler.
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

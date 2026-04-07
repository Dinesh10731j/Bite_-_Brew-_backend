import { NextFunction, Request, Response } from "express";

type JsonBody = Record<string, unknown> | unknown[];

export const responseNormalize = (_req: Request, res: Response, next: NextFunction): void => {
  res.locals.isCached = false;

  const originalJson = res.json.bind(res);
  res.json = ((body: JsonBody) => {
    if (body && typeof body === "object" && !Array.isArray(body)) {
      const normalized = {
        ...(body as Record<string, unknown>),
        isCached: Boolean(res.locals.isCached),
      };
      return originalJson(normalized);
    }
    return originalJson(body);
  }) as Response["json"];

  next();
};


import { NextFunction, Request, Response } from "express";
import { delCacheByPrefix, getCache, setCache } from "../utils/helpers/redis_helper";

interface CacheOptions {
  namespace: string;
  ttlSeconds?: number;
}

const CACHE_ENABLED = process.env.CACHE_ENABLED !== "false";
const DEFAULT_TTL_SECONDS = Math.max(10, Number(process.env.CACHE_TTL_SECONDS || 60));

const sortQuery = (query: Request["query"]): string => {
  const entries = Object.entries(query).map(([key, value]) => {
    if (Array.isArray(value)) {
      return [key, value.map((v) => String(v)).join(",")] as const;
    }
    return [key, String(value)] as const;
  });

  entries.sort(([a], [b]) => a.localeCompare(b));
  return new URLSearchParams(entries as [string, string][]).toString();
};

const buildCacheKey = (req: Request, namespace: string): string => {
  const query = sortQuery(req.query);
  const userId = req.user?.id || "guest";
  return `api-cache:${namespace}:${req.method}:${req.baseUrl}${req.path}?${query}:user:${userId}`;
};

export const cacheGet = (options: CacheOptions) => async (req: Request, res: Response, next: NextFunction) => {
  if (!CACHE_ENABLED || req.method !== "GET") {
    return next();
  }

  const key = buildCacheKey(req, options.namespace);

  try {
    const { cached, data } = await getCache<Record<string, unknown>>(key);
    if (cached && data) {
      res.locals.isCached = true;
      return res.status(200).json(data);
    }
  } catch {
    // Cache failures must never block API responses.
  }

  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    if (res.statusCode >= 200 && res.statusCode < 300 && body && typeof body === "object") {
      void setCache(key, body, options.ttlSeconds ?? DEFAULT_TTL_SECONDS).catch(() => {
        // Ignore cache write errors.
      });
    }
    return originalJson(body);
  }) as Response["json"];

  return next();
};

export const invalidateCacheByNamespace = (namespaces: string[]) => async (_req: Request, _res: Response, next: NextFunction) => {
  if (!CACHE_ENABLED) {
    return next();
  }

  await Promise.all(
    namespaces.map((namespace) =>
      delCacheByPrefix(`api-cache:${namespace}:`).catch(() => {
        // Ignore cache invalidation errors.
      })
    )
  );
  return next();
};


import { Request, Response, NextFunction } from 'express';
import { sessionAuth } from './sessionAuth.middleware';
import { roleCheck } from './roleCheck.middleware';

/**
 * Backward-compatible auth middleware.
 *
 * The legacy `jwtVerify` name is preserved for compatibility with all existing
 * routers. It now delegates to the enhanced `sessionAuth` middleware which
 * validates, in order:
 *   1. Presence of an access token.
 *   2. JWT signature + expiration.
 *   3. User exists + account is active.
 *   4. Account is not locked.
 *   5. The Redis session matches the sessionId (single active session).
 *   6. Device fingerprint match (configurable).
 *   7. IP anomaly (configurable).
 *
 * On success it attaches `req.user`, `req.sessionId`, `req.deviceHash`, `req.session`.
 */
export const jwtVerify = async (req: Request, res: Response, next: NextFunction) => {
  return sessionAuth(req, res, next);
};

/**
 * Export the enhanced session validation middleware directly for callers that
 * want the full security pipeline by its explicit name.
 */
export { sessionAuth };

// Legacy - use roleCheck(['admin']) instead
export const isAdmin = roleCheck(['admin']);

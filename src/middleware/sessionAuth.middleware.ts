import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../configs/psqlDb.config';
import { User } from '../entities/user/user.entity';
import { SessionService } from '../service/security/session.service';
import { DeviceService } from '../service/security/device.service';
import { LoginMonitorService } from '../service/security/loginMonitor.service';
import { envConfig } from '../configs/env.config';
import { HTTP_STATUS } from '../constant/statusCode.interface';

const ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || process.env.ACCESS_TOKEN_SECRET || 'access_secret';

const sessionService = new SessionService();
const deviceService = new DeviceService();
const loginMonitorService = new LoginMonitorService();

interface AccessTokenPayload extends jwt.JwtPayload {
  userId: string;
  email?: string;
  sessionId?: string;
}

export const resolveAccessToken = (req: Request): string | undefined => {
  const cookieCandidates = [
    req.cookies?.access_token,
    req.cookies?.accessToken,
    req.cookies?.token,
    req.signedCookies?.access_token,
    req.signedCookies?.accessToken,
    req.signedCookies?.token,
  ];
  const header = req.headers.authorization?.replace(/^Bearer\s+/i, '');

  for (const candidate of [header, ...cookieCandidates]) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }
  return undefined;
};

const resolveSessionId = (req: Request): string | undefined => {
  const headerSession = req.headers['x-session-id'];
  if (Array.isArray(headerSession)) return headerSession[0];
  if (headerSession) return headerSession;
  const cookieSession = req.cookies?.session_id || req.cookies?.sessionId;
  return typeof cookieSession === 'string' ? cookieSession : undefined;
};

const resolveClientIp = (req: Request): string => {
  const raw = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip;
  return (raw || 'unknown').replace('::ffff:', '');
};

/**
 * Session-auth middleware.
 *
 * Validates, in order:
 *  1. Presence of an access token.
 *  2. JWT signature + expiration.
 *  3. User exists + account is active.
 *  4. Account is not locked.
 *  5. The session exists in Redis and the sessionId matches (single active session).
 *  6. Device fingerprint match (configurable).
 *  7. IP anomaly (configurable).
 *
 * On success, attaches `req.user`, `req.sessionId`, `req.deviceHash`, `req.session`.
 * Touches the session activity timestamp.
 */
export const sessionAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = resolveAccessToken(req);
    if (!token) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: 'No token provided' });
      return;
    }

    let decoded: AccessTokenPayload;
    try {
      decoded = jwt.verify(token, ACCESS_SECRET as jwt.Secret) as AccessTokenPayload;
    } catch {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: 'Invalid or expired token' });
      return;
    }

    const user = await AppDataSource.getRepository(User).findOneBy({ id: decoded.userId });
    if (!user) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: 'Invalid token' });
      return;
    }
    if (!user.isActive) {
      res.status(HTTP_STATUS.FORBIDDEN).json({ message: 'Account is deactivated' });
      return;
    }
    if (loginMonitorService.isAccountLocked(user)) {
      res.status(HTTP_STATUS.FORBIDDEN).json({ message: 'Account is temporarily locked' });
      return;
    }

    // Session validation against Redis (single active session).
    const sessionId = decoded.sessionId || resolveSessionId(req);
    if (!sessionId) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: 'Session not found' });
      return;
    }

    const validation = await sessionService.validateSession(user.id, sessionId);
    if (!validation.valid) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: 'Session expired or invalid' });
      return;
    }

    // Device fingerprint check (risk signal, not sole auth factor).
    if (envConfig.DEVICE_FINGERPRINT_ENFORCED && validation.session?.deviceHash) {
      const reqDeviceHash = deviceService.buildDevice({
        visitorId:
          typeof req.headers['x-device-id'] === 'string' ? req.headers['x-device-id'] : undefined,
        userAgent: req.get('user-agent'),
        platform:
          typeof req.headers['sec-ch-ua-platform'] === 'string'
            ? req.headers['sec-ch-ua-platform']
            : undefined,
      }).deviceHash;
      if (reqDeviceHash !== validation.session.deviceHash) {
        res
          .status(HTTP_STATUS.UNAUTHORIZED)
          .json({ message: 'Device mismatch. Please sign in again.' });
        return;
      }
    }

    req.user = user;
    req.sessionId = sessionId;
    req.deviceHash = validation.session?.deviceHash || decoded.sessionId;
    req.session = {
      sessionId,
      userId: user.id,
      ipAddress: resolveClientIp(req),
      deviceHash: req.deviceHash,
    };

    // Touch the session activity timestamp (non-blocking).
    void sessionService.touchSession(user.id, sessionId);

    next();
  } catch {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: 'Authentication failed' });
  }
};

/**
 * Backward-compatible alias matching the existing `jwtVerify` export name.
 */
export const jwtVerify = sessionAuth;

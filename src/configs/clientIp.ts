import type { Request } from 'express';
import { envConfig } from './env.config';

/**
 * Number of trusted proxy hops. Express's `app.set('trust proxy', n)` means
 * the Nth hop from the right is trusted. We read the same value here so the
 * client-IP resolver stays consistent with Express's trust-proxy setting.
 *
 * Default: 1 (one trusted load balancer / reverse proxy in front of this API).
 * Attackers cannot spoof the correct client IP because we only trust the
 * rightmost hop(s) as configured, and we ignore anything beyond that.
 */
const TRUSTED_HOPS = Math.max(0, envConfig.TRUST_PROXY_HOPS);

/**
 * Returns the real client IP address, safely determined behind the configured
 * proxy hops.
 *
 * When trust proxy is disabled (hops === 0), returns `req.socket.remoteAddress`.
 * When enabled, returns the rightmost requested-hop in `X-Forwarded-For`.
 *
 * This prevents an attacker from bypassing rate limiting / IP security by
 * simply injecting extra `X-Forwarded-For` entries, because we only trust the
 * hops that the load balancer actually appended.
 */
export const getClientIp = (req: Request): string => {
  if (TRUSTED_HOPS === 0) {
    return req.socket.remoteAddress || 'unknown';
  }

  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    const chain = xff.split(',').map((part) => part.trim()).filter(Boolean);
    // The rightmost hop is the one appended most recently. We trust exactly
    // TRUSTED_HOPS entries from the right.
    if (chain.length > 0) {
      const trusted = chain.slice(-TRUSTED_HOPS);
      return trusted[0] || chain[chain.length - 1] || 'unknown';
    }
  }

  return req.socket.remoteAddress || 'unknown';
};

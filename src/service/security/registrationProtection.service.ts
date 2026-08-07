import { AppDataSource } from "../../configs/psqlDb.config";
import { RegistrationAttempt } from "../../entities/security/registrationAttempt.entity";
import { RegistrationStatus } from "../../constant/enum.constant";
import { securityRedis } from "../../configs/redis.config";
import { envConfig } from "../../configs/env.config";
import { MoreThan } from "typeorm";

export interface RegistrationContext {
  ip: string;
  deviceHash?: string;
  email?: string;
  userAgent?: string;
  country?: string;
  city?: string;
}

export interface RegistrationCheckResult {
  allowed: boolean;
  status: RegistrationStatus;
  reason?: string;
  retryAfterSeconds?: number;
}

/**
 * RegistrationProtectionService
 *
 * Prevents registration abuse WITHOUT permanently blocking users based only on IP.
 * Implements configurable, time-windowed policies:
 *  - Max registrations per IP within a window
 *  - Max registrations per device hash within a window
 *  - Suspicious velocity detection
 *  - Admin whitelist of trusted shared networks
 */
export class RegistrationProtectionService {
  private get attemptRepo() {
    return AppDataSource.getRepository(RegistrationAttempt);
  }

  /**
   * Pre-check whether a registration attempt should be allowed.
   * Uses Redis counters for fast, distributed enforcement + DB for audit.
   */
  async checkRegistration(ctx: RegistrationContext): Promise<RegistrationCheckResult> {
    const ip = ctx.ip || "unknown";
    const windowSeconds = envConfig.REGISTRATION_WINDOW_SECONDS;
    const maxPerIp = envConfig.MAX_REGISTRATIONS_PER_IP;
    const maxPerDevice = envConfig.MAX_REGISTRATIONS_PER_DEVICE;

    // Whitelisted trusted networks bypass IP-based limits.
    if (this.isWhitelisted(ip)) {
      return { allowed: true, status: RegistrationStatus.ALLOWED };
    }

    // Velocity check per IP.
    try {
      const ipCount = await securityRedis.getCount("registration", ip);
      if (ipCount >= maxPerIp) {
        return {
          allowed: false,
          status: RegistrationStatus.BLOCKED_IP,
          reason: "Too many registrations from this network. Please try again later.",
          retryAfterSeconds: windowSeconds,
        };
      }
    } catch {
      // Redis failure -> fall back to DB check (defensive).
    }

    // Device-based limit.
    if (ctx.deviceHash) {
      try {
        const deviceCount = await securityRedis.getCount("registration", `device:${ctx.deviceHash}`);
        if (deviceCount >= maxPerDevice) {
          return {
            allowed: false,
            status: RegistrationStatus.BLOCKED_DEVICE,
            reason: "Too many registrations from this device.",
            retryAfterSeconds: windowSeconds,
          };
        }
      } catch {
        // Fall through to DB check.
      }
    }

    // DB-level velocity check (authoritative fallback when Redis is unavailable).
    const dbIpCount = await this.countRecentByIp(ip, windowSeconds);
    if (dbIpCount >= maxPerIp) {
      return {
        allowed: false,
        status: RegistrationStatus.BLOCKED_IP,
        reason: "Too many registrations from this network. Please try again later.",
        retryAfterSeconds: windowSeconds,
      };
    }

    if (ctx.deviceHash) {
      const dbDeviceCount = await this.countRecentByDevice(ctx.deviceHash, windowSeconds);
      if (dbDeviceCount >= maxPerDevice) {
        return {
          allowed: false,
          status: RegistrationStatus.BLOCKED_DEVICE,
          reason: "Too many registrations from this device.",
          retryAfterSeconds: windowSeconds,
        };
      }
    }

    return { allowed: true, status: RegistrationStatus.ALLOWED };
  }

  /**
   * Record a registration attempt (both successful and blocked).
   * Increments Redis counters and persists to DB.
   */
  async recordRegistration(ctx: RegistrationContext, result: RegistrationCheckResult): Promise<void> {
    const ip = ctx.ip || "unknown";
    const windowSeconds = envConfig.REGISTRATION_WINDOW_SECONDS;

    // Increment counters regardless of outcome to track velocity.
    try {
      await securityRedis.incr("registration", ip, windowSeconds);
      if (ctx.deviceHash) {
        await securityRedis.incr("registration", `device:${ctx.deviceHash}`, windowSeconds);
      }
    } catch {
      // Non-fatal.
    }

    const attempt = this.attemptRepo.create({
      ipAddress: ip,
      deviceHash: ctx.deviceHash,
      email: ctx.email,
      userAgent: ctx.userAgent,
      status: result.allowed ? RegistrationStatus.ALLOWED : result.status,
      reason: result.reason,
      country: ctx.country,
      city: ctx.city,
    });
    try {
      await this.attemptRepo.save(attempt);
    } catch {
      // Non-fatal.
    }
  }

private async countRecentByIp(ip: string, windowSeconds: number): Promise<number> {
    const since = new Date(Date.now() - windowSeconds * 1000);
    try {
      return await this.attemptRepo.count({ where: { ipAddress: ip, createdAt: MoreThan(since) } });
    } catch {
      return 0;
    }
  }

  private async countRecentByDevice(deviceHash: string, windowSeconds: number): Promise<number> {
    const since = new Date(Date.now() - windowSeconds * 1000);
    try {
      return await this.attemptRepo.count({ where: { deviceHash, createdAt: MoreThan(since) } });
    } catch {
      return 0;
    }
  }

  /**
   * Admin whitelist of trusted shared networks (CIDR / exact IPs).
   */
  private isWhitelisted(ip: string): boolean {
    const raw = process.env.REGISTRATION_WHITELIST || "";
    if (!raw) return false;
    const entries = raw.split(",").map((e) => e.trim()).filter(Boolean);
    return entries.includes(ip);
  }
}

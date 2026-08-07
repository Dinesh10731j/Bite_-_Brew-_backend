import { AppDataSource } from "../../configs/psqlDb.config";
import { User } from "../../entities/user/user.entity";
import { securityRedis } from "../../configs/redis.config";
import { envConfig } from "../../configs/env.config";
import { LoginStatus, SecurityEventType } from "../../constant/enum.constant";
import { LoginHistory } from "../../entities/security/loginHistory.entity";
import { SecurityEventService } from "./securityEvent.service";

/**
 * LoginMonitorService
 *
 * Tracks failed-login attempts per account and per IP, enforces temporary
 * account lockout after a configurable number of failures, and records login
 * history (success + failure) for the login dashboard.
 */
export class LoginMonitorService {
  private readonly securityEventService = new SecurityEventService();

  /**
   * Check whether an account is currently locked.
   */
  isAccountLocked(user: User): boolean {
    return Boolean(user.lockedUntil && user.lockedUntil > new Date());
  }

  /**
   * Record a failed login attempt. Increments the counter and, if the threshold
   * is exceeded, locks the account temporarily.
   */
  async recordFailedLogin(user: User, ip: string): Promise<{ locked: boolean; lockedUntil?: Date }> {
    // Increment Redis per-IP counter.
    try {
      await securityRedis.incr("login_attempt", ip, envConfig.ACCOUNT_LOCK_DURATION_SECONDS);
    } catch {
      // Non-fatal.
    }

    const attempts = (user.failedLoginAttempts || 0) + 1;
    const maxAttempts = envConfig.MAX_FAILED_LOGIN_ATTEMPTS;

    if (attempts >= maxAttempts) {
      const lockedUntil = new Date(Date.now() + envConfig.ACCOUNT_LOCK_DURATION_SECONDS * 1000);
      user.failedLoginAttempts = attempts;
      user.lockedUntil = lockedUntil;
      await AppDataSource.getRepository(User).save(user);
      await this.securityEventService.recordEvent({
        userId: user.id,
        type: SecurityEventType.ACCOUNT_LOCKED,
        ipAddress: ip,
        description: `Account locked after ${attempts} failed login attempts`,
        isHighRisk: true,
      });
      return { locked: true, lockedUntil };
    }

    user.failedLoginAttempts = attempts;
    await AppDataSource.getRepository(User).save(user);
    return { locked: false };
  }

  /**
   * Reset failed-login counters on successful login.
   */
  async resetFailedLogin(user: User, ip: string): Promise<void> {
    if (user.failedLoginAttempts || user.lockedUntil) {
      user.failedLoginAttempts = 0;
      user.lockedUntil = undefined as unknown as Date | null;
      await AppDataSource.getRepository(User).save(user);
    }
    try {
      await securityRedis.reset("login_attempt", ip);
    } catch {
      // Non-fatal.
    }
  }

  /**
   * Record a login-history entry.
   */
  async recordLoginHistory(input: {
    userId: string;
    sessionId?: string;
    deviceId?: string;
    deviceHash?: string;
    browser?: string;
    os?: string;
    platform?: string;
    ip: string;
    country?: string;
    city?: string;
    status: LoginStatus;
    reason?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      const repo = AppDataSource.getRepository(LoginHistory);
      const record = repo.create({
        userId: input.userId,
        sessionId: input.sessionId,
        deviceId: input.deviceId,
        deviceHash: input.deviceHash,
        browser: input.browser,
        os: input.os,
        platform: input.platform,
        ipAddress: input.ip,
        country: input.country,
        city: input.city,
        status: input.status,
        failureReason: input.reason,
        metadata: input.metadata,
        loginTime: new Date(),
      });
      await repo.save(record);
    } catch {
      // Non-fatal.
    }
  }

/**
   * Mark a login-history record logged out.
   */
  async markLogout(sessionId: string): Promise<void> {
    try {
      const repo = AppDataSource.getRepository(LoginHistory);
      const records = await repo.find({ where: { sessionId } });
      for (const record of records) {
        record.logoutTime = new Date();
        await repo.save(record);
      }
    } catch {
      // Non-fatal.
    }
  }
}

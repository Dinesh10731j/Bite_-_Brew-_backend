import crypto from "crypto";
import { AppDataSource } from "../../configs/psqlDb.config";
import { Session } from "../../entities/security/session.entity";
import { SessionStatus } from "../../constant/enum.constant";
import { securityRedis } from "../../configs/redis.config";
import { envConfig } from "../../configs/env.config";

export interface SessionData {
  sessionId: string;
  userId: string;
  refreshTokenHash?: string;
  deviceHash?: string;
  deviceId?: string;
  ipAddress?: string;
  browser?: string;
  os?: string;
  platform?: string;
  screenResolution?: string;
  timezone?: string;
  language?: string;
  userAgent?: string;
  country?: string;
  city?: string;
  lastActivityAt: number;
  createdAt: number;
  expiresAt: number;
}

/**
 * SessionService
 *
 * Implements Netflix-style single active session using Redis as the source of
 * truth (`session:{userId}`) with a database record for auditing/recovery.
 *
 * Key design:
 *  - session:create -> generate session UUID, store in Redis + DB
 *  - session:validate -> JWT user + sessionId must match the active Redis session
 *  - session:revoke -> delete Redis key, mark DB record revoked
 *  - Single active session: a new login replaces and force-logouts the previous one.
 */
export class SessionService {
  private get sessionRepo() {
    return AppDataSource.getRepository(Session);
  }

  /**
   * Generate a cryptographically secure session identifier.
   */
  generateSessionId(): string {
    return crypto.randomUUID();
  }

  sessionTtlSeconds(): number {
    return envConfig.SESSION_TTL_SECONDS;
  }

  /**
   * Create a session in Redis and persist it to the database.
   * If single-active-session is enabled, the previous session is revoked and
   * returned so the caller can force-logout the old socket.
   */
  async createSession(payload: Omit<SessionData, "sessionId" | "lastActivityAt" | "createdAt" | "expiresAt">): Promise<{
    session: SessionData;
    revokedSessionId?: string;
  }> {
    const sessionId = this.generateSessionId();
    const now = Date.now();
    const ttl = this.sessionTtlSeconds();
    const expiresAt = now + ttl * 1000;

    const sessionData: SessionData = {
      sessionId,
      userId: payload.userId,
      refreshTokenHash: payload.refreshTokenHash,
      deviceHash: payload.deviceHash,
      deviceId: payload.deviceId,
      ipAddress: payload.ipAddress,
      browser: payload.browser,
      os: payload.os,
      platform: payload.platform,
      screenResolution: payload.screenResolution,
      timezone: payload.timezone,
      language: payload.language,
      userAgent: payload.userAgent,
      country: payload.country,
      city: payload.city,
      lastActivityAt: now,
      createdAt: now,
      expiresAt,
    };

    // Enforce single active session: revoke any existing session for this user.
    let revokedSessionId: string | undefined;
    if (envConfig.SINGLE_ACTIVE_SESSION) {
      const previous = await this.getActiveSession(payload.userId);
      if (previous) {
        revokedSessionId = previous.sessionId;
        await this.revokeSession(previous.sessionId, payload.userId, SessionStatus.FORCED_LOGOUT, "replaced_by_new_login");
      }
    }

    // Write to Redis with TTL.
    await securityRedis.set("session", payload.userId, JSON.stringify(sessionData), ttl);

    // Persist to DB for auditing / session dashboard.
    await this.persistSession(sessionData);

    return { session: sessionData, revokedSessionId };
  }

  /**
   * Get the active session for a user from Redis.
   */
  async getActiveSession(userId: string): Promise<SessionData | null> {
    const raw = await securityRedis.get("session", userId);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SessionData;
    } catch {
      return null;
    }
  }

/**
   * Validate that a sessionId is the active session for the user.
   * Returns true if the session is valid and not expired/idle.
   * On success the active session object is returned for downstream checks.
   */
  async validateSession(
    userId: string,
    sessionId: string,
  ): Promise<{ valid: boolean; reason?: string; session?: SessionData }> {
    const session = await this.getActiveSession(userId);
    if (!session) {
      return { valid: false, reason: "session_not_found" };
    }
    if (session.sessionId !== sessionId) {
      return { valid: false, reason: "session_mismatch" };
    }
    if (session.expiresAt < Date.now()) {
      return { valid: false, reason: "session_expired" };
    }
    // Idle session timeout.
    const idleTimeoutMs = envConfig.IDLE_SESSION_TIMEOUT_SECONDS * 1000;
    if (Date.now() - session.lastActivityAt > idleTimeoutMs) {
      return { valid: false, reason: "session_idle" };
    }
    return { valid: true, session };
  }

  /**
   * Touch/refresh the last-activity timestamp and extend TTL on each valid request.
   */
  async touchSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.getActiveSession(userId);
    if (!session || session.sessionId !== sessionId) return;
    session.lastActivityAt = Date.now();
    const ttl = this.sessionTtlSeconds();
    await securityRedis.set("session", userId, JSON.stringify(session), ttl);
    void this.touchDbSession(sessionId);
  }

  private async touchDbSession(sessionId: string): Promise<void> {
    try {
      await this.sessionRepo.update({ sessionId }, { lastActivityAt: new Date() });
    } catch {
      // Non-fatal: DB touch failures should never block the request.
    }
  }

  /**
   * Revoke a session: delete from Redis and mark DB record revoked.
   */
  async revokeSession(
    sessionId: string,
    userId: string,
    status: SessionStatus = SessionStatus.REVOKED,
    reason = "manually_revoked",
  ): Promise<void> {
    // Only delete the Redis key if it belongs to this user to avoid clobbering a newer session.
    const current = await this.getActiveSession(userId);
    if (current?.sessionId === sessionId) {
      await securityRedis.del("session", userId);
    }
    try {
      await this.sessionRepo.update(
        { sessionId, status: SessionStatus.ACTIVE },
        { status, revokedAt: new Date(), revokedReason: reason },
      );
    } catch {
      // Non-fatal.
    }
  }

  /**
   * Mark all sessions for a user as revoked (e.g. password change / force logout all).
   */
  async revokeAllUserSessions(userId: string, reason = "revoked"): Promise<void> {
    await securityRedis.del("session", userId);
    try {
      await this.sessionRepo.update(
        { userId, status: SessionStatus.ACTIVE },
        { status: SessionStatus.REVOKED, revokedAt: new Date(), revokedReason: reason },
      );
    } catch {
      // Non-fatal.
    }
  }

  /**
   * Persist a session record to the database.
   */
  private async persistSession(data: SessionData): Promise<void> {
    try {
      const record = this.sessionRepo.create({
        userId: data.userId,
        sessionId: data.sessionId,
        refreshTokenHash: data.refreshTokenHash,
        deviceHash: data.deviceHash,
        deviceId: data.deviceId,
        ipAddress: data.ipAddress,
        status: SessionStatus.ACTIVE,
        browser: data.browser,
        os: data.os,
        platform: data.platform,
        screenResolution: data.screenResolution,
        timezone: data.timezone,
        language: data.language,
        userAgent: data.userAgent,
        country: data.country,
        city: data.city,
        lastActivityAt: new Date(data.lastActivityAt),
        expiresAt: new Date(data.expiresAt),
      });
      await this.sessionRepo.save(record);
    } catch {
      // Non-fatal: Redis is source of truth; DB is best-effort auditing.
    }
  }

  /**
   * List active sessions for session dashboard (from DB).
   */
  async listSessions(userId: string): Promise<Session[]> {
    return this.sessionRepo.find({
      where: { userId },
      order: { createdAt: "DESC" },
    });
  }

/**
   * List active sessions excluding the current one.
   */
  async listSessionsExcept(userId: string, sessionId: string): Promise<Session[]> {
    return this.sessionRepo.find({
      where: { userId },
      order: { createdAt: "DESC" },
    }).then((rows) => rows.filter((s) => s.sessionId !== sessionId));
  }

  /**
   * Revoke all sessions for a user except the given sessionId.
   * Used by "revoke all except current" in the session dashboard.
   */
  async revokeSessionsExcept(userId: string, sessionId: string, reason = "revoked_except_current"): Promise<string[]> {
    const active = await this.sessionRepo.find({
      where: { userId, status: SessionStatus.ACTIVE },
    });
    const revoked: string[] = [];

    for (const s of active) {
      if (s.sessionId === sessionId) continue;
      await this.revokeSession(s.sessionId, userId, SessionStatus.REVOKED, reason);
      revoked.push(s.sessionId);
    }

    // If the current session is not the active Redis one but there is an active
    // Redis session for this user, ensure it is not clobbered.
    return revoked;
  }

  /**
   * Revoke a specific session by sessionId for a user (used by session dashboard).
   */
  async revokeSessionById(userId: string, sessionId: string, reason = "manually_revoked"): Promise<boolean> {
    const record = await this.sessionRepo.findOne({ where: { sessionId, userId } });
    if (!record) {
      return false;
    }
    await this.revokeSession(sessionId, userId, SessionStatus.REVOKED, reason);
    return true;
  }
}

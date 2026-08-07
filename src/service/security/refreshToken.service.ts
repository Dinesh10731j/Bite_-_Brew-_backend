import crypto from "crypto";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../../configs/psqlDb.config";
import { RefreshToken } from "../../entities/security/refreshToken.entity";
import { securityRedis } from "../../configs/redis.config";
import { envConfig } from "../../configs/env.config";

const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.REFRESH_TOKEN_SECRET || "refresh_secret";

interface RefreshTokenPayload extends jwt.JwtPayload {
  userId: string;
  sessionId?: string;
  tokenId: string;
}

export interface CreatedRefreshToken {
  token: string;
  tokenId: string;
  tokenHash: string;
  expiresAt: Date;
}

/**
 * RefreshTokenService
 *
 * Implements refresh token rotation with reuse detection:
 *  - Each refresh token carries a unique `tokenId` and a `sessionId`.
 *  - On rotation, the old token is revoked and a new one is minted.
 *  - If a used/revoked token is presented again, all sessions for the user are
 *    revoked (token reuse == potential theft).
 */
export class RefreshTokenService {
  private get refreshRepo() {
    return AppDataSource.getRepository(RefreshToken);
  }

  /**
   * Create a new refresh token (JWT) with rotation metadata.
   */
  async createRefreshToken(userId: string, sessionId: string): Promise<CreatedRefreshToken> {
    const tokenId = crypto.randomUUID();
    const expiresIn = envConfig.JWT_REFRESH_EXPIRES_IN || "30d";
    const expiresAt = this.parseExpiry(expiresIn);

    const token = jwt.sign(
      { userId, sessionId, tokenId },
      REFRESH_SECRET as jwt.Secret,
      { expiresIn: expiresIn as jwt.SignOptions["expiresIn"] },
    );
    const tokenHash = this.hashToken(token);

    // Revoke any previous token bound to this session (rotation).
    await this.revokeBySession(userId, sessionId);

    // Persist token record.
    await this.persist({
      userId,
      tokenId,
      tokenHash,
      sessionId,
      expiresAt,
    });

    // Store in Redis for fast reuse detection.
    await securityRedis.set("refresh", tokenId, JSON.stringify({ userId, sessionId, tokenHash }), this.ttlSeconds(expiresIn));

    return { token, tokenId, tokenHash, expiresAt };
  }

  /**
   * Verify a refresh token. Returns the decoded payload or throws.
   * Detects reuse by checking whether the tokenId was already used/revoked.
   */
  async verifyAndRotate(refreshToken: string): Promise<{ userId: string; sessionId: string; newToken: CreatedRefreshToken }> {
    let payload: RefreshTokenPayload;
    try {
      payload = jwt.verify(refreshToken, REFRESH_SECRET as jwt.Secret) as RefreshTokenPayload;
    } catch {
      throw new Error("INVALID_REFRESH_TOKEN");
    }

const { userId, sessionId, tokenId } = payload;
    if (!tokenId || !sessionId) {
      throw new Error("INVALID_REFRESH_TOKEN");
    }
    const tokenHash = this.hashToken(refreshToken);

    // Reuse detection: check Redis for the tokenId.
    const stored = await securityRedis.get("refresh", tokenId);
    if (!stored) {
      // Token not found in Redis - could be expired or already rotated.
      // Look up in DB. If a record exists and is revoked, it's reuse.
      const dbToken = await this.refreshRepo.findOne({ where: { tokenId } });
      if (dbToken && dbToken.isRevoked) {
        // Reuse detected -> revoke all sessions for the user.
        await this.handleReuse(userId, sessionId);
        throw new Error("REFRESH_TOKEN_REUSE");
      }
      throw new Error("INVALID_REFRESH_TOKEN");
    }

    try {
      const parsed = JSON.parse(stored) as { userId: string; sessionId: string; tokenHash: string };
      if (parsed.userId !== userId || parsed.sessionId !== sessionId || parsed.tokenHash !== tokenHash) {
        throw new Error("REFRESH_TOKEN_MISMATCH");
      }
    } catch {
      throw new Error("INVALID_REFRESH_TOKEN");
    }

    // Rotate: mint a new token and revoke the old one.
    const newToken = await this.createRefreshToken(userId, sessionId);

    // Mark the old token as used/revoked.
    await this.markUsed(tokenId, userId, newToken.tokenId);

    return { userId, sessionId, newToken };
  }

  /**
   * Revoke a specific refresh token.
   */
  async revokeToken(tokenId: string, userId: string): Promise<void> {
    await securityRedis.del("refresh", tokenId);
    try {
      await this.refreshRepo.update(
        { tokenId, userId, isRevoked: false },
        { isRevoked: true, revokedAt: new Date(), revokedReason: "revoked" },
      );
    } catch {
      // Non-fatal.
    }
  }

/**
   * Revoke all refresh tokens for a user (e.g. password change / force logout all).
   */
async revokeAllUserTokens(userId: string, reason = "revoked"): Promise<void> {
    const activeTokens = await this.refreshRepo.find({ where: { userId, isRevoked: false } });
    for (const t of activeTokens) {
      await securityRedis.del("refresh", t.tokenId);
    }
    await this.refreshRepo.update(
      { userId, isRevoked: false },
      { isRevoked: true, revokedAt: new Date(), revokedReason: reason },
    );
  }

/**
   * Public wrapper to revoke all active refresh tokens bound to a session.
   * Used by the session dashboard when revoking a specific session.
   */
  async revokeBySessionPublic(userId: string, sessionId: string): Promise<void> {
    await this.revokeBySession(userId, sessionId);
  }

  private async revokeBySession(userId: string, sessionId: string): Promise<void> {
    const activeTokens = await this.refreshRepo.find({
      where: { userId, sessionId, isRevoked: false },
    });
    for (const t of activeTokens) {
      await securityRedis.del("refresh", t.tokenId);
      await this.refreshRepo.update(
        { id: t.id },
        { isRevoked: true, revokedAt: new Date(), revokedReason: "rotated" },
      );
    }
  }

  private async markUsed(tokenId: string, userId: string, replacedBy: string): Promise<void> {
    await securityRedis.del("refresh", tokenId);
    try {
      await this.refreshRepo.update(
        { tokenId, userId },
        { isRevoked: true, revokedAt: new Date(), revokedReason: "rotated", usedAt: new Date(), replacedBy },
      );
    } catch {
      // Non-fatal.
    }
  }

  /**
   * Handle refresh token reuse: revoke all sessions + tokens for the user.
   */
private async handleReuse(userId: string, sessionId: string): Promise<void> {
    // Revoke Redis session for this user.
    await securityRedis.del("session", userId);
    const activeTokens = await this.refreshRepo.find({ where: { userId, isRevoked: false } });
    for (const t of activeTokens) {
      await securityRedis.del("refresh", t.tokenId);
    }
    try {
      await this.refreshRepo.update(
        { userId, isRevoked: false },
        { isRevoked: true, revokedAt: new Date(), revokedReason: "token_reuse" },
      );
    } catch {
      // Non-fatal.
    }
    void sessionId;
  }

  private hashToken(token: string): string {
    return crypto.createHmac("sha256", REFRESH_SECRET).update(token).digest("hex");
  }

  private async persist(data: {
    userId: string;
    tokenId: string;
    tokenHash: string;
    sessionId: string;
    expiresAt: Date;
  }): Promise<void> {
    const record = this.refreshRepo.create({
      userId: data.userId,
      tokenId: data.tokenId,
      tokenHash: data.tokenHash,
      sessionId: data.sessionId,
      expiresAt: data.expiresAt,
      isRevoked: false,
    });
    await this.refreshRepo.save(record);
  }

  private parseExpiry(expiresIn: string): Date {
    const match = /^(\d+)([smhdwy])$/.exec(expiresIn);
    if (!match) return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 };
    return new Date(Date.now() + value * (multipliers[unit] || 86_400_000));
  }

  private ttlSeconds(expiresIn: string): number {
    return Math.max(60, Math.floor((this.parseExpiry(expiresIn).getTime() - Date.now()) / 1000));
  }
}

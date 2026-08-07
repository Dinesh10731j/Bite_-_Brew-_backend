import { Request, Response } from "express";
import { SessionService } from "../../service/security/session.service";
import { RefreshTokenService } from "../../service/security/refreshToken.service";
import { ForceLogoutService } from "../../service/security/forceLogout.service";
import { HTTP_STATUS } from "../../constant/statusCode.interface";
import { Message } from "../../constant/message.interface";
import { SessionStatus } from "../../constant/enum.constant";

/**
 * SessionController
 *
 * Provides the session dashboard APIs:
 *  - List active sessions for the current user
 *  - Revoke a selected session
 *  - Revoke all sessions except the current one
 *  - Logout all devices
 */
export class SessionController {
  private static sessionService = new SessionService();
  private static refreshTokenService = new RefreshTokenService();
  private static forceLogout = new ForceLogoutService();

  /**
   * GET /sessions — list active sessions + identify the current device.
   */
  static async list(req: Request, res: Response) {
    const userId = req.user?.id;
    const currentSessionId = req.sessionId || (req.cookies?.session_id as string | undefined);
    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: Message.UNAUTHORIZED });
    }

    const sessions = await SessionController.sessionService.listSessions(userId);

    const payload = sessions.map((s) => ({
      sessionId: s.sessionId,
      isCurrent: s.sessionId === currentSessionId,
      isActive: s.status === SessionStatus.ACTIVE,
      device: {
        browser: s.browser,
        os: s.os,
        platform: s.platform,
        deviceHash: s.deviceHash,
      },
      ipAddress: s.ipAddress,
      country: s.country,
      city: s.city,
      status: s.status,
      lastActivityAt: s.lastActivityAt,
      revokedAt: s.revokedAt,
      revokedReason: s.revokedReason,
      createdAt: s.createdAt,
    }));

    return res.status(HTTP_STATUS.OK).json({ message: Message.SESSIONS_FETCHED, data: payload });
  }

  /**
   * POST /sessions/:sessionId/revoke — revoke a selected session.
   */
  static async revoke(req: Request, res: Response) {
    const userId = req.user?.id;
    const sessionId = req.params.sessionId;
    if (!userId || !sessionId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: Message.INVALID_REQUEST });
    }

    const revoked = await SessionController.sessionService.revokeSessionById(userId, sessionId, "manually_revoked");
    if (!revoked) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: Message.SESSION_INVALID });
    }

    // Revoke refresh tokens bound to the session + force-logout live sockets.
    await SessionController.refreshTokenService.revokeBySessionPublic(userId, sessionId);
    await SessionController.forceLogout.forceLogoutSession(userId, sessionId, "session_revoked");

    return res.status(HTTP_STATUS.OK).json({ message: Message.SESSION_REVOKED });
  }

  /**
   * POST /sessions/revoke-others — revoke all sessions except the current one.
   */
  static async revokeOthers(req: Request, res: Response) {
    const userId = req.user?.id;
    const currentSessionId = req.sessionId || (req.cookies?.session_id as string | undefined);
    if (!userId || !currentSessionId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: Message.INVALID_REQUEST });
    }

    const revoked = await SessionController.sessionService.revokeSessionsExcept(userId, currentSessionId, "revoked_except_current");
    for (const sessionId of revoked) {
      await SessionController.refreshTokenService.revokeBySessionPublic(userId, sessionId);
      await SessionController.forceLogout.forceLogoutSession(userId, sessionId, "revoked_except_current");
    }

    return res.status(HTTP_STATUS.OK).json({ message: Message.SESSIONS_REVOKED, data: { revokedCount: revoked.length } });
  }

  /**
   * POST /sessions/logout-all — revoke all sessions (including current) and clear cookies.
   */
  static async logoutAll(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: Message.UNAUTHORIZED });
    }

    await SessionController.sessionService.revokeAllUserSessions(userId, "logout_all");
    await SessionController.refreshTokenService.revokeAllUserTokens(userId, "logout_all");
    await SessionController.forceLogout.forceLogoutAllForUser(userId, "logout_all");

    const cookieOptions = {
      httpOnly: true as const,
      secure: req.secure,
      sameSite: (req.secure ? "none" : "lax") as "none" | "lax",
      path: "/" as const,
    };

    return res
      .clearCookie("access_token", cookieOptions)
      .clearCookie("refresh_token", cookieOptions)
      .clearCookie("session_id", cookieOptions)
      .status(HTTP_STATUS.OK)
      .json({ message: Message.SESSIONS_REVOKED });
  }
}

import { Request, Response } from "express";
import { AppDataSource } from "../../configs/psqlDb.config";
import { LoginHistory } from "../../entities/security/loginHistory.entity";
import { HTTP_STATUS } from "../../constant/statusCode.interface";
import { Message } from "../../constant/message.interface";

/**
 * LoginHistoryController
 *
 * Provides recent login-history listing for the session dashboard.
 */
export class LoginHistoryController {
  /**
   * Normalize a stored device string: strip surrounding quotes and trim.
   * Returns undefined for empty/placeholder values.
   */
  private static cleanValue(value?: string | null): string | undefined {
    if (!value) return undefined;
    const cleaned = value.replace(/^"|"$/g, "").trim();
    if (!cleaned || cleaned === "Unknown" || cleaned === "unknown") return undefined;
    return cleaned;
  }

  /**
   * GET /login-history?limit=&offset= — list recent login history for the current user.
   */
  static async list(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: Message.UNAUTHORIZED });
    }

    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const repo = AppDataSource.getRepository(LoginHistory);
    const [rows, total] = await repo.findAndCount({
      where: { userId },
      order: { loginTime: "DESC" },
      take: limit,
      skip: offset,
    });

const data = rows.map((h) => {
      const browser = LoginHistoryController.cleanValue(h.browser) ?? "Unknown browser";
      const os = LoginHistoryController.cleanValue(h.os);
      const platform = LoginHistoryController.cleanValue(h.platform);
      const display = [browser, os, platform].filter(Boolean).join(" on ") || "Unknown device";
      return {
        id: h.id,
        sessionId: h.sessionId,
        device: display,
        deviceInfo: {
          browser,
          os,
          platform,
          deviceHash: h.deviceHash,
        },
        ipAddress: h.ipAddress,
        country: h.country,
        city: h.city,
        status: h.status,
        failureReason: h.failureReason,
        loginTime: h.loginTime,
        logoutTime: h.logoutTime,
      };
    });

    return res.status(HTTP_STATUS.OK).json({
      message: Message.LOGIN_HISTORY_FETCHED,
      data,
      pagination: { total, limit, offset },
    });
  }
}

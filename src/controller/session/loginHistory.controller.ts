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

    const data = rows.map((h) => ({
      id: h.id,
      sessionId: h.sessionId,
      device: {
        browser: h.browser,
        os: h.os,
        platform: h.platform,
        deviceHash: h.deviceHash,
      },
      ipAddress: h.ipAddress,
      country: h.country,
      city: h.city,
      status: h.status,
      failureReason: h.failureReason,
      loginTime: h.loginTime,
      logoutTime: h.logoutTime,
    }));

    return res.status(HTTP_STATUS.OK).json({
      message: Message.LOGIN_HISTORY_FETCHED,
      data,
      pagination: { total, limit, offset },
    });
  }
}

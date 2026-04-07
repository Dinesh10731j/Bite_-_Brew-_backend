import { Request, Response } from "express";
import { HTTP_STATUS } from "../../constant/statusCode.interface";
import { Message } from "../../constant/message.interface";
import { AnalyticsRepository } from "../../repository/analytics/analytics.repository";
import { AnalyticsService } from "../../service/analytics/analytics.service";

const analyticsService = new AnalyticsService(new AnalyticsRepository());

export class AnalyticsController {
  static async summary(req: Request, res: Response) {
    try {
      const days = Math.max(1, Number(req.query?.days) || 7);
      const data = await analyticsService.summary(days);
      return res.status(HTTP_STATUS.OK).json({ message: Message.SUCCESS, data });
    } catch (_error) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: Message.INTERNAL_SERVER_ERROR });
    }
  }
}

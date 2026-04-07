import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../constant/statusCode.interface";
import { Message } from "../../constant/message.interface";
import { DashboardRepository } from "../../repository/dashboard/dashboard.repository";
import { DashboardService } from "../../service/dashboard/dashboard.service";

const dashboardService = new DashboardService(new DashboardRepository());

export class DashboardController {
  static async overview(req: Request, res: Response) {
    try {
      const limit = Math.max(1, Math.min(20, Number(req.query?.limit) || 5));
      const data = await dashboardService.getOverview(limit);
      return res.status(HTTP_STATUS.OK).json({ message: Message.SUCCESS, data });
    } catch (_error) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: Message.INTERNAL_SERVER_ERROR });
    }
  }
}

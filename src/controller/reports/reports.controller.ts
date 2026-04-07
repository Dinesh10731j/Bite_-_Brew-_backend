import { Request, Response } from "express";
import { HTTP_STATUS } from "../../constant/statusCode.interface";
import { Message } from "../../constant/message.interface";
import { ReportsRepository } from "../../repository/reports/reports.repository";
import { ReportsService } from "../../service/reports/reports.service";

const reportsService = new ReportsService(new ReportsRepository());

export class ReportsController {
  static async sales(req: Request, res: Response) {
    try {
      const from = typeof req.query.from === "string" ? req.query.from : undefined;
      const to = typeof req.query.to === "string" ? req.query.to : undefined;
      const data = await reportsService.salesReport(from, to);
      return res.status(HTTP_STATUS.OK).json({ message: Message.SUCCESS, data });
    } catch (_error) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: Message.INTERNAL_SERVER_ERROR });
    }
  }
}

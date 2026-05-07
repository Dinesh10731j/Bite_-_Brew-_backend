import { Request, Response } from "express";
import { UserRole } from "../../constant/enum.constant";
import { Message } from "../../constant/message.interface";
import { HTTP_STATUS } from "../../constant/statusCode.interface";
import { ActivityLogsRepository } from "../../repository/activityLogs/activityLogs.repository";
import { ActivityLogsService } from "../../service/activityLogs/activityLogs.service";

const activityLogsService = new ActivityLogsService(new ActivityLogsRepository());

type ActivityLogResponse = {
  id: string;
  type: "visit" | "admin_action";
  userId?: string;
  userName?: string;
  action?: string;
  details?: string;
  ip?: string;
  country?: string;
  city?: string;
  device?: string;
  browser?: string;
  os?: string;
  referrer?: string;
  sessionId?: string;
  timestamp: Date;
};

export class ActivityLogsController {
  static async list(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: Message.UNAUTHORIZED });
      }

      const result = await activityLogsService.list(req.query, {
        id: req.user.id,
        role: req.user.role as UserRole,
      });
      return res.status(HTTP_STATUS.OK).json({ message: Message.SUCCESS, ...result });
    } catch (_error) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: Message.INTERNAL_SERVER_ERROR });
    }
  }
}


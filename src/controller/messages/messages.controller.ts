import { Request, Response } from "express";
import { NotificationPriority, NotificationType } from "../../constant/enum.constant";
import { HTTP_STATUS } from "../../constant/statusCode.interface";
import { Message as AppMessage } from "../../constant/message.interface";
import { MessageRepository } from "../../repository/message/message.repository";
import { NotificationRepository } from "../../repository/notification/notification.repository";
import { MessageService } from "../../service/message/message.service";
import { NotificationsService } from "../../service/notifications/notifications.service";

const messageService = new MessageService(new MessageRepository());
const notificationsService = new NotificationsService(new NotificationRepository());

export class MessagesController {
  static async create(req: Request, res: Response) {
    try {
      const { senderName, content } = req.body ?? {};
      if (!senderName || !content) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: AppMessage.BAD_REQUEST });
      }
      const data = await messageService.create(req.body);
      try {
        const messageId = String((data as { id?: string })?.id || "");
        await notificationsService.create({
          content: `New message received from ${senderName}.`,
          type: NotificationType.MESSAGE,
          priority: NotificationPriority.MEDIUM,
          actionLink: messageId ? `/messages/${messageId}` : undefined,
        });
      } catch (_notificationError) {
        // Do not fail message creation when notification persistence fails.
      }
      return res.status(HTTP_STATUS.CREATED).json({ message: AppMessage.CREATED_SUCCESS, data });
    } catch (_error) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: AppMessage.INTERNAL_SERVER_ERROR });
    }
  }

  static async list(req: Request, res: Response) {
    try {
      const result = await messageService.list(req.query);
      return res.status(HTTP_STATUS.OK).json({ message: AppMessage.SUCCESS, ...result });
    } catch (_error) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: AppMessage.INTERNAL_SERVER_ERROR });
    }
  }

  static async markRead(req: Request, res: Response) {
    try {
      const id = req.params.id;
      if (!id) return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: AppMessage.BAD_REQUEST });
      const data = await messageService.markRead(id, req.body?.isRead !== false);
      if (!data) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: AppMessage.NOT_FOUND });
      }
      return res.status(HTTP_STATUS.OK).json({ message: AppMessage.UPDATED_SUCCESS, data });
    } catch (_error) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: AppMessage.INTERNAL_SERVER_ERROR });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const id = req.params.id;
      if (!id) return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: AppMessage.BAD_REQUEST });
      const ok = await messageService.delete(id);
      if (!ok) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: AppMessage.NOT_FOUND });
      }
      return res.status(HTTP_STATUS.OK).json({ message: AppMessage.DELETED_SUCCESS });
    } catch (_error) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: AppMessage.INTERNAL_SERVER_ERROR });
    }
  }
}

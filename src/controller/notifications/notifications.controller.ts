import { Request, Response } from "express";
import { HTTP_STATUS } from "../../constant/statusCode.interface";
import { Message } from "../../constant/message.interface";
import { NotificationPriority, NotificationType } from "../../constant/enum.constant";
import { NotificationRepository } from "../../repository/notification/notification.repository";
import { NotificationsService } from "../../service/notifications/notifications.service";

const notificationsService = new NotificationsService(new NotificationRepository());

export class NotificationsController {
  static async create(req: Request, res: Response) {
    try {
      if (!req.body?.content) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: Message.BAD_REQUEST });
      }
      const data = await notificationsService.create(req.body);
      return res.status(HTTP_STATUS.CREATED).json({ message: Message.CREATED_SUCCESS, data });
    } catch (_error) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: Message.INTERNAL_SERVER_ERROR });
    }
  }

  static async list(req: Request, res: Response) {
    try {
      const result = await notificationsService.list(req.query);
      return res.status(HTTP_STATUS.OK).json({ message: Message.SUCCESS, ...result });
    } catch (_error) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: Message.INTERNAL_SERVER_ERROR });
    }
  }

  static async markRead(req: Request, res: Response) {
    try {
      const id = req.params.id;
      if (!id) return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: Message.BAD_REQUEST });
      const data = await notificationsService.markRead(id, req.body?.isRead !== false);
      if (!data) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: Message.NOT_FOUND });
      }
      return res.status(HTTP_STATUS.OK).json({ message: Message.UPDATED_SUCCESS, data });
    } catch (_error) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: Message.INTERNAL_SERVER_ERROR });
    }
  }

  static async markAllRead(req: Request, res: Response) {
    try {
      const userId = String(req.body?.userId || req.user?.id || "");
      if (!userId) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: Message.BAD_REQUEST });
      }
      await notificationsService.markAllRead(userId);
      return res.status(HTTP_STATUS.OK).json({ message: Message.UPDATED_SUCCESS });
    } catch (_error) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: Message.INTERNAL_SERVER_ERROR });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const id = req.params.id;
      if (!id) return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: Message.BAD_REQUEST });
      const payload = req.body || {};
      const allowedPriority = Object.values(NotificationPriority);
      const allowedType = Object.values(NotificationType);
      const hasUpdateField =
        typeof payload.content === "string" ||
        typeof payload.priority !== "undefined" ||
        typeof payload.type !== "undefined" ||
        typeof payload.actionLink !== "undefined" ||
        typeof payload.isRead !== "undefined";

      if (!hasUpdateField) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: Message.BAD_REQUEST });
      }
      if (typeof payload.priority !== "undefined") {
        const normalizedPriority = String(payload.priority).toUpperCase();
        if (!allowedPriority.includes(normalizedPriority as NotificationPriority)) {
          return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: Message.BAD_REQUEST });
        }
        payload.priority = normalizedPriority;
      }
      if (typeof payload.type !== "undefined") {
        const normalizedType = String(payload.type).toUpperCase();
        if (!allowedType.includes(normalizedType as NotificationType)) {
          return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: Message.BAD_REQUEST });
        }
        payload.type = normalizedType;
      }

      const data = await notificationsService.update(id, payload);
      if (!data) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: Message.NOT_FOUND });
      }
      return res.status(HTTP_STATUS.OK).json({ message: Message.UPDATED_SUCCESS, data });
    } catch (_error) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: Message.INTERNAL_SERVER_ERROR });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const id = req.params.id;
      if (!id) return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: Message.BAD_REQUEST });
      const ok = await notificationsService.delete(id);
      if (!ok) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: Message.NOT_FOUND });
      }
      return res.status(HTTP_STATUS.OK).json({ message: Message.DELETED_SUCCESS });
    } catch (_error) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: Message.INTERNAL_SERVER_ERROR });
    }
  }
}

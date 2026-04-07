import { NotificationPriority, NotificationType } from "../../constant/enum.constant";
import { NotificationRepository } from "../../repository/notification/notification.repository";
import { buildPaginationMeta, parsePagination } from "../../utils/helpers/pagination_helper";

export class NotificationsService {
  constructor(private readonly repository: NotificationRepository) {}

  create(payload: {
    content: string;
    type?: NotificationType;
    priority?: NotificationPriority;
    actionLink?: string;
    userId?: string;
  }) {
    const notificationPayload: {
      content: string;
      type: NotificationType;
      priority: NotificationPriority;
      isRead: boolean;
      actionLink?: string;
      userId?: string;
    } = {
      content: payload.content,
      type: payload.type || NotificationType.SYSTEM,
      priority: payload.priority || NotificationPriority.LOW,
      isRead: false,
    };
    if (payload.actionLink) notificationPayload.actionLink = payload.actionLink;
    if (payload.userId) notificationPayload.userId = payload.userId;
    return this.repository.create(notificationPayload);
  }

  async list(query: { page?: unknown; limit?: unknown; userId?: unknown; isRead?: unknown }) {
    const { page, limit, skip } = parsePagination(query.page, query.limit, 15);
    const userId = typeof query.userId === "string" ? query.userId : undefined;
    const isRead = typeof query.isRead === "string" ? query.isRead === "true" : undefined;
    const [data, total] = await this.repository.list(skip, limit, userId, isRead);
    return { data, pagination: buildPaginationMeta(total, page, limit) };
  }

  async markRead(id: string, isRead = true) {
    const notification = await this.repository.findById(id);
    if (!notification) {
      return null;
    }
    notification.isRead = isRead;
    return this.repository.save(notification);
  }

  async markAllRead(userId: string) {
    await this.repository.markAllReadByUser(userId);
  }

  async delete(id: string) {
    const notification = await this.repository.findById(id);
    if (!notification) {
      return false;
    }
    await this.repository.delete(id);
    return true;
  }
}

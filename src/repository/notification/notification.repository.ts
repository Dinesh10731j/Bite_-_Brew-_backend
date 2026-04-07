import { AppDataSource } from "../../configs/psqlDb.config";
import { Notification } from "../../entities/notifications/notifications.entity";

export class NotificationRepository {
  private readonly repo = AppDataSource.getRepository(Notification);

  create(payload: Partial<Notification>) {
    const notification = this.repo.create(payload);
    return this.repo.save(notification);
  }

  list(skip: number, take: number, userId?: string, isRead?: boolean) {
    const qb = this.repo.createQueryBuilder("notification");
    if (userId) {
      qb.andWhere("notification.userId = :userId", { userId });
    }
    if (isRead !== undefined) {
      qb.andWhere("notification.isRead = :isRead", { isRead });
    }
    return qb.orderBy("notification.createdAt", "DESC").skip(skip).take(take).getManyAndCount();
  }

  findById(id: string) {
    return this.repo.findOneBy({ id });
  }

  save(notification: Notification) {
    return this.repo.save(notification);
  }

  markAllReadByUser(userId: string) {
    return this.repo.createQueryBuilder().update(Notification).set({ isRead: true }).where("userId = :userId", { userId }).execute();
  }

  delete(id: string) {
    return this.repo.delete(id);
  }
}

import { AppDataSource } from "../../configs/psqlDb.config";
import { MenuItem } from "../../entities/menu/menu.entity";
import { Message } from "../../entities/messages/messages.entity";
import { Notification } from "../../entities/notifications/notifications.entity";
import { Order } from "../../entities/order/order.entity";

export class DashboardRepository {
  private readonly orderRepo = AppDataSource.getRepository(Order);
  private readonly menuRepo = AppDataSource.getRepository(MenuItem);
  private readonly messageRepo = AppDataSource.getRepository(Message);
  private readonly notificationRepo = AppDataSource.getRepository(Notification);

  async cards() {
    const [ordersCount, menuCount, unreadMessages, unreadNotifications, sales] = await Promise.all([
      this.orderRepo.count(),
      this.menuRepo.count(),
      this.messageRepo.count({ where: { isRead: false } }),
      this.notificationRepo.count({ where: { isRead: false } }),
      this.orderRepo
        .createQueryBuilder("order")
        .select("COALESCE(SUM(order.totalPrice), 0)", "total")
        .getRawOne<{ total: string }>(),
    ]);

    return {
      ordersCount,
      menuCount,
      unreadMessages,
      unreadNotifications,
      totalSales: Number(sales?.total || 0),
    };
  }

  recentOrders(limit = 5) {
    return this.orderRepo.find({
      take: limit,
      order: { createdAt: "DESC" },
      relations: ["orderItems", "orderItems.menuItem"],
    });
  }
}

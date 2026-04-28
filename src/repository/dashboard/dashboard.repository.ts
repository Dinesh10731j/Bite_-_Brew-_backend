import { AppDataSource } from "../../configs/psqlDb.config";
import { MenuItem } from "../../entities/menu/menu.entity";
import { Message } from "../../entities/messages/messages.entity";
import { Notification } from "../../entities/notifications/notifications.entity";
import { Order } from "../../entities/order/order.entity";
import { VisitLog } from "../../entities/analytics/analytics.entity";

export class DashboardRepository {
  private readonly orderRepo = AppDataSource.getRepository(Order);
  private readonly menuRepo = AppDataSource.getRepository(MenuItem);
  private readonly messageRepo = AppDataSource.getRepository(Message);
  private readonly notificationRepo = AppDataSource.getRepository(Notification);
  private readonly visitRepo = AppDataSource.getRepository(VisitLog);

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

  async trafficSummary(days = 7) {
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await this.visitRepo
      .createQueryBuilder("visit")
      .select("DATE(visit.visitedAt)", "day")
      .addSelect("COUNT(*)", "count")
      .where("visit.visitedAt >= :from", { from })
      .groupBy("DATE(visit.visitedAt)")
      .orderBy("DATE(visit.visitedAt)", "ASC")
      .getRawMany<{ day: string; count: string }>();

    const result = rows.map((r) => ({ day: r.day, count: Number(r.count) }));

    let trend: "up" | "down" | "stable" = "stable";
    if (result.length >= 2) {
      const firstHalf = result.slice(0, Math.floor(result.length / 2)).reduce((s, d) => s + d.count, 0);
      const secondHalf = result.slice(Math.floor(result.length / 2)).reduce((s, d) => s + d.count, 0);
      if (secondHalf > firstHalf * 1.05) trend = "up";
      else if (secondHalf < firstHalf * 0.95) trend = "down";
    }

    return { days: result, trend };
  }

  topSellingItems(limit = 5) {
    return this.menuRepo.find({
      take: limit,
      order: { popularity: "DESC" },
    });
  }

  recentMessages(limit = 5) {
    return this.messageRepo.find({
      take: limit,
      order: { createdAt: "DESC" },
    });
  }

  recentNotifications(limit = 5) {
    return this.notificationRepo.find({
      take: limit,
      order: { createdAt: "DESC" },
    });
  }

  async topLocations(limit = 5) {
    const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const rows = await this.visitRepo
      .createQueryBuilder("visit")
      .select("COALESCE(NULLIF(TRIM(visit.city), ''), 'Unknown')", "city")
      .addSelect("COALESCE(NULLIF(TRIM(visit.country), ''), 'Unknown')", "country")
      .addSelect("COUNT(*)", "visitors")
      .where("visit.visitedAt >= :from", { from })
      .groupBy("visit.city")
      .addGroupBy("visit.country")
      .orderBy("visitors", "DESC")
      .limit(limit)
      .getRawMany<{ city: string; country: string; visitors: string }>();

    return rows.map((r) => ({
      city: r.city,
      country: r.country,
      visitors: Number(r.visitors),
    }));
  }
}

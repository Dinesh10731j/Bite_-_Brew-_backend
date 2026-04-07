import { AppDataSource } from "../../configs/psqlDb.config";
import { VisitLog } from "../../entities/analytics/analytics.entity";
import { Message } from "../../entities/messages/messages.entity";
import { Order } from "../../entities/order/order.entity";

export class AnalyticsRepository {
  private readonly orderRepo = AppDataSource.getRepository(Order);
  private readonly visitRepo = AppDataSource.getRepository(VisitLog);
  private readonly messageRepo = AppDataSource.getRepository(Message);

  async getTotals() {
    const [orders, messages, visits] = await Promise.all([
      this.orderRepo.count(),
      this.messageRepo.count(),
      this.visitRepo.count(),
    ]);
    return { orders, messages, visits };
  }

  async getRevenue() {
    const row = await this.orderRepo
      .createQueryBuilder("order")
      .select("COALESCE(SUM(order.totalPrice), 0)", "total")
      .getRawOne<{ total: string }>();
    return Number(row?.total || 0);
  }

  async getDailyVisits(days: number) {
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return this.visitRepo
      .createQueryBuilder("visit")
      .select("DATE(visit.visitedAt)", "day")
      .addSelect("COUNT(*)", "count")
      .where("visit.visitedAt >= :from", { from })
      .groupBy("DATE(visit.visitedAt)")
      .orderBy("DATE(visit.visitedAt)", "ASC")
      .getRawMany<{ day: string; count: string }>();
  }
}

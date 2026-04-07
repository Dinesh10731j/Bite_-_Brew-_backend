import { AppDataSource } from "../../configs/psqlDb.config";
import { Order, OrderItem } from "../../entities/order/order.entity";

export class ReportsRepository {
  private readonly orderRepo = AppDataSource.getRepository(Order);
  private readonly orderItemRepo = AppDataSource.getRepository(OrderItem);

  salesByDay(from: Date, to: Date) {
    return this.orderRepo
      .createQueryBuilder("order")
      .select("DATE(order.createdAt)", "day")
      .addSelect("COUNT(*)", "orders")
      .addSelect("COALESCE(SUM(order.totalPrice), 0)", "sales")
      .where("order.createdAt BETWEEN :from AND :to", { from, to })
      .groupBy("DATE(order.createdAt)")
      .orderBy("DATE(order.createdAt)", "ASC")
      .getRawMany<{ day: string; orders: string; sales: string }>();
  }

  topItems(from: Date, to: Date, limit = 10) {
    return this.orderItemRepo
      .createQueryBuilder("item")
      .leftJoin("item.order", "order")
      .leftJoin("item.menuItem", "menu")
      .select("menu.id", "menuItemId")
      .addSelect("menu.name", "name")
      .addSelect("SUM(item.quantity)", "quantity")
      .addSelect("SUM(item.price * item.quantity)", "sales")
      .where("order.createdAt BETWEEN :from AND :to", { from, to })
      .groupBy("menu.id")
      .addGroupBy("menu.name")
      .orderBy("SUM(item.quantity)", "DESC")
      .limit(limit)
      .getRawMany<{ menuItemId: string; name: string; quantity: string; sales: string }>();
  }
}

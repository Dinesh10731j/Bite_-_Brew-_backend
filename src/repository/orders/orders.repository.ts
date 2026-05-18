import { AppDataSource } from "../../configs/psqlDb.config";
import { OrderStatus } from "../../constant/enum.constant";
import { Order, OrderItem } from "../../entities/order/order.entity";

export class OrdersRepository {
  private readonly orderRepo = AppDataSource.getRepository(Order);

  async createOrder(orderPayload: Partial<Order>, itemPayloads: Partial<OrderItem>[]) {
    return AppDataSource.transaction(async (manager) => {
      const order = manager.create(Order, orderPayload);
      const savedOrder = await manager.save(Order, order);

      const items = itemPayloads.map((item) => manager.create(OrderItem, { ...item, orderId: savedOrder.id }));
      const savedItems = await manager.save(OrderItem, items);
      return { ...savedOrder, orderItems: savedItems };
    });
  }

  listOrders(skip: number, take: number, filters: { status?: OrderStatus; search?: string }) {
    const qb = this.orderRepo.createQueryBuilder("order")
      .leftJoinAndSelect("order.orderItems", "orderItems")
      .leftJoinAndSelect("orderItems.menuItem", "menuItem");

    if (filters.status) {
      qb.andWhere("order.status = :status", { status: filters.status });
    }
    if (filters.search) {
      qb.andWhere("(LOWER(order.customerName) LIKE :search OR LOWER(order.email) LIKE :search)", {
        search: `%${filters.search.toLowerCase()}%`,
      });
    }

    return qb.orderBy("order.createdAt", "DESC").skip(skip).take(take).getManyAndCount();
  }

  findOrderById(id: string) {
    return this.orderRepo.findOne({
      where: { id },
      relations: ["orderItems", "orderItems.menuItem"],
    });
  }

  saveOrder(order: Order) {
    return this.orderRepo.save(order);
  }

  async deleteOrderById(id: string): Promise<boolean> {
    const result = await this.orderRepo.delete({ id });
    return Boolean(result.affected && result.affected > 0);
  }
}

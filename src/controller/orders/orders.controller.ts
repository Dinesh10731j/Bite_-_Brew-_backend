import { Request, Response } from "express";
import { HTTP_STATUS } from "../../constant/statusCode.interface";
import { Message } from "../../constant/message.interface";
import { NotificationPriority, NotificationType, OrderStatus } from "../../constant/enum.constant";
import { OrdersRepository } from "../../repository/orders/orders.repository";
import { NotificationRepository } from "../../repository/notification/notification.repository";
import { OrderService } from "../../service/orders/order.service";
import { NotificationsService } from "../../service/notifications/notifications.service";

const orderService = new OrderService(new OrdersRepository());
const notificationsService = new NotificationsService(new NotificationRepository());

export class OrdersController {
  static async create(req: Request, res: Response) {
    try {
      if (!Array.isArray(req.body?.items) || req.body.items.length === 0 || !req.body?.customerName) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: Message.BAD_REQUEST });
      }

      const getItemRef = (item: { menuItemId?: unknown; id?: unknown; itemId?: unknown; name?: unknown }) => {
        if (typeof item.menuItemId === "string" && item.menuItemId.trim()) return item.menuItemId.trim();
        if (typeof item.id === "string" && item.id.trim()) return item.id.trim();
        if (typeof item.itemId === "string" && item.itemId.trim()) return item.itemId.trim();
        if (typeof item.name === "string" && item.name.trim()) return item.name.trim();
        return "";
      };

      const getQuantity = (item: { quantity?: unknown; qty?: unknown }) => {
        const raw = item.quantity ?? item.qty;
        return Number(raw);
      };

      const invalidItem = req.body.items.find(
        (item: { menuItemId?: unknown; id?: unknown; itemId?: unknown; name?: unknown; quantity?: unknown; qty?: unknown }) =>
          !getItemRef(item) || !Number.isFinite(getQuantity(item)) || getQuantity(item) <= 0
      );
      if (invalidItem) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: Message.BAD_REQUEST });
      }

      const result = await orderService.createOrder(req.body, req.user?.id);
      if ("error" in result) {
        if (result.error === "INVALID_ITEMS") {
          return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: Message.BAD_REQUEST });
        }
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          message: "Invalid menu items.",
          invalidItems: result.missing,
          suggestions: result.suggestions,
        });
      }

      try {
        const orderId = String((result.order as { id?: string })?.id || "");
        const customerName = String((result.order as { customerName?: string })?.customerName || req.body?.customerName || "Customer");
        const content = orderId
          ? `New order placed by ${customerName} (Order: ${orderId}).`
          : `New order placed by ${customerName}.`;
        await notificationsService.create({
          content,
          type: NotificationType.ORDER,
          priority: NotificationPriority.HIGH,
          userId: req.user?.id,
          actionLink: orderId ? `/orders/${orderId}` : undefined,
        });
      } catch (_notificationError) {
        // Do not fail order creation when notification persistence fails.
      }

      return res.status(HTTP_STATUS.CREATED).json({ message: Message.ORDER_PLACED, data: result.order });
    } catch (_error) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: Message.INTERNAL_SERVER_ERROR });
    }
  }

  static async list(req: Request, res: Response) {
    try {
      const result = await orderService.listOrders(req.query);
      return res.status(HTTP_STATUS.OK).json({ message: Message.SUCCESS, ...result });
    } catch (_error) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: Message.INTERNAL_SERVER_ERROR });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const id = req.params.id;
      if (!id) return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: Message.BAD_REQUEST });
      const data = await orderService.getOrderById(id);
      if (!data) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: Message.NOT_FOUND });
      }
      return res.status(HTTP_STATUS.OK).json({ message: Message.SUCCESS, data });
    } catch (_error) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: Message.INTERNAL_SERVER_ERROR });
    }
  }

  static async updateStatus(req: Request, res: Response) {
    try {
      const id = req.params.id;
      if (!id) return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: Message.BAD_REQUEST });
      const status = String(req.body?.status || "");
      if (!Object.values(OrderStatus).includes(status as OrderStatus)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: Message.BAD_REQUEST });
      }

      const data = await orderService.updateStatus(id, status as OrderStatus);
      if (!data) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: Message.NOT_FOUND });
      }
      return res.status(HTTP_STATUS.OK).json({ message: Message.UPDATED_SUCCESS, data });
    } catch (_error) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: Message.INTERNAL_SERVER_ERROR });
    }
  }
}

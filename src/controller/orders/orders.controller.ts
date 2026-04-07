import { Request, Response } from "express";
import { HTTP_STATUS } from "../../constant/statusCode.interface";
import { Message } from "../../constant/message.interface";
import { OrderStatus } from "../../constant/enum.constant";
import { OrdersRepository } from "../../repository/orders/orders.repository";
import { OrderService } from "../../service/orders/order.service";

const orderService = new OrderService(new OrdersRepository());

export class OrdersController {
  static async create(req: Request, res: Response) {
    try {
      if (!Array.isArray(req.body?.items) || req.body.items.length === 0 || !req.body?.customerName) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: Message.BAD_REQUEST });
      }

      const invalidItem = req.body.items.find(
        (item: { menuItemId?: unknown; quantity?: unknown }) =>
          !item?.menuItemId || !Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0
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

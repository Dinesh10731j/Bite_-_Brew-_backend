import { OrderStatus, PaymentMethod } from "../../constant/enum.constant";
import { AppDataSource } from "../../configs/psqlDb.config";
import { MenuItem } from "../../entities/menu/menu.entity";
import { OrdersRepository } from "../../repository/orders/orders.repository";
import { buildPaginationMeta, parsePagination } from "../../utils/helpers/pagination_helper";
import { In } from "typeorm";

interface CreateOrderItemInput {
  menuItemId?: string;
  id?: string;
  itemId?: string;
  name?: string;
  quantity?: number;
  qty?: number;
}

interface CreateOrderInput {
  customerName: string;
  phone?: string;
  email?: string;
  tableNumber?: string;
  deliveryAddress?: string;
  orderType?: string;
  paymentMethod?: PaymentMethod;
  items: CreateOrderItemInput[];
}

type CreateOrderResult =
  | { order: Awaited<ReturnType<OrdersRepository["createOrder"]>> }
  | { error: "INVALID_MENU_ITEMS"; missing: string[]; suggestions: Record<string, string[]> }
  | { error: "INVALID_ITEMS" };

export class OrderService {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async createOrder(payload: CreateOrderInput, userId?: string): Promise<CreateOrderResult> {
    const isUuid = (value: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
    const normalizeName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
    const getItemRef = (item: CreateOrderItemInput) => {
      const candidates = [item.menuItemId, item.id, item.itemId, item.name];
      for (const candidate of candidates) {
        if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
      }
      return "";
    };
    const getQuantity = (item: CreateOrderItemInput) => Number(item.quantity ?? item.qty);

    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      return { error: "INVALID_ITEMS" };
    }

    const menuRepo = AppDataSource.getRepository(MenuItem);
    const normalizedItems = payload.items.map((item) => ({
      ref: getItemRef(item),
      quantity: getQuantity(item),
    }));

    if (normalizedItems.some((item) => !item.ref || !Number.isFinite(item.quantity) || item.quantity <= 0)) {
      return { error: "INVALID_ITEMS" };
    }

    const idRefs = normalizedItems.filter((item) => isUuid(item.ref)).map((item) => item.ref);
    const nameRefs = normalizedItems
      .filter((item) => !isUuid(item.ref))
      .map((item) => item.ref.toLowerCase());

    const byId = idRefs.length ? await menuRepo.findBy({ id: In(idRefs) }) : [];
    const byName = nameRefs.length
      ? await menuRepo
          .createQueryBuilder("menu")
          .where("LOWER(menu.name) IN (:...names)", { names: nameRefs })
          .getMany()
      : [];
    const allMenuItems = nameRefs.length ? await menuRepo.find() : [];
    const sortedMenus = [...allMenuItems].sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      if (aTime !== bTime) return aTime - bTime;
      return a.id.localeCompare(b.id);
    });

    const menuById = new Map(byId.map((item) => [item.id, item]));
    const menuByName = new Map(byName.map((item) => [item.name.toLowerCase(), item]));
    const menuByNormalizedName = new Map(allMenuItems.map((item) => [normalizeName(item.name), item]));
    const menuByGeneratedCode: Map<string, MenuItem> = new Map(
      sortedMenus.map((item, index) => [`item_${String(index + 1).padStart(3, "0")}`, item] as const)
    );

    let totalPrice = 0;
    const missing: string[] = [];
    const suggestions: Record<string, string[]> = {};

    const itemPayloads: Array<{ menuItemId: string; quantity: number; price: number }> = [];
    for (const item of normalizedItems) {
      const menu = isUuid(item.ref)
        ? menuById.get(item.ref)
        : (() => {
            const loweredRef = item.ref.toLowerCase();
            const direct =
              menuByGeneratedCode.get(loweredRef) ||
              menuByName.get(loweredRef) ||
              menuByNormalizedName.get(normalizeName(item.ref));
            if (direct) return direct;

            const normalizedRef = normalizeName(item.ref);
            const fuzzy = allMenuItems.filter((m) => {
              const normalizedMenuName = normalizeName(m.name);
              return normalizedMenuName.includes(normalizedRef) || normalizedRef.includes(normalizedMenuName);
            });
            if (fuzzy.length === 1) {
              return fuzzy[0];
            }
            if (fuzzy.length > 1) {
              suggestions[item.ref] = fuzzy.slice(0, 5).map((m) => m.name);
            }
            if (fuzzy.length === 0 && /^item_\d+$/i.test(item.ref)) {
              suggestions[item.ref] = sortedMenus.slice(0, 5).map((m, idx) => `item_${String(idx + 1).padStart(3, "0")} (${m.name})`);
            }
            return undefined;
          })();
      if (!menu) {
        missing.push(item.ref);
        continue;
      }
      const price = Number(menu.price);
      totalPrice += price * item.quantity;
      itemPayloads.push({
        menuItemId: menu.id,
        quantity: item.quantity,
        price,
      });
    }
    if (missing.length > 0) {
      return { error: "INVALID_MENU_ITEMS", missing, suggestions };
    }

    const orderPayload: {
      customerName: string;
      orderType: string;
      paymentMethod: PaymentMethod;
      totalPrice: number;
      status: OrderStatus;
      phone?: string;
      email?: string;
      userId?: string;
      tableNumber?: string;
      deliveryAddress?: string;
    } = {
      customerName: payload.customerName,
      orderType: payload.orderType ?? "DINE_IN",
      paymentMethod: payload.paymentMethod ?? PaymentMethod.CASH,
      totalPrice: Number(totalPrice.toFixed(2)),
      status: OrderStatus.PENDING,
    };
    if (payload.phone) orderPayload.phone = payload.phone;
    if (payload.email) orderPayload.email = payload.email;
    if (userId) orderPayload.userId = userId;
    if (payload.tableNumber) orderPayload.tableNumber = payload.tableNumber;
    if (payload.deliveryAddress) orderPayload.deliveryAddress = payload.deliveryAddress;

    const order = await this.ordersRepository.createOrder(orderPayload, itemPayloads);
    return { order };
  }

  async listOrders(query: { page?: unknown; limit?: unknown; status?: unknown; search?: unknown }) {
    const { page, limit, skip } = parsePagination(query.page, query.limit, 10);
    const filters: { status?: OrderStatus; search?: string } = {};
    if (typeof query.status === "string") filters.status = query.status as OrderStatus;
    if (typeof query.search === "string") filters.search = query.search;
    const [data, total] = await this.ordersRepository.listOrders(skip, limit, filters);
    return { data, pagination: buildPaginationMeta(total, page, limit) };
  }

  getOrderById(id: string) {
    return this.ordersRepository.findOrderById(id);
  }

  async updateStatus(id: string, status: OrderStatus) {
    const order = await this.ordersRepository.findOrderById(id);
    if (!order) {
      return null;
    }
    order.status = status;
    return this.ordersRepository.saveOrder(order);
  }
}


import { MenuRepository } from "../../repository/menu/menu.repository";
import { buildPaginationMeta, parsePagination } from "../../utils/helpers/pagination_helper";

export class MenuService {
  constructor(private readonly menuRepository: MenuRepository) {}

  async listCategories(query: { page?: unknown; limit?: unknown; search?: unknown }) {
    const { page, limit, skip } = parsePagination(query.page, query.limit, 10);
    const search = typeof query.search === "string" ? query.search : undefined;
    const [data, total] = await this.menuRepository.listCategories(skip, limit, search);
    return { data, pagination: buildPaginationMeta(total, page, limit) };
  }

  async createCategory(payload: { name: string; description?: string; isActive?: boolean }) {
    return this.menuRepository.createCategory(payload);
  }

  async updateCategory(id: string, payload: { name?: string; description?: string; isActive?: boolean }) {
    const category = await this.menuRepository.findCategoryById(id);
    if (!category) {
      return null;
    }
    Object.assign(category, payload);
    return this.menuRepository.updateCategory(category);
  }

  async deleteCategory(id: string) {
    const category = await this.menuRepository.findCategoryById(id);
    if (!category) {
      return false;
    }
    await this.menuRepository.deleteCategory(id);
    return true;
  }

  async listMenuItems(query: { page?: unknown; limit?: unknown; search?: unknown; categoryId?: unknown; available?: unknown }) {
    const { page, limit, skip } = parsePagination(query.page, query.limit, 12);
    const filters: { search?: string; categoryId?: string; available?: boolean } = {};
    if (typeof query.search === "string") filters.search = query.search;
    if (typeof query.categoryId === "string") filters.categoryId = query.categoryId;
    if (typeof query.available === "string") filters.available = query.available === "true";
    const [data, total] = await this.menuRepository.listMenuItems(skip, limit, filters);
    return { data, pagination: buildPaginationMeta(total, page, limit) };
  }

  async createMenuItem(payload: {
    name: string;
    categoryId: string;
    price: number;
    description?: string;
    image?: string;
    available?: boolean;
    featured?: boolean;
    discount?: number;
  }) {
    const category = await this.menuRepository.findCategoryById(payload.categoryId);
    if (!category) {
      return null;
    }
    return this.menuRepository.createMenuItem(payload);
  }

  async updateMenuItem(id: string, payload: Record<string, unknown>) {
    const item = await this.menuRepository.findMenuItemById(id);
    if (!item) {
      return null;
    }
    Object.assign(item, payload);
    return this.menuRepository.updateMenuItem(item);
  }

  async deleteMenuItem(id: string) {
    const item = await this.menuRepository.findMenuItemById(id);
    if (!item) {
      return false;
    }
    await this.menuRepository.deleteMenuItem(id);
    return true;
  }
}

import { AppDataSource } from "../../configs/psqlDb.config";
import { Category, MenuItem } from "../../entities/menu/menu.entity";

export class MenuRepository {
  private readonly categoryRepo = AppDataSource.getRepository(Category);
  private readonly menuRepo = AppDataSource.getRepository(MenuItem);

  listCategories(skip: number, take: number, search?: string) {
    const qb = this.categoryRepo.createQueryBuilder("category");
    if (search) {
      qb.where("LOWER(category.name) LIKE :search", { search: `%${search.toLowerCase()}%` });
    }
    return qb.orderBy("category.createdAt", "DESC").skip(skip).take(take).getManyAndCount();
  }

  createCategory(payload: Partial<Category>) {
    const category = this.categoryRepo.create(payload);
    return this.categoryRepo.save(category);
  }

  findCategoryById(id: string) {
    return this.categoryRepo.findOneBy({ id });
  }

  updateCategory(category: Category) {
    return this.categoryRepo.save(category);
  }

  deleteCategory(id: string) {
    return this.categoryRepo.delete(id);
  }

  listMenuItems(skip: number, take: number, filters: { search?: string; categoryId?: string; available?: boolean }) {
    const qb = this.menuRepo.createQueryBuilder("menu").leftJoinAndSelect("menu.category", "category");
    if (filters.search) {
      qb.andWhere("LOWER(menu.name) LIKE :search", { search: `%${filters.search.toLowerCase()}%` });
    }
    if (filters.categoryId) {
      qb.andWhere("menu.categoryId = :categoryId", { categoryId: filters.categoryId });
    }
    if (filters.available !== undefined) {
      qb.andWhere("menu.available = :available", { available: filters.available });
    }
    return qb.orderBy("menu.createdAt", "DESC").skip(skip).take(take).getManyAndCount();
  }

  createMenuItem(payload: Partial<MenuItem>) {
    const item = this.menuRepo.create(payload);
    return this.menuRepo.save(item);
  }

  findMenuItemById(id: string) {
    return this.menuRepo.findOne({ where: { id }, relations: ["category"] });
  }

  updateMenuItem(item: MenuItem) {
    return this.menuRepo.save(item);
  }

  deleteMenuItem(id: string) {
    return this.menuRepo.delete(id);
  }
}

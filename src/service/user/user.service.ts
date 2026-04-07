import { AppDataSource } from "../../configs/psqlDb.config";
import { UserRole } from "../../constant/enum.constant";
import { User } from "../../entities/user/user.entity";
import { buildPaginationMeta, parsePagination } from "../../utils/helpers/pagination_helper";

export class UserService {
  private readonly userRepo = AppDataSource.getRepository(User);

  async listUsers(query: { page?: unknown; limit?: unknown; search?: unknown }) {
    const { page, limit, skip } = parsePagination(query.page, query.limit, 10);
    const search = typeof query.search === "string" ? query.search.trim() : "";

    const qb = this.userRepo.createQueryBuilder("user").select([
      "user.id",
      "user.name",
      "user.email",
      "user.role",
      "user.createdAt",
      "user.updatedAt",
    ]);

    if (search) {
      qb.where("LOWER(user.name) LIKE :search OR LOWER(user.email) LIKE :search", { search: `%${search.toLowerCase()}%` });
    }

    qb.orderBy("user.createdAt", "DESC").skip(skip).take(limit);
    const [data, total] = await qb.getManyAndCount();

    return { data, pagination: buildPaginationMeta(total, page, limit) };
  }

  async getById(id: string) {
    return this.userRepo.findOne({
      where: { id },
      select: ["id", "name", "email", "role", "createdAt", "updatedAt"],
    });
  }

  async updateRole(id: string, role: UserRole) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      return null;
    }
    user.role = role;
    await this.userRepo.save(user);
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  }
}


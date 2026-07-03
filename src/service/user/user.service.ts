import crypto from "crypto";
import bcrypt from "bcryptjs";
import { AppDataSource } from "../../configs/psqlDb.config";
import { UserRole } from "../../constant/enum.constant";
import { User } from "../../entities/user/user.entity";
import { buildPaginationMeta, parsePagination } from "../../utils/helpers/pagination_helper";

export class UserService {
  private readonly userRepo = AppDataSource.getRepository(User);

  private sanitizeUser(user: User) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private generateTemporaryPassword() {
    return crypto.randomBytes(8).toString("hex");
  }

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

  async listStaff(query: { page?: unknown; limit?: unknown; search?: unknown }) {
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

    qb.where("user.role = :role", { role: UserRole.STAFF });

    if (search) {
      qb.andWhere("LOWER(user.name) LIKE :search OR LOWER(user.email) LIKE :search", { search: `%${search.toLowerCase()}%` });
    }

    qb.orderBy("user.createdAt", "DESC").skip(skip).take(limit);
    const [data, total] = await qb.getManyAndCount();

    return { data: data.map((item) => this.sanitizeUser(item)), pagination: buildPaginationMeta(total, page, limit) };
  }

  async getById(id: string) {
    const user = await this.userRepo.findOne({
      where: { id },
      select: ["id", "name", "email", "role", "createdAt", "updatedAt"],
    });
    return user ? this.sanitizeUser(user) : null;
  }

  async getStaffById(id: string) {
    const user = await this.userRepo.findOne({
      where: { id, role: UserRole.STAFF },
      select: ["id", "name", "email", "role", "createdAt", "updatedAt"],
    });
    return user ? this.sanitizeUser(user) : null;
  }

  async createStaff(payload: { name: string; email: string; password?: string; role?: UserRole }) {
    const normalizedEmail = payload.email.trim().toLowerCase();
    const existing = await this.userRepo.findOne({ where: { email: normalizedEmail } });
    if (existing) {
      return null;
    }

    const generatedPassword = payload.password?.trim() || this.generateTemporaryPassword();
    const password = await bcrypt.hash(generatedPassword, 10);
    const user = this.userRepo.create({
      name: payload.name.trim(),
      email: normalizedEmail,
      password,
      role: payload.role ?? UserRole.STAFF,
    });

    const savedUser = await this.userRepo.save(user);
    return {
      ...this.sanitizeUser(savedUser),
      ...(payload.password?.trim() ? {} : { temporaryPassword: generatedPassword }),
    };
  }

  async updateStaff(id: string, payload: { name?: string; email?: string; password?: string; role?: UserRole }) {
    const user = await this.userRepo.findOne({ where: { id, role: UserRole.STAFF } });
    if (!user) {
      return null;
    }

    if (payload.name !== undefined) {
      user.name = payload.name.trim();
    }
    if (payload.email !== undefined) {
      const normalizedEmail = payload.email.trim().toLowerCase();
      const duplicate = await this.userRepo.findOne({ where: { email: normalizedEmail } });
      if (duplicate && duplicate.id !== id) {
        return null;
      }
      user.email = normalizedEmail;
    }
    if (payload.password !== undefined && payload.password.trim()) {
      user.password = await bcrypt.hash(payload.password.trim(), 10);
    }
    if (payload.role !== undefined) {
      user.role = payload.role;
    }

    await this.userRepo.save(user);
    return this.sanitizeUser(user);
  }

  async deleteStaff(id: string) {
    const user = await this.userRepo.findOne({ where: { id, role: UserRole.STAFF } });
    if (!user) {
      return false;
    }

    await this.userRepo.remove(user);
    return true;
  }

  async updateRole(id: string, role: UserRole) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      return null;
    }
    user.role = role;
    await this.userRepo.save(user);
    return this.sanitizeUser(user);
  }
}


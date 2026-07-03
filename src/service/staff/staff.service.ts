import { AppDataSource } from "../../configs/psqlDb.config";
import { Staff } from "../../entities/staff/staff.entity";
import { buildPaginationMeta, parsePagination } from "../../utils/helpers/pagination_helper";

export class StaffService {
  private readonly staffRepo = AppDataSource.getRepository(Staff);

  private sanitizeStaff(staff: Staff) {
    return {
      id: staff.id,
      name: staff.name,
      email: staff.email,
      image: staff.image,
      role: staff.role,
      createdAt: staff.createdAt,
      updatedAt: staff.updatedAt,
    };
  }

  async listStaff(query: { page?: unknown; limit?: unknown; search?: unknown }) {
    const { page, limit, skip } = parsePagination(query.page, query.limit, 10);
    const search = typeof query.search === "string" ? query.search.trim() : "";

    const qb = this.staffRepo.createQueryBuilder("staff").select([
      "staff.id",
      "staff.name",
      "staff.email",
      "staff.image",
      "staff.role",
      "staff.createdAt",
      "staff.updatedAt",
    ]);

    if (search) {
      qb.where("LOWER(staff.name) LIKE :search OR LOWER(staff.email) LIKE :search", {
        search: `%${search.toLowerCase()}%`,
      });
    }

    qb.orderBy("staff.createdAt", "DESC").skip(skip).take(limit);
    const [data, total] = await qb.getManyAndCount();

    return { data: data.map((item) => this.sanitizeStaff(item)), pagination: buildPaginationMeta(total, page, limit) };
  }

  async getStaffById(id: string) {
    const staff = await this.staffRepo.findOne({
      where: { id },
      select: ["id", "name", "email", "image", "role", "createdAt", "updatedAt"],
    });
    return staff ? this.sanitizeStaff(staff) : null;
  }

  async createStaff(payload: { name: string; email: string; image?: string; role: string }) {
    const normalizedEmail = payload.email.trim().toLowerCase();
    const existing = await this.staffRepo.findOne({ where: { email: normalizedEmail } });
    if (existing) {
      return null;
    }

    const staff = this.staffRepo.create({
      name: payload.name.trim(),
      email: normalizedEmail,
      image: payload.image?.trim(),
      role: payload.role.trim(),
    });

    const savedStaff = await this.staffRepo.save(staff);
    return this.sanitizeStaff(savedStaff);
  }

  async updateStaff(
    id: string,
    payload: { name?: string; email?: string; image?: string; role?: string },
  ) {
    const staff = await this.staffRepo.findOne({ where: { id } });
    if (!staff) {
      return null;
    }

    if (payload.name !== undefined) {
      staff.name = payload.name.trim();
    }
    if (payload.email !== undefined) {
      const normalizedEmail = payload.email.trim().toLowerCase();
      const duplicate = await this.staffRepo.findOne({ where: { email: normalizedEmail } });
      if (duplicate && duplicate.id !== id) {
        return undefined;
      }
      staff.email = normalizedEmail;
    }
    if (payload.image !== undefined) {
      staff.image = payload.image.trim();
    }
    if (payload.role !== undefined) {
      staff.role = payload.role.trim();
    }

    await this.staffRepo.save(staff);
    return this.sanitizeStaff(staff);
  }

  async deleteStaff(id: string) {
    const staff = await this.staffRepo.findOne({ where: { id } });
    if (!staff) {
      return false;
    }

    await this.staffRepo.remove(staff);
    return true;
  }
}

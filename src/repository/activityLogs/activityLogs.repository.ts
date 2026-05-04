import { AppDataSource } from "../../configs/psqlDb.config";
import { UserRole } from "../../constant/enum.constant";
import { VisitLog } from "../../entities/analytics/analytics.entity";
import { AdminLog } from "../../entities/auth/auth.entity";

export class ActivityLogsRepository {
  private readonly visitRepo = AppDataSource.getRepository(VisitLog);
  private readonly adminRepo = AppDataSource.getRepository(AdminLog);

  async list(params: {
    role: UserRole;
    currentUserId: string;
    page: number;
    limit: number;
    userId?: string;
  }) {
    const { role, currentUserId, page, limit, userId } = params;
    const canViewAll = role === UserRole.ADMIN || role === UserRole.MANAGER;
    const effectiveUserId = canViewAll ? userId : currentUserId;

    const visitQb = this.visitRepo.createQueryBuilder("visit");
    if (effectiveUserId) {
      visitQb.andWhere("visit.userId = :userId", { userId: effectiveUserId });
    }

    const [visitLogs, visitTotal] = await visitQb
      .orderBy("visit.visitedAt", "DESC")
      .take(limit * page)
      .getManyAndCount();

    let adminLogs: AdminLog[] = [];
    let adminTotal = 0;
    if (canViewAll) {
      const adminQb = this.adminRepo.createQueryBuilder("adminLog");
      if (userId) {
        adminQb.andWhere("adminLog.adminId = :adminId", { adminId: userId });
      }
      const adminResult = await adminQb
        .orderBy("adminLog.timestamp", "DESC")
        .take(limit * page)
        .getManyAndCount();
      adminLogs = adminResult[0];
      adminTotal = adminResult[1];
    }

    return { visitLogs, visitTotal, adminLogs, adminTotal };
  }
}


import { UserRole } from "../../constant/enum.constant";
import { ActivityLogsRepository } from "../../repository/activityLogs/activityLogs.repository";
import { buildPaginationMeta, parsePagination } from "../../utils/helpers/pagination_helper";

type ActivityLogItem = {
  id: string;
  type: "visit" | "admin_action";
  userId?: string;
  userName?: string;
  action?: string;
  details?: string;
  ip?: string;
  country?: string;
  city?: string;
  device?: string;
  browser?: string;
  os?: string;
  referrer?: string;
  sessionId?: string;
  timestamp: Date;
};

export class ActivityLogsService {
  constructor(private readonly repository: ActivityLogsRepository) {}

  async list(query: { page?: unknown; limit?: unknown; userId?: unknown }, currentUser: { id: string; role: UserRole }) {
    const { page, limit } = parsePagination(query.page, query.limit, 20);
    const userId = typeof query.userId === "string" ? query.userId : undefined;

    const { visitLogs, visitTotal, adminLogs, adminTotal } = await this.repository.list({
      role: currentUser.role,
      currentUserId: currentUser.id,
      page,
      limit,
      userId,
    });

    const visitItems: ActivityLogItem[] = visitLogs.map((visit) => ({
      id: visit.id,
      type: "visit",
      userId: visit.userId,
      userName: visit.user?.name || "Anonymous",
      ip: visit.ip,
      country: visit.country,
      city: visit.city,
      device: visit.device,
      browser: visit.browser,
      os: visit.os,
      referrer: visit.referrer,
      sessionId: visit.sessionId,
      timestamp: visit.visitedAt,
    }));

    const adminItems: ActivityLogItem[] = adminLogs.map((log) => ({
      id: log.id,
      type: "admin_action",
      userId: log.adminId,
      userName: log.admin?.name || "Unknown",
      action: log.action,
      details: log.details,
      timestamp: log.timestamp,
    }));

    const merged = [...visitItems, ...adminItems].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    const skip = (page - 1) * limit;
    const data = merged.slice(skip, skip + limit);
    const total = visitTotal + adminTotal;

    return {
      data,
      pagination: buildPaginationMeta(total, page, limit),
    };
  }
}


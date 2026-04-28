import { DashboardRepository } from "../../repository/dashboard/dashboard.repository";

export class DashboardService {
  constructor(private readonly repository: DashboardRepository) {}

  async getOverview(limit = 5) {
    const [cards, trafficSummary, topSellingItems, recentOrders, recentMessages, notifications, topLocations] = await Promise.all([
      this.repository.cards(),
      this.repository.trafficSummary(),
      this.repository.topSellingItems(limit),
      this.repository.recentOrders(limit),
      this.repository.recentMessages(limit),
      this.repository.recentNotifications(limit),
      this.repository.topLocations(limit),
    ]);

    return {
      cards,
      trafficSummary,
      topSellingItems,
      recentOrders,
      recentMessages,
      notifications,
      topLocations,
    };
  }
}

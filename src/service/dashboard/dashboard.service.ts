import { DashboardRepository } from "../../repository/dashboard/dashboard.repository";

export class DashboardService {
  constructor(private readonly repository: DashboardRepository) {}

  async getOverview(limit = 5) {
    const [cards, recentOrders] = await Promise.all([
      this.repository.cards(),
      this.repository.recentOrders(limit),
    ]);

    return { cards, recentOrders };
  }
}

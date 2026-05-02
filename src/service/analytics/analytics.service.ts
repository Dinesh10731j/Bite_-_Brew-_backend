import { AnalyticsRepository } from "../../repository/analytics/analytics.repository";

export class AnalyticsService {
  constructor(private readonly repository: AnalyticsRepository) {}

  async summary(days = 7) {
    const [totals, revenue, dailyVisits, dailyOrders, dailyRevenue] = await Promise.all([
      this.repository.getTotals(),
      this.repository.getRevenue(),
      this.repository.getDailyVisits(days),
      this.repository.getDailyOrders(days),
      this.repository.getDailyRevenue(days),
    ]);
    const conversionRate = totals.visits > 0
      ? Number(((totals.orders / totals.visits) * 100).toFixed(2))
      : 0;

    return {
      totals,
      conversionRate,
      revenue,
      dailyVisits: dailyVisits.map((entry) => ({
        day: entry.day,
        count: Number(entry.count),
      })),
      dailyOrders: dailyOrders.map((entry) => ({
        day: entry.day,
        count: Number(entry.count),
      })),
      dailyRevenue: dailyRevenue.map((entry) => ({
        day: entry.day,
        revenue: Number(entry.revenue),
      })),
    };
  }
}

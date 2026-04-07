import { AnalyticsRepository } from "../../repository/analytics/analytics.repository";

export class AnalyticsService {
  constructor(private readonly repository: AnalyticsRepository) {}

  async summary(days = 7) {
    const [totals, revenue, dailyVisits] = await Promise.all([
      this.repository.getTotals(),
      this.repository.getRevenue(),
      this.repository.getDailyVisits(days),
    ]);

    return {
      totals,
      revenue,
      dailyVisits: dailyVisits.map((entry) => ({
        day: entry.day,
        count: Number(entry.count),
      })),
    };
  }
}

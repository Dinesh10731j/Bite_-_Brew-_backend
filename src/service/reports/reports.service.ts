import { ReportsRepository } from "../../repository/reports/reports.repository";

export class ReportsService {
  constructor(private readonly repository: ReportsRepository) {}

  async salesReport(from?: string, to?: string) {
    const start = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = to ? new Date(to) : new Date();

    const [salesByDay, topItems] = await Promise.all([
      this.repository.salesByDay(start, end),
      this.repository.topItems(start, end, 10),
    ]);

    const totals = salesByDay.reduce(
      (acc, day) => {
        acc.orders += Number(day.orders);
        acc.sales += Number(day.sales);
        return acc;
      },
      { orders: 0, sales: 0 }
    );

    return {
      range: { from: start.toISOString(), to: end.toISOString() },
      totals,
      salesByDay: salesByDay.map((entry) => ({
        day: entry.day,
        orders: Number(entry.orders),
        sales: Number(entry.sales),
      })),
      topItems: topItems.map((item) => ({
        menuItemId: item.menuItemId,
        name: item.name,
        quantity: Number(item.quantity),
        sales: Number(item.sales),
      })),
    };
  }
}

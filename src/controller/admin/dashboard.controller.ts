import { Request, Response } from 'express';
import { MoreThan } from 'typeorm';
import { AppDataSource } from '../../configs/psqlDb.config';
import { MESSAGES } from '../../constant/message.interface';
import { Message as MessageEntity } from '../../entities/messages/messages.entity';
import { MenuItem } from '../../entities/menu/menu.entity';
import { Notification } from '../../entities/notifications/notifications.entity';
import { Order } from '../../entities/order/order.entity';
import { User } from '../../entities/user/user.entity';
import { VisitLog } from '../../entities/analytics/analytics.entity';

export const overview = async (_req: Request, res: Response) => {
  try {
    const userRepo = AppDataSource.getRepository(User);
    const orderRepo = AppDataSource.getRepository(Order);
    const itemRepo = AppDataSource.getRepository(MenuItem);
    const messageRepo = AppDataSource.getRepository(MessageEntity);
    const notifRepo = AppDataSource.getRepository(Notification);

    const todayStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const totalVisitors = await userRepo.count();
    const visitorsToday = await userRepo.count({ where: { createdAt: MoreThan(todayStart) } });
    const ordersToday = await orderRepo.count({ where: { createdAt: MoreThan(todayStart) } });
    const revenue = await orderRepo
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.totalPrice), 0)', 'sum')
      .where('o.createdAt > :start', { start: todayStart })
      .andWhere('o.status = :status', { status: 'COMPLETED' })
      .getRawOne<{ sum: string }>();

    const recentOrders = await orderRepo.find({
      order: { createdAt: 'DESC' },
      take: 5,
      relations: { orderItems: { menuItem: true } },
    });
    const recentMessages = await messageRepo.find({ order: { createdAt: 'DESC' }, take: 5 });
    const recentNotifs = await notifRepo.find({ order: { createdAt: 'DESC' }, take: 5 });
    const topItems = await itemRepo.find({ order: { popularity: 'DESC' }, take: 5 });

    return res.json({
      message: MESSAGES.SUCCESS,
      data: {
        metrics: {
          totalVisitors,
          visitorsToday,
          ordersToday,
          revenueToday: Number(revenue?.sum ?? 0),
          conversionRate: visitorsToday > 0 ? Math.round((ordersToday / visitorsToday) * 100) : 0,
        },
        recentOrders,
        recentMessages,
        recentNotifs,
        topItems,
      },
    });
  } catch (_error) {
    return res.status(500).json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

export const analytics = async (req: Request, res: Response) => {
  try {
    const days = Number(req.query.days ?? 30);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const visitRepo = AppDataSource.getRepository(VisitLog);

    const visits = await visitRepo.find({
      where: { visitedAt: MoreThan(startDate) },
      order: { visitedAt: 'DESC' },
    });

    const byCountry = new Map<string, number>();
    const byCity = new Map<string, number>();

    for (const v of visits) {
      const country = v.country?.trim() || 'Unknown';
      const city = v.city?.trim() || 'Unknown';
      byCountry.set(country, (byCountry.get(country) ?? 0) + 1);
      byCity.set(city, (byCity.get(city) ?? 0) + 1);
    }

    const visitorsByCountry = Array.from(byCountry.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([country, visitors]) => ({ country, visitors }));

    const visitorsByCity = Array.from(byCity.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([city, visitors]) => ({ city, visitors }));

    return res.json({
      message: MESSAGES.SUCCESS,
      data: {
        realTimeActive: 0,
        visitorsByCountry,
        visitorsByCity,
        deviceBreakdown: [],
        browserStats: [],
        osStats: [],
        referrers: [],
        trafficOverTime: [],
      },
    });
  } catch (_error) {
    return res.status(500).json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

export const ordersList = async (req: Request, res: Response) => {
  try {
    const orderRepo = AppDataSource.getRepository(Order);
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const skip = (page - 1) * limit;

    const qb = orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.orderItems', 'orderItem')
      .leftJoinAndSelect('orderItem.menuItem', 'menuItem')
      .orderBy('order.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (req.query.status) qb.andWhere('order.status = :status', { status: req.query.status });
    if (req.query.customerName) qb.andWhere('order.customerName ILIKE :name', { name: `%${req.query.customerName}%` });

    const [orders, total] = await qb.getManyAndCount();
    return res.json({
      message: MESSAGES.SUCCESS,
      data: { orders, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
    });
  } catch (_error) {
    return res.status(500).json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

export const messagesList = async (_req: Request, res: Response) => {
  try {
    const messageRepo = AppDataSource.getRepository(MessageEntity);
    const messages = await messageRepo.find({ order: { createdAt: 'DESC' }, take: 50 });
    return res.json({ message: MESSAGES.SUCCESS, data: messages });
  } catch (_error) {
    return res.status(500).json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

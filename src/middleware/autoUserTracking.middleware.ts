import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../configs/psqlDb.config';
import { AdminLog } from '../entities/auth/auth.entity';
import { VisitLog } from '../entities/analytics/analytics.entity';
import { UserRole } from '../constant/enum.constant';
import geoip from 'geoip-lite';

/**
 * Auto-track user actions in AdminLog.
 * Requires req.user from auth middleware.
 */
export const autoUserTracking = async (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'test') {
    return next();
  }

  res.on('finish', async () => {
    const rawIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip;
    const ip = (rawIp || '').replace('::ffff:', '');
    const geo = geoip.lookup(ip);

    try {
      const visit = new VisitLog();
      if (req.user?.id) visit.userId = req.user.id;
      visit.ip = ip || 'unknown';
      visit.country = geo?.country || 'Unknown';
      visit.city = geo?.city || 'Unknown';
      const device = req.get('sec-ch-ua-mobile');
      const browser = req.get('user-agent');
      const os = req.get('sec-ch-ua-platform');
      const referrer = req.get('referer');
      const sessionId = req.get('x-session-id');
      if (device) visit.device = device;
      if (browser) visit.browser = browser;
      if (os) visit.os = os;
      if (referrer) visit.referrer = referrer;
      if (sessionId) visit.sessionId = sessionId;
      visit.bounced = false;
      visit.pageViews = 1;
      await AppDataSource.manager.save(visit);
    } catch (error) {
      console.error('Visit tracking failed:', error);
    }

    if (req.user?.role === UserRole.ADMIN) {
      try {
        const log = new AdminLog();
        log.adminId = req.user.id;
        log.action = `${req.method} ${req.path}`;
        log.details = `IP: ${ip}, UA: ${req.get('User-Agent')}`;
        await AppDataSource.manager.save(log);
      } catch (error) {
        console.error('Admin tracking failed:', error);
      }
    }
  });

  next();
};


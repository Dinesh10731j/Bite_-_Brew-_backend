import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { AppDataSource } from '../configs/psqlDb.config';
import { Notification } from "../entities/notifications/notifications.entity";
import { NotificationPriority, NotificationType } from '../constant/enum.constant';

/**
 * Notification queue worker.
 */
const connection = new IORedis({ host: process.env.REDIS_HOST || 'localhost', port: Number(process.env.REDIS_PORT || 6379), maxRetriesPerRequest: null });

export const notificationWorker = new Worker('notifications', async (job) => {
  const { userId, content, type, priority, actionLink } = job.data;
  
  const notification = new Notification();
  notification.userId = userId;
  notification.content = String(content || '');
  notification.type = (type || NotificationType.SYSTEM) as string;
  notification.priority = (priority || NotificationPriority.LOW) as string;
  notification.actionLink = actionLink;
  notification.isRead = false;
  
  await AppDataSource.manager.save(notification);
}, { connection });


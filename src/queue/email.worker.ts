import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { sendSmtpMail } from '../configs/smtp.config';

/**
 * Email queue worker using BullMQ + nodemailer.
 */
const connection = new IORedis({ host: process.env.REDIS_HOST || 'localhost', port: Number(process.env.REDIS_PORT || 6379), maxRetriesPerRequest: null });

export const emailWorker = new Worker('email', async (job) => {
  const { to, subject, html } = job.data;
  await sendSmtpMail({ to, subject, html });
}, { connection });


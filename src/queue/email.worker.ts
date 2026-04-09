import { Worker } from 'bullmq';
import { sendSmtpMail } from '../configs/smtp.config';
import { workerOptions } from '../queues/bullmq.config';
import type { EmailQueuePayload } from './email.queue';

/**
 * Email queue worker using BullMQ + nodemailer.
 */
export const emailWorker = new Worker('email', async (job) => {
  const { to, subject, html } = job.data as EmailQueuePayload;
  await sendSmtpMail({ to, subject, html });
}, workerOptions);


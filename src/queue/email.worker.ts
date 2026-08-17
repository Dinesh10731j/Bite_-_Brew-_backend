import { Worker } from 'bullmq';
import { sendSmtpMail } from '../configs/smtp.config';
import { workerOptions } from '../queues/bullmq.config';
import { envConfig } from '../configs/env.config';
import type { EmailQueuePayload } from './email.queue';

/**
 * Email queue worker using BullMQ + nodemailer.
 *
 * Gated by ENABLE_WORKERS so only designated replicas run background workers.
 * This prevents every API replica from duplicating worker consumption.
 * (BullMQ would dedupe via Redis locks, but gating keeps maintenance jobs and
 * worker lifecycle predictable.)
 */
export const emailWorker = envConfig.ENABLE_WORKERS
  ? new Worker(
      'email',
      async (job) => {
        const { to, subject, html } = job.data as EmailQueuePayload;
        await sendSmtpMail({ to, subject, html });
      },
      workerOptions,
    )
  : null;

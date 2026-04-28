import { JobsOptions } from "bullmq";
import { createQueue } from "../queues/bullmq.config";

export type EmailQueuePayload = {
  to: string;
  subject: string;
  html: string;
};

const isTest = process.env.NODE_ENV === "test";
const emailQueue = isTest ? null : createQueue("email");

const emailJobOptions: JobsOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 5000 },
  removeOnComplete: 100,
  removeOnFail: 200,
};

export const enqueueEmail = async (payload: EmailQueuePayload): Promise<void> => {
  if (!emailQueue) return;
  await emailQueue.add("send-email", payload, emailJobOptions);
};

export const enqueueBulkEmail = async (payloads: EmailQueuePayload[]): Promise<void> => {
  if (!emailQueue) return;
  if (payloads.length === 0) {
    return;
  }

  const chunkSize = 500;
  for (let index = 0; index < payloads.length; index += chunkSize) {
    const chunk = payloads.slice(index, index + chunkSize);
    await emailQueue.addBulk(
      chunk.map((payload) => ({
        name: "send-email",
        data: payload,
        opts: emailJobOptions,
      })),
    );
  }
};

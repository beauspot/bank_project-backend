// src/queues/email.queue.ts
import { Queue, Worker, ConnectionOptions } from "bullmq";
import { config } from "dotenv";

import { EmailService } from "@/services/email.service";
import AppError from "@/utils/appErrors";
import log from "@/utils/logging";
import redisModule from "@/utils/redis";

const { redisClient } = redisModule;
const connection: ConnectionOptions = redisClient;
config();

// Job data types
export interface VerificationOTPJobData {
  type: "verification-otp";
  email: string;
  name: string;
  otp: string;
  expiryMinutes: number;
}

export interface WelcomeEmailJobData {
  type: "welcome";
  email: string;
  name: string;
  message: string;
}

export type EmailJobData = VerificationOTPJobData | WelcomeEmailJobData;

// Queue definition
const emailQueue = new Queue("email-notifications", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

// Job adders
export async function queueVerificationOTP(data: {
  email: string;
  name: string;
  otp: string;
  expiryMinutes: number;
}): Promise<void> {
  await emailQueue.add(
    "verification-otp",
    {
      type: "verification-otp",
      ...data,
    } satisfies VerificationOTPJobData,
    {
      priority: 1, // high priority — user is waiting for this
    },
  );

  log.info(`Verification OTP email queued for ${data.email}`);
}

export async function queueWelcomeEmail(data: {
  email: string;
  name: string;
  message: string;
}): Promise<void> {
  await emailQueue.add("welcome", {
    type: "welcome",
    ...data,
  } satisfies WelcomeEmailJobData);

  log.info(`Welcome email queued for ${data.email}`);
}

// Worker to process email jobs
const emailWorker = new Worker(
  "email-notifications",
  async (job) => {
    log.info(`Processing email job data`);
    const emailService = new EmailService();
    const data: EmailJobData = job.data;

    switch (data.type) {
      case "verification-otp":
        await emailService.sendVerificationOTP({
          email: data.email,
          name: data.name,
          otp: data.otp,
          expiryMinutes: data.expiryMinutes,
        });
        break;

      case "welcome":
        await emailService.sendWelcomeEmail({
          email: data.email,
          name: data.name,
          message: data.message,
        });
        break;

      default:
        throw new AppError(
          `Unknown email job type: ${(data as any).type}`,
          400,
          false,
        );
    }
  },
  { connection },
);

// Worker events
emailWorker.on("completed", (job) => {
  log.info(`Email job ${job.id} (${job.name}) completed successfully`);
});

emailWorker.on("failed", (job, err) => {
  log.error(`Email job ${job?.id} (${job?.name}) failed: ${err.message}`);
});

export default {
  emailQueue,
  emailWorker,
  queueVerificationOTP,
  queueWelcomeEmail,
};

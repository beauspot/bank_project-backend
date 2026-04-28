// src/queues/profilePhoto.queue.ts
import { Queue, Worker, ConnectionOptions } from "bullmq";
import { v2 as cldry } from "cloudinary";

import { AppDataSource } from "@/config/db.config";
import "@/config/cloudinary.config"; // initialize cloudinary
import { User } from "@/models/userEntity";
// import AppError from "@/utils/appErrors";
import log from "@/utils/logging";
import redisModule from "@/utils/redis";

const { redisClient } = redisModule;
const connection: ConnectionOptions = redisClient;

export interface ProfilePhotoJobData {
  userId: string;
  newPhotoUrl: string;
  newPhotoPublicId: string;
  oldPhotoPublicId: string | null;
}

// Queue definition
export const profilePhotoQueue = new Queue("profile-photo-upload", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 3000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

// Add job to queue
export async function queueProfilePhotoUploadProcessing(
  data: ProfilePhotoJobData,
): Promise<void> {
  await profilePhotoQueue.add("upload-profile-photo", data);
  log.info(`Profile photo upload queued for user ${data.userId}`);
}

// Worker
export const profilePhotoWorker = new Worker(
  "profile-photo-upload",
  async (job) => {
    const {
      userId,
      newPhotoUrl,
      newPhotoPublicId,
      oldPhotoPublicId,
    }: ProfilePhotoJobData = job.data;

    const userRepository = AppDataSource.getRepository(User);

    // Step 1 — Delete the old photo from Cloudinary if any exists
    if (oldPhotoPublicId) {
      try {
        await cldry.uploader.destroy(oldPhotoPublicId);
        log.info(`Deleted old profile photo: ${oldPhotoPublicId}`);
      } catch (err) {
        // This is Non-fatal — log and continue
        log.warn(`Could not delete old photo ${oldPhotoPublicId}: ${err}`);
      }
    }

    // Step 2 — Persist the new Cloudinary URL and public_id to DB
    await userRepository.update(userId, {
      profilePhoto: newPhotoUrl,
      profilePhotoPublicId: newPhotoPublicId,
    });

    log.info(
      `Profile Photo DB update completed for user ${userId}: ${newPhotoUrl}`,
    );

    return {
      success: true,
      photoUrl: newPhotoUrl,
      publicId: newPhotoPublicId,
    };
  },
  { connection },
);

// Worker events
profilePhotoWorker.on("completed", (job) => {
  log.info(`Profile photo job ${job.id} completed successfully`);
});

profilePhotoWorker.on("failed", (job, err) => {
  log.error(`Profile photo job ${job?.id} failed: ${err.message}`);
});

export default {
  profilePhotoQueue,
  profilePhotoWorker,
  queueProfilePhotoUploadProcessing,
};

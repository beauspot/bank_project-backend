import crypto from "crypto";

import redisModule from "@/utils/redis";

export function generateOTP(length: number = 6): string {
  const max = Math.pow(10, length);
  const buffer = crypto.randomBytes(4);
  const otp = buffer.readUInt32BE(0) % max;
  return otp.toString().padStart(length, "0");
}

export function getOTPExpiry(minutes: number = 10): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

const { redisClient } = redisModule;

// Key patterns — this keeps OTP keys organized and collision-free
const OTP_KEYS = {
  emailVerification: (userId: string) => `otp:email-verification:${userId}`,
  passwordReset: (email: string) => `otp:password-reset:${email}`,
  phoneChange: (userId: string) => `otp:phone-change:${userId}`,
  emailChange: (userId: string) => `otp:email-change:${userId}`,
  pendingPhone: (userId: string) => `otp:pending-phone:${userId}`,
  pendingEmail: (userId: string) => `otp:pending-email:${userId}`,
  passwordResetToken: (token: string) => `otp:password-reset-token:${token}`,
} as const;

const OTP_EXPIRY_SECONDS = 10 * 60; // 10 minutes

// ─── Store OTP ──────────────────────────────────────────────────────
async function storeOTP(key: string, otp: string): Promise<void> {
  await redisClient.setex(key, OTP_EXPIRY_SECONDS, otp);
}

// ─── Get OTP ────────────────────────────────────────────────────────
async function getOTP(key: string): Promise<string | null> {
  return redisClient.get(key);
}

// ─── Delete OTP ─────────────────────────────────────────────────────
async function deleteOTP(key: string): Promise<void> {
  await redisClient.del(key);
}

// ─── Verify OTP ─────────────────────────────────────────────────────
// This Returns true if valid, throws false if invalid or expired
async function verifyOTP(key: string, submittedOTP: string): Promise<void> {
  const storedOTP = await getOTP(key);

  if (!storedOTP)
    throw new Error(
      "OTP has expired or does not exist. Please request a new one",
    );

  if (storedOTP !== submittedOTP)
    throw new Error("Invalid OTP. Please try again");

  // Delete OTP immediately after successful verification — single use
  await deleteOTP(key);
}

// ─── Store pending value (e.g new phone/email before confirmation) ──
async function storePendingValue(key: string, value: string): Promise<void> {
  await redisClient.setex(key, OTP_EXPIRY_SECONDS, value);
}

// ─── Get pending value ───────────────────────────────────────────────
async function getPendingValue(key: string): Promise<string | null> {
  return redisClient.get(key);
}

// ─── Delete pending value ────────────────────────────────────────────
async function deletePendingValue(key: string): Promise<void> {
  await redisClient.del(key);
}

export {
  OTP_KEYS,
  OTP_EXPIRY_SECONDS,
  storeOTP,
  getOTP,
  deleteOTP,
  verifyOTP,
  storePendingValue,
  getPendingValue,
  deletePendingValue,
};

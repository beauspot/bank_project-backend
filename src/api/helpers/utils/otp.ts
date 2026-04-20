import crypto from "crypto";

export function generateOTP(length: number = 4): string {
  const max = Math.pow(10, length);
  const buffer = crypto.randomBytes(4);
  const otp = buffer.readUInt32BE(0) % max;
  return otp.toString().padStart(length, "0");
}

export function getOTPExpiry(minutes: number = 10): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

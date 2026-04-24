// import crypto from "crypto";

import { Session } from "express-session";
import { injectable, inject } from "tsyringe";

// import { UserType } from "@/types/user.types";
// import { UserRole } from "@/enums/user";
import { UserInterface, UserServiceInterface } from "@/interface/user";
import { queueVerificationOTP, queueWelcomeEmail } from "@/queues/mail.queue";
import VirtualAcctQueue from "@/queues/virtualAcct.queues";
import { UserRepository } from "@/repositories/user.repo";
import AppError from "@/utils/appErrors";
import { generateOTP, getOTPExpiry } from "@/utils/otp";
import { UserServiceUtils } from "@/utils/user.utils";

// const { redisClient } = redisModule;
// const { addMailToQueue } = emailQueues;
// import { EmailJobData } from "@/interfaces/email.interface";
// import emailQueues from "@/queues/email.queues";
// import WalletQueue from "@/queues/wallet.queues";
// import redisModule from "@/utils/redis";

// TODO: UserService class shld implement UserServiceInterface imported from "interface/user"

@injectable()
class UserService implements UserServiceInterface {
  constructor(
    @inject(UserRepository) private userRepository: UserRepository,
    @inject(UserServiceUtils) private userServiceUtils: UserServiceUtils,
  ) {}

  IV_LENGTH = 16;

  async registerUser(userData: Partial<UserInterface>) {
    if (!userData.password)
      throw new AppError("Password is not correct Please enter a new password");

    const hashedPassword = await this.userServiceUtils.hashPassword(
      userData.password,
    );

    const userRepository = this.userRepository.create({
      ...userData,
      password: hashedPassword,
    });

    const savedUser = await this.userRepository.save(userRepository);

    await VirtualAcctQueue.queueVirtualAccountCreation(savedUser.id, userData);

    return { user: savedUser };
  }

  async loginUser(identifier: string, password: string) {
    if (!identifier || !password) {
      throw new AppError("Provide phone or email and password!");
    }

    const user = await this.userRepository.findOne({
      where: [{ email: identifier }, { phonenumber: identifier }],
      select: ["id", "password"],
    });

    if (
      !user ||
      !(await this.userServiceUtils.verifyPassword(password, user.password))
    ) {
      throw new AppError("Incorrect email/phone number or password");
    }

    return user;
  }

  async logout(session: Session): Promise<void> {
    return new Promise((resolve, reject) => {
      session.destroy((error: any) => {
        if (error) {
          return reject(new AppError("Logout Failed."));
        }
        resolve();
      });
    });
  }

  async sendVerificationOTP(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new AppError("User not found", 404);

    if (user.isEmailVerified) {
      throw new AppError("Email is already verified", 400);
    }

    const otp = generateOTP(4);
    const expiryMinutes = 10;

    // Save OTP to DB first before queuing
    user.emailVerificationOTP = otp;
    user.emailVerificationOTPExpires = getOTPExpiry(expiryMinutes);
    await this.userRepository.save(user);

    // Queue the email — non-blocking, returns immediately
    await queueVerificationOTP({
      email: user.email,
      name: user.firstname,
      otp,
      expiryMinutes,
    });
  }

  async verifyEmail(userId: string, otp: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new AppError("User not found", 404);

    if (user.isEmailVerified)
      throw new AppError("Email is already verified", 400);

    if (!user.emailVerificationOTP || !user.emailVerificationOTPExpires)
      throw new AppError("No OTP found, please request a new one", 400);

    if (new Date() > user.emailVerificationOTPExpires) {
      // Clear expired OTP
      user.emailVerificationOTP = null;
      user.emailVerificationOTPExpires = null;
      await this.userRepository.save(user);
      throw new AppError("OTP has expired, please request a new one", 400);
    }

    if (user.emailVerificationOTP !== otp)
      throw new AppError("Invalid OTP", 400);

    // Mark as verified and clear OTP
    user.isEmailVerified = true;
    user.emailVerificationOTP = null;
    user.emailVerificationOTPExpires = null;
    await this.userRepository.save(user);

    // Queue welcome email — fire and forget after verification
    await queueWelcomeEmail({
      email: user.email,
      name: user.firstname,
      message: `Your email has been verified successfully. Welcome to Bank-Hub! Your account is now active.`,
    });
  }
}

export default UserService;

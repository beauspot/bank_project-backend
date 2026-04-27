// import crypto from "crypto";

import { Session } from "express-session";
import { injectable, inject } from "tsyringe";

// import { UserType } from "@/types/user.types";
// import { UserRole } from "@/enums/user";
import { sanitizeProfileResponse, UserProfileResponse } from "@/dto/user.dto";
import { UserInterface, UserServiceInterface } from "@/interface/user";
import {
  queueVerificationOTP,
  queueWelcomeEmail,
  queuePasswordResetOTP,
  queuePasswordChangedEmail,
} from "@/queues/mail.queue";
import { queueProfilePhotoUploadProcessing } from "@/queues/profilePhoto.queue";
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

    if (user.isEmailVerified)
      throw new AppError("Email is already verified", 400);

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

  // Step 1 - User forgets password
  async forgotPassword(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);

    if (!user)
      throw new AppError(
        `There are no accounts associated with this address: ${email}`,
        400,
      );

    if (!user.accountStatus)
      throw new AppError(
        `This account either doesn't or has been deactivated`,
        403,
      );

    // check if the user has exceeded reset attempts
    if (user.passwordResetAttempts >= 5) {
      const coolDownExpired =
        !user.passwordResetExpires || new Date() > user.passwordResetExpires;

      if (!coolDownExpired)
        throw new AppError(
          "Password Reset Limit reached.Please try again in 10 minutes",
        );

      // Reset attempts after cooldown has expired
      user.passwordResetAttempts = 0;
    }

    const otp = generateOTP(6);
    const expiryMinutes = 10;

    // Save OTP to DB first before queuing
    user.emailVerificationOTP = otp;
    user.emailVerificationOTPExpires = getOTPExpiry(expiryMinutes);
    user.passwordResetAttempts += 1;
    await this.userRepository.save(user);

    // Queue to email - non-blocking
    await queuePasswordResetOTP({
      email: user.email,
      name: user.firstname,
      otp,
      expiryMinutes,
    });
  }

  // step 2 - User enters OTP to verify identity
  async verifyPasswordResetOTP(
    email: string,
    otp: string,
  ): Promise<{ resetToken: string }> {
    const user = await this.userRepository.findByEmail(email);

    if (!user)
      throw new AppError(`No account found with the email ${email}`, 404);

    if (!user.emailVerificationOTP || !user.emailVerificationOTPExpires)
      throw new AppError(
        "No Password Reset Token was requested. Please request a new OTP",
        400,
      );

    // Checking if the OTP has expired
    if (new Date() > user.emailVerificationOTPExpires) {
      // Clearing the expired token
      user.emailVerificationOTP = null!;
      user.emailVerificationOTPExpires = null!;
      await this.userRepository.save(user);
      throw new AppError("OTP has expired. Please request a new one", 400);
    }

    // Compare the provided OTP with the One in the DB
    if (user.emailVerificationOTP !== otp)
      throw new AppError("Invalid OTP. Please try again", 400);

    // OTP is valid - generating a short-lived reset token
    // User sends this token to the reset password endpoint
    const resetToken = user.createPasswordResetToken();

    // Clear the token
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = getOTPExpiry(10); // 10 more mins to reset

    await this.userRepository.save(user);

    return { resetToken };
  }

  // Step 3 - user submits new password with reset token
  async resetPassword(
    resetToken: string,
    newpassword: string,
    confirmpassword: string,
  ): Promise<void> {
    if (newpassword !== confirmpassword)
      throw new AppError("Passwords do not match", 400);

    const user = await this.userRepository.findByPasswordResetToken(resetToken);

    if (!user) throw new AppError("Invalid or expired reset token", 400);

    if (!user.passwordResetExpires || new Date() > user.passwordResetExpires) {
      user.passwordResetToken = null!;
      user.passwordResetExpires = null!;
      await this.userRepository.save(user);
      throw new AppError(
        "Reset token has Expired. Please request a new OTP",
        400,
      );
    }

    // Update password - @BeforeUpdate on User entity will hash it
    user.password = newpassword;
    user.passwordResetToken = null!;
    user.passwordResetExpires = null!;
    user.passwordResetAttempts = 0;
    user.passwordChangedAt = new Date();

    await this.userRepository.save(user);

    // Queuing Success notification email
    await queuePasswordChangedEmail({
      email: user.email,
      name: user.firstname,
    });
  }

  async getUserProfile(userId: string): Promise<UserProfileResponse> {
    const user = await this.userRepository.findUserWithAccount(userId);

    if (!user) throw new AppError("User not found", 400);
    return sanitizeProfileResponse(user);
  }

  /* global Express */
  async uploadProfilePhoto(
    userId: string,
    file: Express.Multer.File,
  ): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new AppError("User not found", 404);

    const newPhotoUrl = (file as any).path;
    const newPhotoPublicId = (file as any).filename;

    if (!newPhotoUrl || !newPhotoPublicId)
      throw new AppError(`File Upload to Cloudinary failed`, 500, false);

    await queueProfilePhotoUploadProcessing({
      userId,
      newPhotoUrl,
      newPhotoPublicId,
      oldPhotoPublicId: user.profilePhotoPublicId ?? null,
    });
  }
}

export default UserService;

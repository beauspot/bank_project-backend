import crypto from "crypto";

import { Session } from "express-session";
import { injectable, inject } from "tsyringe";

// import { UserType } from "@/types/user.types";
// import { UserRole } from "@/enums/user";
import {
  sanitizeProfileResponse,
  UserProfileResponse,
  sanitizeSignupResponse,
} from "@/dto/user.dto";
import { UserInterface, UserServiceInterface } from "@/interface/user";
import {
  queueVerificationOTP,
  queueWelcomeEmail,
  queuePasswordResetOTP,
  queuePasswordChangedEmail,
  queueContactChangedEmail,
} from "@/queues/mail.queue";
import { queueProfilePhotoUploadProcessing } from "@/queues/profilePhoto.queue";
import VirtualAcctQueue from "@/queues/virtualAcct.queues";
import { UserRepository } from "@/repositories/user.repo";
import AppError from "@/utils/appErrors";
import {
  generateOTP,
  storeOTP,
  verifyOTP,
  storePendingValue,
  getPendingValue,
  deletePendingValue,
  OTP_KEYS,
} from "@/utils/otp";
import { UserServiceUtils } from "@/utils/user.utils";

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

    return sanitizeSignupResponse(savedUser);
  }

  async loginUser(identifier: string, password: string) {
    if (!identifier || !password)
      throw new AppError("Provide phone or email and password!");

    const user = await this.userRepository.findOne({
      where: [{ email: identifier }, { phonenumber: identifier }],
      select: [
        "id",
        "email",
        "firstname",
        "middlename",
        "lastname",
        "role",
        "password",
      ],
    });

    if (
      !user ||
      !(await this.userServiceUtils.verifyPassword(password, user.password))
    )
      throw new AppError("Incorrect email/phone number or password");

    return user;
  }

  async logout(session: Session): Promise<void> {
    return new Promise((resolve, reject) => {
      session.destroy((error: any) => {
        if (error) return reject(new AppError("Logout Failed."));
        resolve();
      });
    });
  }

  async sendVerificationOTP(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new AppError("User not found", 404);

    if (user.isEmailVerified)
      throw new AppError("Email is already verified", 400);

    const otp = generateOTP(6);
    const expiryMinutes = 10;

    // Save OTP in Redis first before queuing - auto Expires after 10mins
    await storeOTP(OTP_KEYS.emailVerification(userId), otp);

    // Queue the email — non-blocking, returns immediately
    await queueVerificationOTP({
      email: user.email,
      name: user.firstname,
      otp,
      expiryMinutes,
    });
  }

  async verifyEmail(userId: string, otp: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new AppError("User not found", 404);

    if (user.isEmailVerified)
      throw new AppError("Email is already verified", 400);

    // user verifies the OTP from Redis - throws error if invalid or expired
    await verifyOTP(OTP_KEYS.emailVerification(userId), otp);

    user.isEmailVerified = true;
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
    const user = await this.userRepository.findOne({ where: { email } });

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

    const otp = generateOTP(6);
    const expiryMinutes = 10;

    // Storing the OTP in redis keyed by email
    await storeOTP(OTP_KEYS.passwordReset(email), otp);

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
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user)
      throw new AppError(`No account found with the email ${email}`, 404);

    // Verify the OTP from redis
    await verifyOTP(OTP_KEYS.passwordReset(email), otp);

    // generate a short-lived reset token and store in
    const resetToken = crypto.randomBytes(6).toString("hex");
    await storeOTP(OTP_KEYS.passwordResetToken(resetToken), user.id);

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

    // getting the userId from redis using the reset token
    const userId = await getPendingValue(
      OTP_KEYS.passwordResetToken(resetToken),
    );

    if (!userId)
      throw new AppError(
        "Invalid or expired reset token. Please request a new OTP",
        400,
      );

    const user = await this.userRepository.findById(userId);
    if (!user) throw new AppError("User not found", 400);

    // Updating Password - @BeforeUpdate hook hashes it
    user.password = newpassword;
    user.passwordChangedAt = new Date();
    await this.userRepository.save(user);

    // Deleting the reset Token from redis
    await deletePendingValue(OTP_KEYS.passwordResetToken(resetToken));

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

  async requestPhoneNumberChange(
    userId: string,
    newPhoneNumber: string,
  ): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new AppError("User not found", 404);

    if (user.phonenumber === newPhoneNumber)
      throw new AppError(
        "New phone number cannot be the same as your current phone number",
        400,
      );

    const existingUser = await this.userRepository.findOne({
      where: { phonenumber: newPhoneNumber },
    });

    if (existingUser)
      throw new AppError("This phone number is already in use", 409);

    const otp = generateOTP(6);
    const expiryMinutes = 10;

    // Store OTP and pending phone number separately in Redis
    await storeOTP(OTP_KEYS.phoneChange(userId), otp);
    await storePendingValue(OTP_KEYS.pendingPhone(userId), newPhoneNumber);

    await queueVerificationOTP({
      email: user.email,
      name: user.firstname,
      otp,
      expiryMinutes,
    });
  }

  async verifyPhoneNumberChange(userId: string, otp: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new AppError("User not found", 404);

    // Get pending phone number from Redis before verifying OTP
    const newPhoneNumber = await getPendingValue(OTP_KEYS.pendingPhone(userId));

    if (!newPhoneNumber)
      throw new AppError(
        "No phone number change was requested or it has expired. Please request a new OTP",
        400,
      );

    // Verify OTP — throws if invalid or expired
    await verifyOTP(OTP_KEYS.phoneChange(userId), otp);

    // Update phone number
    user.phonenumber = newPhoneNumber;
    await this.userRepository.save(user);

    // Clean up pending phone from Redis
    await deletePendingValue(OTP_KEYS.pendingPhone(userId));

    await queueContactChangedEmail({
      email: user.email,
      name: user.firstname,
      changedField: "phone number",
    });
  }

  async requestEmailChange(userId: string, newEmail: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new AppError("User not found", 404);

    if (user.email === newEmail)
      throw new AppError(
        "New email cannot be the same as your current email address",
        400,
      );

    const existingUser = await this.userRepository.findOne({
      where: { email: newEmail },
    });

    if (existingUser)
      throw new AppError("This email address is already in use", 409);

    const otp = generateOTP(6);
    const expiryMinutes = 10;

    // Store OTP and pending email in Redis
    await storeOTP(OTP_KEYS.emailChange(userId), otp);
    await storePendingValue(OTP_KEYS.pendingEmail(userId), newEmail);

    // Send OTP to the NEW email to prove they own it
    await queueVerificationOTP({
      email: newEmail,
      name: user.firstname,
      otp,
      expiryMinutes,
    });
  }

  async verifyEmailChange(userId: string, otp: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new AppError("User not found", 404);

    // Get pending email from Redis before verifying OTP
    const newEmail = await getPendingValue(OTP_KEYS.pendingEmail(userId));

    if (!newEmail)
      throw new AppError(
        "No email change was requested or it has expired. Please request a new OTP",
        400,
      );

    // Verify OTP — throws if invalid or expired
    await verifyOTP(OTP_KEYS.emailChange(userId), otp);

    const oldEmail = user.email;

    // Update email
    user.email = newEmail;
    user.isEmailVerified = true;
    await this.userRepository.save(user);

    // Clean up pending email from Redis
    await deletePendingValue(OTP_KEYS.pendingEmail(userId));

    // Security alert to OLD email
    await queueContactChangedEmail({
      email: oldEmail,
      name: user.firstname,
      changedField: "email address",
    });
  }
}

export default UserService;

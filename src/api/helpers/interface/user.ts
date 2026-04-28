/* eslint-disable no-undef */
// import { Request } from "express";
import session from "express-session";

import { UserSignupResponse, UserProfileResponse } from "@/dto/user.dto";
import { UserRole, GenderType } from "@/enums/user";
import { User } from "@/models/userEntity";

interface UserInterface {
  userId: string;
  firstname: string;
  middlename: string;
  lastname: string;
  username: string;
  phonenumber: string;
  transaction_pin: string;
  nin: string;
  bvn: string;
  password: string;
  gender: GenderType;
  email: string;
  role: UserRole;
  isEmailVerified: boolean;
  accountStatus: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface UserServiceInterface {
  registerUser(userData: Partial<UserInterface>): Promise<UserSignupResponse>;
  // verifyEmailOTP(email: string, otp: string): Promise<boolean>;
  loginUser(identifier: UserRole, password: string): Promise<User>;
  logout(
    sessionObject: session.Session & Partial<session.SessionData>,
  ): Promise<void>;
  sendVerificationOTP(userId: string): Promise<void>;
  verifyEmail(userId: string, otp: string): Promise<void>;
  forgotPassword(email: string): Promise<void>;
  verifyPasswordResetOTP(
    email: string,
    otp: string,
  ): Promise<{ resetToken: string }>;
  resetPassword(
    resetToken: string,
    newPassword: string,
    confirmPassword: string,
  ): Promise<void>;
  get(userId: string): Promise<UserProfileResponse>;
  uploadProfilePhoto(userId: string, file: Express.Multer.File): Promise<void>;
  requestPhoneNumberChange(
    userId: string,
    newPhoneNumber: string,
  ): Promise<void>;
  verifyPhoneNumberChange(userId: string, otp: string): Promise<void>;
  requestEmailChange(userId: string, newEmail: string): Promise<void>;
  verifyEmailChange(userId: string, otp: string): Promise<void>;
}

interface UserAcctPayloadInterface {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  bvn: string;
  is_permanent: boolean;
  email: string;
}

interface virtualAccountPayload {
  email: string;
  bvn: string;
  // firstname: string;
  // lastname: string;
  bank_name?: string;
  // phonenumber: string;
  userId?: string;
  // account_no: string,
  // accountName: string
}

declare module "express-session" {
  interface SessionData {
    userId: string | undefined;
    userEmail?: string;
    isLoggedIn: boolean | undefined;
    role?: UserRole;
  }
}

type AppSession = session.Session & {
  userId?: string;
  userEmail?: string;
  isLoggedIn?: boolean;
  role?: UserRole;
};

export {
  UserInterface,
  UserServiceInterface,
  UserAcctPayloadInterface,
  AppSession,
  virtualAccountPayload,
};

// import { Request } from "express";
import session from "express-session";

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
  registerUser(userData: Partial<UserInterface>): Promise<{ user: User }>;
  // verifyEmailOTP(email: string, otp: string): Promise<boolean>;
  loginUser(identifier: UserRole, password: string): Promise<User>;
  logout(
    sessionObject: session.Session & Partial<session.SessionData>,
  ): Promise<void>;
  // For Express v5 with custom session data
  // logoutWithRequest(req: Request): Promise<void>;
  // forgotPassword(identifier: string): Promise<string>;
  // forgotTransactionPin(email: string): Promise<string>;
  // resetPassword(email: string, otp: string, newPassword: string): Promise<string>;
  // resetTransactionPin(email: string, otp: string, newPin: string): Promise<string>;
  // updatePassword(userId: string, currentPassword: string, newPassword: string): Promise<string>;
  // updateTransactionPin(userId: string, currentPin: string, newPin: string): Promise<string>;
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
    userId?: string;
    userEmail?: string;
    isLoggedIn?: boolean;
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

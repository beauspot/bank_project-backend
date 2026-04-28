import { z, object, string, number } from "zod";

import { User } from "@/models/userEntity";

const UserSignupResponseDTO = object({
  // id: string().uuid(),
  fullName: string(),
  username: string(),
  email: string().email(),
  // role: string(),
  // isEmailVerified: z.boolean(),
  accountStatus: z.boolean(),
  // isVirtualAcctCreated: z.boolean(),
  createdAt: z.date().or(string()),
});

const UserProfileResponseDTO = object({
  // id: string().uuid(),
  fullName: string(),
  email: string().email(),
  phonenumber: string(),
  profilePhoto: string().nullable(),
  // isEmailVerified: boolean(),
  // accountStatus: boolean(),
  // createdAt: z.date().or(string()),
  account: object({
    accountNumber: string(),
    accountName: string().nullable(),
    balance: number().or(string()),
    ledgerBalance: number().or(string()),
    bankName: string().nullable(),
    // type: string(),
    // status: string(),
  }).nullable(),
});

type UserSignupResponse = z.infer<typeof UserSignupResponseDTO>;
type UserProfileResponse = z.infer<typeof UserProfileResponseDTO>;

function sanitizeSignupResponse(user: User): UserSignupResponse {
  // This combines the first name, middle name, and last name into a full name, while handling cases where the middle name might be missing or empty.
  const fullName = [user.firstname, user.middlename, user.lastname]
    .filter(Boolean)
    .join(" ");

  // Explicitly map only the fields I want - everything else is dropped
  // bvn, nin, password, transaction_pin, date_of_birth, gender, or phonenumber
  // are never passed into parse() so zod never sees them
  return UserSignupResponseDTO.parse({
    // id: user.id,
    fullName,
    username: user.username,
    email: user.email,
    // role: user.role,
    // isEmailVerified: user.isEmailVerified,
    accountStatus: user.accountStatus,
    // isVirtualAcctCreated: user.isVirtualAcctCreated,
    createdAt: user.createdAt,
  });
}

function sanitizeProfileResponse(user: any): UserProfileResponse {
  return UserProfileResponseDTO.parse({
    // id: user.id,
    fullName: [user.firstname, user.middlename, user.lastname]
      .filter(Boolean)
      .join(" "),
    email: user.email,
    phonenumber: user.phonenumber,
    profilePhoto: user.profilePhoto ?? null,
    // isEmailVerified: user.isEmailVerified,
    // accountStatus: user.accountStatus,
    // createdAt: user.createdAt,
    account: user.account
      ? {
          accountNumber: user.account.accountNumber,
          accountName: user.account.accountName,
          balance: Number(user.account.balance),
          ledgerBalance: Number(user.account.ledgerBalance),
          bankName: user.account.paystackBankName,
          // type: user.account.type,
          // status: user.account.status,
        }
      : null,
  });
}

export {
  UserSignupResponseDTO,
  UserSignupResponse,
  sanitizeSignupResponse,
  UserProfileResponseDTO,
  UserProfileResponse,
  sanitizeProfileResponse,
};

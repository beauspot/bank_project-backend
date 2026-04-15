import { z, object, string } from "zod";

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

type UserSignupResponse = z.infer<typeof UserSignupResponseDTO>;

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

export { UserSignupResponseDTO, UserSignupResponse, sanitizeSignupResponse };

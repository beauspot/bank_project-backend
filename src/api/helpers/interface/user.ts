import { UserRole, GenderType } from "@/enums/user";

export interface UserInterface {
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

import "express-session";

import { UserRole } from "@/enums/user";
declare module "express-session" {
  interface SessionData {
    userId: string;
    isLoggedIn: boolean;
    createdAt: Date;
    userRole: UserRole; // storing the user role in the session
  }
}

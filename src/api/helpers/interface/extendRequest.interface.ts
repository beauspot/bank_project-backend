import { Request, Response } from "express";

import { UserRole } from "@/enums/user";
import { User } from "@/models/userEntity";

export interface ExtendRequest extends Request {
  body: any;
  user?: {
    id: string;
    email: string;
    firstname: string;
    lastname: string;
    phonenumber: string;
    role: UserRole;
  };
}

export interface ExtendResponse extends Response {
  locals: {
    user?: User;
    role: UserRole;
  };
}

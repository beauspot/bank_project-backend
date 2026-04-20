import { Request, Response } from "express";

import { User } from "@/models/userEntity";

export interface ExtendRequest extends Request {
  body: any;
  user?: {
    id?: string;
    email?: string;
    firstname?: string;
    lastname?: string;
    phonenumber?: string;
  };
}

export interface ExtendResponse extends Response {
  locals: {
    user?: User;
  };
}

import "express";

declare global {
  namespace Express {
    interface Request {
      file?: import("multer").File;
      files?: import("multer").File[];
      user?: {
        id: string;
        email: string;
        firstname: string;
        lastname: string;
        phonenumber: string;
      };
    }
  }
}

export {};

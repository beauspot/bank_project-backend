import { RequestHandler } from "express";
import ExpressAsync from "express-async-handler";

import { AppDataSource } from "@/config/db.config";
import { ExtendRequest } from "@/interface/extendRequest.interface";
import { User } from "@/models/userEntity";
import AppError from "@/utils/appErrors";

const UserRepository = AppDataSource.getRepository(User);

export const protect: RequestHandler = ExpressAsync(
  async (req: ExtendRequest, res, next) => {
    // 1. Check if session exists and has a valid userId
    if (!req.session || !req.session.userId || !req.session.isLoggedIn) {
      return next(
        new AppError(
          "You are not logged in. Please log in to access this resource.",
          401,
        ),
      );
    }

    // 2. Fetch the user from the database
    const currentUser = await UserRepository.findOneBy({
      id: req.session.userId,
    });

    // 3. Check if user still exists
    if (!currentUser) {
      return next(
        new AppError(
          "The user belonging to this session no longer exists.",
          401,
        ),
      );
    }

    // 4. Check if the user changed their password after the session was created
    if (
      req.session.createdAt &&
      currentUser.changedPasswordAfter(new Date(req.session.createdAt))
    ) {
      return next(
        new AppError(
          "User recently changed password. Please log in again.",
          401,
        ),
      );
    }

    // 5. Attach user to request — no optional chaining needed since I
    //    already confirmed currentUser exists in step 3
    req.user = {
      id: currentUser.id,
      email: currentUser.email,
      firstname: currentUser.firstname,
      lastname: currentUser.lastname,
      phonenumber: currentUser.phonenumber,
    };

    res.locals.user = currentUser;

    next();
  },
);

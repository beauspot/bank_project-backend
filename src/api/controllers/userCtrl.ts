import { RequestHandler, Request, Response } from "express";
import AsyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";

import { UserRole } from "@/enums/user";
import UserService from "@/services/user.service";
import AppError from "@/utils/appErrors";

class UserController {
  // Class implementation

  private userService: UserService;

  constructor(_userService: UserService) {
    this.userService = _userService;
  }

  registerUser: RequestHandler = AsyncHandler(async (req, res) => {
    const userData = {
      ...req.body.userData,
      transaction_pin: req.body.transaction_pin,
    };
    const result = await this.userService.registerUser(userData);
    res.status(StatusCodes.CREATED).json({
      status: "Success",
      data: result,
    });
  });

  LoginUser: RequestHandler = AsyncHandler(async (req, res): Promise<void> => {
    const { phonenumber, email, password } = req.body.userData;

    const identifier: UserRole = phonenumber || email;
    const user = await this.userService.loginUser(identifier, password);

    if (!req.session) {
      throw new AppError(
        "Session is not available",
        StatusCodes.INTERNAL_SERVER_ERROR,
        false,
      );
    }

    req.session.userId = user.id;
    req.session.isLoggedIn = true;

    res.status(StatusCodes.OK).json({
      message: "Login Successful",
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstname,
        middleName: user.middlename,
        lastName: user.lastname,
        role: user.role,
      },
    });

    return;
  });

  LogoutUser: RequestHandler = AsyncHandler(async (req, res): Promise<void> => {
    if (!req.session) {
      throw new AppError(
        "No active session found",
        StatusCodes.BAD_REQUEST,
        false,
      );
    }

    await this.userService.logout(req.session);

    res.status(StatusCodes.OK).json({
      message: "Successfully logged out",
    });
  });

  async fgt_pwd(req: Request, res: Response) {
    try {
      res.json({
        message: "Forgot password mail sent",
      });
    } catch (error: any) {
      throw new AppError(
        `Error in the forgot password endpoint: ${error.message}`,
      );
    }
  }

  async reset_pwd(req: Request, res: Response) {
    try {
      res.json({
        message: "Reset password successful",
      });
    } catch (error: any) {
      throw new AppError(
        `Error in the reset password endpoint: ${error.message}`,
      );
    }
  }
}

export default UserController;

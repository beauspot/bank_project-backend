import { RequestHandler } from "express";
import AsyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";

import { sanitizeSignupResponse } from "@/dto/user.dto";
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

    const user = result.user ?? result;

    res.status(StatusCodes.CREATED).json({
      status: "Success",
      message:
        "Account created Successfully, Your Bank Account is setup and would be ready shortly.",
      data: {
        user: sanitizeSignupResponse(user),
      },
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
    req.session.createdAt = new Date();

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

  sendVerificationOTP: RequestHandler = AsyncHandler(async (req, res) => {
    await this.userService.sendVerificationOTP(req.session.userId!);

    res.status(StatusCodes.OK).json({
      status: "Success",
      message: "Verification OTP sent to your email address",
    });
  });

  verifyEmail: RequestHandler = AsyncHandler(async (req, res) => {
    const { otp } = req.body;

    if (!otp) throw new AppError("OTP is required", 400);

    await this.userService.verifyEmail(req.session.userId!, otp);

    res.status(StatusCodes.OK).json({
      status: "Success",
      message: "Email verified successfully",
    });
  });

  fgt_pwd: RequestHandler = AsyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) throw new AppError("Email is required", 400);

    await this.userService.forgotPassword(email);

    res.status(StatusCodes.OK).json({
      status: "Success",
      message: `Password reset OTP has been send to your email ${email}`,
    });
  });

  verifyResetOTP: RequestHandler = AsyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) throw new AppError(`Email & OTP are required`, 400);

    const { resetToken } = await this.userService.verifyPasswordResetOTP(
      email,
      otp,
    );

    res.status(StatusCodes.OK).json({
      status: "Success",
      message: `OTP verified successfully. You can now reset your password.`,
      data: { resetToken },
    });
  });

  reset_pwd: RequestHandler = AsyncHandler(async (req, res) => {
    const { resetToken, newpassword, confirmpassword } = req.body;

    if (!resetToken || !newpassword || !confirmpassword)
      throw new AppError(
        `Reset token, new password & confirm password are all required`,
        400,
      );

    await this.userService.resetPassword(
      resetToken,
      newpassword,
      confirmpassword,
    );
    res.status(StatusCodes.OK).json({
      status: "Success",
      message:
        "Reset password successful. You can now login with your new Password.",
    });
  });

  getProfile: RequestHandler = AsyncHandler(async (req, res) => {
    const profile = await this.userService.getUserProfile(req.session.userId!);

    res.status(StatusCodes.OK).json({
      status: "Success",
      data: {
        user: profile,
      },
    });
  });

  uploadPhoto: RequestHandler = AsyncHandler(async (req, res) => {
    if (!req.file) throw new AppError("Please select a photo to upload", 400);

    await this.userService.uploadProfilePhoto(req.session.userId!, req.file);

    res.status(StatusCodes.ACCEPTED).json({
      status: "Success",
      message: "Photo uploaded. Your Profile will be updated shortly.",
    });
  });
}

export default UserController;

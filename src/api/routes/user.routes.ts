import { Router, Request, Response, NextFunction } from "express";
import { container } from "tsyringe";

import UserController from "@/controllers/userCtrl";
import { protect } from "@/helpers/middlewares/auth.middleware";
import { validate } from "@/helpers/middlewares/validate";
import { uploadProfilePhoto } from "@/middlewares/upload";
import {
  createUserSchema,
  loginUserSchema,
  verifyEmailOTPSchema,
  verifyMailForOTP,
  verifyResetOTP,
  resetPasswordSchema,
  verifyEmailChangeSchema,
  requestEmailChangeSchema,
  verifyPhoneChangeSchema,
  requestPhoneChangeSchema,
} from "@/schemas/user.schema";
import UserService from "@/services/user.service";

const userRouter = () => {
  const router = Router();

  const userService = container.resolve(UserService);
  const userController = new UserController(userService);

  router.post(
    "/register",
    validate(createUserSchema),
    (req: Request, res: Response, next: NextFunction) =>
      userController.registerUser(req, res, next),
  );

  router.post(
    "/login",
    validate(loginUserSchema),
    (req: Request, res: Response, next: NextFunction) =>
      userController.LoginUser(req, res, next),
  );

  router.post("/logout", (req: Request, res: Response, next: NextFunction) =>
    userController.LogoutUser(req, res, next),
  );

  router.post(
    "/send-otp",
    protect,
    (req: Request, res: Response, next: NextFunction) =>
      userController.sendVerificationOTP(req, res, next),
  );

  router.post(
    "/verify-email",
    protect,
    validate(verifyEmailOTPSchema),
    (req: Request, res: Response, next: NextFunction) =>
      userController.verifyEmail(req, res, next),
  );

  router.post(
    "/forgotpassword",
    validate(verifyMailForOTP),
    (req: Request, res: Response, next: NextFunction) =>
      userController.fgt_pwd(req, res, next),
  );

  router.post(
    "/verify-reset-otp",
    validate(verifyResetOTP),
    (req: Request, res: Response, next: NextFunction) =>
      userController.verifyResetOTP(req, res, next),
  );

  router.post(
    "/resetpassword",
    validate(resetPasswordSchema),
    (req: Request, res: Response, next: NextFunction) =>
      userController.reset_pwd(req, res, next),
  );

  router.get(
    "/profile",
    protect,
    (req: Request, res: Response, next: NextFunction) =>
      userController.getProfile(req, res, next),
  );

  router.post(
    "/profile_photo_upload",
    protect,
    uploadProfilePhoto,
    (req: Request, res: Response, next: NextFunction) =>
      userController.uploadPhoto(req, res, next),
  );

  router.post(
    "/change-phone/request",
    protect,
    validate(requestPhoneChangeSchema),
    (req: Request, res: Response, next: NextFunction) =>
      userController.requestPhoneChange(req, res, next),
  );

  router.post(
    "/change-phone/verify",
    protect,
    validate(verifyPhoneChangeSchema),
    (req: Request, res: Response, next: NextFunction) =>
      userController.verifyPhoneChange(req, res, next),
  );

  router.post(
    "/change-email/request",
    protect,
    validate(requestEmailChangeSchema),
    (req: Request, res: Response, next: NextFunction) =>
      userController.requestEmailChange(req, res, next),
  );

  router.post(
    "/change-email/verify",
    protect,
    validate(verifyEmailChangeSchema),
    (req: Request, res: Response, next: NextFunction) =>
      userController.verifyEmailChange(req, res, next),
  );

  return router;
};

export default userRouter();

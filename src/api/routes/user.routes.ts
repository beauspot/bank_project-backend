import { Router, Request, Response, NextFunction } from "express";
import { container } from "tsyringe";

import UserController from "@/controllers/userCtrl";
import { protect } from "@/helpers/middlewares/auth.middleware";
import { validate } from "@/helpers/middlewares/validate";
import { createUserSchema, loginUserSchema } from "@/schemas/user.schema";
import UserService from "@/services/user.service";

const userRouter = () => {
  const router = Router();

  const userService = container.resolve(UserService);
  const userController = new UserController(userService);

  router.post(
    "/register",
    validate(createUserSchema),
    (req: Request, res: Response, next: NextFunction) => {
      return userController.registerUser(req, res, next);
    },
  );

  router.post(
    "/login",
    validate(loginUserSchema),
    (req: Request, res: Response, next: NextFunction) => {
      return userController.LoginUser(req, res, next);
    },
  );

  router.post("/logout", (req: Request, res: Response, next: NextFunction) => {
    return userController.LogoutUser(req, res, next);
  });

  router.post(
    "/send-otp",
    protect,
    (req: Request, res: Response, next: NextFunction) => {
      return userController.sendVerificationOTP(req, res, next);
    },
  );

  router.post(
    "/verify-email",
    protect,
    (req: Request, res: Response, next: NextFunction) => {
      return userController.verifyEmail(req, res, next);
    },
  );

  router.post("/forgotPassword", (req: Request, res: Response) => {
    return userController.fgt_pwd(req, res);
  });

  router.post("/resetpassword", (req: Request, res: Response) => {
    return userController.reset_pwd(req, res);
  });

  return router;
};

export default userRouter();

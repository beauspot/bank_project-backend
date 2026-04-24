import "reflect-metadata";

import cookieParser from "cookie-parser";
import express, { Express } from "express";
import { Router, Request, Response, NextFunction } from "express";
import session from "express-session";
import { Repository, FindOneOptions, FindOptionsWhere } from "typeorm";

import { TestDataSource } from "@/__tests__/db.config";
import UserController from "@/controllers/userCtrl";
import { protect } from "@/helpers/middlewares/auth.middleware";
import { validate } from "@/helpers/middlewares/validate";
import globalErrorHandler from "@/middlewares/errHandler";
import { User } from "@/models/userEntity";
import { createUserSchema, loginUserSchema } from "@/schemas/user.schema";
import UserService from "@/services/user.service";
// import AppError from "@/utils/appErrors";
import { UserServiceUtils } from "@/utils/user.utils";

// -----------------------------------------------
// Test version of UserRepository using TestDataSource
// instead of the real AppDataSource
// -----------------------------------------------
class TestUserRepository {
  private repository: Repository<User>;

  constructor() {
    this.repository = TestDataSource.getRepository(User);
  }

  create(entity: Partial<User>): User {
    return this.repository.create(entity);
  }

  async save(entity: User): Promise<User> {
    return this.repository.save(entity);
  }

  async findOne(options: FindOneOptions<User>): Promise<User | null> {
    return this.repository.findOne(options);
  }

  async findById(userId: string): Promise<User | null> {
    return this.repository.findOne({
      where: { id: userId } as FindOptionsWhere<User>,
    });
  }
}

// -----------------------------------------------
// Test version of the router — accepts controller
// as param instead of resolving from tsyringe
// container which uses the real AppDataSource
// -----------------------------------------------
const testUserRouter = (userController: UserController) => {
  const router = Router();

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

  /*   router.post(
    "/forgotPassword",
    (req: Request, res: Response, next: NextFunction) => {
      return userController.fgt_pwd(req, res);
    },
  );

  router.post(
    "/resetpassword",
    (req: Request, res: Response, next: NextFunction) => {
      return userController.reset_pwd(req, res);
    },
  ); */

  return router;
};

// -----------------------------------------------
// Test app factory
// -----------------------------------------------
const createTestApp = (): Express => {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(
    session({
      secret: "test-secret",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false },
    }),
  );

  // Wire up the full class chain using TestDataSource
  const testUserRepository = new TestUserRepository();
  const userServiceUtils = new UserServiceUtils();

  // Cast to UserRepository type since TestUserRepository
  // has the same interface — avoids tsyringe DI in tests
  const userService = new UserService(
    testUserRepository as any,
    userServiceUtils,
  );
  const userController = new UserController(userService);

  app.use("/api/v1/user", testUserRouter(userController));

  app.use(globalErrorHandler);

  return app;
};

export { createTestApp };

// import crypto from "crypto";

import { Session } from "express-session";
import { injectable, inject } from "tsyringe";

// import { UserType } from "@/types/user.types";
// import { UserRole } from "@/enums/user";
import { UserInterface, UserServiceInterface } from "@/interface/user";
import VirtualAcctQueue from "@/queues/virtualAcct.queues";
import { UserRepository } from "@/repositories/user.repo";
import AppError from "@/utils/appErrors";
// import { EmailJobData } from "@/interfaces/email.interface";
// import emailQueues from "@/queues/email.queues";
// import WalletQueue from "@/queues/wallet.queues";
// import redisModule from "@/utils/redis";

import { UserServiceUtils } from "../helpers/utils/user.utils";

// const { redisClient } = redisModule;
// const { addMailToQueue } = emailQueues;

// TODO: UserService class shld implement UserServiceInterface imported from "interface/user"

@injectable()
class UserService implements UserServiceInterface {
  constructor(
    @inject(UserRepository) private userRepository: UserRepository,
    @inject(UserServiceUtils) private userServiceUtils: UserServiceUtils,
  ) {}

  IV_LENGTH = 16;

  async registerUser(userData: Partial<UserInterface>) {
    if (!userData.password)
      throw new AppError("Password is not correct Please enter a new password");

    const hashedPassword = await this.userServiceUtils.hashPassword(
      userData.password,
    );

    const userRepository = this.userRepository.create({
      ...userData,
      password: hashedPassword,
    });

    const savedUser = await this.userRepository.save(userRepository);

    await VirtualAcctQueue.queueVirtualAccountCreation(savedUser.id, userData);

    return { user: savedUser };
  }

  async loginUser(identifier: string, password: string) {
    if (!identifier || !password) {
      throw new AppError("Provide phone or email and password!");
    }

    const user = await this.userRepository.findOne({
      where: [{ email: identifier }, { phonenumber: identifier }],
      select: ["id", "password"],
    });

    if (
      !user ||
      !(await this.userServiceUtils.verifyPassword(password, user.password))
    ) {
      throw new AppError("Incorrect email/phone number or password");
    }

    return user;
  }

  async logout(session: Session): Promise<void> {
    return new Promise((resolve, reject) => {
      session.destroy((error: any) => {
        if (error) {
          return reject(new AppError("Logout Failed."));
        }
        resolve();
      });
    });
  }
}

export default UserService;

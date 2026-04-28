import { injectable } from "tsyringe";
import { Repository, FindOptionsWhere, FindOneOptions } from "typeorm";

import { AppDataSource } from "@/config/db.config";
import { User } from "@/models/userEntity";

@injectable()
export class UserRepository {
  private repository: Repository<User>;

  constructor() {
    this.repository = AppDataSource.getRepository(User);
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

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({ where: { email } });
  }

  /*   async findByPasswordResetToken(token: string): Promise<User | null> {
    return this.repository.findOne({
      where: { passwordResetToken: token },
    });
  } */

  async findUserWithAccount(userId: string): Promise<User | null> {
    return this.repository.findOne({
      where: { id: userId },
      relations: ["account"],
      select: {
        id: true,
        firstname: true,
        lastname: true,
        email: true,
        phonenumber: true,
        isEmailVerified: true,
        accountStatus: true,
        profilePhoto: true,
        createdAt: true,
        account: {
          id: true,
          accountNumber: true,
          accountName: true,
          balance: true,
          ledgerBalance: true,
          paystackBankName: true,
          type: true,
          status: true,
        },
      },
    });
  }

  async updateProfilePhoto(userId: string, photoPath: string): Promise<void> {
    await this.repository.update(userId, { profilePhoto: photoPath });
  }
}

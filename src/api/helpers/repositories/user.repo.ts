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
}

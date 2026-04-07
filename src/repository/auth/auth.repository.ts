import { Repository } from "typeorm";
import { AppDataSource } from "../../configs/psqlDb.config";
import { User } from "../../entities/user/user.entity";

export class AuthRepository {
  private readonly repo: Repository<User>;

  constructor() {
    this.repo = AppDataSource.getRepository(User);
  }

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email: email.toLowerCase().trim() } });
  }

  findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  async createUser(payload: Pick<User, "name" | "email" | "password" | "role">): Promise<User> {
    const user = this.repo.create({
      ...payload,
      email: payload.email.toLowerCase().trim(),
    });
    return this.repo.save(user);
  }

  saveUser(user: User): Promise<User> {
    return this.repo.save(user);
  }
}

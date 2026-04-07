import { Repository } from "typeorm";
import { User } from "../../entities/user/user.entity";
import { AppDataSource } from "../../configs/psqlDb.config";

export class AuthRepository {
  private repo: Repository<User>;

  constructor() {
    this.repo = AppDataSource.getRepository(User);
  }

  // Create a new user (Signup)
  async createUser(userData: Partial<User>): Promise<User> {
    const user = this.repo.create(userData); // create entity
    return this.repo.save(user);             // save to DB
  }

  // Find a user by email (used for signup check or signin)
  async findByEmail(email: string): Promise<User | null> {
    return this.repo.findOneBy({ email });
  }

  async saveUser(user: User): Promise<User> {
    return this.repo.save(user);
  }
}

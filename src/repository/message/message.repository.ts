import { AppDataSource } from "../../configs/psqlDb.config";
import { Message } from "../../entities/messages/messages.entity";

export class MessageRepository {
  private readonly repo = AppDataSource.getRepository(Message);

  create(payload: Partial<Message>) {
    const msg = this.repo.create(payload);
    return this.repo.save(msg);
  }

  list(skip: number, take: number, isRead?: boolean) {
    const qb = this.repo.createQueryBuilder("message");
    if (isRead !== undefined) {
      qb.where("message.isRead = :isRead", { isRead });
    }
    return qb.orderBy("message.createdAt", "DESC").skip(skip).take(take).getManyAndCount();
  }

  findById(id: string) {
    return this.repo.findOneBy({ id });
  }

  save(message: Message) {
    return this.repo.save(message);
  }

  delete(id: string) {
    return this.repo.delete(id);
  }
}

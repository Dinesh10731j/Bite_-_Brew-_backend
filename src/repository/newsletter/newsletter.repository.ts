import { AppDataSource } from "../../configs/psqlDb.config";
import { NewsletterSubscriber } from "../../entities/newsletter/newsletter.entity";

export class NewsletterRepository {
  private readonly repo = AppDataSource.getRepository(NewsletterSubscriber);

  findByEmail(email: string) {
    return this.repo.findOne({ where: { email: email.toLowerCase().trim() } });
  }

  create(email: string) {
    const entity = this.repo.create({ email: email.toLowerCase().trim(), status: "active" });
    return this.repo.save(entity);
  }

  list(skip: number, take: number, status?: string) {
    const qb = this.repo.createQueryBuilder("newsletter");
    if (status) {
      qb.where("newsletter.status = :status", { status });
    }
    return qb.orderBy("newsletter.subscribedAt", "DESC").skip(skip).take(take).getManyAndCount();
  }

  findById(id: string) {
    return this.repo.findOneBy({ id });
  }

  save(subscriber: NewsletterSubscriber) {
    return this.repo.save(subscriber);
  }

  delete(id: string) {
    return this.repo.delete(id);
  }
}

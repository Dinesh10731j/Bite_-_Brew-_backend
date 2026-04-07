import { sendSmtpMail } from "../../configs/smtp.config";
import { NewsletterRepository } from "../../repository/newsletter/newsletter.repository";
import { buildPaginationMeta, parsePagination } from "../../utils/helpers/pagination_helper";

export class NewsletterService {
  constructor(private readonly repository: NewsletterRepository) {}

  async subscribe(email: string) {
    const existing = await this.repository.findByEmail(email);
    if (existing) {
      if (existing.status !== "active") {
        existing.status = "active";
        await this.repository.save(existing);
      }
      return { data: existing, alreadySubscribed: true };
    }

    const subscriber = await this.repository.create(email);
    await sendSmtpMail({
      to: subscriber.email,
      subject: "Welcome to Bite Brew Cafe Newsletter",
      html: `<p>Thanks for subscribing to Bite Brew Cafe updates.</p>`,
    });

    return { data: subscriber, alreadySubscribed: false };
  }

  async list(query: { page?: unknown; limit?: unknown; status?: unknown }) {
    const { page, limit, skip } = parsePagination(query.page, query.limit, 20);
    const status = typeof query.status === "string" ? query.status : undefined;
    const [data, total] = await this.repository.list(skip, limit, status);
    return { data, pagination: buildPaginationMeta(total, page, limit) };
  }

  async updateStatus(id: string, status: string) {
    const subscriber = await this.repository.findById(id);
    if (!subscriber) {
      return null;
    }
    subscriber.status = status;
    return this.repository.save(subscriber);
  }

  async delete(id: string) {
    const subscriber = await this.repository.findById(id);
    if (!subscriber) {
      return false;
    }
    await this.repository.delete(id);
    return true;
  }
}

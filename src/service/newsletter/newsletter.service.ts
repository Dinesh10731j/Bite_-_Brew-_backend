import { enqueueBulkEmail, enqueueEmail } from "../../queue/email.queue";
import { NewsletterRepository } from "../../repository/newsletter/newsletter.repository";
import { buildNewsletterCampaignTemplate, buildNewsletterWelcomeTemplate } from "../../templates/newsletter.template";
import { buildPaginationMeta, parsePagination } from "../../utils/helpers/pagination_helper";
import { AppDataSource } from "../../configs/psqlDb.config";
import { User } from "../../entities/user/user.entity";

type NewsletterCampaignPayload = {
  subject: string;
  headline: string;
  intro?: string;
  offerTitle?: string;
  offerDescription?: string;
  events?: string[];
  couponCode?: string;
  validUntil?: string;
  ctaText?: string;
  ctaUrl?: string;
  sendToSubscribers?: boolean;
  sendToRegisteredUsers?: boolean;
};

export class NewsletterService {
  private readonly userRepo = AppDataSource.getRepository(User);

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
    try {
      await enqueueEmail({
        to: subscriber.email,
        subject: "Welcome to Bite Brew Cafe Newsletter",
        html: buildNewsletterWelcomeTemplate({ email: subscriber.email }),
      });
    } catch (error) {
      console.error("Failed to enqueue newsletter welcome email", error);
    }

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

  private async getRegisteredUserEmails(): Promise<string[]> {
    const rows = await this.userRepo
      .createQueryBuilder("user")
      .select("user.email", "email")
      .where("user.email IS NOT NULL")
      .andWhere("TRIM(user.email) <> ''")
      .getRawMany<{ email: string }>();

    return rows.map((row) => row.email);
  }

  async sendCampaign(payload: NewsletterCampaignPayload) {
    const sendToSubscribers = payload.sendToSubscribers ?? true;
    const sendToRegisteredUsers = payload.sendToRegisteredUsers ?? true;

    const recipientSet = new Set<string>();

    if (sendToSubscribers) {
      const subscriberEmails = await this.repository.listActiveEmails();
      for (const email of subscriberEmails) {
        const normalized = email.toLowerCase().trim();
        if (normalized) recipientSet.add(normalized);
      }
    }

    if (sendToRegisteredUsers) {
      const registeredEmails = await this.getRegisteredUserEmails();
      for (const email of registeredEmails) {
        const normalized = email.toLowerCase().trim();
        if (normalized) recipientSet.add(normalized);
      }
    }

    const recipientEmails = Array.from(recipientSet);
    if (recipientEmails.length === 0) {
      return {
        queuedCount: 0,
        subscriberRecipientsIncluded: sendToSubscribers,
        registeredUserRecipientsIncluded: sendToRegisteredUsers,
      };
    }

    const html = buildNewsletterCampaignTemplate({
      headline: payload.headline,
      intro: payload.intro,
      offerTitle: payload.offerTitle,
      offerDescription: payload.offerDescription,
      events: payload.events,
      couponCode: payload.couponCode,
      validUntil: payload.validUntil,
      ctaText: payload.ctaText,
      ctaUrl: payload.ctaUrl,
    });

    await enqueueBulkEmail(
      recipientEmails.map((email) => ({
        to: email,
        subject: payload.subject,
        html,
      })),
    );

    return {
      queuedCount: recipientEmails.length,
      subscriberRecipientsIncluded: sendToSubscribers,
      registeredUserRecipientsIncluded: sendToRegisteredUsers,
    };
  }
}

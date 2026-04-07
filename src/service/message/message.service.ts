import { MessageRepository } from "../../repository/message/message.repository";
import { buildPaginationMeta, parsePagination } from "../../utils/helpers/pagination_helper";

export class MessageService {
  constructor(private readonly repository: MessageRepository) {}

  create(payload: { senderName: string; phone?: string; email?: string; content: string; source?: string }) {
    const messagePayload: {
      senderName: string;
      content: string;
      source: string;
      isRead: boolean;
      phone?: string;
      email?: string;
    } = {
      senderName: payload.senderName,
      content: payload.content,
      source: payload.source || "website",
      isRead: false,
    };
    if (payload.phone) messagePayload.phone = payload.phone;
    if (payload.email) messagePayload.email = payload.email;
    return this.repository.create(messagePayload);
  }

  async list(query: { page?: unknown; limit?: unknown; isRead?: unknown }) {
    const { page, limit, skip } = parsePagination(query.page, query.limit, 10);
    const isRead = typeof query.isRead === "string" ? query.isRead === "true" : undefined;
    const [data, total] = await this.repository.list(skip, limit, isRead);
    return { data, pagination: buildPaginationMeta(total, page, limit) };
  }

  async markRead(id: string, isRead = true) {
    const message = await this.repository.findById(id);
    if (!message) {
      return null;
    }
    message.isRead = isRead;
    return this.repository.save(message);
  }

  async delete(id: string) {
    const message = await this.repository.findById(id);
    if (!message) {
      return false;
    }
    await this.repository.delete(id);
    return true;
  }
}

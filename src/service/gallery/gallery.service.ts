import { GalleryRepository } from "../../repository/gallery/gallery.repository";
import { buildPaginationMeta, parsePagination } from "../../utils/helpers/pagination_helper";

export class GalleryService {
  constructor(private readonly repository: GalleryRepository) {}

  create(payload: { url: string; category?: string; tags?: string; featured?: boolean; orderIndex?: number }) {
    const entityPayload: { url: string; category: string; featured: boolean; orderIndex: number; tags?: string } = {
      url: payload.url,
      category: payload.category || "FOOD",
      featured: payload.featured ?? false,
      orderIndex: payload.orderIndex ?? 0,
    };
    if (payload.tags) entityPayload.tags = payload.tags;
    return this.repository.create(entityPayload);
  }

  async list(query: { page?: unknown; limit?: unknown; category?: unknown; featured?: unknown }) {
    const { page, limit, skip } = parsePagination(query.page, query.limit, 12);
    const category = typeof query.category === "string" ? query.category : undefined;
    const featured = typeof query.featured === "string" ? query.featured === "true" : undefined;
    const [data, total] = await this.repository.list(skip, limit, category, featured);
    return { data, pagination: buildPaginationMeta(total, page, limit) };
  }

  async update(id: string, payload: Record<string, unknown>) {
    const image = await this.repository.findById(id);
    if (!image) {
      return null;
    }
    Object.assign(image, payload);
    return this.repository.save(image);
  }

  async delete(id: string) {
    const image = await this.repository.findById(id);
    if (!image) {
      return false;
    }
    await this.repository.delete(id);
    return true;
  }
}

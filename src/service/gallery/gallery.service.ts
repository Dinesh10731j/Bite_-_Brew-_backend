import { GalleryCategory } from "../../constant/enum.constant";
import { GalleryRepository } from "../../repository/gallery/gallery.repository";
import { buildPaginationMeta, parsePagination } from "../../utils/helpers/pagination_helper";

const parseBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return undefined;
};

export class GalleryService {
  constructor(private readonly repository: GalleryRepository) {}

  create(payload: { url: string; category?: string; tags?: string[]; featured?: boolean; orderIndex?: number; title: string }) {
    const entityPayload: {
      title: string;
      url: string;
      category: string;
      featured: boolean;
      orderIndex: number;
      tags?: string[];
    } = {
      url: payload.url,
      title: payload.title,
      category: payload.category || "FOOD",
      featured: payload.featured ?? false,
      orderIndex: payload.orderIndex ?? 0,
    };
    if (payload.tags) entityPayload.tags = payload.tags;

    return this.repository.create(entityPayload);
  }

  async list(query: { page?: unknown; limit?: unknown; category?: unknown; featured?: unknown }) {
    const { page, limit, skip } = parsePagination(query.page, query.limit, 12);

    const category = (() => {
      if (typeof query.category !== "string") return undefined;
      const normalized = query.category.trim().toUpperCase();
      if (!normalized) return undefined;
      return Object.values(GalleryCategory).includes(normalized as GalleryCategory) ? normalized : undefined;
    })();

    const featured = parseBoolean(query.featured);

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


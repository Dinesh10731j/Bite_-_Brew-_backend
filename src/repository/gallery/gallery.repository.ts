import { AppDataSource } from "../../configs/psqlDb.config";
import { GalleryImage } from "../../entities/gallery/gallery.entity";

export class GalleryRepository {
  private readonly repo = AppDataSource.getRepository(GalleryImage);

  create(payload: Partial<GalleryImage>) {
    const image = this.repo.create(payload);
    return this.repo.save(image);
  }

  list(skip: number, take: number, category?: string, featured?: boolean) {
    const qb = this.repo.createQueryBuilder("gallery");

    // Explicitly select columns to ensure `title` is included in the API response.
    qb.select([
      "gallery.id",
      "gallery.title",
      "gallery.url",
      "gallery.category",
      "gallery.tags",
      "gallery.featured",
      "gallery.orderIndex",
      "gallery.uploadedAt",
    ]);

    if (category) {
      qb.andWhere("gallery.category = :category", { category });
    }
    if (featured !== undefined) {
      qb.andWhere("gallery.featured = :featured", { featured });
    }

    return qb
      .orderBy("gallery.orderIndex", "ASC")
      .addOrderBy("gallery.uploadedAt", "DESC")
      .skip(skip)
      .take(take)
      .getManyAndCount();
  }


  findById(id: string) {
    return this.repo.findOneBy({ id });
  }

  save(entity: GalleryImage) {
    return this.repo.save(entity);
  }

  delete(id: string) {
    return this.repo.delete(id);
  }
}

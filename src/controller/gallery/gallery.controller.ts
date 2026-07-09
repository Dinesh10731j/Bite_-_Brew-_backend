import { Request, Response } from "express";
import { HTTP_STATUS } from "../../constant/statusCode.interface";
import { Message } from "../../constant/message.interface";
import { GalleryCategory } from "../../constant/enum.constant";
import { GalleryRepository } from "../../repository/gallery/gallery.repository";
import { GalleryService } from "../../service/gallery/gallery.service";
import { UploadService } from "../../service/upload/upload.service";

const galleryService = new GalleryService(new GalleryRepository());
const uploadService = new UploadService();

const parseBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return undefined;
};

const parseNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

export class GalleryController {
  static async create(req: Request, res: Response) {
    try {
      let imageUrl = typeof req.body?.url === "string" ? req.body.url.trim() : "";

      if (req.file) {
        const uploadedImage = await uploadService.uploadImage(req.file, "bite-brew/gallery");
        imageUrl = uploadedImage.url;
      }

      if (!imageUrl) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Image file or URL is required." });
      }

      const category = typeof req.body?.category === "string" ? req.body.category.trim().toUpperCase() : undefined;
      if (category && !Object.values(GalleryCategory).includes(category as GalleryCategory)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          message: `Invalid category. Allowed values: ${Object.values(GalleryCategory).join(", ")}`,
        });
      }
      // tags may come as string ("#a,#b") or array (['#a','#b'])
      const tags = (() => {
        const raw = req.body?.tags;
        if (Array.isArray(raw)) {
          const cleaned = raw.map((t) => (typeof t === "string" ? t.trim() : "")).filter(Boolean);
          return cleaned.length ? cleaned : undefined;
        }
        if (typeof raw === "string") {
          const cleaned = raw
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);
          return cleaned.length ? cleaned : undefined;
        }
        return undefined;
      })();

      const featured = parseBoolean(req.body?.featured);
      const orderIndex = parseNumber(req.body?.orderIndex);


      const data = await galleryService.create({
        title: req.body?.title || "Untitled",
        url: imageUrl,
        ...(category ? { category } : {}),
        ...(tags ? { tags } : {}),
        ...(featured !== undefined ? { featured } : {}),
        ...(orderIndex !== undefined ? { orderIndex } : {}),
      });

      return res.status(HTTP_STATUS.CREATED).json({ message: Message.CREATED_SUCCESS, data });
    } catch (error) {
      if (error instanceof Error && error.message.includes("Cloudinary credentials are not configured")) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
      }
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: Message.INTERNAL_SERVER_ERROR });
    }
  }

  static async list(req: Request, res: Response) {
    try {
      const result = await galleryService.list(req.query);
      return res.status(HTTP_STATUS.OK).json({ message: Message.SUCCESS, ...result });
    } catch (_error) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: Message.INTERNAL_SERVER_ERROR });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const id = req.params.id;
      if (!id) return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: Message.BAD_REQUEST });
      const data = await galleryService.update(id, req.body);
      if (!data) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: Message.NOT_FOUND });
      }
      return res.status(HTTP_STATUS.OK).json({ message: Message.UPDATED_SUCCESS, data });
    } catch (_error) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: Message.INTERNAL_SERVER_ERROR });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const id = req.params.id;
      if (!id) return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: Message.BAD_REQUEST });
      const ok = await galleryService.delete(id);
      if (!ok) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: Message.NOT_FOUND });
      }
      return res.status(HTTP_STATUS.OK).json({ message: Message.DELETED_SUCCESS });
    } catch (_error) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: Message.INTERNAL_SERVER_ERROR });
    }
  }
}

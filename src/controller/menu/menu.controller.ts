import { Request, Response } from "express";
import { HTTP_STATUS } from "../../constant/statusCode.interface";
import { Message } from "../../constant/message.interface";
import { MenuRepository } from "../../repository/menu/menu.repository";
import { MenuService } from "../../service/menu/menu.service";
import { UploadService } from "../../service/upload/upload.service";

const menuService = new MenuService(new MenuRepository());
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

export class MenuController {
  static async listCategories(req: Request, res: Response) {
    try {
      const result = await menuService.listCategories(req.query);
      return res.status(HTTP_STATUS.OK).json({ message: Message.SUCCESS, ...result });
    } catch (_error) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: Message.INTERNAL_SERVER_ERROR });
    }
  }

  static async createCategory(req: Request, res: Response) {
    try {
      if (!req.body?.name) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: Message.BAD_REQUEST });
      }
      const data = await menuService.createCategory(req.body);
      return res.status(HTTP_STATUS.CREATED).json({ message: Message.CREATED_SUCCESS, data });
    } catch (_error) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: Message.INTERNAL_SERVER_ERROR });
    }
  }

  static async updateCategory(req: Request, res: Response) {
    try {
      const id = req.params.id;
      if (!id) return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: Message.BAD_REQUEST });
      const data = await menuService.updateCategory(id, req.body);
      if (!data) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: Message.NOT_FOUND });
      }
      return res.status(HTTP_STATUS.OK).json({ message: Message.UPDATED_SUCCESS, data });
    } catch (_error) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: Message.INTERNAL_SERVER_ERROR });
    }
  }

  static async deleteCategory(req: Request, res: Response) {
    try {
      const id = req.params.id;
      if (!id) return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: Message.BAD_REQUEST });
      const ok = await menuService.deleteCategory(id);
      if (!ok) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: Message.NOT_FOUND });
      }
      return res.status(HTTP_STATUS.OK).json({ message: Message.DELETED_SUCCESS });
    } catch (_error) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: Message.INTERNAL_SERVER_ERROR });
    }
  }

  static async listMenuItems(req: Request, res: Response) {
    try {
      const result = await menuService.listMenuItems(req.query);
      return res.status(HTTP_STATUS.OK).json({ message: Message.SUCCESS, ...result });
    } catch (_error) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: Message.INTERNAL_SERVER_ERROR });
    }
  }

  static async createMenuItem(req: Request, res: Response) {
    try {
      const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
      const categoryId = typeof req.body?.categoryId === "string" ? req.body.categoryId.trim() : "";
      const price = parseNumber(req.body?.price);

      if (!name || !categoryId || price === undefined) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: Message.BAD_REQUEST });
      }

      let image = typeof req.body?.image === "string" ? req.body.image.trim() : undefined;
      if (req.file) {
        const uploadedImage = await uploadService.uploadImage(req.file, "bite-brew/menu");
        image = uploadedImage.url;
      }

      const description = typeof req.body?.description === "string" ? req.body.description.trim() : undefined;
      const available = parseBoolean(req.body?.available);
      const featured = parseBoolean(req.body?.featured);
      const discount = parseNumber(req.body?.discount);

      const data = await menuService.createMenuItem({
        name,
        categoryId,
        price,
        ...(description ? { description } : {}),
        ...(image ? { image } : {}),
        ...(available !== undefined ? { available } : {}),
        ...(featured !== undefined ? { featured } : {}),
        ...(discount !== undefined ? { discount } : {}),
      });

      if (!data) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Category not found" });
      }
      return res.status(HTTP_STATUS.CREATED).json({ message: Message.CREATED_SUCCESS, data });
    } catch (error) {
      if (error instanceof Error && error.message.includes("Cloudinary credentials are not configured")) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
      }
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: Message.INTERNAL_SERVER_ERROR });
    }
  }

  static async updateMenuItem(req: Request, res: Response) {
    try {
      const id = req.params.id;
      if (!id) return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: Message.BAD_REQUEST });
      const data = await menuService.updateMenuItem(id, req.body);
      if (!data) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: Message.NOT_FOUND });
      }
      return res.status(HTTP_STATUS.OK).json({ message: Message.UPDATED_SUCCESS, data });
    } catch (_error) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: Message.INTERNAL_SERVER_ERROR });
    }
  }

  static async deleteMenuItem(req: Request, res: Response) {
    try {
      const id = req.params.id;
      if (!id) return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: Message.BAD_REQUEST });
      const ok = await menuService.deleteMenuItem(id);
      if (!ok) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: Message.NOT_FOUND });
      }
      return res.status(HTTP_STATUS.OK).json({ message: Message.DELETED_SUCCESS });
    } catch (_error) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: Message.INTERNAL_SERVER_ERROR });
    }
  }
}

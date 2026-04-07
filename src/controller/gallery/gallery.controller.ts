import { Request, Response } from "express";
import { HTTP_STATUS } from "../../constant/statusCode.interface";
import { Message } from "../../constant/message.interface";
import { GalleryRepository } from "../../repository/gallery/gallery.repository";
import { GalleryService } from "../../service/gallery/gallery.service";

const galleryService = new GalleryService(new GalleryRepository());

export class GalleryController {
  static async create(req: Request, res: Response) {
    try {
      if (!req.body?.url) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: Message.BAD_REQUEST });
      }
      const data = await galleryService.create(req.body);
      return res.status(HTTP_STATUS.CREATED).json({ message: Message.CREATED_SUCCESS, data });
    } catch (_error) {
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

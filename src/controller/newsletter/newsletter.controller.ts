import { Request, Response } from "express";
import { HTTP_STATUS } from "../../constant/statusCode.interface";
import { Message } from "../../constant/message.interface";
import { NewsletterRepository } from "../../repository/newsletter/newsletter.repository";
import { NewsletterService } from "../../service/newsletter/newsletter.service";

const newsletterService = new NewsletterService(new NewsletterRepository());

export class NewsletterController {
  static async subscribe(req: Request, res: Response) {
    try {
      const email = String(req.body?.email || "").trim();
      if (!email) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: Message.BAD_REQUEST });
      }
      const result = await newsletterService.subscribe(email);
      const status = result.alreadySubscribed ? HTTP_STATUS.OK : HTTP_STATUS.CREATED;
      return res.status(status).json({
        message: result.alreadySubscribed ? "Already subscribed" : Message.CREATED_SUCCESS,
        data: result.data,
      });
    } catch (_error) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: Message.INTERNAL_SERVER_ERROR });
    }
  }

  static async list(req: Request, res: Response) {
    try {
      const result = await newsletterService.list(req.query);
      return res.status(HTTP_STATUS.OK).json({ message: Message.SUCCESS, ...result });
    } catch (_error) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: Message.INTERNAL_SERVER_ERROR });
    }
  }

  static async updateStatus(req: Request, res: Response) {
    try {
      const id = req.params.id;
      if (!id) return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: Message.BAD_REQUEST });
      const status = String(req.body?.status || "").trim();
      if (!status) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: Message.BAD_REQUEST });
      }
      const data = await newsletterService.updateStatus(id, status);
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
      const ok = await newsletterService.delete(id);
      if (!ok) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: Message.NOT_FOUND });
      }
      return res.status(HTTP_STATUS.OK).json({ message: Message.DELETED_SUCCESS });
    } catch (_error) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: Message.INTERNAL_SERVER_ERROR });
    }
  }
}

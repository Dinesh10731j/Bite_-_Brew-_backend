import { Request, Response } from "express";
import { HTTP_STATUS } from "../../constant/statusCode.interface";
import { Message } from "../../constant/message.interface";
import { NewsletterRepository } from "../../repository/newsletter/newsletter.repository";
import { NewsletterService } from "../../service/newsletter/newsletter.service";

const newsletterService = new NewsletterService(new NewsletterRepository());

const parseBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return undefined;
};

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

  static async sendCampaign(req: Request, res: Response) {
    try {
      const subject = String(req.body?.subject || "").trim();
      const headline = String(req.body?.headline || "").trim();

      if (!subject || !headline) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "subject and headline are required." });
      }

      const eventsInput = req.body?.events;
      if (eventsInput !== undefined && !Array.isArray(eventsInput)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "events must be an array of strings." });
      }

      const events = Array.isArray(eventsInput)
        ? eventsInput.map((event) => String(event || "").trim()).filter((event) => event.length > 0)
        : undefined;

      const sendToSubscribers = parseBoolean(req.body?.sendToSubscribers);
      const sendToRegisteredUsers = parseBoolean(req.body?.sendToRegisteredUsers);

      if (req.body?.sendToSubscribers !== undefined && sendToSubscribers === undefined) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          message: "sendToSubscribers must be true or false.",
        });
      }

      if (req.body?.sendToRegisteredUsers !== undefined && sendToRegisteredUsers === undefined) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          message: "sendToRegisteredUsers must be true or false.",
        });
      }

      if (sendToSubscribers === false && sendToRegisteredUsers === false) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          message: "At least one audience must be selected.",
        });
      }

      const result = await newsletterService.sendCampaign({
        subject,
        headline,
        intro: typeof req.body?.intro === "string" ? req.body.intro.trim() : undefined,
        offerTitle: typeof req.body?.offerTitle === "string" ? req.body.offerTitle.trim() : undefined,
        offerDescription: typeof req.body?.offerDescription === "string" ? req.body.offerDescription.trim() : undefined,
        events,
        couponCode: typeof req.body?.couponCode === "string" ? req.body.couponCode.trim() : undefined,
        validUntil: typeof req.body?.validUntil === "string" ? req.body.validUntil.trim() : undefined,
        ctaText: typeof req.body?.ctaText === "string" ? req.body.ctaText.trim() : undefined,
        ctaUrl: typeof req.body?.ctaUrl === "string" ? req.body.ctaUrl.trim() : undefined,
        sendToSubscribers,
        sendToRegisteredUsers,
      });

      return res.status(HTTP_STATUS.OK).json({
        message: "Campaign newsletter queued successfully",
        data: result,
      });
    } catch (_error) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: Message.INTERNAL_SERVER_ERROR });
    }
  }
}

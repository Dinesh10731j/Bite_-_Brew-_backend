import { Request, Response } from "express";
import { HTTP_STATUS } from "../../constant/statusCode.interface";
import { Message } from "../../constant/message.interface";
import { UploadService } from "../../service/upload/upload.service";

const uploadService = new UploadService();

export class UploadController {
  static async uploadImage(req: Request, res: Response) {
    try {
      const file = req.file;
      if (!file) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Image file is required." });
      }

      const folderInput = req.body?.folder;
      if (folderInput !== undefined && typeof folderInput !== "string") {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: Message.BAD_REQUEST });
      }

      const data = await uploadService.uploadImage(file, folderInput);
      return res.status(HTTP_STATUS.CREATED).json({ message: Message.CREATED_SUCCESS, data });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("Folder can only contain")) {
          return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: error.message });
        }

        if (error.message.includes("Cloudinary credentials are not configured")) {
          return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
        }
      }

      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: Message.INTERNAL_SERVER_ERROR });
    }
  }
}

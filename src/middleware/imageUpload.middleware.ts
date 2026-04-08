import multer from "multer";
import { NextFunction, Request, Response } from "express";
import { HTTP_STATUS } from "../constant/statusCode.interface";

const storage = multer.memoryStorage();
const maxFileSizeInBytes = 5 * 1024 * 1024;

const imageUpload = multer({
  storage,
  limits: { fileSize: maxFileSizeInBytes },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image files are allowed."));
      return;
    }
    cb(null, true);
  },
});

const anyImageParser = imageUpload.any();
const acceptedImageFieldNames = ["image", "image[]", "file", "photo"];

export const parseSingleImageUpload = (req: Request, res: Response, next: NextFunction) => {
  anyImageParser(req, res, (error: unknown) => {
    if (!error) {
      const files = Array.isArray(req.files) ? req.files : [];
      const imageFiles = files.filter((file) => acceptedImageFieldNames.includes(file.fieldname));

      if (imageFiles.length > 1) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Only one image file is allowed." });
      }

      if (files.length > 0 && imageFiles.length === 0) {
        const unsupportedField = files[0]?.fieldname || "unknown";
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          message: `Unsupported file field "${unsupportedField}". Use "image".`,
        });
      }

      if (imageFiles[0]) {
        req.file = imageFiles[0];
      }

      return next();
    }

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Image size must be 5MB or less." });
      }
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: error.message });
    }

    if (error instanceof Error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: error.message });
    }

    return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Invalid upload request." });
  });
};

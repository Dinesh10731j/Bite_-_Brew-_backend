import { UploadApiResponse } from "cloudinary";
import { cloudinary, isCloudinaryConfigured } from "../../configs/cloudinary.config";

export type UploadedImageData = {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
};

const sanitizeFolder = (folder?: string) => {
  if (!folder) return "bite-brew";
  const normalized = folder.trim().replace(/\\/g, "/").replace(/\/{2,}/g, "/");
  if (!normalized) return "bite-brew";
  if (!/^[a-zA-Z0-9/_-]+$/.test(normalized)) {
    throw new Error("Folder can only contain letters, numbers, slash, dash and underscore.");
  }
  return normalized.replace(/^\/+|\/+$/g, "");
};

export class UploadService {
  async uploadImage(file: Express.Multer.File, folder?: string): Promise<UploadedImageData> {
    if (!isCloudinaryConfigured()) {
      throw new Error("Cloudinary credentials are not configured.");
    }

    const targetFolder = sanitizeFolder(folder);

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: targetFolder || "bite-brew",
          resource_type: "image",
        },
        (error, uploadResult) => {
          if (error) {
            reject(new Error(error.message));
            return;
          }

          if (!uploadResult) {
            reject(new Error("Image upload failed."));
            return;
          }

          resolve(uploadResult);
        },
      );

      stream.end(file.buffer);
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
    };
  }
}

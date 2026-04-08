import { v2 as cloudinary } from "cloudinary";
import { envConfig } from "./env.config";

const cloudName = envConfig.CLOUDINARY_CLOUD_NAME;
const apiKey = envConfig.CLOUDINARY_API_KEY;
const apiSecret = envConfig.CLOUDINARY_API_SECRET;

const hasCloudinaryCredentials = Boolean(cloudName && apiKey && apiSecret);

if (hasCloudinaryCredentials) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

export const isCloudinaryConfigured = () => hasCloudinaryCredentials;
export { cloudinary };

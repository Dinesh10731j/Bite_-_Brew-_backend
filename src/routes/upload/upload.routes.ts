import { Router } from "express";
import { UploadController } from "../../controller/upload/upload.controller";
import { jwtVerify } from "../../middleware/auth.middleware";
import { roleCheck } from "../../middleware/roleCheck.middleware";
import { parseSingleImageUpload } from "../../middleware/imageUpload.middleware";

const router = Router();

router.post("/image", jwtVerify, roleCheck(["admin", "manager"]), parseSingleImageUpload, UploadController.uploadImage);

export default router;

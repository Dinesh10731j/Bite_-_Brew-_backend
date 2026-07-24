import { Router } from "express";
import { StaffController } from "../../controller/staff/staff.controller";
import { jwtVerify } from "../../middleware/auth.middleware";
import { roleCheck } from "../../middleware/roleCheck.middleware";
import { parseSingleImageUpload } from "../../middleware/imageUpload.middleware";
import { rateLimit } from "../../middleware/rateLimit.middleware";
import { cacheGet } from "../../middleware/cache.middleware";
const router = Router();


router.get("/",cacheGet({ namespace: "staff", ttlSeconds: 120 }) ,StaffController.list);
router.post("/", jwtVerify, roleCheck(["admin", "manager"]), rateLimit, parseSingleImageUpload, StaffController.create);
router.get("/:id", cacheGet({ namespace: "staff", ttlSeconds: 120 }),jwtVerify, roleCheck(["admin", "manager"]), rateLimit, StaffController.getById);
router.patch("/:id", jwtVerify, roleCheck(["admin", "manager"]), rateLimit, parseSingleImageUpload, StaffController.update);
router.delete("/:id", jwtVerify, roleCheck(["admin", "manager"]), rateLimit, StaffController.delete);

export default router;

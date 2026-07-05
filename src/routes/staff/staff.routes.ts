import { Router } from "express";
import { StaffController } from "../../controller/staff/staff.controller";
import { jwtVerify } from "../../middleware/auth.middleware";
import { roleCheck } from "../../middleware/roleCheck.middleware";
import { parseSingleImageUpload } from "../../middleware/imageUpload.middleware";
import { rateLimit } from "../../middleware/rateLimit.middleware";

const router = Router();

router.use(jwtVerify, roleCheck(["admin", "manager"]),rateLimit);

router.get("/", StaffController.list);
router.post("/", parseSingleImageUpload, StaffController.create);
router.get("/:id", StaffController.getById);
router.patch("/:id",parseSingleImageUpload ,StaffController.update);
router.delete("/:id", StaffController.delete);

export default router;

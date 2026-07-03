import { Router } from "express";
import { StaffController } from "../../controller/staff/staff.controller";
import { jwtVerify } from "../../middleware/auth.middleware";
import { roleCheck } from "../../middleware/roleCheck.middleware";

const router = Router();

router.use(jwtVerify, roleCheck(["admin", "manager"]));

router.get("/", StaffController.list);
router.post("/", StaffController.create);
router.get("/:id", StaffController.getById);
router.patch("/:id", StaffController.update);
router.delete("/:id", StaffController.delete);

export default router;

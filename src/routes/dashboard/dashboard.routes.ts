import { Router } from "express";
import { DashboardController } from "../../controller/dashboard/dashboard.controller";
import { jwtVerify } from "../../middleware/auth.middleware";
import { cacheGet } from "../../middleware/cache.middleware";
import { roleCheck } from "../../middleware/roleCheck.middleware";

const router = Router();
router.get("/overview", jwtVerify, roleCheck(["admin", "manager"]), cacheGet({ namespace: "dashboard", ttlSeconds: 30 }), DashboardController.overview);

export default router;

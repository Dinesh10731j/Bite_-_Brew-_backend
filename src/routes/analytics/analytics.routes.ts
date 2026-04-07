import { Router } from "express";
import { AnalyticsController } from "../../controller/analytics/analytics.controller";
import { jwtVerify } from "../../middleware/auth.middleware";
import { cacheGet } from "../../middleware/cache.middleware";
import { roleCheck } from "../../middleware/roleCheck.middleware";

const router = Router();

router.get("/summary", jwtVerify, roleCheck(["admin", "manager"]), cacheGet({ namespace: "analytics", ttlSeconds: 45 }), AnalyticsController.summary);

export default router;

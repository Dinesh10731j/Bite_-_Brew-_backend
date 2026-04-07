import { Router } from "express";
import { ReportsController } from "../../controller/reports/reports.controller";
import { jwtVerify } from "../../middleware/auth.middleware";
import { cacheGet } from "../../middleware/cache.middleware";
import { roleCheck } from "../../middleware/roleCheck.middleware";

const router = Router();
router.get("/sales", jwtVerify, roleCheck(["admin", "manager"]), cacheGet({ namespace: "reports", ttlSeconds: 60 }), ReportsController.sales);

export default router;

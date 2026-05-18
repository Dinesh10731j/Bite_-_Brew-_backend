import { Router } from "express";
import { OrdersController } from "../../controller/orders/orders.controller";
import { jwtVerify } from "../../middleware/auth.middleware";
import { cacheGet, invalidateCacheByNamespace } from "../../middleware/cache.middleware";
import { roleCheck } from "../../middleware/roleCheck.middleware";

const router = Router();

router.post("/", invalidateCacheByNamespace(["orders", "dashboard", "analytics", "reports"]), OrdersController.create);
router.get("/", jwtVerify, roleCheck(["admin", "manager"]), cacheGet({ namespace: "orders", ttlSeconds: 90 }), OrdersController.list);
router.get("/:id", jwtVerify, cacheGet({ namespace: "orders", ttlSeconds: 90 }), OrdersController.getById);
router.patch("/:id/status", jwtVerify, roleCheck(["admin", "manager"]), invalidateCacheByNamespace(["orders", "dashboard", "analytics", "reports"]), OrdersController.updateStatus);
router.patch("/:id/priority", jwtVerify, roleCheck(["admin", "manager"]), invalidateCacheByNamespace(["orders", "dashboard", "analytics", "reports"]), OrdersController.updatePriority);
router.delete("/:id", jwtVerify, roleCheck(["admin", "manager"]), invalidateCacheByNamespace(["orders", "dashboard", "analytics", "reports"]), OrdersController.delete);

export default router;

import { Router } from "express";
import { NotificationsController } from "../../controller/notifications/notifications.controller";
import { jwtVerify } from "../../middleware/auth.middleware";
import { cacheGet, invalidateCacheByNamespace } from "../../middleware/cache.middleware";
import { roleCheck } from "../../middleware/roleCheck.middleware";

const router = Router();

router.post("/", jwtVerify, roleCheck(["admin", "manager"]), invalidateCacheByNamespace(["notifications", "dashboard"]), NotificationsController.create);
router.get("/", jwtVerify, cacheGet({ namespace: "notifications", ttlSeconds: 60 }), NotificationsController.list);
router.patch("/:id/read", jwtVerify, invalidateCacheByNamespace(["notifications", "dashboard"]), NotificationsController.markRead);
router.patch("/read-all", jwtVerify, invalidateCacheByNamespace(["notifications", "dashboard"]), NotificationsController.markAllRead);
router.delete("/:id", jwtVerify, roleCheck(["admin", "manager"]), invalidateCacheByNamespace(["notifications", "dashboard"]), NotificationsController.delete);

export default router;

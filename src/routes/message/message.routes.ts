import { Router } from "express";
import { MessagesController } from "../../controller/messages/messages.controller";
import { jwtVerify } from "../../middleware/auth.middleware";
import { cacheGet, invalidateCacheByNamespace } from "../../middleware/cache.middleware";
import { roleCheck } from "../../middleware/roleCheck.middleware";

const router = Router();

router.post("/", invalidateCacheByNamespace(["messages", "dashboard", "analytics"]), MessagesController.create);
router.get("/", jwtVerify, roleCheck(["admin", "manager"]), cacheGet({ namespace: "messages", ttlSeconds: 90 }), MessagesController.list);
router.patch("/:id/read", jwtVerify, roleCheck(["admin", "manager"]), invalidateCacheByNamespace(["messages", "dashboard", "analytics"]), MessagesController.markRead);
router.delete("/:id", jwtVerify, roleCheck(["admin"]), invalidateCacheByNamespace(["messages", "dashboard", "analytics"]), MessagesController.delete);

export default router;

import { Router } from "express";
import { NewsletterController } from "../../controller/newsletter/newsletter.controller";
import { jwtVerify } from "../../middleware/auth.middleware";
import { cacheGet, invalidateCacheByNamespace } from "../../middleware/cache.middleware";
import { roleCheck } from "../../middleware/roleCheck.middleware";
import { rateLimit } from "../../middleware/rateLimit.middleware";

const router = Router();

router.post("/subscribe", invalidateCacheByNamespace(["newsletter"]),rateLimit, NewsletterController.subscribe);
router.post("/campaign", jwtVerify, roleCheck(["admin", "manager"]), rateLimit,NewsletterController.sendCampaign);
router.get("/", jwtVerify, roleCheck(["admin", "manager"]), cacheGet({ namespace: "newsletter", ttlSeconds: 120 }), NewsletterController.list);
router.patch("/:id/status", jwtVerify, roleCheck(["admin", "manager"]), rateLimit, invalidateCacheByNamespace(["newsletter"]), NewsletterController.updateStatus);
router.delete("/:id", jwtVerify, roleCheck(["admin"]), invalidateCacheByNamespace(["newsletter"]), rateLimit,NewsletterController.delete);

export default router;

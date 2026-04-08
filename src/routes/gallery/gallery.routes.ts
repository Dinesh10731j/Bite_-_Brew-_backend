import { Router } from "express";
import { GalleryController } from "../../controller/gallery/gallery.controller";
import { jwtVerify } from "../../middleware/auth.middleware";
import { cacheGet, invalidateCacheByNamespace } from "../../middleware/cache.middleware";
import { parseSingleImageUpload } from "../../middleware/imageUpload.middleware";
import { roleCheck } from "../../middleware/roleCheck.middleware";

const router = Router();

router.get("/", cacheGet({ namespace: "gallery", ttlSeconds: 120 }), GalleryController.list);
router.post("/", jwtVerify, roleCheck(["admin", "manager"]), parseSingleImageUpload, invalidateCacheByNamespace(["gallery"]), GalleryController.create);
router.patch("/:id", jwtVerify, roleCheck(["admin", "manager"]), invalidateCacheByNamespace(["gallery"]), GalleryController.update);
router.delete("/:id", jwtVerify, roleCheck(["admin"]), invalidateCacheByNamespace(["gallery"]), GalleryController.delete);

export default router;

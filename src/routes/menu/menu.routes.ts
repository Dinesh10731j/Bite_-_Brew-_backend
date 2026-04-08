import { Router } from "express";
import { MenuController } from "../../controller/menu/menu.controller";
import { jwtVerify } from "../../middleware/auth.middleware";
import { cacheGet, invalidateCacheByNamespace } from "../../middleware/cache.middleware";
import { parseSingleImageUpload } from "../../middleware/imageUpload.middleware";
import { roleCheck } from "../../middleware/roleCheck.middleware";

const router = Router();

router.get("/categories", cacheGet({ namespace: "menu", ttlSeconds: 120 }), MenuController.listCategories);
router.post("/categories", jwtVerify, roleCheck(["admin", "manager"]), invalidateCacheByNamespace(["menu", "dashboard"]), MenuController.createCategory);
router.patch("/categories/:id", jwtVerify, roleCheck(["admin", "manager"]), invalidateCacheByNamespace(["menu", "dashboard"]), MenuController.updateCategory);
router.delete("/categories/:id", jwtVerify, roleCheck(["admin"]), invalidateCacheByNamespace(["menu", "dashboard"]), MenuController.deleteCategory);

router.get("/items", cacheGet({ namespace: "menu", ttlSeconds: 120 }), MenuController.listMenuItems);
router.post("/items", jwtVerify, roleCheck(["admin", "manager"]), parseSingleImageUpload, invalidateCacheByNamespace(["menu", "dashboard"]), MenuController.createMenuItem);
router.patch("/items/:id", jwtVerify, roleCheck(["admin", "manager"]), invalidateCacheByNamespace(["menu", "dashboard"]), MenuController.updateMenuItem);
router.delete("/items/:id", jwtVerify, roleCheck(["admin"]), invalidateCacheByNamespace(["menu", "dashboard"]), MenuController.deleteMenuItem);

export default router;

import { Router } from "express";
import { AuthController } from "../../controller/auth/auth.controller";
import { UserController } from "../../controller/user/user.controller";
import { jwtVerify } from "../../middleware/auth.middleware";
import { cacheGet, invalidateCacheByNamespace } from "../../middleware/cache.middleware";
import { roleCheck } from "../../middleware/roleCheck.middleware";
import { parseSingleImageUpload } from "../../middleware/imageUpload.middleware";

const router = Router();

router.post("/auth/signup", AuthController.signup);
router.post("/auth/signin", AuthController.signin);
router.post("/auth/logout", AuthController.logout);
router.post("/auth/refresh-token", AuthController.refreshToken);
router.post("/auth/forgot-password", AuthController.forgotPassword);
router.post("/auth/reset-password", AuthController.resetPassword);

router.get("/users", jwtVerify, roleCheck(["admin", "manager"]), cacheGet({ namespace: "users", ttlSeconds: 60 }), UserController.findAll);
router.get("/users/me", jwtVerify, cacheGet({ namespace: "users", ttlSeconds: 30 }), UserController.me);
router.get("/staff", jwtVerify, roleCheck(["admin", "manager"]), cacheGet({ namespace: "staff", ttlSeconds: 60 }), UserController.listStaff);
router.post("/staff", jwtVerify, roleCheck(["admin", "manager"]), parseSingleImageUpload, invalidateCacheByNamespace(["staff"]), UserController.createStaff);
router.patch("/staff/:id", jwtVerify, roleCheck(["admin", "manager"]), parseSingleImageUpload, invalidateCacheByNamespace(["staff"]), UserController.updateStaff);
router.delete("/staff/:id", jwtVerify, roleCheck(["admin", "manager"]), invalidateCacheByNamespace(["staff"]), UserController.deleteStaff);
router.patch("/users/:id/role", jwtVerify, roleCheck(["admin"]), invalidateCacheByNamespace(["users"]), UserController.updateRole);

export default router;

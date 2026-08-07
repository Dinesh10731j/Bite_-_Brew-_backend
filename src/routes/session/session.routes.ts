import { Router } from "express";
import { SessionController } from "../../controller/session/session.controller";
import { LoginHistoryController } from "../../controller/session/loginHistory.controller";
import { jwtVerify } from "../../middleware/auth.middleware";

const router = Router();

// All session routes require a valid authenticated session.
router.get("/sessions", jwtVerify, SessionController.list);
router.post("/sessions/:sessionId/revoke", jwtVerify, SessionController.revoke);
router.post("/sessions/revoke-others", jwtVerify, SessionController.revokeOthers);
router.post("/sessions/logout-all", jwtVerify, SessionController.logoutAll);

// Login history
router.get("/login-history", jwtVerify, LoginHistoryController.list);

export default router;

import { Router } from "express";
import { ActivityLogsController } from "../../controller/activityLogs/activityLogs.controller";
import { jwtVerify } from "../../middleware/auth.middleware";

const router = Router();

router.get("/", jwtVerify, ActivityLogsController.list);

export default router;


import { Router } from "express";
import userRoutes from "./user/user.routes";
import menuRoutes from "./menu/menu.routes";
import ordersRoutes from "./orders/orders.routes";
import messageRoutes from "./message/message.routes";
import newsletterRoutes from "./newsletter/newsletter.routes";
import notificationRoutes from "./notification/notification.routes";
import galleryRoutes from "./gallery/gallery.routes";
import staffRoutes from "./staff/staff.routes";
import dashboardRoutes from "./dashboard/dashboard.routes";
import analyticsRoutes from "./analytics/analytics.routes";
import reportsRoutes from "./reports/reports.routes";
import uploadRoutes from "./upload/upload.routes";
import activityLogsRoutes from "./activityLogs/activityLogs.routes";
import loyaltyRoutes from "./loyalty/loyalty.routes";

const router = Router();

router.get("/health", (_req, res) => res.status(200).json({ ok: true, service: "bite-brew-cafe-backend" }));
router.use(userRoutes);
router.use("/staff", staffRoutes);
router.use("/menu", menuRoutes);
router.use("/orders", ordersRoutes);
router.use("/messages", messageRoutes);
router.use("/newsletter", newsletterRoutes);
router.use("/notifications", notificationRoutes);
router.use("/gallery", galleryRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/reports", reportsRoutes);
router.use("/uploads", uploadRoutes);
router.use("/activity-logs", activityLogsRoutes);
router.use("/loyalty", loyaltyRoutes);

export default router;


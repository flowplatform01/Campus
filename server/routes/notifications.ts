import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db.js";
import { notifications } from "@shared/schema";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { NotificationService } from "../services/notification-service.js";

const router = Router();

// Get notifications for current user
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { unreadOnly } = req.query;

    const conditions = [eq(notifications.userId, req.user!.id)];
    if (unreadOnly === "true") {
      conditions.push(eq(notifications.read, false));
    }

    const rows = await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
    const unreadCount = await NotificationService.getUnreadCount(req.user!.id);
    
    return res.json({
      notifications: rows,
      unreadCount,
      hasUnread: unreadCount > 0
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

// Mark notification(s) as read
router.patch("/:id/read", requireAuth, async (req: AuthRequest, res) => {
  try {
    const notificationId = req.params.id;
    if (!notificationId) return res.status(400).json({ message: "Notification ID is required" });
    await NotificationService.markAsRead(req.user!.id, [notificationId]);
    
    return res.json({ success: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to mark as read" });
  }
});

// Mark all notifications as read
router.patch("/read-all", requireAuth, async (req: AuthRequest, res) => {
  try {
    await NotificationService.markAsRead(req.user!.id);
    
    return res.json({ success: true, markedCount: 'all' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to mark all as read" });
  }
});

// Get unread count
router.get("/unread-count", requireAuth, async (req: AuthRequest, res) => {
  try {
    const count = await NotificationService.getUnreadCount(req.user!.id);
    
    return res.json({ count });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to get unread count" });
  }
});

// Delete notification
router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const notificationId = req.params.id;
    if (!notificationId) return res.status(400).json({ message: "Notification ID is required" });
    await db
      .delete(notifications)
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, req.user!.id)
        )
      );
    
    return res.json({ success: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to delete notification" });
  }
});

export default router;

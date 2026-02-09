import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "../db.js";
import { notifications } from "@shared/schema";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, req.user!.id))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
    return res.json(rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

router.patch("/:id/read", requireAuth, async (req: AuthRequest, res) => {
  try {
    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, req.params.id));
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ message: "Failed to mark as read" });
  }
});

export default router;

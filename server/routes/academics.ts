import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db.js";
import { grades, assignments, assignmentSubmissions, attendance, schedules } from "@shared/schema";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = Router();

router.get("/grades", requireAuth, async (req: AuthRequest, res) => {
  try {
    const studentId = req.query.studentId as string || req.user!.id;
    const rows = await db
      .select()
      .from(grades)
      .where(eq(grades.studentId, studentId))
      .orderBy(desc(grades.date));
    return res.json(rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to fetch grades" });
  }
});

router.get("/assignments", requireAuth, async (_req, res) => {
  try {
    const rows = await db.select().from(assignments).orderBy(desc(assignments.dueDate));
    return res.json(rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to fetch assignments" });
  }
});

router.post("/assignments/:id/submit", requireAuth, async (req: AuthRequest, res) => {
  try {
    const fileUrl = (req.body as { fileUrl?: string }).fileUrl;
    const [sub] = await db
      .insert(assignmentSubmissions)
      .values({
        assignmentId: req.params.id,
        studentId: req.user!.id,
        fileUrl: fileUrl || null,
      })
      .returning();
    return res.status(201).json(sub);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to submit" });
  }
});

router.get("/attendance", requireAuth, async (req: AuthRequest, res) => {
  try {
    const studentId = req.query.studentId as string || req.user!.id;
    const rows = await db
      .select()
      .from(attendance)
      .where(eq(attendance.studentId, studentId))
      .orderBy(desc(attendance.date));
    return res.json(rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to fetch attendance" });
  }
});

router.get("/schedule", requireAuth, async (_req, res) => {
  try {
    const rows = await db.select().from(schedules);
    return res.json(rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to fetch schedule" });
  }
});

export default router;

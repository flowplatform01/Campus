import { Router } from "express";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db.js";
import { announcements, schools, users } from "@shared/schema";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId ?? null;
    const rows = schoolId
      ? await db
          .select({
            a: announcements,
            school: { name: schools.name, logoUrl: schools.logoUrl },
            user: { name: users.name, avatarUrl: users.avatarUrl },
          })
          .from(announcements)
          .leftJoin(schools, eq(schools.id, announcements.schoolId))
          .leftJoin(users, eq(users.id, announcements.createdBy))
          .where(eq(announcements.schoolId, schoolId))
          .orderBy(desc(announcements.createdAt))
          .limit(50)
      : await db
          .select({
            a: announcements,
            school: { name: schools.name, logoUrl: schools.logoUrl },
            user: { name: users.name, avatarUrl: users.avatarUrl },
          })
          .from(announcements)
          .leftJoin(schools, eq(schools.id, announcements.schoolId))
          .leftJoin(users, eq(users.id, announcements.createdBy))
          .orderBy(desc(announcements.createdAt))
          .limit(50);

    return res.json(
      rows.map((r) => {
        const a = r.a as any;
        const postedAsSchool = !!a.postedAsSchool;
        return {
          ...a,
          authorDisplayName: postedAsSchool ? r.school?.name ?? "School" : r.user?.name ?? "User",
          authorLogoUrl: postedAsSchool ? r.school?.logoUrl ?? null : r.user?.avatarUrl ?? null,
        };
      })
    );
  } catch (e) {
    return res.status(500).json({ message: "Failed to fetch announcements" });
  }
});

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== "admin" && req.user!.role !== "employee") {
      return res.status(403).json({ message: "Not allowed" });
    }

    const body = z.object({ title: z.string().min(1), message: z.string().min(1) }).parse(req.body);

    const schoolId = req.user!.schoolId ?? null;
    if (!schoolId) {
      return res.status(400).json({ message: "User is not linked to a school" });
    }

    const [row] = await db
      .insert(announcements)
      .values({
        schoolId,
        createdBy: req.user!.id,
        postedAsSchool: true,
        title: body.title,
        message: body.message,
      })
      .returning();

    return res.status(201).json(row);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", errors: e.errors });
    }
    return res.status(500).json({ message: "Failed to create announcement" });
  }
});

export default router;

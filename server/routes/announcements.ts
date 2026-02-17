import { Router } from "express";
import { eq, desc, inArray, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db.js";
import { announcements, schools, users, notifications, studentEnrollments, parentChildren } from "@shared/schema";
import { requireAuth, type AuthRequest, requireTenantAccess, validateTenantAccess } from "../middleware/auth.js";

const router = Router();

const AUDIENCE_TYPES = ["entire_school", "class", "parents_only", "employees_only", "sub_role"] as const;

router.get("/", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId!;
    const u = req.user!;

    if (!validateTenantAccess(schoolId, u.schoolId!)) {
      return res.status(403).json({ message: "Cross-tenant access denied" });
    }

    const rows = await db
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
      .limit(100);

    // Precompute class membership for accurate class-targeting.
    const classIdsForStudent = new Set<string>();
    const classIdsForChildren = new Set<string>();

    if (u.role === "student") {
      const enrollments = await db
        .select({ classId: studentEnrollments.classId })
        .from(studentEnrollments)
        .where(and(eq(studentEnrollments.schoolId, schoolId), eq(studentEnrollments.studentId, u.id)));
      for (const e of enrollments) if (e.classId) classIdsForStudent.add(e.classId);
    }

    if (u.role === "parent") {
      const links = await db
        .select({ childId: parentChildren.childId })
        .from(parentChildren)
        .where(eq(parentChildren.parentId, u.id));
      const childIds = links.map((l) => l.childId);
      if (childIds.length > 0) {
        const childEnrollments = await db
          .select({ classId: studentEnrollments.classId })
          .from(studentEnrollments)
          .where(and(eq(studentEnrollments.schoolId, schoolId), inArray(studentEnrollments.studentId, childIds)));
        for (const e of childEnrollments) if (e.classId) classIdsForChildren.add(e.classId);
      }
    }

    const filtered = rows.filter((r) => {
      const a = r.a as { audienceType?: string; audienceId?: string | null };
      const at = a.audienceType ?? "entire_school";
      if (at === "entire_school") return true;
      if (at === "parents_only") return u.role === "parent";
      if (at === "employees_only") return u.role === "admin" || u.role === "employee";
      if (at === "sub_role") {
        // Empty audienceId means: all employees (like employees_only)
        if (!a.audienceId) return u.role === "admin" || u.role === "employee";
        return (u.role === "admin" || u.role === "employee") && (u as any).subRole === a.audienceId;
      }
      if (at === "class") {
        // Empty audienceId means: all classes
        if (!a.audienceId) return true;

        if (u.role === "admin" || u.role === "employee") return true;

        if (u.role === "student") {
          return classIdsForStudent.has(a.audienceId);
        }

        if (u.role === "parent") {
          return classIdsForChildren.has(a.audienceId);
        }

        return false;
      }
      return false;
    });

    return res.json(
      filtered.slice(0, 50).map((r) => {
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

const createAnnouncementSchema = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  audienceType: z.enum(AUDIENCE_TYPES).optional().default("entire_school"),
  audienceId: z.string().optional(),
});

router.post("/", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== "admin" && req.user!.role !== "employee") {
      return res.status(403).json({ message: "Not allowed" });
    }

    const body = createAnnouncementSchema.parse(req.body);
    const schoolId = req.user!.schoolId ?? null;
    if (!schoolId) {
      return res.status(400).json({ message: "User is not linked to a school" });
    }

    if (!validateTenantAccess(schoolId, req.user!.schoolId!)) {
      return res.status(403).json({ message: "Cross-tenant access denied" });
    }

    const [row] = await db
      .insert(announcements)
      .values({
        schoolId,
        createdBy: req.user!.id,
        postedAsSchool: true,
        title: body.title,
        message: body.message,
        audienceType: body.audienceType,
        audienceId: body.audienceId ?? null,
      })
      .returning();

    if (row) {
      try {
        await db.insert(notifications).values({
          userId: req.user!.id,
          type: "campus",
          title: "Announcement published",
          message: body.title,
          actionUrl: "/campus/announcements",
        });
      } catch (_) {}
    }

    return res.status(201).json(row);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", errors: e.errors });
    }
    return res.status(500).json({ message: "Failed to create announcement" });
  }
});

export default router;

import { Router } from "express";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "../db.js";
import {
  admissions,
  academicTerms,
  academicYears,
  announcements,
  classSections,
  employeeSubRoles,
  parentChildren,
  permissionCatalog,
  schools,
  schoolClasses,
  studentEnrollments,
  subjects,
  subRolePermissionGrants,
  smsAssignments,
  smsAssignmentSubmissions,
  smsAttendanceAuditLog,
  smsAttendanceEntries,
  smsAttendanceSessions,
  smsFeeHeads,
  smsInvoiceLines,
  smsInvoices,
  smsPaymentSettings,
  smsPayments,
  smsResources,
  timetablePublications,
  timetableSlots,
  users,
} from "@shared/schema";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = Router();

const PERMISSION_SEED: Array<{ key: string; label: string; description: string }> = [
  { key: "view_dashboard", label: "View Dashboard", description: "Access to dashboard" },
  { key: "manage_users", label: "Manage Users", description: "Full user management access" },
  { key: "create_users", label: "Create Users", description: "Create new users" },
  { key: "edit_users", label: "Edit Users", description: "Edit user information" },
  { key: "delete_users", label: "Delete Users", description: "Delete users" },
  { key: "view_grades", label: "View Grades", description: "View student grades" },
  { key: "edit_grades", label: "Edit Grades", description: "Enter and modify grades" },
  { key: "view_attendance", label: "View Attendance", description: "View attendance records" },
  { key: "mark_attendance", label: "Mark Attendance", description: "Mark student attendance" },
  { key: "view_schedule", label: "View Schedule", description: "View class schedules" },
  { key: "edit_schedule", label: "Edit Schedule", description: "Modify class schedules" },
  { key: "view_assignments", label: "View Assignments", description: "View assignments" },
  { key: "create_assignments", label: "Create Assignments", description: "Create new assignments" },
  { key: "grade_assignments", label: "Grade Assignments", description: "Grade student assignments" },
  { key: "submit_assignments", label: "Submit Assignments", description: "Submit assignments" },
  { key: "view_payments", label: "View Payments", description: "View payment records" },
  { key: "create_invoices", label: "Create Invoices", description: "Create invoices" },
  { key: "process_payments", label: "Process Payments", description: "Process payment transactions" },
  { key: "view_reports", label: "View Reports", description: "View reports" },
  { key: "generate_reports", label: "Generate Reports", description: "Generate new reports" },
  { key: "manage_school_settings", label: "Manage School Settings", description: "Manage school-wide settings" },
  { key: "view_social_feed", label: "View Social Feed", description: "View social media feed" },
  { key: "post_social", label: "Post on Social", description: "Create social media posts" },
  { key: "moderate_posts", label: "Moderate Posts", description: "Moderate social media posts" },
  { key: "send_announcements", label: "Send Announcements", description: "Send school announcements" },
  { key: "view_announcements", label: "View Announcements", description: "View announcements" },
  { key: "manage_classes", label: "Manage Classes", description: "Manage class assignments" },
  { key: "view_student_profiles", label: "View Student Profiles", description: "View student profiles" },
  { key: "edit_student_profiles", label: "Edit Student Profiles", description: "Edit student profiles" },
  { key: "view_parent_info", label: "View Parent Info", description: "View parent information" },
  { key: "manage_sub_roles", label: "Manage Sub-Roles", description: "Create and manage employee sub-roles" },
  { key: "view_analytics", label: "View Analytics", description: "View analytics and insights" },
  { key: "manage_resources", label: "Manage Resources", description: "Manage educational resources" },
  { key: "upload_resources", label: "Upload Resources", description: "Upload educational resources" },
];

async function ensurePermissionCatalogSeeded() {
  const existing = await db.select({ key: permissionCatalog.key }).from(permissionCatalog);
  const existingKeys = new Set(existing.map((e) => e.key));
  const missing = PERMISSION_SEED.filter((p) => !existingKeys.has(p.key));
  if (missing.length === 0) return;
  await db.insert(permissionCatalog).values(missing);
}

function randomTempPassword() {
  return `Campus@${Math.floor(100000 + Math.random() * 900000)}`;
}

function requireAdmin(req: AuthRequest, res: any): string | null {
  if (!req.user) {
    res.status(401).json({ message: "Authentication required" });
    return null;
  }
  if (req.user.role !== "admin") {
    res.status(403).json({ message: "Not allowed" });
    return null;
  }
  const schoolId = req.user.schoolId ?? null;
  if (!schoolId) {
    res.status(400).json({ message: "Admin is not linked to a school" });
    return null;
  }
  return schoolId;
}

const academicYearCreateSchema = z.object({
  name: z.string().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  isActive: z.boolean().optional(),
});

const academicYearUpdateSchema = academicYearCreateSchema.partial();

router.get("/academic-years", requireAuth, async (req: AuthRequest, res) => {
  const schoolId = requireAdmin(req, res);
  if (!schoolId) return;
  const rows = await db.select().from(academicYears).where(eq(academicYears.schoolId, schoolId));
  return res.json(rows);
});

router.get("/school", requireAuth, async (req: AuthRequest, res) => {
  const schoolId = req.user!.schoolId ?? null;
  if (!schoolId) return res.status(400).json({ message: "User is not linked to a school" });
  const [row] = await db.select().from(schools).where(eq(schools.id, schoolId)).limit(1);
  if (!row) return res.status(404).json({ message: "School not found" });
  return res.json(row);
});

const schoolUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
});

router.patch("/school", requireAuth, async (req: AuthRequest, res) => {
  const schoolId = requireAdmin(req, res);
  if (!schoolId) return;
  const body = schoolUpdateSchema.parse(req.body);
  const patch: any = { ...body };
  if (patch.logoUrl === "") patch.logoUrl = null;

  const [row] = await db
    .update(schools)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(schools.id, schoolId))
    .returning();
  if (!row) return res.status(404).json({ message: "School not found" });
  return res.json(row);
});

const attendanceSessionCreateSchema = z.object({
  academicYearId: z.string().min(1),
  termId: z.string().min(1),
  classId: z.string().min(1),
  sectionId: z.string().optional(),
  subjectId: z.string().optional(),
  date: z.string().datetime(),
});

router.get("/attendance/roster", requireAuth, async (req: AuthRequest, res) => {
  const user = req.user!;
  if (user.role !== "admin" && user.role !== "employee") {
    return res.status(403).json({ message: "Forbidden" });
  }
  const schoolId = user.schoolId ?? null;
  if (!schoolId) return res.status(400).json({ message: "User is not linked to a school" });

  const academicYearId = req.query.academicYearId as string | undefined;
  const classId = req.query.classId as string | undefined;
  const sectionId = (req.query.sectionId as string | undefined) ?? null;
  if (!academicYearId || !classId) {
    return res.status(400).json({ message: "academicYearId and classId are required" });
  }

  const rows = await db
    .select({
      enrollmentId: studentEnrollments.id,
      student: {
        id: users.id,
        name: users.name,
        studentId: users.studentId,
      },
    })
    .from(studentEnrollments)
    .innerJoin(users, eq(users.id, studentEnrollments.studentId))
    .where(
      and(
        eq(studentEnrollments.schoolId, schoolId),
        eq(studentEnrollments.academicYearId, academicYearId),
        eq(studentEnrollments.classId, classId),
        eq(studentEnrollments.status, "active"),
        sectionId ? eq(studentEnrollments.sectionId, sectionId) : isNull(studentEnrollments.sectionId)
      )
    )
    .orderBy(users.name);

  return res.json(rows);
});

router.post("/attendance/sessions", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    if (user.role !== "admin" && user.role !== "employee") {
      return res.status(403).json({ message: "Forbidden" });
    }
    const schoolId = user.schoolId ?? null;
    if (!schoolId) return res.status(400).json({ message: "User is not linked to a school" });

    const body = attendanceSessionCreateSchema.parse(req.body);
    const sectionId = body.sectionId ?? null;
    const subjectId = body.subjectId ?? null;
    const date = new Date(body.date);

    const [existing] = await db
      .select()
      .from(smsAttendanceSessions)
      .where(
        and(
          eq(smsAttendanceSessions.schoolId, schoolId),
          eq(smsAttendanceSessions.academicYearId, body.academicYearId),
          eq(smsAttendanceSessions.termId, body.termId),
          eq(smsAttendanceSessions.classId, body.classId),
          sectionId ? eq(smsAttendanceSessions.sectionId, sectionId) : isNull(smsAttendanceSessions.sectionId),
          subjectId ? eq(smsAttendanceSessions.subjectId, subjectId) : isNull(smsAttendanceSessions.subjectId),
          eq(smsAttendanceSessions.date, date)
        )
      )
      .limit(1);

    if (existing) return res.json(existing);

    const [row] = await db
      .insert(smsAttendanceSessions)
      .values({
        schoolId,
        academicYearId: body.academicYearId,
        termId: body.termId,
        classId: body.classId,
        sectionId,
        subjectId,
        date,
        status: "draft",
        markedBy: user.id,
      })
      .returning();

    await db.insert(smsAttendanceAuditLog).values({
      schoolId,
      sessionId: row.id,
      action: "session_created",
      actorId: user.id,
      meta: { status: row.status },
    });

    return res.status(201).json(row);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", errors: e.errors });
    }
    console.error(e);
    return res.status(500).json({ message: "Failed to create attendance session" });
  }
});

const attendanceEntriesUpsertSchema = z.object({
  entries: z.array(
    z.object({
      studentId: z.string().min(1),
      status: z.enum(["present", "absent", "late", "excused"]),
      note: z.string().optional(),
    })
  ),
});

router.post("/attendance/sessions/:id/entries", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    if (user.role !== "admin" && user.role !== "employee") {
      return res.status(403).json({ message: "Forbidden" });
    }
    const schoolId = user.schoolId ?? null;
    if (!schoolId) return res.status(400).json({ message: "User is not linked to a school" });

    const body = attendanceEntriesUpsertSchema.parse(req.body);

    const [session] = await db
      .select()
      .from(smsAttendanceSessions)
      .where(and(eq(smsAttendanceSessions.id, req.params.id), eq(smsAttendanceSessions.schoolId, schoolId)))
      .limit(1);
    if (!session) return res.status(404).json({ message: "Session not found" });
    if (session.status !== "draft") return res.status(409).json({ message: "Session is not editable" });

    const studentIds = Array.from(new Set(body.entries.map((e) => e.studentId)));
    const existing = await db
      .select()
      .from(smsAttendanceEntries)
      .where(
        and(
          eq(smsAttendanceEntries.schoolId, schoolId),
          eq(smsAttendanceEntries.sessionId, session.id),
          inArray(smsAttendanceEntries.studentId, studentIds)
        )
      );
    const existingByStudent = new Map(existing.map((r) => [r.studentId, r] as const));

    const now = new Date();
    const toInsert = [] as any[];
    const toUpdate = [] as any[];
    for (const e of body.entries) {
      const found = existingByStudent.get(e.studentId);
      if (!found) {
        toInsert.push({
          sessionId: session.id,
          schoolId,
          studentId: e.studentId,
          status: e.status,
          note: e.note ?? null,
          markedAt: now,
          markedBy: user.id,
        });
      } else {
        toUpdate.push({ id: found.id, status: e.status, note: e.note ?? null });
      }
    }

    if (toInsert.length > 0) {
      await db.insert(smsAttendanceEntries).values(toInsert);
    }
    for (const u of toUpdate) {
      await db
        .update(smsAttendanceEntries)
        .set({ status: u.status, note: u.note, markedAt: now, markedBy: user.id })
        .where(and(eq(smsAttendanceEntries.id, u.id), eq(smsAttendanceEntries.schoolId, schoolId)));
    }

    await db.insert(smsAttendanceAuditLog).values({
      schoolId,
      sessionId: session.id,
      action: "entries_upserted",
      actorId: user.id,
      meta: { count: body.entries.length },
    });

    const rows = await db
      .select()
      .from(smsAttendanceEntries)
      .where(and(eq(smsAttendanceEntries.schoolId, schoolId), eq(smsAttendanceEntries.sessionId, session.id)));
    return res.json(rows);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", errors: e.errors });
    }
    console.error(e);
    return res.status(500).json({ message: "Failed to save attendance" });
  }
});

router.post("/attendance/sessions/:id/submit", requireAuth, async (req: AuthRequest, res) => {
  const user = req.user!;
  if (user.role !== "admin" && user.role !== "employee") {
    return res.status(403).json({ message: "Forbidden" });
  }
  const schoolId = user.schoolId ?? null;
  if (!schoolId) return res.status(400).json({ message: "User is not linked to a school" });

  const [session] = await db
    .select()
    .from(smsAttendanceSessions)
    .where(and(eq(smsAttendanceSessions.id, req.params.id), eq(smsAttendanceSessions.schoolId, schoolId)))
    .limit(1);
  if (!session) return res.status(404).json({ message: "Session not found" });
  if (session.status !== "draft") return res.status(409).json({ message: "Session cannot be submitted" });

  const [row] = await db
    .update(smsAttendanceSessions)
    .set({ status: "submitted", submittedBy: user.id, submittedAt: new Date() })
    .where(and(eq(smsAttendanceSessions.id, session.id), eq(smsAttendanceSessions.schoolId, schoolId)))
    .returning();

  await db.insert(smsAttendanceAuditLog).values({
    schoolId,
    sessionId: row.id,
    action: "session_submitted",
    actorId: user.id,
    meta: { status: row.status },
  });

  return res.json(row);
});

router.post("/attendance/sessions/:id/lock", requireAuth, async (req: AuthRequest, res) => {
  const schoolId = requireAdmin(req, res);
  if (!schoolId) return;

  const [session] = await db
    .select()
    .from(smsAttendanceSessions)
    .where(and(eq(smsAttendanceSessions.id, req.params.id), eq(smsAttendanceSessions.schoolId, schoolId)))
    .limit(1);
  if (!session) return res.status(404).json({ message: "Session not found" });
  if (session.status !== "submitted") return res.status(409).json({ message: "Only submitted sessions can be locked" });

  const [row] = await db
    .update(smsAttendanceSessions)
    .set({ status: "locked", lockedBy: req.user!.id, lockedAt: new Date() })
    .where(and(eq(smsAttendanceSessions.id, session.id), eq(smsAttendanceSessions.schoolId, schoolId)))
    .returning();

  await db.insert(smsAttendanceAuditLog).values({
    schoolId,
    sessionId: row.id,
    action: "session_locked",
    actorId: req.user!.id,
    meta: { status: row.status },
  });

  return res.json(row);
});

router.get("/attendance/my", requireAuth, async (req: AuthRequest, res) => {
  const user = req.user!;
  const schoolId = user.schoolId ?? null;
  if (!schoolId) return res.status(400).json({ message: "User is not linked to a school" });

  const [activeYear] = await db
    .select()
    .from(academicYears)
    .where(and(eq(academicYears.schoolId, schoolId), eq(academicYears.isActive, true)))
    .limit(1);
  if (!activeYear) return res.json({ academicYearId: null, entries: [] });

  let studentId: string | null = null;
  if (user.role === "student") studentId = user.id;
  if (user.role === "parent") {
    const [link] = await db.select().from(parentChildren).where(eq(parentChildren.parentId, user.id)).limit(1);
    studentId = link?.childId ?? null;
  }
  if (!studentId) return res.json({ academicYearId: activeYear.id, entries: [] });

  const rows = await db
    .select({
      entry: smsAttendanceEntries,
      session: {
        id: smsAttendanceSessions.id,
        date: smsAttendanceSessions.date,
        status: smsAttendanceSessions.status,
        subjectId: smsAttendanceSessions.subjectId,
        classId: smsAttendanceSessions.classId,
        sectionId: smsAttendanceSessions.sectionId,
      },
    })
    .from(smsAttendanceEntries)
    .innerJoin(smsAttendanceSessions, eq(smsAttendanceSessions.id, smsAttendanceEntries.sessionId))
    .where(
      and(
        eq(smsAttendanceEntries.schoolId, schoolId),
        eq(smsAttendanceEntries.studentId, studentId),
        eq(smsAttendanceSessions.academicYearId, activeYear.id),
        eq(smsAttendanceSessions.status, "locked")
      )
    )
    .orderBy(desc(smsAttendanceSessions.date));

  return res.json({ academicYearId: activeYear.id, entries: rows });
});

// ============ Reports & Resources ============

router.get("/reports/summary", requireAuth, async (req: AuthRequest, res) => {
  const user = req.user!;
  const schoolId = user.schoolId ?? null;
  if (!schoolId) return res.status(400).json({ message: "User is not linked to a school" });

  const [activeYear] = await db
    .select()
    .from(academicYears)
    .where(and(eq(academicYears.schoolId, schoolId), eq(academicYears.isActive, true)))
    .limit(1);

  const yearId = activeYear?.id ?? null;

  const [{ count: studentsCount }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(studentEnrollments)
    .where(yearId ? and(eq(studentEnrollments.schoolId, schoolId), eq(studentEnrollments.academicYearId, yearId)) : eq(studentEnrollments.schoolId, schoolId));

  const [{ count: employeesCount }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(and(eq(users.schoolId, schoolId), eq(users.role, "employee")));

  const [{ count: admissionsPending }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(admissions)
    .where(and(eq(admissions.schoolId, schoolId), eq(admissions.status, "pending")));

  const [{ count: assignmentsCount }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(smsAssignments)
    .where(yearId ? and(eq(smsAssignments.schoolId, schoolId), eq(smsAssignments.academicYearId, yearId)) : eq(smsAssignments.schoolId, schoolId));

  const [{ count: attendanceLockedSessions }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(smsAttendanceSessions)
    .where(
      yearId
        ? and(eq(smsAttendanceSessions.schoolId, schoolId), eq(smsAttendanceSessions.academicYearId, yearId), eq(smsAttendanceSessions.status, "locked"))
        : and(eq(smsAttendanceSessions.schoolId, schoolId), eq(smsAttendanceSessions.status, "locked"))
    );

  return res.json({
    academicYearId: yearId,
    cards: {
      students: String(studentsCount ?? 0),
      employees: String(employeesCount ?? 0),
      pendingAdmissions: String(admissionsPending ?? 0),
      assignments: String(assignmentsCount ?? 0),
      attendanceLockedSessions: String(attendanceLockedSessions ?? 0),
    },
  });
});

router.get("/resources", requireAuth, async (req: AuthRequest, res) => {
  const user = req.user!;
  const schoolId = user.schoolId ?? null;
  if (!schoolId) return res.status(400).json({ message: "User is not linked to a school" });

  const rows = await db
    .select()
    .from(smsResources)
    .where(eq(smsResources.schoolId, schoolId))
    .orderBy(desc(smsResources.createdAt))
    .limit(200);
  return res.json(rows);
});

const resourceCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  url: z.string().min(1),
  academicYearId: z.string().optional().or(z.literal("")),
  classId: z.string().optional().or(z.literal("")),
  sectionId: z.string().optional().or(z.literal("")),
  subjectId: z.string().optional().or(z.literal("")),
});

router.post("/resources", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const schoolId = user.schoolId ?? null;
    if (!schoolId) return res.status(400).json({ message: "User is not linked to a school" });
    if (user.role !== "admin" && user.role !== "employee") {
      return res.status(403).json({ message: "Not allowed" });
    }

    const body = resourceCreateSchema.parse(req.body);
    const academicYearId = body.academicYearId ? body.academicYearId : null;
    const classId = body.classId ? body.classId : null;
    const sectionId = body.sectionId ? body.sectionId : null;
    const subjectId = body.subjectId ? body.subjectId : null;
    const [row] = await db
      .insert(smsResources)
      .values({
        schoolId,
        academicYearId,
        classId,
        sectionId,
        subjectId,
        title: body.title,
        description: body.description ?? null,
        url: body.url,
        type: "link",
        uploadedBy: user.id,
      })
      .returning();
    return res.status(201).json(row);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", errors: e.errors });
    }
    console.error(e);
    return res.status(500).json({ message: "Failed to create resource" });
  }
});

router.delete("/resources/:id", requireAuth, async (req: AuthRequest, res) => {
  const user = req.user!;
  const schoolId = user.schoolId ?? null;
  if (!schoolId) return res.status(400).json({ message: "User is not linked to a school" });
  if (user.role !== "admin" && user.role !== "employee") {
    return res.status(403).json({ message: "Not allowed" });
  }

  await db
    .delete(smsResources)
    .where(and(eq(smsResources.id, req.params.id), eq(smsResources.schoolId, schoolId)));
  return res.json({ message: "Deleted" });
});

// ============ Payments (Foundation) ============

router.get("/payments/fee-heads", requireAuth, async (req: AuthRequest, res) => {
  const user = req.user!;
  const schoolId = user.schoolId ?? null;
  if (!schoolId) return res.status(400).json({ message: "User is not linked to a school" });

  const rows = await db.select().from(smsFeeHeads).where(eq(smsFeeHeads.schoolId, schoolId)).orderBy(desc(smsFeeHeads.createdAt));
  return res.json(rows);
});

const feeHeadCreateSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
});

router.post("/payments/fee-heads", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const schoolId = user.schoolId ?? null;
    if (!schoolId) return res.status(400).json({ message: "User is not linked to a school" });
    if (user.role !== "admin" && user.role !== "employee") {
      return res.status(403).json({ message: "Not allowed" });
    }

    const body = feeHeadCreateSchema.parse(req.body);
    const [row] = await db
      .insert(smsFeeHeads)
      .values({ schoolId, name: body.name, code: body.code ?? null, isActive: true })
      .returning();
    return res.status(201).json(row);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ message: "Invalid input", errors: e.errors });
    console.error(e);
    return res.status(500).json({ message: "Failed to create fee head" });
  }
});

router.get("/payments/settings", requireAuth, async (req: AuthRequest, res) => {
  const schoolId = requireAdmin(req, res);
  if (!schoolId) return;

  const [row] = await db.select().from(smsPaymentSettings).where(eq(smsPaymentSettings.schoolId, schoolId)).limit(1);
  if (row) return res.json(row);
  const [created] = await db.insert(smsPaymentSettings).values({ schoolId, currency: "USD", methods: [] }).returning();
  return res.json(created);
});

const paymentSettingsUpdateSchema = z.object({
  currency: z.string().min(1).optional(),
  methods: z.array(z.string().min(1)).optional(),
});

router.patch("/payments/settings", requireAuth, async (req: AuthRequest, res) => {
  try {
    const schoolId = requireAdmin(req, res);
    if (!schoolId) return;

    const body = paymentSettingsUpdateSchema.parse(req.body);
    const [existing] = await db.select().from(smsPaymentSettings).where(eq(smsPaymentSettings.schoolId, schoolId)).limit(1);
    const now = new Date();
    const row = existing
      ? (
          await db
            .update(smsPaymentSettings)
            .set({ ...body, updatedAt: now })
            .where(eq(smsPaymentSettings.id, existing.id))
            .returning()
        )[0]
      : (
          await db
            .insert(smsPaymentSettings)
            .values({ schoolId, currency: body.currency ?? "USD", methods: body.methods ?? [], updatedAt: now })
            .returning()
        )[0];
    return res.json(row);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ message: "Invalid input", errors: e.errors });
    console.error(e);
    return res.status(500).json({ message: "Failed to update settings" });
  }
});

router.get("/payments/invoices", requireAuth, async (req: AuthRequest, res) => {
  const user = req.user!;
  const schoolId = user.schoolId ?? null;
  if (!schoolId) return res.status(400).json({ message: "User is not linked to a school" });

  if (user.role === "student") {
    const rows = await db
      .select()
      .from(smsInvoices)
      .where(and(eq(smsInvoices.schoolId, schoolId), eq(smsInvoices.studentId, user.id)))
      .orderBy(desc(smsInvoices.issuedAt))
      .limit(50);
    return res.json(rows);
  }

  const rows = await db
    .select()
    .from(smsInvoices)
    .where(eq(smsInvoices.schoolId, schoolId))
    .orderBy(desc(smsInvoices.issuedAt))
    .limit(100);
  return res.json(rows);
});

router.get("/payments/invoices/:id", requireAuth, async (req: AuthRequest, res) => {
  const user = req.user!;
  const schoolId = user.schoolId ?? null;
  if (!schoolId) return res.status(400).json({ message: "User is not linked to a school" });

  const [invoice] = await db
    .select()
    .from(smsInvoices)
    .where(and(eq(smsInvoices.id, req.params.id), eq(smsInvoices.schoolId, schoolId)))
    .limit(1);
  if (!invoice) return res.status(404).json({ message: "Invoice not found" });
  if (user.role === "student" && invoice.studentId !== user.id) return res.status(403).json({ message: "Forbidden" });

  const lines = await db
    .select()
    .from(smsInvoiceLines)
    .where(and(eq(smsInvoiceLines.schoolId, schoolId), eq(smsInvoiceLines.invoiceId, invoice.id)));
  const payments = await db
    .select()
    .from(smsPayments)
    .where(and(eq(smsPayments.schoolId, schoolId), eq(smsPayments.invoiceId, invoice.id)))
    .orderBy(desc(smsPayments.paidAt));

  return res.json({ invoice, lines, payments });
});

const invoiceCreateSchema = z.object({
  academicYearId: z.string().optional().or(z.literal("")),
  termId: z.string().optional().or(z.literal("")),
  studentId: z.string().min(1),
  dueAt: z.string().datetime().optional(),
  notes: z.string().optional(),
  lines: z.array(
    z.object({
      feeHeadId: z.string().optional().or(z.literal("")),
      description: z.string().min(1),
      amount: z.number().int().positive(),
    })
  ).min(1),
});

async function recomputeInvoiceTotals(schoolId: string, invoiceId: string) {
  const lines = await db
    .select({ amount: smsInvoiceLines.amount })
    .from(smsInvoiceLines)
    .where(and(eq(smsInvoiceLines.schoolId, schoolId), eq(smsInvoiceLines.invoiceId, invoiceId)));
  const subtotal = lines.reduce((acc, l) => acc + (l.amount ?? 0), 0);

  const pays = await db
    .select({ amount: smsPayments.amount })
    .from(smsPayments)
    .where(and(eq(smsPayments.schoolId, schoolId), eq(smsPayments.invoiceId, invoiceId)));
  const paid = pays.reduce((acc, p) => acc + (p.amount ?? 0), 0);

  const status = paid >= subtotal ? "paid" : "open";
  const [row] = await db
    .update(smsInvoices)
    .set({ subtotalAmount: subtotal, totalAmount: subtotal, status })
    .where(and(eq(smsInvoices.schoolId, schoolId), eq(smsInvoices.id, invoiceId)))
    .returning();
  return row;
}

router.post("/payments/invoices", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const schoolId = user.schoolId ?? null;
    if (!schoolId) return res.status(400).json({ message: "User is not linked to a school" });
    if (user.role !== "admin" && user.role !== "employee") {
      return res.status(403).json({ message: "Not allowed" });
    }

    const body = invoiceCreateSchema.parse(req.body);
    const academicYearId = body.academicYearId ? body.academicYearId : null;
    const termId = body.termId ? body.termId : null;

    const [invoice] = await db
      .insert(smsInvoices)
      .values({
        schoolId,
        academicYearId,
        termId,
        studentId: body.studentId,
        dueAt: body.dueAt ? new Date(body.dueAt) : null,
        notes: body.notes ?? null,
        status: "open",
        subtotalAmount: 0,
        totalAmount: 0,
        createdBy: user.id,
      })
      .returning();

    const lineRows = body.lines.map((l) => ({
      invoiceId: invoice.id,
      schoolId,
      feeHeadId: l.feeHeadId ? l.feeHeadId : null,
      description: l.description,
      amount: l.amount,
    }));
    await db.insert(smsInvoiceLines).values(lineRows);

    const updated = await recomputeInvoiceTotals(schoolId, invoice.id);
    return res.status(201).json(updated);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ message: "Invalid input", errors: e.errors });
    console.error(e);
    return res.status(500).json({ message: "Failed to create invoice" });
  }
});

const paymentCreateSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.number().int().positive(),
  method: z.string().min(1),
  reference: z.string().optional(),
  paidAt: z.string().datetime().optional(),
});

router.post("/payments/payments", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const schoolId = user.schoolId ?? null;
    if (!schoolId) return res.status(400).json({ message: "User is not linked to a school" });
    if (user.role !== "admin" && user.role !== "employee") {
      return res.status(403).json({ message: "Not allowed" });
    }

    const body = paymentCreateSchema.parse(req.body);
    const [invoice] = await db
      .select()
      .from(smsInvoices)
      .where(and(eq(smsInvoices.schoolId, schoolId), eq(smsInvoices.id, body.invoiceId)))
      .limit(1);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    const [row] = await db
      .insert(smsPayments)
      .values({
        schoolId,
        invoiceId: invoice.id,
        studentId: invoice.studentId,
        amount: body.amount,
        method: body.method,
        reference: body.reference ?? null,
        paidAt: body.paidAt ? new Date(body.paidAt) : new Date(),
        recordedBy: user.id,
      })
      .returning();

    const updatedInvoice = await recomputeInvoiceTotals(schoolId, invoice.id);
    return res.status(201).json({ payment: row, invoice: updatedInvoice });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ message: "Invalid input", errors: e.errors });
    console.error(e);
    return res.status(500).json({ message: "Failed to record payment" });
  }
});

router.get("/payments/students/:id/balance", requireAuth, async (req: AuthRequest, res) => {
  const user = req.user!;
  const schoolId = user.schoolId ?? null;
  if (!schoolId) return res.status(400).json({ message: "User is not linked to a school" });
  const studentId = req.params.id;
  if (user.role === "student" && user.id !== studentId) return res.status(403).json({ message: "Forbidden" });

  const invoices = await db
    .select({ total: smsInvoices.totalAmount, status: smsInvoices.status })
    .from(smsInvoices)
    .where(and(eq(smsInvoices.schoolId, schoolId), eq(smsInvoices.studentId, studentId)));
  const payments = await db
    .select({ amount: smsPayments.amount })
    .from(smsPayments)
    .where(and(eq(smsPayments.schoolId, schoolId), eq(smsPayments.studentId, studentId)));

  const invoiced = invoices.reduce((acc, i) => acc + (i.total ?? 0), 0);
  const paid = payments.reduce((acc, p) => acc + (p.amount ?? 0), 0);
  return res.json({ studentId, invoiced, paid, balance: Math.max(invoiced - paid, 0) });
});

// ============ Assignments Workflow ============

const assignmentCreateSchema = z.object({
  academicYearId: z.string().min(1),
  termId: z.string().min(1),
  classId: z.string().min(1),
  sectionId: z.string().optional(),
  subjectId: z.string().min(1),
  title: z.string().min(1),
  instructions: z.string().min(1),
  dueAt: z.string().datetime(),
  maxScore: z.number().int().positive(),
  attachmentUrl: z.string().optional(),
});

router.get("/assignments", requireAuth, async (req: AuthRequest, res) => {
  const user = req.user!;
  const schoolId = user.schoolId ?? null;
  if (!schoolId) return res.status(400).json({ message: "User is not linked to a school" });

  if (user.role === "admin") {
    const academicYearId = req.query.academicYearId as string | undefined;
    const termId = req.query.termId as string | undefined;
    const whereParts = [eq(smsAssignments.schoolId, schoolId)];
    if (academicYearId) whereParts.push(eq(smsAssignments.academicYearId, academicYearId));
    if (termId) whereParts.push(eq(smsAssignments.termId, termId));
    const rows = await db
      .select()
      .from(smsAssignments)
      .where(and(...whereParts))
      .orderBy(desc(smsAssignments.dueAt));
    return res.json(rows);
  }

  if (user.role === "employee") {
    const rows = await db
      .select()
      .from(smsAssignments)
      .where(and(eq(smsAssignments.schoolId, schoolId), eq(smsAssignments.createdBy, user.id)))
      .orderBy(desc(smsAssignments.dueAt));
    return res.json(rows);
  }

  // student/parent: published assignments for enrolled class/section in active year
  const [activeYear] = await db
    .select()
    .from(academicYears)
    .where(and(eq(academicYears.schoolId, schoolId), eq(academicYears.isActive, true)))
    .limit(1);
  if (!activeYear) return res.json([]);

  const studentId =
    user.role === "student"
      ? user.id
      : (
          await db.select().from(parentChildren).where(eq(parentChildren.parentId, user.id)).limit(1)
        )[0]?.childId;
  if (!studentId) return res.json([]);

  const [enrollment] = await db
    .select()
    .from(studentEnrollments)
    .where(
      and(
        eq(studentEnrollments.schoolId, schoolId),
        eq(studentEnrollments.academicYearId, activeYear.id),
        eq(studentEnrollments.studentId, studentId),
        eq(studentEnrollments.status, "active")
      )
    )
    .limit(1);
  if (!enrollment) return res.json([]);

  const rows = await db
    .select()
    .from(smsAssignments)
    .where(
      and(
        eq(smsAssignments.schoolId, schoolId),
        eq(smsAssignments.academicYearId, activeYear.id),
        eq(smsAssignments.classId, enrollment.classId),
        eq(smsAssignments.status, "published"),
        enrollment.sectionId ? eq(smsAssignments.sectionId, enrollment.sectionId) : isNull(smsAssignments.sectionId)
      )
    )
    .orderBy(desc(smsAssignments.dueAt));

  const subs = await db
    .select()
    .from(smsAssignmentSubmissions)
    .where(and(eq(smsAssignmentSubmissions.schoolId, schoolId), eq(smsAssignmentSubmissions.studentId, studentId)));

  const submittedSet = new Set(subs.map((s) => s.assignmentId));
  return res.json(rows.map((a: any) => ({ ...a, submitted: submittedSet.has(a.id) })));
});

router.post("/assignments", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    if (user.role !== "admin" && user.role !== "employee") {
      return res.status(403).json({ message: "Only employees/admin can create assignments" });
    }
    const schoolId = user.schoolId ?? null;
    if (!schoolId) return res.status(400).json({ message: "User is not linked to a school" });

    const body = assignmentCreateSchema.parse(req.body);
    const dueAt = new Date(body.dueAt);

    const [row] = await db
      .insert(smsAssignments)
      .values({
        schoolId,
        academicYearId: body.academicYearId,
        termId: body.termId,
        classId: body.classId,
        sectionId: body.sectionId ?? null,
        subjectId: body.subjectId,
        title: body.title,
        instructions: body.instructions,
        dueAt,
        maxScore: body.maxScore,
        attachmentUrl: body.attachmentUrl ?? null,
        status: "draft",
        createdBy: user.id,
      })
      .returning();

    return res.status(201).json(row);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", errors: e.errors });
    }
    console.error(e);
    return res.status(500).json({ message: "Failed to create assignment" });
  }
});

router.post("/assignments/:id/publish", requireAuth, async (req: AuthRequest, res) => {
  const user = req.user!;
  if (user.role !== "admin" && user.role !== "employee") {
    return res.status(403).json({ message: "Forbidden" });
  }
  const schoolId = user.schoolId ?? null;
  if (!schoolId) return res.status(400).json({ message: "User is not linked to a school" });

  const [row] = await db
    .update(smsAssignments)
    .set({ status: "published", publishedAt: new Date() })
    .where(and(eq(smsAssignments.id, req.params.id), eq(smsAssignments.schoolId, schoolId)))
    .returning();
  if (!row) return res.status(404).json({ message: "Assignment not found" });
  return res.json(row);
});

router.post("/assignments/:id/close", requireAuth, async (req: AuthRequest, res) => {
  const user = req.user!;
  if (user.role !== "admin" && user.role !== "employee") {
    return res.status(403).json({ message: "Forbidden" });
  }
  const schoolId = user.schoolId ?? null;
  if (!schoolId) return res.status(400).json({ message: "User is not linked to a school" });

  const [row] = await db
    .update(smsAssignments)
    .set({ status: "closed", closedAt: new Date() })
    .where(and(eq(smsAssignments.id, req.params.id), eq(smsAssignments.schoolId, schoolId)))
    .returning();
  if (!row) return res.status(404).json({ message: "Assignment not found" });
  return res.json(row);
});

const assignmentSubmitSchema = z.object({
  submissionUrl: z.string().optional(),
  submissionText: z.string().optional(),
});

router.post("/assignments/:id/submit", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    if (user.role !== "student") return res.status(403).json({ message: "Only students can submit" });
    const schoolId = user.schoolId ?? null;
    if (!schoolId) return res.status(400).json({ message: "User is not linked to a school" });

    const body = assignmentSubmitSchema.parse(req.body);
    const [assignment] = await db
      .select()
      .from(smsAssignments)
      .where(and(eq(smsAssignments.id, req.params.id), eq(smsAssignments.schoolId, schoolId)))
      .limit(1);
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });
    if (assignment.status !== "published") return res.status(400).json({ message: "Assignment is not published" });

    const [existing] = await db
      .select()
      .from(smsAssignmentSubmissions)
      .where(
        and(
          eq(smsAssignmentSubmissions.assignmentId, assignment.id),
          eq(smsAssignmentSubmissions.studentId, user.id),
          eq(smsAssignmentSubmissions.schoolId, schoolId)
        )
      )
      .limit(1);
    if (existing) return res.status(409).json({ message: "Already submitted" });

    const [sub] = await db
      .insert(smsAssignmentSubmissions)
      .values({
        assignmentId: assignment.id,
        schoolId,
        studentId: user.id,
        submissionUrl: body.submissionUrl ?? null,
        submissionText: body.submissionText ?? null,
      })
      .returning();

    return res.status(201).json(sub);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", errors: e.errors });
    }
    console.error(e);
    return res.status(500).json({ message: "Failed to submit" });
  }
});

const assignmentReviewSchema = z.object({
  score: z.number().int().nonnegative(),
  feedback: z.string().optional(),
});

router.post("/assignments/submissions/:id/review", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    if (user.role !== "admin" && user.role !== "employee") {
      return res.status(403).json({ message: "Forbidden" });
    }
    const schoolId = user.schoolId ?? null;
    if (!schoolId) return res.status(400).json({ message: "User is not linked to a school" });

    const body = assignmentReviewSchema.parse(req.body);
    const [row] = await db
      .update(smsAssignmentSubmissions)
      .set({
        score: body.score,
        feedback: body.feedback ?? null,
        reviewedBy: user.id,
        reviewedAt: new Date(),
      })
      .where(and(eq(smsAssignmentSubmissions.id, req.params.id), eq(smsAssignmentSubmissions.schoolId, schoolId)))
      .returning();
    if (!row) return res.status(404).json({ message: "Submission not found" });
    return res.json(row);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", errors: e.errors });
    }
    console.error(e);
    return res.status(500).json({ message: "Failed to review" });
  }
});

router.get("/assignments/:id/submissions", requireAuth, async (req: AuthRequest, res) => {
  const user = req.user!;
  if (user.role !== "admin" && user.role !== "employee") {
    return res.status(403).json({ message: "Forbidden" });
  }
  const schoolId = user.schoolId ?? null;
  if (!schoolId) return res.status(400).json({ message: "User is not linked to a school" });

  const [assignment] = await db
    .select()
    .from(smsAssignments)
    .where(and(eq(smsAssignments.id, req.params.id), eq(smsAssignments.schoolId, schoolId)))
    .limit(1);
  if (!assignment) return res.status(404).json({ message: "Assignment not found" });

  const rows = await db
    .select({
      submission: smsAssignmentSubmissions,
      student: {
        id: users.id,
        name: users.name,
        email: users.email,
        studentId: users.studentId,
      },
    })
    .from(smsAssignmentSubmissions)
    .innerJoin(users, eq(users.id, smsAssignmentSubmissions.studentId))
    .where(and(eq(smsAssignmentSubmissions.schoolId, schoolId), eq(smsAssignmentSubmissions.assignmentId, assignment.id)))
    .orderBy(desc(smsAssignmentSubmissions.submittedAt));

  return res.json(rows);
});

// ============ Timetable Engine ============

function parseTimeToMinutes(v: string) {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(v);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

async function assertTimetableNotPublished(input: {
  schoolId: string;
  academicYearId: string;
  termId: string;
  classId: string;
  sectionId: string | null;
}) {
  const [pub] = await db
    .select()
    .from(timetablePublications)
    .where(
      and(
        eq(timetablePublications.schoolId, input.schoolId),
        eq(timetablePublications.academicYearId, input.academicYearId),
        eq(timetablePublications.termId, input.termId),
        eq(timetablePublications.classId, input.classId),
        input.sectionId ? eq(timetablePublications.sectionId, input.sectionId) : isNull(timetablePublications.sectionId)
      )
    )
    .limit(1);
  if (pub?.status === "published") {
    const e: any = new Error("Timetable is published");
    e.code = "PUBLISHED";
    throw e;
  }
}

const timetableSlotSchema = z.object({
  academicYearId: z.string().min(1),
  termId: z.string().min(1),
  classId: z.string().min(1),
  sectionId: z.string().optional(),
  weekday: z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  subjectId: z.string().min(1),
  teacherId: z.string().min(1),
  room: z.string().optional(),
});

router.get("/timetable/week", requireAuth, async (req: AuthRequest, res) => {
  const user = req.user!;
  const schoolId = user.schoolId ?? null;
  if (!schoolId) return res.status(400).json({ message: "User is not linked to a school" });

  const [activeYear] = await db
    .select()
    .from(academicYears)
    .where(and(eq(academicYears.schoolId, schoolId), eq(academicYears.isActive, true)))
    .limit(1);
  if (!activeYear) return res.json({ academicYearId: null, slots: [] });

  if (user.role === "admin") {
    const academicYearId = (req.query.academicYearId as string | undefined) ?? activeYear.id;
    const termId = req.query.termId as string | undefined;
    const classId = req.query.classId as string | undefined;
    const sectionId = req.query.sectionId as string | undefined;
    if (!termId || !classId) {
      return res.status(400).json({ message: "termId and classId are required for admin view" });
    }
    const rows = await db
      .select()
      .from(timetableSlots)
      .where(
        and(
          eq(timetableSlots.schoolId, schoolId),
          eq(timetableSlots.academicYearId, academicYearId),
          eq(timetableSlots.termId, termId),
          eq(timetableSlots.classId, classId),
          sectionId ? eq(timetableSlots.sectionId, sectionId) : isNull(timetableSlots.sectionId)
        )
      );
    return res.json({ academicYearId, slots: rows });
  }

  if (user.role === "employee") {
    const rows = await db
      .select()
      .from(timetableSlots)
      .where(
        and(
          eq(timetableSlots.schoolId, schoolId),
          eq(timetableSlots.academicYearId, activeYear.id),
          eq(timetableSlots.teacherId, user.id)
        )
      );
    return res.json({ academicYearId: activeYear.id, slots: rows });
  }

  const studentId =
    user.role === "student"
      ? user.id
      : (
          await db.select().from(parentChildren).where(eq(parentChildren.parentId, user.id)).limit(1)
        )[0]?.childId;

  if (!studentId) return res.json({ academicYearId: activeYear.id, slots: [] });

  const [enrollment] = await db
    .select()
    .from(studentEnrollments)
    .where(
      and(
        eq(studentEnrollments.schoolId, schoolId),
        eq(studentEnrollments.academicYearId, activeYear.id),
        eq(studentEnrollments.studentId, studentId),
        eq(studentEnrollments.status, "active")
      )
    )
    .limit(1);
  if (!enrollment) return res.json({ academicYearId: activeYear.id, slots: [] });

  const rows = await db
    .select()
    .from(timetableSlots)
    .where(
      and(
        eq(timetableSlots.schoolId, schoolId),
        eq(timetableSlots.academicYearId, activeYear.id),
        eq(timetableSlots.classId, enrollment.classId),
        enrollment.sectionId ? eq(timetableSlots.sectionId, enrollment.sectionId) : isNull(timetableSlots.sectionId)
      )
    );
  return res.json({ academicYearId: activeYear.id, slots: rows });
});

router.post("/timetable/slots", requireAuth, async (req: AuthRequest, res) => {
  try {
    const schoolId = requireAdmin(req, res);
    if (!schoolId) return;
    const body = timetableSlotSchema.parse(req.body);

    const start = parseTimeToMinutes(body.startTime);
    const end = parseTimeToMinutes(body.endTime);
    if (start === null || end === null || end <= start) {
      return res.status(400).json({ message: "Invalid time range" });
    }

    await assertTimetableNotPublished({
      schoolId,
      academicYearId: body.academicYearId,
      termId: body.termId,
      classId: body.classId,
      sectionId: body.sectionId ?? null,
    });

    const existing = await db
      .select()
      .from(timetableSlots)
      .where(
        and(
          eq(timetableSlots.schoolId, schoolId),
          eq(timetableSlots.academicYearId, body.academicYearId),
          eq(timetableSlots.termId, body.termId),
          eq(timetableSlots.weekday, body.weekday)
        )
      );

    for (const s of existing) {
      const sStart = parseTimeToMinutes(s.startTime) ?? 0;
      const sEnd = parseTimeToMinutes(s.endTime) ?? 0;

      const sameGroup =
        s.classId === body.classId &&
        (s.sectionId ?? null) === (body.sectionId ?? null);
      const sameTeacher = s.teacherId === body.teacherId;

      if ((sameGroup || sameTeacher) && overlaps(start, end, sStart, sEnd)) {
        return res.status(409).json({
          message: "Timetable conflict",
          conflict: {
            id: s.id,
            weekday: s.weekday,
            startTime: s.startTime,
            endTime: s.endTime,
            classId: s.classId,
            sectionId: s.sectionId,
            teacherId: s.teacherId,
          },
        });
      }
    }

    const [row] = await db
      .insert(timetableSlots)
      .values({
        schoolId,
        academicYearId: body.academicYearId,
        termId: body.termId,
        classId: body.classId,
        sectionId: body.sectionId ?? null,
        weekday: body.weekday,
        startTime: body.startTime,
        endTime: body.endTime,
        subjectId: body.subjectId,
        teacherId: body.teacherId,
        room: body.room ?? null,
      })
      .returning();

    return res.status(201).json(row);
  } catch (e: any) {
    if (e?.code === "PUBLISHED") {
      return res.status(409).json({ message: "Timetable is published and locked" });
    }
    if (e instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", errors: e.errors });
    }
    console.error(e);
    return res.status(500).json({ message: "Failed to create slot" });
  }
});

router.delete("/timetable/slots/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const schoolId = requireAdmin(req, res);
    if (!schoolId) return;

    const [slot] = await db
      .select()
      .from(timetableSlots)
      .where(and(eq(timetableSlots.id, req.params.id), eq(timetableSlots.schoolId, schoolId)))
      .limit(1);
    if (!slot) return res.status(404).json({ message: "Slot not found" });

    await assertTimetableNotPublished({
      schoolId,
      academicYearId: slot.academicYearId,
      termId: slot.termId,
      classId: slot.classId,
      sectionId: slot.sectionId ?? null,
    });

    await db.delete(timetableSlots).where(and(eq(timetableSlots.id, req.params.id), eq(timetableSlots.schoolId, schoolId)));
    return res.json({ message: "Deleted" });
  } catch (e: any) {
    if (e?.code === "PUBLISHED") {
      return res.status(409).json({ message: "Timetable is published and locked" });
    }
    console.error(e);
    return res.status(500).json({ message: "Failed to delete slot" });
  }
});

const timetablePublishSchema = z.object({
  academicYearId: z.string().min(1),
  termId: z.string().min(1),
  classId: z.string().min(1),
  sectionId: z.string().optional(),
});

router.post("/timetable/publish", requireAuth, async (req: AuthRequest, res) => {
  try {
    const schoolId = requireAdmin(req, res);
    if (!schoolId) return;

    const body = timetablePublishSchema.parse(req.body);
    const sectionId = body.sectionId ?? null;

    const [existing] = await db
      .select()
      .from(timetablePublications)
      .where(
        and(
          eq(timetablePublications.schoolId, schoolId),
          eq(timetablePublications.academicYearId, body.academicYearId),
          eq(timetablePublications.termId, body.termId),
          eq(timetablePublications.classId, body.classId),
          sectionId ? eq(timetablePublications.sectionId, sectionId) : isNull(timetablePublications.sectionId)
        )
      )
      .limit(1);

    const now = new Date();
    const payload = {
      schoolId,
      academicYearId: body.academicYearId,
      termId: body.termId,
      classId: body.classId,
      sectionId,
      status: "published" as const,
      publishedAt: now,
      publishedBy: req.user!.id,
      updatedAt: now,
    };

    const row = existing
      ? (
          await db
            .update(timetablePublications)
            .set(payload)
            .where(eq(timetablePublications.id, existing.id))
            .returning()
        )[0]
      : (
          await db
            .insert(timetablePublications)
            .values({ ...payload, createdAt: now })
            .returning()
        )[0];

    return res.json(row);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", errors: e.errors });
    }
    console.error(e);
    return res.status(500).json({ message: "Failed to publish timetable" });
  }
});

router.post("/academic-years", requireAuth, async (req: AuthRequest, res) => {
  try {
    const schoolId = requireAdmin(req, res);
    if (!schoolId) return;

    const body = academicYearCreateSchema.parse(req.body);
    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);

    if (endDate <= startDate) {
      return res.status(400).json({ message: "End date must be after start date" });
    }

    const [{ count: activeCount }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(academicYears)
      .where(and(eq(academicYears.schoolId, schoolId), eq(academicYears.isActive, true)));

    const shouldActivate = (body.isActive ?? false) || activeCount === 0;
    if (shouldActivate) {
      await db.update(academicYears).set({ isActive: false }).where(eq(academicYears.schoolId, schoolId));
    }

    const [row] = await db
      .insert(academicYears)
      .values({
        schoolId,
        name: body.name,
        startDate,
        endDate,
        isActive: shouldActivate,
      })
      .returning();

    return res.status(201).json(row);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", errors: e.errors });
    }
    console.error(e);
    return res.status(500).json({ message: "Failed to create academic year" });
  }
});

router.patch("/academic-years/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const schoolId = requireAdmin(req, res);
    if (!schoolId) return;

    const body = academicYearUpdateSchema.parse(req.body);
    const patch: any = { ...body };
    if (body.startDate) patch.startDate = new Date(body.startDate);
    if (body.endDate) patch.endDate = new Date(body.endDate);

    if (patch.startDate && patch.endDate && patch.endDate <= patch.startDate) {
      return res.status(400).json({ message: "End date must be after start date" });
    }

    if (body.isActive === false) {
      return res.status(400).json({ message: "A school must always have exactly one active academic year. Activate another year instead." });
    }

    if (body.isActive === true) {
      await db.update(academicYears).set({ isActive: false }).where(eq(academicYears.schoolId, schoolId));
    }

    const [row] = await db
      .update(academicYears)
      .set(patch)
      .where(and(eq(academicYears.id, req.params.id), eq(academicYears.schoolId, schoolId)))
      .returning();

    if (!row) return res.status(404).json({ message: "Academic year not found" });
    return res.json(row);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", errors: e.errors });
    }
    console.error(e);
    return res.status(500).json({ message: "Failed to update academic year" });
  }
});

router.delete("/academic-years/:id", requireAuth, async (req: AuthRequest, res) => {
  const schoolId = requireAdmin(req, res);
  if (!schoolId) return;

  const [existing] = await db
    .select()
    .from(academicYears)
    .where(and(eq(academicYears.id, req.params.id), eq(academicYears.schoolId, schoolId)))
    .limit(1);
  if (!existing) return res.status(404).json({ message: "Academic year not found" });
  if (existing.isActive) {
    return res.status(400).json({ message: "Cannot delete the active academic year. Activate another year first." });
  }

  const [row] = await db
    .delete(academicYears)
    .where(and(eq(academicYears.id, req.params.id), eq(academicYears.schoolId, schoolId)))
    .returning();

  if (!row) return res.status(404).json({ message: "Academic year not found" });
  return res.json({ message: "Deleted" });
});

// ============ Dashboard (Role-aware, real metrics) ============

router.get("/dashboard", requireAuth, async (req: AuthRequest, res) => {
  const user = req.user!;
  const schoolId = user.schoolId ?? null;
  if (!schoolId) return res.status(400).json({ message: "User is not linked to a school" });

  const [activeYear] = await db
    .select()
    .from(academicYears)
    .where(and(eq(academicYears.schoolId, schoolId), eq(academicYears.isActive, true)))
    .limit(1);

  const hasActiveYear = !!activeYear;

  const [{ count: pendingAdmissions }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(admissions)
    .where(and(eq(admissions.schoolId, schoolId), eq(admissions.status, "submitted")));

  const [{ count: employeesCount }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(and(eq(users.schoolId, schoolId), eq(users.role, "employee")));

  const [{ count: studentsCount }] = hasActiveYear
    ? await db
        .select({ count: sql<number>`count(*)` })
        .from(studentEnrollments)
        .where(
          and(
            eq(studentEnrollments.schoolId, schoolId),
            eq(studentEnrollments.academicYearId, activeYear.id),
            eq(studentEnrollments.status, "active")
          )
        )
    : [{ count: 0 }];

  const [{ total: totalCollected }] = await db
    .select({ total: sql<number>`sum(amount)` })
    .from(smsPayments)
    .where(eq(smsPayments.schoolId, schoolId));

  const recentAnnouncements = await db
    .select()
    .from(announcements)
    .where(eq(announcements.schoolId, schoolId))
    .orderBy(desc(announcements.createdAt))
    .limit(5);

  const recentAudit = await db
    .select()
    .from(smsAttendanceAuditLog)
    .where(eq(smsAttendanceAuditLog.schoolId, schoolId))
    .orderBy(desc(smsAttendanceAuditLog.at))
    .limit(5);

  if (user.role === "admin") {
    return res.json({
      role: "admin",
      setup: {
        hasActiveAcademicYear: hasActiveYear,
      },
      cards: {
        students: studentsCount,
        employees: employeesCount,
        pendingAdmissions,
        feeCollection: totalCollected || 0,
      },
      recentAnnouncements,
      recentAudit,
    });
  }

  if (user.role === "employee") {
    return res.json({
      role: "employee",
      setup: { hasActiveAcademicYear: hasActiveYear },
      cards: {
        pendingAdmissions,
      },
      recentAnnouncements,
    });
  }

  if (user.role === "student") {
    return res.json({
      role: "student",
      setup: { hasActiveAcademicYear: hasActiveYear },
      cards: {},
      recentAnnouncements,
    });
  }

  if (user.role === "parent") {
    const [link] = await db.select().from(parentChildren).where(eq(parentChildren.parentId, user.id)).limit(1);
    return res.json({
      role: "parent",
      setup: { hasActiveAcademicYear: hasActiveYear },
      childId: link?.childId ?? null,
      cards: {},
      recentAnnouncements,
    });
  }

  return res.json({ role: user.role, setup: { hasActiveAcademicYear: hasActiveYear }, cards: {}, recentAnnouncements });
});

const termCreateSchema = z.object({
  academicYearId: z.string().min(1),
  name: z.string().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

router.get("/terms", requireAuth, async (req: AuthRequest, res) => {
  const schoolId = requireAdmin(req, res);
  if (!schoolId) return;
  const academicYearId = req.query.academicYearId as string | undefined;

  let rows = await db.select().from(academicTerms).where(eq(academicTerms.schoolId, schoolId));
  if (academicYearId) {
    rows = rows.filter((t) => t.academicYearId === academicYearId);
  }
  return res.json(rows);
});

router.post("/terms", requireAuth, async (req: AuthRequest, res) => {
  try {
    const schoolId = requireAdmin(req, res);
    if (!schoolId) return;

    const body = termCreateSchema.parse(req.body);
    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);
    if (endDate <= startDate) {
      return res.status(400).json({ message: "End date must be after start date" });
    }

    const [year] = await db
      .select()
      .from(academicYears)
      .where(and(eq(academicYears.id, body.academicYearId), eq(academicYears.schoolId, schoolId)))
      .limit(1);
    if (!year) {
      return res.status(400).json({ message: "Academic year not found" });
    }

    const [row] = await db
      .insert(academicTerms)
      .values({
        schoolId,
        academicYearId: body.academicYearId,
        name: body.name,
        startDate,
        endDate,
      })
      .returning();

    return res.status(201).json(row);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", errors: e.errors });
    }
    console.error(e);
    return res.status(500).json({ message: "Failed to create term" });
  }
});

router.delete("/terms/:id", requireAuth, async (req: AuthRequest, res) => {
  const schoolId = requireAdmin(req, res);
  if (!schoolId) return;

  const [row] = await db
    .delete(academicTerms)
    .where(and(eq(academicTerms.id, req.params.id), eq(academicTerms.schoolId, schoolId)))
    .returning();

  if (!row) return res.status(404).json({ message: "Term not found" });
  return res.json({ message: "Deleted" });
});

const classCreateSchema = z.object({
  name: z.string().min(1),
  sortOrder: z.number().int().optional(),
});

router.get("/classes", requireAuth, async (req: AuthRequest, res) => {
  const schoolId = requireAdmin(req, res);
  if (!schoolId) return;
  const rows = await db.select().from(schoolClasses).where(eq(schoolClasses.schoolId, schoolId));
  return res.json(rows);
});

router.post("/classes", requireAuth, async (req: AuthRequest, res) => {
  try {
    const schoolId = requireAdmin(req, res);
    if (!schoolId) return;

    const body = classCreateSchema.parse(req.body);
    const [row] = await db
      .insert(schoolClasses)
      .values({
        schoolId,
        name: body.name,
        sortOrder: body.sortOrder ?? 0,
      })
      .returning();

    return res.status(201).json(row);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", errors: e.errors });
    }
    console.error(e);
    return res.status(500).json({ message: "Failed to create class" });
  }
});

router.delete("/classes/:id", requireAuth, async (req: AuthRequest, res) => {
  const schoolId = requireAdmin(req, res);
  if (!schoolId) return;

  const [row] = await db
    .delete(schoolClasses)
    .where(and(eq(schoolClasses.id, req.params.id), eq(schoolClasses.schoolId, schoolId)))
    .returning();

  if (!row) return res.status(404).json({ message: "Class not found" });
  return res.json({ message: "Deleted" });
});

const sectionCreateSchema = z.object({
  classId: z.string().min(1),
  name: z.string().min(1),
});

router.get("/sections", requireAuth, async (req: AuthRequest, res) => {
  const schoolId = requireAdmin(req, res);
  if (!schoolId) return;
  const classId = req.query.classId as string | undefined;

  let rows = await db.select().from(classSections).where(eq(classSections.schoolId, schoolId));
  if (classId) {
    rows = rows.filter((s) => s.classId === classId);
  }
  return res.json(rows);
});

router.post("/sections", requireAuth, async (req: AuthRequest, res) => {
  try {
    const schoolId = requireAdmin(req, res);
    if (!schoolId) return;

    const body = sectionCreateSchema.parse(req.body);

    const [cls] = await db
      .select()
      .from(schoolClasses)
      .where(and(eq(schoolClasses.id, body.classId), eq(schoolClasses.schoolId, schoolId)))
      .limit(1);
    if (!cls) {
      return res.status(400).json({ message: "Class not found" });
    }

    const [row] = await db
      .insert(classSections)
      .values({
        schoolId,
        classId: body.classId,
        name: body.name,
      })
      .returning();

    return res.status(201).json(row);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", errors: e.errors });
    }
    console.error(e);
    return res.status(500).json({ message: "Failed to create section" });
  }
});

router.delete("/sections/:id", requireAuth, async (req: AuthRequest, res) => {
  const schoolId = requireAdmin(req, res);
  if (!schoolId) return;

  const [row] = await db
    .delete(classSections)
    .where(and(eq(classSections.id, req.params.id), eq(classSections.schoolId, schoolId)))
    .returning();

  if (!row) return res.status(404).json({ message: "Section not found" });
  return res.json({ message: "Deleted" });
});

const subjectCreateSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
});

router.get("/subjects", requireAuth, async (req: AuthRequest, res) => {
  const schoolId = requireAdmin(req, res);
  if (!schoolId) return;
  const rows = await db.select().from(subjects).where(eq(subjects.schoolId, schoolId));
  return res.json(rows);
});

router.post("/subjects", requireAuth, async (req: AuthRequest, res) => {
  try {
    const schoolId = requireAdmin(req, res);
    if (!schoolId) return;

    const body = subjectCreateSchema.parse(req.body);
    const [row] = await db
      .insert(subjects)
      .values({
        schoolId,
        name: body.name,
        code: body.code || null,
      })
      .returning();

    return res.status(201).json(row);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", errors: e.errors });
    }
    console.error(e);
    return res.status(500).json({ message: "Failed to create subject" });
  }
});

router.delete("/subjects/:id", requireAuth, async (req: AuthRequest, res) => {
  const schoolId = requireAdmin(req, res);
  if (!schoolId) return;

  const [row] = await db
    .delete(subjects)
    .where(and(eq(subjects.id, req.params.id), eq(subjects.schoolId, schoolId)))
    .returning();

  if (!row) return res.status(404).json({ message: "Subject not found" });
  return res.json({ message: "Deleted" });
});

// ============ Permissions & Sub-Roles ============

router.get("/permissions", requireAuth, async (req: AuthRequest, res) => {
  const schoolId = requireAdmin(req, res);
  if (!schoolId) return;
  await ensurePermissionCatalogSeeded();
  const rows = await db.select().from(permissionCatalog);
  return res.json(rows);
});

const subRoleCreateSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
});

router.get("/sub-roles", requireAuth, async (req: AuthRequest, res) => {
  const schoolId = requireAdmin(req, res);
  if (!schoolId) return;
  const rows = await db.select().from(employeeSubRoles).where(eq(employeeSubRoles.schoolId, schoolId));
  return res.json(rows);
});

router.post("/sub-roles", requireAuth, async (req: AuthRequest, res) => {
  try {
    const schoolId = requireAdmin(req, res);
    if (!schoolId) return;
    const body = subRoleCreateSchema.parse(req.body);
    const [row] = await db
      .insert(employeeSubRoles)
      .values({ schoolId, key: body.key, name: body.name, isSystem: false })
      .returning();
    return res.status(201).json(row);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", errors: e.errors });
    }
    console.error(e);
    return res.status(500).json({ message: "Failed to create sub-role" });
  }
});

router.delete("/sub-roles/:id", requireAuth, async (req: AuthRequest, res) => {
  const schoolId = requireAdmin(req, res);
  if (!schoolId) return;
  const [row] = await db
    .delete(employeeSubRoles)
    .where(and(eq(employeeSubRoles.id, req.params.id), eq(employeeSubRoles.schoolId, schoolId)))
    .returning();
  if (!row) return res.status(404).json({ message: "Sub-role not found" });
  await db
    .delete(subRolePermissionGrants)
    .where(and(eq(subRolePermissionGrants.subRoleId, req.params.id), eq(subRolePermissionGrants.schoolId, schoolId)));
  return res.json({ message: "Deleted" });
});

const subRoleGrantSchema = z.object({
  subRoleId: z.string().min(1),
  permissionKeys: z.array(z.string().min(1)),
});

router.get("/sub-role-grants", requireAuth, async (req: AuthRequest, res) => {
  const schoolId = requireAdmin(req, res);
  if (!schoolId) return;
  const subRoleId = req.query.subRoleId as string | undefined;
  const rows = subRoleId
    ? await db
        .select()
        .from(subRolePermissionGrants)
        .where(and(eq(subRolePermissionGrants.schoolId, schoolId), eq(subRolePermissionGrants.subRoleId, subRoleId)))
    : await db.select().from(subRolePermissionGrants).where(eq(subRolePermissionGrants.schoolId, schoolId));
  return res.json(rows);
});

router.put("/sub-role-grants", requireAuth, async (req: AuthRequest, res) => {
  try {
    const schoolId = requireAdmin(req, res);
    if (!schoolId) return;
    await ensurePermissionCatalogSeeded();

    const body = subRoleGrantSchema.parse(req.body);
    const [subRole] = await db
      .select()
      .from(employeeSubRoles)
      .where(and(eq(employeeSubRoles.id, body.subRoleId), eq(employeeSubRoles.schoolId, schoolId)))
      .limit(1);
    if (!subRole) return res.status(404).json({ message: "Sub-role not found" });

    const existingCatalog = await db
      .select({ key: permissionCatalog.key })
      .from(permissionCatalog)
      .where(inArray(permissionCatalog.key, body.permissionKeys));
    if (existingCatalog.length !== body.permissionKeys.length) {
      return res.status(400).json({ message: "One or more permission keys are invalid" });
    }

    await db
      .delete(subRolePermissionGrants)
      .where(and(eq(subRolePermissionGrants.schoolId, schoolId), eq(subRolePermissionGrants.subRoleId, body.subRoleId)));

    if (body.permissionKeys.length > 0) {
      await db.insert(subRolePermissionGrants).values(
        body.permissionKeys.map((k) => ({
          schoolId,
          subRoleId: body.subRoleId,
          permissionKey: k,
        }))
      );
    }

    const rows = await db
      .select()
      .from(subRolePermissionGrants)
      .where(and(eq(subRolePermissionGrants.schoolId, schoolId), eq(subRolePermissionGrants.subRoleId, body.subRoleId)));
    return res.json(rows);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", errors: e.errors });
    }
    console.error(e);
    return res.status(500).json({ message: "Failed to update sub-role grants" });
  }
});

// ============ Admissions ============

const admissionCreateSchema = z.object({
  academicYearId: z.string().min(1),
  classId: z.string().min(1),
  sectionId: z.string().optional(),
  studentFullName: z.string().min(1),
  studentEmail: z.string().email().optional(),
  studentPhone: z.string().optional(),
  desiredStudentId: z.string().optional(),
  parentFullName: z.string().optional(),
  parentEmail: z.string().email().optional(),
  parentPhone: z.string().optional(),
  notes: z.string().optional(),
});

router.get("/admissions", requireAuth, async (req: AuthRequest, res) => {
  const schoolId = requireAdmin(req, res);
  if (!schoolId) return;
  const rows = await db.select().from(admissions).where(eq(admissions.schoolId, schoolId));
  return res.json(rows);
});

router.post("/admissions", requireAuth, async (req: AuthRequest, res) => {
  try {
    const schoolId = requireAdmin(req, res);
    if (!schoolId) return;

    const body = admissionCreateSchema.parse(req.body);

    const [year] = await db
      .select()
      .from(academicYears)
      .where(and(eq(academicYears.id, body.academicYearId), eq(academicYears.schoolId, schoolId)))
      .limit(1);
    if (!year) return res.status(400).json({ message: "Academic year not found" });

    const [cls] = await db
      .select()
      .from(schoolClasses)
      .where(and(eq(schoolClasses.id, body.classId), eq(schoolClasses.schoolId, schoolId)))
      .limit(1);
    if (!cls) return res.status(400).json({ message: "Class not found" });

    if (body.sectionId) {
      const [sec] = await db
        .select()
        .from(classSections)
        .where(and(eq(classSections.id, body.sectionId), eq(classSections.schoolId, schoolId)))
        .limit(1);
      if (!sec) return res.status(400).json({ message: "Section not found" });
    }

    const [row] = await db
      .insert(admissions)
      .values({
        schoolId,
        academicYearId: body.academicYearId,
        classId: body.classId,
        sectionId: body.sectionId ?? null,
        studentFullName: body.studentFullName,
        studentEmail: body.studentEmail ?? null,
        studentPhone: body.studentPhone ?? null,
        desiredStudentId: body.desiredStudentId ?? null,
        parentFullName: body.parentFullName ?? null,
        parentEmail: body.parentEmail ?? null,
        parentPhone: body.parentPhone ?? null,
        notes: body.notes ?? null,
        status: "submitted",
        createdBy: req.user!.id,
      })
      .returning();

    return res.status(201).json(row);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", errors: e.errors });
    }
    console.error(e);
    return res.status(500).json({ message: "Failed to create admission" });
  }
});

router.patch("/admissions/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const schoolId = requireAdmin(req, res);
    if (!schoolId) return;

    const schema = z.object({
      status: z.enum(["submitted", "approved", "rejected", "withdrawn"]).optional(),
      notes: z.string().optional(),
    });
    const body = schema.parse(req.body);

    const [row] = await db
      .update(admissions)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(and(eq(admissions.id, req.params.id), eq(admissions.schoolId, schoolId)))
      .returning();

    if (!row) return res.status(404).json({ message: "Admission not found" });
    return res.json(row);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", errors: e.errors });
    }
    console.error(e);
    return res.status(500).json({ message: "Failed to update admission" });
  }
});

router.post("/admissions/:id/approve", requireAuth, async (req: AuthRequest, res) => {
  try {
    const schoolId = requireAdmin(req, res);
    if (!schoolId) return;

    const [adm] = await db
      .select()
      .from(admissions)
      .where(and(eq(admissions.id, req.params.id), eq(admissions.schoolId, schoolId)))
      .limit(1);
    if (!adm) return res.status(404).json({ message: "Admission not found" });
    if (adm.status !== "submitted") {
      return res.status(400).json({ message: `Admission is ${adm.status}` });
    }

    const studentEmail = adm.studentEmail || `student.${adm.id}@pending.local`;
    const parentEmail = adm.parentEmail || `parent.${adm.id}@pending.local`;

    const [existingStudentByEmail] = await db.select().from(users).where(eq(users.email, studentEmail)).limit(1);
    const [existingParentByEmail] = await db.select().from(users).where(eq(users.email, parentEmail)).limit(1);

    const studentPassword = randomTempPassword();
    const parentPassword = randomTempPassword();

    const studentUser =
      existingStudentByEmail ??
      (
        await db
          .insert(users)
          .values({
            email: studentEmail,
            password: await bcrypt.hash(studentPassword, 10),
            name: adm.studentFullName,
            role: "student",
            schoolId,
            studentId: adm.desiredStudentId ?? null,
            verified: true,
            emailVerifiedAt: new Date(),
            profileCompletion: 40,
            points: 0,
            badges: [],
          })
          .returning()
      )[0];

    const parentUser =
      existingParentByEmail ??
      (
        await db
          .insert(users)
          .values({
            email: parentEmail,
            password: await bcrypt.hash(parentPassword, 10),
            name: adm.parentFullName || "Parent/Guardian",
            role: "parent",
            schoolId,
            verified: true,
            emailVerifiedAt: new Date(),
            profileCompletion: 40,
            points: 0,
            badges: [],
          })
          .returning()
      )[0];

    const [existingLink] = await db
      .select()
      .from(parentChildren)
      .where(and(eq(parentChildren.parentId, parentUser.id), eq(parentChildren.childId, studentUser.id)))
      .limit(1);
    if (!existingLink) {
      await db.insert(parentChildren).values({ parentId: parentUser.id, childId: studentUser.id });
    }

    const [existingEnrollment] = await db
      .select()
      .from(studentEnrollments)
      .where(
        and(
          eq(studentEnrollments.schoolId, schoolId),
          eq(studentEnrollments.academicYearId, adm.academicYearId),
          eq(studentEnrollments.studentId, studentUser.id)
        )
      )
      .limit(1);
    if (!existingEnrollment) {
      await db.insert(studentEnrollments).values({
        schoolId,
        academicYearId: adm.academicYearId,
        studentId: studentUser.id,
        classId: adm.classId,
        sectionId: adm.sectionId ?? null,
        status: "active",
      });
    }

    const [updated] = await db
      .update(admissions)
      .set({ status: "approved", approvedBy: req.user!.id, approvedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(admissions.id, adm.id), eq(admissions.schoolId, schoolId)))
      .returning();

    return res.json({
      admission: updated,
      student: { id: studentUser.id, email: studentUser.email, tempPassword: existingStudentByEmail ? undefined : studentPassword },
      parent: { id: parentUser.id, email: parentUser.email, tempPassword: existingParentByEmail ? undefined : parentPassword },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to approve admission" });
  }
});

export default router;

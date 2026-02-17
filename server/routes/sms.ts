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
  enrollmentApplications,
  subjects,
  subRolePermissionGrants,
  smsAchievements,
  smsStudentAchievements,
  smsAssignments,
  smsAssignmentSubmissions,
  smsAttendanceAuditLog,
  smsAttendanceEntries,
  smsAttendanceSessions,
  smsExams,
  smsExamMarks,
  smsExpenses,
  smsStaffAttendanceEntries,
  smsStaffAttendanceSessions,
  smsGradeScales,
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
import { requireAuth, AuthRequest, requireTenantAccess, validateTenantAccess } from "../middleware/auth.js";
import { logAudit } from "../services/audit-service.js";

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

async function ensureDefaultSubRolesSeeded(schoolId: string) {
  const existing = await db.select({ key: employeeSubRoles.key }).from(employeeSubRoles).where(eq(employeeSubRoles.schoolId, schoolId));
  const existingKeys = new Set(existing.map((e) => e.key));
  
  const DEFAULT_SUB_ROLES = [
    { key: "teacher", name: "Teacher" },
    { key: "principal", name: "Principal" },
    { key: "accountant", name: "Accountant" },
    { key: "bursar", name: "Bursar" },
    { key: "secretary", name: "Secretary" },
    { key: "librarian", name: "Librarian" },
    { key: "counselor", name: "Counselor" },
    { key: "sports_coach", name: "Sports Coach" },
  ];
  
  const missing = DEFAULT_SUB_ROLES.filter((p) => !existingKeys.has(p.key));
  if (missing.length === 0) return;
  
  await db.insert(employeeSubRoles).values(
    missing.map(role => ({
      schoolId,
      key: role.key,
      name: role.name,
      isSystem: true,
    }))
  );
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

function requireStaff(req: AuthRequest, res: any): string | null {
  if (!req.user) {
    res.status(401).json({ message: "Authentication required" });
    return null;
  }
  if (req.user.role !== "admin" && req.user.role !== "employee") {
    res.status(403).json({ message: "Not allowed" });
    return null;
  }
  const schoolId = req.user.schoolId ?? null;
  if (!schoolId) {
    res.status(400).json({ message: "User is not linked to a school" });
    return null;
  }
  return schoolId;
}

function requireAnyAuth(req: AuthRequest, res: any): string | null {
  if (!req.user) {
    res.status(401).json({ message: "Authentication required" });
    return null;
  }
  const schoolId = req.user.schoolId ?? null;
  if (!schoolId) {
    res.status(400).json({ message: "User is not linked to a school" });
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

router.get("/academic-years", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  const schoolId = requireStaff(req, res);
  if (!schoolId) return;
  const rows = await db.select().from(academicYears).where(eq(academicYears.schoolId, schoolId));
  return res.json(rows);
});

router.get("/school", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  const user = req.user!;
  const schoolId = user.schoolId!;
  
  // Only admin and staff can access school details
  if (user.role !== "admin" && user.role !== "employee") {
    return res.status(403).json({ message: "Not allowed" });
  }
  
  // 🔐 STRICT TENANT ISOLATION - Double validation
  if (!validateTenantAccess(schoolId, user.schoolId!)) {
    return res.status(403).json({ message: "Cross-tenant access denied" });
  }
  
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

router.patch("/school", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
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

router.get("/attendance/roster", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
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

router.post("/attendance/sessions", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
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

    if (!row) {
      return res.status(500).json({ message: "Failed to create attendance session" });
    }

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

router.post("/attendance/sessions/:id/entries", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    if (user.role !== "admin" && user.role !== "employee") {
      return res.status(403).json({ message: "Forbidden" });
    }
    const schoolId = user.schoolId ?? null;
    if (!schoolId) return res.status(400).json({ message: "User is not linked to a school" });

    const sessionId = req.params.id;
    if (!sessionId) return res.status(400).json({ message: "Session ID is required" });

    const body = attendanceEntriesUpsertSchema.parse(req.body);

    const [session] = await db
      .select()
      .from(smsAttendanceSessions)
      .where(and(eq(smsAttendanceSessions.id, sessionId), eq(smsAttendanceSessions.schoolId, schoolId)))
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

router.post("/attendance/sessions/:id/submit", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  const user = req.user!;
  if (user.role !== "admin" && user.role !== "employee") {
    return res.status(403).json({ message: "Forbidden" });
  }
  const schoolId = user.schoolId ?? null;
  if (!schoolId) return res.status(400).json({ message: "User is not linked to a school" });

  const sessionId = req.params.id;
  if (!sessionId) return res.status(400).json({ message: "Session ID is required" });

  const [session] = await db
    .select()
    .from(smsAttendanceSessions)
    .where(and(eq(smsAttendanceSessions.id, sessionId), eq(smsAttendanceSessions.schoolId, schoolId)))
    .limit(1);
  if (!session) return res.status(404).json({ message: "Session not found" });
  if (session.status !== "draft") return res.status(409).json({ message: "Session cannot be submitted" });

  const [row] = await db
    .update(smsAttendanceSessions)
    .set({ status: "submitted", submittedBy: user.id, submittedAt: new Date() })
    .where(and(eq(smsAttendanceSessions.id, session.id), eq(smsAttendanceSessions.schoolId, schoolId)))
    .returning();

  if (!row) return res.status(500).json({ message: "Failed to submit session" });

  await db.insert(smsAttendanceAuditLog).values({
    schoolId,
    sessionId: row.id,
    action: "session_submitted",
    actorId: user.id,
    meta: { status: row.status },
  });

  return res.json(row);
});

router.post("/attendance/sessions/:id/lock", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  const schoolId = requireAdmin(req, res);
  if (!schoolId) return;

  const sessionId = req.params.id;
  if (!sessionId) return res.status(400).json({ message: "Session ID is required" });

  const [session] = await db
    .select()
    .from(smsAttendanceSessions)
    .where(and(eq(smsAttendanceSessions.id, sessionId), eq(smsAttendanceSessions.schoolId, schoolId)))
    .limit(1);
  if (!session) return res.status(404).json({ message: "Session not found" });
  if (session.status !== "submitted") return res.status(409).json({ message: "Only submitted sessions can be locked" });

  const [row] = await db
    .update(smsAttendanceSessions)
    .set({ status: "locked", lockedBy: req.user!.id, lockedAt: new Date() })
    .where(and(eq(smsAttendanceSessions.id, session.id), eq(smsAttendanceSessions.schoolId, schoolId)))
    .returning();

  if (!row) return res.status(500).json({ message: "Failed to lock session" });

  await db.insert(smsAttendanceAuditLog).values({
    schoolId,
    sessionId: row.id,
    action: "session_locked",
    actorId: req.user!.id,
    at: new Date(),
  });

  return res.json(row);
});

// ============ Enhanced Attendance System ============

// Get attendance sessions for a class
router.get("/attendance/sessions", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const schoolId = user.schoolId ?? null;
    if (!schoolId) return res.status(400).json({ message: "User is not linked to a school" });
    
    if (user.role !== "admin" && user.role !== "employee") {
      return res.status(403).json({ message: "Not authorized to access attendance" });
    }
    
    const academicYearId = req.query.academicYearId as string | undefined;
    const classId = req.query.classId as string | undefined;
    const subjectId = req.query.subjectId as string | undefined;
    const date = req.query.date as string | undefined;

    const conditions = [eq(smsAttendanceSessions.schoolId, schoolId)];
    if (academicYearId) conditions.push(eq(smsAttendanceSessions.academicYearId, academicYearId));
    if (classId) conditions.push(eq(smsAttendanceSessions.classId, classId));
    if (subjectId) conditions.push(eq(smsAttendanceSessions.subjectId, subjectId));
    if (date) conditions.push(sql`DATE(${smsAttendanceSessions.date})::date = ${date}`);

    const sessions = await db
      .select({
        session: {
          id: smsAttendanceSessions.id,
          date: smsAttendanceSessions.date,
          status: smsAttendanceSessions.status,
          createdAt: smsAttendanceSessions.createdAt,
          submittedAt: smsAttendanceSessions.submittedAt,
          lockedAt: smsAttendanceSessions.lockedAt,
        },
        academicYear: {
          id: academicYears.id,
          name: academicYears.name,
        },
        class: {
          id: schoolClasses.id,
          name: schoolClasses.name,
        },
        subject: {
          id: subjects.id,
          name: subjects.name,
          code: subjects.code,
        },
        createdBy: {
          id: users.id,
          name: users.name,
        },
      })
      .from(smsAttendanceSessions)
      .leftJoin(academicYears, eq(academicYears.id, smsAttendanceSessions.academicYearId))
      .leftJoin(schoolClasses, eq(schoolClasses.id, smsAttendanceSessions.classId))
      .leftJoin(subjects, eq(subjects.id, smsAttendanceSessions.subjectId))
      .leftJoin(users, eq(users.id, smsAttendanceSessions.markedBy))
      .where(and(...conditions))
      .orderBy(smsAttendanceSessions.date)
      .limit(50);
    
    return res.json(sessions);
  } catch (error) {
    console.error("Get attendance sessions error:", error);
    return res.status(500).json({ message: "Failed to get attendance sessions" });
  }
});

// Get attendance entries for a specific session
router.get("/attendance/sessions/:id/entries", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    if (user.role !== "admin" && user.role !== "employee") {
      return res.status(403).json({ message: "Forbidden" });
    }
    const schoolId = user.schoolId ?? null;
    if (!schoolId) return res.status(400).json({ message: "User is not linked to a school" });

    const sessionId = req.params.id;
    if (!sessionId) return res.status(400).json({ message: "Session ID is required" });
    const body = z.object({
      date: z.string().datetime().optional(),
      classId: z.string().optional(),
      subjectId: z.string().optional(),
    }).parse(req.query);

    const [session] = await db
      .select()
      .from(smsAttendanceSessions)
      .where(and(eq(smsAttendanceSessions.id, sessionId), eq(smsAttendanceSessions.schoolId, schoolId)))
      .limit(1);

    if (!session) {
      return res.status(404).json({ message: "Attendance session not found" });
    }

    let query = db
      .select({
        entry: smsAttendanceEntries,
        student: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(smsAttendanceEntries)
      .innerJoin(users, eq(users.id, smsAttendanceEntries.studentId))
      .where(eq(smsAttendanceEntries.sessionId, sessionId));

    const entries = await query.orderBy(users.name);
    return res.json(entries);
  } catch (error) {
    console.error("Get attendance entries error:", error);
    return res.status(500).json({ message: "Failed to get attendance entries" });
  }
});

// ============ Reports & Resources ============

router.get("/reports/summary", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  const user = req.user!;
  const schoolId = user.schoolId ?? null;
  if (!schoolId) return res.status(400).json({ message: "User is not linked to a school" });

  const [activeYear] = await db
    .select()
    .from(academicYears)
    .where(and(eq(academicYears.schoolId, schoolId), eq(academicYears.isActive, true)))
    .limit(1);

  const yearId = activeYear?.id ?? null;

  const studentsCountRow = (
    await db
      .select({ count: sql<number>`count(*)` })
      .from(studentEnrollments)
      .where(yearId ? and(eq(studentEnrollments.schoolId, schoolId), eq(studentEnrollments.academicYearId, yearId)) : eq(studentEnrollments.schoolId, schoolId))
  )[0];
  const studentsCount = studentsCountRow?.count ?? 0;

  const employeesCountRow = (
    await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(and(eq(users.schoolId, schoolId), eq(users.role, "employee")))
  )[0];
  const employeesCount = employeesCountRow?.count ?? 0;

  const admissionsPendingRow = (
    await db
      .select({ count: sql<number>`count(*)` })
      .from(admissions)
      .where(and(eq(admissions.schoolId, schoolId), eq(admissions.status, "pending")))
  )[0];
  const admissionsPending = admissionsPendingRow?.count ?? 0;

  const assignmentsCountRow = (
    await db
      .select({ count: sql<number>`count(*)` })
      .from(smsAssignments)
      .where(yearId ? and(eq(smsAssignments.schoolId, schoolId), eq(smsAssignments.academicYearId, yearId)) : eq(smsAssignments.schoolId, schoolId))
  )[0];
  const assignmentsCount = assignmentsCountRow?.count ?? 0;

  const attendanceLockedSessionsRow = (
    await db
      .select({ count: sql<number>`count(*)` })
      .from(smsAttendanceSessions)
      .where(
        yearId
          ? and(eq(smsAttendanceSessions.schoolId, schoolId), eq(smsAttendanceSessions.academicYearId, yearId), eq(smsAttendanceSessions.status, "locked"))
          : and(eq(smsAttendanceSessions.schoolId, schoolId), eq(smsAttendanceSessions.status, "locked"))
      )
  )[0];
  const attendanceLockedSessions = attendanceLockedSessionsRow?.count ?? 0;

  const totalExpensesRow = (
    await db
      .select({ sum: sql<number>`sum(amount)` })
      .from(smsExpenses)
      .where(eq(smsExpenses.schoolId, schoolId))
  )[0];
  const totalExpenses = totalExpensesRow?.sum ?? 0;

  const examsCountRow = (
    await db
      .select({ count: sql<number>`count(*)` })
      .from(smsExams)
      .where(yearId ? and(eq(smsExams.schoolId, schoolId), eq(smsExams.academicYearId, yearId)) : eq(smsExams.schoolId, schoolId))
  )[0];
  const examsCount = examsCountRow?.count ?? 0;

  return res.json({
    academicYearId: yearId,
    cards: {
      students: String(studentsCount ?? 0),
      employees: String(employeesCount ?? 0),
      pendingAdmissions: String(admissionsPending ?? 0),
      assignments: String(assignmentsCount ?? 0),
      attendanceLockedSessions: String(attendanceLockedSessions ?? 0),
      totalExpenses: String(totalExpenses ?? 0),
      examsCount: String(examsCount ?? 0),
    },
  });
});

router.get("/resources", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
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

router.post("/resources", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
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

router.delete("/resources/:id", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  const user = req.user!;
  const schoolId = user.schoolId ?? null;
  if (!schoolId) return res.status(400).json({ message: "User is not linked to a school" });
  if (user.role !== "admin" && user.role !== "employee") {
    return res.status(403).json({ message: "Not allowed" });
  }

  const resourceId = req.params.id;
  if (!resourceId) return res.status(400).json({ message: "Resource ID is required" });

  await db
    .delete(smsResources)
    .where(and(eq(smsResources.id, resourceId), eq(smsResources.schoolId, schoolId)));
  return res.json({ message: "Deleted" });
});

// ============ Payments (Foundation) ============

router.get("/payments/fee-heads", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
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

router.post("/payments/fee-heads", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
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

router.get("/payments/settings", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
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

router.patch("/payments/settings", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
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

router.get("/payments/invoices", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  const user = req.user!;
  const schoolId = user.schoolId ?? null;
  if (!schoolId) return res.status(400).json({ message: "User is not linked to a school" });

  // PARENTS: Only see invoices for their linked children
  // STUDENTS: Only see their own invoices
  // EMPLOYEES: See all invoices based on permissions
  const whereParts = [eq(smsInvoices.schoolId, schoolId)];

  if (user.role === "parent") {
    const parentChildLinks = await db
      .select({ childId: parentChildren.childId })
      .from(parentChildren)
      .where(eq(parentChildren.parentId, user.id));

    const childIds = parentChildLinks.map((pc) => pc.childId);
    if (childIds.length === 0) return res.json([]);
    whereParts.push(inArray(smsInvoices.studentId, childIds));
  } else if (user.role === "student") {
    whereParts.push(eq(smsInvoices.studentId, user.id));
  }

  const rows = await db
    .select({
      id: smsInvoices.id,
      schoolId: smsInvoices.schoolId,
      academicYearId: smsInvoices.academicYearId,
      termId: smsInvoices.termId,
      studentId: smsInvoices.studentId,
      status: smsInvoices.status,
      issuedAt: smsInvoices.issuedAt,
      dueAt: smsInvoices.dueAt,
      notes: smsInvoices.notes,
      subtotalAmount: smsInvoices.subtotalAmount,
      totalAmount: smsInvoices.totalAmount,
      createdBy: smsInvoices.createdBy,
      createdAt: smsInvoices.createdAt,
      displayName: sql<string>`coalesce(
        (select fh.name from sms_invoice_lines l left join sms_fee_heads fh on fh.id = l.fee_head_id where l.invoice_id = ${smsInvoices.id} limit 1),
        (select l.description from sms_invoice_lines l where l.invoice_id = ${smsInvoices.id} limit 1),
        ${smsInvoices.id}
      )`.as('displayName'),
    })
    .from(smsInvoices)
    .where(and(...whereParts))
    .orderBy(desc(smsInvoices.issuedAt))
    .limit(50);
  return res.json(rows);
});

router.get("/payments/invoices/:id", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  const user = req.user!;
  const schoolId = user.schoolId ?? null;
  if (!schoolId) return res.status(400).json({ message: "User is not linked to a school" });

  const invoiceId = req.params.id;
  if (!invoiceId) return res.status(400).json({ message: "Invoice ID is required" });

  const [invoice] = await db
    .select()
    .from(smsInvoices)
    .where(and(eq(smsInvoices.id, invoiceId), eq(smsInvoices.schoolId, schoolId)))
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
      feeHeadId: z.string().min(1),
      description: z.string().min(1),
      amount: z.number().int().positive(),
    })
  ).min(1),
});

const invoiceBulkCreateSchema = invoiceCreateSchema
  .omit({ studentId: true })
  .extend({ studentIds: z.array(z.string().min(1)).min(1) });

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

router.post("/payments/invoices", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
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

    if (!invoice) return res.status(500).json({ message: "Failed to create invoice" });

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

router.post("/payments/invoices/bulk", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const schoolId = user.schoolId ?? null;
    if (!schoolId) return res.status(400).json({ message: "User is not linked to a school" });
    if (user.role !== "admin" && user.role !== "employee") {
      return res.status(403).json({ message: "Not allowed" });
    }

    const body = invoiceBulkCreateSchema.parse(req.body);
    const academicYearId = body.academicYearId ? body.academicYearId : null;
    const termId = body.termId ? body.termId : null;
    const dueAt = body.dueAt ? new Date(body.dueAt) : null;
    const notes = body.notes ?? null;

    const created = await db.transaction(async (tx) => {
      const createdInvoices = [] as any[];
      for (const studentId of body.studentIds) {
        const [invoice] = await tx
          .insert(smsInvoices)
          .values({
            schoolId,
            academicYearId,
            termId,
            studentId,
            dueAt,
            notes,
            status: "open",
            subtotalAmount: 0,
            totalAmount: 0,
            createdBy: user.id,
          })
          .returning();

        if (!invoice) throw new Error("Failed to create invoice");

        const lineRows = body.lines.map((l) => ({
          invoiceId: invoice.id,
          schoolId,
          feeHeadId: l.feeHeadId ? l.feeHeadId : null,
          description: l.description,
          amount: l.amount,
        }));
        await tx.insert(smsInvoiceLines).values(lineRows);

        // recompute totals inside the same transaction
        const subtotal = lineRows.reduce((acc, l) => acc + (l.amount ?? 0), 0);
        const status = "open";
        const [updated] = await tx
          .update(smsInvoices)
          .set({ subtotalAmount: subtotal, totalAmount: subtotal, status })
          .where(and(eq(smsInvoices.schoolId, schoolId), eq(smsInvoices.id, invoice.id)))
          .returning();
        createdInvoices.push(updated ?? invoice);
      }
      return createdInvoices;
    });

    return res.status(201).json({ count: created.length, invoices: created });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ message: "Invalid input", errors: e.errors });
    console.error(e);
    return res.status(500).json({ message: "Failed to create invoices" });
  }
});

const paymentCreateSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.number().int().positive(),
  method: z.string().min(1),
  reference: z.string().optional(),
  paidAt: z.string().datetime().optional(),
});

router.post("/payments/payments", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
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
        studentId: invoice.studentId, // Ensure payment is linked to correct student
        amount: body.amount,
        method: body.method,
        reference: body.reference ?? null,
        paidAt: body.paidAt ? new Date(body.paidAt) : new Date(),
        recordedBy: user.id,
      })
      .returning();

    const updatedInvoice = await recomputeInvoiceTotals(schoolId, invoice.id);
    await logAudit({
      action: "payment_record",
      entityType: "payment",
      entityId: row.id,
      actorId: user.id,
      schoolId,
      meta: { invoiceId: invoice.id, studentId: invoice.studentId, amount: body.amount, method: body.method },
    });
    return res.status(201).json({ payment: row, invoice: updatedInvoice });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ message: "Invalid input", errors: e.errors });
    console.error(e);
    return res.status(500).json({ message: "Failed to record payment" });
  }
});

router.get("/payments/students/:id/balance", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  const user = req.user!;
  const schoolId = user.schoolId ?? null;
  if (!schoolId) return res.status(400).json({ message: "User is not linked to a school" });
  const studentId = req.params.id;
  if (!studentId) return res.status(400).json({ message: "Student ID is required" });
  
  // PARENTS: Can only view balance for their linked children
  if (user.role === "parent") {
    const parentChildLinks = await db
      .select({ childId: parentChildren.childId })
      .from(parentChildren)
      .where(eq(parentChildren.parentId, user.id));
    
    const childIds = parentChildLinks.map((pc) => pc.childId);
    if (!childIds.includes(studentId)) {
      return res.status(403).json({ message: "Not authorized to view this student's balance" });
    }
  }
  // STUDENTS: Can only view their own balance
  if (user.role === "student" && user.id !== studentId) {
    return res.status(403).json({ message: "Not authorized to view this student's balance" });
  }

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

router.get("/assignments", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
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

router.post("/assignments", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
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

router.post("/assignments/:id/publish", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  const user = req.user!;
  if (user.role !== "admin" && user.role !== "employee") {
    return res.status(403).json({ message: "Forbidden" });
  }
  const schoolId = user.schoolId ?? null;
  if (!schoolId) return res.status(400).json({ message: "User is not linked to a school" });

  const assignmentId = req.params.id;
  if (!assignmentId) return res.status(400).json({ message: "Assignment ID is required" });

  const [row] = await db
    .update(smsAssignments)
    .set({ status: "published", publishedAt: new Date() })
    .where(and(eq(smsAssignments.id, assignmentId), eq(smsAssignments.schoolId, schoolId)))
    .returning();
  if (!row) return res.status(404).json({ message: "Assignment not found" });
  return res.json(row);
});

router.post("/assignments/:id/close", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  const user = req.user!;
  if (user.role !== "admin" && user.role !== "employee") {
    return res.status(403).json({ message: "Forbidden" });
  }
  const schoolId = user.schoolId ?? null;
  if (!schoolId) return res.status(400).json({ message: "User is not linked to a school" });

  const assignmentId = req.params.id;
  if (!assignmentId) return res.status(400).json({ message: "Assignment ID is required" });

  const [row] = await db
    .update(smsAssignments)
    .set({ status: "closed", closedAt: new Date() })
    .where(and(eq(smsAssignments.id, assignmentId), eq(smsAssignments.schoolId, schoolId)))
    .returning();
  if (!row) return res.status(404).json({ message: "Assignment not found" });
  return res.json(row);
});

const assignmentSubmitSchema = z.object({
  submissionUrl: z.string().optional(),
  submissionText: z.string().optional(),
});

router.post("/assignments/:id/submit", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    if (user.role !== "student") return res.status(403).json({ message: "Only students can submit" });
    const schoolId = user.schoolId ?? null;
    if (!schoolId) return res.status(400).json({ message: "User is not linked to a school" });

    const assignmentId = req.params.id;
    if (!assignmentId) return res.status(400).json({ message: "Assignment ID is required" });

    const body = assignmentSubmitSchema.parse(req.body);
    const [assignment] = await db
      .select()
      .from(smsAssignments)
      .where(and(eq(smsAssignments.id, assignmentId), eq(smsAssignments.schoolId, schoolId)))
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

router.post("/assignments/submissions/:id/review", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    if (user.role !== "admin" && user.role !== "employee") {
      return res.status(403).json({ message: "Forbidden" });
    }
    const schoolId = user.schoolId ?? null;
    if (!schoolId) return res.status(400).json({ message: "User is not linked to a school" });

    const submissionId = req.params.id;
    if (!submissionId) return res.status(400).json({ message: "Submission ID is required" });

    const body = assignmentReviewSchema.parse(req.body);
    const [row] = await db
      .update(smsAssignmentSubmissions)
      .set({
        score: body.score,
        feedback: body.feedback ?? null,
        reviewedBy: user.id,
        reviewedAt: new Date(),
      })
      .where(and(eq(smsAssignmentSubmissions.id, submissionId), eq(smsAssignmentSubmissions.schoolId, schoolId)))
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

router.get("/assignments/:id/submissions", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  const user = req.user!;
  if (user.role !== "admin" && user.role !== "employee") {
    return res.status(403).json({ message: "Forbidden" });
  }
  const schoolId = user.schoolId ?? null;
  if (!schoolId) return res.status(400).json({ message: "User is not linked to a school" });

  const assignmentId = req.params.id;
  if (!assignmentId) return res.status(400).json({ message: "Assignment ID is required" });

  const [assignment] = await db
    .select()
    .from(smsAssignments)
    .where(and(eq(smsAssignments.id, assignmentId), eq(smsAssignments.schoolId, schoolId)))
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

router.get("/timetable/week", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
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

router.post("/timetable/slots", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
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

router.delete("/timetable/slots/:id", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const schoolId = requireAdmin(req, res);
    if (!schoolId) return;

    const slotId = req.params.id;
    if (!slotId) return res.status(400).json({ message: "Slot ID is required" });

    const [slot] = await db
      .select()
      .from(timetableSlots)
      .where(and(eq(timetableSlots.id, slotId), eq(timetableSlots.schoolId, schoolId)))
      .limit(1);
    if (!slot) return res.status(404).json({ message: "Slot not found" });

    await assertTimetableNotPublished({
      schoolId,
      academicYearId: slot.academicYearId,
      termId: slot.termId,
      classId: slot.classId,
      sectionId: slot.sectionId ?? null,
    });

    await db.delete(timetableSlots).where(and(eq(timetableSlots.id, slotId), eq(timetableSlots.schoolId, schoolId)));
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

router.post("/timetable/publish", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
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

    let row;
    if (existing) {
      [row] = await db
        .update(timetablePublications)
        .set({
          status: "published",
          publishedAt: new Date(),
          publishedBy: req.user!.id,
          updatedAt: new Date(),
        })
        .where(eq(timetablePublications.id, existing.id))
        .returning();
    } else {
      [row] = await db
        .insert(timetablePublications)
        .values({
          schoolId,
          academicYearId: body.academicYearId,
          termId: body.termId,
          classId: body.classId,
          sectionId,
          status: "published",
          publishedAt: new Date(),
          publishedBy: req.user!.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
    }

    return res.status(200).json({
      message: existing ? "Timetable updated and published" : "Timetable created and published",
      timetable: row,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", errors: error.errors });
    }
    console.error(error);
    return res.status(500).json({ message: "Failed to publish timetable" });
  }
});

router.post("/academic-years", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const schoolId = requireAdmin(req, res);
    if (!schoolId) return;

    const body = academicYearCreateSchema.parse(req.body);
    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);

    if (endDate <= startDate) {
      return res.status(400).json({ message: "End date must be after start date" });
    }

    const activeCountRow = (
      await db
        .select({ count: sql<number>`count(*)` })
        .from(academicYears)
        .where(and(eq(academicYears.schoolId, schoolId), eq(academicYears.isActive, true)))
    )[0];
    const activeCount = activeCountRow?.count ?? 0;

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

router.patch("/academic-years/:id", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const schoolId = requireAdmin(req, res);
    if (!schoolId) return;

    const academicYearId = req.params.id;
    if (!academicYearId) return res.status(400).json({ message: "Academic year ID is required" });

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
      .where(and(eq(academicYears.id, academicYearId), eq(academicYears.schoolId, schoolId)))
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

router.delete("/academic-years/:id", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  const schoolId = requireAdmin(req, res);
  if (!schoolId) return;

  const academicYearId = req.params.id;
  if (!academicYearId) return res.status(400).json({ message: "Academic year ID is required" });

  const [existing] = await db
    .select()
    .from(academicYears)
    .where(and(eq(academicYears.id, academicYearId), eq(academicYears.schoolId, schoolId)))
    .limit(1);
  if (!existing) return res.status(404).json({ message: "Academic year not found" });
  if (existing.isActive) {
    return res.status(400).json({ message: "Cannot delete the active academic year. Activate another year first." });
  }

  const [row] = await db
    .delete(academicYears)
    .where(and(eq(academicYears.id, academicYearId), eq(academicYears.schoolId, schoolId)))
    .returning();

  if (!row) return res.status(404).json({ message: "Academic year not found" });
  return res.json({ message: "Deleted" });
});

// ============ Dashboard (Role-aware, real metrics) ============

router.get("/dashboard", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  const user = req.user!;
  const schoolId = user.schoolId ?? null;
  if (!schoolId) return res.status(400).json({ message: "User is not linked to a school" });

  if (!validateTenantAccess(schoolId, user.schoolId!)) {
    return res.status(403).json({ message: "Cross-tenant access denied" });
  }

  const [activeYear] = await db
    .select()
    .from(academicYears)
    .where(and(eq(academicYears.schoolId, schoolId), eq(academicYears.isActive, true)))
    .limit(1);

  const hasActiveYear = !!activeYear;

  const pendingAdmissionsRow = (
    await db
      .select({ count: sql<number>`count(*)` })
      .from(admissions)
      .where(and(eq(admissions.schoolId, schoolId), eq(admissions.status, "submitted")))
  )[0];
  const pendingAdmissions = pendingAdmissionsRow?.count ?? 0;

  const employeesCountRow = (
    await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(and(eq(users.schoolId, schoolId), eq(users.role, "employee")))
  )[0];
  const employeesCount = employeesCountRow?.count ?? 0;

  const studentsCountRow = hasActiveYear
    ? (
        await db
          .select({ count: sql<number>`count(*)` })
          .from(studentEnrollments)
          .where(
            and(
              eq(studentEnrollments.schoolId, schoolId),
              eq(studentEnrollments.academicYearId, activeYear.id),
              eq(studentEnrollments.status, "active")
            )
          )
      )[0]
    : { count: 0 };
  const studentsCount = studentsCountRow?.count ?? 0;

  const totalCollectedRow = (
    await db
      .select({ total: sql<number>`sum(amount)` })
      .from(smsPayments)
      .where(eq(smsPayments.schoolId, schoolId))
  )[0];
  const totalCollected = totalCollectedRow?.total ?? 0;

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

  const totalExpensesRow = (
    await db.select({ sum: sql<number>`coalesce(sum(amount), 0)` }).from(smsExpenses).where(eq(smsExpenses.schoolId, schoolId))
  )[0];
  const totalExpenses = totalExpensesRow?.sum ?? 0;
  const examsCountRow = hasActiveYear
    ? (await db.select({ count: sql<number>`count(*)` }).from(smsExams).where(and(eq(smsExams.schoolId, schoolId), eq(smsExams.academicYearId, activeYear.id))))[0]
    : { count: 0 };
  const examsCount = examsCountRow?.count ?? 0;

  const openInvoicesCount = (
    await db.select({ count: sql<number>`count(*)` }).from(smsInvoices).where(and(eq(smsInvoices.schoolId, schoolId), eq(smsInvoices.status, "open")))
  )[0]?.count ?? 0;

  const draftAttendanceCount = hasActiveYear && activeYear
    ? (await db.select({ count: sql<number>`count(*)` }).from(smsAttendanceSessions).where(and(eq(smsAttendanceSessions.schoolId, schoolId), eq(smsAttendanceSessions.academicYearId, activeYear.id), eq(smsAttendanceSessions.status, "draft"))))[0]?.count ?? 0
    : 0;

  const alerts: Array<{ type: string; message: string; count?: number; actionUrl?: string }> = [];
  if (pendingAdmissions > 0) alerts.push({ type: "pending_approvals", message: `${pendingAdmissions} admission(s) awaiting approval`, count: pendingAdmissions, actionUrl: "/enrollment/admin" });
  if (openInvoicesCount > 0) alerts.push({ type: "unpaid_fees", message: `${openInvoicesCount} unpaid invoice(s)`, count: openInvoicesCount, actionUrl: "/campus/payments" });
  if (draftAttendanceCount > 0) alerts.push({ type: "draft_attendance", message: `${draftAttendanceCount} attendance session(s) need locking`, count: draftAttendanceCount, actionUrl: "/campus/attendance" });
  if (!hasActiveYear) alerts.push({ type: "setup", message: "Set an active academic year in School Setup", actionUrl: "/campus/admin" });

  if (user.role === "admin") {
    return res.json({
      role: "admin",
      setup: { hasActiveAcademicYear: hasActiveYear },
      cards: {
        students: studentsCount,
        employees: employeesCount,
        pendingAdmissions,
        feeCollection: totalCollected || 0,
        totalExpenses,
        examsCount,
        openInvoices: openInvoicesCount,
        draftAttendance: draftAttendanceCount,
      },
      alerts,
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

router.get("/terms", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  const schoolId = requireAdmin(req, res);
  if (!schoolId) return;
  const academicYearId = req.query.academicYearId as string | undefined;

  let rows = await db.select().from(academicTerms).where(eq(academicTerms.schoolId, schoolId));
  if (academicYearId) {
    rows = rows.filter((t) => t.academicYearId === academicYearId);
  }
  return res.json(rows);
});

router.post("/terms", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
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
        isActive: false,
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

router.delete("/terms/:id", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  const schoolId = requireAdmin(req, res);
  if (!schoolId) return;

  const termId = req.params.id;
  if (!termId) return res.status(400).json({ message: "Term ID is required" });

  const [row] = await db
    .delete(academicTerms)
    .where(and(eq(academicTerms.id, termId), eq(academicTerms.schoolId, schoolId)))
    .returning();

  if (!row) return res.status(404).json({ message: "Term not found" });
  return res.json({ message: "Deleted" });
});

const classCreateSchema = z.object({
  name: z.string().min(1),
  sortOrder: z.number().int().optional(),
});

router.get("/classes", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  const schoolId = req.user!.schoolId ?? null;
  if (!schoolId) return res.status(400).json({ message: "User is not linked to a school" });
  if (req.user!.role !== "admin" && req.user!.role !== "employee") {
    return res.status(403).json({ message: "Not allowed" });
  }
  const rows = await db.select().from(schoolClasses).where(eq(schoolClasses.schoolId, schoolId));
  return res.json(rows);
});

router.post("/classes", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
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

router.delete("/classes/:id", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  const schoolId = requireAdmin(req, res);
  if (!schoolId) return;

  const classId = req.params.id;
  if (!classId) return res.status(400).json({ message: "Class ID is required" });

  const [row] = await db
    .delete(schoolClasses)
    .where(and(eq(schoolClasses.id, classId), eq(schoolClasses.schoolId, schoolId)))
    .returning();

  if (!row) return res.status(404).json({ message: "Class not found" });
  return res.json({ message: "Deleted" });
});

const sectionCreateSchema = z.object({
  classId: z.string().min(1),
  name: z.string().min(1),
});

router.get("/sections", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  const schoolId = requireAdmin(req, res);
  if (!schoolId) return;
  const classId = req.query.classId as string | undefined;

  let rows = await db.select().from(classSections).where(eq(classSections.schoolId, schoolId));
  if (classId) {
    rows = rows.filter((s) => s.classId === classId);
  }
  return res.json(rows);
});

router.post("/sections", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
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

router.delete("/sections/:id", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  const schoolId = requireAdmin(req, res);
  if (!schoolId) return;

  const sectionId = req.params.id;
  if (!sectionId) return res.status(400).json({ message: "Section ID is required" });

  const [row] = await db
    .delete(classSections)
    .where(and(eq(classSections.id, sectionId), eq(classSections.schoolId, schoolId)))
    .returning();

  if (!row) return res.status(404).json({ message: "Section not found" });
  return res.json({ message: "Deleted" });
});

const subjectCreateSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
});

router.get("/subjects", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  const schoolId = requireStaff(req, res);
  if (!schoolId) return;
  const rows = await db.select().from(subjects).where(eq(subjects.schoolId, schoolId));
  return res.json(rows);
});

router.post("/subjects", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
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
    console.error("Subject creation error:", e);
    return res.status(500).json({ message: "Failed to create subject" });
  }
});

router.delete("/subjects/:id", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  const schoolId = requireAdmin(req, res);
  if (!schoolId) return;

  const subjectId = req.params.id;
  if (!subjectId) return res.status(400).json({ message: "Subject ID is required" });
  
  try {
    const [row] = await db
      .delete(subjects)
      .where(and(eq(subjects.id, subjectId), eq(subjects.schoolId, schoolId)))
      .returning();

    if (!row) return res.status(404).json({ message: "Subject not found" });
    return res.json({ message: "Deleted" });
  } catch (e) {
    console.error("Subject deletion error:", e);
    return res.status(500).json({ message: "Failed to delete subject" });
  }
});

// ============ Permissions & Sub-Roles ============

router.get("/permissions", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
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

router.get("/sub-roles", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  const schoolId = requireAdmin(req, res);
  if (!schoolId) return;
  
  // Ensure default sub-roles are seeded for this school
  await ensureDefaultSubRolesSeeded(schoolId);
  
  const rows = await db.select().from(employeeSubRoles).where(eq(employeeSubRoles.schoolId, schoolId));
  return res.json(rows);
});

// Public endpoint for user creation sub-role dropdown (admin only)
router.get("/sub-roles/dropdown", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  const schoolId = requireAdmin(req, res);
  if (!schoolId) return;
  
  // Ensure default sub-roles are seeded for this school
  await ensureDefaultSubRolesSeeded(schoolId);
  
  const rows = await db
    .select({
      value: employeeSubRoles.key,
      label: employeeSubRoles.name,
    })
    .from(employeeSubRoles)
    .where(eq(employeeSubRoles.schoolId, schoolId))
    .orderBy(employeeSubRoles.name);
    
  return res.json(rows);
});

router.post("/sub-roles", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
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

router.delete("/sub-roles/:id", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  const schoolId = requireAdmin(req, res);
  if (!schoolId) return;
  const subRoleId = req.params.id;
  if (!subRoleId) return res.status(400).json({ message: "Sub-role ID is required" });
  const [row] = await db
    .delete(employeeSubRoles)
    .where(and(eq(employeeSubRoles.id, subRoleId), eq(employeeSubRoles.schoolId, schoolId)))
    .returning();
  if (!row) return res.status(404).json({ message: "Sub-role not found" });
  await db
    .delete(subRolePermissionGrants)
    .where(and(eq(subRolePermissionGrants.subRoleId, subRoleId), eq(subRolePermissionGrants.schoolId, schoolId)));
  return res.json({ message: "Deleted" });
});

const subRoleGrantSchema = z.object({
  subRoleId: z.string().min(1),
  permissionKeys: z.array(z.string().min(1)),
});

router.get("/sub-role-grants", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
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

router.put("/sub-role-grants", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
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

router.get("/admissions", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  const schoolId = requireAdmin(req, res);
  if (!schoolId) return;
  const rows = await db.select().from(admissions).where(eq(admissions.schoolId, schoolId));
  return res.json(rows);
});

router.post("/admissions", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
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

router.patch("/admissions/:id", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const schoolId = requireAdmin(req, res);
    if (!schoolId) return;

    const admissionId = req.params.id;
    if (!admissionId) return res.status(400).json({ message: "Admission ID is required" });

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
      .where(and(eq(admissions.id, admissionId), eq(admissions.schoolId, schoolId)))
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

router.post("/admissions/:id/approve", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const schoolId = requireAdmin(req, res);
    if (!schoolId) return;

    const admissionId = req.params.id;
    if (!admissionId) return res.status(400).json({ message: "Admission ID is required" });

    const [adm] = await db
      .select()
      .from(admissions)
      .where(and(eq(admissions.id, admissionId), eq(admissions.schoolId, schoolId)))
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

    const studentUser = existingStudentByEmail;
    const studentInserted =
      studentUser ??
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

    if (!studentInserted) {
      return res.status(500).json({ message: "Failed to create student account" });
    }

    const parentUser = existingParentByEmail;
    const parentInserted =
      parentUser ??
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

    if (!parentInserted) {
      return res.status(500).json({ message: "Failed to create parent account" });
    }

    const [existingLink] = await db
      .select()
      .from(parentChildren)
      .where(and(eq(parentChildren.parentId, parentInserted.id), eq(parentChildren.childId, studentInserted.id)))
      .limit(1);
    if (!existingLink) {
      await db.insert(parentChildren).values({ parentId: parentInserted.id, childId: studentInserted.id });
    }

    const [existingEnrollment] = await db
      .select()
      .from(studentEnrollments)
      .where(
        and(
          eq(studentEnrollments.schoolId, schoolId),
          eq(studentEnrollments.academicYearId, adm.academicYearId),
          eq(studentEnrollments.studentId, studentInserted.id)
        )
      )
      .limit(1);
    if (!existingEnrollment) {
      await db.insert(studentEnrollments).values({
        schoolId,
        academicYearId: adm.academicYearId,
        studentId: studentInserted.id,
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
      student: { id: studentInserted.id, email: studentInserted.email, tempPassword: existingStudentByEmail ? undefined : studentPassword },
      parent: { id: parentInserted.id, email: parentInserted.email, tempPassword: existingParentByEmail ? undefined : parentPassword },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to approve admission" });
  }
});

// ============ Exams & Marks ============

const examCreateSchema = z.object({
  academicYearId: z.string().min(1),
  termId: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["exam", "quiz", "test"]).default("exam"),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

router.get("/exams", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  const schoolId = req.user!.schoolId;
  if (!schoolId) return res.status(400).json({ message: "No school linked" });
  const rows = await db.select().from(smsExams).where(eq(smsExams.schoolId, schoolId));
  return res.json(rows);
});

router.post("/exams", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  const schoolId = requireAdmin(req, res);
  if (!schoolId) return;
  const body = examCreateSchema.parse(req.body);
  const [row] = await db.insert(smsExams).values({
    ...body,
    schoolId,
    startDate: body.startDate ? new Date(body.startDate) : null,
    endDate: body.endDate ? new Date(body.endDate) : null,
  }).returning();
  return res.status(201).json(row);
});

router.get("/exams/:id/marks", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  const schoolId = req.user!.schoolId;
  if (!schoolId) return res.status(400).json({ message: "No school linked" });
  const examId = req.params.id;
  if (!examId) return res.status(400).json({ message: "Exam ID is required" });

  const [exam] = await db
    .select({ id: smsExams.id, schoolId: smsExams.schoolId })
    .from(smsExams)
    .where(and(eq(smsExams.id, examId), eq(smsExams.schoolId, schoolId)))
    .limit(1);
  if (!exam) return res.status(404).json({ message: "Exam not found" });

  const rows = await db
    .select({
      id: smsExamMarks.id,
      examId: smsExamMarks.examId,
      studentId: smsExamMarks.studentId,
      subjectId: smsExamMarks.subjectId,
      marksObtained: smsExamMarks.marksObtained,
      totalMarks: smsExamMarks.totalMarks,
      remarks: smsExamMarks.remarks,
      gradedBy: smsExamMarks.gradedBy,
      createdAt: smsExamMarks.createdAt,
      updatedAt: smsExamMarks.updatedAt,
      student: { id: users.id, name: users.name, studentId: users.studentId, email: users.email },
      subject: { id: subjects.id, name: subjects.name, code: subjects.code },
    })
    .from(smsExamMarks)
    .leftJoin(users, eq(users.id, smsExamMarks.studentId))
    .leftJoin(subjects, eq(subjects.id, smsExamMarks.subjectId))
    .where(eq(smsExamMarks.examId, examId))
    .orderBy(desc(smsExamMarks.updatedAt));

  return res.json(rows);
});

router.post("/exams/:id/marks", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  const user = req.user!;
  if (user.role !== "admin" && user.role !== "employee") return res.status(403).json({ message: "Forbidden" });
  const examId = req.params.id;
  if (!examId) return res.status(400).json({ message: "Exam ID is required" });
  const schoolId = user.schoolId ?? null;
  if (!schoolId) return res.status(400).json({ message: "User is not linked to a school" });

  const [exam] = await db
    .select({ id: smsExams.id, schoolId: smsExams.schoolId, status: smsExams.status })
    .from(smsExams)
    .where(and(eq(smsExams.id, examId), eq(smsExams.schoolId, schoolId)))
    .limit(1);
  if (!exam) return res.status(404).json({ message: "Exam not found" });
  if (exam.status === "published") {
    return res.status(403).json({ message: "Grades are locked. This exam has been published and cannot be edited." });
  }

  const body = z.array(z.object({
    studentId: z.string().min(1),
    subjectId: z.string().min(1),
    marksObtained: z.number().min(0).max(10000).optional(),
    totalMarks: z.number().min(1).max(10000),
    remarks: z.string().max(500).optional(),
  })).parse(req.body);

  for (const m of body) {
    const obtained = m.marksObtained ?? 0;
    if (obtained > m.totalMarks) {
      return res.status(400).json({ message: `Marks obtained (${obtained}) cannot exceed total marks (${m.totalMarks})` });
    }
    if (obtained < 0) {
      return res.status(400).json({ message: "Marks obtained cannot be negative" });
    }
  }

  const results = await Promise.all(body.map(async (mark) => {
    // Prevent cross-tenant subject usage
    const [subj] = await db
      .select({ id: subjects.id })
      .from(subjects)
      .where(and(eq(subjects.id, mark.subjectId), eq(subjects.schoolId, schoolId)))
      .limit(1);
    if (!subj) throw new Error("Subject not found");

    // Prevent cross-tenant student usage
    const [stu] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, mark.studentId), eq(users.schoolId, schoolId)))
      .limit(1);
    if (!stu) throw new Error("Student not found");

    const [existing] = await db
      .select({ id: smsExamMarks.id })
      .from(smsExamMarks)
      .where(and(
        eq(smsExamMarks.examId, examId),
        eq(smsExamMarks.studentId, mark.studentId),
        eq(smsExamMarks.subjectId, mark.subjectId)
      ))
      .limit(1);

    const saved = existing
      ? await db
          .update(smsExamMarks)
          .set({
            marksObtained: mark.marksObtained,
            totalMarks: mark.totalMarks,
            remarks: mark.remarks,
            gradedBy: user.id,
            updatedAt: new Date(),
          })
          .where(eq(smsExamMarks.id, existing.id))
          .returning()
      : await db
          .insert(smsExamMarks)
          .values({
            examId,
            studentId: mark.studentId,
            subjectId: mark.subjectId,
            marksObtained: mark.marksObtained,
            totalMarks: mark.totalMarks,
            remarks: mark.remarks,
            gradedBy: user.id,
          })
          .returning();

    return saved[0];
  }));

  await logAudit({
    action: "grade_save",
    entityType: "exam_marks",
    entityId: examId,
    actorId: user.id,
    schoolId,
    meta: { examId, count: body.length },
  });

  return res.json(results);
});

router.post("/subjects/seed-samples", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const schoolId = requireAdmin(req, res);
    if (!schoolId) return;

    const samples = [
      { name: "Mathematics", code: "MATH" },
      { name: "English", code: "ENG" },
      { name: "Science", code: "SCI" },
      { name: "Social Studies", code: "SOC" },
      { name: "Computer Studies", code: "ICT" },
    ];

    const out: any[] = [];
    for (const s of samples) {
      const [existing] = await db
        .select({ id: subjects.id })
        .from(subjects)
        .where(and(eq(subjects.schoolId, schoolId), eq(subjects.name, s.name)))
        .limit(1);
      if (existing) continue;

      const [row] = await db
        .insert(subjects)
        .values({ schoolId, name: s.name, code: s.code })
        .returning();
      if (row) out.push(row);
    }

    return res.json({ createdCount: out.length, created: out });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to seed sample subjects" });
  }
});

// ============ Enhanced Exam Access Control System ============

// Get exams with role-based access control
router.get("/exams/enhanced", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const schoolId = user.schoolId!;
    
    if (!schoolId) {
      return res.status(400).json({ message: "User is not linked to a school" });
    }
    
    const academicYearId = typeof req.query.academicYearId === "string" ? req.query.academicYearId : undefined;
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const type = typeof req.query.type === "string" ? req.query.type : undefined;

    const conditions = [eq(smsExams.schoolId, schoolId)];
    if (academicYearId) conditions.push(eq(smsExams.academicYearId, academicYearId));
    if (status) conditions.push(eq(smsExams.status, status));
    if (type) conditions.push(eq(smsExams.type, type));

    const query = db
      .select({
        exam: {
          id: smsExams.id,
          name: smsExams.name,
          type: smsExams.type,
          startDate: smsExams.startDate,
          endDate: smsExams.endDate,
          status: smsExams.status,
          createdAt: smsExams.createdAt,
        },
        academicYear: {
          id: academicYears.id,
          name: academicYears.name,
        },
        term: {
          id: academicTerms.id,
          name: academicTerms.name,
        },
      })
      .from(smsExams)
      .leftJoin(academicYears, eq(academicYears.id, smsExams.academicYearId))
      .leftJoin(academicTerms, eq(academicTerms.id, smsExams.termId))
      .where(and(...conditions));
    
    const exams = await query.orderBy(smsExams.startDate).limit(50);
    
    return res.json(exams);
  } catch (error) {
    console.error("Get enhanced exams error:", error);
    return res.status(500).json({ message: "Failed to get exams" });
  }
});

// Get exam with detailed information and access control
router.get("/exams/:examId/detailed", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const schoolId = user.schoolId!;
    
    if (!schoolId) {
      return res.status(400).json({ message: "User is not linked to a school" });
    }
    
    const examId = req.params.examId;
    if (!examId) {
      return res.status(400).json({ message: "Exam ID is required" });
    }
    
    // Get exam with full details
    const [exam] = await db
      .select({
        exam: {
          id: smsExams.id,
          name: smsExams.name,
          type: smsExams.type,
          startDate: smsExams.startDate,
          endDate: smsExams.endDate,
          status: smsExams.status,
          createdAt: smsExams.createdAt,
          updatedAt: smsExams.updatedAt,
        },
        academicYear: {
          id: academicYears.id,
          name: academicYears.name,
        },
        term: {
          id: academicTerms.id,
          name: academicTerms.name,
        },
      })
      .from(smsExams)
      .leftJoin(academicYears, eq(academicYears.id, smsExams.academicYearId))
      .leftJoin(academicTerms, eq(academicTerms.id, smsExams.termId))
      .where(and(
        eq(smsExams.id, examId),
        eq(smsExams.schoolId, schoolId)
      ))
      .limit(1);
    
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }
    
    // Access control is enforced by school scoping; finer-grained class scoping requires schema support.
    
    // Get exam marks with student details
    const marks = await db
      .select({
        mark: {
          id: smsExamMarks.id,
          marksObtained: smsExamMarks.marksObtained,
          totalMarks: smsExamMarks.totalMarks,
          percentage: sql<number>`CASE WHEN ${smsExamMarks.totalMarks} > 0 THEN (${smsExamMarks.marksObtained}::float / ${smsExamMarks.totalMarks}::float * 100) ELSE 0 END`,
          remarks: smsExamMarks.remarks,
          createdAt: smsExamMarks.createdAt,
          updatedAt: smsExamMarks.updatedAt,
        },
        student: {
          id: users.id,
          name: users.name,
          studentId: users.studentId,
          email: users.email,
        },
        subject: {
          id: subjects.id,
          name: subjects.name,
          code: subjects.code,
        },
        gradedBy: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(smsExamMarks)
      .innerJoin(smsExams, eq(smsExams.id, smsExamMarks.examId))
      .leftJoin(users, eq(users.id, smsExamMarks.studentId))
      .leftJoin(subjects, eq(subjects.id, smsExamMarks.subjectId))
      .leftJoin(users, eq(users.id, smsExamMarks.gradedBy))
      .where(and(
        eq(smsExamMarks.examId, examId),
        eq(smsExams.schoolId, schoolId)
      ))
      .orderBy(users.name);
    
    // Calculate exam statistics
    const statistics = {
      totalStudents: marks.length,
      averageMarks: marks.length > 0 
        ? (marks.reduce((sum, m) => sum + (m.mark.percentage || 0), 0) / marks.length).toFixed(2)
        : '0.00',
      highestMarks: marks.length > 0 
        ? Math.max(...marks.map(m => m.mark.percentage || 0))
        : 0,
      lowestMarks: marks.length > 0 
        ? Math.min(...marks.map(m => m.mark.percentage || 0))
        : 0,
      passRate: marks.length > 0 
        ? ((marks.filter(m => (m.mark.percentage || 0) >= 50).length / marks.length) * 100).toFixed(1)
        : '0.0',
    };
    
    return res.json({
      exam,
      marks,
      statistics,
    });
  } catch (error) {
    console.error("Get detailed exam error:", error);
    return res.status(500).json({ message: "Failed to get exam details" });
  }
});

// Create exam with enhanced validation
router.post("/exams/enhanced", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const schoolId = requireAdmin(req, res);
    if (!schoolId) return;
    
    const examCreateSchema = z.object({
      name: z.string().min(1),
      type: z.enum(["exam", "quiz", "test"]).default("exam"),
      academicYearId: z.string().min(1),
      termId: z.string().min(1),
      startDate: z.string().datetime(),
      endDate: z.string().datetime(),
      status: z.enum(["scheduled", "ongoing", "completed", "published"]).default("scheduled"),
    });
    
    const body = examCreateSchema.parse(req.body);
    
    // Verify academic year exists and belongs to school
    const [academicYear] = await db
      .select()
      .from(academicYears)
      .where(and(
        eq(academicYears.id, body.academicYearId),
        eq(academicYears.schoolId, schoolId)
      ))
      .limit(1);
    
    if (!academicYear) {
      return res.status(400).json({ message: "Academic year not found" });
    }
    
    // Verify term exists and belongs to academic year
    const [term] = await db
      .select()
      .from(academicTerms)
      .where(and(
        eq(academicTerms.id, body.termId),
        eq(academicTerms.academicYearId, body.academicYearId)
      ))
      .limit(1);
    
    if (!term) {
      return res.status(400).json({ message: "Academic term not found" });
    }
    
    // Create exam
    const [exam] = await db
      .insert(smsExams)
      .values({
        schoolId,
        academicYearId: body.academicYearId,
        termId: body.termId,
        name: body.name,
        type: body.type,
        status: body.status,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
      })
      .returning();

    if (!exam) {
      return res.status(500).json({ message: "Failed to create exam" });
    }
    
    return res.status(201).json({
      message: "Exam created successfully",
      exam: {
        id: exam.id,
        name: exam.name,
        type: exam.type,
        status: exam.status,
        academicYear: {
          id: academicYear.id,
          name: academicYear.name,
        },
        term: {
          id: term.id,
          name: term.name,
        },
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", errors: error.errors });
    }
    console.error("Create enhanced exam error:", error);
    return res.status(500).json({ message: "Failed to create exam" });
  }
});

// Get student's exam results and scores
router.get("/exams/student/:studentId/results", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const schoolId = user.schoolId!;
    
    if (!schoolId) {
      return res.status(400).json({ message: "User is not linked to a school" });
    }
    
    const studentId = req.params.studentId;
    if (!studentId) {
      return res.status(400).json({ message: "Student ID is required" });
    }
    
    // Check authorization
    if (user.role === "student" && user.id !== studentId) {
      return res.status(403).json({ message: "Not authorized to view this student's results" });
    }
    
    if (user.role === "parent") {
      // Check if student is linked to this parent
      const [parentChildLink] = await db
        .select()
        .from(parentChildren)
        .where(and(
          eq(parentChildren.parentId, user.id),
          eq(parentChildren.childId, studentId)
        ))
        .limit(1);
      
      if (!parentChildLink) {
        return res.status(403).json({ message: "Not authorized to view this student's results" });
      }
    }
    
    // Get student's exam results with full details
    const results = await db
      .select({
        exam: {
          id: smsExams.id,
          name: smsExams.name,
          type: smsExams.type,
          startDate: smsExams.startDate,
          endDate: smsExams.endDate,
          status: smsExams.status,
        },
        mark: {
          id: smsExamMarks.id,
          marksObtained: smsExamMarks.marksObtained,
          totalMarks: smsExamMarks.totalMarks,
          percentage: sql<number>`CASE WHEN ${smsExamMarks.totalMarks} > 0 THEN (${smsExamMarks.marksObtained}::float / ${smsExamMarks.totalMarks}::float * 100) ELSE 0 END`,
          grade: sql<string>`CASE 
            WHEN ${smsExamMarks.totalMarks} > 0 THEN
              CASE 
                WHEN (${smsExamMarks.marksObtained}::float / ${smsExamMarks.totalMarks}::float * 100) >= 80 THEN 'A'
                WHEN (${smsExamMarks.marksObtained}::float / ${smsExamMarks.totalMarks}::float * 100) >= 70 THEN 'B'
                WHEN (${smsExamMarks.marksObtained}::float / ${smsExamMarks.totalMarks}::float * 100) >= 60 THEN 'C'
                WHEN (${smsExamMarks.marksObtained}::float / ${smsExamMarks.totalMarks}::float * 100) >= 50 THEN 'D'
                ELSE 'F'
              END
            ELSE 'N/A'
          END`,
          remarks: smsExamMarks.remarks,
          createdAt: smsExamMarks.createdAt,
        },
        subject: {
          id: subjects.id,
          name: subjects.name,
          code: subjects.code,
        },
        academicYear: {
          id: academicYears.id,
          name: academicYears.name,
        },
        gradedBy: {
          id: users.id,
          name: users.name,
        },
      })
      .from(smsExamMarks)
      .innerJoin(smsExams, eq(smsExams.id, smsExamMarks.examId))
      .leftJoin(subjects, eq(subjects.id, smsExamMarks.subjectId))
      .leftJoin(academicYears, eq(academicYears.id, smsExams.academicYearId))
      .leftJoin(users, eq(users.id, smsExamMarks.gradedBy))
      .where(and(
        eq(smsExamMarks.studentId, studentId),
        eq(smsExams.schoolId, schoolId)
      ))
      .orderBy(smsExams.startDate);
    
    // Calculate overall academic performance
    const statistics = {
      totalExams: results.length,
      averagePercentage: results.length > 0 
        ? (results.reduce((sum, r) => sum + (r.mark.percentage || 0), 0) / results.length).toFixed(2)
        : '0.00',
      highestPercentage: results.length > 0 
        ? Math.max(...results.map(r => r.mark.percentage || 0))
        : 0,
      lowestPercentage: results.length > 0 
        ? Math.min(...results.map(r => r.mark.percentage || 0))
        : 0,
      gradeDistribution: results.reduce<Record<string, number>>((dist, r) => {
        const grade = r.mark.grade || 'N/A';
        dist[grade] = (dist[grade] || 0) + 1;
        return dist;
      }, {}),
    };
    
    return res.json({
      student: {
        id: studentId,
      },
      results,
      statistics,
    });
  } catch (error) {
    console.error("Get student exam results error:", error);
    return res.status(500).json({ message: "Failed to get student exam results" });
  }
});

const expenseCreateSchema = z.object({
  category: z.string().min(1),
  title: z.string().min(1),
  amount: z.number().min(1),
  date: z.string().datetime().optional(),
  notes: z.string().optional(),
});

router.get("/expenses", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  const schoolId = req.user!.schoolId;
  if (!schoolId) return res.status(400).json({ message: "No school linked" });
  const rows = await db.select().from(smsExpenses).where(eq(smsExpenses.schoolId, schoolId)).orderBy(desc(smsExpenses.date));
  return res.json(rows);
});

router.post("/expenses", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  const schoolId = requireAdmin(req, res);
  if (!schoolId) return;
  const body = expenseCreateSchema.parse(req.body);
  const [row] = await db.insert(smsExpenses).values({
    ...body,
    schoolId,
    recordedBy: req.user!.id,
    date: body.date ? new Date(body.date) : new Date(),
  }).returning();
  return res.status(201).json(row);
});

// ============ Promotions ============

const promoteStudentsSchema = z.object({
  currentAcademicYearId: z.string().min(1),
  nextAcademicYearId: z.string().min(1),
  currentClassId: z.string().min(1),
  nextClassId: z.string().min(1),
  studentIds: z.array(z.string().min(1)),
});

router.post("/students/promote", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  const schoolId = requireAdmin(req, res);
  if (!schoolId) return;
  const body = promoteStudentsSchema.parse(req.body);

  const results = [];
  for (const studentId of body.studentIds) {
    // 1. Mark current enrollment as promoted
    await db.update(studentEnrollments)
      .set({ status: "promoted", updatedAt: new Date() })
      .where(and(
        eq(studentEnrollments.studentId, studentId),
        eq(studentEnrollments.academicYearId, body.currentAcademicYearId),
        eq(studentEnrollments.schoolId, schoolId)
      ));

    // 2. Create new enrollment for next year
    const [newEnrollment] = await db.insert(studentEnrollments).values({
      schoolId,
      academicYearId: body.nextAcademicYearId,
      studentId,
      classId: body.nextClassId,
      status: "active",
    }).returning();
    
    results.push(newEnrollment);
  }

  await logAudit({
    action: "promotion_decision",
    entityType: "enrollment",
    actorId: req.user!.id,
    schoolId,
    meta: { studentCount: results.length, currentYear: body.currentAcademicYearId, nextYear: body.nextAcademicYearId },
  });

  return res.json({ message: `Successfully promoted ${results.length} students`, enrollments: results });
});

// ============ Student Enrollments ============

router.post("/bulk-enrollments", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  const schoolId = req.user!.schoolId ?? null;
  if (!schoolId) return res.status(400).json({ message: "User is not linked to a school" });
  if (req.user!.role !== "admin") {
    return res.status(403).json({ message: "Not allowed" });
  }

  try {
    const { enrollments } = req.body;
    if (!Array.isArray(enrollments)) {
      return res.status(400).json({ message: "Enrollments must be an array" });
    }

    const results = [];
    for (const enrollment of enrollments) {
      const [newEnrollment] = await db.insert(studentEnrollments).values({
        schoolId,
        academicYearId: enrollment.academicYearId,
        studentId: enrollment.studentId,
        classId: enrollment.classId,
        status: enrollment.status || 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      results.push(newEnrollment);
    }
    
    return res.json({ 
      message: `Successfully created ${results.length} enrollments`, 
      enrollments: results 
    });
  } catch (error) {
    console.error("Bulk enrollment error:", error);
    return res.status(500).json({ message: "Failed to create enrollments" });
  }
});

// ============ Staff Attendance ============

router.get("/staff-attendance/sessions", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  const schoolId = requireAdmin(req, res);
  if (!schoolId) return;
  const rows = await db.select().from(smsStaffAttendanceSessions).where(eq(smsStaffAttendanceSessions.schoolId, schoolId)).orderBy(desc(smsStaffAttendanceSessions.date));
  return res.json(rows);
});

router.post("/staff-attendance/sessions", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  const schoolId = requireAdmin(req, res);
  if (!schoolId) return;
  const body = z.object({ date: z.string().datetime() }).parse(req.body);
  
  const [row] = await db.insert(smsStaffAttendanceSessions).values({
    schoolId,
    date: new Date(body.date),
    markedBy: req.user!.id,
  }).returning();
  
  return res.status(201).json(row);
});

router.get("/staff-attendance/sessions/:id/entries", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  const schoolId = requireAdmin(req, res);
  if (!schoolId) return;
  const sessionId = req.params.id;
  if (!sessionId) {
    return res.status(400).json({ message: "Session ID is required" });
  }
  const rows = await db
    .select()
    .from(smsStaffAttendanceEntries)
    .where(and(eq(smsStaffAttendanceEntries.sessionId, sessionId), eq(smsStaffAttendanceEntries.schoolId, schoolId)));
  return res.json(rows);
});

router.post("/staff-attendance/sessions/:id/entries", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  const schoolId = requireAdmin(req, res);
  if (!schoolId) return;
  const body = z.array(z.object({
    staffId: z.string().min(1),
    status: z.enum(["present", "absent", "late", "excused"]),
    note: z.string().optional(),
  })).parse(req.body);

  const results = [];
  const sessionId = req.params.id;
  if (!sessionId) {
    return res.status(400).json({ message: "Session ID is required" });
  }
  
  for (const entry of body) {
    const [row] = await db.insert(smsStaffAttendanceEntries).values({
      staffId: entry.staffId,
      status: entry.status,
      note: entry.note || null,
      sessionId: sessionId,
      schoolId,
      markedBy: req.user!.id,
    }).onConflictDoUpdate({
      target: [smsStaffAttendanceEntries.id],
      set: { status: entry.status, note: entry.note, markedAt: new Date(), markedBy: req.user!.id }
    }).returning();
    results.push(row);
  }
  return res.json(results);
});

// ============ Student-School Linkage System ============

// School discovery interface for students
router.get("/schools/discovery", async (req, res) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const openApplicationsOnly = typeof req.query.openApplicationsOnly === "string" ? req.query.openApplicationsOnly : undefined;
    
    const conditions = [] as any[];
    if (search) {
      conditions.push(sql`${schools.name} ILIKE ${'%' + search + '%'}`);
    }

    const schoolsQuery = db
      .select({
        id: schools.id,
        name: schools.name,
        address: schools.address,
        phone: schools.phone,
        email: schools.email,
      })
      .from(schools)
      .where(conditions.length > 0 ? and(...conditions) : sql`TRUE`);
    
    const schoolsList = await schoolsQuery.orderBy(schools.name).limit(50);
    
    // For each school, check if applications are open
    const schoolsWithApplicationStatus = await Promise.all(
      schoolsList.map(async (school) => {
        // Check if school has active academic year and open applications
        const [activeYear] = await db
          .select()
          .from(academicYears)
          .where(and(
            eq(academicYears.schoolId, school.id),
            eq(academicYears.isActive, true)
          ))
          .limit(1);
        
        const hasOpenApplications = !!activeYear;
        
        return {
          ...school,
          hasOpenApplications,
          activeAcademicYear: activeYear ? {
            id: activeYear.id,
            name: activeYear.name,
            startDate: activeYear.startDate,
            endDate: activeYear.endDate,
          } : null,
        };
      })
    );
    
    const filteredSchools = openApplicationsOnly === 'true' 
      ? schoolsWithApplicationStatus.filter(s => s.hasOpenApplications)
      : schoolsWithApplicationStatus;
    
    return res.json(filteredSchools);
  } catch (error) {
    console.error("School discovery error:", error);
    return res.status(500).json({ message: "Failed to discover schools" });
  }
});

// Get application form for a specific school
router.get("/schools/:schoolId/application-form", async (req, res) => {
  try {
    const { schoolId } = req.params;
    
    // Verify school exists
    const [school] = await db
      .select()
      .from(schools)
      .where(eq(schools.id, schoolId))
      .limit(1);
    
    if (!school) {
      return res.status(404).json({ message: "School not found" });
    }
    
    // Get active academic year
    const [activeYear] = await db
      .select()
      .from(academicYears)
      .where(and(eq(academicYears.schoolId, schoolId), eq(academicYears.isActive, true)))
      .limit(1);
    
    if (!activeYear) {
      return res.status(400).json({ message: "School is not currently accepting applications" });
    }
    
    // Get available classes for active year
    const classes = await db
      .select({
        id: schoolClasses.id,
        name: schoolClasses.name,
        sortOrder: schoolClasses.sortOrder,
      })
      .from(schoolClasses)
      .where(eq(schoolClasses.schoolId, schoolId))
      .orderBy(schoolClasses.sortOrder, schoolClasses.name);
    
    // Get sections for each class
    const classesWithSections = await Promise.all(
      classes.map(async (cls) => {
        const sections = await db
          .select({
            id: classSections.id,
            name: classSections.name,
          })
          .from(classSections)
          .where(eq(classSections.classId, cls.id))
          .orderBy(classSections.name);
        
        return {
          ...cls,
          sections,
        };
      })
    );
    
    return res.json({
      school: {
        id: school.id,
        name: school.name,
        address: school.address,
      },
      academicYear: {
        id: activeYear.id,
        name: activeYear.name,
        startDate: activeYear.startDate,
        endDate: activeYear.endDate,
      },
      classes: classesWithSections,
    });
  } catch (error) {
    console.error("Application form error:", error);
    return res.status(500).json({ message: "Failed to get application form" });
  }
});

// Submit student application
router.post("/schools/:schoolId/apply", async (req, res) => {
  try {
    const { schoolId } = req.params;
    
    const applicationSchema = z.object({
      studentFullName: z.string().min(1),
      studentEmail: z.string().email().optional(),
      studentPhone: z.string().optional(),
      desiredStudentId: z.string().optional(),
      parentFullName: z.string().optional(),
      parentEmail: z.string().email().optional(),
      parentPhone: z.string().optional(),
      classId: z.string().min(1),
      sectionId: z.string().optional(),
      notes: z.string().optional(),
    });
    
    const body = applicationSchema.parse(req.body);
    
    // Verify school exists
    const [school] = await db
      .select()
      .from(schools)
      .where(eq(schools.id, schoolId))
      .limit(1);
    
    if (!school) {
      return res.status(404).json({ message: "School not found" });
    }
    
    // Get active academic year
    const [activeYear] = await db
      .select()
      .from(academicYears)
      .where(and(eq(academicYears.schoolId, schoolId), eq(academicYears.isActive, true)))
      .limit(1);
    
    if (!activeYear) {
      return res.status(400).json({ message: "School is not currently accepting applications" });
    }
    
    // Verify class exists and belongs to school
    const [classInfo] = await db
      .select()
      .from(schoolClasses)
      .where(and(eq(schoolClasses.id, body.classId), eq(schoolClasses.schoolId, schoolId)))
      .limit(1);
    
    if (!classInfo) {
      return res.status(400).json({ message: "Invalid class selection" });
    }
    
    // If section provided, verify it exists and belongs to class
    if (body.sectionId) {
      const [section] = await db
        .select()
        .from(classSections)
        .where(and(eq(classSections.id, body.sectionId), eq(classSections.classId, body.classId)))
        .limit(1);
      
      if (!section) {
        return res.status(400).json({ message: "Invalid section selection" });
      }
    }
    
    // Check for duplicate application
    const [existingApplication] = await db
      .select()
      .from(admissions)
      .where(and(
        eq(admissions.schoolId, schoolId),
        eq(admissions.studentEmail, body.studentEmail || ''),
        eq(admissions.status, 'submitted')
      ))
      .limit(1);
    
    if (existingApplication) {
      return res.status(400).json({ message: "Application already submitted" });
    }
    
    // Create application
    const applicationResult = await db
      .insert(admissions)
      .values({
        schoolId,
        academicYearId: activeYear.id,
        classId: body.classId,
        sectionId: body.sectionId || null,
        studentFullName: body.studentFullName,
        studentEmail: body.studentEmail || null,
        studentPhone: body.studentPhone || null,
        desiredStudentId: body.desiredStudentId || null,
        parentFullName: body.parentFullName || null,
        parentEmail: body.parentEmail || null,
        parentPhone: body.parentPhone || null,
        status: 'submitted',
        notes: body.notes || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    const application = applicationResult[0];
    
    if (!application) {
      return res.status(500).json({ message: "Failed to create application" });
    }
    
    return res.status(201).json({
      message: "Application submitted successfully",
      application: {
        id: application.id,
        status: application.status,
        submittedAt: application.createdAt,
        schoolName: school.name,
        className: classInfo.name,
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", errors: error.errors });
    }
    console.error("Application submission error:", error);
    return res.status(500).json({ message: "Failed to submit application" });
  }
});

// Check application status
router.get("/applications/:applicationId/status", requireAuth, async (req: AuthRequest, res) => {
  try {
    const applicationId = req.params.applicationId;
    if (!applicationId) {
      return res.status(400).json({ message: "Application ID is required" });
    }
    
    const [application] = await db
      .select({
        id: admissions.id,
        status: admissions.status,
        studentFullName: admissions.studentFullName,
        createdAt: admissions.createdAt,
        updatedAt: admissions.updatedAt,
        approvedAt: admissions.approvedAt,
        school: {
          id: schools.id,
          name: schools.name,
        },
        class: {
          id: schoolClasses.id,
          name: schoolClasses.name,
        },
        academicYear: {
          id: academicYears.id,
          name: academicYears.name,
        },
      })
      .from(admissions)
      .leftJoin(schools, eq(schools.id, admissions.schoolId))
      .leftJoin(schoolClasses, eq(schoolClasses.id, admissions.classId))
      .leftJoin(academicYears, eq(academicYears.id, admissions.academicYearId))
      .where(eq(admissions.id, applicationId))
      .limit(1);
    
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    const user = req.user!;
    const userSchoolId = user.schoolId ?? null;
    const appSchoolId = (application as any).school?.id ?? null;

    const canStaffRead =
      (user.role === "admin" || user.role === "employee") &&
      !!userSchoolId &&
      !!appSchoolId &&
      userSchoolId === appSchoolId;

    const userEmail = (user.email || "").toLowerCase();
    const canApplicantRead =
      userEmail.length > 0 &&
      (userEmail === String((application as any).studentEmail || "").toLowerCase() ||
        userEmail === String((application as any).parentEmail || "").toLowerCase());

    if (!canStaffRead && !canApplicantRead) {
      return res.status(403).json({ message: "Not authorized" });
    }
    
    return res.json({
      id: application.id,
      status: application.status,
      studentFullName: application.studentFullName,
      submittedAt: application.createdAt,
      updatedAt: application.updatedAt,
      approvedAt: application.approvedAt,
      school: application.school,
      class: application.class,
      academicYear: application.academicYear,
    });
  } catch (error) {
    console.error("Application status check error:", error);
    return res.status(500).json({ message: "Failed to check application status" });
  }
});

// ============ Parent-Driven Student Application System ============

// Get parent's children
router.get("/parent/children", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    
    if (user.role !== "parent") {
      return res.status(403).json({ message: "Only parents can access this endpoint" });
    }
    
    const children = await db
      .select({
        child: {
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          schoolId: users.schoolId,
          studentId: users.studentId,
          profileCompletion: users.profileCompletion,
        },
        link: {
          id: parentChildren.id,
          createdAt: parentChildren.createdAt,
        }
      })
      .from(parentChildren)
      .leftJoin(users, eq(users.id, parentChildren.childId))
      .where(eq(parentChildren.parentId, user.id))
      .orderBy(parentChildren.createdAt);
    
    return res.json(children);
  } catch (error) {
    console.error("Get parent children error:", error);
    return res.status(500).json({ message: "Failed to get children" });
  }
});

// Create child profile (pending student)
router.post("/parent/children", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    
    if (user.role !== "parent") {
      return res.status(403).json({ message: "Only parents can create child profiles" });
    }
    
    const childProfileSchema = z.object({
      name: z.string().min(1),
      email: z.string().email(),
      dateOfBirth: z.string().min(1),
      previousSchool: z.string().optional(),
      desiredClass: z.string().optional(),
      documents: z.array(z.object({
        type: z.string(),
        url: z.string().url().optional(),
        name: z.string(),
      })).optional(),
    });
    
    const body = childProfileSchema.parse(req.body);
    
    // Check if child email already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, body.email))
      .limit(1);
    
    if (existingUser) {
      return res.status(400).json({ message: "Child with this email already exists" });
    }
    
    // Create child user with student role but not linked to school yet
    const hashedPassword = await bcrypt.hash(`TempPassword${Date.now()}`, 10);
    
    const [childUser] = await db
      .insert(users)
      .values({
        email: body.email,
        password: hashedPassword,
        name: body.name,
        role: "student",
        schoolId: null, // Not linked to school yet
        studentId: `STU${Date.now()}`,
        verified: true,
        emailVerifiedAt: new Date(),
        profileCompletion: 30, // Partial profile
        points: 0,
        badges: [],
      })
      .returning();

    if (!childUser) {
      return res.status(500).json({ message: "Failed to create child profile" });
    }
    
    // Link to parent
    await db.insert(parentChildren).values({
      parentId: user.id,
      childId: childUser.id,
    });
    
    // Store additional profile information
    if (body.documents && body.documents.length > 0) {
      // This would be a separate table for child documents
      // For now, we'll store as JSON in a notes field or create a separate table
    }
    
    return res.status(201).json({
      message: "Child profile created successfully",
      child: {
        id: childUser.id,
        name: childUser.name,
        email: childUser.email,
        role: childUser.role,
        status: "pending_application",
        profileCompletion: childUser.profileCompletion,
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", errors: error.errors });
    }
    console.error("Create child profile error:", error);
    return res.status(500).json({ message: "Failed to create child profile" });
  }
});

// Link existing child to parent
router.post("/parent/link-child", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    
    if (user.role !== "parent") {
      return res.status(403).json({ message: "Only parents can link children" });
    }
    
    const linkChildSchema = z.object({
      childEmail: z.string().email(),
    });
    
    const body = linkChildSchema.parse(req.body);
    
    // Find child user
    const [childUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, body.childEmail))
      .limit(1);
    
    if (!childUser) {
      return res.status(404).json({ message: "Child not found" });
    }
    
    if (childUser.role !== "student") {
      return res.status(400).json({ message: "User is not a student" });
    }
    
    // Check if already linked
    const [existingLink] = await db
      .select()
      .from(parentChildren)
      .where(and(
        eq(parentChildren.parentId, user.id),
        eq(parentChildren.childId, childUser.id)
      ))
      .limit(1);
    
    if (existingLink) {
      return res.status(400).json({ message: "Child already linked to this parent" });
    }
    
    // Create link
    await db.insert(parentChildren).values({
      parentId: user.id,
      childId: childUser.id,
    });
    
    return res.status(201).json({
      message: "Child linked successfully",
      child: {
        id: childUser.id,
        name: childUser.name,
        email: childUser.email,
        schoolId: childUser.schoolId,
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", errors: error.errors });
    }
    console.error("Link child error:", error);
    return res.status(500).json({ message: "Failed to link child" });
  }
});

// Submit application for child
router.post("/parent/apply-for-child", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    
    if (user.role !== "parent") {
      return res.status(403).json({ message: "Only parents can submit applications" });
    }
    
    const applicationSchema = z.object({
      childId: z.string().min(1),
      schoolId: z.string().min(1),
      classId: z.string().min(1),
      sectionId: z.string().optional(),
      notes: z.string().optional(),
    });
    
    const body = applicationSchema.parse(req.body);
    
    // Verify child exists and is linked to parent
    const [childLink] = await db
      .select()
      .from(parentChildren)
      .where(and(
        eq(parentChildren.parentId, user.id),
        eq(parentChildren.childId, body.childId)
      ))
      .limit(1);
    
    if (!childLink) {
      return res.status(404).json({ message: "Child not found or not linked to this parent" });
    }
    
    // Verify school exists and is active
    const [school] = await db
      .select()
      .from(schools)
      .where(eq(schools.id, body.schoolId))
      .limit(1);
    
    if (!school) {
      return res.status(404).json({ message: "School not found" });
    }
    
    // Get active academic year
    const [activeYear] = await db
      .select()
      .from(academicYears)
      .where(and(eq(academicYears.schoolId, body.schoolId), eq(academicYears.isActive, true)))
      .limit(1);
    
    if (!activeYear) {
      return res.status(400).json({ message: "School is not currently accepting applications" });
    }
    
    // Verify class exists and belongs to school
    const [classInfo] = await db
      .select()
      .from(schoolClasses)
      .where(and(eq(schoolClasses.id, body.classId), eq(schoolClasses.schoolId, body.schoolId)))
      .limit(1);
    
    if (!classInfo) {
      return res.status(400).json({ message: "Invalid class selection" });
    }
    
    // Get child user details
    const [childUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, body.childId))
      .limit(1);
    
    if (!childUser) {
      return res.status(404).json({ message: "Child user not found" });
    }
    
    // Check for existing application
    const [existingApplication] = await db
      .select()
      .from(admissions)
      .where(and(
        eq(admissions.schoolId, body.schoolId),
        eq(admissions.studentEmail, childUser.email),
        eq(admissions.status, 'submitted')
      ))
      .limit(1);
    
    if (existingApplication) {
      return res.status(400).json({ message: "Application already submitted for this child" });
    }
    
    // Create application
    const [application] = await db
      .insert(admissions)
      .values({
        schoolId: body.schoolId,
        academicYearId: activeYear.id,
        classId: body.classId,
        sectionId: body.sectionId || null,
        studentFullName: childUser.name,
        studentEmail: childUser.email,
        studentPhone: null,
        desiredStudentId: childUser.studentId,
        parentFullName: user.name,
        parentEmail: user.email,
        parentPhone: null,
        status: 'submitted',
        notes: body.notes || null,
        createdBy: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    if (!application) {
      return res.status(500).json({ message: "Failed to submit application" });
    }
    
    return res.status(201).json({
      message: "Application submitted successfully",
      application: {
        id: application.id,
        status: application.status,
        submittedAt: application.createdAt,
        schoolName: school.name,
        className: classInfo.name,
        childName: childUser.name,
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", errors: error.errors });
    }
    console.error("Parent application submission error:", error);
    return res.status(500).json({ message: "Failed to submit application" });
  }
});

// Get parent's applications
router.get("/parent/applications", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    
    if (user.role !== "parent") {
      return res.status(403).json({ message: "Only parents can access this endpoint" });
    }
    
    const applications = await db
      .select({
        application: {
          id: admissions.id,
          status: admissions.status,
          studentFullName: admissions.studentFullName,
          createdAt: admissions.createdAt,
          updatedAt: admissions.updatedAt,
          approvedAt: admissions.approvedAt,
          notes: admissions.notes,
        },
        school: {
          id: schools.id,
          name: schools.name,
        },
        class: {
          id: schoolClasses.id,
          name: schoolClasses.name,
        },
        child: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(admissions)
      .leftJoin(schools, eq(schools.id, admissions.schoolId))
      .leftJoin(schoolClasses, eq(schoolClasses.id, admissions.classId))
      .leftJoin(users, eq(users.email, admissions.studentEmail))
      .where(eq(admissions.parentEmail, user.email))
      .orderBy(admissions.createdAt);
    
    return res.json(applications);
  } catch (error) {
    console.error("Get parent applications error:", error);
    return res.status(500).json({ message: "Failed to get applications" });
  }
});

// ============ Unified Enrollment Management Module ============

// Get enrollment dashboard overview
router.get("/enrollment/overview", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const schoolId = user.schoolId!;
    
    // Check if user has permission to access enrollment module
    if (user.role !== "admin" && user.role !== "employee") {
      return res.status(403).json({ message: "Not authorized to access enrollment module" });
    }
    
    // Get enrollment statistics
    const [studentApplications] = await db
      .select({ count: sql<number>`count(*)` })
      .from(admissions)
      .where(and(
        eq(admissions.schoolId, schoolId),
        eq(admissions.status, 'submitted')
      ));
    
    const [parentApplications] = await db
      .select({ count: sql<number>`count(*)` })
      .from(admissions)
      .where(and(
        eq(admissions.schoolId, schoolId),
        eq(admissions.parentEmail, sql`IS NOT NULL`),
        eq(admissions.status, 'submitted')
      ));
    
    const [employeeApplications] = await db
      .select({ count: sql<number>`count(*)` })
      .from(admissions)
      .where(and(
        eq(admissions.schoolId, schoolId),
        eq(admissions.status, 'submitted'),
        sql`${admissions.parentEmail} IS NULL`
      ));
    
    const [approvedApplications] = await db
      .select({ count: sql<number>`count(*)` })
      .from(admissions)
      .where(and(
        eq(admissions.schoolId, schoolId),
        eq(admissions.status, 'approved')
      ));
    
    const [rejectedApplications] = await db
      .select({ count: sql<number>`count(*)` })
      .from(admissions)
      .where(and(
        eq(admissions.schoolId, schoolId),
        eq(admissions.status, 'rejected')
      ));
    
    const [waitlistedApplications] = await db
      .select({ count: sql<number>`count(*)` })
      .from(admissions)
      .where(and(
        eq(admissions.schoolId, schoolId),
        eq(admissions.status, 'waitlisted')
      ));
    
    // Get class capacity information
    const classCapacity = await db
      .select({
        classId: schoolClasses.id,
        className: schoolClasses.name,
        totalCapacity: sql<number>`0`,
        currentEnrollment: sql<number>`COUNT(${studentEnrollments.id})`,
        availableSeats: sql<number>`0`,
      })
      .from(schoolClasses)
      .leftJoin(
        studentEnrollments,
        and(
          eq(studentEnrollments.classId, schoolClasses.id),
          eq(studentEnrollments.status, 'active')
        )
      )
      .where(eq(schoolClasses.schoolId, schoolId))
      .groupBy(schoolClasses.id, schoolClasses.name);
    
    return res.json({
      overview: {
        studentApplications: studentApplications?.count || 0,
        parentApplications: parentApplications?.count || 0,
        employeeApplications: employeeApplications?.count || 0,
        approvedApplications: approvedApplications?.count || 0,
        rejectedApplications: rejectedApplications?.count || 0,
        waitlistedApplications: waitlistedApplications?.count || 0,
      },
      classCapacity: classCapacity,
    });
  } catch (error) {
    console.error("Enrollment overview error:", error);
    return res.status(500).json({ message: "Failed to get enrollment overview" });
  }
});

// Get student applications queue
router.get("/enrollment/student-applications", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const schoolId = user.schoolId!;
    
    if (user.role !== "admin" && user.role !== "employee") {
      return res.status(403).json({ message: "Not authorized to access enrollment module" });
    }
    
    const academicYear = typeof req.query.academicYear === "string" ? req.query.academicYear : undefined;
    const classId = typeof req.query.classId === "string" ? req.query.classId : undefined;
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const dateSubmitted = typeof req.query.dateSubmitted === "string" ? req.query.dateSubmitted : undefined;

    const conditions = [
      eq(admissions.schoolId, schoolId),
      sql`${admissions.parentEmail} IS NULL`,
      eq(admissions.status, status ?? "submitted"),
    ];
    if (academicYear) {
      conditions.push(eq(academicYears.id, academicYear));
    }
    if (classId) {
      conditions.push(eq(schoolClasses.id, classId));
    }
    if (dateSubmitted) {
      conditions.push(sql`DATE(${admissions.createdAt})::date = ${dateSubmitted}`);
    }
    
    const query = db
      .select({
        application: {
          id: admissions.id,
          status: admissions.status,
          studentFullName: admissions.studentFullName,
          studentEmail: admissions.studentEmail,
          studentPhone: admissions.studentPhone,
          createdAt: admissions.createdAt,
          updatedAt: admissions.updatedAt,
          notes: admissions.notes,
        },
        school: {
          id: schools.id,
          name: schools.name,
        },
        class: {
          id: schoolClasses.id,
          name: schoolClasses.name,
        },
        academicYear: {
          id: academicYears.id,
          name: academicYears.name,
        },
      })
      .from(admissions)
      .leftJoin(schools, eq(schools.id, admissions.schoolId))
      .leftJoin(schoolClasses, eq(schoolClasses.id, admissions.classId))
      .leftJoin(academicYears, eq(academicYears.id, admissions.academicYearId))
      .where(and(...conditions));
    
    const applications = await query.orderBy(admissions.createdAt).limit(50);
    
    return res.json(applications);
  } catch (error) {
    console.error("Student applications error:", error);
    return res.status(500).json({ message: "Failed to get student applications" });
  }
});

// Get parent-submitted applications queue
router.get("/enrollment/parent-applications", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const schoolId = user.schoolId!;
    
    if (user.role !== "admin" && user.role !== "employee") {
      return res.status(403).json({ message: "Not authorized to access enrollment module" });
    }
    
    const academicYear = typeof req.query.academicYear === "string" ? req.query.academicYear : undefined;
    const classId = typeof req.query.classId === "string" ? req.query.classId : undefined;
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const dateSubmitted = typeof req.query.dateSubmitted === "string" ? req.query.dateSubmitted : undefined;

    const conditions = [
      eq(admissions.schoolId, schoolId),
      sql`${admissions.parentEmail} IS NOT NULL`,
      eq(admissions.status, status ?? "submitted"),
    ];
    if (academicYear) {
      conditions.push(eq(academicYears.id, academicYear));
    }
    if (classId) {
      conditions.push(eq(schoolClasses.id, classId));
    }
    if (dateSubmitted) {
      conditions.push(sql`DATE(${admissions.createdAt})::date = ${dateSubmitted}`);
    }
    
    const query = db
      .select({
        application: {
          id: admissions.id,
          status: admissions.status,
          studentFullName: admissions.studentFullName,
          studentEmail: admissions.studentEmail,
          parentFullName: admissions.parentFullName,
          parentEmail: admissions.parentEmail,
          createdAt: admissions.createdAt,
          updatedAt: admissions.updatedAt,
          notes: admissions.notes,
        },
        school: {
          id: schools.id,
          name: schools.name,
        },
        class: {
          id: schoolClasses.id,
          name: schoolClasses.name,
        },
        academicYear: {
          id: academicYears.id,
          name: academicYears.name,
        },
        parent: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(admissions)
      .leftJoin(schools, eq(schools.id, admissions.schoolId))
      .leftJoin(schoolClasses, eq(schoolClasses.id, admissions.classId))
      .leftJoin(academicYears, eq(academicYears.id, admissions.academicYearId))
      .leftJoin(users, eq(users.email, admissions.parentEmail))
      .where(and(...conditions));
    
    const applications = await query.orderBy(admissions.createdAt).limit(50);
    
    return res.json(applications);
  } catch (error) {
    console.error("Parent applications error:", error);
    return res.status(500).json({ message: "Failed to get parent applications" });
  }
});

// Get employee applications queue
router.get("/enrollment/employee-applications", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const schoolId = user.schoolId!;
    
    if (user.role !== "admin" && user.role !== "employee") {
      return res.status(403).json({ message: "Not authorized to access enrollment module" });
    }
    
    const academicYear = typeof req.query.academicYear === "string" ? req.query.academicYear : undefined;
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const dateSubmitted = typeof req.query.dateSubmitted === "string" ? req.query.dateSubmitted : undefined;
    
    const conditions = [
      eq(admissions.schoolId, schoolId),
      sql`${admissions.parentEmail} IS NULL`,
      eq(admissions.status, status ?? "submitted"),
    ];
    if (academicYear) {
      conditions.push(eq(academicYears.id, academicYear));
    }
    if (dateSubmitted) {
      conditions.push(sql`DATE(${admissions.createdAt})::date = ${dateSubmitted}`);
    }

    const query = db
      .select({
        application: {
          id: admissions.id,
          status: admissions.status,
          studentFullName: admissions.studentFullName,
          parentFullName: admissions.parentFullName,
          parentEmail: admissions.parentEmail,
          createdAt: admissions.createdAt,
          updatedAt: admissions.updatedAt,
          notes: admissions.notes,
        },
        school: {
          id: schools.id,
          name: schools.name,
        },
        academicYear: {
          id: academicYears.id,
          name: academicYears.name,
        },
        applicant: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(admissions)
      .leftJoin(schools, eq(schools.id, admissions.schoolId))
      .leftJoin(academicYears, eq(academicYears.id, admissions.academicYearId))
      .leftJoin(users, eq(users.email, admissions.parentEmail))
      .where(and(...conditions));
    
    const applications = await query.orderBy(admissions.createdAt).limit(50);
    
    return res.json(applications);
  } catch (error) {
    console.error("Employee applications error:", error);
    return res.status(500).json({ message: "Failed to get employee applications" });
  }
});

// Get detailed application view
router.get("/enrollment/applications/:applicationId", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const schoolId = user.schoolId!;
    
    if (user.role !== "admin" && user.role !== "employee") {
      return res.status(403).json({ message: "Not authorized to access enrollment module" });
    }
    
    const applicationId = req.params.applicationId;
    if (!applicationId) {
      return res.status(400).json({ message: "Application ID is required" });
    }
    
    const [application] = await db
      .select({
        application: {
          id: admissions.id,
          status: admissions.status,
          studentFullName: admissions.studentFullName,
          studentEmail: admissions.studentEmail,
          studentPhone: admissions.studentPhone,
          desiredStudentId: admissions.desiredStudentId,
          parentFullName: admissions.parentFullName,
          parentEmail: admissions.parentEmail,
          parentPhone: admissions.parentPhone,
          createdAt: admissions.createdAt,
          updatedAt: admissions.updatedAt,
          approvedAt: admissions.approvedAt,
          notes: admissions.notes,
        },
        school: {
          id: schools.id,
          name: schools.name,
          address: schools.address,
        },
        class: {
          id: schoolClasses.id,
          name: schoolClasses.name,
        },
        section: {
          id: classSections.id,
          name: classSections.name,
        },
        academicYear: {
          id: academicYears.id,
          name: academicYears.name,
          startDate: academicYears.startDate,
          endDate: academicYears.endDate,
        },
        createdBy: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
        approvedBy: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(admissions)
      .leftJoin(schools, eq(schools.id, admissions.schoolId))
      .leftJoin(schoolClasses, eq(schoolClasses.id, admissions.classId))
      .leftJoin(classSections, eq(classSections.id, admissions.sectionId))
      .leftJoin(academicYears, eq(academicYears.id, admissions.academicYearId))
      .leftJoin(users, eq(users.id, admissions.createdBy))
      .leftJoin(users, eq(users.id, admissions.approvedBy))
      .where(and(
        eq(admissions.id, applicationId),
        eq(admissions.schoolId, schoolId)
      ))
      .limit(1);
    
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }
    
    return res.json(application);
  } catch (error) {
    console.error("Application detail error:", error);
    return res.status(500).json({ message: "Failed to get application details" });
  }
});

// Approve application
router.post("/enrollment/applications/:applicationId/approve", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const schoolId = user.schoolId!;
    
    if (user.role !== "admin" && user.role !== "employee") {
      return res.status(403).json({ message: "Not authorized to approve applications" });
    }
    
    const applicationId = req.params.applicationId;
    if (!applicationId) {
      return res.status(400).json({ message: "Application ID is required" });
    }
    const { notes, classId, sectionId, generateStudentId } = req.body;
    
    // Get application and related data
    const [application] = await db
      .select()
      .from(admissions)
      .where(and(
        eq(admissions.id, applicationId),
        eq(admissions.schoolId, schoolId)
      ))
      .limit(1);
    
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }
    
    if (application.status !== 'submitted' && application.status !== 'under_review') {
      return res.status(400).json({ message: "Application cannot be approved in current status" });
    }
    
    // Capacity checks require an explicit capacity field in schema; skipped to avoid incorrect blocking
    
    // Update application status to approved
    const [updatedApplication] = await db
      .update(admissions)
      .set({
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: user.id,
        updatedAt: new Date(),
        notes: notes || application.notes,
      })
      .where(and(
        eq(admissions.id, applicationId),
        eq(admissions.schoolId, schoolId)
      ))
      .returning();

    if (!updatedApplication) {
      return res.status(404).json({ message: "Application not found" });
    }
    
    // If student email exists, create student account and link to school
    if (application.studentEmail && generateStudentId) {
      const [existingStudent] = await db
        .select()
        .from(users)
        .where(eq(users.email, application.studentEmail))
        .limit(1);
      
      if (!existingStudent) {
        // Create student account
        const tempPassword = `Student${Date.now()}`;
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        
        const [newStudent] = await db
          .insert(users)
          .values({
            email: application.studentEmail,
            password: hashedPassword,
            name: application.studentFullName,
            role: "student",
            schoolId: schoolId,
            studentId: generateStudentId || `STU${Date.now()}`,
            verified: true,
            emailVerifiedAt: new Date(),
            profileCompletion: 50,
            points: 0,
            badges: [],
          })
          .returning();

        if (!newStudent) {
          return;
        }
        
        // Create enrollment record
        const [activeYear] = await db
          .select()
          .from(academicYears)
          .where(and(
            eq(academicYears.schoolId, schoolId),
            eq(academicYears.isActive, true)
          ))
          .limit(1);
        
        if (activeYear) {
          await db.insert(studentEnrollments).values({
            schoolId: schoolId,
            academicYearId: activeYear.id,
            classId: classId || application.classId,
            sectionId: sectionId || application.sectionId,
            studentId: newStudent.id,
            status: 'active',
          });
        }
      }
    }
    
    return res.status(200).json({
      message: "Application approved successfully",
      application: updatedApplication,
    });
  } catch (error) {
    console.error("Approve application error:", error);
    return res.status(500).json({ message: "Failed to approve application" });
  }
});

// Reject application
router.post("/enrollment/applications/:applicationId/reject", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const schoolId = user.schoolId!;
    
    if (user.role !== "admin" && user.role !== "employee") {
      return res.status(403).json({ message: "Not authorized to reject applications" });
    }
    
    const applicationId = req.params.applicationId;
    if (!applicationId) {
      return res.status(400).json({ message: "Application ID is required" });
    }
    const { reason } = req.body;
    
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ message: "Rejection reason is required" });
    }
    
    // Update application status to rejected
    const [updatedApplication] = await db
      .update(admissions)
      .set({
        status: 'rejected',
        updatedAt: new Date(),
        notes: reason,
      })
      .where(and(
        eq(admissions.id, applicationId),
        eq(admissions.schoolId, schoolId)
      ))
      .returning();

    if (!updatedApplication) {
      return res.status(404).json({ message: "Application not found" });
    }
    
    return res.status(200).json({
      message: "Application rejected successfully",
      application: updatedApplication,
    });
  } catch (error) {
    console.error("Reject application error:", error);
    return res.status(500).json({ message: "Failed to reject application" });
  }
});

// ============ Employee Application Workflow ============

// Get schools accepting staff applications
router.get("/schools/accepting-staff", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    
    if (user.role !== "employee") {
      return res.status(403).json({ message: "Only employees can access this endpoint" });
    }
    
    // Get schools that are accepting staff applications
    const schoolRows = await db
      .select({
        id: schools.id,
        name: schools.name,
        logoUrl: schools.logoUrl,
        address: schools.address,
        phone: schools.phone,
        email: schools.email,
      })
      .from(schools)
      .orderBy(schools.name);
    
    return res.json(schoolRows);
  } catch (error) {
    console.error("Get accepting schools error:", error);
    return res.status(500).json({ message: "Failed to get schools accepting staff applications" });
  }
});

// Apply to work at a school
router.post("/employee-apply", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    
    if (user.role !== "employee") {
      return res.status(403).json({ message: "Only employees can submit work applications" });
    }
    
    if (user.schoolId) {
      return res.status(400).json({ message: "You are already linked to a school" });
    }
    
    const applicationSchema = z.object({
      schoolId: z.string().min(1),
      desiredSubRole: z.string().min(1),
      experience: z.string().optional(),
      qualifications: z.string().optional(),
      documents: z.array(z.string()).optional(),
      coverLetter: z.string().optional(),
    });
    
    const body = applicationSchema.parse(req.body);
    
    // Validate school exists
    const [school] = await db
      .select()
      .from(schools)
      .where(eq(schools.id, body.schoolId))
      .limit(1);
    
    if (!school) {
      return res.status(404).json({ message: "School not found" });
    }
    
    // Validate sub-role exists for this school
    const [validSubRole] = await db
      .select()
      .from(employeeSubRoles)
      .where(and(
        eq(employeeSubRoles.key, body.desiredSubRole),
        eq(employeeSubRoles.schoolId, body.schoolId)
      ))
      .limit(1);
    
    if (!validSubRole) {
      return res.status(400).json({ message: "Invalid sub-role for this school" });
    }
    
    // Check if employee already has pending application
    const [existingApplication] = await db
      .select()
      .from(enrollmentApplications)
      .where(and(
        eq(enrollmentApplications.type, "employee"),
        eq(enrollmentApplications.applicantUserId, user.id),
        eq(enrollmentApplications.schoolId, body.schoolId),
        eq(enrollmentApplications.status, "submitted")
      ))
      .limit(1);
    
    if (existingApplication) {
      return res.status(409).json({ message: "You already have a pending application to this school" });
    }
    
    // Create employee application record
    const [application] = await db
      .insert(enrollmentApplications)
      .values({
        type: "employee",
        schoolId: body.schoolId,
        applicantUserId: user.id,
        status: "submitted",
        desiredSubRoleId: validSubRole.id,
        payload: {
          desiredSubRoleKey: body.desiredSubRole,
          experience: body.experience ?? null,
          qualifications: body.qualifications ?? null,
          documents: body.documents ?? [],
          coverLetter: body.coverLetter ?? null,
        },
      })
      .returning();

    if (!application) {
      return res.status(500).json({ message: "Failed to create application" });
    }
    
    return res.status(201).json({
      message: "Application submitted successfully",
      application: {
        id: application.id,
        schoolName: school.name,
        desiredSubRole: body.desiredSubRole,
        status: application.status,
        submittedAt: application.createdAt,
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", errors: error.errors });
    }
    console.error("Employee application error:", error);
    return res.status(500).json({ message: "Failed to submit application" });
  }
});

// Get employee's applications
router.get("/employee-applications", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    
    if (user.role !== "employee") {
      return res.status(403).json({ message: "Only employees can access their applications" });
    }
    
    const applications = await db
      .select({
        application: {
          id: enrollmentApplications.id,
          status: enrollmentApplications.status,
          submittedAt: enrollmentApplications.createdAt,
          reviewedAt: enrollmentApplications.reviewedAt,
          payload: enrollmentApplications.payload,
        },
        school: {
          id: schools.id,
          name: schools.name,
          logoUrl: schools.logoUrl,
          address: schools.address,
        },
        subRole: {
          key: employeeSubRoles.key,
          name: employeeSubRoles.name,
        },
      })
      .from(enrollmentApplications)
      .leftJoin(schools, eq(schools.id, enrollmentApplications.schoolId))
      .leftJoin(employeeSubRoles, eq(employeeSubRoles.id, enrollmentApplications.desiredSubRoleId))
      .where(and(
        eq(enrollmentApplications.type, "employee"),
        eq(enrollmentApplications.applicantUserId, user.id)
      ))
      .orderBy(desc(enrollmentApplications.createdAt));
    
    return res.json(applications);
  } catch (error) {
    console.error("Get employee applications error:", error);
    return res.status(500).json({ message: "Failed to get applications" });
  }
});

// ============ Student Achievements System ============

// Get student achievements
router.get("/achievements", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    
    if (user.role !== "student" && user.role !== "parent") {
      return res.status(403).json({ message: "Only students and parents can access achievements" });
    }
    
    const achievements = await db
      .select({
        achievement: {
          id: sql<number>`ROW_NUMBER() OVER (ORDER BY ${smsAchievements.createdAt} DESC)`,
          title: smsAchievements.title,
          description: smsAchievements.description,
          type: smsAchievements.type,
          points: smsAchievements.points,
          icon: smsAchievements.icon,
          createdAt: smsAchievements.createdAt,
        },
        studentAchievement: {
          id: sql<number>`ROW_NUMBER() OVER (PARTITION BY ${smsAchievements.id} ORDER BY ${smsAchievements.createdAt} DESC)`,
          achievedAt: smsStudentAchievements.achievedAt,
          notes: smsStudentAchievements.notes,
        },
      })
      .from(smsAchievements)
      .leftJoin(smsStudentAchievements, eq(smsStudentAchievements.achievementId, smsAchievements.id))
      .where(eq(smsAchievements.schoolId, user.schoolId!))
      .orderBy(desc(smsAchievements.createdAt));
    
    return res.json(achievements);
  } catch (error) {
    console.error("Get achievements error:", error);
    return res.status(500).json({ message: "Failed to get achievements" });
  }
});

// Award achievement to student
router.post("/achievements/award", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    
    if (user.role !== "admin" && user.role !== "employee") {
      return res.status(403).json({ message: "Only admins and authorized employees can award achievements" });
    }
    
    const awardSchema = z.object({
      studentId: z.string().min(1),
      achievementId: z.string().min(1),
      points: z.number().min(1),
      notes: z.string().optional(),
    });
    
    const body = awardSchema.parse(req.body);
    
    // Verify student exists and is in same school
    const [student] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.id, body.studentId),
        eq(users.schoolId, user.schoolId!)
      ))
      .limit(1);
    
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    
    // Verify achievement exists
    const [achievement] = await db
      .select()
      .from(smsAchievements)
      .where(and(
        eq(smsAchievements.id, body.achievementId),
        eq(smsAchievements.schoolId, user.schoolId!)
      ))
      .limit(1);
    
    if (!achievement) {
      return res.status(404).json({ message: "Achievement not found" });
    }
    
    const currentPoints = student.points || 0;
    const achievementPoints = achievement.points ?? 0;

    // Award achievement
    await db.transaction(async (tx) => {
      // Create student achievement record
      await tx.insert(smsStudentAchievements).values({
        studentId: body.studentId,
        achievementId: body.achievementId,
        achievedAt: new Date(),
        notes: body.notes || null,
      });
      
      // Update student points
      await tx.update(users)
        .set({ 
          points: currentPoints + achievementPoints,
          updatedAt: new Date()
        })
        .where(eq(users.id, body.studentId));
      
      // Update student badges
      const currentBadges = (student.badges as string[]) || [];
      const newBadges = [...currentBadges, achievement.title];
      await tx.update(users)
        .set({ 
          badges: newBadges,
          updatedAt: new Date()
        })
        .where(eq(users.id, body.studentId));
    });
    
    return res.json({
      message: "Achievement awarded successfully",
      studentId: body.studentId,
      achievementId: body.achievementId,
      points: achievementPoints,
      newTotalPoints: currentPoints + achievementPoints,
    });
  } catch (error) {
    console.error("Award achievement error:", error);
    return res.status(500).json({ message: "Failed to award achievement" });
  }
});

// Create new achievement
router.post("/achievements", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    
    if (user.role !== "admin" && user.role !== "employee") {
      return res.status(403).json({ message: "Only admins and authorized employees can create achievements" });
    }
    
    const achievementSchema = z.object({
      title: z.string().min(1),
      description: z.string().min(1),
      type: z.enum(["academic", "sports", "arts", "leadership", "attendance", "community", "milestone"]),
      points: z.number().min(1),
      icon: z.string().optional(),
    });
    
    const body = achievementSchema.parse(req.body);
    
    const [achievement] = await db
      .insert(smsAchievements)
      .values({
        schoolId: user.schoolId!,
        title: body.title,
        description: body.description,
        type: body.type,
        points: body.points,
        icon: body.icon || null,
      })
      .returning();
    
    return res.status(201).json({
      message: "Achievement created successfully",
      achievement,
    });
  } catch (error) {
    console.error("Create achievement error:", error);
    return res.status(500).json({ message: "Failed to create achievement" });
  }
});

// Get available achievements (for awarding)
router.get("/achievements/available", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    
    if (user.role !== "admin" && user.role !== "employee") {
      return res.status(403).json({ message: "Only admins and authorized employees can view available achievements" });
    }
    
    const achievements = await db
      .select()
      .from(smsAchievements)
      .where(eq(smsAchievements.schoolId, user.schoolId!))
      .orderBy(smsAchievements.title);
    
    return res.json(achievements);
  } catch (error) {
    console.error("Get available achievements error:", error);
    return res.status(500).json({ message: "Failed to get available achievements" });
  }
});

// Get student achievement statistics
router.get("/achievements/stats/:studentId", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    
    if (user.role !== "admin" && user.role !== "employee" && user.role !== "parent") {
      return res.status(403).json({ message: "Only admins, employees, and parents can view student achievement statistics" });
    }
    
    const studentId = req.params.studentId;
    if (!studentId) {
      return res.status(400).json({ message: "Student ID is required" });
    }
    
    // Verify student exists and is in same school
    const [student] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.id, studentId),
        eq(users.schoolId, user.schoolId!)
      ))
      .limit(1);
    
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    
    // Get student's achievements with statistics
    const achievements = await db
      .select({
        achievement: {
          id: smsAchievements.id,
          title: smsAchievements.title,
          description: smsAchievements.description,
          type: smsAchievements.type,
          points: smsAchievements.points,
          icon: smsAchievements.icon,
          createdAt: smsAchievements.createdAt,
        },
        studentAchievement: {
          achievedAt: smsStudentAchievements.achievedAt,
          notes: smsStudentAchievements.notes,
        },
      })
      .from(smsAchievements)
      .innerJoin(
        smsStudentAchievements,
        and(
          eq(smsStudentAchievements.achievementId, smsAchievements.id),
          eq(smsStudentAchievements.studentId, studentId)
        )
      )
      .where(and(
        eq(smsAchievements.schoolId, user.schoolId!),
        eq(smsStudentAchievements.studentId, studentId)
      ))
      .orderBy(desc(smsStudentAchievements.achievedAt));
    
    // Calculate statistics
    const totalPoints = achievements.reduce((sum, achievement) => sum + (achievement.achievement.points ?? 0), 0);
    const totalAchievements = achievements.length;
    const recentAchievements = achievements.filter(achievement => 
      new Date(achievement.studentAchievement.achievedAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length;
    
    return res.json({
      student: {
        id: student.id,
        name: student.name,
        totalPoints: student.points || 0,
        badges: student.badges || [],
      },
      statistics: {
        totalAchievements,
        totalPoints,
        recentAchievements,
      },
      achievements: achievements.map(achievement => ({
        id: achievement.achievement.id,
        title: achievement.achievement.title,
        type: achievement.achievement.type,
        points: achievement.achievement.points,
        achievedAt: achievement.studentAchievement.achievedAt,
        notes: achievement.studentAchievement.notes,
      })),
    });
  } catch (error) {
    console.error("Get achievement statistics error:", error);
    return res.status(500).json({ message: "Failed to get achievement statistics" });
  }
});

// ============ Progressive Onboarding System ============

// Get user's onboarding status
router.get("/onboarding/status", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    
    const onboardingData = await db
      .select({
        profileCompletion: users.profileCompletion,
        schoolId: users.schoolId,
        role: users.role,
        verified: users.verified,
        emailVerifiedAt: users.emailVerifiedAt,
      })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);
    
    if (!onboardingData.length) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const data = onboardingData[0]!;
    const completionPercentage = data.profileCompletion || 0;
    
    type Step = { id: string; title: string; completed: boolean };
    let steps: Step[] = [];
    let nextStep: string | null = null;
    
    if (user.role === "student") {
      steps = [
        { id: "basic_info", title: "Basic Information", completed: completionPercentage >= 20 },
        { id: "school_linkage", title: "School Linkage", completed: !!data.schoolId },
        { id: "enrollment", title: "Enrollment", completed: completionPercentage >= 60 },
        { id: "first_login", title: "First Login", completed: !!data.emailVerifiedAt },
      ];
      
      if (!data.schoolId) nextStep = "school_linkage";
      else if (completionPercentage < 60) nextStep = "enrollment";
      else nextStep = "complete";
      
    } else if (user.role === "parent") {
      steps = [
        { id: "basic_info", title: "Basic Information", completed: completionPercentage >= 20 },
        { id: "add_children", title: "Add Children", completed: completionPercentage >= 40 },
        { id: "school_applications", title: "School Applications", completed: completionPercentage >= 60 },
        { id: "first_login", title: "First Login", completed: !!data.emailVerifiedAt },
      ];
      
      if (completionPercentage < 40) nextStep = "add_children";
      else if (completionPercentage < 60) nextStep = "school_applications";
      else nextStep = "complete";
      
    } else if (user.role === "employee") {
      steps = [
        { id: "basic_info", title: "Basic Information", completed: completionPercentage >= 20 },
        { id: "school_application", title: "School Application", completed: !!data.schoolId },
        { id: "sub_role_selection", title: "Sub-Role Selection", completed: completionPercentage >= 80 },
        { id: "first_login", title: "First Login", completed: !!data.emailVerifiedAt },
      ];
      
      if (!data.schoolId) nextStep = "school_application";
      else if (completionPercentage < 80) nextStep = "sub_role_selection";
      else nextStep = "complete";
      
    } else if (user.role === "admin") {
      steps = [
        { id: "basic_info", title: "Basic Information", completed: completionPercentage >= 20 },
        { id: "school_setup", title: "School Setup", completed: completionPercentage >= 40 },
        { id: "staff_management", title: "Staff Management", completed: completionPercentage >= 60 },
        { id: "system_configuration", title: "System Configuration", completed: completionPercentage >= 80 },
        { id: "first_login", title: "First Login", completed: !!data.emailVerifiedAt },
      ];
      
      if (completionPercentage < 40) nextStep = "school_setup";
      else if (completionPercentage < 60) nextStep = "staff_management";
      else if (completionPercentage < 80) nextStep = "system_configuration";
      else nextStep = "complete";
    }
    
    return res.json({
      profileCompletion: completionPercentage,
      steps,
      nextStep,
      isCompleted: completionPercentage >= 100,
      schoolLinked: !!data.schoolId,
      verified: data.verified,
    });
  } catch (error) {
    console.error("Get onboarding status error:", error);
    return res.status(500).json({ message: "Failed to get onboarding status" });
  }
});

// Update onboarding progress
router.post("/onboarding/complete-step", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    
    const stepSchema = z.object({
      stepId: z.string().min(1),
      data: z.any().optional(),
    });
    
    const body = stepSchema.parse(req.body);
    
    // Get current user data
    const [currentUser] = await db
      .select({
        profileCompletion: users.profileCompletion,
        schoolId: users.schoolId,
      })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);
    
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }
    
    let newProfileCompletion = currentUser.profileCompletion;
    
    // Calculate new completion percentage based on step
    switch (body.stepId) {
      case "basic_info":
        newProfileCompletion = Math.max(newProfileCompletion, 20);
        break;
        
      case "school_linkage":
        if (user.role === "student" && currentUser.schoolId) {
          newProfileCompletion = Math.max(newProfileCompletion, 40);
        }
        break;
        
      case "add_children":
        if (user.role === "parent") {
          newProfileCompletion = Math.max(newProfileCompletion, 40);
        }
        break;
        
      case "school_applications":
        if (user.role === "parent") {
          newProfileCompletion = Math.max(newProfileCompletion, 60);
        }
        break;
        
      case "school_application":
        if (user.role === "employee" && currentUser.schoolId) {
          newProfileCompletion = Math.max(newProfileCompletion, 60);
        }
        break;
        
      case "sub_role_selection":
        if (user.role === "employee" && currentUser.schoolId) {
          newProfileCompletion = Math.max(newProfileCompletion, 80);
        }
        break;
        
      case "enrollment":
        if (user.role === "student" && currentUser.schoolId) {
          newProfileCompletion = Math.max(newProfileCompletion, 60);
        }
        break;
        
      case "school_setup":
        if (user.role === "admin") {
          newProfileCompletion = Math.max(newProfileCompletion, 40);
        }
        break;
        
      case "staff_management":
        if (user.role === "admin") {
          newProfileCompletion = Math.max(newProfileCompletion, 60);
        }
        break;
        
      case "system_configuration":
        if (user.role === "admin") {
          newProfileCompletion = Math.max(newProfileCompletion, 80);
        }
        break;
    }
    
    // Update user's profile completion
    await db
      .update(users)
      .set({ 
        profileCompletion: newProfileCompletion,
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id));
    
    return res.json({
      message: "Step completed successfully",
      profileCompletion: newProfileCompletion,
      stepId: body.stepId,
    });
  } catch (error) {
    console.error("Complete onboarding step error:", error);
    return res.status(500).json({ message: "Failed to complete onboarding step" });
  }
});

// Reset onboarding (for testing or admin use)
router.post("/onboarding/reset", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    
    // Only admins can reset onboarding
    if (user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can reset onboarding" });
    }
    
    await db
      .update(users)
      .set({ 
        profileCompletion: 0,
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id));
    
    return res.json({
      message: "Onboarding reset successfully",
      profileCompletion: 0,
    });
  } catch (error) {
    console.error("Reset onboarding error:", error);
    return res.status(500).json({ message: "Failed to reset onboarding" });
  }
});

export default router;

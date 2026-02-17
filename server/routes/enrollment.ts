import { Router } from "express";
import { eq, and, desc, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "../db.js";
import {
  users,
  schools,
  studentEnrollments,
  schoolClasses,
  classSections,
  academicYears,
  academicTerms,
  enrollmentApplications,
  pendingStudentProfiles,
  parentChildren,
  employeeSubRoles,
} from "@shared/schema";
import { requireAuth, AuthRequest, requireTenantAccess } from "../middleware/auth.js";

const router = Router();

function isSafeAssetKey(prefix: string, v: string) {
  return typeof v === "string" && v.length > prefix.length && v.startsWith(prefix) && !v.includes("://");
}

const documentsSchema = z
  .array(z.string())
  .max(5)
  .refine((arr) => arr.every((v) => isSafeAssetKey("enrollment_document/", v)), {
    message: "Invalid document key",
  });

// ---------- School discovery (for students/parents/employees) ----------
router.get("/schools", requireAuth, async (req: AuthRequest, res) => {
  try {
    const q = String(req.query.q ?? "").trim();

    const role = req.user?.role;
    const enabledExpr =
      role === "student"
        ? schools.studentApplicationsEnabled
        : role === "parent"
          ? schools.parentApplicationsEnabled
          : role === "employee"
            ? schools.staffApplicationsEnabled
            : sql<boolean>`true`;

    const base = db
      .select({
        id: schools.id,
        name: schools.name,
        address: schools.address,
        logoUrl: schools.logoUrl,
        phone: schools.phone,
        email: schools.email,
        enrollmentOpen: sql<boolean>`(${schools.enrollmentOpen} and ${enabledExpr})`,
      })
      .from(schools);
    const list = q
      ? await base.where(sql`lower(${schools.name}) like ${`%${q.toLowerCase()}%`}`).limit(100)
      : await base.limit(100);
    return res.json(list);
  } catch (e) {
    return res.status(500).json({ message: "Failed to list schools" });
  }
});

// ---------- School-scoped employee sub-roles for enrollment (job applications) ----------
router.get("/schools/:schoolId/sub-roles", requireAuth, async (req: AuthRequest, res) => {
  try {
    const schoolId = String(req.params.schoolId || "");
    if (!schoolId) return res.status(400).json({ message: "School ID is required" });

    const role = req.user?.role;
    const enabledExpr =
      role === "student"
        ? schools.studentApplicationsEnabled
        : role === "parent"
          ? schools.parentApplicationsEnabled
          : role === "employee"
            ? schools.staffApplicationsEnabled
            : sql<boolean>`true`;

    const [school] = await db
      .select({ id: schools.id })
      .from(schools)
      .where(and(eq(schools.id, schoolId), sql<boolean>`(${schools.enrollmentOpen} and ${enabledExpr})`))
      .limit(1);
    if (!school) {
      return res.status(400).json({ message: "School is not currently accepting applications" });
    }

    const rows = await db
      .select({ id: employeeSubRoles.id, key: employeeSubRoles.key, name: employeeSubRoles.name })
      .from(employeeSubRoles)
      .where(eq(employeeSubRoles.schoolId, schoolId))
      .orderBy(employeeSubRoles.name);
    return res.json(rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to load sub-roles" });
  }
});

// ---------- School-scoped classes for enrollment (real data, no placeholders) ----------
router.get("/schools/:schoolId/classes", requireAuth, async (req: AuthRequest, res) => {
  try {
    const schoolId = String(req.params.schoolId || "");
    if (!schoolId) return res.status(400).json({ message: "School ID is required" });

    const role = req.user?.role;
    const enabledExpr =
      role === "student"
        ? schools.studentApplicationsEnabled
        : role === "parent"
          ? schools.parentApplicationsEnabled
          : role === "employee"
            ? schools.staffApplicationsEnabled
            : sql<boolean>`true`;

    const [school] = await db
      .select({ id: schools.id, enrollmentOpen: schools.enrollmentOpen })
      .from(schools)
      .where(and(eq(schools.id, schoolId), sql<boolean>`(${schools.enrollmentOpen} and ${enabledExpr})`))
      .limit(1);
    if (!school) {
      return res.status(400).json({ message: "School is not currently accepting applications" });
    }

    const rows = await db
      .select({ id: schoolClasses.id, name: schoolClasses.name, sortOrder: schoolClasses.sortOrder })
      .from(schoolClasses)
      .where(eq(schoolClasses.schoolId, schoolId))
      .orderBy(schoolClasses.sortOrder, schoolClasses.name);

    return res.json(rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to load classes" });
  }
});

// ---------- Admin: list all applications for school ----------
router.get("/applications", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId!;
    if (req.user!.role !== "admin" && req.user!.role !== "employee") {
      return res.status(403).json({ message: "Not allowed" });
    }
    const list = await db
      .select({
        app: enrollmentApplications,
        applicant: { id: users.id, name: users.name, email: users.email, role: users.role },
        school: { id: schools.id, name: schools.name },
        cls: { id: schoolClasses.id, name: schoolClasses.name },
        subRole: { id: employeeSubRoles.id, key: employeeSubRoles.key, name: employeeSubRoles.name },
      })
      .from(enrollmentApplications)
      .leftJoin(users, eq(users.id, enrollmentApplications.applicantUserId))
      .leftJoin(schools, eq(schools.id, enrollmentApplications.schoolId))
      .leftJoin(schoolClasses, eq(schoolClasses.id, enrollmentApplications.classId))
      .leftJoin(employeeSubRoles, eq(employeeSubRoles.id, enrollmentApplications.desiredSubRoleId))
      .where(eq(enrollmentApplications.schoolId, schoolId))
      .orderBy(desc(enrollmentApplications.createdAt));

    return res.json(
      list.map((r) => {
        const payload = (r.app.payload || {}) as Record<string, unknown>;
        const desiredSubRoleFromPayload = typeof payload.desiredSubRole === "string" ? payload.desiredSubRole : null;
        const customSubRoleName = typeof payload.customSubRoleName === "string" ? payload.customSubRoleName : null;

        const normalizedType =
          r.app.type === "student_self"
            ? "student"
            : r.app.type === "parent_student"
              ? "parent"
              : r.app.type;

        const normalizedStatus = r.app.status === "submitted" ? "under_review" : r.app.status;

        const desiredClass = r.cls?.name ?? null;
        const desiredSubRole =
          r.subRole?.name ??
          (desiredSubRoleFromPayload === "other" ? customSubRoleName : desiredSubRoleFromPayload) ??
          null;

        return {
          ...r.app,
          type: normalizedType,
          status: normalizedStatus,
          applicant: r.applicant ? { id: r.applicant.id, name: r.applicant.name, email: r.applicant.email, role: r.applicant.role } : null,
          school: r.school ? { id: r.school.id, name: r.school.name } : null,
          class: r.cls ? { id: r.cls.id, name: r.cls.name } : null,
          desiredClass,
          desiredSubRole,
        };
      })
    );
  } catch (e) {
    return res.status(500).json({ message: "Failed to list applications" });
  }
});

// ---------- Admin: update application status (approve/reject) ----------
router.patch("/applications/:id", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId!;
    const appId = req.params.id;
    if (!appId) return res.status(400).json({ message: "Application ID is required" });
    const { status, reviewNotes } = req.body as { status?: string; reviewNotes?: string };
    const [app] = await db
      .select()
      .from(enrollmentApplications)
      .where(and(eq(enrollmentApplications.id, appId), eq(enrollmentApplications.schoolId, schoolId)))
      .limit(1);
    if (!app) return res.status(404).json({ message: "Application not found" });
    await db
      .update(enrollmentApplications)
      .set({
        status: status ?? app.status,
        rejectionReason: reviewNotes ?? app.rejectionReason,
        reviewedBy: req.user!.id,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(enrollmentApplications.id, appId));
    if (status === "approved") {
      const [activeYear] = await db.select().from(academicYears).where(and(eq(academicYears.schoolId, schoolId), eq(academicYears.isActive, true))).limit(1);
      const yearId = app.academicYearId ?? activeYear?.id;

      if (app.type === "employee") {
        let subRoleKey: string | null = null;
        let desiredSubRoleId: string | null = app.desiredSubRoleId ?? null;

        if (desiredSubRoleId) {
          const [roleRow] = await db
            .select({ key: employeeSubRoles.key })
            .from(employeeSubRoles)
            .where(and(eq(employeeSubRoles.id, desiredSubRoleId), eq(employeeSubRoles.schoolId, schoolId)))
            .limit(1);
          subRoleKey = roleRow?.key ?? null;
        } else {
          const payload = (app.payload || {}) as Record<string, unknown>;
          const desired = typeof payload.desiredSubRole === "string" ? payload.desiredSubRole : null;
          const customName = typeof payload.customSubRoleName === "string" ? payload.customSubRoleName.trim() : "";

          if (desired === "other" && customName) {
            const generatedKey = customName
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "_")
              .replace(/^_+|_+$/g, "")
              .slice(0, 50);
            const key = generatedKey || `custom_${Date.now().toString(36)}`;

            const [existingSubRole] = await db
              .select({ id: employeeSubRoles.id, key: employeeSubRoles.key })
              .from(employeeSubRoles)
              .where(and(eq(employeeSubRoles.schoolId, schoolId), eq(employeeSubRoles.key, key)))
              .limit(1);

            const subRoleRow =
              existingSubRole ??
              (
                await db
                  .insert(employeeSubRoles)
                  .values({ schoolId, key, name: customName })
                  .returning({ id: employeeSubRoles.id, key: employeeSubRoles.key })
              )[0];

            desiredSubRoleId = subRoleRow?.id ?? null;
            subRoleKey = subRoleRow?.key ?? null;
          }
        }

        await db.update(users).set({ schoolId, subRole: subRoleKey, updatedAt: new Date() }).where(eq(users.id, app.applicantUserId));

        if (desiredSubRoleId && desiredSubRoleId !== app.desiredSubRoleId) {
          await db
            .update(enrollmentApplications)
            .set({ desiredSubRoleId, updatedAt: new Date() })
            .where(eq(enrollmentApplications.id, app.id));
        }
      }
      if (app.type === "student_self" && app.classId && yearId) {
        const [cls] = await db.select().from(schoolClasses).where(and(eq(schoolClasses.id, app.classId), eq(schoolClasses.schoolId, schoolId))).limit(1);
        const [sec] = app.sectionId ? await db.select().from(classSections).where(and(eq(classSections.id, app.sectionId), eq(classSections.schoolId, schoolId))).limit(1) : [null];
        if (cls) {
          await db.update(users).set({ schoolId, grade: cls.name, classSection: sec?.name ?? null, updatedAt: new Date() }).where(eq(users.id, app.applicantUserId));
          await db.insert(studentEnrollments).values({
            schoolId,
            academicYearId: yearId,
            termId: null,
            studentId: app.applicantUserId,
            classId: app.classId,
            sectionId: app.sectionId ?? null,
            status: "active",
          });
        }
      }
      if (app.type === "student_self" && app.classId && !yearId) {
        const [cls] = await db.select().from(schoolClasses).where(and(eq(schoolClasses.id, app.classId), eq(schoolClasses.schoolId, schoolId))).limit(1);
        const [sec] = app.sectionId ? await db.select().from(classSections).where(and(eq(classSections.id, app.sectionId), eq(classSections.schoolId, schoolId))).limit(1) : [null];
        if (cls) {
          await db.update(users).set({ schoolId, grade: cls.name, classSection: sec?.name ?? null, updatedAt: new Date() }).where(eq(users.id, app.applicantUserId));
        } else {
          await db.update(users).set({ schoolId, updatedAt: new Date() }).where(eq(users.id, app.applicantUserId));
        }
      }
      if (app.type === "parent_student" && app.pendingStudentProfileId && app.classId && yearId) {
        const [pending] = await db
          .select()
          .from(pendingStudentProfiles)
          .where(
            and(
              eq(pendingStudentProfiles.id, app.pendingStudentProfileId),
              eq(pendingStudentProfiles.parentId, app.applicantUserId)
            )
          )
          .limit(1);
        if (pending) {
          const [cls] = await db.select().from(schoolClasses).where(and(eq(schoolClasses.id, app.classId), eq(schoolClasses.schoolId, schoolId))).limit(1);
          const [sec] = app.sectionId ? await db.select().from(classSections).where(and(eq(classSections.id, app.sectionId), eq(classSections.schoolId, schoolId))).limit(1) : [null];
          if (cls) {
            const tempPassword = await bcrypt.hash(`Campus@${Date.now().toString(36)}`, 10);
            const [studentUser] = await db.insert(users).values({
              email: `student.${pending.id}@campus.pending`,
              password: tempPassword,
              name: pending.fullName,
              role: "student",
              schoolId,
              grade: cls.name,
              classSection: sec?.name ?? null,
              verified: true,
              emailVerifiedAt: new Date(),
              profileCompletion: 40,
            }).returning();
            if (!studentUser) {
              throw new Error("Failed to create new student user");
            }
            const [newEnrollment] = await db.insert(studentEnrollments).values({
              schoolId,
              academicYearId: yearId,
              termId: null,
              studentId: studentUser.id,
              classId: app.classId,
              sectionId: app.sectionId ?? null,
              status: "active",
            }).returning();
            if (!newEnrollment) {
              throw new Error("Failed to create new enrollment");
            }
            await db.insert(parentChildren).values({ parentId: app.applicantUserId, childId: studentUser.id });
          }
        }
      }
    }
    return res.json({ message: "Updated" });
  } catch (e: unknown) {
    console.error(e);
    return res.status(500).json({ message: "Failed to update application" });
  }
});

// ---------- Admin: enrollment settings (defaults) ----------
router.get("/settings", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== "admin") return res.status(403).json({ message: "Not allowed" });
    const schoolId = req.user!.schoolId!;
    const [row] = await db.select().from(schools).where(eq(schools.id, schoolId)).limit(1);
    if (!row) return res.status(404).json({ message: "School not found" });
    return res.json({
      enrollmentOpen: row.enrollmentOpen,
      studentApplicationsEnabled: row.studentApplicationsEnabled,
      parentApplicationsEnabled: row.parentApplicationsEnabled,
      staffApplicationsEnabled: row.staffApplicationsEnabled,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to load enrollment settings" });
  }
});

router.patch("/settings", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== "admin") return res.status(403).json({ message: "Not allowed" });
    const schoolId = req.user!.schoolId!;

    const body = z
      .object({
        enrollmentOpen: z.boolean().optional(),
        studentApplicationsEnabled: z.boolean().optional(),
        parentApplicationsEnabled: z.boolean().optional(),
        staffApplicationsEnabled: z.boolean().optional(),
      })
      .parse(req.body);

    const [row] = await db
      .update(schools)
      .set({
        ...(typeof body.enrollmentOpen === "boolean" ? { enrollmentOpen: body.enrollmentOpen } : {}),
        ...(typeof body.studentApplicationsEnabled === "boolean" ? { studentApplicationsEnabled: body.studentApplicationsEnabled } : {}),
        ...(typeof body.parentApplicationsEnabled === "boolean" ? { parentApplicationsEnabled: body.parentApplicationsEnabled } : {}),
        ...(typeof body.staffApplicationsEnabled === "boolean" ? { staffApplicationsEnabled: body.staffApplicationsEnabled } : {}),
        updatedAt: new Date(),
      })
      .where(eq(schools.id, schoolId))
      .returning();
    if (!row) return res.status(404).json({ message: "School not found" });

    return res.json({
      enrollmentOpen: row.enrollmentOpen,
      studentApplicationsEnabled: row.studentApplicationsEnabled,
      parentApplicationsEnabled: row.parentApplicationsEnabled,
      staffApplicationsEnabled: row.staffApplicationsEnabled,
    });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ message: "Invalid input", errors: e.errors });
    console.error(e);
    return res.status(500).json({ message: "Failed to update enrollment settings" });
  }
});

// ---------- Student: my applications ----------
router.get("/student/applications", requireAuth, async (req: AuthRequest, res) => {
  if (req.user!.role !== "student") return res.status(403).json({ message: "Not allowed" });
  const list = await db.select().from(enrollmentApplications).where(and(eq(enrollmentApplications.applicantUserId, req.user!.id), eq(enrollmentApplications.type, "student_self"))).orderBy(desc(enrollmentApplications.createdAt));
  return res.json(list);
});

router.post("/student/apply", requireAuth, async (req: AuthRequest, res) => {
  if (req.user!.role !== "student") return res.status(403).json({ message: "Not allowed" });
  const body = z
    .object({
      schoolId: z.string(),
      classId: z.string(),
      guardianName: z.string(),
      guardianContact: z.string(),
      guardianEmail: z.string(),
      dateOfBirth: z.string(),
      address: z.string(),
      medicalInfo: z.string().optional(),
      documents: documentsSchema,
    })
    .parse(req.body);

  const [school] = await db.select().from(schools).where(eq(schools.id, body.schoolId)).limit(1);
  if (!school) return res.status(404).json({ message: "School not found" });
  if (!school.enrollmentOpen || !school.studentApplicationsEnabled) {
    return res.status(400).json({ message: "School is not currently accepting student applications" });
  }

  const [cls] = await db
    .select({ id: schoolClasses.id })
    .from(schoolClasses)
    .where(and(eq(schoolClasses.id, body.classId), eq(schoolClasses.schoolId, body.schoolId)))
    .limit(1);
  if (!cls) {
    return res.status(400).json({ message: "Invalid classId" });
  }

  const [row] = await db.insert(enrollmentApplications).values({ type: "student_self", schoolId: body.schoolId, applicantUserId: req.user!.id, status: "submitted", classId: body.classId, payload: body }).returning();
  return res.status(201).json(row);
});

// ---------- Parent: children (pending profiles + linked) ----------
router.get("/parent/children", requireAuth, async (req: AuthRequest, res) => {
  if (req.user!.role !== "parent") return res.status(403).json({ message: "Not allowed" });

  const linked = await db
    .select({
      id: users.id,
      name: users.name,
      dateOfBirth: sql<string>`''`,
      previousSchool: sql<string | null>`NULL`,
      isActive: sql<boolean>`true`,
      currentSchool: sql<string | null>`NULL`,
    })
    .from(parentChildren)
    .innerJoin(users, eq(users.id, parentChildren.childId))
    .where(eq(parentChildren.parentId, req.user!.id));

  const pending = await db
    .select({
      id: pendingStudentProfiles.id,
      name: pendingStudentProfiles.fullName,
      dateOfBirth: sql<string>`to_char(${pendingStudentProfiles.dateOfBirth}, 'YYYY-MM-DD')`,
      previousSchool: pendingStudentProfiles.previousSchool,
      isActive: sql<boolean>`false`,
      currentSchool: sql<string | null>`NULL`,
    })
    .from(pendingStudentProfiles)
    .where(eq(pendingStudentProfiles.parentId, req.user!.id));

  return res.json([...linked, ...pending]);
});

router.post("/parent/register-child", requireAuth, async (req: AuthRequest, res) => {
  if (req.user!.role !== "parent") return res.status(403).json({ message: "Not allowed" });
  const body = z
    .object({
      name: z.string(),
      dateOfBirth: z.string(),
      previousSchool: z.string().optional(),
      previousClass: z.string().optional(),
      medicalInfo: z.string().optional(),
      documents: documentsSchema,
    })
    .parse(req.body);
  const [row] = await db.insert(pendingStudentProfiles).values({ parentId: req.user!.id, fullName: body.name, dateOfBirth: new Date(body.dateOfBirth), previousSchool: body.previousSchool ?? null, medicalInfo: body.medicalInfo ?? null, documents: body.documents ?? [] }).returning();
  return res.status(201).json(row);
});

router.get("/parent/applications", requireAuth, async (req: AuthRequest, res) => {
  if (req.user!.role !== "parent") return res.status(403).json({ message: "Not allowed" });
  const list = await db.select().from(enrollmentApplications).where(and(eq(enrollmentApplications.applicantUserId, req.user!.id), eq(enrollmentApplications.type, "parent_student"))).orderBy(desc(enrollmentApplications.createdAt));
  return res.json(list);
});

router.post("/parent/apply-for-child", requireAuth, async (req: AuthRequest, res) => {
  if (req.user!.role !== "parent") return res.status(403).json({ message: "Not allowed" });
  const body = z
    .object({
      childId: z.string(),
      schoolId: z.string(),
      classId: z.string(),
      documents: documentsSchema,
    })
    .parse(req.body);

  const [school] = await db.select().from(schools).where(eq(schools.id, body.schoolId)).limit(1);
  if (!school) return res.status(404).json({ message: "School not found" });
  if (!school.enrollmentOpen || !school.parentApplicationsEnabled) {
    return res.status(400).json({ message: "School is not currently accepting parent applications" });
  }

  const [cls] = await db
    .select({ id: schoolClasses.id })
    .from(schoolClasses)
    .where(and(eq(schoolClasses.id, body.classId), eq(schoolClasses.schoolId, body.schoolId)))
    .limit(1);
  if (!cls) {
    return res.status(400).json({ message: "Invalid classId" });
  }

  const [row] = await db.insert(enrollmentApplications).values({ type: "parent_student", schoolId: body.schoolId, applicantUserId: req.user!.id, status: "submitted", classId: body.classId, pendingStudentProfileId: body.childId, payload: { documents: body.documents } }).returning();
  return res.status(201).json(row);
});

// ---------- Employee: my applications ----------
router.get("/employee/applications", requireAuth, async (req: AuthRequest, res) => {
  if (req.user!.role !== "employee") return res.status(403).json({ message: "Not allowed" });
  const list = await db.select().from(enrollmentApplications).where(and(eq(enrollmentApplications.applicantUserId, req.user!.id), eq(enrollmentApplications.type, "employee"))).orderBy(desc(enrollmentApplications.createdAt));
  return res.json(list);
});

router.post("/employee/apply", requireAuth, async (req: AuthRequest, res) => {
  if (req.user!.role !== "employee") return res.status(403).json({ message: "Not allowed" });
  const body = z
    .object({
      schoolId: z.string(),
      desiredSubRole: z.string(),
      customSubRoleName: z.string().optional(),
      experience: z.string(),
      qualifications: z.string(),
      previousEmployment: z.string().optional(),
      references: z.string().optional(),
      coverLetter: z.string().optional(),
      documents: documentsSchema,
    })
    .parse(req.body);

  const [school] = await db.select().from(schools).where(eq(schools.id, body.schoolId)).limit(1);
  if (!school) return res.status(404).json({ message: "School not found" });
  if (!school.enrollmentOpen || !school.staffApplicationsEnabled) {
    return res.status(400).json({ message: "School is not currently accepting staff applications" });
  }

  const desiredKey = String(body.desiredSubRole || "").trim();
  const wantsOther = desiredKey === "other";

  let desiredSubRoleId: string | null = null;
  if (!wantsOther) {
    const [subRoleRow] = await db
      .select({ id: employeeSubRoles.id })
      .from(employeeSubRoles)
      .where(and(eq(employeeSubRoles.schoolId, body.schoolId), eq(employeeSubRoles.key, desiredKey)))
      .limit(1);
    if (!subRoleRow) {
      return res.status(400).json({ message: "Invalid desiredSubRole" });
    }
    desiredSubRoleId = subRoleRow.id;
  } else {
    const customName = String(body.customSubRoleName || "").trim();
    if (!customName) {
      return res.status(400).json({ message: "customSubRoleName is required when desiredSubRole is 'other'" });
    }
  }

  const [row] = await db
    .insert(enrollmentApplications)
    .values({
      type: "employee",
      schoolId: body.schoolId,
      applicantUserId: req.user!.id,
      status: "submitted",
      desiredSubRoleId,
      payload: { ...body, desiredSubRole: desiredKey },
    })
    .returning();
  return res.status(201).json(row);
});

// 🔧 AUTOMATED ENROLLMENT STATUS SCHEMA
const enrollmentStatusSchema = z.enum(["active", "promoted", "graduated", "pending", "transferred"]);

// 🔧 AUTOMATED ENROLLMENT WORKFLOW
router.post("/auto-enroll", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== "admin") {
      return res.status(403).json({ message: "Not allowed" });
    }
    const schoolId = req.user!.schoolId!;
    
    // 🔍 FIND ALL ORPHANED STUDENTS
    console.log('Finding orphaned students for school:', schoolId);
    const orphanedStudents = await db
      .select()
      .from(users)
      .where(and(
        eq(users.role, "student"),
        eq(users.schoolId, schoolId),
        // Use isNull or check for empty string
        sql`${users.grade} IS NULL OR ${users.grade} = ''`
      ));
    
    console.log(`Found ${orphanedStudents.length} orphaned students`);
    
    if (orphanedStudents.length === 0) {
      return res.json({ message: "No orphaned students found", enrolled: 0 });
    }
    
    // 📋 GET DEFAULT ACADEMIC STRUCTURE
    const [currentYear] = await db
      .select()
      .from(academicYears)
      .where(and(
        eq(academicYears.schoolId, schoolId),
        eq(academicYears.isActive, true)
      ))
      .limit(1);

    if (!currentYear) {
      return res.status(400).json({ message: "No active academic year found" });
    }
    
    const [currentTerm] = await db
      .select()
      .from(academicTerms)
      .where(and(
        eq(academicTerms.schoolId, schoolId),
        eq(academicTerms.academicYearId, currentYear.id),
        eq(academicTerms.isActive, true)
      ))
      .limit(1);
    
    // 📚 GET DEFAULT CLASS (Grade 1, Section 1)
    const [defaultClass] = await db
      .select()
      .from(schoolClasses)
      .where(and(
        eq(schoolClasses.schoolId, schoolId),
        eq(schoolClasses.name, "Grade 1")
      ))
      .limit(1);
    
    if (!defaultClass) {
      return res.status(400).json({ message: "No default class found for enrollment" });
    }
    
    const [defaultSection] = await db
      .select()
      .from(classSections)
      .where(and(
        eq(classSections.schoolId, schoolId),
        eq(classSections.classId, defaultClass.id),
        eq(classSections.name, "Section 1")
      ))
      .limit(1);
    
    let enrolledCount = 0;
    const enrollmentResults = [];
    
    // 🔧 AUTO-ENROLL EACH ORPHANED STUDENT
    for (const student of orphanedStudents) {
      try {
        // Check if already enrolled
        const [existingEnrollment] = await db
          .select()
          .from(studentEnrollments)
          .where(and(
            eq(studentEnrollments.studentId, student.id),
            eq(studentEnrollments.academicYearId, currentYear.id)
          ))
          .limit(1);
        
        if (existingEnrollment) {
          enrollmentResults.push({
            studentId: student.id,
            studentName: student.name,
            status: "already_enrolled",
            message: "Student already enrolled"
          });
          continue;
        }
        
        // Create enrollment
        const [enrollment] = await db
          .insert(studentEnrollments)
          .values({
            studentId: student.id,
            academicYearId: currentYear.id,
            classId: defaultClass.id,
            sectionId: defaultSection?.id,
            status: "active",
            schoolId
          })
          .returning();

        if (!enrollment) {
          enrollmentResults.push({
            studentId: student.id,
            studentName: student.name,
            status: "error",
            message: "Failed to create enrollment"
          });
          continue;
        }
        
        // Update student record
        await db
          .update(users)
          .set({
            grade: defaultClass.name,
            classSection: defaultSection?.name || "Section 1"
          })
          .where(eq(users.id, student.id));
        
        enrolledCount++;
        enrollmentResults.push({
          studentId: student.id,
          studentName: student.name,
          enrollmentId: enrollment.id,
          status: "enrolled",
          class: defaultClass.name,
          section: defaultSection?.name || "Section 1"
        });
        
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        enrollmentResults.push({
          studentId: student.id,
          studentName: student.name,
          status: "error",
          message
        });
      }
    }
    
    res.json({
      message: `Auto-enrollment completed`,
      totalOrphans: orphanedStudents.length,
      enrolled: enrolledCount,
      results: enrollmentResults
    });
    
  } catch (error: any) {
    console.error('Auto-enrollment error:', error);
    console.error('Error details:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ message: "Auto-enrollment failed", error: error.message });
  }
});

// 📊 ENROLLMENT DASHBOARD
router.get("/dashboard", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== "admin" && req.user!.role !== "employee") {
      return res.status(403).json({ message: "Not allowed" });
    }
    const schoolId = req.user!.schoolId!;
    
    // 📈 GET ENROLLMENT STATISTICS
    const [currentYear] = await db
      .select()
      .from(academicYears)
      .where(and(
        eq(academicYears.schoolId, schoolId),
        eq(academicYears.isActive, true)
      ))
      .limit(1);
    
    // 📊 UNASSIGNED STUDENTS
    const unassignedStudents = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        grade: users.grade,
        classSection: users.classSection
      })
      .from(users)
      .where(and(
        eq(users.role, "student"),
        eq(users.schoolId, schoolId),
        isNull(users.grade)
      ))
      .orderBy(users.name);
    
    // 📊 PENDING ENROLLMENTS
    const pendingEnrollments = await db
      .select({
        student: { name: users.name, email: users.email },
        enrollment: studentEnrollments
      })
      .from(studentEnrollments)
      .leftJoin(users, eq(users.id, studentEnrollments.studentId))
      .where(and(
        eq(studentEnrollments.schoolId, schoolId),
        eq(studentEnrollments.status, "pending")
      ))
      .orderBy(studentEnrollments.createdAt);
    
    // 📊 GRADUATION CANDIDATES
    const graduationCandidates = await db
      .select({
        student: { name: users.name, email: users.email },
        enrollment: studentEnrollments,
        class: { name: schoolClasses.name }
      })
      .from(studentEnrollments)
      .leftJoin(users, eq(users.id, studentEnrollments.studentId))
      .leftJoin(schoolClasses, eq(schoolClasses.id, studentEnrollments.classId))
      .where(and(
        eq(studentEnrollments.schoolId, schoolId),
        eq(studentEnrollments.status, "active"),
        eq(schoolClasses.name, "Grade 6") // Assuming Grade 6 is final grade
      ))
      .orderBy(users.name);
    
    // 📊 CLASS ENROLLMENT BREAKDOWN
    const classBreakdown = await db
      .select({
        className: schoolClasses.name,
        sectionName: classSections.name,
        enrolledCount: sql<number>`count(${studentEnrollments.id})`
      })
      .from(studentEnrollments)
      .leftJoin(schoolClasses, eq(schoolClasses.id, studentEnrollments.classId))
      .leftJoin(classSections, eq(classSections.id, studentEnrollments.sectionId))
      .where(and(
        eq(studentEnrollments.schoolId, schoolId),
        eq(studentEnrollments.status, "active")
      ))
      .groupBy(schoolClasses.name, classSections.name)
      .orderBy(schoolClasses.name, classSections.name);
    
    res.json({
      academicYear: currentYear,
      statistics: {
        unassignedStudents: unassignedStudents.length,
        pendingEnrollments: pendingEnrollments.length,
        graduationCandidates: graduationCandidates.length,
        totalActiveEnrollments: classBreakdown.reduce((sum, item) => sum + item.enrolledCount, 0)
      },
      unassignedStudents,
      pendingEnrollments,
      graduationCandidates,
      classBreakdown
    });
    
  } catch (error: any) {
    console.error('Enrollment dashboard error:', error);
    res.status(500).json({ message: "Failed to load enrollment dashboard" });
  }
});

// 🔧 PROMOTE STUDENTS (YEAR END)
router.post("/promote", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== "admin") {
      return res.status(403).json({ message: "Not allowed" });
    }
    const schoolId = req.user!.schoolId!;
    const { targetYearId } = req.body;
    
    if (!targetYearId) {
      return res.status(400).json({ message: "Target academic year ID required" });
    }
    
    // 🔍 GET ALL ACTIVE STUDENTS IN CURRENT YEAR
    const [currentYear] = await db
      .select()
      .from(academicYears)
      .where(and(
        eq(academicYears.schoolId, schoolId),
        eq(academicYears.isActive, true)
      ))
      .limit(1);

    if (!currentYear) {
      return res.status(400).json({ message: "No active academic year found" });
    }
    
    const activeEnrollments = await db
      .select({
        enrollment: studentEnrollments,
        student: users,
        class: schoolClasses
      })
      .from(studentEnrollments)
      .leftJoin(users, eq(users.id, studentEnrollments.studentId))
      .leftJoin(schoolClasses, eq(schoolClasses.id, studentEnrollments.classId))
      .where(and(
        eq(studentEnrollments.schoolId, schoolId),
        eq(studentEnrollments.academicYearId, currentYear.id),
        eq(studentEnrollments.status, "active")
      ));
    
    let promotedCount = 0;
    let graduatedCount = 0;
    const promotionResults = [];
    
    for (const { enrollment, student, class: currentClass } of activeEnrollments) {
      try {
        if (!student) {
          promotionResults.push({
            action: "error",
            message: "Student record missing for enrollment",
            enrollmentId: enrollment.id,
          });
          continue;
        }

        // 🎓 GRADUATION LOGIC (Grade 6 students)
        if (currentClass?.name === "Grade 6") {
          await db
            .update(studentEnrollments)
            .set({ status: "graduated" })
            .where(eq(studentEnrollments.id, enrollment.id));
          
          await db
            .update(users)
            .set({ grade: null, classSection: null })
            .where(eq(users.id, student.id));
          
          graduatedCount++;
          promotionResults.push({
            studentId: student.id,
            studentName: student.name,
            action: "graduated",
            fromGrade: "Grade 6"
          });
          continue;
        }
        
        // 📈 PROMOTION LOGIC
        const currentGradeNum = parseInt(currentClass?.name.replace("Grade ", "") || "0");
        const nextGradeNum = currentGradeNum + 1;
        const nextGradeName = `Grade ${nextGradeNum}`;
        
        // Find next class
        const [nextClass] = await db
          .select()
          .from(schoolClasses)
          .where(and(
            eq(schoolClasses.schoolId, schoolId),
            eq(schoolClasses.name, nextGradeName)
          ))
          .limit(1);
        
        if (!nextClass) {
          promotionResults.push({
            studentId: student.id,
            studentName: student.name,
            action: "no_next_class",
            fromGrade: currentClass?.name
          });
          continue;
        }
        
        // Get default section for next grade
        const [nextSection] = await db
          .select()
          .from(classSections)
          .where(and(
            eq(classSections.schoolId, schoolId),
            eq(classSections.classId, nextClass.id),
            eq(classSections.name, "Section 1")
          ))
          .limit(1);
        
        // Create new enrollment for next year
        const [newEnrollment] = await db
          .insert(studentEnrollments)
          .values({
            studentId: student.id,
            academicYearId: targetYearId,
            classId: nextClass.id,
            sectionId: nextSection?.id,
            status: "active",
            schoolId
          })
          .returning();

        if (!newEnrollment) {
          promotionResults.push({
            studentId: student.id,
            studentName: student.name,
            action: "error",
            message: "Failed to create new enrollment"
          });
          continue;
        }
        
        // Update current enrollment status
        await db
          .update(studentEnrollments)
          .set({ status: "promoted" })
          .where(eq(studentEnrollments.id, enrollment.id));
        
        // Update student record
        await db
          .update(users)
          .set({
            grade: nextGradeName,
            classSection: nextSection?.name || "Section 1"
          })
          .where(eq(users.id, student.id));
        
        promotedCount++;
        promotionResults.push({
          studentId: student.id,
          studentName: student.name,
          action: "promoted",
          fromGrade: currentClass?.name,
          toGrade: nextGradeName,
          newEnrollmentId: newEnrollment.id
        });
        
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        promotionResults.push({
          studentId: student?.id,
          studentName: student?.name,
          action: "error",
          message
        });
      }
    }
    
    res.json({
      message: "Student promotion completed",
      totalProcessed: activeEnrollments.length,
      promoted: promotedCount,
      graduated: graduatedCount,
      results: promotionResults
    });
    
  } catch (error: any) {
    console.error('Student promotion error:', error);
    res.status(500).json({ message: "Student promotion failed" });
  }
});

export default router;

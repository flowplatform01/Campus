import "./config.js";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { db } from "./db.js";
import {
  admissions,
  academicTerms,
  academicYears,
  classSections,
  parentChildren,
  schoolClasses,
  schools,
  smsAssignmentSubmissions,
  smsAssignments,
  smsAttendanceEntries,
  smsAttendanceSessions,
  smsExpenses,
  smsExamMarks,
  smsExams,
  smsFeeHeads,
  smsGradeScales,
  smsInvoiceLines,
  smsInvoices,
  smsPaymentSettings,
  smsPayments,
  smsDisciplineRecords,
  smsStudentTransfers,
  smsReportPublications,
  subjects,
  timetablePublications,
  timetableSlots,
  users,
  studentEnrollments,
} from "@shared/schema";

async function ensureSchool(name: string) {
  const [existing] = await db.select().from(schools).where(eq(schools.name, name)).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(schools).values({ name }).returning();
  if (!created) throw new Error("Failed to create school");
  return created;
}

async function ensureUser(params: {
  email: string;
  password: string;
  name: string;
  role: "admin" | "student" | "parent" | "employee";
  schoolId?: string | null;
  subRole?: string | null;
  studentId?: string | null;
  employeeId?: string | null;
  verified?: boolean;
}) {
  const [existing] = await db.select().from(users).where(eq(users.email, params.email)).limit(1);
  if (existing) {
    const patch: Record<string, unknown> = {};
    if (typeof params.schoolId !== "undefined" && params.schoolId !== existing.schoolId) patch.schoolId = params.schoolId;
    if (params.name && params.name !== existing.name) patch.name = params.name;
    if (params.role && params.role !== existing.role) patch.role = params.role;
    if (typeof params.subRole !== "undefined" && params.subRole !== existing.subRole) patch.subRole = params.subRole;
    if (typeof params.studentId !== "undefined" && params.studentId !== existing.studentId) patch.studentId = params.studentId;
    if (typeof params.employeeId !== "undefined" && params.employeeId !== existing.employeeId) patch.employeeId = params.employeeId;
    if (Object.keys(patch).length > 0) {
      const [updated] = await db.update(users).set(patch as any).where(eq(users.id, existing.id)).returning();
      return updated ?? existing;
    }
    return existing;
  }

  const hashed = await bcrypt.hash(params.password, 10);
  const [created] = await db
    .insert(users)
    .values({
      email: params.email,
      password: hashed,
      name: params.name,
      role: params.role,
      schoolId: params.schoolId ?? null,
      subRole: params.subRole ?? null,
      studentId: params.studentId ?? null,
      employeeId: params.employeeId ?? null,
      verified: params.verified ?? true,
      emailVerifiedAt: params.verified === false ? null : new Date(),
      profileCompletion: 100,
      points: 0,
      badges: [],
    })
    .returning();

  if (!created) throw new Error("Failed to create user");
  return created;
}

async function ensureAcademicYear(params: {
  schoolId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  isActive?: boolean;
}) {
  const [existing] = await db
    .select()
    .from(academicYears)
    .where(and(eq(academicYears.schoolId, params.schoolId), eq(academicYears.name, params.name)))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(academicYears)
    .values({
      schoolId: params.schoolId,
      name: params.name,
      startDate: params.startDate,
      endDate: params.endDate,
      isActive: params.isActive ?? false,
    })
    .returning();
  if (!created) throw new Error("Failed to create academic year");
  return created;
}

async function ensureTerm(params: {
  schoolId: string;
  academicYearId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  isActive?: boolean;
}) {
  const [existing] = await db
    .select()
    .from(academicTerms)
    .where(and(eq(academicTerms.academicYearId, params.academicYearId), eq(academicTerms.name, params.name)))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(academicTerms)
    .values({
      schoolId: params.schoolId,
      academicYearId: params.academicYearId,
      name: params.name,
      startDate: params.startDate,
      endDate: params.endDate,
      isActive: params.isActive ?? false,
    })
    .returning();
  if (!created) throw new Error("Failed to create term");
  return created;
}

async function ensureClass(params: { schoolId: string; name: string; sortOrder: number }) {
  const [existing] = await db
    .select()
    .from(schoolClasses)
    .where(and(eq(schoolClasses.schoolId, params.schoolId), eq(schoolClasses.name, params.name)))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(schoolClasses)
    .values({ schoolId: params.schoolId, name: params.name, sortOrder: params.sortOrder })
    .returning();
  if (!created) throw new Error("Failed to create class");
  return created;
}

async function ensureSection(params: { schoolId: string; classId: string; name: string }) {
  const [existing] = await db
    .select()
    .from(classSections)
    .where(and(eq(classSections.schoolId, params.schoolId), eq(classSections.classId, params.classId), eq(classSections.name, params.name)))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(classSections)
    .values({ schoolId: params.schoolId, classId: params.classId, name: params.name })
    .returning();
  if (!created) throw new Error("Failed to create section");
  return created;
}

async function ensureSubject(params: { schoolId: string; name: string; code: string }) {
  const [existing] = await db
    .select()
    .from(subjects)
    .where(and(eq(subjects.schoolId, params.schoolId), eq(subjects.code, params.code)))
    .limit(1);
  if (existing) return existing;

  const [created] = await db.insert(subjects).values(params).returning();
  if (!created) throw new Error("Failed to create subject");
  return created;
}

async function ensureEnrollment(params: {
  schoolId: string;
  academicYearId: string;
  termId?: string | null;
  studentId: string;
  classId: string;
  sectionId?: string | null;
  status?: string;
}) {
  const [existing] = await db
    .select()
    .from(studentEnrollments)
    .where(and(eq(studentEnrollments.academicYearId, params.academicYearId), eq(studentEnrollments.studentId, params.studentId)))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(studentEnrollments)
    .values({
      schoolId: params.schoolId,
      academicYearId: params.academicYearId,
      termId: params.termId ?? null,
      studentId: params.studentId,
      classId: params.classId,
      sectionId: params.sectionId ?? null,
      status: (params.status as any) ?? "active",
    })
    .returning();
  if (!created) throw new Error("Failed to create enrollment");
  return created;
}

function utcDate(y: number, m: number, d: number) {
  return new Date(Date.UTC(y, m, d));
}

async function main() {
  const school = await ensureSchool("Campus Two-Year Simulation School");

  const admin = await ensureUser({
    email: "sim-admin@campus.demo",
    password: "Campus@12345",
    name: "Simulation Admin",
    role: "admin",
    schoolId: school.id,
  });

  const teacher = await ensureUser({
    email: "sim-teacher@campus.demo",
    password: "Campus@12345",
    name: "Simulation Teacher",
    role: "employee",
    subRole: "teacher",
    employeeId: "SIM-EMP-001",
    schoolId: school.id,
  });

  await ensureUser({
    email: "sim-bursar@campus.demo",
    password: "Campus@12345",
    name: "Simulation Bursar",
    role: "employee",
    subRole: "bursar",
    employeeId: "SIM-EMP-002",
    schoolId: school.id,
  });

  await ensureUser({
    email: "sim-accountant@campus.demo",
    password: "Campus@12345",
    name: "Simulation Accountant",
    role: "employee",
    subRole: "accountant",
    employeeId: "SIM-EMP-003",
    schoolId: school.id,
  });

  const parent = await ensureUser({
    email: "sim-parent@campus.demo",
    password: "Campus@12345",
    name: "Simulation Parent",
    role: "parent",
    schoolId: school.id,
  });

  // Students
  const studentsList = await Promise.all(
    Array.from({ length: 12 }).map((_, i) =>
      ensureUser({
        email: `sim-student-${String(i + 1).padStart(2, "0")}@campus.demo`,
        password: "Campus@12345",
        name: `Sim Student ${i + 1}`,
        role: "student",
        studentId: `SIM-STU-${String(i + 1).padStart(3, "0")}`,
        schoolId: school.id,
      }),
    ),
  );

  // Parent links for first 2 students
  for (const s of studentsList.slice(0, 2)) {
    const [existingLink] = await db
      .select()
      .from(parentChildren)
      .where(and(eq(parentChildren.parentId, parent.id), eq(parentChildren.childId, s.id)))
      .limit(1);
    if (!existingLink) {
      await db.insert(parentChildren).values({ parentId: parent.id, childId: s.id });
    }
  }

  // Academic years (2 years)
  const year1 = await ensureAcademicYear({
    schoolId: school.id,
    name: "2024/2025",
    startDate: utcDate(2024, 8, 1),
    endDate: utcDate(2025, 5, 30),
    isActive: false,
  });

  const year2 = await ensureAcademicYear({
    schoolId: school.id,
    name: "2025/2026",
    startDate: utcDate(2025, 8, 1),
    endDate: utcDate(2026, 5, 30),
    isActive: true,
  });

  // Terms (3 per year)
  const year1Terms = await Promise.all([
    ensureTerm({ schoolId: school.id, academicYearId: year1.id, name: "Term 1", startDate: utcDate(2024, 8, 1), endDate: utcDate(2024, 11, 15), isActive: false }),
    ensureTerm({ schoolId: school.id, academicYearId: year1.id, name: "Term 2", startDate: utcDate(2025, 0, 6), endDate: utcDate(2025, 2, 20), isActive: false }),
    ensureTerm({ schoolId: school.id, academicYearId: year1.id, name: "Term 3", startDate: utcDate(2025, 3, 7), endDate: utcDate(2025, 5, 30), isActive: false }),
  ]);

  const year2Terms = await Promise.all([
    ensureTerm({ schoolId: school.id, academicYearId: year2.id, name: "Term 1", startDate: utcDate(2025, 8, 1), endDate: utcDate(2025, 11, 15), isActive: true }),
    ensureTerm({ schoolId: school.id, academicYearId: year2.id, name: "Term 2", startDate: utcDate(2026, 0, 6), endDate: utcDate(2026, 2, 20), isActive: false }),
    ensureTerm({ schoolId: school.id, academicYearId: year2.id, name: "Term 3", startDate: utcDate(2026, 3, 7), endDate: utcDate(2026, 5, 30), isActive: false }),
  ]);

  // Report publications (term + student scoped) in Year 2 Term 1
  const y2Term1 = year2Terms[0]!;
  const targetStudent = studentsList[0]!;
  const [existingTermPub] = await db
    .select({ id: smsReportPublications.id })
    .from(smsReportPublications)
    .where(
      and(
        eq(smsReportPublications.schoolId, school.id),
        eq(smsReportPublications.scopeType, "term"),
        eq(smsReportPublications.academicYearId, year2.id),
        eq(smsReportPublications.termId, y2Term1.id)
      )
    )
    .limit(1);
  if (!existingTermPub) {
    await db.insert(smsReportPublications).values({
      schoolId: school.id,
      scopeType: "term",
      academicYearId: year2.id,
      termId: y2Term1.id,
      status: "published",
      publishedAt: new Date(),
      createdBy: admin.id,
      updatedAt: new Date(),
    } as any);
  }

  const [existingStudentPub] = await db
    .select({ id: smsReportPublications.id })
    .from(smsReportPublications)
    .where(
      and(
        eq(smsReportPublications.schoolId, school.id),
        eq(smsReportPublications.scopeType, "student"),
        eq(smsReportPublications.academicYearId, year2.id),
        eq(smsReportPublications.termId, y2Term1.id),
        eq(smsReportPublications.studentId, targetStudent.id)
      )
    )
    .limit(1);
  if (!existingStudentPub) {
    await db.insert(smsReportPublications).values({
      schoolId: school.id,
      scopeType: "student",
      academicYearId: year2.id,
      termId: y2Term1.id,
      studentId: targetStudent.id,
      status: "published",
      publishedAt: new Date(),
      createdBy: admin.id,
      updatedAt: new Date(),
    } as any);
  }

  // Classes + Sections
  const grade10 = await ensureClass({ schoolId: school.id, name: "Grade 10", sortOrder: 10 });
  const grade11 = await ensureClass({ schoolId: school.id, name: "Grade 11", sortOrder: 11 });

  const grade10A = await ensureSection({ schoolId: school.id, classId: grade10.id, name: "A" });
  const grade10B = await ensureSection({ schoolId: school.id, classId: grade10.id, name: "B" });
  const grade11A = await ensureSection({ schoolId: school.id, classId: grade11.id, name: "A" });

  // Admissions (create submitted + approved applications to exercise admin workflows)
  const [existingAdmission] = await db
    .select({ id: admissions.id })
    .from(admissions)
    .where(eq(admissions.schoolId, school.id))
    .limit(1);

  if (!existingAdmission) {
    const submitted = await db
      .insert(admissions)
      .values([
        {
          schoolId: school.id,
          academicYearId: year2.id,
          classId: grade10.id,
          sectionId: grade10A.id,
          studentFullName: "Admission Student 1",
          studentEmail: "admission-student-01@campus.demo",
          studentPhone: "+10000000001",
          desiredStudentId: "ADM-STU-001",
          parentFullName: "Admission Parent 1",
          parentEmail: "admission-parent-01@campus.demo",
          parentPhone: "+10000001001",
          notes: "Auto-seeded admission (submitted)",
          status: "submitted",
          createdBy: admin.id,
          updatedAt: new Date(),
        } as any,
        {
          schoolId: school.id,
          academicYearId: year2.id,
          classId: grade10.id,
          sectionId: grade10B.id,
          studentFullName: "Admission Student 2",
          studentEmail: "admission-student-02@campus.demo",
          studentPhone: "+10000000002",
          desiredStudentId: "ADM-STU-002",
          parentFullName: "Admission Parent 2",
          parentEmail: "admission-parent-02@campus.demo",
          parentPhone: "+10000001002",
          notes: "Auto-seeded admission (submitted)",
          status: "submitted",
          createdBy: admin.id,
          updatedAt: new Date(),
        } as any,
      ])
      .returning();

    // Auto-approve one admission to create real student+parent accounts and enroll them
    const approvedSeedEmail = "admission-student-approved@campus.demo";
    const approvedParentEmail = "admission-parent-approved@campus.demo";

    const approvedStudent = await ensureUser({
      email: approvedSeedEmail,
      password: "Campus@12345",
      name: "Admission Student Approved",
      role: "student",
      studentId: "ADM-STU-003",
      schoolId: school.id,
    });
    const approvedParent = await ensureUser({
      email: approvedParentEmail,
      password: "Campus@12345",
      name: "Admission Parent Approved",
      role: "parent",
      schoolId: school.id,
    });

    const [existingLink] = await db
      .select()
      .from(parentChildren)
      .where(and(eq(parentChildren.parentId, approvedParent.id), eq(parentChildren.childId, approvedStudent.id)))
      .limit(1);
    if (!existingLink) {
      await db.insert(parentChildren).values({ parentId: approvedParent.id, childId: approvedStudent.id });
    }

    await ensureEnrollment({
      schoolId: school.id,
      academicYearId: year2.id,
      termId: y2Term1.id,
      studentId: approvedStudent.id,
      classId: grade10.id,
      sectionId: grade10A.id,
      status: "active",
    });

    await db.insert(admissions).values({
      schoolId: school.id,
      academicYearId: year2.id,
      classId: grade10.id,
      sectionId: grade10A.id,
      studentFullName: approvedStudent.name,
      studentEmail: approvedStudent.email,
      studentPhone: "+10000000003",
      desiredStudentId: approvedStudent.studentId,
      parentFullName: approvedParent.name,
      parentEmail: approvedParent.email,
      parentPhone: "+10000001003",
      notes: "Auto-seeded admission (approved)",
      status: "approved",
      createdBy: admin.id,
      approvedBy: admin.id,
      approvedAt: new Date(),
      updatedAt: new Date(),
    } as any);

    // Avoid unused var lint/ts warnings when returning is not used.
    void submitted;
  }

  // Subjects
  const math = await ensureSubject({ schoolId: school.id, name: "Mathematics", code: "MATH" });
  const eng = await ensureSubject({ schoolId: school.id, name: "English", code: "ENG" });
  const sci = await ensureSubject({ schoolId: school.id, name: "Science", code: "SCI" });

  // Timetable slots (create a weekly slot template for Year 2 Term 1)
  const days = ["mon", "tue", "wed", "thu", "fri"] as const;
  const slotsToEnsure = [
    { weekday: "mon", startTime: "08:00", endTime: "09:00", subjectId: math.id },
    { weekday: "tue", startTime: "08:00", endTime: "09:00", subjectId: eng.id },
    { weekday: "wed", startTime: "08:00", endTime: "09:00", subjectId: sci.id },
    { weekday: "thu", startTime: "08:00", endTime: "09:00", subjectId: math.id },
    { weekday: "fri", startTime: "08:00", endTime: "09:00", subjectId: eng.id },
  ] as const;

  const [existingSlot] = await db
    .select()
    .from(timetableSlots)
    .where(and(eq(timetableSlots.schoolId, school.id), eq(timetableSlots.academicYearId, year2.id), eq(timetableSlots.termId, year2Terms[0]!.id)))
    .limit(1);

  if (!existingSlot) {
    for (const s of slotsToEnsure) {
      await db.insert(timetableSlots).values({
        schoolId: school.id,
        academicYearId: year2.id,
        termId: year2Terms[0]!.id,
        classId: grade10.id,
        sectionId: grade10A.id,
        weekday: s.weekday,
        startTime: s.startTime,
        endTime: s.endTime,
        subjectId: s.subjectId,
        teacherId: teacher.id,
        room: "Room 1",
      } as any);
    }
  }

  // Publish timetable (required for /api/academics/schedule to return data)
  const [existingTimetablePub] = await db
    .select()
    .from(timetablePublications)
    .where(and(eq(timetablePublications.schoolId, school.id), eq(timetablePublications.academicYearId, year2.id), eq(timetablePublications.termId, year2Terms[0]!.id), eq(timetablePublications.classId, grade10.id)))
    .limit(1);
  if (!existingTimetablePub) {
    await db.insert(timetablePublications).values({
      schoolId: school.id,
      academicYearId: year2.id,
      termId: year2Terms[0]!.id,
      classId: grade10.id,
      sectionId: grade10A.id,
      status: "published",
      publishedAt: new Date(),
      publishedBy: admin.id,
      updatedAt: new Date(),
    } as any);
  }

  // Expenses (for finance realism + dashboard)
  const [existingExpense] = await db.select().from(smsExpenses).where(eq(smsExpenses.schoolId, school.id)).limit(1);
  if (!existingExpense) {
    await db.insert(smsExpenses).values([
      { schoolId: school.id, category: "utility", title: "Electricity", amount: 12000, date: new Date(), notes: "Monthly bill", recordedBy: admin.id },
      { schoolId: school.id, category: "maintenance", title: "Classroom repairs", amount: 8000, date: new Date(), notes: "Minor repairs", recordedBy: admin.id },
    ] as any);
  }

  // Finance settings
  const [paymentSettings] = await db
    .select()
    .from(smsPaymentSettings)
    .where(eq(smsPaymentSettings.schoolId, school.id))
    .limit(1);
  if (!paymentSettings) {
    await db.insert(smsPaymentSettings).values({
      schoolId: school.id,
      currency: "USD",
      methods: ["cash", "bank_transfer"],
    });
  }

  const [tuitionHead] = await db
    .select()
    .from(smsFeeHeads)
    .where(and(eq(smsFeeHeads.schoolId, school.id), eq(smsFeeHeads.code, "TUITION")))
    .limit(1);
  const feeHead =
    tuitionHead ??
    (
      await db
        .insert(smsFeeHeads)
        .values({ schoolId: school.id, name: "Tuition", code: "TUITION" })
        .returning()
    )[0];

  // Grade scale (used by export reports for grade letters)
  const existingScale = await db.select().from(smsGradeScales).where(eq(smsGradeScales.schoolId, school.id)).limit(1);
  if (existingScale.length === 0) {
    await db.insert(smsGradeScales).values([
      { schoolId: school.id, name: "Default", minPercentage: 90, maxPercentage: 100, grade: "A", points: 5, description: "Excellent" },
      { schoolId: school.id, name: "Default", minPercentage: 75, maxPercentage: 89, grade: "B", points: 4, description: "Very Good" },
      { schoolId: school.id, name: "Default", minPercentage: 60, maxPercentage: 74, grade: "C", points: 3, description: "Good" },
      { schoolId: school.id, name: "Default", minPercentage: 50, maxPercentage: 59, grade: "D", points: 2, description: "Pass" },
      { schoolId: school.id, name: "Default", minPercentage: 0, maxPercentage: 49, grade: "F", points: 0, description: "Fail" },
    ] as any);
  }

  // YEAR 1 enrollments (Grade 10) + artifacts per term
  for (let i = 0; i < studentsList.length; i++) {
    const s = studentsList[i]!;
    const sectionId = i % 2 === 0 ? grade10A.id : grade10B.id;
    await ensureEnrollment({
      schoolId: school.id,
      academicYearId: year1.id,
      termId: year1Terms[0].id,
      studentId: s.id,
      classId: grade10.id,
      sectionId,
      status: "active",
    });
  }

  // Term-level operations Year 1
  for (let termIndex = 0; termIndex < year1Terms.length; termIndex++) {
    const term = year1Terms[termIndex]!;
    // Assignment
    const title = `Y1 T${termIndex + 1} - ${math.name} Homework`;
    const [existingAssignment] = await db
      .select()
      .from(smsAssignments)
      .where(and(eq(smsAssignments.schoolId, school.id), eq(smsAssignments.academicYearId, year1.id), eq(smsAssignments.termId, term.id), eq(smsAssignments.title, title)))
      .limit(1);

    const assignment =
      existingAssignment ??
      (
        await db
          .insert(smsAssignments)
          .values({
            schoolId: school.id,
            academicYearId: year1.id,
            termId: term.id,
            classId: grade10.id,
            sectionId: null,
            subjectId: math.id,
            title,
            instructions: "Complete the worksheet and submit your answers.",
            dueAt: new Date(term.endDate.getTime() - 7 * 24 * 60 * 60 * 1000),
            maxScore: 20,
            status: "published",
            createdBy: teacher.id,
          })
          .returning()
      )[0];

    if (!assignment) throw new Error("Failed to create assignment");

    // Submissions for 6 students
    for (const s of studentsList.slice(0, 6)) {
      const [existingSub] = await db
        .select()
        .from(smsAssignmentSubmissions)
        .where(and(eq(smsAssignmentSubmissions.assignmentId, assignment.id), eq(smsAssignmentSubmissions.studentId, s.id)))
        .limit(1);
      if (!existingSub) {
        await db.insert(smsAssignmentSubmissions).values({
          assignmentId: assignment.id,
          schoolId: school.id,
          studentId: s.id,
          submissionText: `Submission by ${s.name} for ${title}`,
          score: 12 + ((termIndex + 1) % 5),
          feedback: "Reviewed during simulation.",
          reviewedBy: teacher.id,
          reviewedAt: new Date(),
        } as any);
      }
    }

    // Attendance sessions (3 days)
    const sessionDates = [0, 1, 2].map((n) => new Date(term.startDate.getTime() + n * 24 * 60 * 60 * 1000));
    for (let i = 0; i < sessionDates.length; i++) {
      const d = sessionDates[i]!;
      const [existingSession] = await db
        .select()
        .from(smsAttendanceSessions)
        .where(and(eq(smsAttendanceSessions.schoolId, school.id), eq(smsAttendanceSessions.academicYearId, year1.id), eq(smsAttendanceSessions.termId, term.id), eq(smsAttendanceSessions.classId, grade10.id), eq(smsAttendanceSessions.date, d)))
        .limit(1);

      const session =
        existingSession ??
        (
          await db
            .insert(smsAttendanceSessions)
            .values({
              schoolId: school.id,
              academicYearId: year1.id,
              termId: term.id,
              classId: grade10.id,
              sectionId: null,
              subjectId: math.id,
              date: d,
              status: "submitted",
              markedBy: teacher.id,
              submittedBy: teacher.id,
              submittedAt: new Date(),
            })
            .returning()
        )[0];

      if (!session) throw new Error("Failed to create attendance session");

      for (const s of studentsList) {
        const [existingEntry] = await db
          .select()
          .from(smsAttendanceEntries)
          .where(and(eq(smsAttendanceEntries.sessionId, session.id), eq(smsAttendanceEntries.studentId, s.id)))
          .limit(1);
        if (!existingEntry) {
          const absent = (s.studentId?.endsWith("003") || s.studentId?.endsWith("009")) && i === 1;
          await db.insert(smsAttendanceEntries).values({
            sessionId: session.id,
            schoolId: school.id,
            studentId: s.id,
            status: absent ? "absent" : "present",
            note: absent ? "Absent (simulation)" : null,
            markedBy: teacher.id,
          } as any);
        }
      }
    }

    // Exam + marks
    const examName = `Y1 T${termIndex + 1} - Midterm`;
    const [existingExam] = await db
      .select()
      .from(smsExams)
      .where(and(eq(smsExams.schoolId, school.id), eq(smsExams.academicYearId, year1.id), eq(smsExams.termId, term.id), eq(smsExams.name, examName)))
      .limit(1);

    const exam =
      existingExam ??
      (
        await db
          .insert(smsExams)
          .values({
            schoolId: school.id,
            academicYearId: year1.id,
            termId: term.id,
            name: examName,
            type: "exam",
            status: "completed",
          })
          .returning()
      )[0];

    if (!exam) throw new Error("Failed to create exam");

    for (const s of studentsList) {
      const [existingMark] = await db
        .select()
        .from(smsExamMarks)
        .where(and(eq(smsExamMarks.examId, exam.id), eq(smsExamMarks.studentId, s.id), eq(smsExamMarks.subjectId, math.id)))
        .limit(1);
      if (!existingMark) {
        const marks = 45 + ((Number(s.studentId?.slice(-2)) || 0) % 50);
        await db.insert(smsExamMarks).values({
          examId: exam.id,
          studentId: s.id,
          subjectId: math.id,
          marksObtained: Math.min(100, marks),
          totalMarks: 100,
          remarks: "Simulated",
          gradedBy: teacher.id,
        } as any);
      }
    }

    // Finance: invoices for first term only
    if (termIndex === 0 && feeHead) {
      for (const s of studentsList.slice(0, 6)) {
        const [existingInvoice] = await db
          .select()
          .from(smsInvoices)
          .where(and(eq(smsInvoices.schoolId, school.id), eq(smsInvoices.studentId, s.id), eq(smsInvoices.academicYearId, year1.id)))
          .limit(1);

        const invoice =
          existingInvoice ??
          (
            await db
              .insert(smsInvoices)
              .values({
                schoolId: school.id,
                academicYearId: year1.id,
                termId: term.id,
                studentId: s.id,
                status: "open",
                subtotalAmount: 50000,
                totalAmount: 50000,
                createdBy: admin.id,
              })
              .returning()
          )[0];

        if (!invoice) throw new Error("Failed to create invoice");

        const [existingLine] = await db
          .select()
          .from(smsInvoiceLines)
          .where(and(eq(smsInvoiceLines.invoiceId, invoice.id), eq(smsInvoiceLines.description, "Tuition Fees")))
          .limit(1);
        if (!existingLine) {
          await db.insert(smsInvoiceLines).values({
            invoiceId: invoice.id,
            schoolId: school.id,
            feeHeadId: feeHead.id,
            description: "Tuition Fees",
            amount: 50000,
          });
        }

        const [existingPayment] = await db
          .select()
          .from(smsPayments)
          .where(and(eq(smsPayments.invoiceId, invoice.id), eq(smsPayments.studentId, s.id)))
          .limit(1);
        if (!existingPayment) {
          await db.insert(smsPayments).values({
            schoolId: school.id,
            invoiceId: invoice.id,
            studentId: s.id,
            amount: 25000,
            method: "cash",
            reference: `SIM-Y1-${s.studentId}`,
            recordedBy: admin.id,
          } as any);
        }
      }
    }
  }

  // Promotions: mark Year 1 enrollments as promoted and create Year 2 enrollments in Grade 11
  const transferCandidate = studentsList[studentsList.length - 1]!;
  for (const s of studentsList) {
    const [y1Enroll] = await db
      .select()
      .from(studentEnrollments)
      .where(and(eq(studentEnrollments.academicYearId, year1.id), eq(studentEnrollments.studentId, s.id)))
      .limit(1);

    // Keep one student as a Year 1 active enrollment to simulate a transfer into Year 2
    if (s.id === transferCandidate.id) {
      continue;
    }

    if (y1Enroll && y1Enroll.status !== "promoted") {
      await db.update(studentEnrollments).set({ status: "promoted" as any }).where(eq(studentEnrollments.id, y1Enroll.id));
    }

    const y2SectionId =
      s.studentId?.endsWith("1") ||
      s.studentId?.endsWith("3") ||
      s.studentId?.endsWith("5") ||
      s.studentId?.endsWith("7") ||
      s.studentId?.endsWith("9")
        ? grade10B.id
        : grade10A.id;

    // IMPORTANT: on repeated runs, a Year 2 enrollment may already exist (e.g. previously seeded as Grade 11).
    // For reports/exports to show data in the active year, ensure Year 2 Term 1 is populated in Grade 10.
    const [existingY2Enroll] = await db
      .select()
      .from(studentEnrollments)
      .where(and(eq(studentEnrollments.schoolId, school.id), eq(studentEnrollments.academicYearId, year2.id), eq(studentEnrollments.studentId, s.id)))
      .limit(1);

    if (existingY2Enroll) {
      const needsUpdate =
        String(existingY2Enroll.classId) !== String(grade10.id) ||
        String(existingY2Enroll.termId ?? "") !== String(year2Terms[0]!.id) ||
        String(existingY2Enroll.sectionId ?? "") !== String(y2SectionId) ||
        String(existingY2Enroll.status) !== "active";

      if (needsUpdate) {
        await db
          .update(studentEnrollments)
          .set({
            termId: year2Terms[0]!.id,
            classId: grade10.id,
            sectionId: y2SectionId,
            status: "active" as any,
          })
          .where(eq(studentEnrollments.id, existingY2Enroll.id));
      }
    } else {
      await ensureEnrollment({
        schoolId: school.id,
        academicYearId: year2.id,
        termId: year2Terms[0]!.id,
        studentId: s.id,
        classId: grade10.id,
        sectionId: y2SectionId,
        status: "active",
      });
    }
  }

  // Seed Year 2 Term 1 class artifacts (reports/exports need real data)
  const y2Term1Artifacts = year2Terms[0]!;
  const y2AssignmentTitle = `Y2 T1 - ${eng.name} Homework`;
  const [existingY2Assignment] = await db
    .select()
    .from(smsAssignments)
    .where(
      and(
        eq(smsAssignments.schoolId, school.id),
        eq(smsAssignments.academicYearId, year2.id),
        eq(smsAssignments.termId, y2Term1Artifacts.id),
        eq(smsAssignments.title, y2AssignmentTitle)
      )
    )
    .limit(1);

  const y2Assignment =
    existingY2Assignment ??
    (
      await db
        .insert(smsAssignments)
        .values({
          schoolId: school.id,
          academicYearId: year2.id,
          termId: y2Term1Artifacts.id,
          classId: grade10.id,
          sectionId: null,
          subjectId: eng.id,
          title: y2AssignmentTitle,
          instructions: "Write a short essay and submit.",
          dueAt: new Date(y2Term1Artifacts.endDate.getTime() - 7 * 24 * 60 * 60 * 1000),
          maxScore: 20,
          status: "published",
          createdBy: teacher.id,
        })
        .returning()
    )[0];

  if (!y2Assignment) throw new Error("Failed to create Year 2 assignment");

  for (const s of studentsList.slice(0, 8)) {
    const [existingSub] = await db
      .select()
      .from(smsAssignmentSubmissions)
      .where(and(eq(smsAssignmentSubmissions.assignmentId, y2Assignment.id), eq(smsAssignmentSubmissions.studentId, s.id)))
      .limit(1);
    if (!existingSub) {
      await db.insert(smsAssignmentSubmissions).values({
        assignmentId: y2Assignment.id,
        schoolId: school.id,
        studentId: s.id,
        submissionText: `Submission by ${s.name} for ${y2AssignmentTitle}`,
        score: 13 + ((Number(s.studentId?.slice(-2)) || 0) % 7),
        feedback: "Reviewed during simulation.",
        reviewedBy: teacher.id,
        reviewedAt: new Date(),
      } as any);
    }
  }

  const y2SessionDates = [0, 1, 2].map((n) => new Date(y2Term1Artifacts.startDate.getTime() + n * 24 * 60 * 60 * 1000));
  for (let i = 0; i < y2SessionDates.length; i++) {
    const d = y2SessionDates[i]!;
    const [existingSession] = await db
      .select()
      .from(smsAttendanceSessions)
      .where(
        and(
          eq(smsAttendanceSessions.schoolId, school.id),
          eq(smsAttendanceSessions.academicYearId, year2.id),
          eq(smsAttendanceSessions.termId, y2Term1Artifacts.id),
          eq(smsAttendanceSessions.classId, grade10.id),
          eq(smsAttendanceSessions.date, d)
        )
      )
      .limit(1);

    const session =
      existingSession ??
      (
        await db
          .insert(smsAttendanceSessions)
          .values({
            schoolId: school.id,
            academicYearId: year2.id,
            termId: y2Term1Artifacts.id,
            classId: grade10.id,
            sectionId: null,
            subjectId: eng.id,
            date: d,
            status: "locked",
            markedBy: teacher.id,
            submittedBy: teacher.id,
            submittedAt: new Date(),
            lockedBy: admin.id,
            lockedAt: new Date(),
          } as any)
          .returning()
      )[0];

    if (!session) throw new Error("Failed to create Year 2 attendance session");

    for (const s of studentsList) {
      const [existingEntry] = await db
        .select()
        .from(smsAttendanceEntries)
        .where(and(eq(smsAttendanceEntries.sessionId, session.id), eq(smsAttendanceEntries.studentId, s.id)))
        .limit(1);
      if (!existingEntry) {
        const absent = (s.studentId?.endsWith("003") || s.studentId?.endsWith("009")) && i === 2;
        await db.insert(smsAttendanceEntries).values({
          sessionId: session.id,
          schoolId: school.id,
          studentId: s.id,
          status: absent ? "absent" : "present",
          note: absent ? "Absent (simulation)" : null,
          markedBy: teacher.id,
        } as any);
      }
    }
  }

  // Transfer: move transferCandidate from Year 1 -> Year 2 (enrollment + audit table)
  const [candidateY1] = await db
    .select()
    .from(studentEnrollments)
    .where(and(eq(studentEnrollments.schoolId, school.id), eq(studentEnrollments.academicYearId, year1.id), eq(studentEnrollments.studentId, transferCandidate.id)))
    .limit(1);
  if (candidateY1 && candidateY1.status === "active") {
    const [existingY2] = await db
      .select({ id: studentEnrollments.id })
      .from(studentEnrollments)
      .where(and(eq(studentEnrollments.schoolId, school.id), eq(studentEnrollments.academicYearId, year2.id), eq(studentEnrollments.studentId, transferCandidate.id)))
      .limit(1);

    if (!existingY2) {
      await db.update(studentEnrollments).set({ status: "transferred" as any }).where(eq(studentEnrollments.id, candidateY1.id));
      const [newEnroll] = await db
        .insert(studentEnrollments)
        .values({
          schoolId: school.id,
          academicYearId: year2.id,
          termId: year2Terms[0]!.id,
          studentId: transferCandidate.id,
          classId: grade11.id,
          sectionId: grade11A.id,
          status: "active",
        } as any)
        .returning();

      if (newEnroll) {
        await db.insert(smsStudentTransfers).values({
          schoolId: school.id,
          studentId: transferCandidate.id,
          fromAcademicYearId: year1.id,
          toAcademicYearId: year2.id,
          fromClassId: grade10.id,
          toClassId: grade11.id,
          fromSectionId: candidateY1.sectionId,
          toSectionId: grade11A.id,
          transferDate: new Date(),
          reason: "Simulation transfer to validate ERP transfer workflow",
          createdBy: admin.id,
        } as any);
      }
    }
  }

  // Discipline records (Year 2 Term 1)
  const disciplineStudents = studentsList.slice(0, 3);
  for (const s of disciplineStudents) {
    const [existing] = await db
      .select({ id: smsDisciplineRecords.id })
      .from(smsDisciplineRecords)
      .where(and(eq(smsDisciplineRecords.schoolId, school.id), eq(smsDisciplineRecords.studentId, s.id)))
      .limit(1);
    if (existing) continue;
    await db.insert(smsDisciplineRecords).values({
      schoolId: school.id,
      studentId: s.id,
      academicYearId: year2.id,
      termId: year2Terms[0]!.id,
      occurredAt: new Date(),
      category: "behavior",
      severity: s.id === disciplineStudents[0]!.id ? "minor" : "moderate",
      title: "Discipline Incident (Simulation)",
      description: "Generated during production readiness simulation.",
      actionTaken: "Counseling",
      recordedBy: admin.id,
    } as any);
  }

  // Year 2 Term 1 exams + marks for English
  const y2t1 = year2Terms[0]!;
  const [existingY2Exam] = await db
    .select()
    .from(smsExams)
    .where(and(eq(smsExams.schoolId, school.id), eq(smsExams.academicYearId, year2.id), eq(smsExams.termId, y2t1.id), eq(smsExams.name, "Y2 T1 - Opening Assessment")))
    .limit(1);

  const y2Exam =
    existingY2Exam ??
    (
      await db
        .insert(smsExams)
        .values({
          schoolId: school.id,
          academicYearId: year2.id,
          termId: y2t1.id,
          name: "Y2 T1 - Opening Assessment",
          type: "test",
          status: "completed",
        })
        .returning()
    )[0];

  if (!y2Exam) throw new Error("Failed to create Year 2 exam");

  for (const s of studentsList) {
    const [existingMark] = await db
      .select()
      .from(smsExamMarks)
      .where(and(eq(smsExamMarks.examId, y2Exam.id), eq(smsExamMarks.studentId, s.id), eq(smsExamMarks.subjectId, eng.id)))
      .limit(1);
    if (!existingMark) {
      const marks = 40 + ((Number(s.studentId?.slice(-2)) || 0) % 60);
      await db.insert(smsExamMarks).values({
        examId: y2Exam.id,
        studentId: s.id,
        subjectId: eng.id,
        marksObtained: Math.min(100, marks),
        totalMarks: 100,
        remarks: "Simulated Y2",
        gradedBy: teacher.id,
      } as any);
    }
  }

  console.log("Two-year simulation seed complete");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

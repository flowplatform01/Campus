import "./config.js";
import bcrypt from "bcryptjs";
import { eq, and } from "drizzle-orm";
import { db } from "./db.js";
import {
  academicTerms,
  academicYears,
  parentChildren,
  schoolClasses,
  studentEnrollments,
  subjects,
  schools,
  users,
  timetableSlots,
  smsAssignments,
  smsAssignmentSubmissions,
  smsAttendanceSessions,
  smsAttendanceEntries,
  smsExams,
  smsExamMarks,
  smsFeeHeads,
  smsInvoices,
  smsInvoiceLines,
  smsPayments,
  smsPaymentSettings,
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
  if (existing) return { user: existing, created: false };

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
  return { user: created, created: true };
}

async function main() {
  const school = await ensureSchool("Campus Demo School");

  const sampleUsers = [
    {
      email: "admin@campus.demo",
      password: "Campus@12345",
      name: "Demo Admin",
      role: "admin" as const,
      schoolId: school.id,
    },
    {
      email: "teacher@campus.demo",
      password: "Campus@12345",
      name: "Demo Teacher",
      role: "employee" as const,
      subRole: "teacher",
      employeeId: "EMP001",
      schoolId: school.id,
    },
    {
      email: "student@campus.demo",
      password: "Campus@12345",
      name: "Demo Student",
      role: "student" as const,
      studentId: "STU001",
      schoolId: school.id,
    },
    {
      email: "parent@campus.demo",
      password: "Campus@12345",
      name: "Demo Parent",
      role: "parent" as const,
      schoolId: school.id,
    },
  ];

  const results = [] as Array<{ email: string; created: boolean }>;
  for (const u of sampleUsers) {
    const r = await ensureUser(u);
    results.push({ email: u.email, created: r.created });
  }

  const [admin] = await db.select().from(users).where(eq(users.email, "admin@campus.demo")).limit(1);
  const [teacher] = await db.select().from(users).where(eq(users.email, "teacher@campus.demo")).limit(1);
  const [student] = await db.select().from(users).where(eq(users.email, "student@campus.demo")).limit(1);
  const [parent] = await db.select().from(users).where(eq(users.email, "parent@campus.demo")).limit(1);
  if (!admin || !teacher || !student || !parent) throw new Error("Seed users missing");

  const [existingLink] = await db
    .select()
    .from(parentChildren)
    .where(eq(parentChildren.parentId, parent.id))
    .limit(1);
  if (!existingLink) {
    try {
      await db.insert(parentChildren).values({ parentId: parent.id, childId: student.id });
    } catch (e) {
      console.error("Failed to link parent-child:", e);
    }
  }

  let [year] = await db
    .select()
    .from(academicYears)
    .where(eq(academicYears.schoolId, school.id))
    .limit(1);

  if (!year) {
    const now = new Date();
    const startDate = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const endDate = new Date(Date.UTC(now.getUTCFullYear(), 11, 31));
    const [createdYear] = await db
      .insert(academicYears)
      .values({
        schoolId: school.id,
        name: `${now.getUTCFullYear()}/${now.getUTCFullYear() + 1}`,
        startDate,
        endDate,
        isActive: true,
      })
      .returning();
    year = createdYear;
  }

  let [term] = await db
    .select()
    .from(academicTerms)
    .where(eq(academicTerms.academicYearId, year!.id))
    .limit(1);
  if (!term) {
    const [createdTerm] = await db
      .insert(academicTerms)
      .values({
        schoolId: school.id,
        academicYearId: year!.id,
        name: "Term 1",
        startDate: year!.startDate,
        endDate: year!.endDate,
        isActive: true,
      })
      .returning();
    term = createdTerm;
  } else {
    await db.update(academicTerms).set({ isActive: true }).where(eq(academicTerms.id, term.id));
  }

  let [cls] = await db
    .select()
    .from(schoolClasses)
    .where(eq(schoolClasses.schoolId, school.id))
    .limit(1);
  if (!cls) {
    const [createdClass] = await db
      .insert(schoolClasses)
      .values({ schoolId: school.id, name: "Grade 10", sortOrder: 10 })
      .returning();
    cls = createdClass;
  }

  let [subj] = await db
    .select()
    .from(subjects)
    .where(eq(subjects.schoolId, school.id))
    .limit(1);
  if (!subj) {
    const [createdSubject] = await db
      .insert(subjects)
      .values({ schoolId: school.id, name: "Mathematics", code: "MATH" })
      .returning();
    subj = createdSubject;
  }

  const [enrollment] = await db
    .select()
    .from(studentEnrollments)
    .where(eq(studentEnrollments.studentId, student.id))
    .limit(1);
  if (!enrollment) {
    await db.insert(studentEnrollments).values({
      schoolId: school.id,
      academicYearId: year!.id,
      studentId: student.id,
      classId: cls!.id,
      sectionId: null,
      status: "active",
    });
  }

  const [existingSlot] = await db.select().from(timetableSlots).where(eq(timetableSlots.schoolId, school.id)).limit(1);
  if (!existingSlot && year && term && cls && subj && teacher) {
    const days = ["mon", "tue", "wed", "thu", "fri"] as const;
    for (let i = 0; i < 5; i++) {
      await db.insert(timetableSlots).values({
        schoolId: school.id,
        academicYearId: year.id,
        termId: term.id,
        classId: cls.id,
        sectionId: null,
        weekday: days[i],
        startTime: "08:00",
        endTime: "09:00",
        subjectId: subj.id,
        teacherId: teacher.id,
        room: "Room 1",
      } as typeof timetableSlots.$inferInsert);
    }
  }

  //
  // --- Enterprise simulation seed: exams, assignments, attendance, and finance ---
  //

  if (year && term && cls && subj && teacher && student) {
    // Payment settings (manual methods only, future‑proof for gateways)
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

    // Fee head
    const [tuitionHead] = await db
      .select()
      .from(smsFeeHeads)
      .where(and(eq(smsFeeHeads.schoolId, school.id), eq(smsFeeHeads.name, "Tuition")))
      .limit(1);
    const feeHead =
      tuitionHead ??
      (
        await db
          .insert(smsFeeHeads)
          .values({
            schoolId: school.id,
            name: "Tuition",
            code: "TUITION",
          })
          .returning()
      )[0];

    // Invoice + payment for demo student
    const [existingInvoice] = await db
      .select()
      .from(smsInvoices)
      .where(
        and(
          eq(smsInvoices.schoolId, school.id),
          eq(smsInvoices.studentId, student.id),
          eq(smsInvoices.academicYearId, year.id),
        ),
      )
      .limit(1);

    let invoice = existingInvoice;
    if (!invoice) {
      const [createdInvoice] = await db
        .insert(smsInvoices)
        .values({
          schoolId: school.id,
          academicYearId: year.id,
          termId: term.id,
          studentId: student.id,
          status: "open",
          subtotalAmount: 50000,
          totalAmount: 50000,
          createdBy: admin.id,
        })
        .returning();
      invoice = createdInvoice;

      if (invoice) {
        await db.insert(smsInvoiceLines).values({
          invoiceId: invoice.id,
          schoolId: school.id,
          feeHeadId: feeHead?.id,
          description: "Tuition Fees (Demo Term)",
          amount: 50000,
        });
      }
    }

    const [existingPayment] = invoice
      ? await db
          .select()
          .from(smsPayments)
          .where(
            and(
              eq(smsPayments.schoolId, school.id),
              eq(smsPayments.invoiceId, invoice.id),
              eq(smsPayments.studentId, student.id),
            ),
          )
          .limit(1)
      : [null];

    if (invoice && !existingPayment) {
      await db.insert(smsPayments).values({
        schoolId: school.id,
        invoiceId: invoice.id,
        studentId: student.id,
        amount: 30000,
        method: "cash",
        reference: "DEMO-PAYMENT-001",
        recordedBy: admin.id,
      });
    }

    // Exam + marks
    const [demoExam] = await db
      .select()
      .from(smsExams)
      .where(
        and(
          eq(smsExams.schoolId, school.id),
          eq(smsExams.academicYearId, year.id),
          eq(smsExams.termId, term.id),
          eq(smsExams.name, "Demo Midterm Exam"),
        ),
      )
      .limit(1);

    const exam =
      demoExam ??
      (
        await db
          .insert(smsExams)
          .values({
            schoolId: school.id,
            academicYearId: year.id,
            termId: term.id,
            name: "Demo Midterm Exam",
            type: "exam",
            status: "completed",
          })
          .returning()
      )[0];

    if (exam) {
      const [existingMark] = await db
        .select()
        .from(smsExamMarks)
        .where(
          and(
            eq(smsExamMarks.examId, exam.id),
            eq(smsExamMarks.studentId, student.id),
            eq(smsExamMarks.subjectId, subj.id),
          ),
        )
        .limit(1);
      if (!existingMark) {
        await db.insert(smsExamMarks).values({
          examId: exam.id,
          studentId: student.id,
          subjectId: subj.id,
          marksObtained: 78,
          totalMarks: 100,
          remarks: "Solid performance for demo",
          gradedBy: teacher.id,
        });
      }
    }

    // Assignment + submission
    const [demoAssignment] = await db
      .select()
      .from(smsAssignments)
      .where(
        and(
          eq(smsAssignments.schoolId, school.id),
          eq(smsAssignments.academicYearId, year.id),
          eq(smsAssignments.termId, term.id),
          eq(smsAssignments.classId, cls.id),
          eq(smsAssignments.subjectId, subj.id),
          eq(smsAssignments.title, "Algebra Homework 1"),
        ),
      )
      .limit(1);

    const assignment =
      demoAssignment ??
      (
        await db
          .insert(smsAssignments)
          .values({
            schoolId: school.id,
            academicYearId: year.id,
            termId: term.id,
            classId: cls.id,
            sectionId: null,
            subjectId: subj.id,
            title: "Algebra Homework 1",
            instructions: "Solve the attached algebra problems.",
            dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            maxScore: 20,
            status: "published",
            createdBy: teacher.id,
          })
          .returning()
      )[0];

    if (assignment) {
      const [existingSubmission] = await db
        .select()
        .from(smsAssignmentSubmissions)
        .where(
          and(
            eq(smsAssignmentSubmissions.assignmentId, assignment.id),
            eq(smsAssignmentSubmissions.schoolId, school.id),
            eq(smsAssignmentSubmissions.studentId, student.id),
          ),
        )
        .limit(1);
      if (!existingSubmission) {
        await db.insert(smsAssignmentSubmissions).values({
          assignmentId: assignment.id,
          schoolId: school.id,
          studentId: student.id,
          submissionText: "Demo submission for Algebra Homework 1.",
          score: 16,
          feedback: "Good effort in the demo seed.",
          reviewedBy: teacher.id,
        });
      }
    }

    // Attendance: create a small spread of sessions
    const today = new Date();
    const sessionDates = [0, -1, -2].map((offset) => {
      const d = new Date(today);
      d.setDate(d.getDate() + offset);
      return d;
    });

    for (let index = 0; index < sessionDates.length; index++) {
      const sessionDate = sessionDates[index]!;
      const [existingSession] = await db
        .select()
        .from(smsAttendanceSessions)
        .where(
          and(
            eq(smsAttendanceSessions.schoolId, school.id),
            eq(smsAttendanceSessions.academicYearId, year.id),
            eq(smsAttendanceSessions.termId, term.id),
            eq(smsAttendanceSessions.classId, cls.id),
            eq(smsAttendanceSessions.date, sessionDate),
          ),
        )
        .limit(1);

      const session =
        existingSession ??
        (
          await db
            .insert(smsAttendanceSessions)
            .values({
              schoolId: school.id,
              academicYearId: year.id,
              termId: term.id,
              classId: cls.id,
              sectionId: null,
              subjectId: subj.id,
              date: sessionDate,
              status: "submitted",
              markedBy: teacher.id,
              submittedBy: teacher.id,
              submittedAt: new Date(),
            })
            .returning()
        )[0];

      if (session) {
        const [existingEntry] = await db
          .select()
          .from(smsAttendanceEntries)
          .where(
            and(
              eq(smsAttendanceEntries.sessionId, session.id),
              eq(smsAttendanceEntries.schoolId, school.id),
              eq(smsAttendanceEntries.studentId, student.id),
            ),
          )
          .limit(1);
        if (!existingEntry) {
          await db.insert(smsAttendanceEntries).values({
            sessionId: session.id,
            schoolId: school.id,
            studentId: student.id,
            status: index === 1 ? "absent" : "present",
            note: index === 1 ? "Demo seeded absence" : null,
            markedBy: teacher.id,
          });
        }
      }
    }
  }

  console.log("Seed complete");
  for (const r of results) {
    console.log(`${r.created ? "CREATED" : "EXISTS"} - ${r.email}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

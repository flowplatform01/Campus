import { Router } from "express";
import { eq, desc, and, isNotNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db.js";
import {
  users,
  schools,
  academicYears,
  academicTerms,
  schoolClasses,
  classSections,
  subjects,
  smsAssignments,
  smsAssignmentSubmissions,
  smsAttendanceSessions,
  smsAttendanceEntries,
  timetableSlots,
  timetablePublications,
  studentEnrollments,
  InsertAssignmentSubmission
} from "@shared/schema";
import { requireAuth, AuthRequest, requireTenantAccess, validateTenantAccess } from "../middleware/auth.js";

const router = Router();

// Get student's grades for current academic context
router.get("/grades", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const studentId = req.query.studentId as string || req.user!.id;
    const { academicYearId, termId } = req.query;
    const userSchoolId = req.user!.schoolId!;
    
    // Get student's current enrollment scoped to tenant
    const [enrollment] = await db
      .select()
      .from(studentEnrollments)
      .where(
        and(
          eq(studentEnrollments.studentId, studentId),
          eq(studentEnrollments.schoolId, userSchoolId),
          academicYearId ? eq(studentEnrollments.academicYearId, academicYearId as string) : undefined,
          termId ? eq(studentEnrollments.termId, termId as string) : undefined,
          eq(studentEnrollments.status, "active")
        )
      )
      .limit(1);

    if (!enrollment) {
      return res.json([]);
    }

    // Get assignment submissions with grades for this student, scoped to tenant
    const submissions = await db
      .select({
        assignment: {
          id: smsAssignments.id,
          title: smsAssignments.title,
          maxScore: smsAssignments.maxScore,
          dueAt: smsAssignments.dueAt,
          subjectId: smsAssignments.subjectId,
        },
        submission: {
          score: smsAssignmentSubmissions.score,
          feedback: smsAssignmentSubmissions.feedback,
          submittedAt: smsAssignmentSubmissions.submittedAt,
          reviewedAt: smsAssignmentSubmissions.reviewedAt,
        },
        subject: {
          name: subjects.name,
          code: subjects.code,
        }
      })
      .from(smsAssignmentSubmissions)
      .innerJoin(smsAssignments, eq(smsAssignmentSubmissions.assignmentId, smsAssignments.id))
      .innerJoin(subjects, eq(smsAssignments.subjectId, subjects.id))
      .where(
        and(
          eq(smsAssignmentSubmissions.studentId, studentId),
          eq(smsAssignmentSubmissions.schoolId, userSchoolId),
          eq(smsAssignments.schoolId, userSchoolId),
          eq(smsAssignments.academicYearId, enrollment.academicYearId),
          termId ? eq(smsAssignments.termId, termId as string) : undefined,
          isNotNull(smsAssignmentSubmissions.score) // Only return graded submissions
        )
      )
      .orderBy(desc(smsAssignmentSubmissions.submittedAt));

    return res.json(submissions);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to fetch grades" });
  }
});

// Get assignments for current academic context
router.get("/assignments", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const { academicYearId, termId, classId, sectionId, subjectId } = req.query;
    const user = req.user!;
    const userSchoolId = user.schoolId!;

    // For students, get their assignments
    if (user.role === 'student') {
      const [enrollment] = await db
        .select()
        .from(studentEnrollments)
        .where(
          and(
            eq(studentEnrollments.studentId, user.id),
            academicYearId ? eq(studentEnrollments.academicYearId, academicYearId as string) : undefined,
            termId ? eq(studentEnrollments.termId, termId as string) : undefined,
            eq(studentEnrollments.status, "active")
          )
        )
        .limit(1);

      if (!enrollment) {
        return res.json([]);
      }

      const assignments = await db
        .select({
          assignment: smsAssignments,
          subject: subjects.name,
          submission: smsAssignmentSubmissions,
        })
        .from(smsAssignments)
        .innerJoin(subjects, eq(smsAssignments.subjectId, subjects.id))
        .leftJoin(smsAssignmentSubmissions, 
          and(
            eq(smsAssignmentSubmissions.assignmentId, smsAssignments.id),
            eq(smsAssignmentSubmissions.studentId, user.id)
          )
        )
        .where(
          and(
            eq(smsAssignments.schoolId, userSchoolId),
            eq(smsAssignments.academicYearId, enrollment.academicYearId),
            termId ? eq(smsAssignments.termId, termId as string) : undefined,
            classId ? eq(smsAssignments.classId, classId as string) : undefined,
            sectionId ? eq(smsAssignments.sectionId, sectionId as string) : undefined,
            subjectId ? eq(smsAssignments.subjectId, subjectId as string) : undefined,
            eq(smsAssignments.status, "published")
          )
        )
        .orderBy(desc(smsAssignments.dueAt));

      return res.json(assignments);
    } 
    // For staff, get assignments they can manage
    else if (user.role === 'admin' || user.role === 'employee') {
      const assignments = await db
        .select({
          assignment: smsAssignments,
          subject: subjects.name,
          class: schoolClasses.name,
          section: classSections.name,
        })
        .from(smsAssignments)
        .innerJoin(subjects, eq(smsAssignments.subjectId, subjects.id))
        .leftJoin(schoolClasses, eq(smsAssignments.classId, schoolClasses.id))
        .leftJoin(classSections, eq(smsAssignments.sectionId, classSections.id))
        .where(
          and(
            eq(smsAssignments.schoolId, userSchoolId),
            academicYearId ? eq(smsAssignments.academicYearId, academicYearId as string) : undefined,
            termId ? eq(smsAssignments.termId, termId as string) : undefined,
            classId ? eq(smsAssignments.classId, classId as string) : undefined,
            sectionId ? eq(smsAssignments.sectionId, sectionId as string) : undefined,
            subjectId ? eq(smsAssignments.subjectId, subjectId as string) : undefined
          )
        )
        .orderBy(desc(smsAssignments.dueAt));

      return res.json(assignments);
    }

    return res.json([]);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to fetch assignments" });
  }
});

// Submit assignment with file upload
router.post("/assignments/:id/submit", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const { submissionText } = req.body;
    const assignmentId = req.params.id!;
    const studentId = req.user!.id;
    const userSchoolId = req.user!.schoolId!;

    // Verify assignment exists and is published
    const [assignment] = await db
      .select()
      .from(smsAssignments)
      .where(eq(smsAssignments.id, assignmentId))
      .limit(1);

    if (!assignment || assignment.status !== "published") {
      return res.status(404).json({ message: "Assignment not found or not published" });
    }

    if (!validateTenantAccess(userSchoolId, assignment.schoolId ?? "")) {
      return res.status(403).json({ message: "Cross-tenant access denied" });
    }

    // Check if already submitted
    const [existingSubmission] = await db
      .select()
      .from(smsAssignmentSubmissions)
      .where(
        and(
          eq(smsAssignmentSubmissions.assignmentId, assignmentId),
          eq(smsAssignmentSubmissions.studentId, studentId),
          eq(smsAssignmentSubmissions.schoolId, userSchoolId)
        )
      )
      .limit(1);

    if (existingSubmission) {
      return res.status(400).json({ message: "Assignment already submitted" });
    }

    // Create submission
    const submissionData: InsertAssignmentSubmission = {
      assignmentId,
      studentId,
      schoolId: userSchoolId,
      submissionText: submissionText || null,
    };
    
    const [submission] = await db
      .insert(smsAssignmentSubmissions)
      .values(submissionData)
      .returning();

    return res.status(201).json(submission);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to submit assignment" });
  }
});

// Get attendance records
router.get("/attendance", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const { academicYearId, termId, classId, sectionId, studentId } = req.query;
    const user = req.user!;
    const userSchoolId = user.schoolId!;

    // For students, get their attendance
    if (user.role === 'student') {
      const attendanceRecords = await db
        .select({
          entry: smsAttendanceEntries,
          session: {
            date: smsAttendanceSessions.date,
            subjectId: smsAttendanceSessions.subjectId,
          },
          subject: subjects.name,
        })
        .from(smsAttendanceEntries)
        .innerJoin(smsAttendanceSessions, eq(smsAttendanceEntries.sessionId, smsAttendanceSessions.id))
        .innerJoin(subjects, eq(smsAttendanceSessions.subjectId, subjects.id))
        .where(
          and(
            eq(smsAttendanceEntries.studentId, (studentId as string) || user.id),
            eq(smsAttendanceEntries.schoolId, userSchoolId),
            eq(smsAttendanceSessions.schoolId, userSchoolId),
            academicYearId ? eq(smsAttendanceSessions.academicYearId, academicYearId as string) : undefined,
            termId ? eq(smsAttendanceSessions.termId, termId as string) : undefined,
            classId ? eq(smsAttendanceSessions.classId, classId as string) : undefined,
            sectionId ? eq(smsAttendanceSessions.sectionId, sectionId as string) : undefined
          )
        )
        .orderBy(desc(smsAttendanceSessions.date));

      return res.json(attendanceRecords);
    }
    // For staff, get attendance for classes they manage
    else if (user.role === 'admin' || user.role === 'employee') {
      const attendanceRecords = await db
        .select({
          entry: smsAttendanceEntries,
          session: {
            date: smsAttendanceSessions.date,
            subjectId: smsAttendanceSessions.subjectId,
          },
          subject: subjects.name,
          student: {
            name: users.name,
            studentId: users.studentId,
          },
        })
        .from(smsAttendanceEntries)
        .innerJoin(smsAttendanceSessions, eq(smsAttendanceEntries.sessionId, smsAttendanceSessions.id))
        .innerJoin(subjects, eq(smsAttendanceSessions.subjectId, subjects.id))
        .innerJoin(users, eq(smsAttendanceEntries.studentId, users.id))
        .where(
          and(
            eq(smsAttendanceEntries.schoolId, userSchoolId),
            eq(smsAttendanceSessions.schoolId, userSchoolId),
            academicYearId ? eq(smsAttendanceSessions.academicYearId, academicYearId as string) : undefined,
            termId ? eq(smsAttendanceSessions.termId, termId as string) : undefined,
            classId ? eq(smsAttendanceSessions.classId, classId as string) : undefined,
            sectionId ? eq(smsAttendanceSessions.sectionId, sectionId as string) : undefined
          )
        )
        .orderBy(desc(smsAttendanceSessions.date));

      return res.json(attendanceRecords);
    }

    return res.json([]);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to fetch attendance" });
  }
});

// Get timetable/schedule
router.get("/schedule", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const { academicYearId, termId, classId, sectionId } = req.query;
    const user = req.user!;
    const userSchoolId = user.schoolId!;

    // Check if timetable is published
    const [publication] = await db
      .select()
      .from(timetablePublications)
      .where(
        and(
          eq(timetablePublications.schoolId, userSchoolId),
          academicYearId ? eq(timetablePublications.academicYearId, academicYearId as string) : undefined,
          termId ? eq(timetablePublications.termId, termId as string) : undefined,
          classId ? eq(timetablePublications.classId, classId as string) : undefined,
          sectionId ? eq(timetablePublications.sectionId, sectionId as string) : undefined,
          eq(timetablePublications.status, "published")
        )
      )
      .limit(1);

    if (!publication) {
      return res.json([]);
    }

    // Get timetable slots
    const schedule = await db
      .select({
        slot: timetableSlots,
        subject: subjects.name,
        teacher: users.name,
      })
      .from(timetableSlots)
      .innerJoin(subjects, eq(timetableSlots.subjectId, subjects.id))
      .innerJoin(users, eq(timetableSlots.teacherId, users.id))
      .where(
        and(
          eq(timetableSlots.schoolId, userSchoolId),
          eq(timetableSlots.academicYearId, publication.academicYearId),
          eq(timetableSlots.termId, publication.termId),
          eq(timetableSlots.classId, publication.classId),
          sectionId ? eq(timetableSlots.sectionId, sectionId as string) : undefined
        )
      )
      .orderBy(timetableSlots.weekday, timetableSlots.startTime);

    return res.json(schedule);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to fetch schedule" });
  }
});

export default router;

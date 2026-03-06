import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireTenantAccess, AuthRequest } from "../middleware/auth.js";
import { 
  generateStudentReport, 
  generateClassReport, 
  generateAttendanceReport, 
  generatePDFReport, 
  generateExcelReport 
} from "../services/export-service.js";
import { db } from "../db.js";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { parentChildren, smsAssignments, smsAssignmentSubmissions, studentEnrollments, subjects } from "@shared/schema";
import { logAudit } from "../services/audit-service.js";

const router = Router();

// Export student academic report
router.get("/student/:studentId/pdf", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const { studentId } = req.params;
    if (!studentId) return res.status(400).json({ message: "Student ID is required" });
    const schoolId = req.user!.schoolId;
    if (!schoolId) return res.status(400).json({ message: "No school linked" });
    const academicYearId = req.query.academicYearId as string | undefined;
    const termId = req.query.termId as string | undefined;
    const examId = req.query.examId as string | undefined;
    if (!academicYearId || !termId) {
      return res.status(400).json({ message: "academicYearId and termId are required" });
    }

    const reportData = await generateStudentReport(schoolId, studentId, academicYearId, termId, examId);
    const pdfBuffer = await generatePDFReport(reportData, 'student');
    await logAudit({
      action: "report_export",
      entityType: "report",
      entityId: studentId,
      actorId: req.user!.id,
      schoolId,
      meta: { type: "student_pdf", academicYearId, termId, examId },
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="student-report-${studentId}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating student PDF report:', error);
    res.status(500).json({ message: 'Failed to generate report' });
  }
});

router.get("/student/:studentId/excel", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const { studentId } = req.params;
    if (!studentId) return res.status(400).json({ message: "Student ID is required" });
    const schoolId = req.user!.schoolId;
    if (!schoolId) return res.status(400).json({ message: "No school linked" });
    const academicYearId = req.query.academicYearId as string | undefined;
    const termId = req.query.termId as string | undefined;
    const examId = req.query.examId as string | undefined;
    if (!academicYearId || !termId) {
      return res.status(400).json({ message: "academicYearId and termId are required" });
    }

    const reportData = await generateStudentReport(schoolId, studentId, academicYearId, termId, examId);
    const excelBuffer = await generateExcelReport([reportData], 'student');
    await logAudit({
      action: "report_export",
      entityType: "report",
      entityId: studentId,
      actorId: req.user!.id,
      schoolId,
      meta: { type: "student_excel", academicYearId, termId, examId },
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="student-report-${studentId}.csv"`);
    res.send(excelBuffer);
  } catch (error) {
    console.error('Error generating student Excel report:', error);
    res.status(500).json({ message: 'Failed to generate report' });
  }
});

// Export class performance report
router.get("/class/:classId/pdf", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const { classId } = req.params;
    if (!classId) return res.status(400).json({ message: "Class ID is required" });
    const schoolId = req.user!.schoolId;
    if (!schoolId) return res.status(400).json({ message: "No school linked" });
    const academicYearId = req.query.academicYearId as string | undefined;
    const termId = req.query.termId as string | undefined;
    const examId = req.query.examId as string | undefined;
    if (!academicYearId || !termId) {
      return res.status(400).json({ message: "academicYearId and termId are required" });
    }

    const reportData = await generateClassReport(schoolId, classId, academicYearId, termId, examId);
    const pdfBuffer = await generatePDFReport(reportData, 'class');
    await logAudit({
      action: "report_export",
      entityType: "report",
      entityId: classId,
      actorId: req.user!.id,
      schoolId,
      meta: { type: "class_pdf", academicYearId, termId, examId },
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="class-report-${classId}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating class PDF report:', error);
    res.status(500).json({ message: 'Failed to generate report' });
  }
});

router.get("/class/:classId/excel", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const { classId } = req.params;
    if (!classId) return res.status(400).json({ message: "Class ID is required" });
    const schoolId = req.user!.schoolId;
    if (!schoolId) return res.status(400).json({ message: "No school linked" });
    const academicYearId = req.query.academicYearId as string | undefined;
    const termId = req.query.termId as string | undefined;
    const examId = req.query.examId as string | undefined;
    if (!academicYearId || !termId) {
      return res.status(400).json({ message: "academicYearId and termId are required" });
    }

    const reportData = await generateClassReport(schoolId, classId, academicYearId, termId, examId);
    const excelBuffer = await generateExcelReport(reportData.students, 'class_performance');
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="class-report-${classId}.csv"`);
    res.send(excelBuffer);
  } catch (error) {
    console.error('Error generating class Excel report:', error);
    res.status(500).json({ message: 'Failed to generate report' });
  }
});

// Export attendance report
router.get("/attendance/pdf", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const classId = req.query.classId as string | undefined;
    const academicYearId = req.query.academicYearId as string | undefined;
    const termId = req.query.termId as string | undefined;
    if (!classId || !academicYearId || !termId) {
      return res.status(400).json({ message: "classId, academicYearId, and termId are required" });
    }

    const schoolId = req.user!.schoolId;
    if (!schoolId) return res.status(400).json({ message: "No school linked" });
    const reportData = await generateAttendanceReport(schoolId, classId, academicYearId, termId);
    const pdfBuffer = await generatePDFReport(reportData, 'attendance');
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="attendance-report.pdf"');
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating attendance PDF report:', error);
    res.status(500).json({ message: 'Failed to generate report' });
  }
});

router.get("/attendance/excel", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const classId = req.query.classId as string | undefined;
    const academicYearId = req.query.academicYearId as string | undefined;
    const termId = req.query.termId as string | undefined;
    if (!classId || !academicYearId || !termId) {
      return res.status(400).json({ message: "classId, academicYearId, and termId are required" });
    }

    const schoolId = req.user!.schoolId;
    if (!schoolId) return res.status(400).json({ message: "No school linked" });
    const reportData = await generateAttendanceReport(schoolId, classId, academicYearId, termId);
    const excelBuffer = await generateExcelReport(reportData.records, 'attendance');
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="attendance-report.csv"');
    res.send(excelBuffer);
  } catch (error) {
    console.error('Error generating attendance Excel report:', error);
    res.status(500).json({ message: 'Failed to generate report' });
  }
});

// Export assignments data
router.get("/assignments/csv", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const schoolId = user.schoolId;
    if (!schoolId) return res.status(400).json({ message: "No school linked" });

    const academicYearId = typeof req.query.academicYearId === "string" ? req.query.academicYearId : undefined;
    const termId = typeof req.query.termId === "string" ? req.query.termId : undefined;
    const classId = typeof req.query.classId === "string" ? req.query.classId : undefined;
    const assignmentStatus = typeof req.query.status === "string" ? req.query.status : undefined;

    let effectiveStudentId: string | null = null;
    if (user.role === "student") {
      effectiveStudentId = user.id;
    } else if (user.role === "parent") {
      const links = await db
        .select({ childId: parentChildren.childId })
        .from(parentChildren)
        .where(eq(parentChildren.parentId, user.id));
      effectiveStudentId = links[0]?.childId ?? null;
    }

    let whereParts: any[] = [eq(smsAssignments.schoolId, schoolId)];
    if (academicYearId) whereParts.push(eq(smsAssignments.academicYearId, academicYearId));
    if (termId) whereParts.push(eq(smsAssignments.termId, termId));
    if (classId) whereParts.push(eq(smsAssignments.classId, classId));
    if (assignmentStatus) whereParts.push(eq(smsAssignments.status, assignmentStatus));

    if (user.role === "student" || user.role === "parent") {
      if (!effectiveStudentId) {
        return res.status(400).json({ message: "No student linked" });
      }

      const enrollmentWhere = [
        eq(studentEnrollments.schoolId, schoolId),
        eq(studentEnrollments.studentId, effectiveStudentId),
        eq(studentEnrollments.status, "active"),
      ] as any[];
      if (academicYearId) enrollmentWhere.push(eq(studentEnrollments.academicYearId, academicYearId));

      const [enrollment] = await db
        .select({
          academicYearId: studentEnrollments.academicYearId,
          termId: studentEnrollments.termId,
          classId: studentEnrollments.classId,
          sectionId: studentEnrollments.sectionId,
        })
        .from(studentEnrollments)
        .where(and(...enrollmentWhere))
        .orderBy(desc(studentEnrollments.createdAt))
        .limit(1);

      const escapeCsv = (v: unknown) => {
        const s = String(v ?? "");
        return `\"${s.replace(/\"/g, '\"\"')}\"`;
      };

      if (!enrollment) {
        const header = ["Assignment ID", "Title", "Subject", "Due Date", "Status", "Submitted", "Score"].join(",") + "\n";
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", "attachment; filename=\"assignments.csv\"");
        return res.send(header);
      }

      whereParts = [
        eq(smsAssignments.schoolId, schoolId),
        eq(smsAssignments.academicYearId, enrollment.academicYearId),
        eq(smsAssignments.classId, enrollment.classId),
        eq(smsAssignments.status, "published"),
        enrollment.sectionId ? eq(smsAssignments.sectionId, enrollment.sectionId) : isNull(smsAssignments.sectionId),
      ];
      if (termId) whereParts.push(eq(smsAssignments.termId, termId));
    }

    const assignments = await db
      .select({
        id: smsAssignments.id,
        title: smsAssignments.title,
        dueAt: smsAssignments.dueAt,
        status: smsAssignments.status,
        subjectName: subjects.name,
      })
      .from(smsAssignments)
      .leftJoin(subjects, eq(subjects.id, smsAssignments.subjectId))
      .where(and(...whereParts))
      .orderBy(desc(smsAssignments.dueAt))
      .limit(5000);

    const assignmentIds = assignments.map((a) => a.id);
    const submissionsByAssignment = new Map<string, { submitted: boolean; score?: number | null }>();
    if (assignmentIds.length > 0 && (user.role === "student" || user.role === "parent")) {
      const subs = await db
        .select({
          assignmentId: smsAssignmentSubmissions.assignmentId,
          score: smsAssignmentSubmissions.score,
        })
        .from(smsAssignmentSubmissions)
        .where(
          and(
            eq(smsAssignmentSubmissions.schoolId, schoolId),
            eq(smsAssignmentSubmissions.studentId, effectiveStudentId!),
            inArray(smsAssignmentSubmissions.assignmentId, assignmentIds)
          )
        );
      for (const s of subs) {
        submissionsByAssignment.set(s.assignmentId, { submitted: true, score: s.score });
      }
    }

    const escapeCsv = (v: unknown) => {
      const s = String(v ?? "");
      return `\"${s.replace(/\"/g, '\"\"')}\"`;
    };

    const header = ["Assignment ID", "Title", "Subject", "Due Date", "Status", "Submitted", "Score"].join(",") + "\n";
    const rows = assignments
      .map((a) => {
        const sub = submissionsByAssignment.get(a.id);
        const submitted = sub?.submitted ? "yes" : "no";
        const score = typeof sub?.score === "number" ? sub.score : "";
        return [
          escapeCsv(a.id),
          escapeCsv(a.title),
          escapeCsv(a.subjectName ?? ""),
          escapeCsv(a.dueAt ? new Date(a.dueAt as any).toISOString() : ""),
          escapeCsv(a.status),
          escapeCsv(submitted),
          escapeCsv(score),
        ].join(",");
      })
      .join("\n");

    await logAudit({
      action: "export_assignments_csv",
      entityType: "assignment",
      actorId: user.id,
      schoolId,
      meta: { academicYearId, termId, classId, status: assignmentStatus, role: user.role },
    });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=\"assignments.csv\"");
    res.send(header + (rows ? rows + "\n" : ""));
  } catch (error) {
    console.error('Error exporting assignments:', error);
    res.status(500).json({ message: 'Failed to export assignments' });
  }
});

export default router;

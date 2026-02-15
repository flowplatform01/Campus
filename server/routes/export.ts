import { Router } from "express";
import { z } from "zod";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { 
  generateStudentReport, 
  generateClassReport, 
  generateAttendanceReport, 
  generatePDFReport, 
  generateExcelReport 
} from "../services/export-service.js";

const router = Router();

// Export student academic report
router.get("/student/:studentId/pdf", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { studentId } = req.params;
    if (!studentId) return res.status(400).json({ message: "Student ID is required" });
    const academicYearId = req.query.academicYearId as string | undefined;
    const termId = req.query.termId as string | undefined;
    if (!academicYearId || !termId) {
      return res.status(400).json({ message: "academicYearId and termId are required" });
    }

    const reportData = await generateStudentReport(studentId, academicYearId, termId);
    const pdfBuffer = await generatePDFReport(reportData, 'student');
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="student-report-${studentId}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating student PDF report:', error);
    res.status(500).json({ message: 'Failed to generate report' });
  }
});

router.get("/student/:studentId/excel", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { studentId } = req.params;
    if (!studentId) return res.status(400).json({ message: "Student ID is required" });
    const academicYearId = req.query.academicYearId as string | undefined;
    const termId = req.query.termId as string | undefined;
    if (!academicYearId || !termId) {
      return res.status(400).json({ message: "academicYearId and termId are required" });
    }

    const reportData = await generateStudentReport(studentId, academicYearId, termId);
    const excelBuffer = await generateExcelReport([reportData], 'student');
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="student-report-${studentId}.xlsx"`);
    res.send(excelBuffer);
  } catch (error) {
    console.error('Error generating student Excel report:', error);
    res.status(500).json({ message: 'Failed to generate report' });
  }
});

// Export class performance report
router.get("/class/:classId/pdf", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { classId } = req.params;
    if (!classId) return res.status(400).json({ message: "Class ID is required" });
    const academicYearId = req.query.academicYearId as string | undefined;
    const termId = req.query.termId as string | undefined;
    if (!academicYearId || !termId) {
      return res.status(400).json({ message: "academicYearId and termId are required" });
    }

    const reportData = await generateClassReport(classId, academicYearId, termId);
    const pdfBuffer = await generatePDFReport(reportData, 'class');
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="class-report-${classId}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating class PDF report:', error);
    res.status(500).json({ message: 'Failed to generate report' });
  }
});

router.get("/class/:classId/excel", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { classId } = req.params;
    if (!classId) return res.status(400).json({ message: "Class ID is required" });
    const academicYearId = req.query.academicYearId as string | undefined;
    const termId = req.query.termId as string | undefined;
    if (!academicYearId || !termId) {
      return res.status(400).json({ message: "academicYearId and termId are required" });
    }

    const reportData = await generateClassReport(classId, academicYearId, termId);
    const excelBuffer = await generateExcelReport(reportData.students, 'class_performance');
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="class-report-${classId}.xlsx"`);
    res.send(excelBuffer);
  } catch (error) {
    console.error('Error generating class Excel report:', error);
    res.status(500).json({ message: 'Failed to generate report' });
  }
});

// Export attendance report
router.get("/attendance/pdf", requireAuth, async (req: AuthRequest, res) => {
  try {
    const classId = req.query.classId as string | undefined;
    const academicYearId = req.query.academicYearId as string | undefined;
    const termId = req.query.termId as string | undefined;
    if (!classId || !academicYearId || !termId) {
      return res.status(400).json({ message: "classId, academicYearId, and termId are required" });
    }

    const reportData = await generateAttendanceReport(classId, academicYearId, termId);
    const pdfBuffer = await generatePDFReport(reportData, 'attendance');
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="attendance-report.pdf"');
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating attendance PDF report:', error);
    res.status(500).json({ message: 'Failed to generate report' });
  }
});

router.get("/attendance/excel", requireAuth, async (req: AuthRequest, res) => {
  try {
    const classId = req.query.classId as string | undefined;
    const academicYearId = req.query.academicYearId as string | undefined;
    const termId = req.query.termId as string | undefined;
    if (!classId || !academicYearId || !termId) {
      return res.status(400).json({ message: "classId, academicYearId, and termId are required" });
    }

    const reportData = await generateAttendanceReport(classId, academicYearId, termId);
    const excelBuffer = await generateExcelReport(reportData.records, 'attendance');
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="attendance-report.xlsx"');
    res.send(excelBuffer);
  } catch (error) {
    console.error('Error generating attendance Excel report:', error);
    res.status(500).json({ message: 'Failed to generate report' });
  }
});

// Export assignments data
router.get("/assignments/csv", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { classId, academicYearId, termId } = req.query;
    const user = req.user!;
    
    // This would need to be implemented based on your specific requirements
    // For now, returning a placeholder
    const csvData = "Assignment ID,Title,Subject,Due Date,Status\n";
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="assignments.csv"');
    res.send(csvData);
  } catch (error) {
    console.error('Error exporting assignments:', error);
    res.status(500).json({ message: 'Failed to export assignments' });
  }
});

export default router;

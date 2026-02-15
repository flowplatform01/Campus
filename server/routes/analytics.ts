import { Router } from "express";
import { eq, and, desc, sql, isNotNull, count, avg, sum } from "drizzle-orm";
import { db } from "../db.js";
import { requireAuth, AuthRequest, requireTenantAccess, validateTenantAccess } from "../middleware/auth.js";
import {
  users,
  schools,
  notifications,
  smsAssignments,
  smsAssignmentSubmissions,
  smsAttendanceSessions,
  smsAttendanceEntries,
  academicYears,
  academicTerms,
  studentEnrollments,
  subjects,
  schoolClasses,
  classSections,
  smsInvoices,
  smsPayments,
  smsExams,
  smsExamMarks
} from "@shared/schema";

const router = Router();

// Get system analytics dashboard
router.get("/dashboard", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const schoolId = user.schoolId!;
    
    // 🔐 STRICT TENANT ISOLATION & ROLE VALIDATION
    if (!validateTenantAccess(schoolId, user.schoolId!)) {
      return res.status(403).json({ message: "Cross-tenant access denied" });
    }
    
    if (user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    // 📊 OPTIMIZED TENANT-SCOPED ANALYTICS
    const [
      totalUsers,
      totalAssignments,
      totalSubmissions,
      activeAcademicYear,
      totalEnrollments,
      totalInvoices,
      totalPayments,
      totalExams,
      attendanceStats,
      paymentStats,
      classPerformance,
      subjectPerformance
    ] = await Promise.all([
      // Users in this school only
      db.select({ count: count() }).from(users).where(eq(users.schoolId, schoolId)),
      
      // Assignments in this school
      db.select({ count: count() }).from(smsAssignments).where(eq(smsAssignments.schoolId, schoolId)),
      
      // Submissions in this school
      db.select({ count: count() }).from(smsAssignmentSubmissions).where(eq(smsAssignmentSubmissions.schoolId, schoolId)),
      
      // Active academic year for this school
      db.select({ count: count() }).from(academicYears).where(and(
        eq(academicYears.schoolId, schoolId),
        eq(academicYears.isActive, true)
      )),
      
      // Active enrollments in this school
      db.select({ count: count() }).from(studentEnrollments).where(and(
        eq(studentEnrollments.schoolId, schoolId),
        eq(studentEnrollments.status, "active")
      )),
      
      // Invoices in this school
      db.select({ count: count(), total: sum(smsInvoices.totalAmount) }).from(smsInvoices).where(eq(smsInvoices.schoolId, schoolId)),
      
      // Payments in this school
      db.select({ count: count(), total: sum(smsPayments.amount) }).from(smsPayments).where(eq(smsPayments.schoolId, schoolId)),
      
      // Exams in this school
      db.select({ count: count() }).from(smsExams).where(eq(smsExams.schoolId, schoolId)),
      
      // Attendance statistics (optimized)
      db.select({
        totalSessions: count(),
        presentCount: sum(sql`CASE WHEN ${smsAttendanceEntries.status} = 'present' THEN 1 ELSE 0 END`),
        absentCount: sum(sql`CASE WHEN ${smsAttendanceEntries.status} = 'absent' THEN 1 ELSE 0 END`)
      }).from(smsAttendanceEntries)
        .leftJoin(smsAttendanceSessions, eq(smsAttendanceSessions.id, smsAttendanceEntries.sessionId))
        .where(eq(smsAttendanceEntries.schoolId, schoolId)),
      
      // Payment statistics (optimized)
      db.select({
        totalInvoices: sum(smsInvoices.totalAmount),
        totalPaid: sum(smsPayments.amount),
        pendingAmount: sql`${smsInvoices.totalAmount} - COALESCE(SUM(${smsPayments.amount}), 0)`
      }).from(smsInvoices)
        .leftJoin(smsPayments, eq(smsPayments.invoiceId, smsInvoices.id))
        .where(eq(smsInvoices.schoolId, schoolId)),
      
      // Class performance (optimized)
      db.select({
        className: schoolClasses.name,
        avgScore: avg(sql`${smsExamMarks.marksObtained} * 100.0 / ${smsExamMarks.totalMarks}`),
        totalExams: count(smsExamMarks.id)
      }).from(schoolClasses)
        .leftJoin(studentEnrollments, eq(studentEnrollments.classId, schoolClasses.id))
        .leftJoin(smsExamMarks, eq(smsExamMarks.studentId, studentEnrollments.studentId))
        .where(and(
          eq(schoolClasses.schoolId, schoolId),
          eq(studentEnrollments.status, "active"),
          isNotNull(smsExamMarks.marksObtained)
        ))
        .groupBy(schoolClasses.name)
        .orderBy(desc(avg(sql`${smsExamMarks.marksObtained} * 100.0 / ${smsExamMarks.totalMarks}`))),
      
      // Subject performance (optimized)
      db.select({
        subjectName: subjects.name,
        avgScore: avg(sql`${smsExamMarks.marksObtained} * 100.0 / ${smsExamMarks.totalMarks}`),
        totalExams: count(smsExamMarks.id)
      }).from(subjects)
        .leftJoin(smsExamMarks, eq(smsExamMarks.subjectId, subjects.id))
        .where(and(
          eq(subjects.schoolId, schoolId),
          isNotNull(smsExamMarks.marksObtained)
        ))
        .groupBy(subjects.name)
        .orderBy(desc(avg(sql`${smsExamMarks.marksObtained} * 100.0 / ${smsExamMarks.totalMarks}`)))
    ]);

    // 📈 CALCULATE DERIVED METRICS
    const attendanceTotalSessions = Number(attendanceStats[0]?.totalSessions ?? 0);
    const attendancePresentCount = Number(attendanceStats[0]?.presentCount ?? 0);
    const attendanceRate = attendanceTotalSessions > 0 ? (attendancePresentCount / attendanceTotalSessions) * 100 : 0;
    
    const paymentTotalInvoices = Number(paymentStats[0]?.totalInvoices ?? 0);
    const paymentTotalPaid = Number(paymentStats[0]?.totalPaid ?? 0);
    const paymentCollectionRate = paymentTotalInvoices > 0 ? (paymentTotalPaid / paymentTotalInvoices) * 100 : 0;
    
    const totalAssignmentsCount = Number(totalAssignments[0]?.count ?? 0);
    const totalSubmissionsCount = Number(totalSubmissions[0]?.count ?? 0);
    const submissionRate = totalAssignmentsCount > 0 ? (totalSubmissionsCount / totalAssignmentsCount) * 100 : 0;

    return res.json({
      overview: {
        users: totalUsers[0]?.count || 0,
        assignments: totalAssignments[0]?.count || 0,
        submissions: totalSubmissions[0]?.count || 0,
        activeAcademicYears: activeAcademicYear[0]?.count || 0,
        enrollments: totalEnrollments[0]?.count || 0,
        invoices: totalInvoices[0]?.count || 0,
        payments: totalPayments[0]?.count || 0,
        exams: totalExams[0]?.count || 0
      },
      performance: {
        attendanceRate: Math.round(attendanceRate * 100) / 100,
        submissionRate: Math.round(submissionRate * 100) / 100,
        paymentCollectionRate: Math.round(paymentCollectionRate * 100) / 100,
        avgClassScore: classPerformance.length > 0 
          ? Math.round((classPerformance.reduce((sum, c) => sum + Number(c.avgScore ?? 0), 0) / classPerformance.length) * 100) / 100
          : 0,
        avgSubjectScore: subjectPerformance.length > 0
          ? Math.round((subjectPerformance.reduce((sum, s) => sum + Number(s.avgScore ?? 0), 0) / subjectPerformance.length) * 100) / 100
          : 0
      },
      financials: {
        totalInvoiced: paymentTotalInvoices,
        totalCollected: paymentTotalPaid,
        pendingAmount: Number(paymentStats[0]?.pendingAmount ?? 0),
        collectionRate: Math.round(paymentCollectionRate * 100) / 100
      },
      classPerformance: classPerformance.map(c => ({
        className: c.className,
        avgScore: Math.round(Number(c.avgScore ?? 0) * 100) / 100,
        totalExams: c.totalExams
      })),
      subjectPerformance: subjectPerformance.map(s => ({
        subjectName: s.subjectName,
        avgScore: Math.round(Number(s.avgScore ?? 0) * 100) / 100,
        totalExams: s.totalExams
      })),
      attendance: {
        totalSessions: attendanceStats[0]?.totalSessions || 0,
        presentCount: attendanceStats[0]?.presentCount || 0,
        absentCount: attendanceStats[0]?.absentCount || 0,
        rate: Math.round(attendanceRate * 100) / 100
      }
    });
    
  } catch (error: any) {
    console.error('Analytics dashboard error:', error);
    res.status(500).json({ message: "Failed to load analytics dashboard" });
  }
});

export default router;

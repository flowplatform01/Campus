import { eq, and, desc, isNotNull } from "drizzle-orm";
import { db } from "../db.js";
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";
import {
  // SMS Tables for comprehensive data
  smsAssignments,
  smsAssignmentSubmissions,
  smsAttendanceSessions,
  smsAttendanceEntries,
  academicYears,
  academicTerms,
  schoolClasses,
  classSections,
  subjects,
  studentEnrollments,
  users,
  schools
} from "@shared/schema";

// PDF Generation
export async function generatePDFReport(data: any, type: string): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  const stream = new PassThrough();
  const chunks: Buffer[] = [];

  doc.pipe(stream);
  stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));

  const title =
    type === "student"
      ? "Student Academic Report"
      : type === "class"
        ? "Class Performance Report"
        : type === "attendance"
          ? "Attendance Report"
          : "Report";

  doc.info.Title = title;

  // Branded header (minimal, non-disruptive)
  const schoolName = String(data?.school?.name ?? data?.student?.schoolName ?? data?.schoolName ?? "Campus");
  const pageWidth = doc.page.width;
  const headerTop = 28;
  doc.save();
  doc.rect(0, 0, pageWidth, 8).fill("#0ea5e9");
  doc.restore();
  doc.fontSize(10).fillColor("#64748b").text(schoolName, 40, headerTop, { align: "left" });
  doc.fontSize(10).fillColor("#64748b").text("campus", 40, headerTop, { align: "right" });
  doc.moveDown(1.2);

  doc.fontSize(18).text(title, { align: "center" });
  doc.moveDown(0.25);
  doc.fontSize(10).text(`Generated on ${new Date().toLocaleString()}`, { align: "center" });
  doc.moveDown(1);

  if (type === "student") {
    renderStudentReportPdf(doc, data);
  } else if (type === "class") {
    renderClassReportPdf(doc, data);
  } else if (type === "attendance") {
    renderAttendanceReportPdf(doc, data);
  } else {
    doc.fontSize(12).text("Unsupported report type.");
  }

  doc.end();

  await new Promise<void>((resolve, reject) => {
    stream.on("end", () => resolve());
    stream.on("error", (e) => reject(e));
    doc.on("error", (e) => reject(e));
  });

  return Buffer.concat(chunks);
}

function renderKeyValue(doc: PDFKit.PDFDocument, label: string, value: string) {
  doc.fontSize(10).fillColor("#111").text(label, { continued: true });
  doc.fontSize(10).fillColor("#444").text(value);
  doc.fillColor("#111");
}

function drawTableHeader(doc: PDFKit.PDFDocument, cols: { label: string; width: number }[]) {
  const startX = doc.x;
  const y = doc.y;
  doc.fontSize(9).fillColor("#111");
  let x = startX;
  for (const c of cols) {
    doc.text(c.label, x, y, { width: c.width, continued: false });
    x += c.width;
  }
  doc.moveDown(0.6);
  doc.moveTo(startX, doc.y).lineTo(startX + cols.reduce((s, c) => s + c.width, 0), doc.y).strokeColor("#ccc").stroke();
  doc.moveDown(0.4);
  doc.strokeColor("#000");
}

function drawTableRow(
  doc: PDFKit.PDFDocument,
  cols: { width: number }[],
  values: string[]
) {
  const startX = doc.x;
  const y = doc.y;
  let x = startX;
  doc.fontSize(9).fillColor("#333");
  for (let i = 0; i < cols.length; i++) {
    doc.text(values[i] ?? "", x, y, { width: cols[i]!.width });
    x += cols[i]!.width;
  }
  doc.moveDown(0.6);
  doc.fillColor("#111");
}

function renderStudentReportPdf(doc: PDFKit.PDFDocument, data: any) {
  const student = data?.student;
  const summary = data?.summary;

  doc.fontSize(12).text("Student Information", { underline: true });
  doc.moveDown(0.4);
  renderKeyValue(doc, "Name: ", String(student?.name ?? ""));
  renderKeyValue(doc, "Student ID: ", String(student?.studentId ?? ""));
  renderKeyValue(doc, "Email: ", String(student?.email ?? ""));
  doc.moveDown(0.8);

  doc.fontSize(12).text("Summary", { underline: true });
  doc.moveDown(0.4);
  renderKeyValue(doc, "Total assignments: ", String(summary?.totalAssignments ?? 0));
  renderKeyValue(doc, "Submitted assignments: ", String(summary?.submittedAssignments ?? 0));
  renderKeyValue(doc, "Average score: ", `${String(summary?.averageScore ?? "0")}%`);
  renderKeyValue(doc, "Attendance rate: ", `${String(summary?.attendanceRate ?? "0")}%`);
  if (summary?.remark) renderKeyValue(doc, "Remarks: ", String(summary.remark));
  doc.moveDown(0.8);

  doc.fontSize(12).text("Assignments", { underline: true });
  doc.moveDown(0.4);

  const cols = [
    { label: "Title", width: 240 },
    { label: "Subject", width: 120 },
    { label: "Score", width: 60 },
    { label: "Submitted", width: 80 },
  ];
  drawTableHeader(doc, cols);

  const assignments: any[] = Array.isArray(data?.assignments) ? data.assignments : [];
  for (const a of assignments) {
    const submittedAt = a?.submission?.submittedAt ? new Date(a.submission.submittedAt).toLocaleDateString() : "";
    drawTableRow(
      doc,
      cols,
      [
        String(a?.assignment?.title ?? ""),
        String(a?.subject?.name ?? ""),
        a?.submission?.score === null || typeof a?.submission?.score === "undefined" ? "" : String(a.submission.score),
        submittedAt,
      ]
    );
    if (doc.y > 740) doc.addPage();
  }
}

function renderClassReportPdf(doc: PDFKit.PDFDocument, data: any) {
  doc.fontSize(12).text("Class Summary", { underline: true });
  doc.moveDown(0.4);
  const summary = data?.summary;
  renderKeyValue(doc, "Total students: ", String(summary?.totalStudents ?? 0));
  renderKeyValue(doc, "Class average: ", summary?.classAverage != null ? String(summary.classAverage) : "0");
  renderKeyValue(doc, "Needs improvement (<60): ", String(summary?.needsImprovement ?? 0));
  doc.moveDown(0.8);

  doc.fontSize(12).text("Students", { underline: true });
  doc.moveDown(0.4);

  const cols = [
    { label: "Name", width: 180 },
    { label: "Student ID", width: 90 },
    { label: "Email", width: 140 },
    { label: "Avg", width: 50 },
  ];
  drawTableHeader(doc, cols);

  const students: any[] = Array.isArray(data?.students) ? data.students : [];
  for (const s of students) {
    drawTableRow(
      doc,
      cols,
      [
        String(s?.student?.name ?? s?.studentName ?? ""),
        String(s?.student?.studentId ?? ""),
        String(s?.student?.email ?? ""),
        String(s?.averageScore ?? ""),
      ]
    );
    if (doc.y > 740) doc.addPage();
  }
}

function renderAttendanceReportPdf(doc: PDFKit.PDFDocument, data: any) {
  doc.fontSize(12).text("Attendance Summary", { underline: true });
  doc.moveDown(0.4);
  const statistics = data?.statistics;
  renderKeyValue(doc, "Total records: ", String(statistics?.totalRecords ?? 0));
  renderKeyValue(doc, "Present rate: ", `${String(statistics?.presentRate ?? "0")}%`);
  renderKeyValue(doc, "Absent rate: ", `${String(statistics?.absentRate ?? "0")}%`);
  doc.moveDown(0.8);

  doc.fontSize(12).text("Records", { underline: true });
  doc.moveDown(0.4);

  const cols = [
    { label: "Date", width: 90 },
    { label: "Student", width: 200 },
    { label: "Subject", width: 140 },
    { label: "Status", width: 60 },
  ];
  drawTableHeader(doc, cols);

  const records: any[] = Array.isArray(data?.records) ? data.records : [];
  for (const r of records) {
    const date = r?.session?.date ? new Date(r.session.date).toLocaleDateString() : "";
    drawTableRow(doc, cols, [date, String(r?.student?.name ?? ""), String(r?.subject ?? ""), String(r?.entry?.status ?? "")]);
    if (doc.y > 740) doc.addPage();
  }
}

// Excel/CSV Generation
export async function generateExcelReport(data: any[], type: string): Promise<Buffer> {
  const csv = convertToCSV(data, type);
  return Buffer.from(csv, 'utf-8');
}

// Generate Academic Report for Student
export async function generateStudentReport(schoolId: string, studentId: string, academicYearId?: string, termId?: string) {
  try {
    // Get student info
    const [student] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, studentId), eq(users.schoolId, schoolId)))
      .limit(1);

    if (!student) {
      throw new Error('Student not found');
    }

    // Get enrollment
    // NOTE: termId is not reliably stored on enrollments in all environments.
    // We anchor on academicYear + active status, then prefer a matching termId if present.
    const enrollments = await db
      .select()
      .from(studentEnrollments)
      .where(
        and(
          eq(studentEnrollments.schoolId, schoolId),
          eq(studentEnrollments.studentId, studentId),
          academicYearId ? eq(studentEnrollments.academicYearId, academicYearId) : undefined,
          eq(studentEnrollments.status, "active")
        )
      )
      .orderBy(desc(studentEnrollments.createdAt));

    const enrollment =
      (termId ? enrollments.find((e) => e.termId === termId) : undefined) ??
      enrollments[0] ??
      null;

    const effectiveAcademicYearId = academicYearId ?? enrollment?.academicYearId ?? null;
    const effectiveTermId = termId ?? enrollment?.termId ?? null;

    if (!effectiveAcademicYearId) {
      throw new Error("Academic year scope is required");
    }

    // Get assignment submissions with grades
    const assignments = await db
      .select({
        assignment: {
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
          eq(smsAssignmentSubmissions.schoolId, schoolId),
          eq(smsAssignments.schoolId, schoolId),
          eq(subjects.schoolId, schoolId),
          eq(smsAssignmentSubmissions.studentId, studentId),
          eq(smsAssignments.academicYearId, effectiveAcademicYearId),
          effectiveTermId ? eq(smsAssignments.termId, effectiveTermId) : undefined
        )
      )
      .orderBy(desc(smsAssignmentSubmissions.submittedAt));

    // Get attendance records
    const attendance = await db
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
          eq(smsAttendanceEntries.schoolId, schoolId),
          eq(smsAttendanceSessions.schoolId, schoolId),
          eq(subjects.schoolId, schoolId),
          eq(smsAttendanceEntries.studentId, studentId),
          eq(smsAttendanceSessions.academicYearId, effectiveAcademicYearId),
          effectiveTermId ? eq(smsAttendanceSessions.termId, effectiveTermId) : undefined
        )
      )
      .orderBy(desc(smsAttendanceSessions.date));

    const avgScore = assignments.filter(a => a.submission?.score !== null).length > 0
      ? assignments.filter(a => a.submission?.score !== null).reduce((sum, a) => sum + (a.submission?.score || 0), 0) /
        assignments.filter(a => a.submission?.score !== null).length
      : 0;
    const presentDays = attendance.filter(a => a.entry.status === 'present').length;
    const attendanceRate = attendance.length > 0 ? (presentDays / attendance.length * 100) : 0;
    const remark = generateAutoRemark(avgScore, attendanceRate);

    return {
      student,
      enrollment,
      assignments,
      attendance,
      summary: {
        totalAssignments: assignments.length,
        submittedAssignments: assignments.filter(a => a.submission).length,
        averageScore: avgScore.toFixed(1),
        totalAttendanceDays: attendance.length,
        presentDays,
        attendanceRate: attendanceRate.toFixed(1),
        remark
      }
    };
  } catch (error) {
    console.error('Error generating student report:', error);
    throw error;
  }
}

// Generate Class Performance Report
export async function generateClassReport(schoolId: string, classId: string, academicYearId?: string, termId?: string) {
  try {
    // Get all students in class
    const students = await db
      .select({
        student: {
          name: users.name,
          studentId: users.studentId,
          email: users.email,
        },
        enrollment: studentEnrollments,
      })
      .from(studentEnrollments)
      .innerJoin(users, eq(studentEnrollments.studentId, users.id))
      .where(
        and(
          eq(studentEnrollments.schoolId, schoolId),
          eq(users.schoolId, schoolId),
          eq(studentEnrollments.classId, classId),
          academicYearId ? eq(studentEnrollments.academicYearId, academicYearId) : undefined,
          termId ? eq(studentEnrollments.termId, termId) : undefined,
          eq(studentEnrollments.status, "active")
        )
      );

    // Get class performance data
    const performanceData = await Promise.all(
      students.map(async (studentData) => {
        const assignments = await db
          .select({
            assignment: smsAssignments.title,
            maxScore: smsAssignments.maxScore,
            submission: smsAssignmentSubmissions.score,
          })
          .from(smsAssignmentSubmissions)
          .innerJoin(smsAssignments, eq(smsAssignmentSubmissions.assignmentId, smsAssignments.id))
          .where(
            and(
              eq(smsAssignmentSubmissions.schoolId, schoolId),
              eq(smsAssignments.schoolId, schoolId),
              eq(smsAssignmentSubmissions.studentId, studentData.enrollment.studentId),
              eq(smsAssignments.classId, classId),
              academicYearId ? eq(smsAssignments.academicYearId, academicYearId) : undefined,
              termId ? eq(smsAssignments.termId, termId) : undefined,
              isNotNull(smsAssignmentSubmissions.score)
            )
          );

        const averageScore = assignments.length > 0 ? 
          assignments.reduce((sum, a: any) => sum + (a.score || 0), 0) / assignments.length : 0;

        return {
          ...studentData,
          totalAssignments: assignments.length,
          submittedAssignments: assignments.length,
          averageScore: averageScore.toFixed(2),
          highestScore: Math.max(...assignments.map((a: any) => a.score || 0)),
          lowestScore: Math.min(...assignments.map((a: any) => a.score || 0)),
        };
      })
    );

    return {
      classId,
      students: performanceData,
      summary: {
        totalStudents: students.length,
        classAverage: performanceData.reduce((sum, s: any) => sum + parseFloat(s.averageScore), 0) / students.length,
        topPerformer: performanceData.reduce((top: any, current: any) => 
          parseFloat(top.averageScore) > parseFloat(current.averageScore) ? top : current, performanceData[0] || {}),
        needsImprovement: performanceData.filter(s => parseFloat(s.averageScore) < 60).length,
      }
    };
  } catch (error) {
    console.error('Error generating class report:', error);
    throw error;
  }
}

// Generate Attendance Summary Report
export async function generateAttendanceReport(schoolId: string, classId?: string, academicYearId?: string, termId?: string) {
  try {
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
        class: schoolClasses.name,
        section: classSections.name,
      })
      .from(smsAttendanceEntries)
      .innerJoin(smsAttendanceSessions, eq(smsAttendanceEntries.sessionId, smsAttendanceSessions.id))
      .innerJoin(subjects, eq(smsAttendanceSessions.subjectId, subjects.id))
      .innerJoin(users, eq(smsAttendanceEntries.studentId, users.id))
      .innerJoin(studentEnrollments, eq(users.id, studentEnrollments.studentId))
      .innerJoin(schoolClasses, eq(studentEnrollments.classId, schoolClasses.id))
      .leftJoin(classSections, eq(studentEnrollments.sectionId, classSections.id))
      .where(
        and(
          eq(smsAttendanceEntries.schoolId, schoolId),
          eq(smsAttendanceSessions.schoolId, schoolId),
          eq(subjects.schoolId, schoolId),
          eq(users.schoolId, schoolId),
          eq(studentEnrollments.schoolId, schoolId),
          eq(schoolClasses.schoolId, schoolId),
          classId ? eq(studentEnrollments.classId, classId) : undefined,
          academicYearId ? eq(smsAttendanceSessions.academicYearId, academicYearId) : undefined,
          termId ? eq(smsAttendanceSessions.termId, termId) : undefined
        )
      )
      .orderBy(desc(smsAttendanceSessions.date));

    // Generate summary statistics
    const summary = attendanceRecords.reduce((acc: any, record: any) => {
      const date = record.session.date.toISOString().split('T')[0];
      if (!acc.dailyStats[date]) {
        acc.dailyStats[date] = { present: 0, absent: 0, late: 0, excused: 0 };
      }
      
      const status = record.entry.status;
      if (['present', 'absent', 'late', 'excused'].includes(status)) {
        acc.dailyStats[date][status]++;
        acc.total[status]++;
      }
      
      return acc;
    }, { dailyStats: {}, total: { present: 0, absent: 0, late: 0, excused: 0 } });

    return {
      records: attendanceRecords,
      summary,
      statistics: {
        totalRecords: attendanceRecords.length,
        presentRate: ((summary.total.present / (attendanceRecords.length || 1)) * 100).toFixed(1),
        absentRate: ((summary.total.absent / (attendanceRecords.length || 1)) * 100).toFixed(1),
        averageDailyAttendance: Object.keys(summary.dailyStats).length > 0 ? 
          (summary.total.present / Object.keys(summary.dailyStats).length).toFixed(1) : '0',
      }
    };
  } catch (error) {
    console.error('Error generating attendance report:', error);
    throw error;
  }
}

/** Rule-based remark engine: generates remarks from average score and attendance rate */
export function generateAutoRemark(avgScore: number, attendanceRate: number): string {
  const score = Number(avgScore) || 0;
  const att = Number(attendanceRate) || 0;
  if (score >= 90 && att >= 90) return "Excellent performance with outstanding attendance.";
  if (score >= 90) return "Excellent academic performance. Encourage consistent attendance.";
  if (score >= 80 && att >= 85) return "Very good performance. Keep up the great work.";
  if (score >= 80) return "Good performance. Focus on improving attendance.";
  if (score >= 70 && att >= 80) return "Satisfactory progress. Room for improvement.";
  if (score >= 70) return "Satisfactory work. Please improve attendance and study habits.";
  if (score >= 60) return "Needs improvement. Consider extra support and better attendance.";
  if (score >= 50) return "Below expectations. Recommend remedial support and parent meeting.";
  return "Critical improvement needed. Urgent intervention recommended.";
}

// Helper functions
function generateHTMLReport(data: any, type: string): string {
  const title = type === 'student' ? 'Student Academic Report' : 'Class Performance Report';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .section { margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .summary { background-color: #f9f9f9; padding: 15px; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${title}</h1>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
      </div>
      ${generateReportContent(data, type)}
    </body>
    </html>
  `;
}

function generateReportContent(data: any, type: string): string {
  if (type === 'student') {
    return `
      <div class="section">
        <h2>Student Information</h2>
        <p><strong>Name:</strong> ${data.student.name}</p>
        <p><strong>Student ID:</strong> ${data.student.studentId}</p>
        <p><strong>Email:</strong> ${data.student.email}</p>
      </div>
      
      <div class="section">
        <h2>Academic Summary</h2>
        <div class="summary">
          <p><strong>Total Assignments:</strong> ${data.summary.totalAssignments}</p>
          <p><strong>Submitted:</strong> ${data.summary.submittedAssignments}</p>
          <p><strong>Average Score:</strong> ${data.summary.averageScore}%</p>
          <p><strong>Attendance Rate:</strong> ${data.summary.attendanceRate}%</p>
          ${data.summary.remark ? `<p><strong>Remarks:</strong> ${data.summary.remark}</p>` : ''}
        </div>
      </div>
      
      <div class="section">
        <h2>Assignment Details</h2>
        <table>
          <tr>
            <th>Assignment</th>
            <th>Subject</th>
            <th>Score</th>
            <th>Submitted</th>
          </tr>
          ${data.assignments.map((assignment: any) => `
            <tr>
              <td>${assignment.assignment.title}</td>
              <td>${assignment.subject.name}</td>
              <td>${assignment.submission?.score || 'Not graded'}</td>
              <td>${new Date(assignment.submission?.submittedAt).toLocaleDateString()}</td>
            </tr>
          `).join('')}
        </table>
      </div>
    `;
  }
  
  return '<p>Report content not implemented</p>';
}

function generateTextReport(data: any, type: string): string {
  const title = type === 'student' ? 'STUDENT ACADEMIC REPORT' : 'CLASS PERFORMANCE REPORT';
  
  return `
${title}
Generated: ${new Date().toLocaleDateString()}
${'='.repeat(50)}

${generateTextContent(data, type)}
${'='.repeat(50)}
  `;
}

function generateTextContent(data: any, type: string): string {
  if (type === 'student') {
    return `
STUDENT INFORMATION
----------------
Name: ${data.student.name}
Student ID: ${data.student.studentId}
Email: ${data.student.email}

ACADEMIC SUMMARY
------------------
Total Assignments: ${data.summary.totalAssignments}
Submitted: ${data.summary.submittedAssignments}
Average Score: ${data.summary.averageScore}%
Attendance Rate: ${data.summary.attendanceRate}%
${data.summary.remark ? `Remarks: ${data.summary.remark}` : ''}

ASSIGNMENT DETAILS
------------------
${data.assignments.map((assignment: any, index: number) => `
${index + 1}. ${assignment.assignment.title}
   Subject: ${assignment.subject.name}
   Score: ${assignment.submission?.score || 'Not graded'}
   Submitted: ${new Date(assignment.submission?.submittedAt).toLocaleDateString()}
   Feedback: ${assignment.submission?.feedback || 'No feedback'}
`).join('\n')}
    `;
  }
  
  return 'Report content not implemented';
}

function convertToCSV(data: any[], type: string): string {
  if (type === 'student') {
    const headers = [
      'Student Name',
      'Student ID',
      'Email',
      'Total Assignments',
      'Submitted Assignments',
      'Average Score',
      'Attendance Rate',
      'Remark',
    ];

    const rows = data.map((report: any) => {
      const student = report?.student || {};
      const summary = report?.summary || {};
      return [
        student?.name ?? '',
        student?.studentId ?? '',
        student?.email ?? '',
        summary?.totalAssignments ?? '',
        summary?.submittedAssignments ?? '',
        summary?.averageScore ?? '',
        summary?.attendanceRate ?? '',
        summary?.remark ?? '',
      ];
    });

    return [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
  }

  if (type === 'attendance') {
    const headers = ['Date', 'Student Name', 'Student ID', 'Subject', 'Status', 'Notes'];
    const rows = data.map(record => [
      record.session.date,
      record.student.name,
      record.student.studentId,
      record.subject.name,
      record.entry.status,
      record.entry.note || ''
    ]);
    
    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  }
  
  if (type === 'class_performance') {
    const headers = ['Student Name', 'Student ID', 'Email', 'Total Assignments', 'Submitted', 'Average Score', 'Highest Score', 'Lowest Score'];
    const rows = data.map(student => [
      student?.student?.name ?? '',
      student?.student?.studentId ?? '',
      student?.student?.email ?? '',
      student.totalAssignments,
      student.submittedAssignments,
      student.averageScore,
      student.highestScore,
      student.lowestScore
    ]);
    
    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  }
  
  return 'No CSV data available';
}

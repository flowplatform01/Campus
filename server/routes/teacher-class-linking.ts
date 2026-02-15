import { Router } from "express";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db.js";
import { 
  users, 
  subjectTeacherAssignments,
  schoolClasses,
  classSections,
  subjects,
  studentEnrollments,
  timetableSlots,
  academicYears
} from "@shared/schema";
import { requireAuth, AuthRequest, requireTenantAccess, validateTenantAccess } from "../middleware/auth.js";

const router = Router();

// 🔗 TEACHER-CLASS ASSIGNMENT SCHEMA
const assignTeacherSchema = z.object({
  teacherId: z.string().min(1),
  classId: z.string().min(1),
  subjectId: z.string().min(1),
  sectionId: z.string().optional()
});

const unassignTeacherSchema = z.object({
  teacherId: z.string().min(1),
  classId: z.string().min(1),
  subjectId: z.string().min(1)
});

// 🔗 ADMIN PANEL: TEACHER LOAD AND ASSIGNMENTS
router.get("/teacher-assignments-dashboard", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId!;
    
    // 🔐 STRICT TENANT ISOLATION & ROLE VALIDATION
    if (!validateTenantAccess(schoolId, req.user!.schoolId!)) {
      return res.status(403).json({ message: "Cross-tenant access denied" });
    }
    
    if (req.user!.role !== "admin") {
      return res.status(403).json({ message: "Only admins can view teacher assignments" });
    }
    
    // 👨‍🏫 GET ALL TEACHERS
    const teachers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        employeeId: users.employeeId,
        subRole: users.subRole
      })
      .from(users)
      .where(and(
        eq(users.role, "employee"),
        eq(users.schoolId, schoolId),
        sql`${users.subRole} = 'teacher' OR ${users.subRole} = 'principal'`
      ))
      .orderBy(users.name);
    
    // 📚 GET ALL SUBJECTS
    const allSubjects = await db
      .select()
      .from(subjects)
      .where(eq(subjects.schoolId, schoolId))
      .orderBy(subjects.name);
    
    // 🏫 GET ALL CLASSES
    const classes = await db
      .select({
        id: schoolClasses.id,
        name: schoolClasses.name,
        sortOrder: schoolClasses.sortOrder
      })
      .from(schoolClasses)
      .where(eq(schoolClasses.schoolId, schoolId))
      .orderBy(schoolClasses.sortOrder, schoolClasses.name);
    
    // 📋 GET ALL SECTIONS
    const sections = await db
      .select({
        id: classSections.id,
        name: classSections.name,
        classId: classSections.classId
      })
      .from(classSections)
      .where(eq(classSections.schoolId, schoolId))
      .orderBy(classSections.name);
    
    // 🔗 GET CURRENT ASSIGNMENTS
    const assignments = await db
      .select({
        teacher: { id: users.id, name: users.name, email: users.email },
        subject: { id: subjects.id, name: subjects.name, code: subjects.code },
        class: { id: schoolClasses.id, name: schoolClasses.name },
        section: { id: classSections.id, name: classSections.name },
        assignment: subjectTeacherAssignments
      })
      .from(subjectTeacherAssignments)
      .leftJoin(users, eq(users.id, subjectTeacherAssignments.teacherId))
      .leftJoin(subjects, eq(subjects.id, subjectTeacherAssignments.subjectId))
      .leftJoin(schoolClasses, eq(schoolClasses.id, subjectTeacherAssignments.classId))
      .leftJoin(classSections, eq(classSections.id, subjectTeacherAssignments.sectionId))
      .where(eq(subjectTeacherAssignments.schoolId, schoolId))
      .orderBy(users.name, schoolClasses.name, subjects.name);
    
    // 📊 CALCULATE TEACHER LOAD
    const teacherLoad = assignments.reduce((acc: any, assignment: any) => {
      const teacherId = assignment.teacher?.id;
      if (teacherId) {
        if (!acc[teacherId]) {
          acc[teacherId] = {
            totalAssignments: 0,
            subjects: new Set(),
            classes: new Set(),
            sections: new Set()
          };
        }
        acc[teacherId].totalAssignments++;
        if (assignment.subject?.name) acc[teacherId].subjects.add(assignment.subject.name);
        if (assignment.class?.name) acc[teacherId].classes.add(assignment.class.name);
        if (assignment.section?.name) acc[teacherId].sections.add(assignment.section?.name);
      }
      return acc;
    }, {} as Record<string, any>);
    
    // 🚨 DETECT CONFLICTS (same time assignments)
    const conflicts = await db
      .select({
        teacher: { id: users.id, name: users.name },
        slot1: timetableSlots,
        slot2: timetableSlots
      })
      .from(timetableSlots)
      .leftJoin(users, eq(users.id, timetableSlots.teacherId))
      .where(and(
        eq(timetableSlots.schoolId, schoolId),
        sql`${timetableSlots.weekday} IS NOT NULL`,
        sql`${timetableSlots.startTime} IS NOT NULL`,
        sql`${timetableSlots.endTime} IS NOT NULL`
      ))
      .orderBy(users.name, timetableSlots.weekday, timetableSlots.startTime);
    
    // Find actual conflicts
    const timeConflicts: any[] = [];
    const teacherSlots = conflicts.reduce((acc: any, conflict: any) => {
      const teacherId = conflict.teacher?.id;
      if (teacherId && conflict.slot1) {
        if (!acc[teacherId]) acc[teacherId] = [];
        acc[teacherId].push({
          weekday: conflict.slot1.weekday,
          startTime: conflict.slot1.startTime,
          endTime: conflict.slot1.endTime,
          classId: conflict.slot1.classId,
          subjectId: conflict.slot1.subjectId
        });
      }
      return acc;
    }, {} as Record<string, any[]>);
    
    // Check for overlapping slots
    try {
      for (const [teacherId, slots] of Object.entries(teacherSlots) as [string, any[]][]) {
        for (let i = 0; i < slots.length; i++) {
          for (let j = i + 1; j < slots.length; j++) {
            const slot1 = slots[i];
            const slot2 = slots[j];
            
            if (slot1.weekday === slot2.weekday &&
                ((slot1.startTime >= slot2.startTime && slot1.startTime < slot2.endTime) ||
                 (slot2.startTime >= slot1.startTime && slot2.startTime < slot1.endTime))) {
              timeConflicts.push({
                teacherId,
                teacherName: conflicts.find(c => c.teacher?.id === teacherId)?.teacher?.name,
                dayOfWeek: slot1.dayOfWeek,
                conflict: `${slot1.startTime}-${slot1.endTime} overlaps with ${slot2.startTime}-${slot2.endTime}`
              });
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Error checking time conflicts:', error);
    }
    
    // 📊 ORPHAN SUBJECTS (subjects without teachers)
    const assignedSubjectIds = new Set(assignments.map((a: any) => a.subject?.id));
    const orphanSubjects = allSubjects.filter((s: any) => !assignedSubjectIds.has(s.id));
    
    // 📊 OVERLOADED TEACHERS
    const overloadedTeachers = Object.values(teacherLoad).filter((load: any) => load.totalAssignments > 8) // More than 8 assignments is considered overloaded
      .map((load: any) => ({
        ...load,
        subjects: Array.from(load.subjects),
        classes: Array.from(load.classes),
        sections: Array.from(load.sections)
      }));
    
    res.json({
      statistics: {
        totalTeachers: teachers.length,
        totalSubjects: allSubjects.length,
        totalClasses: classes.length,
        totalSections: sections.length,
        totalAssignments: assignments.length,
        averageLoadPerTeacher: assignments.length / Math.max(teachers.length, 1),
        orphanSubjects: orphanSubjects.length,
        overloadedTeachers: overloadedTeachers.length,
        timeConflicts: timeConflicts.length
      },
      teachers,
      subjects: allSubjects,
      classes,
      sections,
      assignments,
      teacherLoad: Object.values(teacherLoad).map((load: any) => ({
        ...load,
        subjects: Array.from(load.subjects),
        classes: Array.from(load.classes),
        sections: Array.from(load.sections)
      })),
      conflicts: timeConflicts,
      orphanSubjects,
      overloadedTeachers
    });
    
  } catch (error: any) {
    console.error('Teacher assignments dashboard error:', error);
    res.status(500).json({ message: "Failed to load teacher assignments dashboard" });
  }
});

// 🔗 ASSIGN TEACHER TO CLASS/SUBJECT
router.post("/assign-teacher", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId!;
    
    // 🔐 STRICT TENANT ISOLATION & ROLE VALIDATION
    if (!validateTenantAccess(schoolId, req.user!.schoolId!)) {
      return res.status(403).json({ message: "Cross-tenant access denied" });
    }
    
    if (req.user!.role !== "admin") {
      return res.status(403).json({ message: "Only admins can assign teachers" });
    }
    
    const body = assignTeacherSchema.parse(req.body);
    const { teacherId, classId, subjectId, sectionId } = body;
    
    // 🔍 VALIDATE TEACHER EXISTS AND BELONGS TO SCHOOL
    const [teacher] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.id, teacherId),
        eq(users.role, "employee"),
        eq(users.schoolId, schoolId),
        sql`${users.subRole} = 'teacher' OR ${users.subRole} = 'principal'`
      ))
      .limit(1);
    
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found or not in your school" });
    }
    
    // 🔍 VALIDATE CLASS EXISTS AND BELONGS TO SCHOOL
    const [classInfo] = await db
      .select()
      .from(schoolClasses)
      .where(and(
        eq(schoolClasses.id, classId),
        eq(schoolClasses.schoolId, schoolId)
      ))
      .limit(1);
    
    if (!classInfo) {
      return res.status(404).json({ message: "Class not found or not in your school" });
    }
    
    // 🔍 VALIDATE SUBJECT EXISTS AND BELONGS TO SCHOOL
    const [subject] = await db
      .select()
      .from(subjects)
      .where(and(
        eq(subjects.id, subjectId),
        eq(subjects.schoolId, schoolId)
      ))
      .limit(1);
    
    if (!subject) {
      return res.status(404).json({ message: "Subject not found or not in your school" });
    }
    
    // 🔍 VALIDATE SECTION (if provided)
    if (sectionId) {
      const [section] = await db
        .select()
        .from(classSections)
        .where(and(
          eq(classSections.id, sectionId),
          eq(classSections.schoolId, schoolId),
          eq(classSections.classId, classId)
        ))
        .limit(1);
      
      if (!section) {
        return res.status(404).json({ message: "Section not found or not in specified class" });
      }
    }
    
    // 🚫 PREVENT DUPLICATE ASSIGNMENT
    const [existingAssignment] = await db
      .select()
      .from(subjectTeacherAssignments)
      .where(and(
        eq(subjectTeacherAssignments.teacherId, teacherId),
        eq(subjectTeacherAssignments.classId, classId),
        eq(subjectTeacherAssignments.subjectId, subjectId),
        sectionId ? eq(subjectTeacherAssignments.sectionId, sectionId) : sql`${subjectTeacherAssignments.sectionId} IS NULL`,
        eq(subjectTeacherAssignments.schoolId, schoolId)
      ))
      .limit(1);
    
    if (existingAssignment) {
      return res.status(400).json({ message: "Teacher is already assigned to this class/subject combination" });
    }
    
    // 🔗 CREATE ASSIGNMENT
    const [assignment] = await db
      .insert(subjectTeacherAssignments)
      .values({
        teacherId,
        classId,
        subjectId,
        sectionId,
        schoolId,
        academicYearId: (await db.select().from(academicYears).where(eq(academicYears.schoolId, schoolId)).limit(1))[0]?.id || ''
      })
      .returning();
    
    res.status(201).json({
      message: "Teacher successfully assigned",
      assignment: {
        id: assignment!.id,
        teacherId,
        classId,
        subjectId,
        sectionId,
        createdAt: assignment!.createdAt
      },
      teacher: {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email
      },
      class: {
        id: classInfo.id,
        name: classInfo.name
      },
      subject: {
        id: subject.id,
        name: subject.name,
        code: subject.code
      }
    });
    
  } catch (error: any) {
    console.error('Assign teacher error:', error);
    res.status(500).json({ message: "Failed to assign teacher" });
  }
});

// 🔗 UNASSIGN TEACHER FROM CLASS/SUBJECT
router.post("/unassign-teacher", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId!;
    
    // 🔐 STRICT TENANT ISOLATION & ROLE VALIDATION
    if (!validateTenantAccess(schoolId, req.user!.schoolId!)) {
      return res.status(403).json({ message: "Cross-tenant access denied" });
    }
    
    if (req.user!.role !== "admin") {
      return res.status(403).json({ message: "Only admins can unassign teachers" });
    }
    
    const body = unassignTeacherSchema.parse(req.body);
    const { teacherId, classId, subjectId } = body;
    
    // 🔍 FIND EXISTING ASSIGNMENT
    const [existingAssignment] = await db
      .select()
      .from(subjectTeacherAssignments)
      .where(and(
        eq(subjectTeacherAssignments.teacherId, teacherId),
        eq(subjectTeacherAssignments.classId, classId),
        eq(subjectTeacherAssignments.subjectId, subjectId),
        eq(subjectTeacherAssignments.schoolId, schoolId)
      ))
      .limit(1);
    
    if (!existingAssignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }
    
    // 🚫 PREVENT UNASSIGNMENT IF STUDENTS ARE ENROLLED
    const [enrolledStudents] = await db
      .select({ count: count() })
      .from(studentEnrollments)
      .where(and(
        eq(studentEnrollments.classId, classId),
        eq(studentEnrollments.schoolId, schoolId),
        eq(studentEnrollments.status, "active")
      ))
      .limit(1);
    
    if (enrolledStudents && enrolledStudents.count > 0) {
      return res.status(400).json({ message: "Cannot unassign teacher from class with enrolled students" });
    }
    
    // 🔗 DELETE ASSIGNMENT
    await db
      .delete(subjectTeacherAssignments)
      .where(and(
        eq(subjectTeacherAssignments.teacherId, teacherId),
        eq(subjectTeacherAssignments.classId, classId),
        eq(subjectTeacherAssignments.subjectId, subjectId),
        eq(subjectTeacherAssignments.schoolId, schoolId)
      ));
    
    res.json({
      message: "Teacher successfully unassigned",
      unassignedAt: new Date()
    });
    
  } catch (error: any) {
    console.error('Unassign teacher error:', error);
    res.status(500).json({ message: "Failed to unassign teacher" });
  }
});

// 🔗 GET TEACHER'S ASSIGNMENTS
router.get("/my-assignments", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const schoolId = user.schoolId!;
    
    // 🔐 ROLE VALIDATION
    if (user.role !== "employee" || (user.subRole !== "teacher" && user.subRole !== "principal")) {
      return res.status(403).json({ message: "Only teachers can view their assignments" });
    }
    
    // 🔗 GET TEACHER'S ASSIGNMENTS
    const assignments = await db
      .select({
        subject: { id: subjects.id, name: subjects.name, code: subjects.code },
        class: { id: schoolClasses.id, name: schoolClasses.name },
        section: { id: classSections.id, name: classSections.name },
        assignment: subjectTeacherAssignments,
        enrolledStudents: sql<number>`(
          SELECT COUNT(*) 
          FROM ${studentEnrollments} 
          WHERE ${studentEnrollments.classId} = ${schoolClasses.id} 
          AND ${studentEnrollments.status} = 'active'
        )`
      })
      .from(subjectTeacherAssignments)
      .leftJoin(subjects, eq(subjects.id, subjectTeacherAssignments.subjectId))
      .leftJoin(schoolClasses, eq(schoolClasses.id, subjectTeacherAssignments.classId))
      .leftJoin(classSections, eq(classSections.id, subjectTeacherAssignments.sectionId))
      .where(and(
        eq(subjectTeacherAssignments.teacherId, user.id),
        eq(subjectTeacherAssignments.schoolId, schoolId)
      ))
      .orderBy(schoolClasses.name, subjects.name);
    
    const result = assignments.map(assignment => ({
      id: assignment.assignment.id,
      teacherId: assignment.assignment.teacherId,
      classId: assignment.assignment.classId,
      subjectId: assignment.assignment.subjectId,
      sectionId: assignment.assignment.sectionId,
      enrolledStudents: assignment.enrolledStudents || 0
    }));
    
    res.json({
      assignments: result,
      total: result.length,
      totalStudents: result.reduce((sum: number, a: any) => sum + (a.enrolledStudents || 0), 0),
      subjectsTaught: Array.from(new Set(result.map((a: any) => a.subject?.name))).length,
      classesTaught: Array.from(new Set(result.map((a: any) => a.class?.name))).length
    });
  } catch (error: any) {
    console.error('Teacher assignments dashboard error:', error);
    res.status(500).json({ message: "Failed to load teacher assignments dashboard" });
  }
});

export default router;

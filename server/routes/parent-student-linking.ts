import { Router } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db.js";
import { 
  users, 
  parentChildren,
  studentEnrollments,
  schoolClasses,
  classSections,
  academicYears
} from "@shared/schema";
import { requireAuth, AuthRequest, requireTenantAccess, validateTenantAccess } from "../middleware/auth.js";

const router = Router();

// 🔗 PARENT-STUDENT LINKING SCHEMA
const linkStudentSchema = z.object({
  childId: z.string().min(1),
  guardianPriority: z.enum(["primary", "secondary"]).default("primary"),
  relationship: z.string().min(1).default("Parent")
});

const unlinkStudentSchema = z.object({
  childId: z.string().min(1),
  reason: z.string().optional()
});

// 🔗 ADMIN VIEW: PARENT-STUDENT LINKING DASHBOARD
router.get("/parent-linking-dashboard", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId!;
    
    // 🔐 STRICT TENANT ISOLATION
    if (!validateTenantAccess(schoolId, req.user!.schoolId!)) {
      return res.status(403).json({ message: "Cross-tenant access denied" });
    }
    
    // 📊 GET ALL PARENTS
    const parents = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        createdAt: users.createdAt
      })
      .from(users)
      .where(and(
        eq(users.role, "parent"),
        eq(users.schoolId, schoolId)
      ))
      .orderBy(users.name);
    
    // 📊 GET ALL STUDENTS
    const students = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        grade: users.grade,
        classSection: users.classSection,
        studentId: users.studentId
      })
      .from(users)
      .where(and(
        eq(users.role, "student"),
        eq(users.schoolId, schoolId)
      ))
      .orderBy(users.name);
    
    // 🔗 GET EXISTING LINKS
    const links = await db
      .select({
        parent: { id: users.id, name: users.name, email: users.email },
        student: { id: users.id, name: users.name, grade: users.grade, classSection: users.classSection },
        link: parentChildren
      })
      .from(parentChildren)
      .leftJoin(users, eq(users.id, parentChildren.parentId))
      .leftJoin(users, eq(users.id, parentChildren.childId))
      .orderBy(parentChildren.createdAt);

    const allowedParentIds = new Set(parents.map((p) => p.id));
    const allowedStudentIds = new Set(students.map((s) => s.id));
    const tenantLinks = links.filter((l: any) => {
      const parentId = l.parent?.id;
      const childId = l.student?.id;
      return !!parentId && !!childId && allowedParentIds.has(parentId) && allowedStudentIds.has(childId);
    });
    
    // 📈 CALCULATE STATISTICS
    const linkedStudents = new Set(tenantLinks.map((l: any) => l.student?.id)).size;
    const linkedParents = new Set(tenantLinks.map((l: any) => l.parent?.id)).size;
    const unlinkedStudents = students.length - linkedStudents;
    
    // 🔍 FIND UNLINKED STUDENTS
    const unlinkedStudentDetails = students.filter((s: any) =>
      !tenantLinks.some((l: any) => l.student?.id === s.id)
    );
    
    // 🔍 FIND UNLINKED PARENTS
    const unlinkedParentDetails = parents.filter((p: any) =>
      !tenantLinks.some((l: any) => l.parent?.id === p.id)
    );
    
    // 👨‍👩‍👧‍👦 MULTI-PARENT SUPPORT ANALYSIS
    const multiParentStudents = tenantLinks.reduce((acc: any, link: any) => {
      if (link.student?.id) {
        acc[link.student.id] = (acc[link.student.id] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    const studentsWithMultipleParents = Object.entries(multiParentStudents)
      .filter(([_, count]) => Number(count) > 1)
      .length;
    
    res.json({
      statistics: {
        totalParents: parents.length,
        totalStudents: students.length,
        linkedStudents,
        linkedParents,
        unlinkedStudents,
        studentsWithMultipleParents
      },
      parents,
      students,
      links: tenantLinks,
      unlinkedStudents: unlinkedStudentDetails,
      unlinkedParents: unlinkedParentDetails,
      multiParentAnalysis: {
        studentsWithMultipleParents,
        breakdown: Object.entries(multiParentStudents)
          .filter(([_, count]) => Number(count) > 1)
          .map(([studentId, count]) => ({
            studentId,
            count,
            studentName: students.find(s => s.id === studentId)?.name
          }))
      }
    });
    
  } catch (error: any) {
    console.error('Parent linking dashboard error:', error);
    res.status(500).json({ message: "Failed to load parent linking dashboard" });
  }
});

// 🔗 LINK PARENT TO STUDENT
router.post("/link-student", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId!;
    
    // 🔐 STRICT TENANT ISOLATION & ROLE VALIDATION
    if (!validateTenantAccess(schoolId, req.user!.schoolId!)) {
      return res.status(403).json({ message: "Cross-tenant access denied" });
    }
    
    if (req.user!.role !== "admin") {
      return res.status(403).json({ message: "Only admins can link parents to students" });
    }
    
    const body = linkStudentSchema.parse(req.body);
    const { childId, guardianPriority, relationship } = body;
    
    // 🔍 VALIDATE STUDENT EXISTS AND BELONGS TO SCHOOL
    const [student] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.id, childId),
        eq(users.role, "student"),
        eq(users.schoolId, schoolId)
      ))
      .limit(1);
    
    if (!student) {
      return res.status(404).json({ message: "Student not found or not in your school" });
    }
    
    // 🔍 VALIDATE PARENT (CURRENT USER)
    const parent = req.user!;
    
    // 🚫 PREVENT DUPLICATE LINKING
    const [existingLink] = await db
      .select()
      .from(parentChildren)
      .where(and(
        eq(parentChildren.parentId, parent.id),
        eq(parentChildren.childId, childId)
      ))
      .limit(1);
    
    if (existingLink) {
      return res.status(400).json({ message: "Parent is already linked to this student" });
    }
    
    // 🔗 CREATE LINK
    const [link] = await db
      .insert(parentChildren)
      .values({
        parentId: parent.id,
        childId
      })
      .returning();

    if (!link) {
      return res.status(500).json({ message: "Failed to create parent-child link" });
    }
    
    // 📊 UPDATE STUDENT RECORD (optional metadata)
    await db
      .update(users)
      .set({
        metadata: sql`${users.metadata} || jsonb_build_object('parentLinkedAt', NOW())`
      })
      .where(eq(users.id, childId));
    
    res.status(201).json({
      message: "Parent successfully linked to student",
      link: {
        id: link.id,
        parentId: parent.id,
        childId,
        createdAt: link.createdAt
      },
      student: {
        id: student.id,
        name: student.name,
        grade: student.grade,
        classSection: student.classSection
      }
    });
    
  } catch (error: any) {
    console.error('Link student error:', error);
    res.status(500).json({ message: "Failed to link parent to student" });
  }
});

// 🔗 UNLINK PARENT FROM STUDENT
router.post("/unlink-student", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId!;
    
    // 🔐 STRICT TENANT ISOLATION & ROLE VALIDATION
    if (!validateTenantAccess(schoolId, req.user!.schoolId!)) {
      return res.status(403).json({ message: "Cross-tenant access denied" });
    }
    
    if (req.user!.role !== "admin") {
      return res.status(403).json({ message: "Only admins can unlink parents from students" });
    }
    
    const body = unlinkStudentSchema.parse(req.body);
    const { childId, reason } = body;
    
    // 🔍 FIND EXISTING LINK
    const [existingLink] = await db
      .select()
      .from(parentChildren)
      .where(and(
        eq(parentChildren.parentId, req.user!.id),
        eq(parentChildren.childId, childId)
      ))
      .limit(1);
    
    if (!existingLink) {
      return res.status(404).json({ message: "Link not found" });
    }
    
    // 🔗 DELETE LINK
    await db
      .delete(parentChildren)
      .where(and(
        eq(parentChildren.parentId, req.user!.id),
        eq(parentChildren.childId, childId)
      ));
    
    // 📊 LOG UNLINKING
    await db
      .update(users)
      .set({
        metadata: sql`${users.metadata} || jsonb_build_object('parentUnlinkedAt', NOW(), 'parentUnlinkReason', ${reason || 'Admin action'})`
      })
      .where(eq(users.id, childId));
    
    res.json({
      message: "Parent successfully unlinked from student",
      unlinkedAt: new Date(),
      reason: reason || "Admin action"
    });
    
  } catch (error: any) {
    console.error('Unlink student error:', error);
    res.status(500).json({ message: "Failed to unlink parent from student" });
  }
});

// 🔗 REASSIGN STUDENT TO DIFFERENT PARENT
router.post("/reassign-student", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId!;
    
    // 🔐 STRICT TENANT ISOLATION & ROLE VALIDATION
    if (!validateTenantAccess(schoolId, req.user!.schoolId!)) {
      return res.status(403).json({ message: "Cross-tenant access denied" });
    }
    
    if (req.user!.role !== "admin") {
      return res.status(403).json({ message: "Only admins can reassign students" });
    }
    
    const { childId, fromParentId, toParentId, guardianPriority, relationship } = req.body;
    
    // 🔍 VALIDATE ALL PARTIES EXIST AND BELONG TO SCHOOL
    const [student] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.id, childId),
        eq(users.role, "student"),
        eq(users.schoolId, schoolId)
      ))
      .limit(1);
    
    const [fromParent] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.id, fromParentId),
        eq(users.role, "parent"),
        eq(users.schoolId, schoolId)
      ))
      .limit(1);
    
    const [toParent] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.id, toParentId),
        eq(users.role, "parent"),
        eq(users.schoolId, schoolId)
      ))
      .limit(1);
    
    if (!student || !fromParent || !toParent) {
      return res.status(404).json({ message: "Student or parent not found" });
    }
    
    // 🔍 FIND EXISTING LINK
    const [existingLink] = await db
      .select()
      .from(parentChildren)
      .where(and(
        eq(parentChildren.parentId, fromParentId),
        eq(parentChildren.childId, childId)
      ))
      .limit(1);
    
    if (!existingLink) {
      return res.status(404).json({ message: "Existing link not found" });
    }
    
    // 🚫 PREVENT DUPLICATE ASSIGNMENT
    const [duplicateLink] = await db
      .select()
      .from(parentChildren)
      .where(and(
        eq(parentChildren.parentId, toParentId),
        eq(parentChildren.childId, childId)
      ))
      .limit(1);
    
    if (duplicateLink) {
      return res.status(400).json({ message: "Target parent is already linked to this student" });
    }
    
    // 🔗 DELETE OLD LINK AND CREATE NEW ONE
    await db.transaction(async (tx) => {
      // Delete old link
      await tx
        .delete(parentChildren)
        .where(and(
          eq(parentChildren.parentId, fromParentId),
          eq(parentChildren.childId, childId)
        ));
      
      // Create new link
      await tx
        .insert(parentChildren)
        .values({
          parentId: toParentId,
          childId
        });
    });
    
    res.json({
      message: "Student successfully reassigned to new parent",
      reassignedAt: new Date(),
      fromParent: { id: fromParentId, name: fromParent.name },
      toParent: { id: toParentId, name: toParent.name },
      student: { id: childId, name: student.name }
    });
    
  } catch (error: any) {
    console.error('Reassign student error:', error);
    res.status(500).json({ message: "Failed to reassign student" });
  }
});

// 🔗 GET PARENT'S LINKED CHILDREN
router.get("/my-children", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const schoolId = user.schoolId!;
    
    // 🔐 ROLE VALIDATION
    if (user.role !== "parent") {
      return res.status(403).json({ message: "Only parents can view their linked children" });
    }
    
    // 🔗 GET PARENT'S LINKED CHILDREN
    const links = await db
      .select({
        student: {
          id: users.id,
          name: users.name,
          email: users.email,
          grade: users.grade,
          classSection: users.classSection,
          studentId: users.studentId
        },
        link: parentChildren,
        enrollment: studentEnrollments,
        class: schoolClasses,
        section: classSections,
        academicYear: academicYears
      })
      .from(parentChildren)
      .leftJoin(users, eq(users.id, parentChildren.childId))
      .leftJoin(studentEnrollments, and(
        eq(studentEnrollments.studentId, users.id),
        eq(studentEnrollments.status, "active")
      ))
      .leftJoin(schoolClasses, eq(schoolClasses.id, studentEnrollments.classId))
      .leftJoin(classSections, eq(classSections.id, studentEnrollments.sectionId))
      .leftJoin(academicYears, eq(academicYears.id, studentEnrollments.academicYearId))
      .where(and(
        eq(parentChildren.parentId, user.id)
      ))
      .orderBy(users.name);
    
    const children = links.map(link => ({
      id: link.student?.id,
      name: link.student?.name,
      email: link.student?.email,
      grade: link.student?.grade,
      classSection: link.student?.classSection,
      childId: link.student?.id,
      createdAt: link.link?.createdAt,
      currentEnrollment: link.enrollment ? {
        classId: link.enrollment.classId,
        sectionId: link.enrollment.sectionId,
        academicYear: link.academicYear?.name,
        className: link.class?.name,
        sectionName: link.section?.name
      } : null
    }));
    
    res.json({
      children,
      total: children.length,
      primaryGuardian: children.filter(c => c.childId).length,
      secondaryGuardian: children.filter(c => c.childId).length
    });
    
  } catch (error: any) {
    console.error('Get my children error:', error);
    res.status(500).json({ message: "Failed to get linked children" });
  }
});

export default router;

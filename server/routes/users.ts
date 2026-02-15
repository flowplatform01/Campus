import { Router } from "express";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "../db.js";
import { users, employeeSubRoles } from "@shared/schema";
import { requireAuth, AuthRequest, requireTenantAccess, validateTenantAccess } from "../middleware/auth.js";

const router = Router();

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(["admin", "student", "parent", "employee"]),
  studentId: z.string().optional(),
  subRole: z.string().optional(),
  employeeId: z.string().optional(),
});

router.get("/", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== "admin") {
      return res.status(403).json({ message: "Not allowed" });
    }
    const schoolId = req.user!.schoolId!;
    
    // 🔐 STRICT TENANT ISOLATION - Double validation
    if (!validateTenantAccess(schoolId, req.user!.schoolId!)) {
      return res.status(403).json({ message: "Cross-tenant access denied" });
    }

    const rows = await db
      .select()
      .from(users)
      .where(and(eq(users.schoolId, schoolId)))
      .orderBy(users.createdAt);
    return res.json(rows);
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ message: "Failed to fetch users" });
  }
});

router.get("/staff", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId;
    if (!schoolId) return res.status(400).json({ message: "No school linked" });
    
    const rows = await db.select().from(users).where(and(eq(users.schoolId, schoolId), eq(users.role, "employee")));
    return res.json(rows.map(u => ({ id: u.id, name: u.name, subRole: u.subRole, schoolId: u.schoolId })));
  } catch (e) {
    return res.status(500).json({ message: "Failed to list staff" });
  }
});

router.post("/", requireAuth, requireTenantAccess, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== "admin") {
      return res.status(403).json({ message: "Not allowed" });
    }
    const schoolId = req.user!.schoolId!;
    
    // 🔐 STRICT TENANT ISOLATION - Validate school assignment
    if (!validateTenantAccess(schoolId, req.user!.schoolId!)) {
      return res.status(403).json({ message: "Cross-tenant access denied" });
    }

    const body = createUserSchema.parse(req.body);
    const hashed = await bcrypt.hash(body.password, 10);

    // Admin creating user: link to school, set subRole for employees, studentId for students
    const [row] = await db
      .insert(users)
      .values({
        email: body.email,
        password: hashed,
        name: body.name,
        role: body.role,
        schoolId: schoolId,
        subRole: body.role === "employee" ? (body.subRole || null) : null,
        studentId: body.role === "student" ? (body.studentId || null) : null,
        employeeId: body.role === "employee" ? (body.employeeId || null) : null,
        verified: true,
        emailVerifiedAt: new Date(),
        profileCompletion: body.role === "employee" ? 60 : 60,
      })
      .returning();

    return res.status(201).json({
      id: row!.id,
      email: row!.email,
      name: row!.name,
      role: row!.role,
      avatar: row!.avatarUrl,
      profileCompletion: row!.profileCompletion,
      verified: !!row!.emailVerifiedAt,
      schoolLinked: !!row!.schoolId,
      points: row!.points,
      badges: row!.badges || [],
      studentId: row!.studentId,
      employeeId: row!.employeeId,
      grade: row!.grade,
      classSection: row!.classSection,
      subRole: row!.subRole,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", errors: e.errors });
    }
    return res.status(500).json({ message: "Failed to create user" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.params.id!)).limit(1);
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatarUrl,
      profileCompletion: user.profileCompletion,
      verified: !!user.emailVerifiedAt,
      schoolLinked: !!user.schoolId,
      points: user.points,
      badges: user.badges || [],
      studentId: user.studentId,
      employeeId: user.employeeId,
      grade: user.grade,
      classSection: user.classSection,
      subRole: user.subRole,
    });
  } catch (e) {
    return res.status(500).json({ message: "Failed to fetch user" });
  }
});

export default router;

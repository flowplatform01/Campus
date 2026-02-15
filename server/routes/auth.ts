import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db.js";
import {
  users,
  emailVerificationTokens,
  passwordResetTokens,
  refreshTokens,
  schools,
} from "@shared/schema";
import { config } from "../config.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "../services/email.js";

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(["admin", "student", "parent", "employee"]),
  schoolName: z.string().optional(),
  studentId: z.string().optional(),
  employeeId: z.string().optional(),
  subRole: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const forgotPasswordSchema = z.object({ email: z.string().email() });
const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(6),
});
const verifyEmailSchema = z.object({ token: z.string() });

function createTokens(userId: string, email: string, role: string) {
  const access = jwt.sign(
    { sub: userId, email, role },
    config.jwt.secret,
    { expiresIn: config.jwt.accessExpiry }
  );
  const refresh = jwt.sign(
    { sub: userId, type: "refresh" },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiry }
  );
  return { access, refresh };
}

router.post("/register", async (req, res) => {
  try {
    const body = registerSchema.parse(req.body);
    const [existing] = await db.select().from(users).where(eq(users.email, body.email)).limit(1);
    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }
    const hashed = await bcrypt.hash(body.password, 10);
    let schoolId: string | null = null;
    if (body.role === "admin" && body.schoolName) {
      const [school] = await db
        .insert(schools)
        .values({ name: body.schoolName })
        .returning();
      schoolId = school?.id ?? null;
    }
    const [user] = await db
      .insert(users)
      .values({
        email: body.email,
        password: hashed,
        name: body.name,
        role: body.role,
        verified: true,
        emailVerifiedAt: new Date(),
        profileCompletion: 20,
        schoolId,
        studentId: body.studentId,
        employeeId: body.employeeId,
        subRole: body.subRole || (body.role === "employee" ? "teacher" : null),
      })
      .returning();
    if (!user) throw new Error("Insert failed");

    // Skip email verification token in dev for immediate login
    let verificationEmailSent = false;

    const { access, refresh } = createTokens(user.id, user.email, user.role);
    const userResponse = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        profileCompletion: user.profileCompletion,
        verified: !!user.emailVerifiedAt,
        schoolLinked: !!user.schoolId,
        schoolId: user.schoolId,
        avatar: user.avatarUrl,
        points: user.points,
        badges: user.badges || [],
    };
    return res.status(201).json({
      user: userResponse,
      accessToken: access,
      refreshToken: refresh,
      expiresIn: 900,
      verificationEmailSent,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", errors: e.errors });
    }
    console.error(e);
    return res.status(500).json({ message: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    console.log(`[Auth] Login attempt for:`, req.body.email);
    const body = loginSchema.parse(req.body);
    console.log(`[Auth] Parsed body:`, { email: body.email, hasPassword: !!body.password });
    
    const [user] = await db.select().from(users).where(eq(users.email, body.email)).limit(1);
    console.log(`[Auth] User found:`, !!user, user ? { id: user.id, email: user.email, hasPassword: !!user.password } : null);
    
    if (!user) {
      console.log(`[Auth] Login failed for ${body.email}: User not found`);
      return res.status(401).json({ message: "Invalid email or password" });
    }
    
    const passwordMatch = await bcrypt.compare(body.password, user.password);
    console.log(`[Auth] Password match:`, passwordMatch);
    
    if (!passwordMatch) {
      console.log(`[Auth] Login failed for ${body.email}: Invalid password`);
      return res.status(401).json({ message: "Invalid email or password" });
    }
    const { access, refresh } = createTokens(user.id, user.email, user.role);
    const userResponse = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        profileCompletion: user.profileCompletion,
        verified: !!user.emailVerifiedAt,
        schoolLinked: !!user.schoolId,
        schoolId: user.schoolId,
        avatar: user.avatarUrl,
        points: user.points,
        badges: user.badges || [],
        onboardingCompletedAt: user.onboardingCompletedAt,
    };
    return res.json({
      user: userResponse,
      accessToken: access,
      refreshToken: refresh,
      expiresIn: 900,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input" });
    }
    return res.status(500).json({ message: "Login failed" });
  }
});

router.post("/refresh", async (req, res) => {
  const refreshToken = req.body.refreshToken;
  if (!refreshToken) {
    return res.status(400).json({ message: "Refresh token required" });
  }
  try {
    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as {
      sub: string;
      type?: string;
    };
    if (decoded.type !== "refresh") throw new Error("Invalid token type");
    const [user] = await db.select().from(users).where(eq(users.id, decoded.sub)).limit(1);
    if (!user) return res.status(401).json({ message: "User not found" });
    const { access, refresh } = createTokens(user.id, user.email, user.role);
    return res.json({
      accessToken: access,
      refreshToken: refresh,
      expiresIn: 900,
    });
  } catch {
    return res.status(401).json({ message: "Invalid refresh token" });
  }
});

router.post("/verify-email", async (req, res) => {
  try {
    const { token } = verifyEmailSchema.parse(req.body);
    const [row] = await db
      .select()
      .from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.token, token))
      .limit(1);
    if (!row || new Date() > row.expiresAt) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }
    await db
      .update(users)
      .set({ verified: true, emailVerifiedAt: new Date() })
      .where(eq(users.id, row.userId));
    await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.id, row.id));
    return res.json({ message: "Email verified" });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input" });
    }
    return res.status(500).json({ message: "Verification failed" });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (user) {
      const token = nanoid(32);
      await db.insert(passwordResetTokens).values({
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
      await sendPasswordResetEmail(email, token);
    }
    return res.json({ message: "If the email exists, a reset link was sent" });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input" });
    }
    return res.status(500).json({ message: "Request failed" });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);
    const [row] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token))
      .limit(1);
    if (!row || new Date() > row.expiresAt) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }
    const hashed = await bcrypt.hash(password, 10);
    await db.update(users).set({ password: hashed }).where(eq(users.id, row.userId));
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, row.id));
    return res.json({ message: "Password reset successful" });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input" });
    }
    return res.status(500).json({ message: "Reset failed" });
  }
});

router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  const [user] = await db.select().from(users).where(eq(users.id, req.user!.id)).limit(1);
  if (!user) return res.status(404).json({ message: "User not found" });
  return res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    profileCompletion: user.profileCompletion,
    verified: !!user.emailVerifiedAt,
    schoolLinked: !!user.schoolId,
    schoolId: user.schoolId,
    avatar: user.avatarUrl,
    points: user.points,
    badges: user.badges || [],
    onboardingCompletedAt: user.onboardingCompletedAt,
  });
});

router.patch("/me/onboarding-complete", requireAuth, async (req: AuthRequest, res) => {
  try {
    await db
      .update(users)
      .set({ onboardingCompletedAt: new Date(), profileCompletion: 100, updatedAt: new Date() })
      .where(eq(users.id, req.user!.id));
    return res.json({ message: "Onboarding completed" });
  } catch (e) {
    return res.status(500).json({ message: "Failed to update onboarding" });
  }
});

export default router;

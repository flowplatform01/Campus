import "./config.js";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
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
    await db.insert(parentChildren).values({ parentId: parent.id, childId: student.id });
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
    .where(eq(academicTerms.academicYearId, year.id))
    .limit(1);
  if (!term) {
    const [createdTerm] = await db
      .insert(academicTerms)
      .values({
        schoolId: school.id,
        academicYearId: year.id,
        name: "Term 1",
        startDate: year.startDate,
        endDate: year.endDate,
      })
      .returning();
    term = createdTerm;
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
      academicYearId: year.id,
      studentId: student.id,
      classId: cls.id,
      sectionId: null,
      status: "active",
    });
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

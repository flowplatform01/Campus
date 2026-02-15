import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  jsonb,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============ Schools ============
export const schools = pgTable("schools", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============ Users ============
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: varchar("role", { length: 20 }).notNull(), // admin | student | parent | employee
  avatarUrl: text("avatar_url"),
  phone: text("phone"),
  profileCompletion: integer("profile_completion").default(0).notNull(),
  verified: boolean("verified").default(false).notNull(),
  emailVerifiedAt: timestamp("email_verified_at"),
  schoolId: varchar("school_id").references(() => schools.id),
  subRole: varchar("sub_role", { length: 30 }), // teacher, principal, bursar, etc.
  studentId: varchar("student_id", { length: 50 }),
  employeeId: varchar("employee_id", { length: 50 }),
  grade: varchar("grade", { length: 20 }),
  classSection: varchar("class_section", { length: 20 }),
  points: integer("points").default(0),
  badges: jsonb("badges").$type<string[]>().default([]),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  onboardingCompletedAt: timestamp("onboarding_completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const refreshTokens = pgTable("refresh_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============ Posts (Social) ============
export const posts = pgTable("posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  authorId: varchar("author_id").references(() => users.id).notNull(),
  postedAsSchool: boolean("posted_as_school").default(false).notNull(),
  content: text("content").notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  visibility: varchar("visibility", { length: 20 }).default("public").notNull(),
  mediaType: varchar("media_type", { length: 20 }),
  mediaUrl: text("media_url"),
  mediaThumbnail: text("media_thumbnail"),
  tags: jsonb("tags").$type<string[]>().default([]),
  likesCount: integer("likes_count").default(0).notNull(),
  schoolId: varchar("school_id").references(() => schools.id),
  scheduledAt: timestamp("scheduled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const postLikes = pgTable("post_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").references(() => posts.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").references(() => posts.id).notNull(),
  authorId: varchar("author_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  parentId: varchar("parent_id").references((): AnyPgColumn => comments.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============ Communities ============
export const communities = pgTable("communities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  type: varchar("type", { length: 30 }).notNull(),
  avatarUrl: text("avatar_url"),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  schoolId: varchar("school_id").references(() => schools.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const communityMembers = pgTable("community_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  communityId: varchar("community_id").references(() => communities.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  role: varchar("role", { length: 20 }).default("member").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

// ============ Chats ============
export const chatConversations = pgTable("chat_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type", { length: 20 }).notNull(), // private | group
  name: text("name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const chatParticipants = pgTable("chat_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").references(() => chatConversations.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").references(() => chatConversations.id).notNull(),
  senderId: varchar("sender_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============ Notifications ============
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // campus | social
  title: text("title").notNull(),
  message: text("message").notNull(),
  actionUrl: text("action_url"),
  icon: text("icon"),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const announcements = pgTable("announcements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").references(() => schools.id),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  postedAsSchool: boolean("posted_as_school").default(true).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  audienceType: varchar("audience_type", { length: 30 }).default("entire_school").notNull(), // entire_school | class | parents_only | employees_only | sub_role
  audienceId: varchar("audience_id", { length: 100 }), // classId or sub_role key when applicable
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============ SMS (Core Academics Foundation) ============
export const academicYears = pgTable("academic_years", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").references(() => schools.id).notNull(),
  name: text("name").notNull(), // e.g. 2025/2026
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  isActive: boolean("is_active").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const academicTerms = pgTable("academic_terms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").references(() => schools.id).notNull(),
  academicYearId: varchar("academic_year_id").references(() => academicYears.id).notNull(),
  name: text("name").notNull(), // e.g. Term 1 / Semester 1
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  isActive: boolean("is_active").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const schoolClasses = pgTable("school_classes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").references(() => schools.id).notNull(),
  name: text("name").notNull(), // e.g. Grade 10
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const classSections = pgTable("class_sections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").references(() => schools.id).notNull(),
  classId: varchar("class_id").references(() => schoolClasses.id).notNull(),
  name: text("name").notNull(), // e.g. A, B, Blue
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const subjects = pgTable("subjects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").references(() => schools.id).notNull(),
  name: text("name").notNull(),
  code: varchar("code", { length: 30 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const subjectTeacherAssignments = pgTable("subject_teacher_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").references(() => schools.id).notNull(),
  academicYearId: varchar("academic_year_id").references(() => academicYears.id).notNull(),
  subjectId: varchar("subject_id").references(() => subjects.id).notNull(),
  teacherId: varchar("teacher_id").references(() => users.id).notNull(),
  classId: varchar("class_id").references(() => schoolClasses.id),
  sectionId: varchar("section_id").references(() => classSections.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const studentEnrollments = pgTable("student_enrollments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").references(() => schools.id).notNull(),
  academicYearId: varchar("academic_year_id").references(() => academicYears.id).notNull(),
  termId: varchar("term_id").references(() => academicTerms.id),
  studentId: varchar("student_id").references(() => users.id).notNull(),
  classId: varchar("class_id").references(() => schoolClasses.id).notNull(),
  sectionId: varchar("section_id").references(() => classSections.id),
  status: varchar("status", { length: 20 }).default("active").notNull(), // active | promoted | graduated | withdrawn
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============ SMS (Timetable Engine) ==========
export const timetablePublications = pgTable("timetable_publications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").references(() => schools.id).notNull(),
  academicYearId: varchar("academic_year_id").references(() => academicYears.id).notNull(),
  termId: varchar("term_id").references(() => academicTerms.id).notNull(),
  classId: varchar("class_id").references(() => schoolClasses.id).notNull(),
  sectionId: varchar("section_id").references(() => classSections.id),
  status: varchar("status", { length: 20 }).default("draft").notNull(), // draft | published
  publishedAt: timestamp("published_at"),
  publishedBy: varchar("published_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const timetableSlots = pgTable("timetable_slots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").references(() => schools.id).notNull(),
  academicYearId: varchar("academic_year_id").references(() => academicYears.id).notNull(),
  termId: varchar("term_id").references(() => academicTerms.id).notNull(),
  classId: varchar("class_id").references(() => schoolClasses.id).notNull(),
  sectionId: varchar("section_id").references(() => classSections.id),
  weekday: varchar("weekday", { length: 10 }).notNull(), // mon | tue | wed | thu | fri | sat | sun
  startTime: varchar("start_time", { length: 5 }).notNull(), // HH:MM
  endTime: varchar("end_time", { length: 5 }).notNull(), // HH:MM
  subjectId: varchar("subject_id").references(() => subjects.id).notNull(),
  teacherId: varchar("teacher_id").references(() => users.id).notNull(),
  room: text("room"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============ SMS (Assignments Workflow) ==========
export const smsAssignments = pgTable("sms_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").references(() => schools.id).notNull(),
  academicYearId: varchar("academic_year_id").references(() => academicYears.id).notNull(),
  termId: varchar("term_id").references(() => academicTerms.id).notNull(),
  classId: varchar("class_id").references(() => schoolClasses.id).notNull(),
  sectionId: varchar("section_id").references(() => classSections.id),
  subjectId: varchar("subject_id").references(() => subjects.id).notNull(),

  title: text("title").notNull(),
  instructions: text("instructions").notNull(),
  dueAt: timestamp("due_at").notNull(),
  maxScore: integer("max_score").notNull(),
  attachmentUrl: text("attachment_url"),

  status: varchar("status", { length: 20 }).default("draft").notNull(), // draft | published | closed
  publishedAt: timestamp("published_at"),
  closedAt: timestamp("closed_at"),

  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const smsAssignmentSubmissions = pgTable("sms_assignment_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assignmentId: varchar("assignment_id").references(() => smsAssignments.id).notNull(),
  schoolId: varchar("school_id").references(() => schools.id).notNull(),
  studentId: varchar("student_id").references(() => users.id).notNull(),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  submissionUrl: text("submission_url"),
  submissionText: text("submission_text"),

  score: integer("score"),
  feedback: text("feedback"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
});

export const smsAttendanceSessions = pgTable("sms_attendance_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").references(() => schools.id).notNull(),
  academicYearId: varchar("academic_year_id").references(() => academicYears.id).notNull(),
  termId: varchar("term_id").references(() => academicTerms.id).notNull(),
  classId: varchar("class_id").references(() => schoolClasses.id).notNull(),
  sectionId: varchar("section_id").references(() => classSections.id),
  subjectId: varchar("subject_id").references(() => subjects.id),
  date: timestamp("date").notNull(),

  status: varchar("status", { length: 20 }).default("draft").notNull(),
  markedBy: varchar("marked_by").references(() => users.id).notNull(),
  submittedBy: varchar("submitted_by").references(() => users.id),
  submittedAt: timestamp("submitted_at"),
  lockedBy: varchar("locked_by").references(() => users.id),
  lockedAt: timestamp("locked_at"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const smsAttendanceEntries = pgTable("sms_attendance_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => smsAttendanceSessions.id).notNull(),
  schoolId: varchar("school_id").references(() => schools.id).notNull(),
  studentId: varchar("student_id").references(() => users.id).notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  note: text("note"),
  markedAt: timestamp("marked_at").defaultNow().notNull(),
  markedBy: varchar("marked_by").references(() => users.id).notNull(),
});

export const smsAttendanceAuditLog = pgTable("sms_attendance_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").references(() => schools.id).notNull(),
  sessionId: varchar("session_id").references(() => smsAttendanceSessions.id).notNull(),
  entryId: varchar("entry_id").references(() => smsAttendanceEntries.id),
  action: varchar("action", { length: 50 }).notNull(),
  actorId: varchar("actor_id").references(() => users.id).notNull(),
  at: timestamp("at").defaultNow().notNull(),
  meta: jsonb("meta").$type<Record<string, unknown>>(),
});

export const smsResources = pgTable("sms_resources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").references(() => schools.id).notNull(),
  academicYearId: varchar("academic_year_id").references(() => academicYears.id),
  classId: varchar("class_id").references(() => schoolClasses.id),
  sectionId: varchar("section_id").references(() => classSections.id),
  subjectId: varchar("subject_id").references(() => subjects.id),

  title: text("title").notNull(),
  description: text("description"),
  url: text("url").notNull(),
  type: varchar("type", { length: 20 }).default("link").notNull(),

  uploadedBy: varchar("uploaded_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const smsFeeHeads = pgTable("sms_fee_heads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").references(() => schools.id).notNull(),
  name: text("name").notNull(),
  code: varchar("code", { length: 50 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const smsInvoices = pgTable("sms_invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").references(() => schools.id).notNull(),
  academicYearId: varchar("academic_year_id").references(() => academicYears.id),
  termId: varchar("term_id").references(() => academicTerms.id),
  studentId: varchar("student_id").references(() => users.id).notNull(),
  status: varchar("status", { length: 20 }).default("open").notNull(),
  issuedAt: timestamp("issued_at").defaultNow().notNull(),
  dueAt: timestamp("due_at"),
  notes: text("notes"),
  subtotalAmount: integer("subtotal_amount").default(0).notNull(),
  totalAmount: integer("total_amount").default(0).notNull(),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const smsInvoiceLines = pgTable("sms_invoice_lines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").references(() => smsInvoices.id).notNull(),
  schoolId: varchar("school_id").references(() => schools.id).notNull(),
  feeHeadId: varchar("fee_head_id").references(() => smsFeeHeads.id),
  description: text("description").notNull(),
  amount: integer("amount").notNull(),
});

export const smsPayments = pgTable("sms_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").references(() => schools.id).notNull(),
  invoiceId: varchar("invoice_id").references(() => smsInvoices.id).notNull(),
  studentId: varchar("student_id").references(() => users.id).notNull(),
  amount: integer("amount").notNull(),
  method: varchar("method", { length: 30 }).notNull(),
  reference: varchar("reference", { length: 100 }),
  paidAt: timestamp("paid_at").defaultNow().notNull(),
  recordedBy: varchar("recorded_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const smsPaymentSettings = pgTable("sms_payment_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").references(() => schools.id).notNull(),
  currency: varchar("currency", { length: 10 }).default("USD").notNull(),
  methods: jsonb("methods").$type<string[]>().default([]).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============ SMS (Roles, Sub-Roles, Permissions) ============
export const employeeSubRoles = pgTable("employee_sub_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").references(() => schools.id).notNull(),
  key: varchar("key", { length: 50 }).notNull(), // teacher | principal | secretary | accountant | ...
  name: text("name").notNull(),
  isSystem: boolean("is_system").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const permissionCatalog = pgTable("permission_catalog", {
  key: varchar("key", { length: 80 }).primaryKey(),
  label: text("label").notNull(),
  description: text("description").notNull(),
});

export const subRolePermissionGrants = pgTable("sub_role_permission_grants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").references(() => schools.id).notNull(),
  subRoleId: varchar("sub_role_id").references(() => employeeSubRoles.id).notNull(),
  permissionKey: varchar("permission_key", { length: 80 }).references(() => permissionCatalog.key).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userPermissionOverrides = pgTable("user_permission_overrides", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").references(() => schools.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  permissionKey: varchar("permission_key", { length: 80 }).references(() => permissionCatalog.key).notNull(),
  allowed: boolean("allowed").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============ SMS (Admissions) ============
export const admissions = pgTable("admissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").references(() => schools.id).notNull(),
  academicYearId: varchar("academic_year_id").references(() => academicYears.id).notNull(),
  classId: varchar("class_id").references(() => schoolClasses.id).notNull(),
  sectionId: varchar("section_id").references(() => classSections.id),

  studentFullName: text("student_full_name").notNull(),
  studentEmail: text("student_email"),
  studentPhone: text("student_phone"),
  desiredStudentId: varchar("desired_student_id", { length: 50 }),

  parentFullName: text("parent_full_name"),
  parentEmail: text("parent_email"),
  parentPhone: text("parent_phone"),

  status: varchar("status", { length: 30 }).default("submitted").notNull(), // submitted | approved | rejected | withdrawn
  notes: text("notes"),

  createdBy: varchar("created_by").references(() => users.id),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============ Unified Enrollment Applications (Student self, Parent-submitted, Employee) ============
export const enrollmentApplications = pgTable("enrollment_applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type", { length: 30 }).notNull(), // student_self | parent_student | employee
  schoolId: varchar("school_id").references(() => schools.id).notNull(),
  applicantUserId: varchar("applicant_user_id").references(() => users.id).notNull(),
  status: varchar("status", { length: 30 }).default("submitted").notNull(), // draft | submitted | under_review | info_requested | approved | rejected | waitlisted | withdrawn
  academicYearId: varchar("academic_year_id").references(() => academicYears.id),
  classId: varchar("class_id").references(() => schoolClasses.id),
  sectionId: varchar("section_id").references(() => classSections.id),
  desiredSubRoleId: varchar("desired_sub_role_id").references(() => employeeSubRoles.id),
  payload: jsonb("payload").$type<Record<string, unknown>>(), // child info, documents, CV url, etc.
  pendingStudentProfileId: varchar("pending_student_profile_id"), // for parent flow: link to pending child
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Pending student profiles (parent-created, not yet approved)
export const pendingStudentProfiles = pgTable("pending_student_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").references(() => users.id).notNull(),
  fullName: text("full_name").notNull(),
  dateOfBirth: timestamp("date_of_birth").notNull(),
  previousSchool: text("previous_school"),
  desiredClassId: varchar("desired_class_id").references(() => schoolClasses.id),
  academicYearId: varchar("academic_year_id").references(() => academicYears.id),
  documents: jsonb("documents").$type<string[]>().default([]),
  medicalInfo: text("medical_info"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============ Academics ============
export const grades = pgTable("grades", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").references(() => users.id).notNull(),
  subject: text("subject").notNull(),
  score: integer("score").notNull(),
  maxScore: integer("max_score").notNull(),
  term: text("term").notNull(),
  date: timestamp("date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const assignments = pgTable("assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  dueDate: timestamp("due_date").notNull(),
  maxScore: integer("max_score").notNull(),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  schoolId: varchar("school_id").references(() => schools.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const assignmentSubmissions = pgTable("assignment_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assignmentId: varchar("assignment_id").references(() => assignments.id).notNull(),
  studentId: varchar("student_id").references(() => users.id).notNull(),
  fileUrl: text("file_url"),
  score: integer("score"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
});

export const attendance = pgTable("attendance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").references(() => users.id).notNull(),
  date: timestamp("date").notNull(),
  status: varchar("status", { length: 20 }).notNull(), // present | absent | late
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const schedules = pgTable("schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  day: text("day").notNull(),
  time: text("time").notNull(),
  subject: text("subject").notNull(),
  teacher: text("teacher").notNull(),
  room: text("room").notNull(),
  schoolId: varchar("school_id").references(() => schools.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============ Parent-Child links ============
export const parentChildren = pgTable("parent_children", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").references(() => users.id).notNull(),
  childId: varchar("child_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas and types
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPostSchema = createInsertSchema(posts).omit({ id: true, createdAt: true, updatedAt: true, likesCount: true });
export const insertCommentSchema = createInsertSchema(comments).omit({ id: true, createdAt: true });
export const insertAssignmentSubmissionSchema = createInsertSchema(smsAssignmentSubmissions).omit({ id: true, submittedAt: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof posts.$inferSelect;
export type School = typeof schools.$inferSelect;
export type InsertAssignmentSubmission = z.infer<typeof insertAssignmentSubmissionSchema>;

// ============ SMS (Exam Management) ============
export const smsExams = pgTable("sms_exams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").references(() => schools.id).notNull(),
  academicYearId: varchar("academic_year_id").references(() => academicYears.id).notNull(),
  termId: varchar("term_id").references(() => academicTerms.id).notNull(),
  name: text("name").notNull(), // e.g. Mid Term, Final Exam
  type: varchar("type", { length: 30 }).default("exam").notNull(), // exam | quiz | test
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  status: varchar("status", { length: 20 }).default("scheduled").notNull(), // scheduled | ongoing | completed | published
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const smsExamMarks = pgTable("sms_exam_marks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  examId: varchar("exam_id").references(() => smsExams.id).notNull(),
  studentId: varchar("student_id").references(() => users.id).notNull(),
  subjectId: varchar("subject_id").references(() => subjects.id).notNull(),
  marksObtained: integer("marks_obtained"),
  totalMarks: integer("total_marks").notNull(),
  remarks: text("remarks"),
  gradedBy: varchar("graded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const smsGradeScales = pgTable("sms_grade_scales", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").references(() => schools.id).notNull(),
  name: text("name").notNull(), // e.g. Primary Grade Scale
  minPercentage: integer("min_percentage").notNull(),
  maxPercentage: integer("max_percentage").notNull(),
  grade: varchar("grade", { length: 10 }).notNull(), // e.g. A+, B, C
  points: integer("points").default(0),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============ SMS (Expenses Management) ============
export const smsExpenses = pgTable("sms_expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").references(() => schools.id).notNull(),
  category: varchar("category", { length: 50 }).notNull(), // salary | utility | maintenance | other
  title: text("title").notNull(),
  amount: integer("amount").notNull(),
  date: timestamp("date").defaultNow().notNull(),
  notes: text("notes"),
  recordedBy: varchar("recorded_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============ SMS (Staff Attendance) ============
export const smsStaffAttendanceSessions = pgTable("sms_staff_attendance_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").references(() => schools.id).notNull(),
  date: timestamp("date").notNull(),
  status: varchar("status", { length: 20 }).default("draft").notNull(),
  markedBy: varchar("marked_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const smsStaffAttendanceEntries = pgTable("sms_staff_attendance_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => smsStaffAttendanceSessions.id).notNull(),
  schoolId: varchar("school_id").references(() => schools.id).notNull(),
  staffId: varchar("staff_id").references(() => users.id).notNull(),
  status: varchar("status", { length: 20 }).notNull(), // present | absent | late | excused
  note: text("note"),
  markedAt: timestamp("marked_at").defaultNow().notNull(),
  markedBy: varchar("marked_by").references(() => users.id).notNull(),
});

// ============ Student Achievements (school-scoped, rewards, visibility) ============
export const studentAchievements = pgTable("student_achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").references(() => schools.id).notNull(),
  studentId: varchar("student_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  type: varchar("type", { length: 30 }).default("academic").notNull(),
  points: integer("points").default(0).notNull(),
  reward: text("reward"),
  visibility: varchar("visibility", { length: 20 }).default("school").notNull(),
  awardedBy: varchar("awarded_by").references(() => users.id),
  awardedAt: timestamp("awarded_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Achievement definitions (catalog per school)
export const smsAchievements = pgTable("sms_achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").references(() => schools.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  type: varchar("type", { length: 30 }).default("academic").notNull(),
  points: integer("points").default(0).notNull(),
  icon: text("icon"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Awarded achievements (student + achievement definition)
export const smsStudentAchievements = pgTable("sms_student_achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").references(() => users.id).notNull(),
  achievementId: varchar("achievement_id").references(() => smsAchievements.id).notNull(),
  achievedAt: timestamp("achieved_at").defaultNow().notNull(),
  notes: text("notes"),
});
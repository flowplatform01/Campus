# Campus - School Management & Educational Social Platform

## Overview

Campus is a full-stack SaaS application that combines a comprehensive School Management System (SMS) with an educational social media platform. It is owned by a company called "Flow" and targets schools, academies, and educational institutions.

The platform has two distinct modes:
- **Campus Mode**: Core school management — classes, grades, attendance, assignments, schedules, payments, users, and reporting, all scoped to a school spine (School → Academic Year → Term → Class → Section → Subject → Enrollment).
- **Social Mode**: An educational social network — posts, comments, likes, communities, explore/discover, and real-time chat.

The project uses a monorepo-style layout with `client/`, `server/`, and `shared/` directories inside a `Campus/` folder. The backend is Express + Drizzle ORM connected to Neon PostgreSQL. The frontend is React + TypeScript with Vite, Tailwind CSS, and shadcn/ui components.

The system is transitioning from mock/placeholder data to a fully production-ready backend. Many features exist as frontend UI but still reference mock data or show "coming soon" placeholders.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (client/)
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight router, not React Router)
- **State Management**: React Context (AuthContext, ModeContext) + TanStack React Query for server state
- **UI Library**: shadcn/ui (New York style) built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Animations**: Framer Motion
- **Build Tool**: Vite with path aliases (`@/` → `client/src/`, `@shared/` → `shared/`)
- **Form Handling**: React Hook Form with Zod resolvers via `@hookform/resolvers`

**Key frontend patterns**:
- `DashboardLayout` wraps all authenticated pages with a top bar, dynamic sidebar, and bottom navigation
- `ModeSwitcher` toggles between Campus Mode and Social Mode, changing navigation and available features
- `PermissionGate` component and `usePermissions` hook provide client-side RBAC gating
- Role-based dashboards: AdminDashboard, StudentDashboard, ParentDashboard, EmployeeDashboard
- Campus management pages live under `client/src/pages/campus/` (Users, Academics, Attendance, Assignments, Schedule, Announcements, Reports, Resources, Payments, Admin)
- Social pages: SocialFeed, Explore, Communities, Chats, Notifications
- API calls go through `client/src/lib/api.ts` which uses Bearer token auth from localStorage
- Mock data still exists in `client/src/data-access/` (mockData.ts, socialMockData.ts, mockApi.ts) — some pages still reference these instead of real API calls

### Backend (server/)
- **Framework**: Express.js with TypeScript (runs via tsx in development, esbuild bundle in production)
- **Database**: Neon PostgreSQL via `@neondatabase/serverless` + Drizzle ORM (neon-http driver)
- **Schema**: Defined in `shared/schema.ts` using Drizzle's `pgTable` definitions
- **Authentication**: JWT-based (access + refresh tokens), bcryptjs for password hashing
- **Middleware**: `requireAuth` middleware validates Bearer tokens and attaches user to request
- **Real-time**: Socket.IO for chat and notifications (attached to the HTTP server)
- **File Storage**: Backblaze B2 via AWS S3 SDK (presigned URLs for upload/download)
- **Email**: Nodemailer with Gmail SMTP for verification emails and password resets

**API Routes** (all under `/api/`):
- `/api/auth` — register, login, logout, verify-email, forgot-password, reset-password, refresh, me
- `/api/social` — posts CRUD, likes, comments
- `/api/academics` — grades, assignments, submissions, attendance, schedules
- `/api/announcements` — school announcements
- `/api/communities` — community CRUD, join/leave
- `/api/notifications` — user notifications, mark-as-read
- `/api/users` — admin user management
- `/api/upload` — file upload to B2
- `/api/sms` — comprehensive school management endpoints (academic years, terms, classes, sections, subjects, enrollments, sub-roles, permissions, timetables, attendance sessions, assignments, fees, invoices, payments, resources, admissions)

**Development mode**: Vite dev server is served as middleware through Express (single port). In production, static files are served from `dist/public/`.

### Shared (shared/)
- `shared/schema.ts` contains the complete Drizzle PostgreSQL schema, shared between frontend (types) and backend (queries)
- Key database tables include: schools, users, academicYears, academicTerms, schoolClasses, classSections, subjects, studentEnrollments, grades, assignments, assignmentSubmissions, attendance, schedules, posts, postLikes, comments, communities, communityMembers, notifications, announcements, refreshTokens, emailVerificationTokens, passwordResetTokens, and SMS-specific tables (smsAttendanceSessions, smsAttendanceEntries, smsAssignments, smsFeeHeads, smsInvoices, smsPayments, timetableSlots, etc.)
- Insert schemas are generated via `drizzle-zod` with `createInsertSchema`

### RBAC / Permissions
- Four core roles: `admin`, `student`, `parent`, `employee`
- Employee sub-roles: `teacher`, `principal`, `bursar`, `secretary`, `librarian`, `counselor`
- Permissions defined in `client/src/lib/permissions.ts` and seeded server-side in `server/routes/sms.ts`
- Permission catalog stored in database (`permissionCatalog`, `employeeSubRoles`, `subRolePermissionGrants` tables)
- Admin can create custom sub-roles and assign granular permissions

### Database Schema Design
- Uses `varchar` with `gen_random_uuid()` defaults for primary keys (UUID strings)
- School spine: schools → academicYears → academicTerms → schoolClasses → classSections → subjects → studentEnrollments
- All school-scoped data references `schoolId` for multi-tenant isolation
- Drizzle Kit manages migrations (`drizzle.config.ts` reads `DATABASE_URL` from `server/.env`)

### Environment Configuration
- Server env: `server/.env` — DATABASE_URL, JWT secrets, SMTP config, Backblaze B2 config, CLIENT_URL, PORT
- Client env: `client/.env` — VITE_API_BASE_URL
- Config loaded in `server/config.ts` using dotenv

## External Dependencies

### Database
- **Neon PostgreSQL**: Serverless Postgres (connection via `@neondatabase/serverless` HTTP driver, not traditional pg pool)
- **Drizzle ORM**: Schema definition, query building, migrations via `drizzle-kit push`

### File Storage
- **Backblaze B2**: S3-compatible object storage for document/file uploads, accessed via `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`

### Email
- **Google SMTP** (Gmail): Transactional emails for verification and password reset via Nodemailer

### Real-time Communication
- **Socket.IO**: WebSocket server for real-time chat messages and notifications

### Frontend UI
- **shadcn/ui**: Component library (Radix UI primitives + Tailwind CSS)
- **TanStack React Query**: Server state management and caching
- **Framer Motion**: Page transitions and animations
- **Wouter**: Client-side routing

### Authentication
- **jsonwebtoken**: JWT signing/verification (access tokens: 15min, refresh tokens: 7d)
- **bcryptjs**: Password hashing

### Build/Dev Tools
- **Vite**: Frontend build tool with HMR
- **esbuild**: Server bundling for production
- **tsx**: TypeScript execution for development
- **Replit plugins**: `@replit/vite-plugin-runtime-error-modal`, `@replit/vite-plugin-cartographer`, `@replit/vite-plugin-dev-banner` (dev only)
🔥  MASTER PROMPT
School Management System — Completion, Gap-Filling & Production Hardening

READ CAREFULLY — DO NOT ASSUME FEATURES EXIST

This application is already partially built.
Many expected school-system features are missing entirely, not misused.
Your task is to study the codebase deeply, identify what is missing, and implement what SHOULD exist, without redesigning or destroying the app’s uniqueness.

1. FULL DEEP STUDY (MANDATORY FIRST STEP)

You must fully read and understand:

Frontend pages, components, navigation,.env

Backend routes, services, middleware, .env

Database schema (my ap uses Neon) & relationships

Existing workflows vs placeholders

What is implemented vs what is NOT implemented , what is duplicated,
Identify what is shallow, fake, or incomplete,Identify what is visually present but logically broken,Identify what exists only in Admin tab but should be distributed smartly if required

⚠️ Never assume a feature exists just because a UI input is present.
If the app uses a URL input where real-world apps require uploads, treat that feature as incomplete and incorrect.

2. CORE PROBLEM (THE REAL ISSUE)

The app currently:

Appears functional but is logically incomplete

Has UX anti-patterns (URL-based images)

Has missing real-world school workflows

Has weak or missing links between entities

Has an underdeveloped autonomy & notification layer

and suffers from
Duplicate or repeated modules

Poor or inconsistent organization in some areas

Incomplete or shallow workflows

Features that exist visually but are not logically connected

Data tables that exist but are not fully operational in real use

Your mission is to turn existing code into complete, authoritative workflows, not e.g not just tables or placeholders. 
Your job is to finish the system, not merely polish it.



3.
a)FIX LOGIC, LINKS, AND RELATIONSHIPS (CRITICAL)

Inspect and correct all missing or weak relationships, including but not limited to:

Student ↔ Class ↔ Section

Teacher (as a sub-role of Employee, not a primary role)

Employee ↔ Subject ↔ Class

Roles ↔ Permissions ↔ Capabilities

Academic year ↔ Term ↔ Timetable ↔ Attendance ↔ Assignments

Ensure:

Teachers are treated as employees with capabilities, not standalone roles

Assignments, attendance, and schedules are fully linked to the academic spine

Nothing “floats” without ownership or scope

b) EXPORT & REPORTING FEATURES (MISSING, NOT MISUSED)

The app currently does not support:

PDF export

Excel / CSV export

Print-ready reporting

You must add these features where they naturally belong, including:

Academic reports

Administrative summaries

Student analytics

Performance overviews

Rules:

Exports must be permission-aware

PDFs must be formatted and printable

Excel/CSV must be structured and clean

Do NOT add exports randomly across the app

4. FILE UPLOADS (CRITICAL SYSTEM GAP)
Important

The app incorrectly relies on URL inputs for images and files.
This is not acceptable for production systems.

You must implement real file upload flows.

Required upload areas:

Assignments & learning materials

User profile photos

School logo

Resources & documents

UX Requirements:

When user clicks “Change Profile Picture” →
Prompt file picker (gallery / device), NOT a URL input

When school updates branding →
Provide Upload Logo action, not URL text field

5. STORAGE ARCHITECTURE (CONSTRAINT-AWARE & PRODUCTION-SAFE)
Context (Important Constraint)

This app uses TWO storage systems:

Neon (PostgreSQL) — primary database

Backblaze B2 — object storage (free plan, private-only)

Due to Backblaze free plan limitations, public asset hosting is NOT available.
Therefore, publicly viewable assets MUST NOT depend on Backblaze.

This is intentional and must be respected.
A) Neon Database (Publicly Viewable Assets)

The following assets MUST be stored and served from Neon, not Backblaze:

User profile pictures

School logo

School branding visuals

Any asset that is:

Publicly visible

Displayed across dashboards

Required without authentication barriers

Storage Method:

Store images as:

Base64

Binary / bytea

Or compressed image blobs

Include:

MIME type

Size

Owner reference

Last updated timestamp

This avoids:

Public bucket requirements

External hosting costs

Broken images due to storage limits

This is by design, not a workaround.

B) Backblaze B2 (Private & Large Files)

Backblaze is reserved strictly for:

Assignment uploads

Student submissions

Learning resources

Reports (PDF, Excel)

Any large or private files

Rules:

Files are NOT publicly accessible

Access is always mediated by backend

Signed or temporary access logic if required

Metadata stored in Neon, file stored in Backblaze

This preserves:

Security

Cost efficiency

Scalability

C) Smart Differentiation Logic (MANDATORY)

The system must automatically decide:

Asset Type	Storage
Profile photo	Neon
School logo	Neon
Branding assets	Neon
Assignments	Backblaze
Submissions	Backblaze
Reports	Backblaze

This logic must be:

Centralized

Explicit

Documented in code

D) UX Alignment (Very Important)

Even though storage differs:

User experience must be identical

User clicks “Upload”

App handles storage silently

User never sees Neon vs Backblaze

No URLs.
No confusion.
No broken flows.

6. PROFILE SYSTEM (INCOMPLETE UX)

Current state:

Default avatar exists

Profile image change requires URL ❌

You must implement:

Real photo upload for profiles

Default avatar fallback

Image preview before save

Ability to replace/remove profile photo

Profile system must feel:

Human

Modern

Real-world usable

7. SCHOOL BRANDING & IDENTITY (EXPAND & HARDEN)

Branding must support:

School name

Optional school motto

School logo upload (file-based)

Visual identity consistency across app

Smart Branding Behavior:

App should adapt layout to logo aspect ratio

Logo should render correctly across dashboards

Fallback logo when none uploaded

Branding changes should reflect instantly

Branding is identity, not decoration.

8. ROLES, SUB-ROLES & CAPABILITIES

Clarification:

Teacher is a sub-role, not a primary role

Teacher = Employee with teaching capabilities

Primary roles:

School Admin

Employee

Student

Parent

Implement capability-based access control:

Permissions define actions

Admin can delegate

System must operate without admin micromanagement

9. CORE SCHOOL WORKFLOWS (MUST EXIST)
A) Assignments

Complete lifecycle:

Upload materials

Publish

Submit (file-based)

Review & grade

Close

B) Attendance

Tied to class, subject, date

Immutable after submission

Audit logs

Summaries for students & parents

C) Timetable (CORE IP)

Class timetables

Teacher timetables (derived)

Conflict detection

Weekly & daily views

Integrated with attendance & assignments

D) Grading & Promotion

Continuous assessment

Exams

Grades or average smart calculation

Report cards (PDF) 

Promotion logic and automation with Manual overrides with permission

10. ANNOUNCEMENTS vs NOTIFICATIONS (DO NOT CONFUSE)
Announcements

Manual

Targeted

Rich content

May trigger notifications

Notifications

Autonomous + manual

Assignment alerts

Due reminders

Grade release

Attendance events

Timetable changes

Notification system is underdeveloped and must be completed.

11. REPORTS & ANALYTICS

Must include:

Be role-aware

Include:

 Graphs

 Percentages

 Trends

 Summaries

Support PDF export

Reports ≠ Report Cards
Both must exist and be distinc.

12. AUTONOMY & SMART SYSTEMS

Reminder notifications

Academic transitions

Attendance summaries

Reminders (due assignments, missing attendance)

Intelligent defaults

Admin override always possible

System should feel smart, not rigid

13. FINAL QUALITY PASS (MANDATORY)

Before stopping:

Remove duplicates

Eliminate placeholder logic

Ensure no fake workflows

Verify uploads, permissions, storage

Test full user journeys

The app must feel:

Complete

Authoritative

Production-ready

School-grade reliable

14. HARD CONSTRAINTS

❌ Do not redesign UI unnecessarily
❌ Do not remove existing working logic
❌ Do not spoil uniqueness

✅ Complete
✅ Connect
✅ Harden
✅ Finish properly

FINAL EXPECTATION

This app must transition from “partially implemented” → “fully operational school system”, with real-world UX, correct storage, complete workflows, and intelligent autonomy.

Proceed carefully. Proceed thoroughly.
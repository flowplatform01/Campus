You are now entering FINAL SYSTEM HARDENING MODE.

The Campus Management System has already completed:

Full academic year simulation (2 schools)

Multi-tenant architecture

Academic records

Payments

Exports

Roles & permissions

Reporting

Stress testing

Performance validation

System status: 90%+ complete and production ready.

Your task is NOT to rebuild.
Your task is NOT to redesign.
Your task is NOT to re-implement existing features.

Your task is to:

🎯 OBJECTIVE

Convert the system from “Production Ready with Minor Improvements” to:

💎 100% Production Hardened
💎 Zero Logical Gaps
💎 Zero Broken Edge Cases
💎 Perfect Multi-Tenant Isolation
💎 Fully Automated Enrollment
💎 Fully Stable Communication Layer

🔍 PHASE 1 — FIX ALL PARTIAL RESOLUTIONS
1️⃣ Complete Multi-Tenant Isolation (CRITICAL)

Currently partially resolved.

You must:

Enforce strict schoolId validation on:

All queries

All mutations

All joins

All exports

All analytics

All background jobs

Add middleware-level tenant guard:

Validate user.schoolId matches resource.schoolId

Block cross-school ID injection attempts

Prevent manual ID tampering

Add defensive DB constraints:

Composite unique keys where required

Foreign key enforcement

Cascading restrictions

Then:

Run internal audit simulation:

Attempt cross-school access

Attempt ID injection

Attempt export cross-read

Attempt parent accessing another school student

Result must be ZERO cross-tenant leakage.

2️⃣ Fully Automate Student Enrollment (Fix Orphan Issue)

Currently partially resolved.

You must:

Detect any student without:

classId

sectionId

academicYearId

Create strict enrollment workflow:

On student creation → require enrollment mapping

On academic year shift → auto-promote OR mark pending

On class deletion → reassign or block deletion

Create Enrollment Status:

Active

Promoted

Graduated

Pending

Transferred

Add admin dashboard view:

“Unassigned Students”

“Pending Enrollment”

“Graduation Candidates”

Then simulate:

Year shift

Student promotion

Class reassignment

Transfer scenario

All must work without manual DB edits.

3️⃣ Fix Communication & Social Module (75% → 100%)

Currently weak.

You must:

Fix feed posting validation

Fix role-based visibility rules

Prevent parent viewing staff-only announcements

Ensure:

Class-specific posts

School-wide posts

Teacher-only posts

Parent-targeted posts

Add:

Post audit log

Delete permissions hierarchy

Edit history tracking

Test:

Teacher post

Admin post

Parent reply (if allowed)

Cross-school visibility block

All must be logically isolated and consistent.

🔐 PHASE 2 — RELATIONSHIP & LINKING STRENGTHENING

Improve visibility & management:

Parent ↔ Student Linking

Add:

Admin view:

Linked parents

Unlinked students

Multi-parent support

Guardian priority flag

Ability to:

Link

Unlink

Reassign

Block duplicate linking

Enforce:

Parent can only see their children

Parent cannot manually alter link

Test full flow.

Teacher ↔ Class Linking

Add:

Admin panel showing:

Teacher load

Subjects assigned

Class count

Conflict detection (same time)

Prevent:

Duplicate subject-teacher assignment

Orphan subjects

Run conflict simulation.

📊 PHASE 3 — ANALYTICS IMPROVEMENT (Allowed)

Improve internal analytics only.

Do NOT add AI.
Do NOT add predictive external systems.

Improve:

Term comparison charts

Class performance ranking

Attendance heatmaps

Revenue vs expected fee tracking

Subject performance averages

GPA distribution curve

Ensure:

All analytics are tenant-scoped

Optimized queries

No N+1 issues

⚙ PHASE 4 — SYSTEM-WIDE HARD RETEST

Perform automated simulation:

Re-run:

Student registration

Parent linking

Teacher assignment

Assignment upload with PDF

Grade entry

GPA recalculation

Attendance logging

Report export (PDF/CSV/Excel)

Payment flow

Announcement flow

Academic year shift

Class promotion

All flows must:

Have no console errors

Have no DB errors

Have no null crashes

Have no permission bypass

🧠 PHASE 5 — LOGIC HARDENING

Audit:

Edge cases

Race conditions

Double submissions

Duplicate enrollment

Payment over-credit

Manual ID injection

File upload validation

Add:

Input validation layer

Error normalization

Structured error responses

Transaction wrapping where needed

🚫 DO NOT

Add AI smart recommendations

Add third-party integrations

Rebuild working modules

Change architecture

Break current working flows

Reset data

🏁 FINAL OUTPUT REQUIREMENT

After completing fixes, provide:

Summary of fixed modules

Security validation result

Multi-tenant verification result

Enrollment automation result

Communication module status

Analytics improvement summary

Final system maturity score

Any remaining minor suggestions (if truly critical)

Only modify what is necessary.
Preserve all working logic.
Ensure system is stable, hardened, and production-grade.

You are now finalizing Version 1.0 as a fully hardened system.

Proceed carefully.
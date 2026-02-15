SYSTEM MODE: DEEP ARCHITECTURAL AUDIT + FUNCTIONAL RECONSTRUCTION

This is NOT a redesign task.
This is NOT a restart.
This is NOT a UI-only fix.

This is a deep diagnostic + root cause correction mission.

You must:

1. Fully analyze the current implementation.
2. Identify WHY each highlighted issue exists.
3. Trace the root logic failure.
4. Correct architecture where necessary.
5. Preserve all working systems.
6. Retest everything after fixes.

No shallow patching.
No temporary fixes.
No fake UI responses.
No cosmetic corrections.

-----------------------------------------
SECTION 1 — PAYMENT SYSTEM FAILURE
-----------------------------------------

Investigate payment screenshot and:

• Identify payment grouping logic
• Check invoice creation integrity
• Verify parent payment flow
• Confirm transaction storage
• Confirm linkage to student
• Confirm linkage to school
• Confirm fee structure logic
• Confirm access control

Fix:
- Parent must only see their child’s invoices
- Payment must attach to correct student
- Payment must reflect under school accounting
- No orphan payments
- No fake “success” UI without DB persistence

-----------------------------------------
SECTION 2 — SUBJECT CREATION FAILURE
-----------------------------------------

Problem:
- sample subject are not simulated or visible
- Subjects show success message
- But subject not stored physically

You must:

• Inspect backend handler
• Inspect frontend component
• Inspect DB insert query
• Inspect transaction rollback
• Inspect schoolId linkage
• Inspect multi-tenant filter

Fix:

- Subject must be stored
- Must attach to correct school
- Must be manageable or editable
- Must appear immediately in listing
- Must be retrievable by class
- Must support future assignment linkage
all this if not done or done well.
-and you must create some sample subjects for each school (simulating  testing it properly it is working as required and ok)

-----------------------------------------
SECTION 3 — STAFF SUB-ROLE SYSTEM FAILURE
-----------------------------------------

Problem:
 
- in staff & permission No sub-roles simulated or sub-role not visible 
- in user when creating user and selecting Employee creation it shows “position” instead of sub-role
- Role logic mixed

You must:

Rebuild hierarchy logic properly:

for Employee Role selection in create user
Sub-role dropdown = e.g Teacher / Accountant / Principal / bursar etc (created by admin or authourised that are in "staff & permission")


Fix:
- Sub-role table must exist
- Sub-role must belong to school
- Employee creation must:
   → Select Role (Employee)
   → Then show Sub-role dropdown
- Remove “position” misuse
- Sub-role must define permissions

-----------------------------------------
SECTION 4 — STUDENT-SCHOOL LINKAGE FAILURE with new registered app student 
-----------------------------------------

Problem:
- login works well but in the case where when a new Studentself registers into app,
- No linkage to school interface feature or unique feature (application to a school option / or entering of school cridentials given to link )
hence
 - Cannot link to a school
 - Orphan accounts

You must implement:

1. School discovery interface
   - Search school
   - Filter by open application



Status tracking
2. Application flow:
   - Apply (Application form engine (customizable per school))
   - Application form engine (customizable per school) and Approval dashboard management (note: this additional tab will be called Enrolment ) for admin or authorized user
   - Await approval, for school linking
   - Auto-accept if school allows (Free Enrollment → auto-join)
   
3. Admin or authorized user approval system () 
4. Approved student attaches to:
   - School
   - Class
   - Academic year
5. After approval:
   - Student sees only school content an class activity

-----------------------------------------
SECTION 5 — PARENT-DRIVEN STUDENT APPLICATION & LINKAGE SYSTEM
-----------------------------------------

Current Problem:
- Parent cannot independently apply for student admission.
- No interface for parent to create child profile.
- No parent-driven enrollment workflow.
- Admin-only linkage logic exists.
- No structured approval pipeline.

This is architecturally incomplete.

REQUIRED SYSTEM RECONSTRUCTION

The system must support TWO enrollment pathways:

PATH A — Student Self-Application (for older students)
PATH B — Parent-Initiated Student Application (for minors cases)

PATH B — PARENT CREATES & APPLIES FOR CHILD:

When a Parent logs in:

Parent Dashboard must include:
   additional left side ar tab /module called Enrollment"  (but unique for parents) that has
→ "Apply for Student Admission"
→ "Register a Child"
→ "Link Existing Child"

STEP 1 — CHILD PROFILE CREATION

Parent must be able to:

• Enter child information:
    - Full Name
    - Date of Birth
    - Previous School (optional)
    - Desired Class
    - Academic Year
    - Supporting documents (if required by school)
• Upload required documents
• Save draft
• Continue later

This creates:
→ A Pending Student Profile (NOT active yet)
→ Linked to Parent account
→ Status = Pending Application

STEP 2 — SCHOOL SELECTION

Parent must:

• Search for schools
• Filter by:
    - Application Open
    - active Academic Year
    - Class availability

System must:
• Only allow application to schools with open enrollment
• Respect school-specific admission configuration

STEP 3 — APPLICATION SUBMISSION

Parent submits application.

System must:

• Create Admission Application Record
• Link:
    → Parent ID
    → Child Pending Profile
    → School ID
• Set status = Pending Review
• Notify school admin or authorized sub-role

STEP 4 — SCHOOL REVIEW WORKFLOW

Admin or authorized sub-role Dashboard must include:

→ "Enrolment"

Admin can:
• Approve
• Reject
• Request additional information

If APPROVED:
• System creates official Student record
• Student linked to:
    → School
    → Class
    → Academic Year
• Parent automatically linked
• Student status = Active

If REJECTED:
• Status updated
• Parent notified

IMPORTANT RULES

• Parent-created child must NOT automatically become active student.
• No orphan child profiles.
• Parent can manage multiple children.
• Each child can belong to different schools (if needed).
• Parent only sees their children.
• School only sees applications submitted to it.

LINKAGE AFTER APPROVAL

After approval:

Student must:
• Appear in class list
• Appear in attendance system
• Appear in billing system
• Appear in timetable
• Appear in exam system

Parent must:
• View student dashboard
• Pay fees (- Pull selected child invoices and mapping)
• View attendance
• View assignments
• View results

SECURITY + TENANT ISOLATION

• Parent cannot apply to closed schools.
• Parent cannot edit student after approval (unless allowed).
• No cross-school data exposure.
• Parent cannot view other students.

UI REQUIREMENTS

• Application must NOT look like database table.
• Use guided form interface.
• Include progress indicator.
• Include status tracker:
    - Draft
    - Submitted
    - Under Review
    - Approved
    - Rejected

VALIDATION REQUIRED

After implementation:

• Test multiple children under one parent.
• Test multiple schools.
• Test approval and rejection.
• Confirm student only gains access AFTER approval.
• Confirm no duplicate student records.
• Confirm no orphan applications.

-----------------------------------------
SECTION 6 — new EMPLOYEE SELF REGISTRATION in app FLOW BROKEN
-----------------------------------------

Correct flow:

1. Employee registers with:
   - Name
   - Email
   - Password
2. No sub-role selection at registration
3. After login:
    there should be a well developed interface  additional  side bar tab /module feature called Enrollment (but unique to employee to Apply to Work at a School) that:
   - search school
   - View if school is accepting staff applications (manageable in Admin or authorized sub-role Enrolment dashboard )
   - Select desired sub-role (from school's published open roles)
   - Upload CV / documents
   - Submit application
   - admin or authorizes user approves or manages (should be fully managed in Enrolment in admin or authorize sub-role section)
4. Or employee matches pre-created record
5. System creates:

→ Employee Application Record
→ Status = Pending Review
→ Linked to:
    - Employee Account
    - Target School
    - Desired Sub-role

Remove:
- Position from registration
- Employee ID requirement

-----------------------------------------
SECTION 7 — UNIFIED ENROLLMENT MANAGEMENT tab (Unique for ADMIN or authorized Sub-role DASHBOARD)
-----------------------------------------

Enrollment (This is a NEW core left side bar tab ) is the official gateway into the school system.

It must manage THREE application types:

1. Student Admission (Self-Application)
2. Parent-Initiated Student Admission
3. Employee Work Application

This module must exist as a standalone dashboard section:

→ ENROLLMENT (the one unique for ADMIN or authorized Sub-role DASHBOARD)

Accessible only by:
• Admin
• Authorized Sub-Roles (e.g Admission Officer, HR Officer , principal)

ENROLLMENT DASHBOARD STRUCTURE

Dashboard must include tabs or filters:

• Student Applications
• Parent-Submitted Applications
• Employee Applications
• Approved Enrollments
• Rejected Applications
• Waitlisted
• Withdrawn


..>STUDENT & PARENT APPLICATIONS MANAGEMENT

Within Enrollment Module:

Add a new tab:

→ Student Applications
When opened:

1. Overview Panel
   - Total Applications
   - Pending
   - Approved
   - Rejected
   - Waitlisted
   - Enrolled This Academic Year
   - Capacity Remaining per Class

2. Application Queue
   - Filterable by:
       → Academic Year
       → Class
       → Status
       → Date Submitted
       → Application Type (Parent / Student)

3. Detailed Application View
   When admin clicks an application:

   Must show:
   • Child Information
   • Parent Information
   • Submitted Documents
   • Desired Class
   • Academic Year
   • Application History Log

   Admin actions:
   → Approve
   → Reject
   → Request Additional Info
   → Assign to Class
   → Assign Admission Number
   → Send Notification

APPROVAL LOGIC

When APPROVED:

System must:

• Convert Pending Profile → Active Student
• Link Student to:
    → School
    → Class
    → Academic Year
• Auto-link Parent
• Generate Student ID (and configurable)
• Log approval event
• Notify Parent / student

When REJECTED:

• Update status
• Log reason
• Notify Parent / student
• Archive application

CLASS CAPACITY CONTROL

Enrollment module must:

• Track class capacity
• Prevent approval if class full
• Allow waitlist
• Show seat availability

..>EMPLOYEE APPLICATIONS MANAGEMENT

Within Enrollment Module:

Add a new tab:

→ Employee Applications

When opened:

Display:

• Applicant Information
• Documents
• Desired Sub-role
• Experience
• Application history

Admin actions:

→ Approve
→ Reject
→ Request Interview
→ Assign Final Sub-role
→ Assign Department
→ Set Employment Status

APPROVAL LOGIC (EMPLOYEE)

If Approved:

• Link employee to School
• Assign Sub-role
• Assign Department
• Activate employee permissions
• Set employment status = Active
• Notify employee

If Rejected:

• Update status
• Notify employee
• Archive application

CRITICAL ARCHITECTURE RULES

• Employee cannot access school resources until approved.
• Employee dashboard must remain restricted until linked.
• No manual DB linking without enrollment approval.
• Sub-role must exist before assignment.
• No mixing of "position" and "sub-role".

..>APPLICATION CONFIGURATION
 
Within Enrollment Module:

Add a new tab:

→ Application config

Admin or authorized sub-role must configure:

• Is Staff Enrollment Open?
• Which Sub-roles are open?
• Is Parent Application Allowed?
• Is Student Self-Application Allowed or open?
• Required Documents
• Auto-Approval Enabled?
• Manual Review Required?
• Class-specific enrollment rules

UNIFIED STATUS LIFECYCLE

All enrollment types must support:

Draft
Submitted
Under Review
Info Requested
Approved
Rejected
Waitlisted
Withdrawn

Each with audit logs.


ENROLLMENT INTEGRATION RULE


Enrollment is now the ONLY gateway for:

• self-Student registered activation
• Parent-child linkage approval
• new app registered Employee-school linkage
• Sub-role assignment to this new app registered Employee

No bypass allowed except:
→ unless created internally by admin or authorized sub-role (Manual override)

MULTI-TENANT ISOLATION

• School sees only its applications.
• Employee cannot see other schools’ internal data.
• Parent sees only their child applications.
• No cross-tenant leaks.

UI REQUIREMENT

• Must NOT look like raw database table.
• Must use structured panels.
• Must use workflow-style interface.
• Must visually show status badges.
• Must show timeline history of each application.

INTEGRATION REQUIREMENTS

Enrollment Module must integrate with:

• Student Module
• Parent Module
• Class Module
• Attendance Module
• Billing Module
• Timetable Module
• Notification System

No manual duplication.
No inconsistent states.

FULL SYSTEM VALIDATION AFTER IMPLEMENTATION

Simulate:

• 20 student applications
• 10 parent-created child applications
• 5 employee job applications
• Mixed approvals & rejections
• Multiple schools
• Different academic years

Verify:

• No orphan records
• No duplicate accounts
• No cross-school data access
• No employee gaining access before approval
• No student accessing class before enrollment
• No parent viewing unlinked child

-----------------------------------------
SECTION 8 — PROGRESSIVE ONBOARDING FAILURE
-----------------------------------------

Problem:
- Onboarding popup repeats
- Not state-aware
- Not conditional

Fix:
Onboarding must:
- Track completion flags
- Persist in DB
- Never re-trigger after completion
- Be role-aware
- Be school-linked-aware
- and well developed 

-----------------------------------------
SECTION 9 — ATTENDANCE FAILURE (both student and also staff attendance)
-----------------------------------------

Problem:
- No Attendance simulated or visible 
- Attendance not creating 
- Attendance not saving
-

Check:
- DB writes
- Student filtering
- Date handling
- Multi-tenant scope

Fix:
- Attendance must link to:
   → School
   → Class    
   → Subject (class subject scheduled , and it shows only respective subject linked or assigned to teacher or authorized role through schendul )
   → Student
   → Date
- Only class teacher or authorized role can mark
- Student and parent must view only own records

-----------------------------------------
SECTION 10 — ACHIEVEMENTS SYSTEM of STUDENT INCOMPLETE
-----------------------------------------

Fix:
- Achievements must link to student
- Must support rewards
- Must support visibility control
- Must be school-scoped
- Must show real data
- must be fully functional and well developed and well simulated
- Must be manage and visible to school admin or authorized user 

-----------------------------------------
SECTION 11 — TIMETABLE MISSING (in Scheduled)
-----------------------------------------

Implement:
- simulated sample records and timetable schenduled samples 
- Class timetable creation
- Day-based schedule
- Subject-teacher linking
- Student view filtered by class
- or very smart Timetable automation alternatives option button (optional but must be detailly and fully smartly developed and implanted ) 
- smart clash free and avoid scheduling conflict

-----------------------------------------
SECTION 12 — EXAMS & ACADEMICS FULL SYSTEM AUDIT
-----------------------------------------
You are required to perform a deep architectural and functional audit of the Exams and Academics modules in the Campus School ERP system.

Do NOT patch superficially. Inspect backend logic, permissions, database structure, and UI behavior. Fix structurally.

🔎 1️⃣ EXAMS SIDEBAR MODULE — FULL INSPECTION 

Although Exams UI exists, the module is incomplete.

Required Checks & Fixes:

Implement fully functional Marks Recording System:

Record marks per student

Linked to: School → Class → Subject → Exam → Academic Year

Persist properly in database

No fake success messages

Marks Management must:

Allow editing/updating

Allow viewing

Prevent duplicate entries

Support grading logic (if applicable)

Role-Based Access Control:

Teacher (authorized sub-role) → Can enter marks

School Admin → Can also manage marks

Manager/Authorized Roles → Can manage marks

Do NOT lock marks entry to Teacher dashboard only

Ensure:

Exams are school-isolated (multi-tenancy secure)

Only related students can view results

No global exposure of exams

All “Quick Actions” related to exams must:

Trigger real backend operations

Be fully functional

Not dummy buttons

📚 2️⃣ ACADEMICS SIDEBAR MODULE — COMPLETE REWORK

The Academics section (left sidebar) must be fully operational.

Ensure:

Every tab loads real data.

Records are viewable in detail (not just listed).

No placeholder/dummy interfaces.

Must Fully Work implemeted if not done or done well:

Exams

Grades

Class Records

Academic Year

Student Promotion System

Subject Assignments

📈 3️⃣ STUDENT PROMOTION LOGIC

Implement real promotion system:

Promote students from Class A → Class B

Update academic year

Preserve historical academic records

Role-restricted (Admin / Authorized sub-roles only)

equally handle smart authomation (at year end and if qualified for promotion) not over write deppendent
all this well smartly and well developed inteligently if not done or done well

🧾 4️⃣ REPORT CARD GENERATION

This is critical.

Implement if not done or done well:

Dynamic report card generation 

Pull marks from database

Calculate totals, averages, grades

school scope & academic year

Generate downloadable reportcard (PDF,csv,excel-ready structure and can print)

the dawnloadable (PDF,csv,excel-ready structure and can print) reportcard must smartly well designed and well structured equally having school brand and logo in it.

Accessible by:

Admin

Authorized roles

Parent (view only and can download as pdfor csv or excel, can print )

Student (view only and can download as pdf csv or excel, can print)

No fake rendering. Must be data-driven.

🔐 5️⃣ PERMISSIONS & CONTROL

Everything in Academics must be:

Role-restricted properly

Multi-tenant safe

Logically structured

Not hardcoded to dashboard type

⚙️ GLOBAL REQUIREMENTS

Remove dummy UI behavior.

Remove fake success notifications.

Fix broken API calls.

Ensure DB integrity with foreign keys.

Refactor messy logic.

Test all flows end-to-end.

Make system production-grade.

Do a full audit first → then refactor properly → then implement missing logic → then test thoroughly.

No shortcuts. No cosmetic fixes. Structural correction only.

-----------------------------------------
SECTION 13 — ANNOUNCEMENT SYSTEM BROKEN
-----------------------------------------

Problems:
- No targeting
- No notifications
- UI looks like raw DB table

Fix architecture:

Announcement must:
- fully improving ui and funtionality and must be fullly working
- Have sender
- Have audience type:
   → Entire school
   → Specific class
   → Parents only
   → Employees only
   → Specific sub-role
- Trigger notification system
- Display in card-based UI (not DB table style)

-----------------------------------------
SECTION 14 — SYSTEM WIDE VALIDATION
-----------------------------------------

After all fixes:

• Run full TypeScript strict check
• Run full database consistency check
• Validate no orphan records
• Validate no cross-school data leakage
• Validate all flows:

   Student flow
   Parent flow
   Employee flow
   Admin flow
   Payment flow
   Announcement flow
   Attendance flow
   Application flow

-----------------------------------------
CRITICAL RULES
-----------------------------------------

Do NOT:
- Rebuild entire project
- Break working features
- Change architecture unnecessarily
- Insert dummy UI fixes
- Bypass logic with mock data

You must:
- Fix deeply
- Fix intelligently
- Fix completely
- Retest thoroughly

-----------------------------------------
FINAL OUTPUT REQUIRED
-----------------------------------------

1. Root causes found
2. Systems modified
3. Tables affected
4. Logic and ui reconstructed
5. Critical fixes summary
6. Confirmation of zero broken flows
7. Confirmation of multi-tenant isolation intact
8. Confirmation all highlighted issues are resolved

Goal:
Campus App must behave like a real-world school management system.
No orphan users.
No fake success messages.
No broken linkage.
No weak onboarding.
No logical gaps.
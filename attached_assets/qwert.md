

🔷 — DATA EXPORT & FILE FLOW

Even if not originally implemented:

Implement (across app and smartly where required) and test:

Export class list (CSV)

Export grade sheet (Excel)

Export report card (PDF)

Print-friendly report format

Simulate and make sure export usage across school.

🔷 — PROFILE & BRANDING VALIDATION

Test:

User profile picture upload (Neon storage)

School logo upload (Neon storage)

Branding consistency across UI

Motto visibility

Profile update saves properly and works with no failure

No more URL-based image entry or for logo image in school brand (that should be inspected and fixed)



SYSTEM MODE: STORAGE ARCHITECTURE VALIDATION & CORRECTION

Do NOT redesign anything.
Do NOT rebuild systems.
Do NOT change working logic.

This task is ONLY to verify and correct storage architecture based on our agreed structure.

STORAGE RULES THAT MUST BE RESPECTED:

1. Neon is the permanent database.
2. Publicly viewable lightweight assets MUST be stored in Neon.
   This includes:
   - Profile pictures (student, parent, employee, admin)
   - School logos
   - Branding images

3. BlackBlaze is used ONLY for large files and downloadable assets:
   - Assignment uploads
   - Student submissions
   - Reports
   - Generated PDFs
   - Report cards
   - Large attachments

Because BlackBlaze free plan does NOT allow public asset hosting,
profile images and logos must NOT rely on public BlackBlaze URLs.


TASKS:

1. Inspect how profile images are currently stored.
   - Verify storage location.
   - Verify DB reference.
   - Verify retrieval logic.
   - Verify visibility in frontend.
   - Test upload → persist → retrieve → display flow.

2. Inspect school logo storage.
   - Confirm it is stored in Neon (or stored safely and retrievable).
   - Confirm branding loads correctly across dashboards.
   - Confirm it is not url based

3. Inspect large file handling.
   - Confirm assignments & reports are stored in BlackBlaze.
   - Confirm server reads BlackBlaze credentials from server .env.
   - Confirm correct bucket usage.
   - Confirm download links work.
   - Confirm secure access.

4. Verify server .env usage.
   - Ensure BlackBlaze keys are correctly read.
   - Ensure no hardcoded credentials.
   - Ensure no fallback to wrong storage.

5. Test all flows:
   - Upload profile image → visible immediately.
   - Upload school logo → visible in branding.
   - Upload assignment → stored in BlackBlaze.
   - Download report → works correctly.

CRITICAL RULES
• Do not move large files into Neon.
• Do not use BlackBlaze for public profile images.
• Do not break existing functionality.
• Only correct misrouted storage if found.

FINAL OUTPUT REQUIRED
1. Confirmation of where each asset type is stored.
2. Confirmation storage routing matches the defined rules.
3. Confirmation .env variables are used correctly.
4. Confirmation profile image upload & display works end-to-end.
5. app 


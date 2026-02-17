SYSTEM MODE: FORENSIC INSPECTION & HARD FIX
STRICT RULE:
- NO FAKE SUCCESS RESPONSES.
- NO UI-ONLY FIXES.
- NO MOCK SUCCESS.
- NO SILENT FAILURES.
- NO GENERIC ERROR MESSAGES.
- DO NOT BREAK WORKING MODULES.
- DO NOT REFACTOR UNNECESSARILY.
- ONLY FIX ROOT CAUSES.

This is V1 FINAL HARDENING before public launch.
Every action must be verified with real backend persistence.

------------------------------------------------------------
SECTION 1 — PASSWORD CHANGE FAILURE (CRITICAL)
------------------------------------------------------------

ISSUE:
Password change failing and sometimes throwing:
"Unexpected token < in JSON" / "DOCTYPE is not valid JSON"

 you must TO INVESTIGATER ROOT CAUSE


INSPECTION STEPS:

1. Open settings tab or page.
2. Inspect and test password change request.

fully fix this issue and make sure it works properly.

------------------------------------------------------------
SECTION 2 — PROFILE SAVE LYING SUCCESS (CRITICAL)
------------------------------------------------------------

ISSUE:
Save shows success but data not persisted.
After reload, data disappears and edited data not visible.

THIS IS A FAKE SUCCESS PROBLEM or inspect what is the cause.

INSPECTION:

1. Confirm API call is firing.
2. Confirm correct HTTP method.
3. Confirm backend route updating DB.
4. Confirm update query returns updated record.
5. Confirm DB commit actually happening.
6. Confirm frontend state updated from response.

FIX REQUIREMENTS:

1. Only show success AFTER DB confirms update.
2. Backend must:
   - Validate input
   - Update record
   - Return updated user object
3. Frontend must:
   - Replace local user state with returned data
   - NOT rely on old state
4. After refresh, data must still exist.

Add verification log:
   - Before update
   - After update

   or fix altanatively smartly if its a diiferent cause hence not spoiling app

NO FAKE SUCCESS MESSAGE.
SUCCESS ONLY AFTER DB CONFIRMATION.
and new changes should be persistent

------------------------------------------------------------
SECTION 3 — OFFLINE VS INVALID CREDENTIALS (CRITICAL UX FIX)
------------------------------------------------------------

ISSUE:
When offline, login says "Invalid email or password."

This is incorrect logic.

IMPLEMENT PROPER FAILURE DISTINCTION:

LOGIN FLOW:

1. First check navigator.onLine.
   If false:
       Show: "No internet connection."

2. If online:
   Attempt API call.

3. If fetch throws NetworkError:
       Show: "Unable to reach server."

4. If response status 401:
       Show: "Invalid email or password."

5. If 500:
       Show: "Server error."

NEVER show invalid credentials if request never reached backend.

------------------------------------------------------------
SECTION 4 — PROFILE PHOTO NOT REFLECTING IN TOP BAR
------------------------------------------------------------

ISSUE:
Photo uploads successfully but not shown in top navigation.

INSPECTION:

1. Confirm profile photo URL stored in DB.
2. Confirm returned in user API response.
3. Confirm top bar is using global user state.
4. Confirm image URL correct (not cached old version).
5. Confirm no static placeholder overriding dynamic value.

FIX REQUIREMENTS:

1. After upload:
   - Backend returns new image URL.
   - Frontend updates global auth/user context.
2. Top bar must subscribe to same user state.
3. On reload:
   - Fetch current user
   - Populate avatar correctly.

If caching issue:
   - Append version query param to image URL.

PHOTO MUST REFLECT IMMEDIATELY.
NO STATIC FALLBACK IF USER HAS IMAGE.

------------------------------------------------------------
SECTION 5 — ENROLLMENT SEARCH NOT RETURNING SCHOOLS
------------------------------------------------------------

ISSUE:
when typing : e.g a correct school name in search, Search returns "No school found" even when school exists and is enabled.

FORENSIC CHECK:

1. Confirm school record:
   - isActive = true
   - applicationOpen = true
   - Not soft-deleted
2. Confirm search query:
   - Case insensitive
   - Trimmed input
   - Partial matching allowed
3. Confirm DB query uses:
   ILIKE '%searchTerm%'  (or equivalent)

4. Log backend query result length.

5. Ensure frontend not filtering incorrectly.

6. Ensure debounce not blocking final call.

7. Ensure no stale state override.

OR CHECK ALTENATIVEKY SMARTLY if its another cause

FIX:

- Implement proper LIKE search
- Confirm applicationOpen condition correctly evaluated
- Return accurate results
- Display results properly

or fix altanatively and smarly if its a different fix needed to be done 

------------------------------------------------------------
SECTION 8 — GLOBAL VALIDATION & VERIFICATION PASS
------------------------------------------------------------

After all fixes:

Perform full manual test:

1. Update profile → Save → Refresh → Confirm persistence.
2. Change password → update password → Logout → Login with new password.
3. Turn off internet → Attempt login → Correct offline message.
4. Upload photo → Confirm top bar updates.
5. Enrollment search returns real school results when typing school name.

------------------------------------------------------------
FINAL OUTPUT REQUIRED
------------------------------------------------------------

Provide:

1. Root causes found.
2. Exact fixes implemented.
3. Confirmation DB persistence verified and front end too.
4. Confirmation no fake success.
5. Confirmation enrollment search working when typing name.
6. Confirmation offline detection correct.
7. Confirmation password change verified.

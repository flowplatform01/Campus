I need you to inspect and safely fix a session persistence issue in my school management SaaS app.

Problem Description:
- When users log in, everything works perfectly.
- All school data loads correctly (students, records, dashboard metrics).
- But after staying in the app for some time (idle or background tab),
  the app suddenly shows empty data:
  - Dashboards reset to zero
  - Records disappear
  - It looks like a brand-new school
- Reloading or logging in again restores the data.

Important:
This is NOT a database issue. Data is not lost — it reappears after re-login.

Likely causes to investigate:
- JWT token expiration without refresh handling
- Token not persisted properly (memory vs localStorage/cookies)
- Missing token refresh logic
- Silent 401 API failures
- Frontend global state reset
- Lost tenant/school context
- Improper auth interceptor handling

Your Tasks:

1. Analyze the authentication flow end-to-end:
   - Login response
   - Token storage location
   - API request headers
   - Token expiry configuration

2. Inspect frontend behavior:
   - How auth state is stored (context, Redux, Zustand, etc.)
   - Whether state resets after inactivity
   - How API errors are handled
   - Check for silent 401 handling

3. Inspect backend:
   - JWT expiry duration
   - Whether refresh tokens exist
   - 401 response patterns

4. Implement SAFE fixes only:
   - Do NOT rewrite the auth system
   - Do NOT change database schema
   - Do NOT break existing login logic

Preferred Fix Strategy:
- Add proper handling for expired tokens:
  - Either refresh token flow
  - OR graceful auto-logout + redirect
- Ensure token persistence across refreshes
- Prevent frontend from resetting to empty data on 401
- Add centralized auth interceptor if missing

5. Multi-tenant Safety:
   - Ensure school/tenant context is preserved across sessions

6. Stability Rules:
   - No breaking changes
   - No removal of existing features
   - Backward compatible fixes only

Deliverables:
- Root cause explanation
- What was wrong
- What was fixed
- Files modified
- Any optional improvements (clearly marked)
If possible, add lightweight session resilience improvements without increasing system complexity.
# Frontend-Backend Communication Debug Report

## Summary
- **Issue**: Production frontend fails with “Unable to reach server” because `VITE_API_BASE_URL` is not set in Render Static Site environment, causing the app to call `/api/*` on the static frontend domain instead of the backend.
- **Local issue**: `VITE_API_BASE_URL=http://localhost:3006` in `client/.env` caused the frontend to bypass the Vite dev proxy, leading to CORS/mixed-content failures. Fixed by commenting out the env var in local dev.
- **Production fix**: Set `VITE_API_BASE_URL=https://<YOUR_BACKEND>.onrender.com` in Render Static Site environment variables and redeploy.

## Verification
- Local backend health: ✅ `POST http://localhost:3006/api/auth/login` → 200 + tokens
- Local frontend via proxy: ✅ `POST http://localhost:5173/api/auth/login` → 200 + tokens
- Production build inspection: ❌ Frontend bundle contains `localhost:3006` (due to missing env)

## Root Cause
- Render Static Site build does not have `VITE_API_BASE_URL` set, so the production bundle uses an empty string, causing API calls to resolve to the static domain instead of the backend.

## Minimal Safe Fix (no code changes)
1. In Render Static Site settings, add environment variable:
   - `VITE_API_BASE_URL=https://<YOUR_BACKEND>.onrender.com`
2. Trigger a new deployment.
3. Verify live login works.

## Files Changed (local only)
- `client/.env`: commented out `VITE_API_BASE_URL` to use Vite proxy in dev
- `vite.config.ts`: changed proxy target from `0.0.0.0:3006` to `localhost:3006` for Windows compatibility

## Next Steps
- Apply the Render environment variable above.
- After deployment, test login on the live site.
- If issues persist, inspect the deployed bundle for the embedded `VITE_API_BASE_URL` value.

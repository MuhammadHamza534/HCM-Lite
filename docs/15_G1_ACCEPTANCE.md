# HCM Lite — G1 Foundation Acceptance Checklist

**Purpose:** You and the coding agent verify Phase 1 before moving to first-run/auth.  
**Gate:** G1 from `06_IMPLEMENTATION_PLAN.md`. Do not mark PASSED unless these are verified in the actual environment.

## A. Project integrity

- [ ] `D:\HCM Lite\docs` still contains all 12 approved planning docs plus handoff docs `13`–`16`.
- [ ] Root `package.json` defines workspaces `apps/web` and `apps/api` (or any documented existing monorepo structure retained).
- [ ] Root install, lint, typecheck, test and build commands execute successfully.
- [ ] `.gitignore` excludes local credentials, dependencies and build artifacts.
- [ ] `.env.example` has variable names and safe placeholders only (e.g. `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `VITE_API_BASE_URL`, future `AI_API_KEY`).
- [ ] `README.md` explains Windows PowerShell startup, database setup and environment variables.

## B. Frontend and backend

- [ ] Browser opens the React web app without crashing.
- [ ] Web app works at 375 px width.
- [ ] `GET /api/health` returns a true liveness response while backend runs.
- [ ] `GET /api/ready` reports DB available only when an actual connection succeeds; do not fake success.
- [ ] Frontend API connectivity indicator is driven by a real HTTP call.
- [ ] Reusable empty, loading, error and access-denied UI components exist.
- [ ] Auth/authorization infrastructure is present but no fake login or fake user session exists.

## C. Database and data safety

- [ ] Prisma schema and versioned migration(s) exist and are documented.
- [ ] Migration succeeds against PostgreSQL, or is marked BLOCKED until a DB is configured.
- [ ] An actual SQL check confirms **zero** companies, users, employees and operational records on first install.
- [ ] No permanent sample/demo seed or hardcoded KPI data.
- [ ] Unique keys and relationships needed for upcoming bootstrap and employee ownership are present.
- [ ] Passwords, DB URL and AI keys are not committed to the repo or sent into client bundles.

## D. Verification evidence

| Item | Actual command / URL | Result (PASS/FAIL/NOT RUN) | Evidence / issue |
|---|---|---|---|
| Install | `npm install` | | |
| Lint | `npm run lint` | | |
| Typecheck | `npm run typecheck` | | |
| Test | `npm test` | | |
| Build | `npm run build` | | |
| DB migrate | e.g. `npx prisma migrate deploy` in API workspace | | |
| API health | `http://localhost:<port>/api/health` | | |
| API ready | `http://localhost:<port>/api/ready` | | |
| Browser app | frontend local URL | | |
| Empty DB check | actual query or Prisma script | | |

## E. G1 verdict

- **PASSED:** All required validation commands and real API/DB/browser checks succeeded.
- **FAILED:** A checked item is broken or leaks fake/secrets data.
- **BLOCKED:** A necessary dependency/credential/DB is unavailable; provide exact unblock instructions and do not claim passing.

**After passing:** Ask the coding agent for its final G1 report, share the report back in ChatGPT, and proceed with a separate **Prompt 02 — First-run company setup, JWT login, Admin/HR account lifecycle and role permissions**. Do not implement M3–M9 before the relevant stage prompts.

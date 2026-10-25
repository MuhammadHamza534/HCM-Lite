# HCM Lite — Coding Prompt 01: Project Foundation (G1)

**Stage:** Phase 1 in `06_IMPLEMENTATION_PLAN.md`  
**Goal:** Create a reliable TypeScript monorepo skeleton, a live backend/frontend connection, and an empty PostgreSQL/Prisma database.  
**Important:** This is the **first implementation prompt**, not a prompt to build all nine modules.

## Copy/paste the entire prompt below AFTER `13_AGENT_INSTRUCTIONS.md`

```text
IMPLEMENTATION PHASE 1 — FOUNDATION ONLY (Gate G1)

PROJECT ROOT: D:\HCM Lite

STEP 0 — VERIFY AND PLAN
1. Check your current working directory. Work only inside D:\HCM Lite.
2. Verify docs/01_PRD.md through docs/12_DECISION_LOG.md exist. Also read docs/13_AGENT_INSTRUCTIONS.md, docs/15_G1_ACCEPTANCE.md and docs/16_EXECUTION_ROADMAP.md.
3. Summarize architecture and planned file changes in a concise checklist. Preserve original docs.
4. Inspect existing files before writing. Do not overwrite a working repository if it already exists.
5. Follow official PDF requirements as reflected in docs; proposed endpoint/table names are engineering decisions, not new PDF requirements.

STEP 1 — SET UP REPOSITORY AND WORKSPACES
1. Initialize a clean Git project if one does not already exist (do not commit automatically if the user has not requested it).
2. Create npm workspaces for apps/web and apps/api; share consistent TypeScript, lint, formatting and test conventions.
3. Required root files: package.json, package-lock.json, .gitignore, .env.example, README.md, and tsconfig base config if useful.
4. Provide root scripts such as npm run dev, build, lint, typecheck and test. Document what each actually executes.
5. Never create fake seed data, example employees or credentials in committed files.

STEP 2 — BACKEND SKELETON
1. Create apps/api using Express + TypeScript with a feature/module-oriented directory design (auth, organization, employees, attendance, leave, payroll, analytics, ai, comms, audit), but DO NOT implement domain endpoints yet.
2. Add structured configuration validation, centralized error handling, request validation helper, logging with secret redaction, and CORS restricted to the configured frontend origin.
3. Implement GET /api/health (process liveness) and GET /api/ready (database readiness) with honest responses; readiness must fail appropriately when PostgreSQL cannot be reached.
4. Set up JWT verifier and role/scope guard infrastructure as reusable middleware ONLY — full login, account provisioning and first-run flows belong to Phase 2.
5. Create safe, consistent error response utilities according to docs/07_API_CONTRACT.md.
6. Document any required environment variables in .env.example without real credentials.

STEP 3 — POSTGRESQL + PRISMA FOUNDATION
1. Configure Prisma against PostgreSQL. Use schema/data dictionary in docs/05_BACKEND_SCHEMA.md as the design authority and avoid making undocumented business-rule assumptions.
2. Build an initial versioned migration containing the base entities and constraints required to support the next phases, including organization, identity, employee ownership and effective settings. Other documented entities can be incorporated where their schema is already well-defined; clearly list what is intentionally deferred.
3. Create no development or production seed scripts that insert fabricated operational/company data. An empty database must remain entirely uninitialized until the future first-run setup flow.
4. Protect unique constraints; use UTC timestamps in storage and a company timezone field for future domain logic.
5. Configure safe Prisma client lifecycle, DB connection error handling, and a database connectivity smoke test.
6. If Docker is available, add an optional docker-compose.yml with PostgreSQL (no seeded data). If not available, give commands for connecting a user-provisioned local/hosted PostgreSQL database.
7. Execute migration and DB smoke test if a real DB is available. If unavailable, honestly mark them NOT RUN/BLOCKED and explain what configuration is missing.

STEP 4 — FRONTEND FOUNDATION
1. Create apps/web using React + Vite + TypeScript + Tailwind CSS with reusable layouts, route shell, basic theme tokens, and responsive baseline down to 375px.
2. Add a typed frontend API client configured through Vite's VITE_API_BASE_URL, and a health/readiness connection indicator that uses the REAL API — no mocked server status.
3. Provide empty-state, loading-state, error-state, form-field and access-denied building blocks for future modules.
4. Create a minimal start/landing screen indicating that company first-run setup is NOT IMPLEMENTED YET. Do not display real login functionality until Phase 2.
5. Do not hardcode fake Admin/HR/Employee logins, fake charts, employee names, attendance stats or salary values.
6. Ensure keyboard navigation and mobile layout are usable; do not generate every dashboard screen yet.

STEP 5 — TESTS, CHECKS AND SAFETY
1. Add focused tests for health/readiness handling, config validation, reusable permission helpers, and frontend empty/error behavior.
2. Run package installation, lint, typecheck, tests and build. Report exact results. If environment blocks a command, specify why.
3. Confirm .gitignore excludes .env*, except .env.example, all node_modules folders, generated output, and local DB volumes.
4. Inspect source and generated artifacts for accidentally embedded credentials or static production data.
5. Add README instructions for Windows PowerShell, prerequisites, installation, environment configuration, database migration and local start-up.
6. Add BUILD_STATUS.md at project root reporting implementation status and verification evidence. It must truthfully indicate that F01–F25 are not yet complete.

STEP 6 — G1 HANDOFF
End by providing:
A. Directory tree of the result.
B. Changed files and rationale.
C. PowerShell commands the user can run from D:\HCM Lite.
D. Health/ready HTTP results, if actually observed.
E. Installed/migrated/tested/build verification table (PASS/FAIL/NOT RUN).
F. Known blockers and outstanding DXX decisions that do not affect G1.
G. G1 verdict: PASSED only when all checks in docs/15_G1_ACCEPTANCE.md are genuinely satisfied.
H. State "Waiting for Phase 2 prompt" and STOP. Do not implement first-run setup, login flows or any other phase in the same turn.

NON-NEGOTIABLE
- No fake records in the database.
- No secrets in code or Git.
- No demo UI pretending a feature works.
- No unrestricted protected endpoint.
- No extra features beyond Phase 1.
- No claims of passing tests you did not run.
```

## Expected outcome

A project that compiles, can run a frontend and backend, has an empty database with versioned migrations, and is ready for **Phase 2 — Auth and first-run setup**, subject to passing G1. It should *not* yet have functioning company registration, employee management, attendance, leave, payroll or AI.

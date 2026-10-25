# HCM Lite — Prompt 01B: Unblock and Verify G1

**Project:** Saylani Hackathon — HCM Lite  
**Agent:** ChatGPT Codex desktop  
**Root folder:** `D:\HCM Lite`  
**Status:** Phase 1 implemented in source, but G1 is BLOCKED — **do not start Phase 2**.

## Purpose
Resolve the known environment/dependency blockers and supply observed proof for each G1 acceptance item. The prior Codex run reported passing lint, five API foundation tests, and frontend type checking; these are historical claims from the earlier run, not proof that the full application is currently healthy.

## Paste this into Codex

```text
Continue the existing HCM Lite project in D:\HCM Lite.

FIRST:
1. Read the root AGENTS.md and docs/01_PRD.md through docs/16_EXECUTION_ROADMAP.md, especially docs/14_PROMPT_01_FOUNDATION.md and docs/15_G1_ACCEPTANCE.md.
2. Inspect the existing changes, package manifests, lockfile, environment loading, Prisma schema, migration SQL, scripts, and BUILD_STATUS.md.
3. Do not recreate the project, replace the architecture, discard changes, or implement Phase 2.

TASK: G1 RECOVERY AND VERIFICATION ONLY.

Known blockers from the previous report:
- npm dependency installation incomplete because required installation permission was declined;
- Prisma CLI/client and some frontend transitive packages were missing;
- PostgreSQL and Docker were not available/configured;
- root typecheck, complete test suite, build, migration, database record counts, and live browser/API checks could not finish.

A. DEPENDENCIES
- Verify compatible versions in package.json, workspace manifests, and lockfile.
- Request explicit user approval whenever Codex needs network or installation permissions.
- Run npm install at the root (or npm ci only if a valid, complete lockfile supports it).
- Repair only actual dependency or script problems supported by command output.
- Do not silently upgrade major versions, clear all files, or remove security checks.
- Generate Prisma client using the repository's actual scripts/configuration.

B. POSTGRESQL
- First check whether a PostgreSQL server, psql, or a DATABASE_URL already exists. Never print the password or full connection string.
- If local PostgreSQL is absent, explain the shortest safe supported option for this Windows computer: install/configure local PostgreSQL or connect to a user-approved hosted PostgreSQL instance. Docker is NOT a prerequisite.
- Stop and ask the user to perform or authorize any installation/account setup you cannot do safely; do not invent successful database results.
- Ensure .env is ignored by Git and only .env.example is tracked. Do not hardcode or disclose secrets.
- Point DATABASE_URL to a dedicated disposable HCM Lite development database, not an existing production/shared database.
- Before applying migrations, inspect SQL and show any destructive operations. Do not reset or wipe a database without specific consent.
- Run Prisma generate, apply the existing initial migration, and prove all operational tables begin with zero records. No seed inserts or dummy data.

C. FULL VERIFICATION
Run and record the actual output or summarized evidence for:
- npm run lint
- npm run typecheck
- npm test
- npm run build
- database generation, migration, and zero-record smoke test
- live GET /api/health returns a valid liveness response
- live GET /api/ready shows success WITH a working PostgreSQL connection, and shows 503 in a controlled disconnected case if safely testable
- frontend loads and reflects the actual backend status
- responsive view at 375 px (manual or browser automation, if accessible)
- no hardcoded secrets, no seeded domain records, no unauthorized Phase 2 features

D. FAILURE MANAGEMENT
- If a command fails, investigate and make minimal targeted fixes; rerun the failed check.
- If an OS tool or required permission is missing, identify exactly what user action is needed, with one concrete next command or UI step.
- Do not mark any unrun or blocked check as passed.
- Do not create sample employee, attendance, leave, payroll, or KPI data.
- Do not modify approved product requirements to make tests pass.

E. REPORT AND STOP
Update BUILD_STATUS.md with:
1. G1 verdict: PASS or BLOCKED;
2. each acceptance criterion, its actual evidence, command, and status;
3. exact root cause and next action for any blocker;
4. summary of files changed during this recovery;
5. confirmation that no Phase 2 work began.

Only when ALL items in docs/15_G1_ACCEPTANCE.md are proven should you mark G1 PASS. Otherwise keep G1 BLOCKED.

STOP AFTER G1. Do not build login, company setup, employees, or any later module.
```

## Actions for the project owner (outside Codex)

1. Open the existing `D:\HCM Lite` workspace in Codex and start a **new chat in the same workspace** or continue the existing thread.
2. Paste the prompt above. Approve **necessary, trusted dependency installation and network access** when Codex requests it; read each request before accepting.
3. If PostgreSQL is unavailable, choose either a local PostgreSQL installation (simplest for development) or your own hosted development PostgreSQL database. Share only whether setup succeeded; **do not paste passwords or `DATABASE_URL` values into chat**.
4. Once Codex finishes, share its new G1 status table and any **sanitized** errors for independent review.

## Gate policy
G1 cannot pass based on source files alone, a screenshot, or partially successful checks. A working local foundation, complete tests/builds, an actual migrated empty database, and live health/readiness/browser verification are required by the approved acceptance gate.

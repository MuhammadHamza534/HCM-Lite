# AGENTS.md — HCM Lite | Codex Repository Instructions

> **Applies to:** the ChatGPT Codex desktop app when this repository (`D:\HCM Lite`) is open.
> **Purpose:** persistent rules for Codex across sessions. This is **not** authorization to implement every feature at once.
> **Current authorized stage:** Phase 1 — project foundation only, when the user sends `docs/14_PROMPT_01_FOUNDATION.md`. Gate: `docs/15_G1_ACCEPTANCE.md`.

## 1. Project mission

Build **HCM Lite**, the Saylani Hackathon's web-based, AI-assisted Human Capital Management system for three roles: **Admin, HR, Employee**. Deliver all **25 official functionalities** across **M1–M9**, with real, permission-scoped data. A web app is required; mobile/camera/location attendance and other bonus items are optional **after** the required core is verified.

The application must begin with **no company, employees, users, attendance, leaves, payroll or dashboard figures preloaded**. In Phase 2, the first-run flow creates the company and first Admin; Admin creates HR logins; HR registers employees and creates their logins. All analytics and AI answers come from real stored activity.

## 2. Source of truth and instructions priority

1. **Official Saylani Hackathon HCM Lite Brief PDF** (if available in the repository): mandatory requirements, role table, business rules, 25-feature checklist and judging criteria.
2. **Approved specifications** in `docs/01_PRD.md` through `docs/11_AI_TOOLS_AND_GUARDRAILS.md` and `docs/13_AGENT_INSTRUCTIONS.md`.
3. **Decision log** `docs/12_DECISION_LOG.md`: its proposals and `OPEN` items are *not automatically approved business decisions* merely because the documentation package was accepted. Resolve the affected decisions before implementing dependent behavior.
4. **Active phase prompt**, acceptance checklist and `docs/16_EXECUTION_ROADMAP.md`: define which work is authorized now; they cannot weaken the PDF.
5. Existing verified code and tests, then explicitly identified engineering choices.

If any documents conflict, identify the exact discrepancy; follow the official brief where clear. Do not quietly guess a business rule, change requirements, or claim that a proposal was mandated by the PDF.

### Document navigation map

| File | Use for |
|---|---|
| `docs/01_PRD.md` | Product scope, 25 functionalities, acceptance expectations |
| `docs/02_TRD.md` | Architecture, stack, cross-cutting technical requirements |
| `docs/03_APP_FLOW.md` | First-run and role-based workflows |
| `docs/04_UI_UX_BRIEF.md` | Layouts, responsive design, interaction states |
| `docs/05_BACKEND_SCHEMA.md` | Schema, relations, database constraints |
| `docs/06_IMPLEMENTATION_PLAN.md` | Module sequence and gates |
| `docs/07_API_CONTRACT.md` | REST endpoints, payloads, errors |
| `docs/08_RBAC_PERMISSION_MATRIX.md` | Server-side role and row-scope permissions |
| `docs/09_BUSINESS_RULES_AND_CALCULATIONS.md` | Attendance, leave, payroll, KPIs and exact formulas |
| `docs/10_TEST_PLAN_AND_ACCEPTANCE_CASES.md` | Functional, security and edge-case testing |
| `docs/11_AI_TOOLS_AND_GUARDRAILS.md` | Hosted AI, tools, scope enforcement and failures |
| `docs/12_DECISION_LOG.md` | Ambiguities and decisions requiring explicit sign-off |
| `docs/13_AGENT_INSTRUCTIONS.md` | Expanded standing developer instructions |
| `docs/14_PROMPT_01_FOUNDATION.md` | **Current Phase 1 implementation instructions** |
| `docs/15_G1_ACCEPTANCE.md` | **Current Phase 1 pass/fail gate** |
| `docs/16_EXECUTION_ROADMAP.md` | Stage order and future gates |

At the start of an implementation task, verify that these files exist, read `01`, `02`, `06`, `12`, `13`, `16` and the active phase prompt/gate; read the other documents relevant to the requested module. If a required file is absent, report which file and proceed only with work safely supported by available sources. **Do not recreate or overwrite missing specifications without permission.**

## 3. Approved implementation approach

- **Monorepo:** npm workspaces, intended paths `apps/web` and `apps/api` (inspect any existing project before creating new paths).
- **Frontend:** React, Vite, TypeScript, Tailwind CSS; responsive to 375px, accessible controls, real loading/empty/error states.
- **Backend:** Node.js, Express, TypeScript; route/controller → service/domain rules → repository/data boundary.
- **Database:** PostgreSQL and Prisma with versioned migrations; Zod validation.
- **Auth:** JWT + bcrypt, server-enforced RBAC **and** employee data scope.
- **Later phases:** Recharts for server-derived analytics, backend-generated PDF payslips, hosted tool-calling LLM **behind the backend**.
- Use strict typing, small focused modules, predictable naming, explicit error handling and tests for domain rules. Prefer existing project conventions if they do not violate the approved documents.

The selected stack is a **project planning choice**, not a technology mandated by the PDF.

## 4. Non-negotiable business and security invariants

- Only **ADMIN**, **HR**, **EMPLOYEE** roles. UI visibility alone never grants access; enforce authorization on every protected backend operation and AI tool call.
- An Employee can access only their own confidential information; a colleague's salary must never be disclosed by API or AI. HR must not finalize payroll; only Admin can finalize and lock it. Nobody edits finalized payroll or deletes/rewrites audit entries.
- No seeded/demo operational data, hardcoded charts/counts/attendance/salaries, fake API success, or simulated AI answers presented as real.
- Server timestamps attendance. One employee/day attendance record; a second check-in returns HTTP **409**. Attendance rules/settings follow the official brief and `09`; do not invent overlapping-status precedence.
- Leaves count working days (skip applicable weekends/holidays), enforce quotas and overlap; invalid overlap/over-balance returns HTTP **422**. The user confirms any AI-prepared leave form before saving.
- Payroll follows the brief's formula: gross = 1.5 × basic (HRA 40% and medical 10% of basic), plus attendance/leave deductions, joiner/leaver proration and the specified **illustrative**, not necessarily current statutory, tax schedule. Define any ambiguous rounding/order with an approved decision before coding it.
- Dashboards use live server/database aggregations, not browser-local invented metrics. AI uses restricted backend tools/services; no direct LLM access to the database, no autonomous writes. Keep API keys backend-only and log AI calls as required.
- Never commit secrets: `.env`, real JWT secrets, credentials, database passwords, provider tokens or employee private data. Commit only safe `.env.example` placeholders. Avoid logging sensitive data. Keep `.gitignore` effective.
- Avoid destructive migrations, deletion of user data, force-pushes, unrequested deployments, unexpected network actions or modifying files outside this workspace. Request explicit approval for these operations.

## 5. Codex desktop app working protocol

1. **Confirm workspace:** the app should show **HCM Lite** and work in `D:\HCM Lite`. Check the current working directory and Git status before editing.
2. **Inspect first:** locate documents and existing code; do not overwrite an existing implementation or regenerate an entire repo without checking what is present.
3. **State a short plan:** summarize intended scope, files to change, checks to run and any blockers before edits.
4. **Implement only the explicitly requested phase.** Use the current phase's prompt and acceptance checklist. Do not preemptively implement later modules, optional bonuses or polish that blocks the core.
5. **Ask for permission where appropriate:** respect the Codex app's approval settings. Do not request full/unrestricted access just for convenience. Ask the user to provide env values locally instead of sending secrets through chat.
6. **Validate actual behavior:** run applicable install, lint, typecheck, tests, build, health/DB smoke checks where access is available. Clearly label checks that could not run as `NOT RUN` or `BLOCKED`.
7. **Finish with a gate report and stop.** Never automatically move from a finished phase to the next one without a new user instruction.

### Scope for the **next** Codex task (Phase 1 / G1)

Authorized, when Prompt 01 is submitted:
- Set up the TypeScript npm-workspace structure, frontend/backend framework, shared scripts/config and environment examples.
- Add Express `/api/health` (real liveness) and `/api/ready` (honest database readiness), safe middleware and permission scaffolding only.
- Configure PostgreSQL/Prisma and versioned migration foundations **without any operational seed**; demonstrate empty data if a database is available.
- Build a minimal responsive frontend shell with real API connectivity and honest placeholders; **do not** present fake working authentication, employees or dashboards.
- Include focused tests, Windows PowerShell setup instructions and a truthful root `BUILD_STATUS.md`.

**Not yet authorized:** first-run account creation, real login, employee management, attendance flows, leave, payroll, dashboards, AI chat, announcements, bonus camera/geolocation, external deployment. These require later prompts.

**G1 success:** follow `docs/15_G1_ACCEPTANCE.md`. A missing actual DB connection or failed required check means `BLOCKED`/`FAILED`, never `PASSED` by assumption.

## 6. Phase reporting contract

At the end of each task, give the user:

1. **Phase + scope completed:** what is implemented versus intentionally deferred.
2. **Files changed:** short paths and purpose; call out any specification changes separately.
3. **Commands and actual results:** `PASS`, `FAIL`, `NOT RUN`, or `BLOCKED` for install, lint, typecheck, tests, build, migration, browser and API/DB checks as applicable. Include concise relevant output, not invented outcomes.
4. **How to run locally:** precise Windows PowerShell commands from `D:\HCM Lite`; no private secrets in the message.
5. **Unresolved decisions and blockers:** refer to decision IDs `D01`–`D22` where applicable; state the action needed.
6. **Gate verdict:** `PASSED`, `FAILED`, or `BLOCKED` with evidence and the applicable checklist.
7. **Stop:** state the next planned phase but do **not** start it.

## 7. Workflow to initiate Phase 1

Once this `AGENTS.md` is in the repository root, the user can open a new Codex conversation in the **HCM Lite** workspace and send a short instruction:

> Read `AGENTS.md` and `docs/14_PROMPT_01_FOUNDATION.md`. Implement **Phase 1 (G1) only**, using `docs/15_G1_ACCEPTANCE.md` to verify the result. Read the referenced specs before editing. Provide actual test evidence and stop after the G1 report.

`AGENTS.md` supplies persistent guidance; the phase prompt grants the specific work scope. **Do not interpret merely opening the workspace or reading this file as permission to code.**

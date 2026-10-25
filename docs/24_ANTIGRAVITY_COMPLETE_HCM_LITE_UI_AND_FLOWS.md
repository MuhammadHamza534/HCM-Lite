# 24 — Antigravity Emergency Implementation: Make HCM Lite Fully Usable

**Project root:** `D:\HCM Lite`  
**Execution mode:** ACT / IMPLEMENT / TEST — not plan-only  
**Primary source:** Original 7-page HCM Lite challenge brief; approved docs `01`–`12`  
**Current problem:** The browser shows only a login screen. Previously reported backend code is **not** sufficient unless all required flows are available, working, and properly authorized through the web app.

## COPY THE ENTIRE PROMPT BELOW INTO ANTIGRAVITY

You are the lead senior full-stack engineer rescuing an existing HCM Lite application under a hard deadline. **WORK DIRECTLY IN THE PROJECT NOW.** Do not spend time writing a separate plan, waiting indefinitely for a command, or reporting that code exists without exercising it.

### 0. Non-negotiable instructions

- Workspace: `D:\HCM Lite`. Read `AGENTS.md`, `BUILD_STATUS.md`, the original challenge brief if locally available, and `docs/01_PRD.md`, `docs/03_APP_FLOW.md`, `docs/07_API_CONTRACT.md`, `docs/08_RBAC_PERMISSION_MATRIX.md`, `docs/09_BUSINESS_RULES_AND_CALCULATIONS.md`, `docs/10_TEST_PLAN_AND_ACCEPTANCE_CASES.md`. Read other docs only when relevant to the active feature; **start modifying the app promptly**.
- **Preserve the existing React/Vite + Express/TypeScript + Prisma/Neon implementation.** Reuse APIs/services already written; fix their wiring, routing, missing screens, and integration instead of rebuilding the project.
- **User-reported reality overrides old optimistic summaries: the app presently shows only Login, and no usable Admin/HR/Employee creation workflows can be found.** Validate this yourself; make those screens and flows functional.
- **Remove every visible instance of `Saylani Hackathon`, `SAYLANI HACKATHON`, and unnecessary Saylani branding from the entire user-facing product** (login/setup/header/sidebar/dashboards/footer/help/browser document title/meta/notifications/generated user-facing documents). Product name should be **HCM Lite**; use a professional neutral HR SaaS visual identity. **Do not delete or falsify the original brief or planning documents, which remain private project references.**
- No publicly accessible general signup. A fresh system offers **First-Run Company + first Admin setup**, which becomes unavailable as soon as bootstrap succeeds. An existing system offers Login. Only Admin creates HR accounts; only HR registers employee accounts.
- No seed/dummy operational data or hardcoded dashboard counts. Only records created through real app actions. Never reset/truncate existing Neon data without explicit user approval. Avoid exposing secrets, JWT, password hashes, and connection strings.
- Create fully working pages with backend integration, actual forms, validation, loading/empty/error/success states and correct navigation. No dead menu entries, decorative forms or fake save notifications.
- Do not claim an API or test PASS merely because a command was launched; inspect its completed output and exit code.

### 1. IMMEDIATE ROOT CAUSE / FIRST-RUN FLOW (FIRST PRIORITY)

Inspect actual route registration in `apps/api/src/...`, especially `routes/v1.ts`, the React app/router, auth state, Prisma migration status, and `.env` variable presence (never print secret values).

**Implement this navigation state machine:**

- On app load, call a secure **public setup-status** endpoint that returns only a boolean like `needsSetup`, not company/private data.
- If no company/Admin exists, render `/setup` (visually polished first-run wizard) with company name, Admin name, email and password/confirmation and default policy settings. Validate and save the real company + first Admin atomically in PostgreSQL. Enforce one-time bootstrap at the database/service boundary with transaction/race protection, not just a disabled frontend button; second bootstrap attempt must fail. Show success and route to login.
- If setup already completed, render `/login` (and redirect `/setup` back to login/dashboard). Login uses real bcrypt hash verification, JWT authentication, rate limits and active-account checks. Implement Logout and password change.
- Force newly created HR/Employee users with temporary passwords to change password before accessing protected features. Account creator can securely provide the temporary password once; never expose hashes or log credentials.
- Authenticated ADMIN -> Admin dashboard; HR -> HR dashboard; EMPLOYEE -> Employee dashboard. After reload, restore/validate session; on 401/403 show correct UI. Make all top-level routes and menu entries real navigable screens.
- If setup routes exist in backend already, **connect them to UI instead of duplicating endpoints**. If the database is currently empty, the browser **must show the setup wizard rather than a login-only dead end**.

**Show actual evidence before moving on:** onboarding screen, saved Admin, login, role-aware redirect and route-refresh working. Never auto-create user records or seed data via scripts.

### 2. COMPLETE REQUIRED ROLE-BASED MENUS AND WORKING SCREENS

Implement connected minimal-but-usable CRUD/forms/views for the original PDF's 25 functionalities. Use the existing endpoints if present, and add missing endpoints/services with correct authorization.

**ADMIN workspace**
1. Company profile and office policy: hours (default 09:00), grace (15 min), half-day (<5h), working weekends (Sat/Sun), location and radius, effective-on-new-record settings.
2. Departments, designations, leave types/annual quotas (annual 14, sick 8, casual 10, unpaid unlimited), public holidays.
3. HR account management: create HR users, deactivate/reset user logins; show create form, status and appropriate temporary-credential flow. Admin alone controls HR creation.
4. Company-wide read-only employee directory, attendance, leave, salary and payslip visibility where authorized.
5. Monthly payroll **finalize/lock** only as Admin; existing finalized runs remain immutable.
6. Admin live dashboard with computed headcount, attrition, payroll cost, average salary, department analytics and filters.
7. Post/read announcements, view immutable audit log and authorized AI chat/summary.

**HR workspace**
8. **Visible `Add Employee` button + actual registration form:** name, unique employee code, valid email, department, designation, join date, basic salary >0, contact info and status; submit creates employee + linked EMPLOYEE login atomically with temporary password + forced first login change. HR must be able to find and edit the employee afterward. Admin can view records; not silently modify HR-only fields.
9. Employee directory with search/filter/pagination, Employee 360 profile; CSV import/export with dry-run field/row error report if feasible under time pressure.
10. HR daily attendance board: employee statuses, review/approve/reject correction requests.
11. HR leave approval inbox: pending requests, approve/reject with comment; employee balances update from approved requests only. HR own leave and check-in/out if linked employee profile (as permitted by brief).
12. Salary structure management; monthly payroll **create/review draft**, not finalize. HR payroll reports and scoped payslips.
13. HR dashboard KPIs/trends/late-comers/absenteeism/leave, announce messages, AI summary/chat.

**EMPLOYEE workspace**
14. Real personal dashboard: weekly hours, late days, leave balances, recent payslip, announcements and notifications.
15. Check in / check out via browser, server-stamped times; own attendance calendar; submit correction request with reason.
16. Apply for leave, see balance/history, cancel eligible request, smart leave plain-language prefill then human confirmation.
17. View own profile and edit **only phone/address**. Download own real PDF payslip. View own notifications and company policy; own-data AI assistant. No access to other employees' salary/records.

### 3. BUSINESS RULES THAT MUST WORK IN REAL API RESPONSES

- RBAC and row-scope enforced on every API route **and** AI backend tool; never rely solely on hidden buttons. Employee's own data checked against token-linked `employee_id`, not a client-supplied ID. Cross-employee salary requests must return a safe denial.
- Attendance: server timestamps; one daily record per person; repeat check-in -> HTTP **409**; late after configured start+grace (default 09:15); half-day if worked <5 hours; `missing_checkout` until checkout; absent when expected workday has neither attendance nor approved leave. HR correction approval route, employee request route.
- Leave: count only working days (skip configured weekends + public holidays); annual 14, sick 8, casual 10, unpaid unlimited, prorations/settings per approved spec; overlapping or over-balance -> HTTP **422**; store HR decisions and notifications.
- Payroll: gross = basic + 0.40*basic HRA + 0.10*basic medical = **1.5 x basic**; per-day gross / working days; deduction for absent + unpaid approved days + 0.5 x half-days without double counting; prorate joiners/leavers. Annualized gross illustrative tax brackets: <=600k zero; 600k–1.2M 5% above 600k; 1.2M–2.4M 30k+15% above 1.2M; 2.4M–3.6M 210k+25% above 2.4M; >3.6M 510k+35% above 3.6M. Convert annual tax to monthly consistently. Locked final payroll cannot be changed, including its items. PDF payslip is user-scoped.
- Dashboard figures computed server-side using database aggregation and date/department filters, never magic numbers. Preserve audit log before/after changes with sensitive fields redacted.
- Auth: bcrypt passwords, safe JWT transport strategy, forced temporary-password change, deactivated login denial, 401/403, secure first-run bootstrap and input validation.

### 4. AI & COMMUNICATIONS — REQUIRED NOT PRETEND

- Render an accessible **AI Assistant panel** (all roles, correct scope), Admin/HR **Summarize dashboard** and Employee/HR **Smart Leave** UI (PDF lists HR-own smart leave in role matrix).
- If an actual hosted LLM API key is configured, use `POST /ai/chat` through the backend with allowlisted, scope-checked service tools: `get_headcount`, `get_attendance_summary`, `get_late_comers`, `get_leave_summary`, `get_my_leave_balance`, `get_payroll_summary`, `search_employees`. Backend calls provider, never browser; never allow model SQL or AI autonomous writes.
- Current facts must come from DB. Dashboard summary uses only current KPI JSON, producing 3–5 grounded insights. Smart leave parses a sentence to validated type/start/end/reason; pre-populates but **never auto-submits**. Policy Q&A based on actual approved company rules. 15s timeout, friendly provider failure, approx 20 requests/user/hour, AI logs, `AI-generated` label.
- If AI key is **not** configured, show an honest 'AI provider not configured' state; build the connection points and list the **exact variable names** the user must set, without inventing provider answers or exposing secrets. Do not block core HR flows on missing AI key.
- Working Admin/HR announcements visible on all role dashboards; personal notification inbox for decisions/payslips; Admin-only immutable audit viewer.

### 5. UX MUST LOOK LIKE A COMPLETE HCM PRODUCT, NOT A LOGIN TEMPLATE

- Brand text shown to users: **HCM Lite** only (or actual user-created company name after bootstrap). Remove `Saylani Hackathon` from visible headings, badges, banners, hero sections, sidebar, footer, metadata/title and UI-generated documents. Keep original PDF/requirements files unchanged.
- Build responsive app shell (desktop and >=375px mobile): clear sidebar/topbar with navigation; mobile menu; distinct ADMIN/HR/EMPLOYEE dashboards; search/add/edit forms; modals/drawers as needed; readable charts/tables, loading skeletons, empty/error/success states, focus labels and accessible buttons.
- Empty database means zero real records and onboarding—**not** login-only. Empty employees page shows 'No employees yet' + **Add Employee** for HR. Empty HR users page shows **Add HR User** for Admin. Each control must invoke a real authenticated endpoint and refresh the list after success.
- Verify logout, route guards, expired JWT response and refresh flow. Do not show `Coming Soon` for the main judge demo flows.

### 6. EXECUTION ORDER — PRIORITIZE DEMO USABILITY

**Wave 1: FIRST-RUN + NAVIGATION** — Find why the system is login-only; connect/setup/create first Admin securely; role login/logout/password change; real ADMIN/HR/EMPLOYEE protected layouts and menus. Manually open browser and verify first-run rendering.

**Wave 2: ADMIN -> HR -> EMPLOYEE** — Admin department/leave rules + Create HR form; HR Add Employee form creating account and salary; force first password change; directory. Verify real records in database.

**Wave 3: HR OPERATIONS** — Employee check-in/out, leave request/HR approval; HR draft payroll, Admin finalize, Employee PDF payslip; real dashboard totals. Verify end to end.

**Wave 4: REMAINDER** — Attendance corrections, CSV dry run/export, notifications/audit, AI/chat/smart leave/summaries, polish + deployment setup. Required PDF features before optional mobile/camera/bonus.

At the end of **every wave** perform focused tests/build; fix blocking errors and **continue** to the next wave without requiring the user to paste another prompt. Do not waste effort refactoring a working foundation or writing progress essays.

### 7. DATABASE SAFETY / MIGRATIONS

- Inspect Prisma `migrate status`, current schema, and actual Neon connectivity. **Do not assume** earlier `20261025000200_operational_modules` migration applied. Review pending SQL and ensure additive, then apply safely only with correct target URL/confirmation. Never `migrate reset`, destructive `db push`, drop, truncate, or seed the original Neon DB.
- For realistic browser tests, create records via actual Admin/HR/Employee UI. Prefer a separate Neon development branch for automated scenario tests and preserve the intended fresh judging branch.
- If Neon is unreachable within the agent sandbox, have the user run one minimal, exact Windows PowerShell command locally, while continuing frontend/API implementation; do not loop forever saying 'waiting for command'.

### 8. HARD ACCEPTANCE CHECKLIST — DO NOT MARK PASS WITHOUT LIVE EVIDENCE

Test on a **clean company state on an isolated testing branch**:

1. `http://localhost:5173/` immediately shows **Company + First Admin Setup** when zero companies; never just Login.
2. Admin completes first-run setup; second public setup attempt is rejected; Admin can log in.
3. Admin creates department + HR account using visible working UI.
4. HR logs in, changes temporary password, clicks **Add Employee**, registers employee with salary; employee account appears.
5. Employee first login demands password change, then role-specific dashboard.
6. Employee checks in; second check-in rejected 409; checks out; own attendance visible.
7. Employee applies for leave; HR approves; balance/dashboard reflect real approved days; overlap rejected 422.
8. HR creates month payroll draft; Admin finalizes/locks; Employee downloads own actual PDF payslip.
9. Employee cannot view colleague payroll/profile via UI **or** direct API; HR cannot finalize; Employee cannot approve leave.
10. Admin/HR dashboards display actual records; Admin can inspect audit events; notifications/announcements visible.
11. AI chat uses authorized hosted tool calls if API key is available. Without key, transparently report NOT CONFIGURED; never pass AI requirement falsely.
12. Frontend works at 375px and desktop without horizontal overflow, red console errors or dead links; page title and visible UI contain **no Saylani Hackathon branding**.

Run actual `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`; verify API `GET /api/health` and `GET /api/ready`, PostgreSQL migration status, and browser interactions. Capture true results/errors in `BUILD_STATUS.md` and mark each of the 25 PDF features `DONE / PARTIAL / BLOCKED`.

### 9. FINAL REPORT (brief; NO false assurances)

Return:
- Exact URLs to open locally, particularly first-run setup if empty.
- Which real UI pages/buttons/forms you added and the files changed.
- Actual manual flow results from Admin creation through payslip.
- 25-feature DONE/PARTIAL/BLOCKED table.
- Missing environment variables only **by name**, no values.
- Remaining release/deployment blockers and next required human actions.

**START EXECUTING NOW. Implement application code and integrate all required user-facing screens. No additional generic planning.**

## END PROMPT

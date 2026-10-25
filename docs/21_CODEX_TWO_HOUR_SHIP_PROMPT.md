# HCM Lite — Emergency 2-Hour Shipping Prompt (Codex)

> Paste the **entire prompt below** into a new or existing ChatGPT Codex conversation with the `D:\HCM Lite` workspace open. This sprint supersedes previous **stop after Phase 1** instructions *for feature scope only*; existing security, no-dummy-data, safe database and verification rules remain in force. Do not paste secrets into the chat.

---

## START CODEX PROMPT

You are the lead full-stack engineer, security reviewer and release engineer for **Saylani Hackathon — HCM Lite**. You are working **directly in the existing project**, `D:\HCM Lite`. The user has **approximately 2 hours remaining** and explicitly authorizes implementing the remaining challenge modules during this sprint. **Do the work now**, not just write a plan. Do not stop after Phase 2; continue through the prioritized waves unless genuinely blocked. Do not pretend to have completed a feature, a test, or a deployment.

### Known starting state — preserve it

- G1 foundation has passed according to the latest Codex report: npm install, Prisma generation/migration, Neon DB connection, zero operational records, tests, lint, typecheck, build, API health/ready, responsive browser checks.
- Existing monorepo: `apps/web` React/Vite/TypeScript/Tailwind; `apps/api` Express/TypeScript/Prisma; root `.env` with Neon `DATABASE_URL` and `JWT_SECRET` (do **not** print them).
- Read `AGENTS.md`, `docs/01_PRD.md` through `docs/16_EXECUTION_ROADMAP.md`, plus any later docs, *selectively and quickly* to enforce critical requirements. Treat the original Saylani PDF / 25-feature checklist as product authority. Inspect current Prisma schema, API entrypoints, and frontend routes before editing. Prefer reusing code and conventions over rewriting the foundation.
- Keep the root `.env` Git-ignored. **No fake/seed employees, attendance, leave, payroll, or dashboard values.** No destructive Prisma reset, force push, truncate, or arbitrary table drops.

### Primary outcome — judge-visible end-to-end story

A fresh installation starts with no company. The first Admin sets up company and rules; creates HR login; HR registers 2–3 real demo-created employees with temporary passwords; employee signs in and changes password; checks in; makes a smart leave request; HR approves it; HR dashboard & AI report the actual records; HR creates a monthly payroll draft; Admin finalizes it; employee downloads PDF payslip; employee's request for another person's salary is denied; Admin sees an audit log. These actions must be performed through the app, not scripts inserting data.

### Time-boxed implementation waves — EXECUTE, not merely describe

#### Wave A — Identity & setup (critical path)

1. Implement backend API + frontend screens for first-run company onboarding and initial ADMIN account. Only allow initial setup when the database has no company/admin; make setup atomic and race-safe (transaction/unique guard). Setup creates actual company data, company settings, and the first Admin; do not seed data on startup. Required setup fields: company name, default office start 09:00, grace 15m, weekend Saturday/Sunday, half-day under 5h, time zone; office location/radius configurable for optional camera flow. Default annual/sick/casual/unpaid leave rules 14/8/10/unlimited, with Admin-adjustable settings. Restrict changes of company settings to Admin.
2. Implement bcrypt password hashing, JWT-authenticated requests, role middleware and **server-side data scope**. Roles ADMIN/HR/EMPLOYEE, inactive-account rejection, login/logout, password change. Employee only accesses own `employee_id` resources; HR cannot create Admin or finalize payroll; Admin cannot edit finalized payroll or audit history; no one can edit their own salary/role by bypassing UI. A newly created HR/employee login should have a one-time temporary password and forced change at first login. Admin creates HR logins; HR creates employee logins. Do not return password hashes.
3. Use HttpOnly cookie or the approved JWT transport strategy from docs; protect against token exposure, enforce validation with Zod, rate-limit login, return correct 401/403. Show user-friendly error/loading states.
4. Implement protected route layout, auth state, and three role-specific navigation menus/dashboard shells. Avoid public disclosure of employee/company private data.

#### Wave B — Employees, attendance and leave (judge core)

5. Admin manages departments, designations, company holidays, leave categories/quotas; HR can view settings. HR registers/edit employees with code, email, name, department, designation, join date, basic salary, status and contact details; unique code/email, valid dates, basic salary >0; employee account created at registration with temporary password. Admin/HR employee directory with server-side search, filtering and pagination; Employee sees self and can edit **only phone/address**. Implement Employee 360 minimum viable view.
6. Web attendance for HR and Employee **own check-in/check-out**. Timestamp exclusively on server; one daily attendance record per employee (duplicate check-in HTTP 409); late after configured start + grace (default after 09:15), half-day if checked-out duration <5h, missing_checkout if no checkout; absent if no attendance and no approved leave on an expected working date. Preserve time-zone/calendar correctness. HR daily board, employee calendar, correction request with reason, HR decision. Admin can view records.
7. Leave: self-service for Employee (and HR own leave), annual/sick/casual/unpaid; working days skip configured weekends and holidays; reject overlaps or insufficient balance with HTTP 422; submit/cancel where eligible; HR approval/rejection with comment and decision timestamp; request statuses, personal balance/history and HR approval inbox. Only approved leave affects approved balance and attendance/payroll. Clarify cancellation/reversal rules in service, not frontend. Never make AI automatically submit leave.

#### Wave C — Payroll + payslips (judge core)

8. HR manages salary structure (basic + standard HRA 40% and medical 10% of basic). Gross = 1.5 × basic. Monthly draft uses actual active employees and attendance/leave; daily gross = gross / month working days; deduction days = absent + unpaid approved leave + 0.5 × half days (guard against double counting); prorate employees who joined/left during period. Use **illustrative tax slabs from PDF, annualized gross**: 0% up to 600,000; 5% on taxable amount from 600,000 to 1,200,000; 30,000 + 15% on amount above 1,200,000 up to 2,400,000; 210,000 + 25% on amount above 2,400,000 up to 3,600,000; 510,000 + 35% on amount above 3,600,000. Convert annual tax to monthly consistently and record the breakdown. Use decimal-safe monetary calculations, documented rounding, and service-layer deterministic tests.
9. HR creates/reviews draft. Only Admin finalizes/locks monthly payroll. A finalized run and its line items cannot be edited; database/API enforce this. Employee downloads own server-generated PDF payslip; HR/Admin can access scoped permitted payslips; include audit of drafting/finalizing.

#### Wave D — Live analytics, AI, communications (high scoring)

10. Backend-computed dashboards only. Admin: actual headcount, payroll cost, average salary, department distribution, attrition where supported. HR: headcount, present/leave/late today, pending approvals, trend, late-comers and absenteeism. Employee: personal weekly hours, late count, leave balances, recent payslip. Date and department filters as relevant; correct empty states — **never hardcode numeric cards**.
11. AI `POST /ai/chat` uses hosted LLM tool-calling API via **server only** with `AI_API_KEY` and configurable provider/model. Implement allowlisted services/tools: `get_headcount`, `get_attendance_summary`, `get_late_comers`, `get_leave_summary`, `get_my_leave_balance`, `get_payroll_summary`, `search_employees`. The model cannot directly issue SQL and cannot choose another user scope; server decides effective scope from auth. Employee salary-of-colleague questions must be refused. Policy Q&A must use actual approved policy settings and rules. Timeout 15s, about 20 requests/user/hour, AI generated label, log calls without leaking sensitive content. Missing API key => honest friendly unavailable fallback, no invented answers.
12. Smart leave sentence (e.g. 'Need next Monday and Tuesday off for my sister’s wedding') => strictly validated `{ type, start, end, reason }` form draft. Resolve relative dates with company timezone. User must review and confirm before real submission. Admin/HR dashboard summaries from current filtered KPI JSON only (3–5 grounded insights). If no configured AI key, provide clear disabled/coming-soon state; **do not fake AI output**.
13. Announcements by Admin/HR visible on role dashboards; notification inbox for leave decisions/payslips; immutable Admin-readable audit log with actor/action/entity/before-after snapshots (sanitize password, tokens and secrets). HR cannot read audit log.

#### Wave E — Stability, score and submission

14. Build responsive and coherent UI (desktop + 375px mobile) using the approved UI brief: professional navy/teal design, clear navigation, useful forms, real empty/loading/error states, validation messages. Avoid complex polish that jeopardizes flows.
15. Test top flows with actual fresh records created **through the app** after setup. If manual demo creates data, keep it limited to a dedicated test/demo environment and record a **safe documented method to restore empty first-run state using a distinct fresh database/project**; do not reset or delete data without explicit approval. Protect the existing Neon instance from destructive cleanup.
16. Execute `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, database migration verification and live `/api/health` + `/api/ready` checks. Add targeted API tests for RBAC (employee cross-user denial, HR cannot finalize, employee cannot approve), auth first-run protection, duplicate check-in 409, leave overlap/balance 422, payroll lock, AI no-key fallback and AI salary-scope refusal. **Report exactly what was executed**; no invented PASS.
17. Prepare production deploy: `.env.example`, README, setup/start commands, migration instructions, and hosted frontend/API deployment steps. If deployment credentials are unavailable, give exact required user actions; never claim hosted link exists unless verified. Ensure CORS and frontend API URL align for production.

### Execution rules optimized for ~2 hours

- Start implementing immediately; do not spend the sprint generating another large architecture plan.
- **Implement smallest complete vertical slices**: schema/service/API/UI/test connected for each priority; avoid superficial pages that don't save records.
- Keep the app compilable at every wave; run focused tests/build when adding a module. Use additive Prisma migrations, inspect migration SQL before applying. Existing DB may still be empty; no destructive commands.
- Every request must enforce RBAC and ownership on server. Never rely on hidden buttons for security. Passwords hashed; no secrets in frontend bundles, source code, logs or reply.
- Preserve and reuse existing code and documentation. If a necessary business-rule interpretation is unresolved, choose the safest explicitly documented non-contradictory behavior and record it in `docs/12_DECISION_LOG.md` without derailing the sprint; do not quietly change PDF-defined rules.
- If time or context is insufficient, prioritize in this order: **A first-run/auth > B employee + attendance + leave > C payroll + payslip > D dashboards > D secure AI + smart leave > notifications/audit polish > CSV > bonus camera**. However, implement a basic working AI path as early as feasible because it carries 15 points.
- Do not work on optional mobile app, camera geofencing, face matching, attrition risk, Roman Urdu or PWA until required demo works.
- For significant step blockers needing a user secret/account or permission, explain minimal action and continue independent work. Never copy or print the Neon URL or JWT secret. No need to ask permission for ordinary code changes in the project; stop and request approval for destructive database operations.
- Provide concise progress reports after each wave showing **Working / Partial / Blocked**, and the next action. Continue working after reporting; don't ask user to re-paste a fresh prompt between waves.
- Maintain a clear `BUILD_STATUS.md` with real state and a final 25-functionality coverage matrix (DONE / PARTIAL / NOT DONE), actual tests, outstanding blockers, and deployment URLs if verified.

### Final live 5-minute demo sequence to ensure

1. Fresh first-run company/Admin setup; Admin configures a department, leave rules, HR account.
2. HR logs in, registers two or three employees; employee changes temporary password.
3. Employee web check-in; submit leave in plain words via smart leave form; HR approves.
4. HR dashboard shows true counts, summary and AI answer derived from DB; HR prepares payroll draft.
5. Admin finalizes payroll; employee downloads own payslip; salary snooping denied; Admin reviews audit log.

**Begin now: first inspect the current project, implement Wave A, then proceed through the other waves as far as possible. Do not stop at planning.**

## END CODEX PROMPT

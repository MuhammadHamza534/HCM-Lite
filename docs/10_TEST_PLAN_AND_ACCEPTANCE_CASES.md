# HCM Lite — Test Plan & 25-Feature Acceptance Matrix

**Status:** DRAFT · executable tests have **not** been written.  
**Source:** Official Saylani brief, functionality checklist printed p. 5; live judging script printed p. 6.  
**Scope:** test authentic UI → authenticated API → domain service → DB → KPI/AI path. Seeded operational records are forbidden **in the deployed application**; tests may use short-lived **isolated test fixtures** only, cleared between cases.

## 1. Levels and ownership [PROPOSED]

| Level | Focus | Owner |
|---|---|---|
| Unit | Calendar, permissions, gross/tax/deduction/metric math | Backend |
| Service integration | Transactions, DB constraints, policy and audit | Backend |
| API contract | Request validation, status/errors and RBAC | Backend + frontend |
| E2E browser | Real first-run workflows, responsive forms, PDFs | Frontend + QA |
| AI contract | Tool scoping, refusal, structured leave, fallback | Backend + QA |
| Deployment smoke | Live frontend/API/database, fresh first-run, README | Team |

**Exit requirement:** No false static data, no critical `403`/cross-user leaks, correct 409/422, no invalid locked payroll, and live demo flows pass.

## 2. Complete functional acceptance cases

| ID | Feature and positive case | Negative / boundary case |
|---|---|---|
| F01 | Empty DB → first-run creates company + Admin | Second unauthenticated bootstrap refused |
| F02 | All 3 roles login/logout/change password, own dashboard | Wrong password, inactive account, forced first password block |
| F03 | Admin updates office hours/grace/weekend/location/radius | HR cannot edit settings; old events unchanged |
| F04 | Admin maintains departments/designations/leave types/quotas/holidays | HR cannot edit setup catalogs |
| F05 | Admin creates HR and deactivates/resets logins | HR cannot create Admin or manage user accounts |
| F06 | HR registers employee; account created; own contact edit works | Duplicate employee code/email, invalid salary, role/salary self-edit blocked |
| F07 | HR/Admin search/filter/paginate directory and open Employee 360 | Employee cannot enumerate peer profiles |
| F08 | HR CSV dry-run reports row+field+reason; commit/export works | Dry-run makes zero DB changes; Admin/Employee import denied per matrix |
| F09 | Linked Employee/HR checks in and out with server stamps | Second same-day check-in → **409**; client time ignored |
| F10 | Admin/HR board and Employee calendar show correct attendance | Employee cannot view peer attendance; missing/absent derivations |
| F11 | Employee requests correction; HR approves/rejects; audit records change | Employee cannot PATCH time; unauthorized HR decision denied |
| F12 | Employee/HR self apply/cancel leave, view live balance/history | Holiday/weekend skipped; overlap/excess → **422** |
| F13 | HR decision comment recorded; owner notified; balance updated | Employee cannot decide; other employee can't access request |
| F14 | HR configures basic salary and 40%/10% allowances | Employee cannot read peer salary or change their own |
| F15 | HR makes accurate monthly draft from attendance/leave | Proration, unpaid and half-day applied; duplicate run prevented |
| F16 | Admin finalizes month; generated items immutable | HR finalization denied; Admin cannot edit final payroll |
| F17 | Admin/HR download any permitted slip; Employee own PDF | Employee cannot download a colleague's slip |
| F18 | Company/HR/personal KPIs, charts, filters reflect real records | Fresh install shows empty metrics; no fabricated trends |
| F19 | Role-scoped `/ai/chat` gives tool-grounded answers | Peer salary question refused; prompt injection cannot expand scope |
| F20 | Admin/HR current-filter KPI JSON → 3–5 grounded insights | Employee cannot invoke summarizer; invented KPI rejected |
| F21 | Plain-language leave → valid prefill; user confirms submission | Invalid JSON retry once; fallback to normal form; never auto-save |
| F22 | Policy questions answered using stored policy/official rules | Unknown policy receives honest uncertainty, not invented answer |
| F23 | Admin/HR post announcements visible on all dashboards | Employee cannot post; non-existent content handled cleanly |
| F24 | Leave decisions/payslips create recipient's in-app alerts | User cannot read/change another user's alerts |
| F25 | Admin audits actor/action/entity/before/after | HR can't view log; nobody can edit/delete entries |

## 3. Business rule test sets

### Attendance

- `ATT-01`: At default 09:15 exactly, check-in **not** late.
- `ATT-02`: After grace threshold, check-in **late**.
- `ATT-03`: 299 min completed → half-day; 300 min → not half-day.
- `ATT-04`: No checkout → missing checkout.
- `ATT-05`: Expected workday without record and approved leave → absent; non-workday not absent.
- `ATT-06`: Concurrent duplicate check-ins store one row; conflict is 409.
- `ATT-07`: HR-approved correction adjusts reporting, logs before/after and does not break lock semantics.

### Leave

- `LEV-01`: Request including Sat/Sun excludes weekends.
- `LEV-02`: Configured holiday in date span also excluded.
- `LEV-03`: Annual 14, Sick 8, Casual 10, Unpaid unlimited.
- `LEV-04`: More than quota or overlaps relevant request status returns 422.
- `LEV-05`: Approval with HR comment reflects in balance, dashboard, notification.
- `LEV-06`: Pending vs approved usage and cancellation follow approved decision log.
- `LEV-07`: Year-crossing request follows explicit quota allocation decision.

### Payroll

- `PAY-01`: Basic 50,000 → HRA 20,000, medical 5,000, gross 75,000.
- `PAY-02`: Month working-day rate computed accurately.
- `PAY-03`: Absence and unpaid leave each deduct full day; half-day 0.5 day.
- `PAY-04`: Midmonth joiner and leaver correctly prorated.
- `PAY-05`: Annual tax thresholds 600k/1.2M/2.4M/3.6M verified.
- `PAY-06`: Finalization unique and atomic; payroll edit blocked for **all roles**.
- `PAY-07`: PDF values equal locked payroll item stored values.

### Analytics + AI

- `KPI-01`: Headcount equals active + probation on selected end date.
- `KPI-02`: No records → appropriate zeros/empty charts, never samples.
- `KPI-03`: Date/department filters change totals consistently.
- `KPI-04`: Absent employee-days derived even when no attendance row exists.
- `AI-01`: HR asks active Finance headcount; answer equals exact KPI endpoint.
- `AI-02`: Employee asks own sick leave balance; answer is own approved usage.
- `AI-03`: Employee asks colleague's salary; **refuse**.
- `AI-04`: Smart leave natural language → correct prefill; requires confirmation.
- `AI-05`: Provider timeout at ~15 seconds → friendly fallback; AI log written.
- `AI-06`: ~20 AI requests/user/hour throttle.
- `AI-07`: JSON validation failure retries once, then manual form.

## 4. Live judge rehearsal: five-minute sequence [BRIEF, p. 6]

1. Open hosted app **with fresh database** → Admin enters company, office hours/location, department and leave types; creates HR account.
2. HR logs in → registers 2–3 employees, each with real job/pay; employee signs in and changes temporary password.
3. Employee checks in from web and sends a natural-language leave request; confirms prefilled form.
4. HR approves request → opens HR dashboard; clicks **Summarize**; asks AI who is on leave and checks the same records.
5. HR creates monthly payroll draft → Admin finalizes it (HR cannot).
6. Employee downloads own payslip → asks for a colleague's salary (AI refuses).
7. Admin displays immutable audit log showing important actions.

**Pass evidence:** all flows visible end-to-end; dashboard/AI/source record values agree; locked run cannot be edited; fresh system begins empty.

## 5. Responsive / UX acceptance

- All key routes render and work at **375 px width and above** (PDF printed p. 4).
- Visible empty, loading, success, error and access-denied states.
- Role-appropriate menus; keyboard-accessible form controls and useful validation messages [PROPOSED].
- No charts showing fake records; empty chart explains how to generate actual data.
- PDF download has visible status and clear error behavior.

## 6. Security regression gates

- Repeat each sensitive API across all 3 roles and with changed `employeeId`/object ID.
- Verify JWT expiration/invalidation policy, bcrypt hashes, no tokens/secrets in client bundles, server-only `AI_API_KEY`.
- Validate CSRF if cookie authentication chosen; sanitize user-provided text for display.
- Audit event includes actor/action/entity/before/after, with redacted credentials and sensitive secrets.
- Verify AI cannot access direct database/SQL tools or choose unrestricted actor scope.

## 7. Test reporting template [PROPOSED]

| Case ID | Setup in isolated test DB | Expected result | Actual result | Pass/Fail | Evidence link | Owner |
|---|---|---|---|---|---|---|
| F01 | Fresh isolated DB | Setup once only | Not run | Pending | — | Backend A |

**Release blocker:** any unauthorized salary disclosure, stale/fake dashboard data, missing real flow, mutation of finalized payroll or inability to start from fresh setup.

## 8. Planned test automation stack [PROPOSED]

- API/service tests: Vitest or Jest + supertest; real test PostgreSQL for constraints/transactions.
- Browser E2E: Playwright in isolated database; mobile viewport 375px.
- Contract smoke: scripted production-like scenario after deployment.
- AI provider contract: mocked tool-calling during automated tests; a small **actual** provider integration test if key/config available (no user secrets in fixtures).

**Do not claim these tests pass until executed.**

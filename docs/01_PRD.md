# HCM Lite — Product Requirements Document (PRD)

**Project:** Saylani Hackathon — HCM Lite  
**Document status:** Planning baseline / review draft  
**Source of truth:** `Saylani_Hackathon_HCM_Lite_Brief.pdf`, 24 October 2026 (six numbered brief pages; the PDF also contains a cover)  
**Scope notation:** **[BRIEF]** explicitly required by the PDF; **[PROPOSED]** implementation choice; **[OPEN]** item not fully specified by the PDF.

## 1. Product summary

Build an **AI-assisted Human Capital Management web application** for the everyday work of company administrators, HR staff, and employees. The app must **start without seeded or dummy operational data**. At first use, an Admin configures a company; Admin creates HR logins; HR registers employees and their login accounts. Operational records generated in the application drive payroll, dashboards, and AI answers. [BRIEF, pp. 1, 4]

### Goals and evidence of success

1. Admin, HR, and Employee each see an appropriate role-specific menu, dashboard, and subset of company data. [BRIEF]
2. Judges can complete the entire employee → check-in → leave request → HR approval → payroll draft → Admin finalization → payslip journey from a fresh installation. [BRIEF]
3. Dashboards and AI report the same values as the underlying records created during the demonstration. [BRIEF]
4. Sensitive records remain inaccessible to an unauthorized user, including through AI tools. [BRIEF]
5. A live web app and reproducible README support the five-minute demo and a judge-friendly setup under ten minutes. [BRIEF]

### Non-goals / explicit optional functionality

- A separately installable **mobile application** is **optional**, not essential. [BRIEF]
- Camera attendance with face detection and location validation is **bonus**, doable in mobile or web. [BRIEF]
- Attrition risk scoring, absence anomaly flags, late penalty (3 lates = 0.5 day), Roman Urdu AI, dark mode, and PWA are **bonus**. [BRIEF]
- Third-party payroll disbursement, tax-filing integration, biometrics storage, SSO, and multi-company tenancy are **not required by the PDF**. Do not add them to the core project by default. [PROPOSED exclusion]

## 2. User roles and permissions

| Capability | Admin | HR | Employee |
|---|---|---|---|
| Initial company/Admin setup | Manage | — | — |
| Company office/rule settings; organizational catalogs | Manage | View | — |
| Create HR accounts; deactivate/reset logins | Manage | — | — |
| Employee create/edit | View | Manage | Own phone/address only |
| Employee directory / Employee 360 | All | All | Own |
| Employee CSV import/export | — | Manage | — |
| Web check-in / check-out | — | Own | Own |
| Attendance calendar/board | All | All | Own |
| Attendance correction | View | Approve/reject | Request |
| Apply/cancel leave, leave balance/history | — | Own | Own |
| Approve/reject leave with comment | View | Approve/reject | — |
| Salary structure | View | Manage | — |
| Create/review monthly payroll draft | View | Manage | — |
| Finalize/lock payroll | Manage | — | — |
| Download payslip | All | All | Own |
| Dashboards | Company-wide | HR scope | Own |
| AI chat on allowed data | All company | HR-authorized data | Own data + policy |
| AI dashboard summary | Yes | Yes | No |
| Smart leave | — | Own | Own |
| Policy Q&A | Yes | Yes | Yes |
| Announcements | Post | Post | Read |
| Notifications | Own | Own | Own |
| Immutable audit log access | View | — | — |

**Security principle:** All permissions must be verified **server-side for each request**. The AI cannot bypass the role/data-scope guard. Hiding UI links is insufficient. [BRIEF, p. 2, p. 5]

**Role nuance:** The brief permits HR to use personal check-in and leave actions ('Own'), but does not permit Admin check-in or leave in the 25-item checklist. Preserve that distinction. [BRIEF, p. 5]

## 3. User journeys

**Admin's first-run journey** — Open empty installation → create company profile and initial Admin account (or use `ADMIN_EMAIL`/`ADMIN_PASSWORD` environment bootstrap) → configure office schedule, location, grace period, weekends, departments, designations, leave types/quotas, and holidays → create HR login. [BRIEF]

**HR onboarding journey** — Sign in → register an employee with job and pay details → system creates a login and temporary password → employee signs in and changes password → employee uses self-service. [BRIEF]

**Daily operations journey** — Employee checks in → server records time → employee checks out → time status is computed. If the record is wrong, employee requests a correction with a reason and HR decides. [BRIEF]

**Leave journey** — Employee applies for dates/type/reason (manually or using smart leave) → server computes chargeable working days, checks overlap/balance → HR approves/rejects with comment → employee gets decision notification and updated approved-leave balance. [BRIEF]

**Payroll journey** — HR prepares and reviews a monthly draft based on employee salary structures, attendance, approved unpaid leave, and tax brackets → Admin finalizes, permanently locking the run → employee downloads own payslip PDF. [BRIEF]

**AI journey** — A signed-in user asks about approved accessible HR data → backend chooses and executes a permission-filtered tool → LLM receives tool result → user gets an AI-labeled, grounded answer. [BRIEF]

## 4. Complete 25-functionality acceptance register

Each ID corresponds to the official functionality checklist on brief page 5. A **pass** requires correct UI **and** enforced backend permissions.

| ID | Module | Requirement [BRIEF] | Minimum acceptance check |
|---|---|---|---|
| F01 | M2/M1 | First-run company profile/Admin account | Fresh database shows setup; first Admin created once; no dummy data |
| F02 | M1 | Login, logout, password change; 3 role dashboards | Valid login works; first-use password rotation; wrong role blocked |
| F03 | M2 | Company schedule, grace, weekends, office geofence settings | Admin persists settings; HR can view, not change |
| F04 | M2 | Departments, designations, leave quotas/types, holidays | Admin CRUD + validation; configured items appear in HR forms |
| F05 | M1/M2 | HR login creation; deactivate/reset login | Admin controls account lifecycle; deactivated login denied |
| F06 | M3 | Register employee plus login; edit details | HR saves employee with unique code/email and temporary login |
| F07 | M3 | Directory/search/filter; Employee 360 | Server paging and filters; Employee sees self only |
| F08 | M3 | CSV dry-run import and export | Errors identify row/field/reason; no writes during dry run |
| F09 | M4 | Web check-in/out | Server timestamps; duplicate daily check-in returns HTTP 409 |
| F10 | M4 | Attendance calendar, HR daily board | Status and ownership reflect real records; date filters work |
| F11 | M4 | Correction request and HR approval | Employee cannot directly edit attendance; approved change audited |
| F12 | M5 | Apply/cancel leave; balance/history | Working-day accounting, overlaps/balance errors HTTP 422 |
| F13 | M5 | Leave approval/rejection with comment | Only HR can decide; result reflected in history and balance |
| F14 | M6 | Employee salary structure | HR sets basic/allowances; Employee cannot edit salary |
| F15 | M6 | Monthly payroll create/review draft | HR creates inspectable monthly calculations from actual data |
| F16 | M6 | Admin finalize/lock run | Only Admin finalizes; subsequent edits rejected |
| F17 | M6 | Payslip PDF download | Finalized run yields authorized, downloadable PDF |
| F18 | M7 | Filterable role dashboards/KPIs/trends/insights | Values recompute from database on selected filters |
| F19 | M8 | Tool-grounded AI chat | AI answer matches dashboard; Employee cannot query coworkers' salary |
| F20 | M8 | Admin/HR AI dashboard summary | Current filtered KPI JSON yields 3–5 grounded insights |
| F21 | M8 | Natural-language smart leave → form | AI suggests structured fields; user reviews and confirms |
| F22 | M8 | Policy questions | Only cited-in-app policy/rules answered; unknowns admitted |
| F23 | M9 | Announcements | Admin/HR post; every role can read on dashboard |
| F24 | M9 | In-app notifications | Leave outcomes and payslip notifications go to proper recipients |
| F25 | M9 | Action audit trail | Actor/action/entity/before-after retained; Admin read-only view |

**Important interpretation:** F08 is in the official 25-item checklist, so it belongs in the required delivery plan even though the earlier module-tree/business-rule descriptions describe CSV import as optional. See §10. [BRIEF, pp. 1, 2, 5]

## 5. Critical product rules [BRIEF]

### Organization settings

- Initial default work start: **09:00**, grace **15 minutes**, half-day threshold **under 5 hours**, weekends **Saturday and Sunday**.
- Admin configures office latitude/longitude and radius (example **150 m**) for optional camera attendance.
- Modified settings apply to **new records only**; do not silently recompute historical outcomes.

### Attendance

- Server, not browser, timestamps attendance.
- One attendance record per employee per calendar day; second check-in gets `409 Conflict`.
- Late after **09:15** under the stated defaults.
- `half_day` when completed worked hours are **under five**; `missing_checkout` when no checkout recorded; `absent` if no attendance and no approved leave.
- Employee requests a correction; HR decides. Employees cannot modify stored attendance directly.

### Leave

- Count **working days only**, skipping configured weekends and public holidays.
- Annual **14**, sick **8**, casual **10**, unpaid **unlimited** default annual quotas.
- Overlapping leave or insufficient balance gets `422 Unprocessable Entity`.
- HR approval updates actual leave utilization; reject/cancel should not consume an approved quota.

### Payroll

- Gross = **1.5 × basic**: housing allowance 40% of basic + medical allowance 10% of basic.
- Per-day amount = gross ÷ working days of payroll period.
- Deduct unpaid/absent days, plus **0.5 × number of half-days**, priced at per-day amount.
- Prorate employees joining/leaving during the month.
- Use the **illustrative annualized tax slabs** supplied in the PDF (detailed in TRD/schema); finalize by Admin; finalized payroll immutable.

### Analytics

- Aggregate on the **server from the database**, filter by date range and department.
- Admin: headcount, YTD attrition, payroll cost, mean salary, departments, gender/tenure, audit feed, AI summary.
- HR: headcount, today's present/leave/late/pending, attendance trend, absence by department, leave by type, top five late-comers, AI summary.
- Employee: check-in, weekly hours versus 40 hours, late count, leave balance, last payslip, announcements, AI assistant.

### AI

- Tool calling through **backend**; model never accesses DB directly and never creates/saves records autonomously.
- `/ai/chat` plus backend tools: `get_headcount`, `get_attendance_summary`, `get_late_comers`, `get_leave_summary`, `get_my_leave_balance`, `get_payroll_summary`, `search_employees`.
- Smart leave suggestion produces `{type, start, end, reason}`, pre-populates form, requires user confirmation.
- AI response explicitly labeled **AI-generated**; server keeps `AI_API_KEY` secret.
- Timeout **15s**, approximately **20 calls per user per hour**, AI interaction log; invalid JSON retry once and use regular form on failure.

## 6. Nonfunctional requirements

| Concern | Acceptance target |
|---|---|
| Web responsiveness | [BRIEF] App usable from **375 px** wide and larger |
| Roles and data scope | [BRIEF] Enforced by backend on every protected operation |
| Secret protection | [BRIEF] No AI key or real DB password in browser/repository |
| Password security | [BRIEF] bcrypt hashes; JWT auth |
| Fresh install | [BRIEF] No fabricated demo records, only setup defaults when initialized |
| Reliable errors | [BRIEF] HTTP 409 for duplicate check-in; HTTP 422 for specified leave invalidity |
| UX quality | [BRIEF] Clear loading, empty and error states; consistent and responsive |
| Validation | [BRIEF] Server-side for forms/import; [PROPOSED] shared typed request schemas |
| Auditability | [BRIEF] Important creates, updates, approvals, finalization logged |
| Security tests | [PROPOSED] Automated denied-access, password, injection, race-condition tests |
| Accessibility | [PROPOSED] Keyboard support, focus indicators, labeled forms, contrast |

## 7. Official judging priorities

| Category | Points |
|---|---:|
| Core HR flows | 25 |
| Data & analytics | 20 |
| AI features | 15 |
| Code quality | 15 |
| UI / UX | 10 |
| Security & RBAC | 10 |
| Demo & docs | 5 |
| **Core score** | **100** |
| Bonus features | +10 possible |

**Release strategy:** Finish functioning secure workflows and accurate data analytics before expanding into bonus attendance or cosmetic effects. [BRIEF, p. 6]

## 8. Required end-to-end demo acceptance

1. Start the live hosted app on a fresh install; complete Admin/company setup.
2. Admin configures office schedule/location, one department and leave types; creates HR.
3. HR creates 2–3 employees; an employee signs in and changes temporary password.
4. Employee checks in and applies for leave using natural language; sees editable pre-filled form.
5. HR approves leave, opens metrics, requests AI summary and queries who is on leave.
6. HR creates monthly payroll draft; Admin finalizes; Employee downloads their payslip.
7. Employee attempts to ask another employee's salary; AI safely refuses.
8. Admin inspects audit log; judges observe dashboard/AI agree with actual records.

## 9. Delivery artifacts

- Working, publicly reachable **web app** (mandatory).
- Public or judge-accessible source repository.
- README explaining stack, local installation, first-Admin initialization, AI key configuration, implemented/missing features.
- `.env.example` committed; actual `.env`, AI key, and database password **never** committed.
- Every student submits repository and hosted project links in own Saylani LMS portal. Mobile app APK/Expo link only if bonus mobile app is built. [BRIEF, p. 6]

## 10. Open product decisions and source discrepancies

These must be clarified/recorded rather than quietly attributed to the PDF.

| ID | Topic | Why it is open | Safe planning disposition [PROPOSED] |
|---|---|---|---|
| PD-01 | CSV 'optional' vs official checklist F08 | Module descriptions say optional, final checklist enumerates F08 | Implement F08; document if time-constrained |
| PD-02 | Employee fields and lifecycle | Core profile fields, gender/tenure, probation and exits are implied but not fully enumerated | Define minimum schema, job dates and status with proper privacy |
| PD-03 | Attendance precedence | Late + half-day + missing checkout may occur together; exact precedence not described | Preserve base clock events and calculate independent flags; define displayed primary status |
| PD-04 | Attendance denominator | 'Working-day records − on_leave' is not fully defined for days without physical record | Use expected scheduled employee-days minus approved leave; document precise test cases |
| PD-05 | Payroll tax and rounding | Currency/rounding and application of annual slab to monthly payroll not specified | Treat as illustrative monthly withholding = annual computed tax ÷12, request sign-off |
| PD-06 | Payroll amendment/correction | Post-finalization correction process not specified | Prevent changes to locked run; any reversal workflow is out-of-scope |
| PD-07 | Work schedules | Weekend defaults provided; flexible schedules, night shifts, overnight attendance absent | Keep single company time zone/day schedule for MVP |
| PD-08 | Password delivery | Temporary password process specified, delivery mechanism not | Display one-time securely to HR and require rotation on first login |
| PD-09 | HR department scoping | HR scope is described as 'HR data' without departments assignment rules | HR can access people-ops company-wide except admin-only/security restricted data |
| PD-10 | AI policy provenance | Prompt rules come from Section 3, no employee handbook specified | Answer only configured business rules; explicitly say when policy unknown |
| PD-11 | Leave year/past requests | Leave accrual and year-boundaries not fully specified | Calendar-year quota; define span handling; avoid silent carryovers |
| PD-12 | Time zone & payroll period | Not specified explicitly | Configurable IANA company time zone; month determined in company-local time |

## 11. Traceability to source PDF

- **Brief p. 1** — scope, three roles, 9 modules, empty data, team/demo requirements.
- **Brief p. 2** — role actions/limitations and core business rules.
- **Brief p. 3** — AI behavior/guardrails and optional camera+geofence.
- **Brief p. 4** — architecture, data flow and first-use data creation.
- **Brief p. 5** — analytics, dashboards and the 25-row access checklist.
- **Brief p. 6** — demo, scoring and submission.

**Handoff:** Read `02_TRD.md` for implementation architecture and `06_IMPLEMENTATION_PLAN.md` for ordered build gates. The product acceptance register above is the baseline; do not drop a feature without recording a deliberate scope decision.

# HCM Lite — Technical Requirements Document (TRD)

**Status:** Architecture proposal aligned to the Saylani HCM Lite brief (24 October 2026).  
**Legend:** **[BRIEF]** official requirement; **[PROPOSED]** concrete build decision; **[OPEN]** clarification needed.  
**See also:** `01_PRD.md`, `05_BACKEND_SCHEMA.md`, `06_IMPLEMENTATION_PLAN.md`.

## 1. Architecture and component boundaries

The PDF allows any language, framework, or database but requires a browser-accessible app, REST/JSON/JWT backend, database, and backend-mediated hosted LLM. [BRIEF, pp. 1, 4]

**Proposed stack (not mandated by the brief):**

| Layer | Choice [PROPOSED] | Responsibility |
|---|---|---|
| Client | React + TypeScript + Vite | Three role shells, forms, chat, dashboards |
| Styling | Tailwind CSS | Responsive design and reusable UI components |
| API | Node.js + Express + TypeScript | Routes, authentication, authorization, input handling |
| Validation | Zod | Runtime request/response validation |
| Data | PostgreSQL + Prisma | Transactions, relations, constraints, aggregations |
| Passwords | bcrypt | Salted password hashing [BRIEF] |
| Sessions | JWT | Signed token authentication [BRIEF] |
| Charts | Recharts | Display server-calculated KPI aggregates |
| AI | Hosted LLM with tool calling | Natural-language explanations, smart leave parsing [BRIEF] |
| Payslips | PDF generator on server | Authorized payslip PDFs [BRIEF] |

```mermaid
flowchart LR
  A[Browser: Admin / HR / Employee] -->|HTTPS REST + JWT| B[Express API]
  B --> C[JWT and role/scope guard]
  C --> D[Domain services]
  D --> E[(PostgreSQL)]
  D --> F[AI orchestrator]
  F -->|Tool calls to authorized services| D
  F -->|Provider API key on server| G[Hosted LLM]
  D --> H[PDF payslip generator]
  D --> I[Audit and notification services]
```

### Backend layering [PROPOSED]

- **Route/controller:** parse HTTP, authenticate, validate payload, invoke service, format response.
- **Authorization:** role permissions, record ownership, data-scope checks, explicit denied actions.
- **Service layer:** place all attendance, leave, payroll, KPI and HR rules here.
- **Repository/data access:** parameterized ORM queries and DB transactions.
- **AI tool adapters:** call **the same domain services** with the authenticated security context; never raw model-provided SQL.
- **Cross-cutting:** logging, audit, notifications, error mapping, secure config.

## 2. Domain and repository structure [PROPOSED]

```text
hcm-lite/
  apps/
    web/
      src/{app,components,features,layouts,lib,styles}
    api/
      src/
        {config,middleware,modules,shared}
        modules/
          auth/ organization/ employees/ attendance/
          leave/ payroll/ analytics/ ai/ comms/ audit/
      prisma/{schema.prisma,migrations}
      tests/{unit,integration,security}
  docs/
    01_PRD.md
    02_TRD.md
    03_APP_FLOW.md
    04_UI_UX_BRIEF.md
    05_BACKEND_SCHEMA.md
    06_IMPLEMENTATION_PLAN.md
  .env.example
  README.md
```

**One-way dependency rule:** A module service may depend on another domain service's public functions, not on its private controllers. AI tool handlers use exactly those public service functions.

## 3. Authentication, bootstrap, and permission design

### 3.1 First installation [BRIEF + PROPOSED mechanism]

- If the database has **no company/Admin**, show the first-run wizard. Support environment bootstrap through `ADMIN_EMAIL` and `ADMIN_PASSWORD` if selected. [BRIEF]
- Only one initial Admin creation is permitted; protect against parallel bootstrap requests with a database constraint/transaction. [PROPOSED]
- Do **not** expose a second unauthenticated company-creation route after bootstrap. [PROPOSED]
- Create default office and leave rule **configuration**, but **no fabricated employee/activity records**. The PDF allows default rule values and demands empty operational data. [BRIEF]

### 3.2 Identity [BRIEF]

- Three role values: `ADMIN`, `HR`, `EMPLOYEE`.
- bcrypt hashes; JWT sent to API; password change and logout.
- HR employee creation provisions a login with temporary password, flagged for change at first sign-in.
- Admin can create HR accounts, deactivate accounts, reset credentials.

### 3.3 Authorization [BRIEF]

- Deny by default; check actor role **and** employee/entity scope in each protected service.
- Employee may query only own attendance, leave, salary/payslips and profile; may change **own phone and address only**.
- HR may access people-ops records/employee salaries, but cannot modify company settings, create Admin accounts, finalize payroll, or view Admin audit feed.
- Admin may inspect organization records, manage company settings and finalize payroll; cannot alter finalized payroll or mutate audit history.
- AI tool functions receive `actorUserId`, `role`, and resolved `employeeId`; ignore any untrusted employee ID that attempts to escalate scope.

**Proposed safeguards:** rate limit password endpoints; redact passwords/tokens/salary from general logs; use secure HTTPS cookies or an appropriately protected token strategy; apply CSRF protection if cookie-based; CORS allowlist; security headers; opaque error messages for auth failures.

## 4. API contract outline

Endpoint names below are **[PROPOSED]** except `/ai/chat`, which is **explicitly shown in the PDF**. All `/api/*` prefixes are conventions, not PDF-prescribed URLs. Every endpoint needs Zod validation, auth where applicable, a scope guard, and consistent JSON error codes.

| Area | Example endpoint | Allowed actor | Outcome |
|---|---|---|---|
| Bootstrap | `POST /api/setup/first-run` | Unauthenticated only if uninitialized | Create company/Admin once |
| Auth | `POST /api/auth/login` | Public | Issue authenticated session/JWT |
| Auth | `POST /api/auth/change-password` | Signed-in | Update bcrypt hash, clear first-use flag |
| Auth | `POST /api/auth/logout` | Signed-in | End client session; optionally revoke refresh token |
| Settings | `GET/PUT /api/company/settings` | Admin write; HR read | Store future-effective office/rules settings |
| Setup | `GET/POST/PATCH /api/departments` | Admin write; HR read | Department lifecycle |
| Setup | `/api/designations`, `/api/leave-types`, `/api/holidays` | Admin write; HR read | Catalog management |
| Accounts | `POST /api/users/hr`, `PATCH /api/users/:id/status`, `POST /api/users/:id/reset` | Admin | Account management |
| Employees | `GET/POST /api/employees`, `GET/PATCH /api/employees/:id` | HR manage; Admin all view; Employee own limited | Personnel records |
| Employees | `POST /api/employees/import/dry-run` | HR | Validate CSV, no write |
| Employees | `POST /api/employees/import`, `GET /api/employees/export` | HR | Commit valid import/export |
| Attendance | `POST /api/attendance/check-in`, `/check-out` | HR/Employee own | Server-stamped events |
| Attendance | `GET /api/attendance` | Role-scoped | Board/calendar |
| Corrections | `POST /api/attendance/corrections` | Employee own | Request with reason |
| Corrections | `POST /api/attendance/corrections/:id/decision` | HR | Approve/reject with comment |
| Leave | `POST /api/leave/requests` | HR/Employee own | Validate quota/overlap, submit |
| Leave | `GET /api/leave/requests`, `GET /api/leave/balance` | Role-scoped | Requests/balance |
| Leave | `POST /api/leave/requests/:id/cancel` | Request owner | Cancel if eligible |
| Leave | `POST /api/leave/requests/:id/decision` | HR | Approve/reject with comment |
| Salary | `GET/PUT /api/employees/:id/salary` | HR write; Admin read | Set pay components |
| Payroll | `POST /api/payroll/runs`, `GET /api/payroll/runs/:id` | HR draft; Admin view | Create/review monthly run |
| Payroll | `POST /api/payroll/runs/:id/finalize` | Admin | Transactionally lock run |
| Payslip | `GET /api/payslips/:id/pdf` | Admin, HR, authorized owner | Return PDF securely |
| Analytics | `GET /api/analytics/admin`, `/hr`, `/me` | Per-role | Preaggregated KPIs/series |
| AI | **`POST /ai/chat`** | All roles | Tool-routed assistant reply |
| AI | `POST /api/ai/dashboard-summary` | Admin/HR | Summarize filtered KPI JSON |
| AI | `POST /api/ai/smart-leave` | HR/Employee own | Validate suggested JSON without submitting |
| Announcements | `GET/POST /api/announcements` | All read; Admin/HR post | Organization messages |
| Notifications | `GET/PATCH /api/notifications` | Own | In-app alerts/read state |
| Audit | `GET /api/audit-logs` | Admin | Read immutable action records |

### 4.1 Uniform errors [PROPOSED]

```json
{
  "error": {
    "code": "ATTENDANCE_ALREADY_CHECKED_IN",
    "message": "You have already checked in today.",
    "details": []
  }
}
```

- `400` malformed request, `401` unauthenticated, `403` forbidden, `404` inaccessible/not found, `409` duplicate daily check-in, `422` leave overlap/over-balance, `429` AI throttle, `500` server issue, `503/504` AI provider unavailable/timeout. Use safe non-sensitive error wording. [409 and 422 mandated; other mappings proposed]

## 5. Domain algorithms

### 5.1 Attendance [BRIEF + proposed edge handling]

1. Resolve active actor employee identity from JWT rather than form input.
2. Resolve company-local calendar day and **effective settings** (office start, grace, weekend, half-day). [PROPOSED time-zone/versions]
3. On check-in: generate server time; transactionally insert row `(employee_id, work_date)`; let unique index reject double check-in as `409`.
4. On check-out: set server time on existing row; validate not already checked out. [PROPOSED second check-out handling]
5. Derive `late` if check-in beyond start + grace; `half_day` if actual completed duration < threshold; `missing_checkout` if check-in without checkout; `absent` from expected working days lacking attendance and approved leave.
6. Correction requests never directly mutate original data; HR approval applies audited adjustment and re-evaluates projections. [PROPOSED implementation]

**[OPEN]** What if employee is both late and half-day? Preserve independent flags alongside primary status instead of losing one dimension. Explicitly define primary display-status precedence before UI implementation.

### 5.2 Leave [BRIEF]

1. Verify start/end dates; valid leave type; request owner; eligible dates.
2. Count only configured workdays, excluding configured holidays.
3. Reject overlap with already relevant leave requests (exact statuses to be decided), return **422**.
4. Reject quota-consuming request with insufficient remaining entitlement, return **422**.
5. Persist pending request; HR decides with comment; approval consumes annual allowance for that leave category.
6. Unpaid leave is unlimited but its approved days affect the payroll deduction.

**[OPEN]** A request spanning calendar years and quota refresh/carryover rules are not given. Propose calendar-year entitlement with per-year allocation and explicit split/reject decision.

### 5.3 Payroll math [BRIEF]

For each employee and month:

```text
housing_allowance = basic * 0.40
medical_allowance = basic * 0.10
gross_monthly = basic + housing_allowance + medical_allowance
              = basic * 1.50
per_day = gross_monthly / working_days_in_month
absence_related_deduction = per_day * (
  absent_days + approved_unpaid_days + 0.5 * half_days
)
annualized_gross = gross_monthly * 12
net_monthly = eligible_gross - absence_related_deduction - monthly_tax
```

**Illustrative annual tax function from brief p. 2:**

| Annual gross `A` | Illustrative annual tax `T(A)` |
|---|---|
| `0 ≤ A ≤ 600,000` | `0` |
| `600,000 < A ≤ 1,200,000` | `(A − 600,000) × 5%` |
| `1,200,000 < A ≤ 2,400,000` | `30,000 + (A − 1,200,000) × 15%` |
| `2,400,000 < A ≤ 3,600,000` | `210,000 + (A − 2,400,000) × 25%` |
| `A > 3,600,000` | `510,000 + (A − 3,600,000) × 35%` |

**[OPEN]** PDF says slab on `gross × 12` but not exactly how to derive monthly tax or handle partial-month new joiners, rounding, and tax year; **proposal:** monthly tax = `T(gross_monthly × 12) ÷ 12`, calculated on full recurring monthly gross, with separate gross proration/deduction and fixed 2-decimal currency rounding. This requires explicit team sign-off; it is **not** a quoted PDF formula.

**Required locking:** HR prepares `DRAFT`; only Admin moves to `FINALIZED` transactionally, and no API can modify a finalized run or its item snapshots. [BRIEF]

### 5.4 KPI computations [BRIEF, p. 5]

- Headcount = active + probation as of selected end date.
- Attrition % = exits in period ÷ average headcount × 100.
- Attendance rate = `(present + late + missing_checkout + 0.5 × half_day) ÷ (working-day records − on_leave)`.
- Late % = late ÷ (present + late).
- Absenteeism = absent days ÷ expected working days (by department).
- Leave utilization = approved days ÷ quota by leave type and department.
- Payroll cost = sum of gross/net by selected month and department.
- Average salary = mean gross by department/designation.

**[OPEN]** Denominator definition and mutually-exclusive status counts must be agreed so daily employee-day rows aren't double-counted. Proposed KPI service should build a daily normalized attendance classification and compute expected working days even when attendance records are absent.

## 6. AI runtime and safety requirements

### 6.1 Required tools [BRIEF, p. 3]

| Tool | Data returned, based on actor scope |
|---|---|
| `get_headcount` | Headcount filtered by allowed department and date |
| `get_attendance_summary` | Attendance totals/rates from same KPI services |
| `get_late_comers` | Late-comer list/count; not across unauthorized employees |
| `get_leave_summary` | Approved/pending leave by permitted period/type |
| `get_my_leave_balance` | Authenticated actor's own entitlement/balance |
| `get_payroll_summary` | Admin/HR permitted aggregate, not a colleague's detail for Employee |
| `search_employees` | Only fields and employee visibility actor is authorized to access |

### 6.2 Request flow [BRIEF + PROPOSED details]

```mermaid
sequenceDiagram
  participant U as Signed-in user
  participant API as /ai/chat
  participant O as AI orchestrator
  participant L as Hosted LLM
  participant S as Authorized domain service
  U->>API: Question + JWT
  API->>O: User-scoped actor context
  O->>L: Policies and tool schemas (no secrets)
  L-->>O: Requested tool call
  O->>S: Validated tool args + actor scope
  S-->>O: Authorized database-derived result
  O->>L: Tool result (limited fields)
  L-->>O: Answer
  O-->>U: AI-generated answer
```

- LLM must never query DB directly or receive SQL execution tools. [BRIEF]
- LLM never submits forms/saves data without a human confirmation step. [BRIEF]
- Smart leave validates exact JSON keys: `type`, `start`, `end`, `reason`; retry malformed result once, fall back to manual form. [BRIEF]
- System prompt contains only defined company attendance/leave/payroll policies for policy Q&A; say unknown otherwise. [BRIEF]
- `AI_API_KEY` in server environment only, ~20 interactions per user per hour, 15s timeout, `ai_logs`, visible "AI-generated" badge. [BRIEF]
- **[PROPOSED]** Sanitize/redact tool results; cap result size; restrict tool arguments to enumerated schemas; do not log hidden passwords, token or excess private data; detect prompt-injection text in database fields as untrusted.

### 6.3 Dashboard summarization [BRIEF]

Pass **current already-authorized filtered KPI JSON** to AI; show **three to five** evidence-bound insights. Refuse to invent missing values. If provider fails, original dashboard continues working without summary.

## 7. Import, audit, and notification behavior

**CSV import validation [BRIEF, pp. 2, 5]:** Dry-run produces a row number, field and reason for errors; required fields, unique employee code/email, valid email, known department, ISO date, salary > 0. Only explicit commit writes. [PROPOSED] Each import has transaction guard and duplicate detection within file and DB; report created/skipped/failed counts.

**Audit log [BRIEF]:** Every important action stores actor, action, entity, before/after JSON. [PROPOSED] Append-only service, redact secrets, include request ID, timestamp and actor ID; prohibit update/delete routes and DB permissions for ordinary app role.

**Notifications [BRIEF]:** Announcements appear on dashboards; notify for leave decisions and payslips. [PROPOSED] Durable in-app queue entries with `read_at`; do not promise email/push integration.

## 8. Optional camera + location attendance (bonus)

**Only after all core requirements pass.** [BRIEF, p. 3]

1. Open front camera, detect **exactly one** face in frame.
2. Request GPS lat/lng + accuracy; reject accuracy **worse than 100 m**.
3. Send detection result/location to backend; **server** stamps attendance time and computes Haversine distance.
4. Reject when outside Admin-configured radius (example **150 m**), missing face, or multiple faces.
5. Persist source = `camera` and check-in status. By default store detection result, **not full photo**; tell user what is captured.
6. Offer HR attendance correction path on failure.
7. Face matching to enrolled identity and blink/liveness are **extra bonus**, beyond basic face detection.

**Candidate libraries suggested by brief (not mandatory):** `@vladmandic/face-api`, MediaPipe Face Detector, TensorFlow.js face detection, React Native vision-camera / ML Kit, Expo camera+location; `geolib` for server geofence. Verify current package compatibility if implementation reaches this bonus stage.

## 9. Deployment and environment settings

### Minimum environment contract [PROPOSED, with mandated key naming]

```dotenv
# API
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/hcm_lite
JWT_SECRET=replace-with-long-random-secret
CORS_ORIGIN=http://localhost:5173

# Bootstrap: set these only if using environment Admin bootstrap
ADMIN_EMAIL=
ADMIN_PASSWORD=

# Hosted AI: key name AI_API_KEY is required by the brief
AI_API_KEY=
AI_MODEL=
AI_BASE_URL=

# Frontend (public, NEVER put secrets here)
VITE_API_URL=http://localhost:4000
```

**Only commit `.env.example`, never real credentials.** Frontend URL and API route hosting must function end-to-end using HTTPS in production. [BRIEF]

## 10. Tests and definition of technical completion

- **Unit:** date working-day count, grace boundary 09:15/09:16, half-day threshold, tax slab boundaries, salary math, joiner/leaver proration, KPI math.
- **Integration:** first-run once, employee creation/login, attendance `409`, leave `422`, correction approval, leave decisions, monthly run, Admin-only finalize, payslip ownership, immutable logs.
- **Authorization:** each endpoint tested against three roles and cross-employee ID tampering; repeat security tests for AI tools.
- **AI:** real tool results match KPI endpoints; colleague salary refusal; smart-leave structured result; 15s timeout fallback; invalid JSON retry once; throttle/log.
- **Web:** 375px layout, keyboard navigation, empty data, validation, loading/error; downloadable PDFs.
- **Deployment:** use a fresh production-like DB; complete the seven-step official demo; judge follows README without undocumented steps.

## 11. Technical open decisions

1. Final backend/frontend stack and deployment provider are team preferences, not PDF requirements.
2. Select exact bearer token/cookie strategy, token lifetime/revocation, session invalidation after account deactivation.
3. Define company time zone, DST treatment, midnight checkouts, and workday boundaries.
4. Establish `leave overlap` statuses and approved/pending cancellation policy.
5. Sign off on payroll tax monthly conversion and currency precision.
6. Set primary status precedence and analytics denominator, keeping brief wording traceable.
7. Confirm behavior of payroll drafts after retrospective approved corrections.
8. Confirm whether admins need company-wide HR records only or any special employee profile identity.

**Source map:** Brief pp. 1–6, especially pp. 2 (permissions/rules), 3 (AI/camera), 4 (architecture) and 5 (metrics/25 checks).

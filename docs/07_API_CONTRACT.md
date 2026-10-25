# HCM Lite — API Contract (Design Specification)

**Status:** DRAFT · Phase 0 planning; no APIs have been implemented.  
**Authority:** Saylani HCM Lite Challenge Brief, printed pp. 1–6.  
**Tags:** **[BRIEF]** explicit in PDF; **[PROPOSED]** API shape chosen for this project; **[OPEN]** unresolved decision.  
**Cross references:** `01_PRD.md`, `02_TRD.md`, `05_BACKEND_SCHEMA.md`, `08_RBAC_PERMISSION_MATRIX.md`, `09_BUSINESS_RULES_AND_CALCULATIONS.md`.

## 1. Contract principles

1. **[BRIEF]** All records originate from real use; no fake/seeded operational data. A first-run bootstrap creates a company and Admin.
2. **[BRIEF]** Verify JWT, actor role and row-level scope on the **server on every protected request**, including AI tools.
3. **[PROPOSED]** All URLs below use `/api/v1` except the PDF's explicit `POST /ai/chat`; use HTTPS in production, JSON with ISO-8601 date/time strings, and stable UUID IDs.
4. **[PROPOSED]** The API uses `Authorization: Bearer <JWT>`; only the login/bootstrap endpoints are anonymous. Never trust a `userId` or `employeeId` supplied for a self-service action.
5. **[PROPOSED]** Monetary quantities serialize as **decimal strings**, not binary floats; time zones are resolved by company settings; pagination is server-side.
6. **[PROPOSED]** Every mutation validates a typed request schema; writes and audit events are transactional where applicable.
7. **[BRIEF]** `409` is required for duplicate daily check-in; `422` for overlapping or over-balance leave.

## 2. Common request and response envelope [PROPOSED]

```json
{"data":{"id":"uuid","status":"PENDING"},"meta":{"requestId":"uuid"}}
```

```json
{"error":{"code":"LEAVE_OVERLAP","message":"Requested days overlap an existing leave request.","details":[{"field":"startDate","reason":"date overlap"}]},"meta":{"requestId":"uuid"}}
```

**Success:** `200` read/update, `201` create, `204` action with no payload. **Failures:** `400` bad syntax, `401` missing/invalid JWT, `403` forbidden role or action, `404` not found **or inaccessible** scoped record, `409` conflict/duplicate, `422` domain validation, `429` rate limit, `500` unexpected error; `503/504` AI failure/timeout as chosen by the API team. The exact generic envelope/codes (other than `409` and `422`) are design decisions.

| Query or HTTP concern | Rule [PROPOSED] |
|---|---|
| Pagination | `?page=1&pageSize=20`, max 100; return `meta.total` |
| Search/filter | Query params validated and applied **server-side** |
| Date boundaries | `YYYY-MM-DD` for workdays; RFC3339/ISO timestamps for events |
| Department scope | Admin/HR query according to role; employee cannot change scope to another person |
| Idempotency | Payroll create/finalize guarded by unique month and state; duplicate writes cannot create double pay |
| Bulk upload | CSV dry-run returns issues and writes **zero** employees |
| Audit | After successful create/update/approve/finalize, write actor, action, entity and redacted before/after |

## 3. Endpoint inventory [PROPOSED routes, BRIEF capabilities]

`Public` means only before authentication; `SELF` means a server-derived authenticated employee identity. `Admin read` / `HR read` do **not** mean unrestricted mutation.

| Capability | Method and route | Authorization | Important response / rule |
|---|---|---|---|
| First-run setup | `POST /api/v1/setup/first-run` | Public **only when not initialized** | Creates company + Admin once; second attempt refused |
| Setup status | `GET /api/v1/setup/status` | Public; expose boolean only | `needsSetup` without leaking account details |
| Login | `POST /api/v1/auth/login` | Public | JWT, minimal user role and password-change flag |
| Logout | `POST /api/v1/auth/logout` | Authenticated | Ends current session by chosen revocation policy [OPEN] |
| Change password | `POST /api/v1/auth/change-password` | Authenticated | bcrypt hash, clears forced-reset state |
| My identity | `GET /api/v1/auth/me` | Authenticated | Identity + permissions + self employee link if available |
| Company settings | `GET /api/v1/company/settings` | Admin, HR read | Current effective policy |
| Company settings | `PUT /api/v1/company/settings` | Admin | New settings version; old attendance unaffected |
| Departments | `GET /api/v1/departments` | Admin, HR | Catalog/list |
| Departments | `POST/PATCH /api/v1/departments[/:id]` | Admin | Create/update; archive instead of unsafe delete [PROPOSED] |
| Designations | `GET /api/v1/designations` | Admin, HR | Catalog/list |
| Designations | `POST/PATCH /api/v1/designations[/:id]` | Admin | Catalog write |
| Leave types | `GET /api/v1/leave-types` | Admin, HR; employee limited read for own form [PROPOSED] | Quota/rule metadata |
| Leave types | `POST/PATCH /api/v1/leave-types[/:id]` | Admin | Create/update quotas |
| Holidays | `GET /api/v1/holidays` | Admin, HR; employee filtered calendar read [PROPOSED] | Holiday dates |
| Holidays | `POST/PATCH /api/v1/holidays[/:id]` | Admin | Calendar setup |
| Create HR login | `POST /api/v1/users/hr` | Admin | HR account + temporary credentials per policy [OPEN for HR first-login] |
| Deactivate login | `PATCH /api/v1/users/:id/status` | Admin | Prevent subsequent authorized requests |
| Reset login | `POST /api/v1/users/:id/reset-password` | Admin | Reset and invalidate prior sessions [PROPOSED] |
| Register employee | `POST /api/v1/employees` | HR | Creates employee + login + salary in transaction |
| Employee directory | `GET /api/v1/employees` | Admin/HR all; Employee **own only** if supported | Search, filter, paging, no salary leakage |
| Employee 360 | `GET /api/v1/employees/:id` | Admin/HR all; Employee self | Scoped detail; sensitive fields filtered |
| Employee edit | `PATCH /api/v1/employees/:id` | HR; Employee restricted to own phone/address | Field whitelist by actor |
| CSV validation | `POST /api/v1/employees/import/dry-run` | HR | Row + field + reason, **no writes** |
| CSV commit | `POST /api/v1/employees/import` | HR | Actual validated import; transaction strategy [OPEN] |
| CSV export | `GET /api/v1/employees/export` | HR | CSV; exclude password hashes |
| Own check-in | `POST /api/v1/attendance/check-in` | Employee/HR with employee link | Server time; duplicate day → **409** |
| Own check-out | `POST /api/v1/attendance/check-out` | Employee/HR with employee link | Server time; one completion |
| Attendance calendar/board | `GET /api/v1/attendance` | Admin/HR all; Employee self | `from`, `to`, `departmentId`; derived absent state |
| Correction request | `POST /api/v1/attendance/corrections` | Employee self; HR own [OPEN] | Reason; never direct attendance edit |
| Corrections inbox | `GET /api/v1/attendance/corrections` | HR all; Admin read; Employee own | Pending/history |
| Correction decision | `POST /api/v1/attendance/corrections/:id/decision` | HR | Approve/reject; audit old/new record |
| Submit leave | `POST /api/v1/leave/requests` | Employee/HR self | Working days/quotas; overlap/excess → **422** |
| Own/history or approval list | `GET /api/v1/leave/requests` | Admin all view; HR all; Employee self | Status, date/type filters |
| Leave balance | `GET /api/v1/leave/balance` | Employee/HR self; Admin/HR permitted employee lookup [PROPOSED] | Quota minus approved usage |
| Cancel leave | `POST /api/v1/leave/requests/:id/cancel` | Request owner | Cancellation window [OPEN] |
| Decide leave | `POST /api/v1/leave/requests/:id/decision` | HR | Approve/reject with comment; notify owner |
| Salary structure | `GET /api/v1/employees/:id/salary` | Admin/HR | Employee salary data, never peer Employee |
| Salary structure | `PUT /api/v1/employees/:id/salary` | HR | Effective-dated structure; gross formula |
| Payroll draft | `POST /api/v1/payroll/runs` | HR | Build month from real work records; one run/month [PROPOSED] |
| Payroll run list/detail | `GET /api/v1/payroll/runs[/:id]` | Admin/HR | Month, employee items, breakdown |
| Recalculate draft | `POST /api/v1/payroll/runs/:id/recalculate` | HR, draft only [PROPOSED] | Recompute before finalization only |
| Finalize payroll | `POST /api/v1/payroll/runs/:id/finalize` | **Admin** | Locks run/items; audit/notifications |
| Download payslip | `GET /api/v1/payslips/:id/pdf` | Admin/HR; Employee own | PDF bytes; scope checked before generation |
| Admin KPIs | `GET /api/v1/analytics/admin` | Admin | Company, date/department filters |
| HR KPIs | `GET /api/v1/analytics/hr` | HR | Attendance, leave, late/absence trends |
| Personal KPIs | `GET /api/v1/analytics/me` | Employee self; HR self if linked [PROPOSED] | Own stats/payslip summary |
| AI chat | **`POST /ai/chat`** | All three roles | Hosted LLM; tool calls restricted to actor context |
| AI dashboard summary | `POST /api/v1/ai/dashboard-summary` | Admin, HR | 3–5 insights from filtered KPI JSON |
| AI smart leave | `POST /api/v1/ai/smart-leave` | Employee/HR self | Validated `{type,start,end,reason}`, **no submission** |
| Policy Q&A | via `POST /ai/chat` | All three roles | Answer only available configured policies |
| Announcements | `GET /api/v1/announcements` | All | Read company posts on dashboards |
| Post announcement | `POST /api/v1/announcements` | Admin, HR | Publish to company users |
| Notifications | `GET /api/v1/notifications` | Authenticated self | Decision and payslip notifications |
| Mark notification read | `PATCH /api/v1/notifications/:id` | Owner | State change scoped to recipient |
| Audit log | `GET /api/v1/audit-logs` | **Admin** | Immutable paginated history; no edit/delete route |

## 4. Request/response examples (illustrative [PROPOSED])

### Create employee (`POST /api/v1/employees`)

```json
{"employeeCode":"EMP-001","firstName":"Ayesha","lastName":"Khan","workEmail":"ayesha@example.test","departmentId":"uuid","designationId":"uuid","joinDate":"2026-10-24","basicSalary":"50000.00"}
```

Response provides `employeeId`, user provisioning state and **a one-time secure initial-password handoff**. Passwords must never be returned in list/read APIs or general logs. Exact first-password delivery channel is [OPEN]. Values shown here illustrate payload format **only** and must not be stored as seed/demo data.

### Leave decision (`POST /api/v1/leave/requests/:id/decision`)

```json
{"decision":"APPROVED","comment":"Coverage arranged."}
```

Response reflects actual persisted request, audited approver and decision. Duplicate/final-state decisions are rejected safely.

### Chat (`POST /ai/chat`, explicitly in PDF)

```json
{"message":"How many active employees are in Finance?"}
```

Response envelope [PROPOSED]: `{ "data": { "answer": "...", "aiGenerated": true, "toolNames": ["get_headcount"] } }`. A question requiring forbidden fields must not be answered or bypassed via tool inputs.

## 5. Endpoint security acceptance contract

- Unauthenticated request to protected API → denied.
- EMPLOYEE `/:id` referencing another employee → denied even if ID exists; never reveal peer salary.
- HR attempting company-settings mutation, Admin-user creation, payroll finalization, or audit read → denied.
- Admin attempting finalized payroll mutation or any audit update/delete → denied.
- No user can pass a fabricated `employeeId` to check in, leave apply, own balance, or AI tools.
- After user deactivation/forced password change, prior unauthorized operations fail.
- All read endpoints return genuinely empty results for a fresh install; the UI never inserts example figures.

## 6. Contract decisions before coding

- [ ] Choose auth token storage/rotation and how logout invalidates tokens.
- [ ] Specify precise date/time JSON, company timezone and ID serialization.
- [ ] Confirm CSV commit partial vs all-or-nothing and one-time password handoff.
- [ ] Decide payroll draft refresh behavior and month uniqueness.
- [ ] Choose whether HR without an employee profile may use self-service features (recommended: no).
- [ ] Resolve leave/payslip cross-year and cancellation policy.
- [ ] Freeze request/error DTO schemas only after `12_DECISION_LOG.md` critical items have owners.

**PDF mapping:** permissions printed p. 2; AI `/ai/chat` and tools p. 3; architecture p. 4; 25-functionality matrix p. 5.

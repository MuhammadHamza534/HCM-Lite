# HCM Lite — RBAC & Data-Scope Permission Matrix

**Status:** DRAFT · plan only.  
**Reference:** official Saylani HCM Lite brief, printed pp. 2 and 5.  
**Legend:** `M` manage/create/update; `A` approve/decide; `F` finalize; `R` read; `O` own-record only; `—` forbidden. **[BRIEF]**, **[PROPOSED]**, **[OPEN]** tags have the same meanings as in `02_TRD.md`.

## 1. Core invariant

**[BRIEF]** Show different navigation to each role **and** enforce access on the backend for every API, including LLM tool execution. Navigation is not an authorization boundary. An Employee has no access to someone else's salary, leave, attendance or full HR file. Admin has read visibility of all company data but is not allowed to edit locked payroll or audit entries.

## 2. Official 25-feature matrix

This table transcribes the official **who-can-do-what semantics**, then uses concise labels; see printed p. 5 for original wording.

| # | Feature | ADMIN | HR | EMPLOYEE |
|---|---|---|---|---|
| 01 | First-run company/Admin | M | — | — |
| 02 | Login/logout/password/dashboard | O | O | O |
| 03 | Company policy/settings | M | R | — |
| 04 | Departments/designations/leave types/holidays | M | R | — |
| 05 | Create HR logins; reset/deactivate any login | M | — | — |
| 06 | Register/edit employees | R | M | O: phone/address |
| 07 | Directory/search/Employee 360 | R: all | R: all | O |
| 08 | CSV dry-run/import/export | — | M | — |
| 09 | Web check-in/out | — | O | O |
| 10 | Calendar / daily attendance board | R: all | R: all | O |
| 11 | Attendance correction request/approval | R | A | O: request |
| 12 | Leave application/cancel/balance/history | — | O | O |
| 13 | Leave decision/comments | R | A | — |
| 14 | Salary structure | R | M | — |
| 15 | Create/review monthly payroll draft | R | M | — |
| 16 | Finalize payroll; month lock | F | — | — |
| 17 | PDF payslips | R: all | R: all | O |
| 18 | KPIs/trends/filters | R: company | R: HR | O: personal |
| 19 | AI chat based on real records | R: all permitted | R: HR data | O |
| 20 | AI dashboard summarizer | R: company | R: HR | — |
| 21 | Smart leave pre-fill | — | O | O |
| 22 | Policy Q&A | R | R | R |
| 23 | Announcements | M: post | M: post | R |
| 24 | In-app notifications | O | O | O |
| 25 | Audit log | R | — | — |

**Nuance:** Official #11 says HR *approves* corrections, while p. 2 explicitly says employees request them; HR own correction-request permission is not confirmed. Treat HR as correction **approver**, with own-submission dependent on an explicit decision. Official #12 allows HR own leave, so an HR account needs a linked employee record to invoke leave self-service.

## 3. Server-side policy definitions [PROPOSED]

| Policy | Enforcement rule |
|---|---|
| `isAuthenticated` | Verified JWT/session, active user, completed mandatory password change |
| `hasRole` | Role is exactly one of `ADMIN`, `HR`, `EMPLOYEE`; reject unknown role |
| `companyScope` | Always restrict by authenticated actor's company ID; ignore untrusted client company IDs |
| `employeeOwnsRecord` | Target row's `employee_id` must equal authenticated user's linked `employee.id` |
| `sensitiveFieldFilter` | Salary, pay, private contact and audit fields only for explicitly allowed readers |
| `selfWriteWhitelist` | Employee own `phone` and `address` only; no `role`, `salary`, `department`, `userId` |
| `canCreateEmployee` | HR only; creates role `EMPLOYEE` even if payload attempts override |
| `canDecideLeave` | HR only; HR decision must not target other-company records |
| `canFinalizePayroll` | ADMIN only; payroll must be in draft and owned by same company |
| `payrollLocked` | If finalized, refuse **all** payroll run/item changes regardless of role |
| `auditImmutable` | Only append audit events; Admin view only; no log update/delete APIs |
| `aiUsesActorScope` | Tool adapter uses session actor context and calls existing restricted domain service |

## 4. Field-level filtering

| Data group | Admin | HR | Employee |
|---|---|---|---|
| Employee directory | Whole company | Whole company | Own profile only |
| Personal phone/address | View | Read/edit | Edit own values only |
| Basic/gross salary and payslips | View all | View/manage salary, view slips | Own slips; not peer salary |
| Attendance timestamps | View all | View/approve corrections | Own view; request correction, no direct edit |
| Leave requests and reasons | View all | View/decide | Own only |
| HR pending approval list | View if needed | View/decide | None |
| AI employee search results | Role-filtered | Role-filtered | Only own / nonconfidential policy info |
| Audit before/after JSON | View redacted | None | None |
| Notification content | Own inbox | Own inbox | Own inbox |

## 5. Threat-based negative tests

1. Employee calls `/employees/<peerId>`; response contains no peer record.
2. Employee enumerates `/payslips/<peerSlipId>/pdf`; access denied.
3. Employee changes `employeeId` in own attendance or leave POST; server disregards/denies it.
4. Employee sends `{"role":"ADMIN","basicSalary":999999}` to own profile PATCH; server rejects forbidden fields.
5. HR calls `POST /payroll/runs/:id/finalize`; denied.
6. HR calls company settings PUT or Admin creation; denied.
7. HR calls audit-list endpoint; denied.
8. Admin tries PATCH on finalized payroll; denied; no audit erasure endpoint exists.
9. Two accounts from different companies (if multiple companies are ever supported) cannot share record visibility.
10. AI prompt asks to ignore rules or use `search_employees` to reveal salary; result redacted/refusal.
11. AI tool arguments request a different `employeeId`; server substitutes authenticated self or rejects.
12. Deactivated login's preexisting token no longer enables protected actions.
13. HR without a linked `employees` row cannot impersonate an employee for own check-in/leave.

## 6. Unresolved policy questions

- **[OPEN]** Whether HR can request an attendance correction for their **own** attendance, separate from being able to approve others'.
- **[OPEN]** How HR self-service identity is provisioned (register HR as employee or create linked employee row).
- **[OPEN]** Are Admins who also work as employees allowed a separate Employee account? The core PDF says Admin check-in/own leave is `—`.
- **[OPEN]** Should HR be prevented from approving their own leave/corrections? Recommended yes, but not explicit.
- **[OPEN]** Are employee public directory names permissible to other employees? Official matrix says Employee **Own**, so default no.

**Decision owner:** architecture/security lead. Record outcomes in `12_DECISION_LOG.md` and then update the TRD/PRD before implementation.

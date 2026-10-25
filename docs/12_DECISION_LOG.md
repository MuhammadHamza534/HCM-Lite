# HCM Lite — Architecture & Requirements Decision Log

**Status:** REVIEW REQUIRED before Phase 1 implementation.  
**Purpose:** Prevent AI coding tools and team members from silently inventing business rules that are missing/ambiguous in the official PDF.  
**Authority:** Official Saylani HCM Lite brief printed pp. 1–6 and planning docs `01`–`11`.

## 1. Decision protocol

- **[BRIEF]** = immutable official requirement unless judge/organizer says otherwise.
- **[PROPOSED]** = suggested engineering/product decision, **not** an official requirement.
- **[OPEN]** = needs explicit team approval before dependent work starts.
- Do **not** call a proposal “approved” merely because this file suggests one.
- For each decision record: ID, options, recommendation, tradeoff, owner, chosen outcome, approval date, and affected documents.
- When approved, update `01_PRD.md`, `02_TRD.md`, `05_BACKEND_SCHEMA.md`, `07_API_CONTRACT.md`, `09_BUSINESS_RULES_AND_CALCULATIONS.md` and tests where applicable. This file is the change record, not an override of the PDF.

## 2. Critical decisions — resolve before coding

| ID | Topic | Why it matters | Proposed decision (NOT YET APPROVED) | Owner | State |
|---|---|---|---|---|---|
| D01 | Runtime stack | One consistent implementation | React/Vite/TS + Express/TS + PostgreSQL/Prisma + Zod | Tech lead | OPEN |
| D02 | Authentication/session | Logout, deactivation, first-login security | Short-lived JWT + server-checked active/reset status; documented revocation approach | Security lead | OPEN |
| D03 | Company timezone | Day boundaries, holidays, next-Monday parse | Persist `company.timezone`, use local day + UTC event timestamp | Backend lead | OPEN |
| D04 | Attendance display precedence | Late + half-day + missing checkout may overlap | Store independent flags; define a primary status only for mutually exclusive display counts | Product+backend | OPEN |
| D05 | Attendance KPI denominator | PDF formula unclear for absent days/overlaps | Agree expected employee-working-day denominator, exclusions and labels; document deviation if needed | Product+QA | OPEN |
| D06 | Leave overlap/reservation | Two pending requests can race | Block overlap with PENDING/APPROVED; reserve quota for pending, release on reject/cancel | Product+backend | OPEN |
| D07 | Cross-year leave | Annual quotas and year boundaries | Split charged workdays by calendar year, checking both yearly balances | Product+backend | OPEN |
| D08 | Leave cancellation policy | Post-approval accounting/payslip changes | Permit cancellation of pending/eligible future approved leave; prevent closed-payroll retroactive changes | Product+backend | OPEN |
| D09 | Payroll proration order | Joining/leaving + absent/unpaid/half-days | Eligible service gross, then attendance deductions, then monthly tax; cap deductions at eligible gross | Finance/product | OPEN |
| D10 | Illustrative tax interpretation | Tax rounding and slab boundaries | Marginal annual slab; monthly provision = annual estimate/12; 2-decimal half-up | Finance/product | OPEN |
| D11 | Late penalty bonus | May conflict with core absence deductions | Leave disabled in core; implement 3 lates = 0.5 day only as explicit bonus toggle | Product | OPEN |
| D12 | HR self-service identity | Checklist allows HR own attendance/leave | HR personal check-in/leave only when HR user has linked employee record | Security+backend | OPEN |
| D13 | HR own approvals | Conflict of interest | Block self-approval for HR leave and attendance corrections | Product+security | OPEN |
| D14 | CSV transaction policy | Partial success vs clear reporting | Dry-run first; transactional commit per batch; fail entire batch on any invalid row | Backend | OPEN |
| D15 | Payroll draft stale-data policy | Data may change before Admin locks | HR may recalculate DRAFT; finalization rechecks current source/version | Backend | OPEN |
| D16 | Currency/amounts | Accurate money values | PKR, Decimal/NUMERIC with two-decimal output; formula precision retained until final rounding | Finance/backend | OPEN |
| D17 | Initial password handoff | Onboarding security | Create one-time temp credential securely; must rotate on first login; never store/plaintext-log | Security | OPEN |
| D18 | Historical settings versioning | Changed hours/quota must not rewrite history | Effective policy versions/snapshots for new events | Backend | OPEN |
| D19 | Department leave analytics | Dept changes over time | Use event-time dept snapshot for historical trend or current dept for current snapshot; define explicitly | Product+backend | OPEN |
| D20 | AI provider/limits | Need hosted tool calling and stable fallback | Choose accessible hosted model; enforce server 15s, ~20 calls/hour, `ai_logs` | AI/backend | OPEN |
| D21 | Payslip publication | View/download timing | Publish employee PDF only after Admin finalize | Finance/product | OPEN |
| D22 | Attrition average headcount | PDF denominator not defined | Use arithmetic mean of start/end headcount; declare it in dashboard tooltip | Product+analytics | OPEN |

**Important:** Recommendations above are deliberately **open**, not predetermined. Decide them with the team and test them against the PDF's exact wording.

## 3. Official requirements that are NOT decisions

These are already dictated by the PDF and must not be weakened:

- A **web** app is mandatory; mobile/camera is optional bonus.
- Three roles: Admin, HR, Employee; role **and data-scope** enforcement on backend and AI.
- No dummy operational data; initial company setup and real HR/employee activity generate records.
- Password hashes via bcrypt; authentication via JWT.
- Default 09:00 office start, 15-minute grace, under-5-hour half day, Sat–Sun weekend.
- One attendance row per employee per day; duplicate check-in **409**.
- Leave working days exclude weekend/holidays; annual 14, sick 8, casual 10, unpaid unlimited; overlap/excess **422**.
- Gross = 1.5× basic with HRA 40% and medical 10%; absence/unpaid/0.5 half day deductions; joiner/leaver proration; specified illustrative slabs.
- HR prepares monthly draft; **Admin finalizes and locks it permanently**.
- Admin/HR/Employee dashboards computed from server database aggregates.
- Required seven AI tool names, current-filter AI dashboard summaries, human-confirmed smart leave, policy-only answers, server-only AI key, 15s timeout, ~20/hr, AI logs and AI-generated labeling.
- Announcements, in-app notifications and immutable audit log (actor/action/entity/before/after).
- 25-functionality official checklist, 5-minute demo, hosted app, README under 10 minutes, repository + hosted link submission.

## 4. Discrepancies and interpretation watchlist

| Item | PDF text or potential tension | Action |
|---|---|---|
| HR own attendance/leave | Feature matrix grants HR self-service, but HR accounts are created by Admin independently of employee registration | Design explicit HR `employee_id` linking; do not fabricate one |
| HR correction request | Section 2 emphasizes Employee requests; feature 11 gives HR *Approve* | Require product decision; no implicit HR self-request privilege |
| Attendance rate | `working-day records − on_leave` does not define expected-day expansion or whether status flags are disjoint | Clarify before analytics implementation and unit tests |
| Tax rule | PDF abbreviates progressive annual brackets, not monthly tax mechanics | Document interpretation and rounding; never mislabel as current legal tax guidance |
| Quotas after change | Defaults + “settings applied to new records only” | Preserve historical snapshots; define current year effective quota semantics |
| Employee company policy read | Employee can ask policy Q&A but matrix restricts setup views | Expose policy facts through scoped policy service; do not expose admin settings mutation |
| CSV requirement | Employee section says optional import/export in some paragraphs, but functionality list includes feature 08 | Treat as a required checklist capability unless judges explicitly clarify otherwise |
| Mobile | Marketing cover shows camera check-in but section 5 makes it optional | Do **not** spend core-development time on camera before core features pass |

## 5. Decision record template

## Emergency sprint implementation decisions (25 October 2026)

The user explicitly authorized the emergency implementation sprint in `docs/21_CODEX_TWO_HOUR_SHIP_PROMPT.md`. The following narrowly scoped implementation choices are used until a product owner replaces them; they do not alter PDF-mandated behavior.

### DECISION D06/D08 — leave overlap and cancellation
- Status: Sprint implementation choice
- Chosen option: block overlap with both `PENDING` and `APPROVED` requests; only a `PENDING` request may be cancelled. Approved leave remains immutable in this submission build so it cannot silently alter approved balances or locked payroll.

### DECISION D09/D10/D16 — payroll calculation
- Status: Sprint implementation choice
- Chosen option: monthly gross is 1.5× basic; eligible-service gross is prorated by working days; absence/unpaid/half-day deductions are applied next and capped at eligible gross; tax is the stated marginal annual gross estimate divided by 12; currency is rounded half-up to two decimals at stored line-item boundaries.

### DECISION D12/D13 — HR self-service and approval conflict
- Status: Sprint implementation choice
- Chosen option: HR self-service requires a linked employee profile; an HR user cannot approve a leave request that they submitted.

Copy one block per **approved** decision:

```markdown
### DECISION DXX — <topic>
- Status: APPROVED
- Date approved: YYYY-MM-DD
- Owner/approver: <team role or initials>
- Source requirement(s): <PDF printed page, exact short rule>
- Chosen option: <concrete behavior>
- Alternatives rejected: <brief reasons>
- Edge cases / test cases: <test IDs>
- Files to update: <list 01–11 docs>
- Backward compatibility / migration impact: <if any>
```

## 6. Phase 0 sign-off checklist

- [ ] Assign an owner for D01–D22.
- [ ] **Approve D01–D10 and D12–D18** before implementing dependent modules.
- [ ] Freeze exact role and data scope in `08_RBAC_PERMISSION_MATRIX.md`.
- [ ] Approve request/response DTOs in `07_API_CONTRACT.md`.
- [ ] Verify attendance, leave and payroll examples in `09_BUSINESS_RULES_AND_CALCULATIONS.md`.
- [ ] Add/adjust acceptance cases in `10_TEST_PLAN_AND_ACCEPTANCE_CASES.md`.
- [ ] Confirm AI tools and guardrails in `11_AI_TOOLS_AND_GUARDRAILS.md`.
- [ ] Update the six original planning docs so there are no contradictory assumptions.
- [ ] Mark implementation Phase 0 gate **G0 PASSED** only after critical decisions are approved.

**Next development phase only after G0:** initialize repository and codebase skeleton described in `06_IMPLEMENTATION_PLAN.md` Phase 1. Do not begin product feature coding while critical behavior remains undecided.

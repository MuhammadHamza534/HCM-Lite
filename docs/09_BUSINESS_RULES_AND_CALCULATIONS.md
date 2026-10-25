# HCM Lite — Business Rules & Calculations Specification

**Status:** DRAFT / requires decisions before backend code.  
**Official basis:** Saylani HCM Lite brief, printed pp. 2 and 5.  
**Tags:** **[BRIEF]** explicit formula/rule, **[PROPOSED]** suggested implementation, **[OPEN]** unspecified or ambiguous.  
**Rule:** All derivations operate on **real records** and server-side policy versions, never hardcoded demo counts.

## 1. Company configuration [BRIEF]

| Variable | Initial/default value | Owner | Scope |
|---|---|---|---|
| `office_start` | `09:00` local time | Admin | New attendance records |
| `grace_minutes` | `15` | Admin | New attendance records |
| `half_day_if_worked_under` | `5 hours` (300 minutes) | Admin | Completed attendance records |
| `weekend` | Saturday and Sunday | Admin | Working-day calendar |
| `office_location` | Admin-selected latitude/longitude | Admin | Camera bonus only |
| `office_radius` | Example `150 m` | Admin | Camera bonus only |
| `annual_leave_quota` | `14` days/year | Admin | Leave calculation |
| `sick_leave_quota` | `8` days/year | Admin | Leave calculation |
| `casual_leave_quota` | `10` days/year | Admin | Leave calculation |
| `unpaid_leave_quota` | Unlimited | Admin | Leave calculation/payroll |

**[BRIEF]** Settings are stored and applied to **new records only**. **[PROPOSED]** Version settings, attaching the effective version/snapshot to each new event. Do not silently recalculate past attendance just because office hours changed.

## 2. Common calendar and temporal functions

**[PROPOSED]** Set a company timezone in the company settings; use it to convert server timestamps into local work dates and determine holidays/weekends. UTC timestamps remain the durable event record. This is needed because a server may run in a different timezone; PDF does not name a timezone.

Define:
- `is_working_day(d)` = not weekend under applicable policy **and** not configured holiday.
- `working_days_in_range(start, end)` = count of calendar dates from start to end, inclusive, where `is_working_day` is true.
- `employee_active_on(d)` = join date ≤ `d` and no exit before `d`; probation counts as active for headcount per PDF.
- `expected_days(employee, range)` = count of working days within employee's service period and range.

**[OPEN]** Weekends may change after request creation; freeze the effective policy for historical requests. Handling newly-added retrospective holidays must be decided.

## 3. Attendance [BRIEF]

### 3.1 Real-time check-in/out

1. Authenticate and resolve **self employee ID** from session.
2. Determine local attendance date from **server** clock.
3. Insert **at most one attendance row** per employee/day: database unique `(employee_id, work_date)`.
4. An attempted second check-in on same day produces HTTP **409 Conflict**.
5. Check-out timestamp is also provided by the server, not the client.
6. Employee cannot directly edit attendance; corrections go through HR decision.

### 3.2 Status calculations

| Status / flag | Calculation |
|---|---|
| Late | Check-in time **after** `office_start + grace_minutes`; at exactly 09:15, not late under defaults |
| Half-day | `check_out - check_in` worked time **strictly less than 300 minutes** |
| Missing checkout | There is check-in but **no** check-out |
| Absent | Eligible working day with **no attendance record and no approved leave** |
| Present | Valid attendance under chosen display classification [OPEN precedence] |
| On leave | Approved leave covers a chargeable working day |

A record may be **late and half-day** simultaneously; represent independent boolean facts so one flag does not erase the other. **[OPEN]** Choose a primary display status precedence for mutually exclusive KPI counts.

**[OPEN]** What is a zero-hour/missing-checkout deduction? What about overnight work? What if approved leave and a check-in share the same day? These require documented behavior, not silent assumptions.

## 4. Leave rules [BRIEF]

### 4.1 Calculating chargeable leave days

`chargeable_days = count(working days from startDate through endDate inclusive)`.

Example [ILLUSTRATIVE, NOT APP DATA]: an employee requests Friday through Tuesday, and there are no company holidays. Saturday/Sunday are skipped; Friday/Monday/Tuesday count as **3** chargeable days.

### 4.2 Balance and overlap

`leave_used(type, year) = sum(chargeable_days of approved requests of that type and year)`.

`leave_remaining(type, year) = configured_quota(type, year) - leave_used(type, year)`.

`unpaid_remaining = unlimited`; unpaid usage still impacts payroll.

On submission:
- Validate dates and type, and that the range contains chargeable days.
- Check overlap with relevant existing leave requests; overlap must return **422**.
- If requested days exceed available finite quota, return **422**.
- Do not subtract from final approved usage until HR actually approves; **[OPEN]** decide whether pending requests temporarily reserve quota.
- On HR approval/rejection store **comment** and generate in-app notification.
- The person requesting leave must be able to cancel, subject to a defined cancellation policy **[OPEN]**.

**[OPEN]** Which statuses count for overlap (PENDING, APPROVED, both)? How does a leave request crossing December/January consume two annual quotas? Are negative leave balances ever allowed? Define and test these before coding.

## 5. Payroll Lite [BRIEF]

### 5.1 Salary structure

Let `B` be monthly **basic salary**.

- `HRA = 0.40 * B`
- `medical = 0.10 * B`
- `gross = B + HRA + medical = 1.50 * B`
- `daily_rate = gross / working_days_in_month`

**Illustrative arithmetic, not dummy database data:** For `B = 50,000`, HRA = 20,000, medical = 5,000 and gross = **75,000**. If there are 22 working days, the daily rate is `75,000 / 22 = 3,409.0909...` before agreed currency rounding.

### 5.2 Deductions and proration

**[BRIEF]** Deduct full absent days, full unpaid leave days and **0.5 × half-days**. Prorate joiners and leavers.

A useful proposed implementation breakdown:

`eligible_gross = gross * eligible_service_workdays / total_month_workdays`

`attendance_deduction = daily_rate * (absent_days + unpaid_days + 0.5 * half_days)`

`gross_after_attendance = max(0, eligible_gross - attendance_deduction)` **[PROPOSED]**

`net_pay = gross_after_attendance - monthly_income_tax` **[PROPOSED]**

**Critical [OPEN]:** The PDF provides rules but does **not** specify exact sequencing of proration/deductions/tax, whether tax uses regular gross or prorated salary, or how to round each step. Approve one consistent formula in `12_DECISION_LOG.md`. Avoid double-counting a half-day that is also absent/unpaid or a date outside a joiner's service period.

### 5.3 Illustrative annual income tax slabs [BRIEF]

Let `A = monthly_gross * 12` in the slab example. The PDF states the following illustrative tax structure; it is **not a claim about current Pakistani income-tax law**.

| Annual taxable gross `A` | Annual tax `T(A)` |
|---|---|
| `0 ≤ A ≤ 600,000` | `0` |
| `600,000 < A ≤ 1,200,000` | `0.05 × (A − 600,000)` |
| `1,200,000 < A ≤ 2,400,000` | `30,000 + 0.15 × (A − 1,200,000)` |
| `2,400,000 < A ≤ 3,600,000` | `210,000 + 0.25 × (A − 2,400,000)` |
| `A > 3,600,000` | `510,000 + 0.35 × (A − 3,600,000)` |

The marginal-band interpretations and zero base in the first band are standard readings of the PDF's abbreviated table and must be confirmed as **[PROPOSED INTERPRETATION]**, not a fully specified fiscal law.

**[PROPOSED]** `monthly_income_tax = round_currency(T(A) / 12)`; record annualized gross, applicable slab, annual estimate, monthly tax and calculation method in each payroll item. **[OPEN]** Finalize tax assessment for joiners/leavers, rounding, and any tax exemptions.

### 5.4 Monthly run states

- HR creates/reviews a monthly **DRAFT** based on actual source records.
- Admin alone performs **FINALIZE**; ensure atomic transaction and a unique month guard.
- **[BRIEF]** Finalized runs become locked; **even Admin cannot edit** them.
- Payslip PDFs use the finalized employee-item snapshot; only the subject Employee (or authorized Admin/HR) can download.
- **[OPEN]** What to do if attendance is corrected after month lock? Recommended: never mutate closed payroll; use separate future adjustment only if explicitly added, not as a hidden mutation.

## 6. Dashboard metrics [BRIEF, printed p. 5]

| Metric | Formula from PDF | Note |
|---|---|---|
| Headcount | Active **plus probation** at the period end | `employees` status at selected end date |
| Attrition % | `exits during period / average headcount × 100` | Needs time series/snapshot method [OPEN] |
| Attendance rate | `(present + late + missing_checkout + 0.5 × half_day) / (working-day records − on_leave)` | **Ambiguous** denominator and status precedence [OPEN] |
| Late % | `late / (present + late)` | Apply normalized, non-double-counted categories [OPEN] |
| Absenteeism | `absent days / expected working days` per department | Must derive absences for missing records |
| Leave utilization | `approved leave days / quota` by type and department | Unpaid has unlimited quota: show count, not utilization % [PROPOSED] |
| Payroll cost | `sum gross` and `sum net` by month/dept | Distinguish draft/finalized in reporting [OPEN] |
| Average salary | Mean **gross** salary by department/designation | Filter only eligible salary records |

**[BRIEF]** Aggregate on the server and allow date-range/department filters; Employee analytics see only their own data. **[OPEN]** The exact attendance denominator expression and mutually exclusive statuses must be locked before coding so charts and AI share a deterministic function.

## 7. Rule-change and event consistency

- Every settings change should create an effective policy version **[PROPOSED]**.
- Event calculations refer to the policy version applicable when created; do not silently overwrite history.
- Payroll items snapshot source inputs, item totals and version/formula identifiers **[PROPOSED]**.
- AI tools call the **same server KPI calculation**, not a parallel client or LLM-written equation **[BRIEF]**.
- No operational counts, attendance or payroll values are invented during setup.

## 8. Acceptance boundary cases (must be automated)

- Check-in at `09:15:00` versus after `09:15:00` with default policy.
- Checkout after 299 min versus exactly 300 min.
- Duplicate check-in maps to 409 despite simultaneous browser requests.
- Date interval spanning weekends and a configured holiday.
- Annual quota exactly used versus exceeded by one day; overlapping requests → 422.
- Salary basic at 50,000 produces gross 75,000 before deductions.
- Tax annualized-gross boundary 600k, 1.2M, 2.4M, 3.6M.
- New joiner mid-month, exit mid-month and zero workdays months.
- Half-day/late overlap, approved leave+attendance overlap, missing checkout.
- Locked payroll rejects every create/update/delete attempt on items.
- Dashboards recalculate when a real employee registers, checks in, takes leave or gets paid.

**Before code:** resolve critical `[OPEN]` questions in `12_DECISION_LOG.md`.

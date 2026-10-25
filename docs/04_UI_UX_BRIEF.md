# HCM Lite — UI/UX Design Brief

**Status:** Design direction / implementation specification.  
**Source:** Saylani HCM Lite brief cover + pp. 1, 2, 5, 6.  
**Caution:** The PDF's cover includes a **concept illustration**, not a complete pixel-perfect design system. Colors, typography and navigation arrangements below are **[PROPOSED]**, unless explicitly required.

## 1. Design objective

Design a clean, fast-to-understand **HR operations web application** where:

- Admin can set up a company and control global information without confusion.
- HR can quickly onboard employees, resolve attendance/leave items, and run payroll.
- Employees can complete everyday actions (check-in/out, leave, payslip) in a few obvious steps.
- Dashboards emphasize **accurate live data**, not decorative/sample numbers.
- AI appears as a transparent helper rather than a magical decision-maker.

**Nonnegotiable source requirements [BRIEF]:** three different role dashboards, appropriate menus/data scope, responsive down to **375px**, charts and KPIs, loading/empty/error states, on-screen AI-generated labeling, editable/confirmed smart-leave forms.

## 2. Visual mood and proposed design tokens

The cover artwork uses a dark navy environment with turquoise/teal and warm amber highlights. Reflecting this concept is reasonable but **not compulsory**.

| Token | Example value [PROPOSED] | Use |
|---|---|---|
| Primary navy | `#1E2A47` | Sidebar/headings |
| Teal | `#0F9D8A` | Primary actions, present/approved state |
| Amber | `#F2A33A` | Pending notices, HR attention |
| Purple | `#6752D6` | AI assistant identity |
| Canvas | `#F7F9FC` | Page background |
| Surface | `#FFFFFF` | Cards/tables |
| Text | `#18223A` | High-contrast body text |
| Destructive | `#D54747` | Rejections/errors |

**Typography [PROPOSED]:** modern legible sans serif (system font or Inter fallback), body 14–16px, headers 20–30px, label minimum 12–13px. Support 200% zoom, logical focus order, mobile readable sizes. Do not make important status dependent on color alone.

## 3. Responsive shells [PROPOSED]

**Desktop (approximately ≥1024px):** fixed/collapsible role navigation at left; topbar with company/current page, user avatar and alerts; content width comfortably padded; dashboards use 3–4 KPI columns and 2-column chart grid.

**Tablet (roughly 768–1023px):** collapsible rail/sidebar; KPIs in two columns; cards stack where appropriate; filters in wrap row.

**Mobile (375–767px):** topbar + accessible navigation drawer/bottom primary nav; cards single column; wide data tables become horizontally scrollable with clear labels or stacked record cards; check-in, leave submit and pending approval actions remain highly visible. **375px baseline is required by the brief; breakpoints are proposed.**

```text
DESKTOP HR DASHBOARD (illustrative, not a screenshot)
+--------------+-------------------------------------------------------+
| HR navigation| Topbar   Date range  Department      Notifications     |
| Overview     +-------------------------------------------------------+
| Employees    | Headcount | Present | On Leave | Late | Pending       |
| Attendance   +-------------------------------------------------------+
| Leave        | Attendance trend           | Absence by department  |
| Payroll      +----------------------------+------------------------+
| Analytics    | Leave by type              | Top 5 late-comers      |
| AI Assistant +----------------------------+------------------------+
|              | Summarize with AI  [AI-generated response panel]   |
+--------------+-------------------------------------------------------+
```

## 4. Mandatory screen inventory

| Group | Screen(s) | Design priorities |
|---|---|---|
| Bootstrap & auth | First-run company wizard, login, change temporary password, account settings | Simple sequential forms, precise validation |
| Admin setup | Company profile/settings, departments, designations, leave types/quotas, holiday calendar, HR user management | Configuration is clearly Admin-only; show future-effective rules |
| Employees | Directory/search/filters, registration/edit, Employee 360, CSV import dry-run/error table/export | Obvious onboarding CTA and clean sensitive detail grouping |
| Attendance | Check-in/out, own calendar, HR daily board, correction request, correction inbox | Time clarity, status legend, no duplicate submits |
| Leave | My balances/history, request form, smart-leave input, HR approval inbox and decision modal | Chargeable working days preview, leave quotas, confirmation |
| Payroll | Salary structure editor, draft run wizard/list/detail, Admin finalize confirmation, payslip PDF view/download | Transparent formula breakdown and highly visible locked state |
| Dashboards | Admin, HR and Employee tailored cards/charts with filters | Exact live values and honest no-data states |
| AI | Chat drawer/page, dashboard summary, smart leave composer, policy Q&A | AI label, grounded answers, clear fallback |
| Comms & audit | Announcement feed/composer, notification center, Admin audit timeline | Timestamp, unread/pending state, immutable history |

### 4.1 Admin dashboard [BRIEF]

**KPIs:** headcount, attrition year-to-date, payroll cost and average salary.  
**Visuals:** headcount by department; payroll cost by department; gender and tenure breakdown; audit feed; AI summary.  
**Actions:** complete company setup, create HR account, open employee directory, review payroll for finalization, inspect audit trail.  
**Empty state example:** "No employees registered yet. Ask HR to register employees to populate these metrics." Do not render fictional headcount or spend.

### 4.2 HR dashboard [BRIEF]

**KPIs:** headcount; present today; on leave; late today; pending approvals.  
**Visuals:** attendance trend; absenteeism by department; leave by type; top five late-comers; AI summary.  
**Actions:** Add employee, review leave/corrections, create payroll draft, post announcement.  
**Empty state example:** "No attendance for this date. Attendance cards will update after actual check-ins." Do not hardcode trend data.

### 4.3 Employee dashboard [BRIEF]

**Widgets:** prominent check-in/check-out; hours this week versus 40h; number of late arrivals; leave remaining; last payslip; company announcements; "Ask my assistant".  
**Privacy:** no coworker payroll, no company-wide directory leak or other employee attendance details.  
**Empty state:** "Your first payslip will appear after payroll is finalized."

## 5. Key high-fidelity component behavior

### Login and first-use password change

- Clearly distinguish new-company setup from routine logins.
- Validate email/password; avoid displaying technical backend messages.
- When temporary-password flag is set, route directly to password change and block privileged app access until complete.
- Offer show/hide password and explicit caps-lock feedback if possible. [PROPOSED]

### Employee form

- Group information into **Personal**, **Job**, **Compensation** sections.
- Dropdowns for department/designation populated from actual Admin configuration.
- Mark compulsory fields; use ISO date entry; enforce positive salary server-side.
- Admin should **not** see edit actions; HR sees edits; employee self-service allows only contact fields.

### Attendance card

```text
TODAY · Monday, 26 October
Status: Not checked in
[ CHECK IN ]
After successful check-in:
Checked in 09:07 · [ CHECK OUT ]
After checkout:
09:07 → 17:04 · 7h 57m · Present
```

This is an **interaction example**, not seed data. Actual time/status must come from the server.

- Button shows submission progress and becomes non-repeatable.
- Late/half-day/missing-checkout statuses use text + icon, never color only.
- A second check-in reports `Already checked in today` on HTTP 409.
- Provide "Request correction" with date, desired fix and reason.

### Leave request and smart leave

- Display leave type, start/end dates, holiday/weekend exclusion, **chargeable working days**, remaining quota and reason.
- Inline warnings for overlap or over-balance from HTTP 422.
- Smart-leave box may read: "Describe when and why you need time off".
- AI suggestion must populate **editable fields**; display notice "Review before submitting"; user explicitly confirms.
- Never show "Approved" until HR has actually approved.

### HR approval inbox

- Tabs: Leave | Attendance Corrections; count badges from DB only.
- Show requester, submitted date, dates/duration, balance or requested correction, current status.
- Approval and rejection require comment where the brief specifies a comment.
- Successful decision updates request state and notification; UI refreshes counts.

### Payroll draft and finalize screen

- Show period, employee list, basic, housing, medical, gross, absent/unpaid/half-day deduction, tax and net amounts.
- HR may generate/review **draft** only.
- Admin has a strong confirmation dialog: "Finalizing permanently locks this month. This cannot be edited." A finalized run has visible `Locked` status.
- Employee download button only on authorized own payslip.

### AI assistant

- Accessible chat panel with prompt input, answer, clear **AI-generated** label, optional underlying tool-data date range. [Tool provenance display PROPOSED]
- On forbidden question, display a courteous refusal **without** salary or other private metadata.
- During provider failures, use a clear message and allow the user to continue regular workflow.
- Policy Q&A explicitly states when the answer is not among configured rules.

## 6. Common components and states

**Proposed reusable components:** AppShell, Sidebar, Header, RoleGuard (UI-only convenience), KPIcard, FilterBar, DataTable, StatusBadge, ApprovalActionDialog, DateRangePicker, EmployeeSearch, EmptyState, ErrorState, LoadingSkeleton, FormField, Toast, NotificationBell, AIChatPanel, AIInsightCard, ConfirmationDialog, PayslipDownload.

| Condition | Recommended user-facing message [PROPOSED] |
|---|---|
| Zero employees | "No employees yet. Employees will appear after HR registers them." |
| No leave | "No leave requests in the selected period." |
| No payroll | "No payroll run has been prepared for this month." |
| Unset department | "Create a department before registering an employee." |
| No access | "You do not have permission to view this information." |
| Check-in conflict | "Today's check-in is already recorded." |
| Overlapping leave | "These dates overlap an existing leave request." |
| Insufficient balance | "You do not have enough leave days for this request." |
| AI timeout | "The AI assistant is unavailable right now. You can still use the normal form." |
| Locked month | "This payroll month is finalized and cannot be edited." |

## 7. Accessible interactions [PROPOSED]

- Tab/keyboard navigate all buttons, dialogs and dropdowns; close modal with Escape; return focus to trigger.
- Input labels are persistent, error messages associated to fields.
- Screen-reader announcements for status changes (approved, rejected, check-in complete).
- Color contrast suitable for body text/icons and focus ring clearly visible.
- Touch targets comfortable on 375px screens; avoid tiny action icons as the only control.
- Confirm irreversible actions, e.g. Admin finalization.
- Date and currency rendered consistently in company-local format and with an explicit time zone when relevant.

## 8. Bonus UI — camera attendance [BRIEF, OPTIONAL]

- Front-camera permission request with live preview.
- Guidance overlay for exactly **one face**; show face-detected state and GPS accuracy.
- Inform employee that office geofence will be checked by the server.
- Clearly reject no face, multiple faces, location outside radius and GPS accuracy >100m.
- Show privacy note: store detection result, not full photo by default.
- Offer HR attendance correction route on failure.
- Do **not** imply basic face detection verifies identity; descriptor matching/liveness is separate bonus.

## 9. UX prototype review checklist

- [ ] Does first-run setup stand alone with zero users/records?
- [ ] Are Admin, HR and Employee navigation and home screens visually different?
- [ ] Is sensitive salary data invisible to unauthorized employees?
- [ ] Can check-in, leave, approval and payslip tasks be done without reading documentation?
- [ ] Does every empty metric/chart say exactly why it is empty?
- [ ] Are filters clear and do changing filters update KPI **and** AI summaries?
- [ ] Is smart-leave output editable and never silently submitted?
- [ ] Do error states preserve user-entered form content?
- [ ] Is payroll finalization visually distinct and explicitly irreversible?
- [ ] Is the design fully functional at 375px without clipped data/actions?
- [ ] Are all AI responses visibly identified as AI-generated?
- [ ] Can the entire official five-minute judge walkthrough be shown fluidly?

**Source trace:** PDF cover design concept; brief p. 1 role dashboards; p. 2 role permissions; p. 3 assistant/camera; p. 5 dashboard layout and 25 functionality inventory; p. 6 UI/UX grading criteria.

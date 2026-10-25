# HCM Lite — Emergency Hackathon Demo & Acceptance Checklist

Use this after the Codex sprint. **Only check items you have personally verified**. All records in the judge demo must be entered through the application, never inserted as database seed data.

## Setup and identities

- [ ] Fresh database opens **First-run Setup**, not an already-populated dashboard.
- [ ] Admin creates company, office settings, department and leave types.
- [ ] Admin creates an HR login; an HR login cannot create another Admin.
- [ ] HR registers at least two employees and a login is created for each.
- [ ] Employee is prompted to replace temporary password on first login.
- [ ] Admin/HR/Employee have distinct dashboard menus and server-enforced scopes.

## Daily employee workflows

- [ ] Employee web check-in saved with **server** time; duplicate check-in returns 409.
- [ ] Employee web checkout works; attendance board shows actual data.
- [ ] Employee submits leave, sees working-day count and balance.
- [ ] HR approves leave and an actual status/balance/dashboard change is visible.
- [ ] Employee asking for another employee’s salary gets a 403/refusal.

## Payroll, analytics and AI

- [ ] HR drafts monthly payroll using real employee salaries and attendance.
- [ ] Admin finalizes run; edits on finalized payroll fail.
- [ ] Employee opens/downloads own PDF payslip.
- [ ] HR dashboard KPI values match created database records.
- [ ] AI tool answer agrees with server dashboard; no-key mode doesn't invent results.
- [ ] Smart leave creates a **draft form** and requires confirmation to submit.
- [ ] Admin can view an audit log entry from a real change.

## Release verification

- [ ] `/api/health` responds with success.
- [ ] `/api/ready` responds with database available.
- [ ] All app routes work in a browser on laptop + 375px view.
- [ ] `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` pass.
- [ ] `.env` is ignored; `AI_API_KEY` and DB secrets are never sent to browser.
- [ ] README explains stack, setup, migrations, first Admin and AI key.
- [ ] Public Git repo and **verified** hosted frontend/API URLs are recorded for LMS submission.

## 5-minute spoken demo script

- **0:00–0:45 — New company:** first-run Admin account and company setup, configured department/office rules.
- **0:45–1:30 — Real employees:** Admin creates HR, HR registers employees, forced password change.
- **1:30–2:20 — Daily work:** check in/out, leave application, HR approval.
- **2:20–3:15 — Calculations:** dashboard changes with real records; payroll draft and Admin finalize.
- **3:15–4:15 — AI:** grounded leave and headcount question, smart leave draft, employee salary privacy refusal.
- **4:15–5:00 — Trust:** PDF payslip, audit log, mobile responsiveness, README and live deployed URL.

## Judge scoring priorities (official brief)

| Category | Points |
|---|---:|
| Core HR flows | 25 |
| Data and analytics | 20 |
| AI features | 15 |
| Code quality | 15 |
| UI/UX | 10 |
| Security/RBAC | 10 |
| Demo and docs | 5 |
| **Mandatory total** | **100** |
| Optional bonus features | +10 |

**Ship a verified complete demo before building bonus features.**

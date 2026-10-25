# HCM Lite — Prompt 23: Neon Recovery, Safe Migration, Live Workflow

**Project:** `D:\HCM Lite`  
**Tool:** ChatGPT Codex desktop app  
**Urgency:** Release-blocker recovery; no new features until migration and core flows are proved.  
**Sources of truth:** `AGENTS.md`, approved `docs/01`–`docs/22`, actual code and `BUILD_STATUS.md`.

## Paste this entire instruction into the existing HCM Lite Codex conversation

You are the lead release engineer for the existing Saylani HCM Lite project at `D:\HCM Lite`.

**Current situation**
- Foundational G1 checks previously passed, including a real Neon PostgreSQL connection.
- The emergency implementation added authentication, first-run setup, HR accounts, employee registration, attendance, leave, payroll, dashboards, announcements, audit, and AI endpoints.
- The new additive migration `20261025000200_operational_modules` has **not** been applied because the Codex execution environment could not reach Neon.
- Static checks passed, but there is **no evidence yet** that the new features work against the actual database or in the browser.
- Hosted LLM tool calling is **not configured**; do not report AI as complete based on a fallback endpoint.

**Task:** Unblock the database release safely, then run one end-to-end real-user journey. Do not implement extra features, styling, optional camera, or new documentation while the migration is blocked.

### Gate A — Determine whether connectivity is a Codex sandbox issue or a local computer/network issue

1. Read `AGENTS.md`, root `.env.example`, relevant Prisma schema and script definitions, and the current migration and build status. Do **not** display `.env`, a password, any connection URI, or other credentials.
2. Check whether `DATABASE_URL` is actually loaded by the **local** Node/Prisma process, without printing its value. Verify safe metadata only (present/missing, pooled/direct host classification, Prisma version). Do not echo or log the database hostname if it could expose infrastructure details.
3. Explain exactly which tests run in a restricted Codex environment and which can run in a user-owned Windows PowerShell/VS Code terminal. Failure inside the restricted environment does not prove Neon itself is down.
4. Ask for the user to run the **existing** safe connectivity test from a local Windows terminal, if your environment cannot connect:

   ```powershell
   Set-Location 'D:\HCM Lite'
   npm run db:smoke -w @hcm-lite/api
   ```

5. If that fails, obtain only a **sanitized error type** (P1001, P1000, DNS, TLS, ETIMEDOUT, ECONNREFUSED, etc.). Do not request pasted secrets or full debug logs containing URLs.
6. In parallel, instruct the user to open the existing Neon project in their browser and run `SELECT 1;` in its SQL Editor. This tests the Neon database independently of the local connection.
7. Follow this diagnostic tree:
   - SQL Editor works, local CLI works: connectivity is restored; move to Gate B.
   - SQL Editor works, Codex sandbox fails, local CLI works: use the local PowerShell terminal to run migrations; do not change database credentials.
   - SQL Editor works, local CLI fails: verify SSL, correct role/database/branch, pooled vs **direct** connection for migrations, port 5432 and firewall/VPN, and connect timeout.
   - P1001 after Neon idle: test a reasonable `connect_timeout=15` or `20` setting while preserving the existing parameters and secure configuration, and retry a limited number of times. Consult current installed Prisma/Neon docs; do not silently upgrade major versions.
   - P1000 authentication error: ask user to review or rotate the Neon connection credential **locally**; do not request the password.
   - SQL Editor fails: consult Neon project health/status; do not modify schema blindly.

### Gate B — Review and apply the additive migration without losing data

1. Confirm the active branch, database, and `schema` are the intended **development/demo** database. Check the current migration history before applying anything.
2. Read `apps/api/prisma/migrations/20261025000200_operational_modules/migration.sql` and `apps/api/prisma/schema.prisma` fully.
3. Stop and obtain approval if it contains `DROP`, `TRUNCATE`, destructive ALTER, removal of columns, forced reset, or unrelated changes. Never run `prisma migrate reset`, `prisma db push --force-reset`, or wipe the database.
4. Identify the installed Prisma version and the project's environment-loading wrapper. Ensure Prisma migrations use a direct Neon connection instead of a pooled PgBouncer connection, according to the configuration and version. Use the project-approved scripts rather than guessing CLI commands.
5. Apply only **pending** reviewed migrations. When supported, prefer a deployment-safe command that does not prompt for resets. Never mark a failed migration applied without resolving its actual status.
6. Regenerate Prisma client if needed and verify new tables/relations exist. Re-run the foundation test **without assuming the database is still empty after live user actions**.
7. Report actual migration names, applied/pending state, and results without any secrets.

### Gate C — Live end-to-end test with data entered through the application

1. Run backend and frontend on the local computer and check `/api/health` and `/api/ready` (HTTP 200).
2. Use the web UI to execute the judge's user journey, with **human-created** records only:
   - First-run company + Admin account, office rules, department and leave types.
   - Admin creates HR account.
   - HR registers two employees and assigns salary structures; new employee signs in and changes temporary password.
   - Employee checks in/out; duplicates must return 409.
   - Employee applies for leave; HR approves; balance and dashboard update from DB.
   - HR creates monthly payroll draft; Admin finalizes and locks it; employee downloads their own PDF payslip.
   - Employee attempts to read a colleague's salary and is denied. Verify backend enforcement, not just hidden UI.
   - Admin reviews an audit record.
   - AI endpoint: confirm fallback/refusal is secure; mark hosted LLM tool calling as **NOT COMPLETE** unless actually configured and tested.
3. Test empty/loading/error UI, desktop and 375px view, and client console. Check network failures are handled clearly.
4. When appropriate, run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`; describe any failures precisely.
5. Do not silently create fake database records, fixture data, or bypass first-run UI for demo records.

### Gate D — Release handoff

1. Update `BUILD_STATUS.md` with clearly distinguished: implemented, database verified, browser verified, tested, and incomplete.
2. If core flows pass, prioritize a hosted preview, secret-safe hosting configuration, working repository, README and five-minute demo. The Saylani submission requires a working hosted URL and Git repository link.
3. Give the user a **short** report: blocker/cause, safe commands run, migration status, critical user-flow PASS/FAIL, any manual action required, and what to do next.
4. Never claim the complete app or AI has passed merely because lint/build passes.
5. Keep the scope fixed. If you cannot access the user's local browser or local shell, provide the shortest necessary manual command and request **sanitized output only**.

**Start with Gate A now. Continue automatically through B/C/D when genuinely possible, but stop for external access or destructive approval when necessary.**

## If Codex cannot reach Neon, run these in VS Code Terminal (on your Windows PC)

```powershell
Set-Location 'D:\HCM Lite'
npm run db:smoke -w @hcm-lite/api
```

If this passes, tell Codex the local Windows connection passed. After Codex confirms the SQL migration is additive and safe, apply its existing migration script locally:

```powershell
npm run db:migrate -w @hcm-lite/api
npm run db:smoke -w @hcm-lite/api
npm run dev
```

Leave the terminal running; test the app URL shown by Vite. **Never paste `.env` or Neon URLs into chat.**

## Release gate checklist

- [ ] Neon SQL Editor `SELECT 1` works.
- [ ] Windows-local Prisma can reach Neon.
- [ ] Pending operational migration reviewed and applied.
- [ ] `/api/health` and `/api/ready` return HTTP 200.
- [ ] Admin setup, HR registration and employee login work through UI.
- [ ] Attendance/leave/payroll/payslip work against actual DB.
- [ ] Admin/HR/Employee role restrictions verified.
- [ ] Live dashboard numbers come from created records.
- [ ] AI capabilities honestly labeled as working or not configured.
- [ ] Hosted URL, repository URL, README and demo route prepared.

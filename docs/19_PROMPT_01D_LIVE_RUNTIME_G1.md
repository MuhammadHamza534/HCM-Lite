# HCM Lite — Prompt 01D: Live Runtime & Responsive Verification (G1)

**Project root:** `D:\HCM Lite`  
**Status entering this task:** Neon/Prisma verified; six foundation tables present and empty; lint, typecheck, tests (API 5/5; web 2/2), and build have passed. **G1 remains BLOCKED only for live local API/browser and 375px verification.**

## Scope

You are the ChatGPT Codex coding agent. Read `AGENTS.md`, `docs/15_G1_ACCEPTANCE.md`, `docs/18_PROMPT_01C_POSTGRES_AND_G1_FINAL.md`, and the current `BUILD_STATUS.md`. Perform **only** the missing G1 runtime and responsive checks. Do not implement first-run setup, auth flows, employee features, fake data, or Phase 2.

## Safety

- Use the existing Git-ignored root `.env`; never print or paste `DATABASE_URL`, `JWT_SECRET`, or other credentials.
- Do not run seed scripts, reset, truncate, drop, or destructive migration commands.
- Do not change approved requirements or mark a check PASS without evidence.
- Do not assume a browser can reach processes started in a sandboxed Codex environment. When necessary, give the user precise Windows-local steps and accept the user's observed responses/screenshots as *user-observed* evidence (do not claim you personally verified them).

## Task A — Start the app locally

1. Inspect the root `package.json` scripts and actual API/frontend ports; do not assume a command exists without checking.
2. In a **Windows-local PowerShell or VS Code integrated terminal** (not an isolated remote runtime), run:

   ```powershell
   Set-Location 'D:\HCM Lite'
   npm run dev
   ```

3. Keep the terminal running. Report frontend and backend startup messages and actual local URLs without revealing secrets.
4. If `npm run dev` doesn't start both services, inspect scripts and start each workspace using the declared dev scripts in separate local terminals. Fix minimal runtime-only defects if needed.

## Task B — Test HTTP endpoints from the same Windows machine

In another PowerShell terminal, while the dev servers remain running:

```powershell
Invoke-WebRequest 'http://localhost:4000/api/health' -UseBasicParsing | Select-Object StatusCode,Content
Invoke-WebRequest 'http://localhost:4000/api/ready' -UseBasicParsing | Select-Object StatusCode,Content
```

Check the actual API port from scripts/terminal first if not 4000. Expected: health returns HTTP 200 (process running); ready returns HTTP 200 only if PostgreSQL can be reached. A 503 ready response is a failure requiring investigation. If browser says `ERR_CONNECTION_REFUSED`, check whether the API process is still running, port binding, runtime errors, and port conflicts, rather than assuming the database is the issue.

## Task C — Verify frontend with the real browser

1. Open the Vite URL shown in the local terminal (often `http://localhost:5173`, but use the actual logged URL).
2. Confirm the page renders, makes its real API status request, and displays a truthful connectivity state. Observe browser console and network errors.
3. Chrome/Edge DevTools: `F12` → toggle device toolbar with `Ctrl+Shift+M` → set responsive viewport width to **375px**. Confirm content is readable, no unwanted horizontal overflow, controls remain usable, and status is not falsely reported.
4. Also check a desktop viewport and document results.
5. A screenshot is useful as user-supplied evidence, but do not pretend a screenshot was taken by Codex when it was not.

## Task D — Final verification and status

- Re-run checks after any runtime fix: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
- Confirm the read-only DB verification still reports six empty foundation tables and zero companies/users/employees (do **not** create records).
- Update `BUILD_STATUS.md` with **which checks were performed, by whom, commands, expected vs actual HTTP codes, actual browser viewport, unresolved issues, and the G1 verdict**.
- Set G1 to PASS **only if** the acceptance criteria in `docs/15_G1_ACCEPTANCE.md` are demonstrably met. Otherwise keep BLOCKED and list a concise remaining action.
- Stop. **Do not start Phase 2.**

## Required final report format

| Check | Actual evidence | Result |
|---|---|---|
| API startup | Process/log/port | PASS/BLOCKED |
| `GET /api/health` | HTTP code and safe response | PASS/BLOCKED |
| `GET /api/ready` | HTTP code and safe response | PASS/BLOCKED |
| Frontend desktop | Real URL and observed behavior | PASS/BLOCKED |
| Frontend 375px | Viewport and overflow/interaction result | PASS/BLOCKED |
| Static checks/tests/build | Commands and counts | PASS/BLOCKED |
| Empty DB | Read-only count output | PASS/BLOCKED |

**G1 verdict:** PASS or BLOCKED, based on proof. No Phase 2 changes.

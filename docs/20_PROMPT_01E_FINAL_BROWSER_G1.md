# HCM Lite — Prompt 01E: Final Browser G1 Verification

**Project root:** `D:\HCM Lite`  
**Current gate:** G1 — Foundation  
**Scope:** Browser/runtime diagnostics only. Do **not** implement Phase 2 or business features.

## Confirmed evidence

- `http://localhost:4000/api/health` responds with `data.status = "ok"`.
- `http://localhost:4000/api/ready` responds with `data.status = "ready"` and `data.database = "available"`.
- The desktop UI loads at `http://localhost:5173` and displays the successful API/database state.
- A Chrome device emulation screenshot was captured at 375px: the visible top section looks readable, but the full page and horizontal overflow are not yet verified.
- In that screenshot, DevTools displays 1 error and 1 warning. Their messages and origin have not yet been inspected.
- Neon database migration, zero-record smoke checks, lint, typecheck, tests, and build passed in the reported previous session.

## Instructions for Codex

You are working in `D:\HCM Lite` and must follow root `AGENTS.md`, `docs/15_G1_ACCEPTANCE.md`, and `docs/19_PROMPT_01D_LIVE_RUNTIME_G1.md`.

**Task:** Finish G1 with truthful, observable browser evidence.

1. Inspect the actual local project and available browser tooling without changing features.
2. Confirm `npm run dev` runs on the Windows host. If Codex cannot access that host browser, provide exact manual browser steps and request the observed results rather than guessing.
3. Open the frontend at `http://localhost:5173/`, open DevTools **Console**, clear messages, then hard-refresh. Examine every red error and relevant yellow warning. Record exact messages and file/URL origins in a sanitized report (without secrets). Determine whether errors originate from the application, a dev-only tool, a browser extension, or an unrelated page.
4. If an error is caused by our application, apply the smallest safe fix and rerun the necessary checks. If it is extension-only or unrelated, document why and do not modify the app to conceal it. Do not label the console clean before inspecting messages.
5. Test Chrome responsive mode at a **375 CSS pixel** viewport width; scroll from top to bottom. Confirm all labels/status are readable, that no controls are clipped, and that there is no horizontal page overflow. Run this in the Console on the application page:

   ```js
   ({ viewport: window.innerWidth, documentWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth, noHorizontalOverflow: document.documentElement.scrollWidth <= window.innerWidth })
   ```

   The expected result is `viewport: 375` (or browser toolbar's 375px CSS width) and `noHorizontalOverflow: true`.
6. Also verify API health and readiness through the running local server (do not infer from prior screenshots alone if runtime has changed).
7. If any source changes are required, rerun lint, typecheck, tests and build; otherwise cite previous passing checks and record that no source change occurred.
8. Update `BUILD_STATUS.md` with concrete evidence, what was checked by Codex versus the user, and an accurate final `G1: PASS` or `G1: BLOCKED` verdict based on `docs/15_G1_ACCEPTANCE.md`.
9. If and only if all acceptance requirements are met, mark G1 PASS. Stop after reporting status. Do **not** begin Phase 2, add dummy data, reset Neon, expose credentials, or modify approved specifications.

## Manual browser checks (if Codex cannot inspect local browser)

- Keep `npm run dev` running.
- Open `http://localhost:5173/` in Chrome.
- Press `F12` → `Console`, click clear (⦸), refresh using `Ctrl+R`. Inspect new red errors and yellow warnings; capture messages without exposing secrets.
- Press `Ctrl+Shift+M`, set responsive width to `375`, then go to `Console` and paste the width/overflow expression above. Inspect the full page by scrolling.
- Report **console messages**, **`noHorizontalOverflow`**, and whether all UI is readable.

## Final report format

| Check | Evidence | PASS/BLOCKED |
|---|---|---|
| API health | HTTP and response status | |
| DB readiness | HTTP and response status | |
| Desktop frontend | loaded screenshot / observation | |
| 375px layout | full-page readable, no clipping | |
| Horizontal overflow | JS measurement | |
| Console | inspected messages and origin | |
| Static checks | actual command results, if rerun | |
| G1 final verdict | exact criteria met or remaining blockers | |

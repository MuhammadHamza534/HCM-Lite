# HCM Lite — Approved Roadmap / How to Run the AI Coding Workflow

**Project root:** `D:\HCM Lite`  
**Current milestone:** Start Phase 1 — G1 foundation.  
**Scope authority:** Original Saylani HCM Lite PDF; official checklist F01–F25. The chosen stack and work sequence come from accepted planning recommendations, not from a mandatory technology rule in the PDF.

## 1. Minimal local prerequisites

- Windows desktop with VS Code/Cursor or another coding agent capable of reading and editing local workspace files.
- Git, current supported Node.js LTS and npm.
- PostgreSQL available locally or through a project database service; Docker Desktop is optional.
- Do not require an AI provider key yet: Phase 1 does not call an LLM.
- Do not paste `.env` contents, JWT secrets, database passwords or AI provider keys into chat.

## 2. Prepare the workspace

1. Open `D:\HCM Lite` in the coding editor.
2. Ensure these docs are in the `docs` directory, not scattered in project root.
3. Extract the Phase 3 handoff archive; add docs `13`–`16` alongside `01`–`12`.
4. In PowerShell, check documents:

```powershell
Set-Location 'D:\HCM Lite'
Get-ChildItem .\docs\*.md | Sort-Object Name | Select-Object Name
```

5. Turn on **Agent mode** with project-file access. Send the instructions in `13_AGENT_INSTRUCTIONS.md`, then the phase prompt in `14_PROMPT_01_FOUNDATION.md`.

## 3. Phase-by-phase route

| Phase | Coding agent scope | Exit proof |
|---|---|---|
| 1 | Workspace, TS monorepo, API/web skeleton, PostgreSQL/Prisma, CI-style scripts | G1: build/tests + real DB/API reachability + empty database |
| 2 | M1/M2: first-run Admin, bcrypt/JWT login, HR accounts, settings/catalogs | G2: initial company/Admin once; role separation |
| 3 | M3: employee registration, temporary password, directory, CSV | G3: real employee accounts; authorized searches/import |
| 4 | M4: check-in/out, statuses, corrections | G4: true clock-in/out, 409, permission tests |
| 5 | M5: leave balances/approval | G5: request → approval → real balance, 422 |
| 6 | M6: salary/payroll/PDF | G6: correct deductions; Admin-only immutable finalization |
| 7 | M7: real dashboards and filters | G7: KPI values reproduce source data |
| 8 | M8: hosted AI tools, summaries, smart leave | G8: tool-grounded results; employee salary refusal |
| 9 | M9: announcements, notifications, audit feed | G9: required F01–F25 completed and permissions tested |
| 10 | End-to-end QA, live hosting, README, five-minute demo | G10: clean-install judge demo verified |
| 11 | Optional bonuses ONLY after G10 | Separate bonus verification |

## 4. Decision discipline

Your acceptance of the planning package authorizes this roadmap and the recommended stack for **foundation work**. `12_DECISION_LOG.md` identifies unresolved business interpretations the PDF itself does not settle. The code agent may implement agreed unambiguous foundation structures now, but must **record an explicit, testable decision before coding any affected attendance, leave, payroll or analytics edge logic**, rather than quietly choosing a formula.

**G0 operational status:** Planning files accepted; foundation work authorized. **G1 remains NOT RUN** until the code and tests actually exist.

## 5. What to send back after Prompt 01

Send the coding agent's final G1 report or paste:

- The project directory tree.
- Terminal install/lint/typecheck/test/build output.
- Database migration and `/api/health` + `/api/ready` results.
- Any blockers (e.g. PostgreSQL not configured).

The next prompt is prepared **only after reviewing G1 evidence**, so work stays incremental, testable and aligned with the PDF.

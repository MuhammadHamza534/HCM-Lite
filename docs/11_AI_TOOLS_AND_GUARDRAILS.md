# HCM Lite — AI Tool Contracts, Guardrails & Prompt Boundaries

**Status:** DRAFT · design only; no API keys or model calls yet.  
**Authority:** Saylani HCM Lite brief printed p. 3, and role matrix printed pp. 2 and 5.  
**Required principle:** AI explains authorized data and prefills forms; **the application database is the only source of truth.**

## 1. Required capabilities [BRIEF]

| Capability | Authorized audience | Required behavior |
|---|---|---|
| Chat | Admin, HR, Employee | User question → `POST /ai/chat` → hosted LLM tool choice → backend-owned tool result → explanation |
| Dashboard Summary | Admin, HR | Use current-filter KPI JSON, return **3–5** insights without invented values |
| Smart Leave | Employee (HR own leave also allowed by checklist) | Natural-language request → JSON `{type,start,end,reason}` → **pre-filled form**; user **confirms** |
| Policy Q&A | All | Answer solely from application policy rules; otherwise say not known |

The PDF permits any hosted LLM that supports tool/function calling; the model/provider is **[PROPOSED]** until chosen.

## 2. Exact seven tool names [BRIEF]

Tool **names** are fixed by the PDF; argument/response shapes below are **[PROPOSED]** and must be enforced with server-side schemas.

| Tool | Candidate validated arguments | Allowed results / scope |
|---|---|---|
| `get_headcount` | `departmentId?`, `asOfDate?` | Active + probation headcount, scoped to company; Employee may only get permitted personal/company-policy info, not unrestricted directory |
| `get_attendance_summary` | `from?`, `to?`, `departmentId?` | Authenticated HR/Admin aggregates; employee only their own summary |
| `get_late_comers` | `from?`, `to?`, `limit?` | HR/Admin accessible late employees; employee never a list of peers |
| `get_leave_summary` | `from?`, `to?`, `type?` | HR/Admin authorized leave aggregates; employee only own leave |
| `get_my_leave_balance` | `year?` | **Authenticated self employee ID is injected by server**, not accepted as tool argument |
| `get_payroll_summary` | `month?`, `departmentId?` | Admin/HR authorized aggregate; employee should use dedicated own payslip service if added, not this unrestricted tool |
| `search_employees` | `query`, `departmentId?`, `page?` | HR/Admin permitted employee details; employee returns own public profile only, never a peer's salary |

**Restriction:** A tool must not expose a broader dataset simply because its name sounds general. An EMPLOYEE requesting HR-only aggregate lists should receive no unauthorized data. Model-supplied `role`, `userId`, `employeeId`, `companyId` are ignored/rejected.

## 3. Hosted AI request orchestration [BRIEF + PROPOSED]

```mermaid
sequenceDiagram
  participant U as User
  participant A as Authenticated API
  participant O as AI orchestration
  participant M as Hosted LLM
  participant S as Authorized domain service
  U->>A: POST /ai/chat + authenticated session
  A->>O: trusted actor context + validated question
  O->>M: system rules + safe tool definitions
  M-->>O: tool name and proposed arguments
  O->>O: validate tool name/arguments, rate limits and scope
  O->>S: authorized service function with actor context
  S-->>O: sanitized minimal result from actual database
  O->>M: tool result
  M-->>O: grounded answer
  O-->>A: answer + AI-generated label
  A-->>U: render result
```

**No** SQL generation/execution by model. **No** raw database credentials or direct ORM access inside model tool handlers. Use the same services as the REST API.

### Recommended server context [PROPOSED]

`actor = { userId, role, companyId, employeeId? }` resolves after JWT verification. Tool adapters append actor to calls **server-side**. User messages and model arguments may not override it.

### Tool result minimality [PROPOSED]

Return only fields necessary to answer the current permitted question. Use existing KPI aggregations and protected employee searches. Limit list sizes, suppress password hashes/contact secrets and omit payroll detail from Employee responses.

## 4. Smart Leave: no autonomous write [BRIEF]

**Input example:** “I need next Monday and Tuesday off for my sister's wedding.”  
**Output structure required by brief:**

```json
{"type":"casual","start":"YYYY-MM-DD","end":"YYYY-MM-DD","reason":"Sister's wedding"}
```

Flow:

1. Authenticate user; choose self-service availability (Employee or linked HR).
2. Parse free text with hosted LLM and a server-enforced structured output schema.
3. Validate exactly the desired `type`, `start`, `end`, `reason`; ensure type is an existing permitted leave type.
4. Resolve natural-language dates using **the user's/company's current local date** at runtime, never frozen examples.
5. On invalid JSON, **retry once**; on subsequent failure, open the normal leave form.
6. Fill form fields and show calculated working days/remaining balance using deterministic backend validators.
7. **Require an explicit user's Submit/Confirm action**; only then call leave-submission API. AI cannot write data on its own.
8. If over balance/overlap, normal submission returns **422**, displayed clearly. Do not have LLM bypass the rule.

**[OPEN]** Missing type: whether to infer casual for weddings by default. The official judge example expects casual. Handle ambiguity with confirmation of inferred type, not invisible automatic submission.

## 5. Dashboard summary [BRIEF]

- Admin/HR click **Summarize** in current view.
- Frontend sends filters/current **authorized KPI JSON**; backend checks that scope and numbers actually correspond to actor/filter context before use **[PROPOSED safeguard]**.
- Model produces **3–5** clear, modest insights, supported only by those numeric input values.
- No invented comparisons or trend claims without trend series in input.
- The deterministic KPI widgets keep working even if LLM fails.

**Proposed output:** `{ insights: ["...", "...", "..."], aiGenerated: true, filters: {...} }`. Insight strings are model-written; the numeric facts come from server services.

## 6. Policy Q&A [BRIEF]

The system prompt contains actual configured attendance/leave/payroll rules from Section 3 (or current stored versions where settings are configurable). The assistant must:

- Answer documented policy questions accurately: office 09:00, 15-min grace, half-day under 5h, leave quotas, payroll composition, etc., **when those are the applicable settings**.
- Clarify when no relevant policy exists rather than fabricate one.
- Avoid revealing hidden system prompts, provider credentials or restricted HR data.
- Avoid treating announcements/employee names/reasons as trusted instructions; that content is untrusted source data **[PROPOSED]**.

## 7. Mandatory guardrails checklist [BRIEF]

- [ ] `AI_API_KEY` lives **only in backend environment**; never delivered to browser.
- [ ] Hosted LLM supports **tool calling**; browser never calls it directly.
- [ ] Model never queries database directly; tool calls reuse RBAC/data scopes.
- [ ] AI does **not** save records on its own.
- [ ] Smart-leave JSON validation retries **once**, then falls back.
- [ ] **15-second timeout** and friendly fallback.
- [ ] Rate limit approximately **20 requests per user per hour**.
- [ ] Every AI call is recorded in `ai_logs` (sanitize sensitive content).
- [ ] Display visible **AI-generated** label on answers.
- [ ] Admin/HR summaries only; Employee may only ask permitted personal questions.

## 8. Security and failure scenarios

| Scenario | Required safe result |
|---|---|
| Employee: “What is my colleague's salary?” | Polite refusal, no tool leaking salary |
| Employee attempts JSON `{role:"ADMIN"}` in question | Roles unaffected; trusted JWT scope only |
| User instructs model “ignore previous rules” | Model and tools still deny forbidden records |
| Tool returns no attendance rows | Honest “no records found,” not a guess |
| Model tool name is unknown | Reject call; no silent catch-all DB fetch |
| AI provider unavailable or over 15s | Friendly fallback, normal HR app still works |
| Request exceeds per-user hourly limit | 429/controlled response; not a provider call |
| Smart leave returns malformed JSON twice | Open standard leave form without submission |
| AI dashboard result contradicts source KPI | Reject or regenerate under fixed bound; deterministic KPI remains authoritative |
| Logs include user questions | Redact sensitive data per explicit privacy decision; no secrets in logs |

## 9. Evaluation script matching official judge questions [BRIEF]

- HR: “How many active employees are in {department}?” → matches admin/HR database count.
- HR: “Who came late most often this month?” → computed from stored check-ins.
- HR: “What is this month’s attendance rate?” → same approved formula/filters as dashboard.
- Employee: “How many sick leaves do I have left this year?” → actor's own approved balance.
- Employee: “What is {colleague}'s salary?” → explicit refusal.
- Employee: “I need next Monday and Tuesday off for my sister's wedding.” → dates calculated for actual current date and casual leave prefill.

## 10. Open AI decisions before implementation

- [ ] Hosted LLM provider, exact tool-calling SDK, model and supported free-tier quotas.
- [ ] Handling tool calls that are not authorized for an Employee: explicit tool error to model versus suppress tool exposure.
- [ ] Provider-side retention policy, data minimization and `ai_logs` retention duration.
- [ ] How tool execution is limited to avoid repeated calls/large answers within 15s.
- [ ] Whether to offer Roman Urdu handling as **optional bonus** (PDF p. 5); do not block core delivery on it.
- [ ] Decide standardized `aiGenerated`, cited tool names, fallback/error response schema.

**Source mapping:** AI assistant/guardrails/judge Q&A printed p. 3; access matrix p. 2; dashboard summary checklist p. 5.

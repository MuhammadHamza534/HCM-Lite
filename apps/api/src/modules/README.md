# Phase 1 module boundaries

Future modules are intentionally empty in this foundation: `auth`, `organization`, `employees`, `attendance`, `leave`, `payroll`, `analytics`, `ai`, `comms`, and `audit`.

When later phase prompts authorize work, routes/controllers must call domain services, which call repositories/data access. No Phase 1 domain endpoint is exposed.

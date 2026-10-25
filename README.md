# HCM Lite

HCM Lite is a Saylani Hackathon Human Capital Management web application. The emergency sprint adds first-run setup, authentication, role-scoped HR operations, attendance, leave, payroll/payslip, dashboards, communications and guarded AI API paths to the original TypeScript workspace.

See [BUILD_STATUS.md](BUILD_STATUS.md) for the exact feature coverage and current verification status. The operational migration must be applied successfully before these features can be used against a database.

## Prerequisites

- Windows PowerShell 7+ (Windows PowerShell also works for the commands below)
- Node.js 22+ and npm 10+
- PostgreSQL 16+ available locally or from a hosted development service

Docker is optional and was not used to create this foundation. No operational data is seeded by the application.

## Local setup (PowerShell)

```powershell
Set-Location 'D:\HCM Lite'
Copy-Item .env.example .env
npm install
```

Edit only your local `.env`. Set `DATABASE_URL` to a real PostgreSQL database, for example:

```dotenv
DATABASE_URL=postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/hcm_lite?schema=public
JWT_SECRET=replace-with-a-local-random-secret-of-at-least-32-characters
```

Never commit `.env`, connection credentials, JWT secrets, or AI provider keys.

## Database migrations

Create an empty database named `hcm_lite` with your PostgreSQL account, then apply the versioned migration:

```powershell
npm run db:generate -w @hcm-lite/api
npm run db:migrate -w @hcm-lite/api
npm run db:smoke -w @hcm-lite/api
npm run db:verify-foundation -w @hcm-lite/api
```

The smoke script prints counts for companies, users, and employees. Immediately after a fresh migration they must each be `0`. Migrations intentionally contain no operational `INSERT` statements and no seed script exists.

`db:verify-foundation` is also read-only: it verifies every Phase 1 foundation table exists and that all of those tables are empty before Phase 2 begins.

## Run locally

```powershell
Set-Location 'D:\HCM Lite'
npm run dev
```

Open `http://localhost:5173`. The frontend calls `GET http://localhost:4000/api/health` and `GET http://localhost:4000/api/ready` using `VITE_API_BASE_URL`; it does not mock their status.

- `GET /api/health` reports process liveness only.
- `GET /api/ready` responds `200` only after a real database probe succeeds; otherwise it responds `503`.

## Quality commands

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm run verify-e2e -w @hcm-lite/api
```

`npm run dev` starts the web and API workspaces together. `build`, `typecheck`, and `test` run the matching workspace scripts. `lint` uses the shared root ESLint configuration.

## Application architecture

- `apps/web`: React, Vite, TypeScript and Tailwind frontend with first-run, authentication, role shell and real API actions.
- `apps/api`: Express, TypeScript, Zod validation, Helmet/CORS/request context, bcrypt/JWT authorization, server-side role/ownership checks and payroll/PDF services.
- `apps/api/prisma`: PostgreSQL Prisma schema and versioned additive migrations. The app never creates operational demo data on startup.

## Production preparation

Set `VITE_API_BASE_URL` to the deployed HTTPS API address and set API `CORS_ORIGIN` to the deployed frontend origin. Configure `DATABASE_URL` and a 32+ character `JWT_SECRET` only in deployment secrets, then run `npm run db:migrate -w @hcm-lite/api` as a release step. AI remains honestly unavailable until a server-side `AI_API_KEY`, `AI_MODEL`, and `AI_BASE_URL` are configured; never put those values in the frontend.

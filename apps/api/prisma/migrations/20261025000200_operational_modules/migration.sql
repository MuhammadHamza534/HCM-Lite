-- Additive operational modules migration. It deliberately contains no INSERT,
-- UPDATE, DELETE, TRUNCATE, or DROP statements.
DO $$ BEGIN
  CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'FINALIZED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "CorrectionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "created_by_user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL;

CREATE TABLE "leave_types" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "company_id" UUID NOT NULL REFERENCES "companies"("id") ON DELETE RESTRICT,
  "code" VARCHAR(30) NOT NULL, "name" VARCHAR(100) NOT NULL, "annual_quota_days" DECIMAL(6,2),
  "is_paid" BOOLEAN NOT NULL DEFAULT true, "is_active" BOOLEAN NOT NULL DEFAULT true, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "leave_types_company_code_key" UNIQUE ("company_id", "code")
);
CREATE TABLE "holidays" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "company_id" UUID NOT NULL REFERENCES "companies"("id") ON DELETE RESTRICT,
  "date" DATE NOT NULL, "name" VARCHAR(160) NOT NULL, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "holidays_company_date_key" UNIQUE ("company_id", "date")
);
CREATE TABLE "salary_structures" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "employee_id" UUID NOT NULL REFERENCES "employees"("id") ON DELETE RESTRICT,
  "effective_from" DATE NOT NULL, "basic_salary" DECIMAL(14,2) NOT NULL CHECK ("basic_salary" > 0),
  "hra_rate" DECIMAL(5,4) NOT NULL DEFAULT 0.4, "medical_rate" DECIMAL(5,4) NOT NULL DEFAULT 0.1,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "salary_structures_employee_effective_idx" ON "salary_structures"("employee_id", "effective_from");
CREATE TABLE "attendance_records" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "company_id" UUID NOT NULL REFERENCES "companies"("id") ON DELETE RESTRICT,
  "employee_id" UUID NOT NULL REFERENCES "employees"("id") ON DELETE RESTRICT, "work_date" DATE NOT NULL,
  "check_in_at" TIMESTAMPTZ NOT NULL, "check_out_at" TIMESTAMPTZ, "worked_minutes" INTEGER,
  "was_late" BOOLEAN NOT NULL DEFAULT false, "was_half_day" BOOLEAN NOT NULL DEFAULT false,
  "has_missing_checkout" BOOLEAN NOT NULL DEFAULT true, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "attendance_records_employee_date_key" UNIQUE ("employee_id", "work_date")
);
CREATE INDEX "attendance_records_company_date_idx" ON "attendance_records"("company_id", "work_date");
CREATE TABLE "attendance_corrections" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "employee_id" UUID NOT NULL REFERENCES "employees"("id") ON DELETE RESTRICT,
  "attendance_record_id" UUID REFERENCES "attendance_records"("id") ON DELETE SET NULL, "target_work_date" DATE NOT NULL,
  "reason" TEXT NOT NULL, "status" "CorrectionStatus" NOT NULL DEFAULT 'PENDING', "requested_by_user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "decided_by_user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL, "decision_comment" TEXT, "decided_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "leave_requests" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "company_id" UUID NOT NULL REFERENCES "companies"("id") ON DELETE RESTRICT,
  "employee_id" UUID NOT NULL REFERENCES "employees"("id") ON DELETE RESTRICT, "leave_type_id" UUID NOT NULL REFERENCES "leave_types"("id") ON DELETE RESTRICT,
  "start_date" DATE NOT NULL, "end_date" DATE NOT NULL, "chargeable_days" DECIMAL(6,2) NOT NULL, "reason" TEXT NOT NULL,
  "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING', "requested_by_user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "decided_by_user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL, "decision_comment" TEXT, "decided_at" TIMESTAMPTZ,
  "cancelled_at" TIMESTAMPTZ, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK ("end_date" >= "start_date")
);
CREATE INDEX "leave_requests_employee_status_dates_idx" ON "leave_requests"("employee_id", "status", "start_date", "end_date");
CREATE TABLE "payroll_runs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "company_id" UUID NOT NULL REFERENCES "companies"("id") ON DELETE RESTRICT,
  "period_year" INTEGER NOT NULL, "period_month" INTEGER NOT NULL CHECK ("period_month" BETWEEN 1 AND 12),
  "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT', "created_by_user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "finalized_by_user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL, "finalized_at" TIMESTAMPTZ,
  "gross_total" DECIMAL(14,2) NOT NULL DEFAULT 0, "tax_total" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "deduction_total" DECIMAL(14,2) NOT NULL DEFAULT 0, "net_total" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payroll_runs_company_period_key" UNIQUE ("company_id", "period_year", "period_month")
);
CREATE TABLE "payroll_items" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "payroll_run_id" UUID NOT NULL REFERENCES "payroll_runs"("id") ON DELETE RESTRICT,
  "employee_id" UUID NOT NULL REFERENCES "employees"("id") ON DELETE RESTRICT, "salary_structure_id" UUID NOT NULL REFERENCES "salary_structures"("id") ON DELETE RESTRICT,
  "eligible_working_days" DECIMAL(6,2) NOT NULL, "absent_days" DECIMAL(6,2) NOT NULL DEFAULT 0, "unpaid_days" DECIMAL(6,2) NOT NULL DEFAULT 0, "half_days" DECIMAL(6,2) NOT NULL DEFAULT 0,
  "basic" DECIMAL(14,2) NOT NULL, "hra" DECIMAL(14,2) NOT NULL, "medical" DECIMAL(14,2) NOT NULL, "gross" DECIMAL(14,2) NOT NULL,
  "absence_deduction" DECIMAL(14,2) NOT NULL, "income_tax" DECIMAL(14,2) NOT NULL, "net" DECIMAL(14,2) NOT NULL,
  "calculation_json" JSONB NOT NULL, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payroll_items_run_employee_key" UNIQUE ("payroll_run_id", "employee_id")
);
CREATE TABLE "payslips" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "payroll_item_id" UUID NOT NULL UNIQUE REFERENCES "payroll_items"("id") ON DELETE RESTRICT,
  "generated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "announcements" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "company_id" UUID NOT NULL REFERENCES "companies"("id") ON DELETE RESTRICT,
  "title" VARCHAR(180) NOT NULL, "body" TEXT NOT NULL, "posted_by_user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "published_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "notifications" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "type" VARCHAR(50) NOT NULL, "title" VARCHAR(180) NOT NULL, "message" TEXT NOT NULL, "entity_type" VARCHAR(50), "entity_id" UUID,
  "read_at" TIMESTAMPTZ, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "notifications_user_read_created_idx" ON "notifications"("user_id", "read_at", "created_at");
CREATE TABLE "audit_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "company_id" UUID NOT NULL REFERENCES "companies"("id") ON DELETE RESTRICT,
  "actor_user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL, "action" VARCHAR(100) NOT NULL,
  "entity_type" VARCHAR(80) NOT NULL, "entity_id" UUID NOT NULL, "before_json" JSONB, "after_json" JSONB,
  "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "audit_logs_company_occurred_idx" ON "audit_logs"("company_id", "occurred_at");
CREATE TABLE "ai_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "company_id" UUID NOT NULL REFERENCES "companies"("id") ON DELETE RESTRICT,
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT, "feature" VARCHAR(50) NOT NULL, "status" VARCHAR(30) NOT NULL,
  "tool_names" JSONB, "duration_ms" INTEGER, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "ai_logs_user_created_idx" ON "ai_logs"("user_id", "created_at");

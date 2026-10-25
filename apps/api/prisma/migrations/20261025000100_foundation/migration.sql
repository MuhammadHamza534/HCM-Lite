CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "Role" AS ENUM ('ADMIN', 'HR', 'EMPLOYEE');

CREATE TABLE "companies" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(180) NOT NULL,
  "timezone" VARCHAR(64) NOT NULL DEFAULT 'Asia/Karachi',
  "is_initialized" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "users" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL REFERENCES "companies"("id") ON DELETE RESTRICT,
  "email" VARCHAR(255) NOT NULL,
  "password_hash" TEXT NOT NULL,
  "role" "Role" NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "must_change_password" BOOLEAN NOT NULL DEFAULT false,
  "password_changed_at" TIMESTAMPTZ,
  "created_by_user_id" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "users_company_id_idx" ON "users"("company_id");
CREATE UNIQUE INDEX "users_company_email_lower_key" ON "users"("company_id", LOWER("email"));

CREATE TABLE "departments" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL REFERENCES "companies"("id") ON DELETE RESTRICT,
  "name" VARCHAR(120) NOT NULL,
  "code" VARCHAR(30),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "departments_company_name_key" UNIQUE ("company_id", "name"),
  CONSTRAINT "departments_company_code_key" UNIQUE ("company_id", "code")
);

CREATE TABLE "designations" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL REFERENCES "companies"("id") ON DELETE RESTRICT,
  "name" VARCHAR(120) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "designations_company_name_key" UNIQUE ("company_id", "name")
);

CREATE TABLE "employees" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL REFERENCES "companies"("id") ON DELETE RESTRICT,
  "user_id" UUID NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE RESTRICT,
  "employee_code" VARCHAR(30) NOT NULL,
  "first_name" VARCHAR(100) NOT NULL,
  "last_name" VARCHAR(100) NOT NULL,
  "work_email" VARCHAR(255) NOT NULL,
  "phone" VARCHAR(40),
  "address" TEXT,
  "department_id" UUID REFERENCES "departments"("id") ON DELETE RESTRICT,
  "designation_id" UUID REFERENCES "designations"("id") ON DELETE RESTRICT,
  "join_date" DATE NOT NULL,
  "exit_date" DATE,
  "employment_status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "employees_company_code_key" UNIQUE ("company_id", "employee_code")
);
CREATE INDEX "employees_company_id_idx" ON "employees"("company_id");
CREATE UNIQUE INDEX "employees_company_work_email_lower_key" ON "employees"("company_id", LOWER("work_email"));

CREATE TABLE "company_settings_versions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL REFERENCES "companies"("id") ON DELETE RESTRICT,
  "effective_from" TIMESTAMPTZ NOT NULL,
  "office_start_time" VARCHAR(5) NOT NULL DEFAULT '09:00',
  "grace_minutes" INTEGER NOT NULL DEFAULT 15,
  "half_day_minutes" INTEGER NOT NULL DEFAULT 300,
  "weekend_days" INTEGER[] NOT NULL DEFAULT ARRAY[0, 6],
  "office_latitude" DECIMAL(9,6),
  "office_longitude" DECIMAL(9,6),
  "office_radius_meters" INTEGER,
  "changed_by_user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "company_settings_versions_company_effective_idx" ON "company_settings_versions"("company_id", "effective_from");

-- This migration deliberately inserts no rows. First-run setup is Phase 2.

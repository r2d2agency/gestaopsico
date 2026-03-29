-- Add patient_id to users for patient portal login
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "patient_id" UUID;

-- Organization settings (white-label)
CREATE TABLE IF NOT EXISTS "organization_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "logo" TEXT,
    "primary_color" VARCHAR(20),
    "secondary_color" VARCHAR(20),
    "accent_color" VARCHAR(20),
    "business_name" VARCHAR(255),
    "business_phone" VARCHAR(20),
    "business_email" VARCHAR(255),
    "business_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "organization_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "organization_settings_organization_id_key" ON "organization_settings"("organization_id");

-- Accounts (contas a pagar/receber)
CREATE TABLE IF NOT EXISTS "accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID,
    "professional_id" UUID NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "description" TEXT NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "due_date" DATE NOT NULL,
    "paid_at" TIMESTAMP(3),
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "category" VARCHAR(50),
    "patient_id" UUID,
    "payment_method" VARCHAR(20),
    "notes" TEXT,
    "recurrence" VARCHAR(20),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- Mood entries (humor tracking)
CREATE TABLE IF NOT EXISTS "mood_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "mood" INTEGER NOT NULL,
    "emotions" TEXT[] DEFAULT '{}',
    "notes" TEXT,
    "energy_level" INTEGER,
    "sleep_quality" INTEGER,
    "anxiety_level" INTEGER,
    "date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mood_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "mood_entries_patient_date_idx" ON "mood_entries"("patient_id", "date");

-- Test templates
CREATE TABLE IF NOT EXISTS "test_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "professional_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(50),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "test_templates_pkey" PRIMARY KEY ("id")
);

-- Test questions
CREATE TABLE IF NOT EXISTS "test_questions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "template_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "type" VARCHAR(20) NOT NULL DEFAULT 'scale',
    "options" TEXT[] DEFAULT '{}',
    "order_num" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "test_questions_pkey" PRIMARY KEY ("id")
);

-- Test assignments
CREATE TABLE IF NOT EXISTS "test_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "template_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    CONSTRAINT "test_assignments_pkey" PRIMARY KEY ("id")
);

-- Test responses
CREATE TABLE IF NOT EXISTS "test_responses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assignment_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "answer" TEXT NOT NULL,
    CONSTRAINT "test_responses_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_patient_id_fkey') THEN
    ALTER TABLE "users" ADD CONSTRAINT "users_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organization_settings_organization_id_fkey') THEN
    ALTER TABLE "organization_settings" ADD CONSTRAINT "organization_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'accounts_professional_id_fkey') THEN
    ALTER TABLE "accounts" ADD CONSTRAINT "accounts_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'accounts_patient_id_fkey') THEN
    ALTER TABLE "accounts" ADD CONSTRAINT "accounts_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mood_entries_patient_id_fkey') THEN
    ALTER TABLE "mood_entries" ADD CONSTRAINT "mood_entries_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'test_templates_professional_id_fkey') THEN
    ALTER TABLE "test_templates" ADD CONSTRAINT "test_templates_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'test_questions_template_id_fkey') THEN
    ALTER TABLE "test_questions" ADD CONSTRAINT "test_questions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "test_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'test_assignments_template_id_fkey') THEN
    ALTER TABLE "test_assignments" ADD CONSTRAINT "test_assignments_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "test_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'test_assignments_patient_id_fkey') THEN
    ALTER TABLE "test_assignments" ADD CONSTRAINT "test_assignments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'test_responses_assignment_id_fkey') THEN
    ALTER TABLE "test_responses" ADD CONSTRAINT "test_responses_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "test_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'test_responses_question_id_fkey') THEN
    ALTER TABLE "test_responses" ADD CONSTRAINT "test_responses_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "test_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

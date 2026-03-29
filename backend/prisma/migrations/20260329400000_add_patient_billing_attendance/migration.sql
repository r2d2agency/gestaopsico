-- Add billing mode and notification settings to patients
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "billing_mode" VARCHAR(20) DEFAULT 'per_session';
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "monthly_value" DECIMAL(10,2);
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "session_value" DECIMAL(10,2);
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "charge_notification_mode" VARCHAR(20) DEFAULT 'whatsapp';
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "charge_day" INTEGER DEFAULT 5;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "charge_time" VARCHAR(5) DEFAULT '10:00';
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "charge_enabled" BOOLEAN DEFAULT false;

-- Add attendance tracking to appointments
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "attended" BOOLEAN DEFAULT false;

-- Add isPreset and scoringRules to test_templates  
ALTER TABLE "test_templates" ADD COLUMN IF NOT EXISTS "is_preset" BOOLEAN DEFAULT false;
ALTER TABLE "test_templates" ADD COLUMN IF NOT EXISTS "scoring_rules" JSONB;

-- Add scoring weight to test_questions
ALTER TABLE "test_questions" ADD COLUMN IF NOT EXISTS "weight" INTEGER DEFAULT 1;
ALTER TABLE "test_questions" ADD COLUMN IF NOT EXISTS "reverse_scored" BOOLEAN DEFAULT false;

-- Add Organization slug for branded portal link
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "portal_slug" VARCHAR(100);
CREATE UNIQUE INDEX IF NOT EXISTS "organizations_portal_slug_key" ON "organizations"("portal_slug");

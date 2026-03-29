-- Add sender and read_at to patient_portal_messages
ALTER TABLE "patient_portal_messages" ADD COLUMN IF NOT EXISTS "sender" VARCHAR(20) NOT NULL DEFAULT 'patient';
ALTER TABLE "patient_portal_messages" ADD COLUMN IF NOT EXISTS "read_at" TIMESTAMP;

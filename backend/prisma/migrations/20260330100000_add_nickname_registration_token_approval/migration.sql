-- Add nickname to patients
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "nickname" VARCHAR(100);

-- Add registration token for incomplete patient registration
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "registration_token" VARCHAR(255);
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "registration_completed" BOOLEAN DEFAULT false;

-- Add approval requirement for online bookings per professional
ALTER TABLE "organization_settings" ADD COLUMN IF NOT EXISTS "require_booking_approval" BOOLEAN DEFAULT false;

-- Add approval status to appointments (pending_approval -> approved/rejected)
-- We'll use the existing status field with new value 'pending_approval'

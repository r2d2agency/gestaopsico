-- Add scheduling hours configuration to organization_settings
ALTER TABLE "organization_settings" ADD COLUMN "schedule_start_hour" INTEGER NOT NULL DEFAULT 8;
ALTER TABLE "organization_settings" ADD COLUMN "schedule_end_hour" INTEGER NOT NULL DEFAULT 19;
ALTER TABLE "organization_settings" ADD COLUMN "patient_booking_start_hour" INTEGER NOT NULL DEFAULT 8;
ALTER TABLE "organization_settings" ADD COLUMN "patient_booking_end_hour" INTEGER NOT NULL DEFAULT 18;
ALTER TABLE "organization_settings" ADD COLUMN "session_duration" INTEGER NOT NULL DEFAULT 50;
ALTER TABLE "organization_settings" ADD COLUMN "booking_weekdays" TEXT NOT NULL DEFAULT '1,2,3,4,5';

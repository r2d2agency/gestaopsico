-- AlterTable
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "has_clinic_mode" BOOLEAN NOT NULL DEFAULT false;

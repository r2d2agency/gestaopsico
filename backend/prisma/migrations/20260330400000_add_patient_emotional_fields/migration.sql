-- AlterTable
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "emotional_patterns" TEXT,
ADD COLUMN IF NOT EXISTS "triggers" TEXT,
ADD COLUMN IF NOT EXISTS "defense_mechanisms" TEXT;

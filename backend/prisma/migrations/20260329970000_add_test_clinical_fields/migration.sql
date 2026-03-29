-- Add clinical fields to test_assignments
ALTER TABLE "test_assignments" ADD COLUMN IF NOT EXISTS "score" DOUBLE PRECISION;
ALTER TABLE "test_assignments" ADD COLUMN IF NOT EXISTS "classification" VARCHAR(100);
ALTER TABLE "test_assignments" ADD COLUMN IF NOT EXISTS "professional_assessment" TEXT;
ALTER TABLE "test_assignments" ADD COLUMN IF NOT EXISTS "professional_conclusion" TEXT;
ALTER TABLE "test_assignments" ADD COLUMN IF NOT EXISTS "ai_interpretation" TEXT;
ALTER TABLE "test_assignments" ADD COLUMN IF NOT EXISTS "clinical_record_id" UUID;

-- FK to records table if exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'test_assignments_clinical_record_id_fkey') THEN
    ALTER TABLE "test_assignments" ADD CONSTRAINT "test_assignments_clinical_record_id_fkey"
      FOREIGN KEY ("clinical_record_id") REFERENCES "records"("id") ON DELETE SET NULL;
  END IF;
END $$;

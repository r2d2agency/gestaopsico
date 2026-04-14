-- Import batches for tracking and rollback
CREATE TABLE IF NOT EXISTS "import_batches" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "professional_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" VARCHAR(30) NOT NULL DEFAULT 'xlsx',
  "file_name" VARCHAR(255),
  "status" VARCHAR(20) NOT NULL DEFAULT 'completed',
  "summary" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add import_batch_id to trackable tables
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "import_batch_id" UUID REFERENCES "import_batches"("id") ON DELETE SET NULL;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "import_batch_id" UUID REFERENCES "import_batches"("id") ON DELETE SET NULL;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "import_batch_id" UUID REFERENCES "import_batches"("id") ON DELETE SET NULL;
ALTER TABLE "couples" ADD COLUMN IF NOT EXISTS "import_batch_id" UUID REFERENCES "import_batches"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "import_batches_professional_id_idx" ON "import_batches"("professional_id");

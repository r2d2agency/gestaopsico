CREATE TABLE IF NOT EXISTS "patient_portal_messages" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "patient_id" UUID NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
  "professional_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" VARCHAR(20) NOT NULL,
  "content" TEXT NOT NULL,
  "file_name" VARCHAR(255),
  "mime_type" VARCHAR(100),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "patient_portal_messages_patient_id_created_at_idx"
  ON "patient_portal_messages" ("patient_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "patient_portal_messages_professional_id_created_at_idx"
  ON "patient_portal_messages" ("professional_id", "created_at" DESC);
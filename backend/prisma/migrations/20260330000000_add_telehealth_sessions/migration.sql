-- CreateTable
CREATE TABLE "telehealth_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "professional_id" UUID NOT NULL,
    "patient_id" UUID,
    "couple_id" UUID,
    "appointment_id" UUID,
    "meeting_link" VARCHAR(500),
    "status" VARCHAR(30) NOT NULL DEFAULT 'waiting',
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "duration" INTEGER,
    "audio_file_name" VARCHAR(500),
    "audio_uploaded_at" TIMESTAMP(3),
    "transcription_started_at" TIMESTAMP(3),
    "transcription_ended_at" TIMESTAMP(3),
    "audio_deleted_at" TIMESTAMP(3),
    "transcription" TEXT,
    "structured_content" TEXT,
    "ai_organized_content" TEXT,
    "processing_status" VARCHAR(30) NOT NULL DEFAULT 'none',
    "processing_error" TEXT,
    "record_id" UUID,
    "consent_accepted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telehealth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telehealth_audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "details" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telehealth_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "telehealth_sessions_professional_id_idx" ON "telehealth_sessions"("professional_id");
CREATE INDEX "telehealth_sessions_patient_id_idx" ON "telehealth_sessions"("patient_id");
CREATE INDEX "telehealth_audit_logs_session_id_idx" ON "telehealth_audit_logs"("session_id");

-- AddForeignKey
ALTER TABLE "telehealth_sessions" ADD CONSTRAINT "telehealth_sessions_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "telehealth_sessions" ADD CONSTRAINT "telehealth_sessions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "telehealth_sessions" ADD CONSTRAINT "telehealth_sessions_couple_id_fkey" FOREIGN KEY ("couple_id") REFERENCES "couples"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "telehealth_sessions" ADD CONSTRAINT "telehealth_sessions_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "telehealth_sessions" ADD CONSTRAINT "telehealth_sessions_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "telehealth_audit_logs" ADD CONSTRAINT "telehealth_audit_logs_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "telehealth_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

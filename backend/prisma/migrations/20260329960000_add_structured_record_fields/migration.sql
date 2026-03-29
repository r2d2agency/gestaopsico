-- Add structured clinical record fields
ALTER TABLE "records" ADD COLUMN "complaint" TEXT;
ALTER TABLE "records" ADD COLUMN "key_points" TEXT;
ALTER TABLE "records" ADD COLUMN "clinical_observations" TEXT;
ALTER TABLE "records" ADD COLUMN "interventions" TEXT;
ALTER TABLE "records" ADD COLUMN "evolution" TEXT;
ALTER TABLE "records" ADD COLUMN "next_steps" TEXT;
ALTER TABLE "records" ADD COLUMN "private_notes" TEXT;
ALTER TABLE "records" ADD COLUMN "modality" VARCHAR(20) DEFAULT 'in_person';
ALTER TABLE "records" ADD COLUMN "ai_clinical_support" TEXT;
ALTER TABLE "records" ADD COLUMN "themes" TEXT[];
ALTER TABLE "records" ADD COLUMN "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

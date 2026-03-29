-- Add display options to test templates
ALTER TABLE "test_templates" ADD COLUMN "intro_text" TEXT;
ALTER TABLE "test_templates" ADD COLUMN "completion_message" TEXT;
ALTER TABLE "test_templates" ADD COLUMN "questions_per_page" INTEGER NOT NULL DEFAULT 1;

-- Add diary support to patient portal messages
ALTER TABLE "patient_portal_messages" ADD COLUMN "title" VARCHAR(255);
ALTER TABLE "patient_portal_messages" ADD COLUMN "is_diary" BOOLEAN NOT NULL DEFAULT false;

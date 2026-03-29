-- CreateTable whatsapp_instances
CREATE TABLE IF NOT EXISTS "whatsapp_instances" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "instance_id" VARCHAR(255) NOT NULL,
    "instance_name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "status" VARCHAR(20) NOT NULL DEFAULT 'disconnected',
    "organization_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "whatsapp_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable secretary_configs
CREATE TABLE IF NOT EXISTS "secretary_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "instance_id" UUID,
    "secretary_name" VARCHAR(100) NOT NULL DEFAULT 'Secretária Virtual',
    "working_hours_start" VARCHAR(5) NOT NULL DEFAULT '08:00',
    "working_hours_end" VARCHAR(5) NOT NULL DEFAULT '18:00',
    "working_days" TEXT[] DEFAULT ARRAY['seg','ter','qua','qui','sex']::TEXT[],
    "clinic_name" VARCHAR(255),
    "clinic_address" TEXT,
    "clinic_phone" VARCHAR(20),
    "professional_info" TEXT,
    "prompt_complement" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "secretary_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable whatsapp_notifications
CREATE TABLE IF NOT EXISTS "whatsapp_notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "instance_id" UUID NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "message" TEXT NOT NULL,
    "type" VARCHAR(30) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'queued',
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "sent_at" TIMESTAMP(3),
    "error" TEXT,
    "reference_id" UUID,
    "reference_type" VARCHAR(30),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "whatsapp_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_instances_instance_id_key" ON "whatsapp_instances"("instance_id");
CREATE UNIQUE INDEX IF NOT EXISTS "secretary_configs_user_id_key" ON "secretary_configs"("user_id");
CREATE INDEX IF NOT EXISTS "whatsapp_notifications_status_scheduled_at_idx" ON "whatsapp_notifications"("status", "scheduled_at");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'secretary_configs_user_id_fkey') THEN
    ALTER TABLE "secretary_configs" ADD CONSTRAINT "secretary_configs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'secretary_configs_instance_id_fkey') THEN
    ALTER TABLE "secretary_configs" ADD CONSTRAINT "secretary_configs_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "whatsapp_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_notifications_instance_id_fkey') THEN
    ALTER TABLE "whatsapp_notifications" ADD CONSTRAINT "whatsapp_notifications_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "whatsapp_instances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

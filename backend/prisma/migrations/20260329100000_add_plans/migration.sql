-- CreateTable plans
CREATE TABLE IF NOT EXISTS "plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "price_with_ai" DECIMAL(10,2),
    "max_patients" INTEGER NOT NULL DEFAULT 10,
    "max_users" INTEGER NOT NULL DEFAULT 1,
    "max_psychologists" INTEGER NOT NULL DEFAULT 1,
    "trial_days" INTEGER NOT NULL DEFAULT 7,
    "has_ai_secretary" BOOLEAN NOT NULL DEFAULT false,
    "has_whatsapp" BOOLEAN NOT NULL DEFAULT false,
    "is_recommended" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable system_settings
CREATE TABLE IF NOT EXISTS "system_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" VARCHAR(100) NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- Add plan_id to organizations
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "plan_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "plans_slug_key" ON "plans"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "system_settings_key_key" ON "system_settings"("key");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organizations_plan_id_fkey') THEN
    ALTER TABLE "organizations" ADD CONSTRAINT "organizations_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Seed default plans
INSERT INTO "plans" ("name", "slug", "price", "price_with_ai", "max_patients", "max_users", "max_psychologists", "trial_days", "has_ai_secretary", "has_whatsapp", "is_recommended", "features", "updated_at")
VALUES 
  ('Essencial', 'essencial', 89.00, 289.00, 30, 1, 1, 7, false, false, false, ARRAY['Até 30 pacientes','Agenda e prontuário','Sessões online','IA para análise de anotações','Suporte por e-mail'], CURRENT_TIMESTAMP),
  ('Profissional', 'profissional', 149.00, 349.00, 9999, 3, 1, 14, true, true, true, ARRAY['Pacientes ilimitados','Assistente de IA (GPT, Claude, Gemini)','Agentes personalizáveis','Terapia de casal','Financeiro completo','Suporte prioritário'], CURRENT_TIMESTAMP),
  ('Clínica', 'clinica', 349.00, 549.00, 9999, 10, 10, 14, true, true, false, ARRAY['Até 10 profissionais','Tudo do Profissional','Painel administrativo','Agentes de IA ilimitados','Multi-unidades','Suporte dedicado + SLA'], CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

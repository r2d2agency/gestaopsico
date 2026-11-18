-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "mode" VARCHAR(20) NOT NULL DEFAULT 'individual';

-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "scope" VARCHAR(20) NOT NULL DEFAULT 'private';

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "scope" VARCHAR(20) NOT NULL DEFAULT 'private';

-- AlterTable
ALTER TABLE "records" ADD COLUMN     "scope" VARCHAR(20) NOT NULL DEFAULT 'private';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "scope" VARCHAR(20) NOT NULL DEFAULT 'private';

-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "scope" VARCHAR(20) NOT NULL DEFAULT 'private';

-- CreateTable
CREATE TABLE "clinic_members" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" VARCHAR(40) NOT NULL,
    "scope" VARCHAR(20) NOT NULL DEFAULT 'clinic',
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "supervisor_id" UUID,
    "created_by" UUID,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinic_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_clinic_links" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "professional_id" UUID NOT NULL,
    "relation_type" VARCHAR(20) NOT NULL DEFAULT 'owner',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "valid_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_until" TIMESTAMP(3),
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_clinic_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compensation_agreements" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "professional_id" UUID NOT NULL,
    "rule_type" VARCHAR(20) NOT NULL,
    "fixed_amount" DECIMAL(10,2),
    "percentage" DECIMAL(5,2),
    "effective_from" DATE NOT NULL,
    "effective_until" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compensation_agreements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_runs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "month" DATE NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "gross_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deduction_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "net_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "approved_by_id" UUID,
    "paid_by_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payout_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_items" (
    "id" UUID NOT NULL,
    "run_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "professional_id" UUID NOT NULL,
    "appointment_id" UUID NOT NULL,
    "patient_id" UUID,
    "session_date" DATE NOT NULL,
    "charged_amount" DECIMAL(10,2) NOT NULL,
    "agreement_id" UUID,
    "rule_type" VARCHAR(20) NOT NULL,
    "fixed_amount" DECIMAL(10,2),
    "percentage" DECIMAL(5,2),
    "gross_amount" DECIMAL(10,2) NOT NULL,
    "deduction_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "net_amount" DECIMAL(10,2) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "adjustment_reason" TEXT,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payout_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "appointment_id" UUID,
    "number" VARCHAR(50),
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "amount" DECIMAL(10,2) NOT NULL,
    "tax_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "issued_at" TIMESTAMP(3),
    "external_id" VARCHAR(100),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "actor_id" UUID,
    "action" VARCHAR(80) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID,
    "details" JSONB,
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "user_id" UUID NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT,
    "data" JSONB,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clinic_members_organization_id_status_idx" ON "clinic_members"("organization_id", "status");

-- CreateIndex
CREATE INDEX "clinic_members_supervisor_id_idx" ON "clinic_members"("supervisor_id");

-- CreateIndex
CREATE UNIQUE INDEX "clinic_members_organization_id_user_id_key" ON "clinic_members"("organization_id", "user_id");

-- CreateIndex
CREATE INDEX "patient_clinic_links_organization_id_patient_id_idx" ON "patient_clinic_links"("organization_id", "patient_id");

-- CreateIndex
CREATE INDEX "patient_clinic_links_organization_id_professional_id_idx" ON "patient_clinic_links"("organization_id", "professional_id");

-- CreateIndex
CREATE UNIQUE INDEX "patient_clinic_links_organization_id_patient_id_professiona_key" ON "patient_clinic_links"("organization_id", "patient_id", "professional_id");

-- CreateIndex
CREATE INDEX "compensation_agreements_organization_id_professional_id_eff_idx" ON "compensation_agreements"("organization_id", "professional_id", "effective_from");

-- CreateIndex
CREATE UNIQUE INDEX "payout_runs_organization_id_month_key" ON "payout_runs"("organization_id", "month");

-- CreateIndex
CREATE INDEX "payout_items_organization_id_professional_id_idx" ON "payout_items"("organization_id", "professional_id");

-- CreateIndex
CREATE UNIQUE INDEX "payout_items_run_id_appointment_id_key" ON "payout_items"("run_id", "appointment_id");

-- CreateIndex
CREATE INDEX "invoices_organization_id_status_idx" ON "invoices"("organization_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_organization_id_number_key" ON "invoices"("organization_id", "number");

-- CreateIndex
CREATE INDEX "audit_events_organization_id_created_at_idx" ON "audit_events"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_events_entity_type_entity_id_idx" ON "audit_events"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");

-- CreateIndex
CREATE INDEX "notifications_organization_id_created_at_idx" ON "notifications"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "patients_scope_idx" ON "patients"("scope");

-- CreateIndex
CREATE INDEX "appointments_scope_idx" ON "appointments"("scope");

-- CreateIndex
CREATE INDEX "appointments_professional_id_scope_date_idx" ON "appointments"("professional_id", "scope", "date");

-- CreateIndex
CREATE INDEX "records_scope_idx" ON "records"("scope");

-- CreateIndex
CREATE INDEX "records_professional_id_scope_date_idx" ON "records"("professional_id", "scope", "date");

-- CreateIndex
CREATE INDEX "payments_scope_idx" ON "payments"("scope");

-- CreateIndex
CREATE INDEX "accounts_scope_idx" ON "accounts"("scope");

-- CreateIndex
CREATE INDEX "accounts_organization_id_scope_due_date_idx" ON "accounts"("organization_id", "scope", "due_date");

-- AddForeignKey
ALTER TABLE "clinic_members" ADD CONSTRAINT "clinic_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinic_members" ADD CONSTRAINT "clinic_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinic_members" ADD CONSTRAINT "clinic_members_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinic_members" ADD CONSTRAINT "clinic_members_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_clinic_links" ADD CONSTRAINT "patient_clinic_links_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_clinic_links" ADD CONSTRAINT "patient_clinic_links_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_clinic_links" ADD CONSTRAINT "patient_clinic_links_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_clinic_links" ADD CONSTRAINT "patient_clinic_links_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compensation_agreements" ADD CONSTRAINT "compensation_agreements_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compensation_agreements" ADD CONSTRAINT "compensation_agreements_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compensation_agreements" ADD CONSTRAINT "compensation_agreements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_runs" ADD CONSTRAINT "payout_runs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_runs" ADD CONSTRAINT "payout_runs_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_runs" ADD CONSTRAINT "payout_runs_paid_by_id_fkey" FOREIGN KEY ("paid_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_items" ADD CONSTRAINT "payout_items_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "payout_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_items" ADD CONSTRAINT "payout_items_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_items" ADD CONSTRAINT "payout_items_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_items" ADD CONSTRAINT "payout_items_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

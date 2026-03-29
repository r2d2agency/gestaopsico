-- Drop the global unique constraint on cpf
DROP INDEX IF EXISTS "patients_cpf_key";

-- Create a composite unique: cpf is unique per professional only
CREATE UNIQUE INDEX "patients_cpf_professional_id_key" ON "patients"("cpf", "professional_id");

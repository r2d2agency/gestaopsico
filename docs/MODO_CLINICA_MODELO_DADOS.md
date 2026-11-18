# Modo Clínica — modelo de dados e migração

Documento de apoio ao roteiro [`MODO_CLINICA_ROTEIRO.md`](./MODO_CLINICA_ROTEIRO.md), Etapa 2.

## Objetivo

Representar a operação clínica sem transformar dados particulares existentes em
dados da clínica. O limite de isolamento continua sendo a organização; o escopo
`private`/`clinic` separa as duas operações dentro da mesma organização.

## Entidades adicionadas

| Entidade | Finalidade |
|---|---|
| `Organization.mode` | Modo explícito: `individual`, `clinic` ou `hybrid`. |
| `ClinicMember` | Vínculo do usuário com a operação clínica: papel, permissões, supervisor, situação e vigência. |
| `PatientClinicLink` | Titularidade e compartilhamento de pacientes na clínica, com vigência. |
| `CompensationAgreement` | Regra de repasse com valor fixo, percentual ou ambos e vigência. |
| `PayoutRun` / `PayoutItem` | Fechamento mensal, sessões elegíveis, ajustes e pagamento. |
| `Invoice` | Registro de nota/fatura, sem emissão fiscal pelo produto nesta versão. |
| `AuditEvent` | Trilha de alterações sensíveis e acessos clínicos. |
| `Notification` | Notificações internas de agenda e fechamento. |

## Campos de escopo

`Patient`, `Appointment`, `Record`, `Payment` e `Account` receberam `scope`,
com valor padrão `private`. Nenhum dado antigo é convertido automaticamente para
`clinic`.

## Regras de integridade

1. Um `ClinicMember` é único por `(organizationId, userId)`.
2. Um vínculo com situação diferente de `active` não autoriza acesso clínico.
3. Um paciente clínico pode ter vários `PatientClinicLink`; apenas um pode ser
   titular principal por organização.
4. Um agendamento clínico só pode referenciar um profissional com vínculo ativo
   na mesma organização.
5. O valor cobrado permanece em `Appointment.value`/`Payment.value`. O valor
   devido ao profissional é calculado em `PayoutItem` a partir de
   `CompensationAgreement`.
6. Um `PayoutRun` é único por `(organizationId, month)`.
7. Um `PayoutItem` é único por `(runId, appointmentId)`, evitando duplicidade.
8. Fechamentos `approved` ou `paid` não podem ser recalculados; correções geram
   novo registro de ajuste e trilha em `AuditEvent`.
9. `Invoice` registra o status da nota; a emissão fiscal continua externa.
10. Toda leitura de prontuário clínico e toda alteração de vínculo, permissão ou
    fechamento devem gerar `AuditEvent`.

## Impacto nos dados existentes

- Todas as organizações começam em `mode = individual`.
- Todos os registros existentes começam com `scope = private`.
- Nenhum usuário existente recebe automaticamente um `ClinicMember`.
- Nenhum paciente, agenda ou financeiro antigo é movido para a clínica.
- As tabelas novas são vazias após a migração.

Assim, a operação individual atual continua intacta até que um administrador
ative explicitamente o modo clínico e configure os vínculos.

## Migração

Arquivo: `backend/prisma/migrations/20260331000000_add_clinic_mode/migration.sql`.

A migração é aditiva:

1. cria `Organization.mode`;
2. cria as colunas `scope` com valor padrão `private`;
3. cria as tabelas relacionadas à clínica;
4. cria índices e chaves estrangeiras.

### Aplicação

```bash
cd backend
npx prisma migrate deploy
npx prisma generate
```

### Rollback

Não existe uma migration Prisma `down` automática no projeto. Para reverter a
implementação em ambiente controlado:

```sql
DROP TABLE IF EXISTS "notifications";
DROP TABLE IF EXISTS "audit_events";
DROP TABLE IF EXISTS "invoices";
DROP TABLE IF EXISTS "payout_items";
DROP TABLE IF EXISTS "payout_runs";
DROP TABLE IF EXISTS "compensation_agreements";
DROP TABLE IF EXISTS "patient_clinic_links";
DROP TABLE IF EXISTS "clinic_members";

ALTER TABLE "accounts" DROP COLUMN IF EXISTS "scope";
ALTER TABLE "payments" DROP COLUMN IF EXISTS "scope";
ALTER TABLE "records" DROP COLUMN IF EXISTS "scope";
ALTER TABLE "appointments" DROP COLUMN IF EXISTS "scope";
ALTER TABLE "patients" DROP COLUMN IF EXISTS "scope";
ALTER TABLE "organizations" DROP COLUMN IF EXISTS "mode";
```

O rollback descarta apenas dados criados pela operação clínica. Dados
particulares preexistentes não são removidos.

## Validação

- `npx prisma validate` executado com `DATABASE_URL` de exemplo: schema válido.
- A migração foi gerada por `prisma migrate diff` entre o schema anterior e o
  novo, cobrindo apenas as diferenças aditivas.
- A aplicação em banco real e o ensaio de rollback permanecem como pré-requisito
  da Etapa 8.

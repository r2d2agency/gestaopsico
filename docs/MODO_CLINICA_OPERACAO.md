# Modo Clínica — operação, migração e permissões

Documento de apoio à Etapa 8 do roteiro
[`MODO_CLINICA_ROTEIRO.md`](./MODO_CLINICA_ROTEIRO.md).

## Ativação

1. Confirmar que as migrações `20260331000000_add_clinic_mode` e
   `20260331100000_add_plan_clinic_mode` foram aplicadas.
2. Como superadmin, editar somente o plano que deve habilitar o recurso e
   ativar `Modo Clínica` (`Plan.hasClinicMode = true`). Planos sem esse recurso
   não podem ativar a operação clínica.
3. Confirmar que todos os dados antigos estão com `Organization.mode = individual`
   e registros com `scope = private`.
4. Como administrador da organização, chamar `POST /api/clinic/activate` com
   `{"mode":"clinic"}` ou `{"mode":"hybrid"}`.
5. Criar vínculos ativos em `/api/clinic/members`.
6. Criar acordos de repasse em `/api/payouts/agreements`.
7. Apresentar aos usuários que eles continuam com dados particulares e passam a
   ter acesso clínico apenas nos vínculos autorizados.

## Matriz operacional de permissões

| Ação | Quem pode |
|---|---|
| Habilitar recurso no plano | `superadmin`, somente no plano clínica |
| Ativar modo clínico | `admin` da organização com plano habilitado |
| Criar/editar vínculo clínico | `admin` com vínculo ativo |
| Suspender/encerrar vínculo | `admin` com vínculo ativo |
| Compartilhar paciente clínico | `admin`, `secretary`, `professional` com vínculo ativo |
| Agenda particular | dono do dado; `admin` pode administrar |
| Agenda clínica | profissionais com vínculo ativo, secretaria e admin |
| Prontuário particular | profissional autor; `admin` pode administrar registros |
| Prontuário clínico | profissional autor, supervisor vinculado e `admin` |
| IA clínica, testes e análises | mesmos papéis da leitura/escrita do prontuário |
| Financeiro particular | dono do dado, financeiro e admin |
| Financeiro clínico | financeiro e admin; profissional vê somente o próprio repasse |
| Acordos e fechamentos | financeiro e admin |
| Auditoria | admin |
| Notificações internas | destinatário do evento |

Secretaria e financeiro não possuem leitura de prontuário. Profissional não vê
o caixa geral da clínica.

## Fluxo mensal recomendado

1. Conferir sessões clínicas concluídas e recebidas.
2. Gerar a prévia com `POST /api/payouts/runs` (`month = YYYY-MM`).
3. Conferir itens por profissional e registrar ajustes com justificativa.
4. Revisar com `POST /api/payouts/runs/:id/review`.
5. Aprovar com `POST /api/payouts/runs/:id/approve`.
6. Pagar com `POST /api/payouts/runs/:id/pay`.
7. Guardar comprovantes fora do sistema e registrar observações no fechamento.

Fechamentos aprovados ou pagos não podem ser recalculados. Correções usam
ajustes rastreados.

## Migração piloto

1. Criar uma cópia isolada do banco de produção.
2. Aplicar somente migrations do diretório `backend/prisma/migrations`.
3. Validar no banco copiado:
   - `select count(*) from organizations where mode <> 'individual';` deve
     retornar zero antes da ativação;
   - `select scope, count(*) from patients group by scope;` deve conter apenas
     `private`;
   - repetir para `appointments`, `records`, `payments` e `accounts`;
   - `select count(*) from clinic_members;` deve retornar zero;
   - `select count(*) from payout_runs;` deve retornar zero.
4. Ativar o modo clínico para exatamente uma organização piloto.
5. Criar vínculos, acordos e um fechamento de teste.
6. Validar por perfil:
   - profissional vê apenas seus dados e seu repasse;
   - secretaria vê agenda e contato, sem prontuário;
   - financeiro vê valores, sem prontuário;
   - supervisor acessa apenas profissionais vinculados;
   - outro tenant não acessa dados do piloto.
7. Somente após aprovação documentada dos sócios, repetir a ativação em
   produção.

## Monitoramento

- Acompanhar erros 403 inesperados nas rotas clínicas nas primeiras semanas.
- Revisar semanalmente `AuditEvent` para leitura de prontuário e alterações de
  vínculo.
- Revisar mensalmente acordos com vigência próxima do fim.
- Manter backup antes de cada fechamento.

## reversão

- Reverter a ativação definindo a organização como `individual` somente se
  nenhum fechamento tiver sido aprovado.
- Para desfazer a estrutura do banco, usar o script de rollback documentado em
  [`MODO_CLINICA_MODELO_DADOS.md`](./MODO_CLINICA_MODELO_DADOS.md).
- O script remove apenas dados clínicos; dados particulares não são removidos.

## Checklist executável

Usar [`MODO_CLINICA_CHECKLIST_PILOTO.md`](./MODO_CLINICA_CHECKLIST_PILOTO.md)
para executar e registrar o piloto da Clínica Diniz.

## Pendências antes da entrada definitiva em operação

- Ensaio da migração em banco real.
- Validação formal dos sócios, secretaria, financeiro e profissional piloto.
- Ensaios de regressão das funções individuais existentes em ambiente próximo
  ao de produção.

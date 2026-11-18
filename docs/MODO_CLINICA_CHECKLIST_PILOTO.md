# Checklist executável — piloto Clínica Diniz

Etapa 8 do roteiro [`MODO_CLINICA_ROTEIRO.md`](./MODO_CLINICA_ROTEIRO.md).

## Como usar

- Execute as seções em ordem.
- Registre a evidência solicitada: Captura de tela, ID, JSON, `psql` output ou link interno.
- Não pule uma verificação de segurança, mesmo que o fluxo funcione.
- Não use dados reais de pacientes no piloto sem autorização formal.
- Aprovação final depende da assinatura de Ricardo, Bruna, secretaria, financeiro
  e profissional piloto.

Legenda: `[ ]` pendente · `[x]` concluído · **BLOQUEANTE** impede a produção.

---

## 0. Pré-requisitos

- [ ] **0.1** Confirmar janela de manutenção e responsável técnico.
  Evidência: nome, data, horário.

- [ ] **0.2** Confirmar que a versão candidata foi identificada.
  Evidência: commit/hash ou tag.

- [ ] **0.3** Confirmar que o ambiente piloto é isolado de produção.
  Evidência: URL/DB/host do piloto.

- [ ] **0.4** Confirmar que há backup recente e restaurável do ambiente piloto.
  Evidência: ID do backup e horário.

- [ ] **0.5** **BLOQUEANTE** Confirmar que o banco copiado foi restaurado em
  ambiente isolado e que a aplicação piloto aponta exclusivamente para ele.
  Evidência: `DATABASE_URL` mascarada e resultado de uma consulta simples.

---

## 1. Verificação estática

Executar na raiz do projeto:

```bash
npx tsc --noEmit -p tsconfig.app.json
npm test -- --run
cd backend && npm test
cd .. && DATABASE_URL='postgresql://user:password@localhost:5432/psicogest' npx --prefix backend prisma validate
```

- [ ] **1.1** TypeScript sem erros.
  Evidência: saída do comando.

- [ ] **1.2** Testes automatizados de frontend passam.
  Evidência: quantidade de testes.

- [ ] **1.3** Testes automatizados de backend passam.
  Evidência: quantidade de testes.

- [ ] **1.4** Schema Prisma válido.
  Evidência: mensagem `schema is valid`.

- [ ] **1.5** **BLOQUEANTE** Nenhum comando acima apresentou erro.

---

## 2. Migração no banco piloto

Aplicar no banco copiado:

```bash
cd backend
npx prisma migrate deploy
npx prisma generate
```

- [ ] **2.1** Migration aplicada com sucesso.
  Evidência: saída do `migrate deploy`.

- [ ] **2.2** Prisma Client gerado com sucesso.
  Evidência: saída do `prisma generate`.

- [ ] **2.3** Tabelas novas existem.

SQL:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'clinic_members',
    'patient_clinic_links',
    'compensation_agreements',
    'payout_runs',
    'payout_items',
    'invoices',
    'audit_events',
    'notifications'
  )
order by table_name;
```

Resultado esperado: 8 linhas.

Evidência: output.

- [ ] **2.4** Colunas de escopo existem.

```sql
select table_name, column_name, column_default
from information_schema.columns
where table_schema = 'public'
  and column_name in ('scope', 'mode')
order by table_name, column_name;
```

Resultado esperado: `mode` em `organizations`; `scope` em `patients`,
`appointments`, `records`, `payments`, `accounts`.

Evidência: output.

---

## 3. Estado antes da ativação

Executar antes de qualquer dado clínico:

```sql
select count(*) as organizacoes_clinica
from organizations
where mode <> 'individual';

select 'patients' as tabela, scope, count(*)
from patients group by scope
union all
select 'appointments', scope, count(*)
from appointments group by scope
union all
select 'records', scope, count(*)
from records group by scope
union all
select 'payments', scope, count(*)
from payments group by scope
union all
select 'accounts', scope, count(*)
from accounts group by scope;

select count(*) as vinculos from clinic_members;
select count(*) as fechamentos from payout_runs;
```

- [ ] **3.1** Nenhuma organização estava em modo clínico antes do piloto.
  Resultado esperado: `organizacoes_clinica = 0`.

- [ ] **3.2** Todos os registros antigos são `private`.
  Resultado esperado: nenhuma linha com `scope = clinic`.

- [ ] **3.3** Nenhum vínculo clínico pré-existente.

- [ ] **3.4** Nenhum fechamento pré-existente.

- [ ] **3.5** **BLOQUEANTE** Se qualquer verificação acima falhar, parar e
  investigar antes de ativar.

Evidência: output completo das consultas.

---

## 4. Dados de teste

Criar no ambiente piloto:

- [ ] **4.1** Organização piloto com CNPJ fictício.
  Registrar ID: ______________________

- [ ] **4.2** Usuário administrador da organização.
  Registrar ID: ______________________

- [ ] **4.3** Profissional clínico A.
  Registrar ID: ______________________

- [ ] **4.4** Profissional clínico B.
  Registrar ID: ______________________

- [ ] **4.5** Secretaria.
  Registrar ID: ______________________

- [ ] **4.6** Financeiro.
  Registrar ID: ______________________

- [ ] **4.7** Supervisor, com vínculo de supervisão sobre o profissional A.
  Registrar ID: ______________________

- [ ] **4.8** Segunda organização/tenant para teste de isolamento.
  Registrar ID: ______________________

- [ ] **4.9** Pacientes fictícios:
  - particular do profissional A;
  - clínico do profissional A;
  - clínico do profissional B.
  Registrar IDs: ______________________

- [ ] **4.10** Consultas clínicas pagas e concluídas para A e B.
  Registrar IDs: ______________________

- [ ] **4.11** Uma consulta particular paga e concluída para A.

- [ ] **4.12** Uma consulta clínica cancelada e uma faltada sem cobrança.

Evidência: lista de IDs.

---

## 5. Ativação da clínica

Na interface `/clinica` ou via API com o administrador piloto:

```bash
curl -X POST "$API/clinic/activate" \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"mode":"hybrid"}'
```

- [ ] **5.1** Organização passou para `hybrid`.
  Evidência: JSON retornado.

- [ ] **5.2** Administrador recebeu vínculo ativo `admin`.

- [ ] **5.3** Modo aparece corretamente na tela `/clinica`.
  Evidência: captura de tela.

SQL de conferência:

```sql
select id, name, mode from organizations where id = '<org-piloto>';
select user_id, role, status from clinic_members where organization_id = '<org-piloto>';
```

- [ ] **5.4** Banco confere com a interface.
  Evidência: output.

---

## 6. Vínculos e permissões

- [ ] **6.1** Criar vínculos clínicos ativos para A, B, secretaria, financeiro e
  supervisor.
  Evidência: IDs dos vínculos.

- [ ] **6.2** Configurar supervisor do profissional A no vínculo de A.
  Evidência: JSON do vínculo.

- [ ] **6.3** Confirmar que o vínculo do profissional B não possui o mesmo
  supervisor.

- [ ] **6.4** Suspender temporariamente o profissional B e tentar acessar a
  agenda clínica com o login dele.
  Resultado esperado: **403**.

- [ ] **6.5** Reativar o profissional B.
  Resultado esperado: acesso normal à própria agenda clínica.

- [ ] **6.6** Encerrar um vínculo de teste e confirmar que o acesso clínico é
  bloqueado sem apagar histórico.
  Evidência: `/auditoria` mostra `clinic.member_status_changed`.

- [ ] **6.7** **BLOQUEANTE** Vínculo suspenso/encerrado não consegue acessar
  dados clínicos.

---

## 7. Isolamento particular × clínica

Com cada usuário, executar as verificações abaixo.

### 7.1 Profissional A

- [ ] Vê o próprio paciente particular em `/pacientes?scope=private`.
- [ ] Não vê o paciente particular de B.
- [ ] Vê apenas seus pacientes clínicos autorizados em
  `/pacientes?scope=clinic`.
- [ ] Não vê o paciente clínico de B sem compartilhamento.
- [ ] Acessa o próprio prontuário clínico em `/prontuarios?scope=clinic`.
- [ ] Não acessa o prontuário clínico de B.
- [ ] Vê somente o próprio demonstrativo em `/repasses`.

Evidência: capturas ou respostas HTTP.

### 7.2 Secretaria

- [ ] Vê agenda clínica em `/agenda?scope=clinic`.
- [ ] Filtra agenda por profissional A e B.
- [ ] Consegue criar e cancelar agendamento clínico.
- [ ] Recebe notificação interna do agendamento criado.
- [ ] Não consegue abrir `/prontuarios?scope=clinic`.
  Resultado esperado: **403**.
- [ ] Não vê valores de repasse em `/repasses`.

### 7.3 Financeiro

- [ ] Vê contas e pagamentos clínicos em `/financeiro?scope=clinic`.
- [ ] Não vê conteúdo de prontuário.
- [ ] Consegue criar acordos e gerar fechamento.
- [ ] Não vê finanças particulares de A, exceto permissão explícita já existente.

### 7.4 Supervisor

- [ ] Acessa prontuário clínico do profissional A.
- [ ] Não acessa prontuário clínico do profissional B.
- [ ] Cada acesso gera evento `record.read` em `/auditoria`.

### 7.5 Segundo tenant

- [ ] Usuário da segunda organização tenta acessar paciente, consulta,
  prontuário e fechamento da organização piloto por ID direto.
  Resultado esperado: **404/403** para todos.
- [ ] Tentativa de criar consulta com `professionalId` do piloto falha.
  Resultado esperado: **403**.

- [ ] **7.6** **BLOQUEANTE** Todas as negações acima aconteceram no backend,
  não apenas por ocultação de menu.

---

## 8. Compartilhamento de paciente

- [ ] **8.1** Compartilhar o paciente clínico de A com B por
  `/api/clinic/patient-links`.

- [ ] **8.2** B passa a ver o paciente e o histórico autorizado.

- [ ] **8.3** Definir `validUntil` no passado e confirmar que B perde o acesso.

- [ ] **8.4** Evento `clinic.patient_shared` aparece em `/auditoria`.

Evidência: JSON do vínculo e captura da auditoria.

---

## 9. Regras de cobrança e repasse

- [ ] **9.1** Criar acordo percentual de 60% para A com vigência atual.
- [ ] **9.2** Criar acordo fixo para B com vigência atual.
- [ ] **9.3** Gerar prévia do mês em `/repasses`.
- [ ] **9.4** Conferir que a consulta clínica paga de A entrou com 60%.
- [ ] **9.5** Conferir que a consulta clínica paga de B entrou pelo valor fixo.
- [ ] **9.6** Conferir que a consulta particular de A **não entrou**.
- [ ] **9.7** Conferir que canceladas e faltadas **não entraram**.
- [ ] **9.8** Conferir que nenhuma sessão de outra organização entrou.
- [ ] **9.9** Conferir que os totais do fechamento batem com a soma dos itens.

SQL auxiliar:

```sql
select professional_id, count(*), sum(gross_amount), sum(net_amount)
from payout_items
where run_id = '<run-id>'
group by professional_id;
```

Evidência: captura da tela e output SQL.

- [ ] **9.10** Registrar ajuste com justificativa em um item.
- [ ] **9.11** Conferir evento `payout.item_adjusted` em `/auditoria`.
- [ ] **9.12** Revisar fechamento.
- [ ] **9.13** Aprovar fechamento.
- [ ] **9.14** Confirmar que nova prévia para o mesmo mês é bloqueada
  com **409**.
- [ ] **9.15** Pagar fechamento.
- [ ] **9.16** Confirmar que itens e totais permanecem após pagamento.
- [ ] **9.17** **BLOQUEANTE** Nenhum dado particular ou de outro tenant entrou
  no fechamento.

---

## 10. Notificações

- [ ] **10.1** Profissional A recebe notificação de novo agendamento clínico.
- [ ] **10.2** Profissional A recebe notificação de fechamento aprovado.
- [ ] **10.3** Notificações aparecem apenas para o destinatário.
- [ ] **10.4** Marcar como lida e confirmar persistência.
- [ ] **10.5** Não há duplicidade para um único evento.

Evidência: capturas.

---

## 11. Auditoria

Confirmar presença destes eventos em `/auditoria`:

- [ ] `clinic.activated`
- [ ] `clinic.member_updated`
- [ ] `clinic.member_status_changed`
- [ ] `clinic.patient_shared`
- [ ] `patient.created`
- [ ] `appointment.created`
- [ ] `appointment.cancelled`
- [ ] `record.read`
- [ ] `record.created`
- [ ] `record.updated`
- [ ] `payout.agreement_created`
- [ ] `payout.run_generated`
- [ ] `payout.item_adjusted`
- [ ] `payout.run_approved`
- [ ] `payout.run_paid`

- [ ] **11.1** Cada evento possui ação, tipo, alvo e timestamp.
- [ ] **11.2** Usuário sem permissão de auditoria recebe **403**.

Evidência: captura ou exportação.

---

## 12. Regressão individual

Executar com Ricardo e Bruna no modo `hybrid`:

- [ ] **12.1** Login normal.
- [ ] **12.2** Visualizar pacientes particulares antigos.
- [ ] **12.3** Criar e editar paciente particular.
- [ ] **12.4** Criar, reagendar e cancelar consulta particular.
- [ ] **12.5** registrar comparecimento, falta e reverter status.
- [ ] **12.6** Criar prontuário particular.
- [ ] **12.7**Gerar fatura e conta a receber particular.
- [ ] **12.8** Baixar/estornar conta particular.
- [ ] **12.9** Usar dashboard e relatórios.
- [ ] **12.10** Usar portal do paciente.
- [ ] **12.11** Usar teleatendimento e IA em dados particulares.
- [ ] **12.12** Confirmar que nada apareceu como `scope = clinic`.

SQL:

```sql
select count(*) as clinicados
from patients
where scope = 'clinic';
```

Resultado esperado para Ricardo/Bruna: zero, salvo pacientes criados
explicitamente como clínicos no piloto.

Evidência: capturas.

---

## 13. Reversão

Não executar em produção sem decisão formal.

- [ ] **13.1** Definir `Organization.mode = individual` na organização piloto.
- [ ] **13.2** Confirmar que vínculos clínicos deixam de autorizar acesso.
- [ ] **13.3** Confirmar que dados particulares continuam intactos.
- [ ] **13.4** Se for necessário remover estrutura, executar o rollback em
  [MODO_CLINICA_MODELO_DADOS.md](./MODO_CLINICA_MODELO_DADOS.md) somente no
  banco copiado.

Evidência: output antes/depois.

---

## 14. Aprovação final

- [ ] **14.1** Ricardo validou fluxo administrativo e financeiro.
  Assinatura/data: ______________________

- [ ] **14.2** Bruna validou isolamento e fluxo clínico.
  Assinatura/data: ______________________

- [ ] **14.3** Secretaria validou agenda e contato.
  Assinatura/data: ______________________

- [ ] **14.4** Financeiro validou contas, acordos e fechamento.
  Assinatura/data: ______________________

- [ ] **14.5** Profissional piloto validou agenda, prontuário e demonstrativo.
  Assinatura/data: ______________________

- [ ] **14.6** Supervisor validou acesso limitado e trilha.
  Assinatura/data: ______________________

- [ ] **14.7** Responsável técnico validou migração, rollback e logs.
  Assinatura/data: ______________________

- [ ] **14.8** **BLOQUEANTE** Todos os itens BLOQUEANTE estão concluídos.

- [ ] **14.9** **BLOQUEANTE** Aprovação registrada para ativação em produção.

Após aprovação, atualizar o roteiro marcando a Etapa 8 como concluída e
registrando data e evidência.

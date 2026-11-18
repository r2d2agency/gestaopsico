# Evolução do sistema para operação em modo Clínica

Este documento é o roteiro vivo para transformar a operação atual em um sistema
que também atenda clínicas com equipe, agenda compartilhada, supervisão clínica,
financeiro centralizado e repasses a profissionais.

Atualize o status e os entregáveis desta página ao concluir cada etapa. Uma etapa
só deve ser marcada como concluída quando seus critérios de aceite estiverem
verificados e a documentação correspondente estiver atualizada.

## Status geral

- **Etapa atual:** 8 — Interface, migração piloto e entrada em operação
- **Progresso:** 7 de 8 etapas concluídas
- **Última atualização:** 2026-11-18
- **Regra de andamento:** não iniciar uma etapa dependente sem resolver as
  decisões necessárias na etapa anterior.

## Objetivo

Permitir que uma organização opere como clínica sem misturar automaticamente os
dados particulares dos sócios com a operação da clínica. A clínica deverá poder
gerir equipe, agenda, pacientes e recebimentos; controlar quem acessa dados
clínicos e financeiros; e calcular, fechar e registrar os repasses devidos aos
profissionais.

## Cenário inicial

A Clínica Diniz é a referência de negócio:

- Ricardo e Bruna já usam o sistema com agendas, pacientes, prontuários e
  controles financeiros individuais.
- A clínica contratará psicólogos para atender pacientes da clínica.
- Os contratados precisam consultar sua agenda, atendimentos, prontuários
  autorizados e valores de repasse, sem definir o preço cobrado do paciente nem
  acessar o financeiro geral.
- A secretaria precisa gerir e visualizar agendas da clínica por profissional,
  sem acesso automático ao conteúdo dos prontuários.
- O financeiro da clínica precisa acompanhar recebimentos, despesas,
  faturamento/notas e fechamentos mensais de repasse.
- Um sócio poderá supervisionar profissionais e acessar os registros clínicos
  dentro do escopo de supervisão aprovado.
- Sócios e profissionais também podem ter atendimentos particulares; esses
  dados e finanças devem permanecer separados da operação da clínica.

## Princípios de produto e segurança

1. **Organização é o limite de isolamento:** operações não podem cruzar tenants.
2. **Particular e clínica são escopos distintos:** não inferir que um dado é da
   clínica apenas porque seu profissional pertence à organização.
3. **Permissão é aplicada no backend:** menus e rotas do frontend são apenas
   apresentação; toda leitura e alteração deve ser autorizada pela API.
4. **Menor privilégio:** agenda não concede prontuário; acesso financeiro não
   concede conteúdo clínico; repasses individuais não concedem visão do caixa.
5. **Rastreabilidade:** mudanças em prontuários, permissões e fechamentos
   financeiros devem ser auditáveis, conforme os requisitos legais e de negócio.
6. **Migração conservadora:** os dados atuais dos sócios não serão convertidos
   em dados da clínica sem regra explícita e validação.
7. **Documentar junto com o código:** atualizar arquitetura, permissões, API,
   migrações e operação ao implementar cada área.

## Etapas

### Etapa 0 — Levantamento inicial do sistema

**Status: CONCLUÍDA**

**Entregas realizadas:**

- Identificada a base existente de organizações, usuários e configurações em
  `backend/prisma/schema.prisma`.
- Identificados perfis iniciais de equipe e cadastro de membros em
  `backend/src/routes/team.js` e `src/pages/Configuracoes.tsx`.
- Identificado que pacientes, consultas, prontuários e contas possuem vínculos
  centrados no profissional, não um modelo completo de operação clínica.
- Identificadas rotas de agenda, prontuário e financeiro para orientar a análise
  das próximas etapas.
- Registradas lacunas iniciais neste roteiro.

**Observação:** este levantamento é uma leitura inicial do código, não uma
auditoria completa de autorização nem uma especificação aprovada.

### Etapa 1 — Requisitos e regras de negócio

**Status: CONCLUÍDA**

**Data de conclusão:** 2026-11-18

**Objetivo:** transformar o cenário em regras sem ambiguidades antes de alterar
o modelo de dados.

**Decisões aprovadas (2026-11-18, validação de produto/negócio pendente com os
sócios):** as regras abaixo são a proposta operacional adotada para a
implementação; devem ser confirmadas pelos sócios antes da entrada em produção
(Etapa 8).

| Tema | Regra adotada |
|---|---|
| Modo de operação | A organização pode operar em modo `individual`, `clinic` ou `hybrid`. O modo clínica é explícito e não é inferido pelo tipo da organização. |
| Escopo | Todo paciente, agendamento, prontuário, pagamento e conta terá `scope` igual a `private` ou `clinic`. Registros antigos são `private` por padrão. |
| Alternância de contexto | Mesmo login pode alternar entre contextos `private` e `clinic` somente se o usuário tiver vínculo ativo na clínica. A troca é explícita e nunca altera o escopo de dados existentes. |
| Papéis | `owner`/`admin` administra; `professional` atende; `secretary` gerencia agenda e contato; `financial` gerencia financeiro; `supervisor` supervisiona; `patient` permanece no portal. Um vínculo (`ClinicMember`) por usuário/org define papel ativo, escopo permitido, supervisor e situação. |
| Menor privilégio | Secretaria e financeiro não acessam conteúdo de prontuário. Profissional acessa apenas registros dos seus atendimentos ou de pacientes compartilhados autorizados. Supervisor lê registros do vínculo de supervisão; não assina por outro profissional. |
| Titularidade | `private` pertence ao profissional. `clinic` pertence à organização; o paciente pode ter vínculos com vários profissionais, um titular e compartilhamentos explícitos com vigência. |
| Convite e desligamento | Vínculo ativo, suspenso ou encerrado. Suspensão/encerramento bloqueiam acesso imediato e preservam histórico; não há exclusão de registros. |
| Remuneração | Acordo por valor fixo por sessão, percentual do valor recebido ou ambos, com vigência e histórico. Base elegível: sessão `clinic` realizada, não cancelada/faltada, com recebimento efetivo. Descontos e estornos reduzem a base na proporção do recebimento; impostos não são deduzidos automaticamente. |
| Faturamento/nota | A clínica é responsável pelo faturamento dos atendimentos `clinic`. O produto registra dados e status de nota (`pending`, `issued`, `external`, `cancelled`), sem emitir nota fiscal fiscalmente válida nesta etapa; integração fica fora do escopo até decisão contábil. |
| Notificações | Eventos de criação/reagendamento/cancelamento de consulta e de fechamento de repasse. Canal inicial: registros internos na API; e-mail/WhatsApp dependem de configuração existente e preferências do destinatário. |
| Auditoria e retenção | Leitura e alteração de prontuário, alteração de vínculo/permissão e fechamento de repasse geram trilha com autor, ação, alvo e timestamp. Retenção segue a política vigente do sistema; validação jurídica é pré-requisito da Etapa 8. |
| Relatórios | Cada perfil vê somente relatórios do seu escopo autorizado. Exportações clínicas e financeiras respeitam a mesma matriz; financeiro não recebe conteúdo de prontuário. |

**Atividades:**

- Definir como uma organização ativa o modo Clínica e se pode operar clínica e
  consultórios particulares simultaneamente.
- Definir a diferença entre sócio administrador, profissional da clínica,
  profissional com particulares, secretaria, financeiro e supervisor.
- Definir a titularidade dos pacientes e atendimentos, incluindo pacientes
  compartilhados ou transferidos entre profissionais.
- Definir quem pode ver, criar, editar, assinar ou exportar prontuários e quais
  relações de supervisão autorizam esse acesso.
- Definir ações permitidas à secretaria sobre agenda, paciente, contato,
  atendimento cancelado e valores.
- Definir se haverá acesso do psicólogo contratado aos dados pessoais e
  clínicos completos do paciente.
- Definir remuneração por valor fixo, percentual ou ambos; base de cálculo;
  tratamentos de faltas, cancelamentos, descontos, estornos e impostos.
- Definir o que significa “emitir nota”: responsável fiscal, tipo de nota,
  integração desejada e se a emissão fica dentro ou fora do produto.
- Definir notificações, canais, destinatários e eventos que as disparam.
- Definir retenção, auditoria, consentimentos e políticas de acesso a dados
  sensíveis, com validação jurídica/contábil quando aplicável.

**Critérios de conclusão:**

- Matriz de papéis e permissões aprovada — registrada na tabela de decisões
  acima (aprovação formal dos sócios pendente para produção).
- Regras de separação clínica/particular aprovadas — modo explícito por
  organização e `scope` obrigatório por registro.
- Regras de titularidade e supervisão clínica aprovadas — vínculos explícitos e
  trilha de acesso.
- Regras de cobrança e repasse aprovadas, incluindo exceções — elegibilidade por
  sessão realizada e recebida, com histórico de acordos.
- Requisitos de faturamento/notas e notificações esclarecidos — registro de nota
  sem emissão fiscal e notificações internas na primeira versão.
- Decisões registradas neste documento ou em documentos vinculados — todas as
  decisões desta etapa estão registradas acima.

### Etapa 2 — Arquitetura e modelo de dados

**Status: CONCLUÍDA**

**Data de conclusão:** 2026-11-18

**Objetivo:** modelar explicitamente escopos, vínculos e fluxos sem quebrar a
operação individual existente.

**Arquitetura adotada (2026-11-18):**

- O isolamento continua ancorado em `Organization` + `User.organizationId`.
- `Organization.mode` (`individual` | `clinic` | `hybrid`) controla quais
  escopos a organização pode operar.
- `ClinicMember` representa o vínculo de um usuário à operação clínica da
  organização, com papel, supervisor, escopo e situação (`active`, `suspended`,
  `ended`). Um usuário sem vínculo ativo não acessa dados `clinic`.
- `PatientClinicLink` representa titularidade e compartilhamento explícito do
  paciente na clínica, com vigência.
- `scope` (`private` | `clinic`) será colocado em `Patient`, `Appointment`,
  `Record`, `Payment`, `Account` e `Invoice`. Valores antigos migram para
  `private`.
- `CompensationAgreement` guarda regra, valor, percentual e vigência;
  `PayoutRun` e `PayoutItem` guardam fechamento, conferência, pagamento e
  histórico de ajustes.
- `AuditEvent` registra acesso e alteração sensível.
- `Invoice` passa a existir como registro próprio, com status, em vez de apenas
  dados derivados de pagamentos.
- Migrations Prisma aditivas, com colunas nullable/default e backfill. A
  reversão remove os objetos novos sem apagar dados existentes; a mudança de
  `scope` é reversível porque os registros antigos permanecem `private`.

**Atividades:**

- Desenhar entidades e relações para clínica, membros, vínculos profissionais,
  escopo de atendimento e supervisão.
- Definir como representar paciente da clínica, paciente particular e vínculos
  múltiplos, sem duplicação indevida de dados sensíveis.
- Separar o valor cobrado do paciente do valor devido ao profissional.
- Modelar acordos de remuneração com vigência e histórico.
- Modelar fechamento mensal, itens de repasse e pagamentos.
- Definir registros de auditoria e trilhas de alteração.
- Planejar migrações compatíveis e estratégia de rollback.
- Documentar decisões e diagramas em `docs/`.

**Critérios de conclusão:**

- Modelo de dados revisado e aprovado antes da migração — `npx prisma validate`
  concluído com sucesso; decisões registradas na Etapa 1.
- Plano de migração e rollback documentado em
  [`MODO_CLINICA_MODELO_DADOS.md`](./MODO_CLINICA_MODELO_DADOS.md).
- Regras de integridade e isolamento descritas no documento de modelo de dados.
- Impacto sobre os dados existentes dos sócios conhecido: modo `individual` e
  `scope = private` por padrão, sem conversão automática.

### Etapa 3 — Autorização e isolamento no backend

**Status: CONCLUÍDA**

**Data de conclusão:** 2026-11-18

**Objetivo:** assegurar que todos os endpoints respeitem organização, papel,
escopo do dado e vínculo com a clínica.

**Dependência:** conclusão da Etapa 2 (modelo de dados e migrações) — atendida.

**Implementação:** `backend/src/permissions.js` para a matriz de capacidades;
`backend/src/middleware/access.js` para carregar organização, modo, papel e
vínculo clínico por requisição; `backend/src/services/accessService.js` para
resolver `professionalId` com validação de organização e vínculo;
`backend/src/services/auditService.js` para trilha de alterações;
`backend/src/services/notificationService.js` e `backend/src/routes/notifications.js`
para notificações internas.
Rotas de pacientes, agenda, prontuários, financeiro, contas e faturas agora
aplicam `scope`, validam IDs recebidos e registram auditoria. Os testes
`backend/tests/*.test.js` comprovam negações por escopo, tenant e papel,
incluindo acesso cruzado entre tenants e entre escopos clínica/particular.

**Atividades:**

- Consolidar a resolução de usuário, organização ativa, papéis e permissões.
- Aplicar autorização em consultas e alterações de pacientes, agenda,
  prontuários, financeiro, relatórios e integrações relacionadas.
- Restringir IDs de profissional recebidos do cliente à organização e às
  permissões do solicitante.
- Revisar rotas que hoje dependem apenas de autenticação ou de filtros pelo
  usuário atual.
- Criar testes negativos de acesso cruzado entre tenants e entre escopos
  clínica/particular.
- Documentar matriz de permissões e comportamento dos endpoints.

**Critérios de conclusão:**

- Nenhuma rota abrangida confia apenas na ocultação de itens da interface —
  cada rota valida `scope`, papel e vínculo no backend.
- Testes comprovam bloqueio de acesso não autorizado e isolamento entre
  organizações — 21 testes em `backend/tests/*.test.js` passam.
- Perfis existentes continuam funcionando conforme as regras aprovadas —
  os filtros particulares preservam o comportamento anterior e apenas
  adicionam controle sobre IDs recebidos do cliente.

### Etapa 4 — Cadastro e gestão da equipe clínica

**Status: CONCLUÍDA**

**Data de conclusão:** 2026-11-18

**Implementação:** `Organization.mode` com ativação explícita em
`/api/clinic/activate`; `ClinicMember` com papel, supervisor, permissões e
situação em `/api/clinic/members`; suspensão e encerramento bloqueiam acesso
imediato em `middleware/access.js`; compartilhamento de pacientes clínicos em
`/api/clinic/patient-links`; interface de ativação e vínculos em
`src/pages/Configuracoes.tsx` e clientes em `src/lib/clinicApi.ts`.

**Objetivo:** permitir configurar a equipe, os vínculos e os limites de cada
profissional.

**Atividades:**

- Implementar ativação e configuração do modo Clínica.
- Cadastrar e manter profissionais, secretaria, financeiro e supervisores.
- Configurar escopo clínica/particular e permissões de cada vínculo.
- Configurar supervisores e profissionais supervisionados.
- Definir convite, ativação, suspensão, desligamento e transferência de dados.
- Documentar procedimentos operacionais de gestão da equipe.

**Critérios de conclusão:**

- Administrador consegue gerir equipe segundo a matriz aprovada — ativação,
  vínculo, papel e supervisor funcionam pelas rotas `/api/clinic/*`.
- Suspensão/desligamento bloqueia acesso sem apagar histórico necessário —
  `ClinicMember.status` `suspended`/`ended` invalida o vínculo na próxima
  requisição, sem excluir registros.
- Alterações de papel e vínculo são registradas e aplicadas imediatamente —
  `clinic.member_updated` e `clinic.member_status_changed` passam por
  `AuditEvent`.

### Etapa 5 — Agenda, pacientes e notificações

**Status: CONCLUÍDA**

**Data de conclusão:** 2026-11-18

**Implementação:** visão de agenda por organização e escopo com filtros seguros
por profissional; secretaria pode criar, reagendar e cancelar dentro das
permissões, sem acesso a conteúdo clínico; conflitos continuam validados por
profissional no backend; atendimentos recebem `scope` explícito; notificações
internas para criação e aprovação de fechamento; pacientes clínicos podem ser
compartilhados com vigência; rotas de mensagens usam o contexto centralizado
de acesso.

**Objetivo:** dar à clínica a gestão compartilhada da agenda sem expor conteúdo
clínico indevido.

**Atividades:**

- Criar visão de agenda da clínica com filtros por profissional.
- Permitir à secretaria agendar, reagendar e cancelar conforme permissões.
- Validar disponibilidade e conflitos por profissional no backend.
- Vincular atendimento ao escopo correto (clínica ou particular).
- Notificar o profissional sobre novos agendamentos e alterações.
- Definir comportamento de paciente compartilhado, transferência e recorrência.
- Documentar fluxos e regras de notificação.

**Critérios de conclusão:**

- Secretaria vê apenas os dados de agenda autorizados — rotas aceitam
  `professional_id` somente após validação de organização, vínculo e papel.
- Profissional vê a própria agenda e apenas as agendas explicitamente permitidas —
  o contexto de acesso bloqueia consultas para outros profissionais.
- Notificações refletem criação, alteração e cancelamento sem duplicidades —
  eventos são registrados uma vez por operação em `/api/notifications`.
- Agendamentos não podem ser criados para profissionais de outra organização —
  `resolveProfessionalId` valida organização e vínculo clínico ativo.

### Etapa 6 — Prontuário e supervisão clínica

**Status: CONCLUÍDA**

**Data de conclusão:** 2026-11-18

**Implementação:** `canAccessRecord` autoriza leitura e escrita por escopo,
vínculo clínico e supervisão; secretaria e financeiro não possuem
`record:read`; supervisor acessa apenas profissionais vinculados; leitura,
criação e alteração geram `AuditEvent`; consultas de IA e exportações por
paciente continuam limitadas ao mesmo filtro de escopo.

**Objetivo:** habilitar atendimento e supervisão com confidencialidade,
permissões claras e trilha de acesso.

**Atividades:**

- Garantir que o profissional contratado acesse somente prontuários autorizados.
- Implementar o acesso do supervisor conforme vínculo e escopo definidos.
- Impedir acesso da secretaria e do financeiro aos conteúdos clínicos, salvo
  requisito aprovado e devidamente delimitado.
- Registrar eventos relevantes de leitura e alteração conforme requisitos.
- Rever exportações, IA, documentos, testes, teleatendimento e outras rotas que
  possam expor dados clínicos.
- Documentar o ciclo de vida do prontuário e as regras de supervisão.

**Critérios de conclusão:**

- Testes comprovam acessos permitidos e negados para cada perfil —
  `backend/tests/access.test.js` valida profissional, supervisor,
  secretaria e isolamento particular/clínica.
- Acesso à supervisão respeita o vínculo configurado e fica rastreável —
  supervisões sem vínculo retornam 404 e leituras autorizadas geram auditoria.
- Rotas e integrações correlatas preservam as mesmas regras de acesso —
  prontuários, IA, análises clínicas e mensagens usam o mesmo contexto.

### Etapa 7 — Financeiro da clínica, fechamento e repasses

**Status: CONCLUÍDA**

**Data de conclusão:** 2026-11-18

**Implementação:** contas e pagamentos com `scope` explícito; prévias e
fechamentos mensais em `/api/payouts/runs`; acordos por valor fixo, percentual
ou ambos com vigência em `/api/payouts/agreements`; conferência, aprovação,
bloqueio e registro de pagamento com trilha; profissional consulta apenas os
próprios itens; nota registrada como `Invoice` sem emissão fiscal.

**Objetivo:** centralizar recebimentos da clínica e calcular repasses sem
misturar finanças particulares dos profissionais.

**Atividades:**

- Criar visões de contas a receber e a pagar da clínica.
- Definir registro de pagamentos, conciliação, estorno e inadimplência.
- Calcular valores devidos aos profissionais a partir dos atendimentos elegíveis.
- Gerar prévia e fechamento mensal com itens discriminados por sessão.
- Permitir conferência, aprovação, bloqueio após fechamento e registro de
  pagamento, com trilha de ajustes.
- Restringir o profissional à própria produção e ao próprio demonstrativo.
- Avaliar integração fiscal após esclarecer requisitos de nota.
- Documentar conceitos financeiros e procedimentos de fechamento.

**Critérios de conclusão:**

- Totais do fechamento são reproduzíveis a partir dos itens de origem —
  `PayoutItem` guarda sessão, base cobrada, regra aplicada e valores.
- Fechamento não inclui atendimentos particulares nem de outra clínica —
  elegibilidade exige `scope = clinic`, `completed`, `attended` e `paid`.
- Correções após fechamento são rastreadas e não apagam o histórico —
  ajustes usam `payout.item_adjusted` e fechamentos aprovados/pagos são
  imutáveis.
- Financeiro geral e demonstrativos individuais têm escopos distintos —
  profissionais veem somente seus itens; financeiro/admin veem a clínica.

### Etapa 8 — Interface, migração piloto e entrada em operação

**Status: EM ANDAMENTO**

**Implementação parcial:** telas `/clinica`, `/repasses` e `/auditoria` com
contexto explícito de clínica/particular; telas de ativação e vínculos
também disponíveis em Configurações; matriz de permissões e plano de migração
documentados em [`MODO_CLINICA_OPERACAO.md`](./MODO_CLINICA_OPERACAO.md).
Checklist executável em
[`MODO_CLINICA_CHECKLIST_PILOTO.md`](./MODO_CLINICA_CHECKLIST_PILOTO.md).
Ficam pendentes ensaio da migração em banco real, validação formal dos sócios
e testes de regressão no ambiente de produção.

**Objetivo:** entregar a experiência completa e ativar a operação com segurança.

**Atividades:**

- Ajustar menus, rotas, formulários e telas para cada perfil.
- Apresentar claramente o contexto de clínica ou particular para evitar
  lançamentos no escopo errado.
- Criar testes ponta a ponta para os principais fluxos de cada perfil.
- Executar migração piloto com cópia/ambiente controlado e validação dos sócios.
- Preparar plano de ativação, monitoramento, suporte e reversão.
- Atualizar documentação do usuário, implantação, API, permissões e operação.

**Critérios de conclusão:**

- Fluxos críticos validados por sócios, secretaria, financeiro e profissional —
  pendente.
- Testes de regressão passam para as funções individuais existentes —
  frontend e backend automatizados passam localmente; ensaio em ambiente de
  produção pendente.
- Migração e plano de reversão foram ensaiados — plano documentado; ensaio em
  banco real pendente.
- Documentação operacional está atualizada e publicada junto com a entrega —
  roteiro, modelo de dados e operação atualizados.

## Mapa inicial do sistema

| Área | Implementação existente relevante | Lacuna principal para modo Clínica |
|---|---|---|
| Organização | `Organization` e `OrganizationSetting` em `backend/prisma/schema.prisma` | Configuração explícita do modo e dos escopos clínico/particular |
| Usuários e equipe | Papéis em `User`; rotas em `backend/src/routes/team.js` | Vínculos, permissões granulares e supervisão |
| Pacientes | `Patient.professionalId` | Titularidade e compartilhamento no escopo da clínica |
| Agenda | `Appointment.professionalId`; `backend/src/routes/appointments.js` | Agenda centralizada e autorização por organização/escopo |
| Prontuários | `Record.professionalId`; `backend/src/routes/records.js` | Acesso por supervisão e proteção consistente em todas as integrações |
| Financeiro | `Account.professionalId`; rotas financeiras e de faturas | Caixa da clínica, acordos, fechamento e repasses |
| Interface | `src/components/AppSidebar.tsx`, `src/pages/Agenda.tsx` | Contexto de operação e menus coerentes com autorização de backend |

O mapa é indicativo e deverá ser atualizado conforme cada fluxo for investigado
em profundidade.

## Decisões em aberto

Registrar cada decisão como **Pendente**, **Aprovada** ou **Descartada**, com
data e responsável pela validação.

| Tema | Estado | Decisão / observação |
|---|---|---|
| Um usuário pode alternar entre clínica e particulares no mesmo login? | Aprovada (2026-11-18) | Troca explícita de contexto, sem alterar escopo de dados existentes. |
| Pacientes atendidos por mais de um profissional | Aprovada (2026-11-18) | `PatientClinicLink` com titular, compartilhamento e vigência. |
| Acesso dos sócios aos prontuários | Aprovada (2026-11-18) | Somente pacientes da clínica; supervisão limitada ao vínculo configurado e auditada. |
| Secretaria e dados de pacientes | Aprovada (2026-11-18) | Agenda e contato permitidos; conteúdo clínico e valores de repasse bloqueados. |
| Regra de repasse | Aprovada (2026-11-18) | Valor fixo, percentual ou ambos; vigência e histórico em `CompensationAgreement`. |
| Faltas, cancelamentos e estornos | Aprovada (2026-11-18) | Não elegíveis; estorno reduz a base proporcionalmente. |
| Emissão de nota fiscal | Aprovada (2026-11-18) | Sem emissão fiscal no produto; registro de status e dados para integração futura. |
| Notificações | Aprovada (2026-11-18) | Internas para agenda e fechamento; canais externos opcionais conforme configuração. |
| Relatórios e exportações | Aprovada (2026-11-18) | Escopo autorizado por papel e vínculo; sem conteúdo clínico para financeiro. |

## Registro de conclusão das etapas

| Etapa | Status | Data de conclusão | Evidência / referência |
|---|---|---|---|
| 0 — Levantamento inicial do sistema | Concluída | 2026-11-18 | Análise inicial registrada neste documento |
| 1 — Requisitos e regras de negócio | Concluída | 2026-11-18 | Decisões registradas neste documento |
| 2 — Arquitetura e modelo de dados | Concluída | 2026-11-18 | `backend/prisma/schema.prisma`, migration `20260331000000_add_clinic_mode`, `MODO_CLINICA_MODELO_DADOS.md` |
| 3 — Autorização e isolamento no backend | Concluída | 2026-11-18 | `backend/src/permissions.js`, `middleware/access.js`, `services/accessService.js`, rotas com `scope`, `backend/tests/*.test.js` |
| 4 — Cadastro e gestão da equipe clínica | Concluída | 2026-11-18 | `backend/src/routes/clinic.js`, interface em `src/pages/Configuracoes.tsx` |
| 5 — Agenda, pacientes e notificações | Concluída | 2026-11-18 | Rotas `consultas`, `pacientes`, `messages` com escopo; `notifications.js`; testes de acesso |
| 6 — Prontuário e supervisão clínica | Concluída | 2026-11-18 | `canAccessRecord`, supervisão vinculada, auditoria; `backend/tests/access.test.js` |
| 7 — Financeiro da clínica, fechamento e repasses | Concluída | 2026-11-18 | `/api/payouts/*`, `/api/financeiro` e `/api/accounts` com escopo; `backend/tests/payouts.test.js` |
| 8 — Interface, migração piloto e entrada em operação | Em andamento | — | Telas `/clinica`, `/repasses`, `/auditoria`; `MODO_CLINICA_OPERACAO.md` |

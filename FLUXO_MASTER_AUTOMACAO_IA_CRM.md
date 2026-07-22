# 🚀 Blueprint & Fluxo Master de Automação — IA Sofia & CRM Previdenciário 360°

Este documento é o desenho arquitetural e operacional completo do ecossistema **Kassiele Advocacia / Sul & Associados**. Ele mapeia o ciclo de vida integral do segurado desde a primeira mensagem de WhatsApp até a concessão do benefício no INSS e o recebimento dos honorários ad exitum (30%).

---

## 💎 Visão Geral do Ecossistema Integrado (5 Fases)

```
+---------------------------------------------------------------------------------------------------+
|                            CICLO DE VIDA DO SEGURADO (100% PREVIDENCIÁRIO)                        |
+---------------------------------------------------------------------------------------------------+
  FASE 1: ACOLHIMENTO & TRIAGEM RÁPIDA
  [Lead chama no WhatsApp] ──> [Sofia responde em segundos] ──> [Pergunta de Ouro: Contribuinte?]
                                                                          │
                                         ┌────────────────────────────────┴────────────────────────────────┐
                                         ▼                                                                 ▼
                         [Funil: BPC-LOAS (Sem contribuição)]                              [Funil: AUXÍLIO DOENCA (Contribuinte)]
                         (Idoso 65+ ou Pessoa c/ Deficiência)                              (CLT, MEI ou Autônomo com Incapacidade)
                                         │                                                                 │
                                         └────────────────────────────────┬────────────────────────────────┘
                                                                          ▼
  FASE 2: QUALIFICAÇÃO & COLETA DE LAUDOS (CHECKLIST)
  [Sofia solicita documentos: CadÚnico, Laudos CIDs, RG, CNIS]
         │
         ├─ Cliente envia foto de laudo  ──> [GPT-Vision extrai CID/médico] ──> [Checklist atualiza no CRM ✓]
         └─ Cliente para de responder    ──> [Cron n8n 09h: Follow-up empático + Áudio clonado Dra.]
                                                                          │
                                                                          ▼
  FASE 3: TRANSPARÊNCIA, OAB & ASSINATURA DE CONTRATO
  [Checklist Completo ✓] ──> [Sofia apresenta Honorários no Êxito (30%), OAB/RS e Instagram @kassieleadv]
                                                                          │
                                                             [Envio de Procuração/Contrato]
                                                                          │
                                                        [Conversão em Cliente Oficial no CRM]
                                                                          │
                                                                          ▼
  FASE 4: ACOMPANHAMENTO PROCESSUAL, RAG & ATUALIZAÇÃO SEMANAL
  [Advogado protocola no Meu INSS e anexa na pasta do CRM]
         │
         ├─ Pílula RAG ● Visível IA  ──> [Sofia responde dúvidas em tempo real no WhatsApp]
         ├─ Diretriz da IA (obs_interna) ──> [Sofia obedece orientações escritas pela equipe no painel]
         └─ Automação Semanal (Cron n8n) ──> [Disparo autônomo 1x/semana com status humanizado do caso]
                                                                          │
                                                                          ▼
  FASE 5: PERÍCIA MÉDICA INSS & CONCESSÃO DO BENEFÍCIO
  [Equipe agenda Perícia em Prazos & Perícias] ──> [Cron n8n 08h: Lembrete automático 2 dias antes com orientações]
                                                                          │
                                                                          ▼
                                                   [Benefício Concedido / Vitória -> Êxito 30%]
```

---

## 📍 Detalhamento das 5 Fases Operacionais

### 🟢 FASE 1: Acolhimento Instantâneo & Triagem Especializada
*O objetivo desta fase é não deixar o segurado esperando, acolher sua dor e classificar o funil sem usar menus robóticos de opções numéricas.*

| Ator | Ação no Fluxo | Ferramenta / Tabela |
| :--- | :--- | :--- |
| **Cliente** | Envia a primeira mensagem no WhatsApp (Texto, Áudio ou "Oi"). | Webhook Evolution API (`MESSAGES_UPSERT`). |
| **n8n / Whisper** | Se for mensagem de voz, transcreve imediatamente o áudio. Verifica se o número existe. | Tabela `leads` (`ON CONFLICT DO NOTHING`) e `conversas`. |
| **Sofia (IA)** | Responde em menos de 10 segundos com empatia, apresentando o escritório e fazendo a **Pergunta de Ouro**: *"Para entendermos melhor o seu caso, o(a) senhor(a) já trabalhou com carteira assinada, é MEI ou costuma pagar o INSS por conta própria?"* | `RPC fn_contexto_lead` (busca chassi e histórico). |
| **Sofia (IA)** | Analisa a resposta e aciona a tool `classificar_lead`: <br>• **Não contribui / Nunca pagou:** Classifica em `BPC_LOAS`. <br>• **Trabalhou / Contribui (CLT/MEI/Carnê):** Classifica em `AUXILIO_DOENCA`. | Tool `classificar_lead` (`UPDATE leads SET funil_slug = ...`). |
| **Painel CRM** | O card do lead surge em tempo real na coluna **`Novo Lead / Triagem`** no Kanban (`Processos.jsx`) e na lista de Atendimento (`Chat.jsx`) com a tag visual e cor do funil. | Tabela `leads`, `funis`, `etapas_funil`. |

---

### 🟡 FASE 2: Qualificação & Coleta Inteligente de Documentação
*Nesta fase, a Sofia atua como secretária digital na coleta de documentos essenciais antes da intervenção da Dra. Kassiele.*

| Ator | Ação no Fluxo | Ferramenta / Tabela |
| :--- | :--- | :--- |
| **Sofia (IA)** | Com base no funil classificado, solicita a documentação prioritária de forma gentil e sem sobrecarregar: <br>• **BPC-LOAS**: Solicita foto do **CadÚnico atualizado**, **Laudos/Relatórios Médicos** (ou escolares para crianças) e **RG/CPF**. <br>• **Auxílio-Doença**: Solicita **Laudo Médico com indicação do CID**, **CNIS / Carteira de Trabalho** e **RG/CPF**. | Tabela `checklist_documentos` (criada automaticamente no gatilho do banco). |
| **Cliente** | Envia foto do laudo ou print de atestado no WhatsApp. | Webhook Evolution API ➔ GPT-Vision. |
| **n8n / Vision** | O **GPT-Vision** analisa a imagem médica, extrai o CID, data de emissão, nome do médico e valida se a foto está nítida. Em seguida, salva a imagem no Supabase Storage. | `RPC fn_registrar_documento` com `p_dados_extraidos: { cid: "M54.5", ... }`. |
| **Painel CRM** | No card de Atendimento (`Chat.jsx` ➔ lateral direito) e em `Clientes.jsx`, o item do checklist muda para `✓ Recebido` verde com o resumo da IA. O card move para **`Coleta de Documentos`**. | Tabela `checklist_documentos`, coluna `status = 'recebido'`. |
| **Automação n8n** | **Follow-up Diário (Repescagem às 09h00):** Se o cliente parar de responder antes de completar o checklist, o cron diário roda `fn_fila_followup()`. Envia uma mensagem humanizada cobrando especificamente o laudo que falta, intercalando textos empáticos com **mensagens de voz (áudios clonados da Dra. Kassiele)**. | Tabela `regras_followup`, `followups_disparados`. |

> [!NOTE]
> **Regra de Acolhimento dos Laudos:** Se o cliente enviar um laudo antigo (ex.: mais de 6 meses), a Sofia **nunca recusa** na primeira resposta. Ela elogia o envio, registra em sistema e avisa que a Dra. Kassiele fará a análise médica para ver se será necessário pedir uma atualização ao médico da rede pública. Isso trava o cliente no escritório e evita frustração.

---

### 🟠 FASE 3: Transparência Comercial, OAB & Assinatura Digital
*Com os documentos em mãos, a Sofia consolida a confiança para o fechamento de contrato de risco (êxito).*

| Ator | Ação no Fluxo | Ferramenta / Tabela |
| :--- | :--- | :--- |
| **Sofia (IA)** | Quando `checklist_completo = TRUE`, a Sofia prepara o terreno comercial comunicando 3 pilares fundamentais: <br>1. **Honorários no Êxito (30%):** Explica com clareza que o escritório trabalha *ad exitum* — ou seja, o cliente **não paga nenhuma consulta ou taxa inicial**, pagando 30% apenas quando vencer o benefício no INSS. <br>2. **Garantia Anti-Golpe & OAB/RS:** Informa o número da OAB da Dra. Kassiele, o endereço oficial do escritório e o Instagram (`@kassieleadv`) para verificação. <br>3. **Envio do Termo:** Envia o link ou arquivo de procuração/contrato para assinatura digital (ou pede confirmação dos dados para emissão). | Tool `avancar_etapa` (`UPDATE leads SET etapa_slug = 'assinatura'`). |
| **Cliente** | Confirma a assinatura ou assina digitalmente o termo. | Conversa no WhatsApp. |
| **Advogado** | No painel CRM (`Chat.jsx`), clica no botão **`Converter em Cliente no CRM`** (`ModalConversaoCRM`). O lead ganha ficha completa na aba `Clientes.jsx` com número de CPF, data de nascimento e vínculo aos processos. | Tabela `clientes`, `processos`. |

---

### 🔵 FASE 4: Protocolo INSS, RAG Controlado & Atualização Semanal
*Com o processo rodando no INSS, o CRM e a IA garantem informação proativa e reativa sem tirar o tempo da advogada.*

| Ator | Ação no Fluxo | Ferramenta / Tabela |
| :--- | :--- | :--- |
| **Advogado** | Protocola o requerimento no Meu INSS e insere o **Protocolo INSS / Número do Requerimento** e a **Esfera (Administrativa / Judicial)** na ficha do cliente (`Processos.jsx`). | Tabela `processos` (`protocolo_inss`, `esfera`, `beneficio`). |
| **Advogado** | Quando sai um despacho ou quando o advogado quer deixar uma instrução, ele tem dois caminhos na barra lateral de Atendimento (`Chat.jsx`): <br>1. **Anexar Arquivo (`ARQUIVOS DO CLIENTE`):** Sobe o laudo ou decisão em PDF/imagem e deixa a pílula em **`● Visível IA`** (verde) ou **`● Sigiloso`** (cinza). <br>2. **Escrever Nota (`DIRETRIZES DA IA`):** Digita no campo de texto explicativo (ex.: *"O INSS abriu exigência de documento rural até o dia 15/08"*). Salva na hora. | Tabela `documentos_cliente` (`liberado_cliente`), tabela `conversas` (`obs_interna`). |
| **Automação n8n** | **Atualização Semanal Autônoma (Cron Periódico — Ex.: Quarta-feira às 10h00):** O n8n consulta todos os clientes com processo ativo (`status = 'ativo'`) e dispara uma mensagem humanizada proativa de status: <br>*"Olá, {{nome}}! Passando em nome da Dra. Kassiele para informar que seu processo de {{beneficio}} no INSS (Protocolo Nº {{protocolo}}) continua em análise regular. Nossa equipe está monitorando o sistema diariamente. Assim que o INSS movimentar, avisaremos o senhor(a) em primeira mão!"* | Novo Cron de Resumo Periódico no n8n + `processos`. |
| **Sofia (IA)** | **Atendimento Reativo (Quando o cliente chama para perguntar):** Se o cliente perguntar *"Dra., como está meu benefício?"*, a Sofia executa a tool `consultar_andamento`. Ela lê **apenas** os arquivos em `documentos_cliente` com pílula verde (`liberado_cliente = TRUE`) e obedece rigorosamente às notas de `obs_interna`. Se o processo estiver em fase normal sem novidades, ela explica com calma e lembra que o acompanhamento está sendo feito. | `RPC consultar_andamento` e `fn_contexto_lead`. |

---

### 🟣 FASE 5: Perícia Médica INSS, Lembretes & Concessão (Êxito)
*O momento mais crítico do direito previdenciário: garantir que o cliente compareça preparado na perícia para vencer o caso.*

| Ator | Ação no Fluxo | Ferramenta / Tabela |
| :--- | :--- | :--- |
| **Advogado** | Assim que o INSS marca a data da perícia, a equipe acessa a aba **`Prazos & Perícias`** (`Prazos.jsx`), clica em **`+ Novo Evento`**, vincula o nome do cliente salvo no CRM e seleciona o tipo **`Perícia Médica INSS`**, definindo data, horário, local (APS INSS) e a antecedência de aviso (`2 dias antes`). | Tabela `eventos_processuais`, `tipos_evento`. |
| **Automação n8n** | **Lembrete de Perícia (Cron Diário às 08h00):** O n8n chama `fn_fila_lembretes_evento()`. Com **2 dias de antecedência** da data da perícia, o sistema dispara automaticamente uma mensagem de extrema relevância no WhatsApp do segurado: <br>*"Atenção, {{nome}}! Lembrete importantíssimo da Dra. Kassiele: Sua **Perícia Médica no INSS** está marcada para depois de amanhã (**{{data_formatada}} às {{horario}}**) na **{{local_aps}}**.<br><br>⚠️ **ORIENTAÇÕES OBRIGATÓRIAS PARA NÃO PERDER O BENEFÍCIO:**<br>1. Chegue com no mínimo **30 minutos de antecedência**.<br>2. Leve **TODOS OS SEUS LAUDOS MÉDICOS, ATESTADOS E RECEITAS ORIGINAIS** em mãos.<br>3. Leve seu RG, CPF e Carteira de Trabalho originais.<br>4. Se precisar de ajuda para localizar o endereço, nos chame aqui!"* | `RPC fn_fila_lembretes_evento`, tabela `eventos_processuais` (`lembrete_enviado = true`). |
| **Advogado / IA** | **Resultado & Concessão (Êxito 30%):** Com o benefício concedido, o card é movido para **`Benefício Concedido (Ganho)`**. A Sofia parabeniza o segurado com entusiasmo, orienta sobre a emissão da carta de concessão e o primeiro saque, e prepara o encerramento do ciclo com a cobrança dos honorários contratuais sobre o êxito obtido. | Funil Kanban (`casos` / `processos`), encerramento de ciclo. |

---

## 🛠️ Resumo das 4 Automações Programadas (Crons n8n)

Para sustentar este fluxo sem intervenção manual e sem o antigo MCP de agendamento de consultas, o n8n executa 4 rotas autônomas no tempo:

1. **Repescagem & Cobrança de Laudos (`Schedule Trigger — Diário 09:00`)**
   - Consulta `fn_fila_followup()`. Cobra CadÚnico e laudos de leads parados na triagem com textos e áudios clonados da Dra. Kassiele.
2. **Lembrete de Perícias INSS e Prazos (`Schedule Trigger — Diário 08:00`)**
   - Consulta `fn_fila_lembretes_evento()`. Avisa com 2 dias de antecedência (e na véspera) sobre perícias médicas, orientando a levar laudos originais na APS.
3. **Atualização Processual Proativa (`Schedule Trigger — Semanal - Ex.: Quarta 10:00`)**
   - Consulta processos com `status = 'ativo'`. Envia mensagem rápida e acolhedora de status informando que o processo está em andamento regular sob vigilância da equipe, mantendo o cliente calmo e sem ansiedade.
4. **Sincronização e Vetorização RAG (`Webhook / Atualização Imediata`)**
   - Sempre que novos artigos jurídicos ou teses previdenciárias são inseridas no banco, gera embeddings via `pgvector` (`text-embedding-3-small`) para consulta geral da Sofia.

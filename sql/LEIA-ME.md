# 🏛️ Manual Oficial do Banco de Dados — CRM Jurídico & Inteligência Previdenciária (INSS)

Este documento é o manual de referência técnica e arquitetural da base de dados PostgreSQL (via Supabase) do **CRM Jurídico Kassiele Advocacia / Sul & Associados**. 

A arquitetura do banco foi redesenhada para suportar **100% da operação de Direito Previdenciário (INSS)**, eliminando a antiga dependência de agendamentos manuais iniciais e focando em três pilares de alta performance: **Triagem Instantânea de Leads**, **Gestão de Prazos & Perícias INSS** e **RAG Processual Controlado com Diretrizes da IA**.

---

## 1. Scripts SQL e Ordem de Execução

Os arquivos SQL estão organizados na pasta `sql/` do repositório. Siga o fluxo correspondente ao estado do seu ambiente:

### 🔹 Opção A: Ambiente Limpo / Nova Implantação
Se você está configurando um novo projeto no Supabase do zero ou deseja recriar toda a estrutura:

```bash
1. sql/01_SCHEMA_PREVIDENCIARIO.sql     # Cria todas as tabelas, índices, triggers e RPCs
2. sql/02_SEEDS_FUNIL.sql               # Popula dados iniciais do escritório, OAB, advogados e etapas dos funis
3. sql/03_SEEDS_RAG_MENSAGENS.sql       # Popula modelos de resposta do WhatsApp, regras de follow-up e RAG inicial
```

> [!WARNING]
> O script `01_SCHEMA_PREVIDENCIARIO.sql` realiza a limpeza (`DROP TABLE IF EXISTS ... CASCADE`) antes de recriar as tabelas. Em ambientes de produção com dados reais, utilize a **Opção B (Migração Incremental)**.

---

### 🔹 Opção B: Migração Incremental (Ambiente Existente)
Se você já possui dados no Supabase e quer atualizar o banco sem perder nenhuma conversa, cliente ou histórico:

```bash
1. Realize o backup de segurança no painel do Supabase (Database -> Backups)
2. sql/01b_MIGRACAO_INCREMENTAL.sql     # Adiciona colunas, renomeia tabelas antigas e preserva os dados
3. sql/02_SEEDS_FUNIL.sql               # Idempotente (ON CONFLICT DO NOTHING / UPDATE)
4. sql/03_SEEDS_RAG_MENSAGENS.sql       # Idempotente e sincroniza o prompt previdenciário da IA
```

---

## 2. Mapa do Banco de Dados & Tabelas Principais

A estrutura contempla 22 tabelas relacionais organizadas por camadas de responsabilidade:

```
+---------------------------------------------------------------------------------------------------+
|                                 CAMADA DE ESTRATÉGIA E ACESSO                                     |
|  [escritorio]  <──>  [advogados]  <──>  [config_ia]  <──>  [horarios_atendimento]                 |
+---------------------------------------------------------------------------------------------------+
                                                  │
+------------------------------------------------─┼-------------------------------------------------+
|                                 CAMADA COMERCIAL E DE TRIAGEM                                     |
|  [funis]  ──>  [etapas_funil]  ──>  [leads]  ──>  [lead_historico]                                |
|                                       │                                                           |
|                     ┌─────────────────┴─────────────────┐                                         |
|                     ▼                                   ▼                                         |
|          [checklist_documentos]               [catalogo_documentos]                               |
|          [regras_followup]                    [followups_disparados]                              |
+------------------------------------------------─┼-------------------------------------------------+
                                                  │
+------------------------------------------------─┼-------------------------------------------------+
|                                 CAMADA PROCESSUAL E JURÍDICA                                      |
|  [clientes]  ──>  [processos]  ──>  [eventos_processuais] (antigo compromissos)                   |
|       │                 │                    │                                                    |
|       ▼                 ▼                    ▼                                                    |
|  [documentos_cliente] (Pílula RAG / Laudos) [tipos_evento]                                        |
+------------------------------------------------─┼-------------------------------------------------+
                                                  │
+------------------------------------------------─┼-------------------------------------------------+
|                                 CAMADA DE IA E ATENDIMENTO (WHATSAPP)                             |
|  [conhecimento_ia] (RAG Geral)   [conversas] (obs_interna)   [mensagens_chat]   [atividade_agente]|
+---------------------------------------------------------------------------------------------------+
```

---

## 3. Principais Alterações da Versão Previdenciária

### 3.1 Subdivisão e Especialização de Leads (`leads`, `funis`, `etapas_funil`)
- O estado comercial de um segurado não é mais uma simples tag na conversa. Cada lead possui registro na tabela `leads` atrelado aos funis especializados:
  - **`BPC_LOAS`**: Para idosos ou pessoas com deficiência sem contribuição ativa.
  - **`AUXILIO_DOENCA`**: Para segurados contribuintes (CLT, MEI ou autônomos) com incapacidade laboral.
- **Destaque Técnico**: A coluna `proxima_acao_em` é preenchida desde a criação do lead, garantindo que o motor de cobrança automática (`regras_followup`) atue sem intervenção manual.

### 3.2 Substituição de Agenda de Consultas por Prazos & Perícias INSS (`eventos_processuais`)
- As tabelas `compromissos` e `tipos_compromisso` foram substituídas/migradas para **`eventos_processuais`** e **`tipos_evento`**.
- O foco da agenda é o controle rigoroso dos atos previdenciários e judiciais:
  - **Perícia Médica INSS** (APS / Judicial)
  - **Exigência Administrativa INSS**
  - **Prazo Recursal / Sentença**
  - **Audiência de Instrução**
- **Lembrete de Perícia (Cron Diário)**: A coluna `lembrete_enviado` do evento, cruzada com `lembrete_dias_antes` (padrão 2 dias antes), aciona o envio autônomo de lembretes pelo WhatsApp orientando o segurado a comparecer com laudos originais e RG com antecedência.

### 3.3 Controle Dinâmico de RAG Processual (`documentos_cliente.liberado_cliente`)
- Quando o advogado anexa um laudo, peça inicial ou nota de andamento à pasta do cliente (`documentos_cliente`), o campo booleano **`liberado_cliente`** controla a visibilidade para a IA:
  - `liberado_cliente = TRUE` (**Pílula Verde `● Visível IA`**): A IA (Sofia) tem permissão de leitura sobre a coluna `conteudo_texto` e sobre o arquivo anexado (`arquivo_url`). Quando o cliente pergunta *"Como está meu benefício?"*, a IA consulta esses registros e responde com exatidão.
  - `liberado_cliente = FALSE` (**Pílula Cinza `● Sigiloso`**): O documento é interno da equipe jurídica. A IA é vetada pelo banco de dados de retornar qualquer informação desse documento.

### 3.4 Diretrizes e Instruções da IA em Tempo Real (`conversas.obs_interna`)
- A tabela `conversas` armazena a coluna **`obs_interna`**.
- No painel de Atendimento (`Chat.jsx`), a seção **`DIRETRIZES DA IA`** salva automaticamente as orientações inseridas pela equipe (ex.: *"O benefício foi concedido, orientar a aguardar a carta de concessão para o primeiro saque na Caixa"*).
- Esse campo é injetado diretamente no contexto da Sofia no n8n a cada mensagem recebida, funcionando como um **comando de voz imediato da equipe para o cérebro do bot**.

### 3.5 Persistência de Equipe e Controle de Acesso (`advogados`, `escritorio`)
- As exclusões, adições e edições de advogados no painel de Configurações realizam mutações diretas nas tabelas `advogados` (`id`, `nome`, `oab`, `tel`, `especialidade`, `recebe_escalonamento`, `ativo`) e na estrutura do `escritorio`, garantindo sincronia total entre o frontend e a base.

---

## 4. Funções RPC e Procedures Acionadas pelos Workflows n8n

O banco disponibiliza funções otimizadas (RPCs via Supabase REST) para que o n8n execute transações complexas em uma única chamada HTTP:

| Função RPC | Parâmetros | Descrição do Comportamento |
| :--- | :--- | :--- |
| **`fn_contexto_lead(p_telefone)`** | `p_telefone` (VARCHAR) | Retorna em JSON o chassi completo do lead: ID, nome, funil, etapa atual, checklist de documentos (recebidos vs pendentes), próximo evento processual (`eventos_processuais`) e a diretriz interna (`obs_interna`). Chamar sempre no início do fluxo do WhatsApp. |
| **`fn_registrar_documento(...)`** | `p_lead_id`, `p_documento_slug`, `p_arquivo_url`, `p_status`, `p_dados_extraidos` | Grava o recebimento de um documento no checklist (`checklist_documentos`), salva o link do Storage e os dados extraídos pelo GPT-Vision (ex.: CID, médico). Retorna se o checklist está completo para avançar o funil. |
| **`fn_fila_followup()`** | *Nenhum* | Consulta diária dos leads abertos cujo `proxima_acao_em <= now()`. Retorna nome, telefone, canal (`texto` ou `áudio`), template formatado e lista de laudos pendentes para o disparo de cobrança. |
| **`fn_registrar_followup(...)`** | `p_lead_id`, `p_tentativa`, `p_canal`, `p_mensagem`, `p_acao_final` | Registra o disparo na tabela `followups_disparados` e reprograma o `proxima_acao_em` para a próxima tentativa ou move para escalonamento humano/perdido. |
| **`fn_fila_lembretes_evento()`** | *Nenhum* | Retorna a lista de perícias e prazos agendados nos próximos dias que ainda não tiveram o lembrete enviado (`lembrete_enviado = false`). |
| **`match_conhecimento_ia(...)`** | `query_embedding`, `match_threshold`, `match_count`, `p_config_ia_id` | Realiza busca vetorial por similaridade de cosseno (`pgvector`) na tabela `conhecimento_ia` para responder dúvidas gerais de direito previdenciário e regras do INSS. |

---

## 5. Verificação de Integridade Pós-Migração ou Instalação

Após executar os scripts no Supabase, rode a consulta de checagem no editor SQL:

```sql
SELECT
  (SELECT count(*) FROM funis)                              AS total_funis,
  (SELECT count(*) FROM etapas_funil)                       AS total_etapas,
  (SELECT count(*) FROM catalogo_documentos)                AS catalogo_laudos,
  (SELECT count(*) FROM regras_followup)                    AS regras_cobranca,
  (SELECT count(*) FROM modelos_mensagem)                   AS templates_whats,
  (SELECT count(*) FROM conhecimento_ia)                    AS itens_rag,
  (SELECT count(*) FROM advogados WHERE ativo = true)       AS advogados_ativos;
```

**Valores esperados após rodar os seeds (`02` e `03`):**
- `total_funis`: **3** (`BPC_LOAS`, `AUXILIO_DOENCA`, `INDEFINIDO`)
- `total_etapas`: **20+** etapas encadeadas
- `catalogo_laudos`: **12+** documentos previdenciários e laudos
- `regras_cobranca`: **8+** regras de follow-up multicanal (texto e áudios clonados)
- `templates_whats`: **22+** modelos com placeholders
- `advogados_ativos`: Advogados cadastrados (ex.: Dra. Kassiele, Dr. Cauã)

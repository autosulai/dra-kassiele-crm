# 🤖 Manual dos Workflows n8n — Inteligência IA Sofia & CRM Previdenciário

Este manual apresenta a arquitetura, especificação técnica e guias de integração dos workflows no **n8n** responsáveis pelo funcionamento autônomo da **Sofia (IA WhatsApp 24/7)** integrada ao **CRM Jurídico Kassiele Advocacia / Sul & Associados**.

A operação foi estruturada especificamente para a realidade de **Direito Previdenciário (INSS)**, eliminando o antigo agendamento prévio de consultas manuais para priorizar o **acolhimento instantâneo, triagem especializada por funis e coleta de laudos/CadÚnico**.

---

## 1. Arquitetura Geral & Mapeamento de Mudanças

```
+---------------------------------------------------------------------------------------------------+
|                                 FLUXO CENTRAL DE ATENDIMENTO WHATSAPP                             |
+---------------------------------------------------------------------------------------------------+
[Evolution API Webhook]
       │
       ├─ É Áudio?   ──> [Whisper / OpenAI Transcrição] ─┐
       ├─ É Imagem?  ──> [GPT-Vision Análise de Laudo]  ─┤
       └─ É Texto?   ────────────────────────────────────┤
                                                         ▼
                                       [Busca / Cria Lead e Conversa]
                                                         │
                                             [IF status == 'humano'?]
                                              SIM │             │ NÃO
                                       [Grava e Para]    [RPC fn_contexto_lead]
                                                                │
                                                         [Contexto 360°]
                                                         • Funil & Etapa
                                                         • Checklist Pendente
                                                         • Próxima Perícia
                                                         • Diretrizes RAG (obs_interna)
                                                                │
                                                         [Agente Sofia LLM]
                                                         • Acessa Tools (MCP Server)
                                                         • Leitura de laudos liberados
                                                                │
                                                       [Evolution sendText]
```

---

## 2. Workflow 1 — Agente Principal (Recepção & Triagem no WhatsApp)

Este é o workflow que escuta o webhook da **Evolution API**, processa mídias e invoca a Sofia.

### 2.1 Criação do Chassi do Lead (`leads`)
Ao receber a primeira mensagem de um novo contato, o sistema verifica a existência em `leads` e `conversas`. Se for um número inédito, cadastra com o funil inicial de triagem:

```sql
INSERT INTO leads (escritorio_id, nome, telefone, funil_slug, etapa_slug, proxima_acao_em)
VALUES (:escritorioId, :pushName, :telefone, 'INDEFINIDO', 'triagem', now() + INTERVAL '1 day')
ON CONFLICT (escritorio_id, telefone) DO NOTHING
RETURNING id;
```

> [!NOTE]
> O preenchimento imediato de `proxima_acao_em` (`now() + 1 dia`) garante que se o segurado parar de responder na primeira mensagem de boas-vindas, ele entrará automaticamente na fila de repescagem do dia seguinte.

### 2.2 Carregamento de Contexto (`fn_contexto_lead`)
Antes de gerar a instrução da Sofia, o n8n chama a RPC unificada:

```http
POST /rest/v1/rpc/fn_contexto_lead
Content-Type: application/json

{
  "p_telefone": "5551981234455"
}
```

O retorno entrega à Sofia exatamente o que ela precisa para não repetir perguntas nem pedir laudos já enviados:
- **`funil_slug`**: `BPC_LOAS`, `AUXILIO_DOENCA` ou `INDEFINIDO`.
- **`etapa_slug`**: A etapa atual no Kanban do CRM.
- **`checklist`**: Array indicando quais documentos o lead já enviou e quais estão pendentes.
- **`proximo_evento`**: A próxima perícia ou prazo INSS agendado na tabela `eventos_processuais`.
- **`obs_interna` (Diretriz da IA)**: O texto escrito pelos advogados no painel lateral do CRM (`DIRETRIZES DA IA`). **A Sofia obedece com prioridade absoluta ao comando contido aqui** (ex.: *"Dizer que o recurso foi ganho no CRPS"*).

---

## 3. Workflow 2 — Subworkflow de Ferramentas (Tools / MCP Server da Sofia)

O cérebro LLM da Sofia consulta ferramentas especializadas no banco para tomar decisões. As antigas tools de agendamento (`listar_horarios`, `criar_agendamento`) foram substituídas pelo conjunto processual previdenciário:

### 🛠️ Tool 1: `classificar_lead`
Acionada quando a Sofia identifica o perfil contributivo do segurado na primeira pergunta de triagem (*"O(a) senhor(a) já trabalhou com carteira assinada ou paga o INSS?"*).

```sql
UPDATE leads
SET funil_slug = :funil,       -- 'BPC_LOAS' (Sem contribuição) | 'AUXILIO_DOENCA' (Contribuinte)
    etapa_slug = :primeiraEtapa,
    contribuinte = :contribuinte
WHERE id = :leadId;
```
*Efeito:* O gatilho do banco (`trg_cria_checklist`) cria instantaneamente a lista de exigências documentais adaptada ao funil escolhido.

### 🛠️ Tool 2: `atualizar_lead`
Acionada de forma contínua para preencher a ficha sócio-econômica e médica:
- Campos salvos em `leads`: `tem_cadunico`, `cadunico_atualizado`, `renda_familiar_declarada`, `pessoas_no_domicilio`, `doenca_relatada`, `tipo_publico`, `ultima_contribuicao`.

### 🛠️ Tool 3: `registrar_documento`
Acionada quando o segurado envia uma foto de laudo, RG ou print do CadÚnico. O n8n passa a imagem pelo **GPT-Vision**, extrai os dados e aciona a procedure no Supabase:

```http
POST /rest/v1/rpc/fn_registrar_documento
{
  "p_lead_id": "uuid-do-lead",
  "p_documento_slug": "laudo_medico",
  "p_arquivo_url": "https://...supabase.co/storage/v1/object/public/documentos-clientes/laudo.jpg",
  "p_status": "recebido",
  "p_dados_extraidos": { "cid": "M54.5", "data_emissao": "2025-10-14", "medico": "Dr. Carlos" }
}
```
*Retorno:* Devolve `{ pendentes, total_obrigatorios, checklist_completo }`. Se `checklist_completo = true`, a Sofia parabeniza o segurado e avança automaticamente para a etapa de assinatura de procuração/contrato.

### 🛠️ Tool 4: `avancar_etapa`
Move o lead no funil Kanban (`UPDATE leads SET etapa_slug = :etapa WHERE id = :leadId`). O gatilho de banco registra a movimentação em `lead_historico` e reprograma a data do próximo follow-up.

### 🛠️ Tool 5: `consultar_andamento` (RAG Processual Controlado)
Acionada quando clientes da carteira perguntam sobre o andamento do processo (*"Como está minha perícia?"*, *"Saiu a decisão do juiz?"*).

```sql
SELECT titulo, conteudo_texto, criado_em, arquivo_url
FROM documentos_cliente
WHERE cliente_id = :clienteId 
  AND liberado_cliente = TRUE
ORDER BY criado_em DESC LIMIT 5;
```
> [!IMPORTANT]
> **Segurança e Sigilo Inviolável:** A consulta filtra estritamente por `liberado_cliente = TRUE`. Resumos estratégicos ou laudos que o advogado marcou como **`● Sigiloso`** no painel lateral de Atendimento ou na aba de Clientes nunca são vistos nem lidos pela Sofia.

### 🛠️ Tool 6: `escalar_humano`
Transfere o atendimento para os advogados reais (*"O cliente pediu para falar com a Dra. Kassiele"* ou *"Caso jurídico de alta complexidade com benefício negado em 3 instâncias"*):

```sql
UPDATE conversas SET status = 'humano' WHERE lead_id = :leadId;
INSERT INTO atividade_agente (lead_id, tipo, nome_acao, detalhes)
VALUES (:leadId, 'status', 'ESCALADO', :motivo);
```

---

## 4. Workflow 3 — Automações de Fundo (Crons & Rotas)

O ecossistema conta com 4 rotas autônomas no n8n que substituem as antigas confirmações de consulta:

### ⏰ Rota A · Motor de Follow-up Diário (`Schedule Trigger 09:00`)
Roda todos os dias às 09h da manhã para cobrar, com delicadeza e empatia, os laudos médicos e o CadÚnico de clientes que pararam de responder na triagem:

```
[Cron 09:00] ──> [RPC fn_fila_followup()] ──> [Loop itens da fila]
                                                      │
                                                      ├─ Canal 'audio'? ──> [sendWhatsAppAudio (clonado)]
                                                      └─ Canal 'texto'? ──> [sendText (substitui placeholders)]
                                                                                  │
                                                                       [RPC fn_registrar_followup]
```

**Placeholders substituídos dinamicamente pelo n8n antes do envio:**
- `{{nome}}`: Nome do segurado.
- `{{documentos_pendentes}}`: Lista em texto puro dos laudos que faltam.
- `{{oab}}`, `{{instagram}}`, `{{endereco}}`: Dados oficiais do escritório (`escritorio` e `advogados`).

### ⏰ Rota B · Lembretes de Perícia INSS (`Schedule Trigger 08:00`)
Evita o indeferimento por absenteísmo na perícia médica. Todos os dias às 08h, verifica os eventos em `eventos_processuais`:

```
[Cron 08:00] ──> [RPC fn_fila_lembretes_evento()] ──> [Loop Perícias] ──> [sendText (Aviso 2 dias antes)]
                                                                               │
                                                                   [UPDATE eventos_processuais
                                                                    SET lembrete_enviado = true]
```
*Mensagem enviada:* Orienta o segurado a comparecer com no mínimo 30 minutos de antecedência na APS indicada, levando **todos os laudos, atestados e receitas originais em mãos**.

### 🔗 Rota C · Webhook de Envio Manual (`/webhook/painel/enviar-mensagem`)
Acionado quando o advogado digita uma mensagem na barra inferior do chat no painel CRM (`Chat.jsx`).
1. Recebe `{ conversa_id, telefone, texto }`.
2. Altera imediatamente `conversas.status = 'humano'` (pausando a Sofia para não interromper a fala do advogado).
3. Grava o registro na tabela `mensagens_chat`.
4. Dispara a mensagem via Evolution API (`sendText`).

### 🧠 Rota D · Sincronização do Vetor de Conhecimento RAG (`/webhook/painel/atualizar-rag`)
Acionado quando novos artigos científicos, teses ou regras do INSS são inseridos na tabela `conhecimento_ia`. O n8n chama a API da OpenAI (`text-embedding-3-small`), gera o vetor de 1536 dimensões e grava na coluna `embedding` (`pgvector`).

---

## 5. Guia de Configuração da Evolution API & Webhooks

Para conectar a instância de WhatsApp da Evolution API ao n8n, configure o webhook de eventos na instância da Dra. Kassiele:

1. Acesse o painel da Evolution API ou chame o endpoint de webhooks.
2. Aponte a URL para o endereço de produção do n8n:
   - **URL Webhook:** `https://seu-servidor-n8n.com/webhook/evolution-inss-receiver`
   - **Eventos Habilitados (`events`):** `MESSAGES_UPSERT` (mensagens recebidas) e `SEND_MESSAGE` (confirmação de saída).
3. **Persistência de Mídias (Storage do Supabase):**
   Os links de áudios e imagens gerados pelo WhatsApp/Evolution expiram em poucas horas. No fluxo de recebimento de imagem/áudio no n8n:
   - Baixe o buffer base64 retornado pelo evento da Evolution.
   - Faça o upload via API REST para o bucket público/fechado `documentos-clientes` no Supabase Storage.
   - Salve a URL final permanente na tabela `checklist_documentos.arquivo_url` ou `documentos_cliente.arquivo_url`.

---

## 6. Checklist de Homologação Pós-Deploy do Workflow

Antes de ativar o número oficial do escritório no webhook, execute esta checagem com um número de testes:

- [ ] **Acolhimento Inicial:** Enviar "Oi" de um número desconhecido no WhatsApp. Verificar no Supabase se o registro foi criado em `leads` (`funil_slug = 'INDEFINIDO'`) e em `conversas`.
- [ ] **Triagem de Funil (Auxílio Doença):** Responder à Sofia dizendo que trabalha de carteira assinada ou paga carnê. Verificar se `leads.funil_slug` mudou para `AUXILIO_DOENCA` e se o checklist de laudos foi criado em `checklist_documentos`.
- [ ] **Triagem de Funil (BPC-LOAS):** Responder dizendo que não contribui ao INSS e que cuida de um familiar com deficiência ou idoso. Verificar mudança para `BPC_LOAS` e pedido imediato de CadÚnico.
- [ ] **Leitura de Laudo (GPT-Vision):** Enviar uma foto de um atestado médico pelo WhatsApp. Verificar no painel se o item `laudo_medico` em `checklist_documentos` mudou para `recebido` e se o CID foi extraído corretamente.
- [ ] **Diretriz em Tempo Real (`obs_interna`):** No painel de Atendimento (`Chat.jsx`), escrever no campo DIRETRIZES DA IA: *"Dizer para o cliente que a perícia foi marcada para amanhã"*. Enviar uma mensagem do celular perguntando *"E aí, novidades?"* e confirmar se a Sofia obedeceu imediatamente à instrução.
- [ ] **Pílula de Sigilo RAG (`liberado_cliente`):** Anexar um arquivo no painel e clicar na pílula para deixá-lo **`● Sigiloso`**. Perguntar ao bot sobre o laudo e confirmar se a Sofia responde que não possui essa informação. Em seguida, alternar a pílula para **`● Visível IA`** e verificar se a Sofia passa a explicar o conteúdo do laudo.
- [ ] **Escalonamento Humano:** Digitar *"Quero falar urgente com a Dra. Kassiele"*. Verificar se a conversa mudou para a aba **Humano** (`status = 'humano'`) no painel e se a Sofia parou de responder automaticamente.

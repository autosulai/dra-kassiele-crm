const fs = require("fs");

// ===================================================================
// WORKFLOW 1: AGENTE PRINCIPAL WHATSAPP & CRM PREVIDENCIÁRIO (INSS)
// Adaptado da estrutura funcional da Dra Gabriela, substituindo o motor
// de agendamento por triagem de funil INSS e RAG dinâmico.
// ===================================================================

const wfOriginal = JSON.parse(
  fs.readFileSync(
    "./[Dra GABRIELA] AGENTE WHATSAPP DE AGENDAMENTO  [ag. agendamento] (4).json",
    "utf8"
  )
);

// 1. RENOMEAR WORKFLOW
wfOriginal.name = "[KASSIELE] AGENTE WHATSAPP & CRM PREVIDENCIARIO";

// 2. LISTA DE NÓS PARA REMOVER (Google Drive, Pinecone insert, Confirmação e Agendamento antigo)
const nodesToRemove = new Set([
  "Pinecone Vector Store",    // insert mode
  "Embeddings OpenAI",        // insert mode
  "Default Data Loader",
  "Recursive Character Text Splitter",
  "Sticky Note5",             // nota Google Drive
  "Search files and folders", // Google Drive
  "Download file",            // Google Drive
  "Loop Over Items",          // Google Drive loop
  "When clicking 'Test workflow'",
  "MCP Client3",              // Google Calendar MCP
  "AI Agent2",
  "OpenAI Chat Model2",
  "Think2",
  "Structured Output Parser",
  "Split Out",
  "Loop Over Items1",
  "MCP Client",               // MCP Client do Agent2
  "Sticky Note6",
  "Schedule Trigger",
  "Get a row3",
  "If3",
  "Enviar imagem",
  "Update a row2",
  "LIMPAR MEMÓRIA",
  "Redis",
]);

// 3. REMOVER NÓS E CONEXÕES
wfOriginal.nodes = wfOriginal.nodes.filter((n) => !nodesToRemove.has(n.name));
for (const name of nodesToRemove) {
  delete wfOriginal.connections[name];
}
for (const [sourceName, connTypes] of Object.entries(wfOriginal.connections)) {
  for (const [connType, outputs] of Object.entries(connTypes)) {
    for (let i = 0; i < outputs.length; i++) {
      outputs[i] = outputs[i].filter((c) => !nodesToRemove.has(c.node));
    }
  }
}

// 4. ADAPTAR NÓS EXISTENTES PARA REALIDADE PREVIDENCIÁRIA
wfOriginal.nodes.forEach((n) => {
  // --- Substituir Pinecone por Supabase pgvector RAG ---
  if (n.name === "Pinecone Vector Store1" || n.name === "Base RAG Juridica (pgvector)") {
    n.name = "Base RAG Juridica (pgvector)";
    delete n.disabled;
    n.type = "@n8n/n8n-nodes-langchain.vectorStoreSupabase";
    n.typeVersion = 1;
    n.parameters = {
      mode: "retrieve-as-tool",
      toolName: "buscar_conhecimento_juridico",
      toolDescription:
        "Use esta ferramenta para buscar regras do INSS, teses previdenciárias (BPC-LOAS, Auxílio Doença), OAB, endereço, regra de honorários no êxito (30% ad exitum sem taxa inicial) e qualquer informação institucional sobre a Kassiele Advocacia.",
      tableName: "conhecimento_ia",
      queryName: "match_conhecimento_ia",
      options: {},
    };
    n.credentials = {
      supabaseApi: { id: "CRED_SUPABASE_ID", name: "Kassiele Advocacia" },
    };
    delete n.credentials.pineconeApi;
  }

  if (n.name === "Embeddings OpenAI1") {
    n.credentials = { openAiApi: { id: "CRED_OPENAI_ID", name: "Kassiele Advocacia" } };
  }

  if (n.name === "Think") {
    n.parameters.description = "=Use esta ferramenta ('Think') para planejar internamente seus próximos passos de raciocínio lógico, analisar qual funil melhor se adapta ao segurado ou verificar quais documentos faltam no checklist antes de dar a resposta final.";
  }

  if (n.name === "dia_semana") {
    n.parameters.description = "=## USO DE VERIFICAÇÃO DE DATA\n\n### Data Atual no Brasil: \"data_hora_brasil\": \"{{ $now.setZone('America/Sao_Paulo').toISO() }}\"\n\nUse esta ferramenta quando precisar descobrir que dia da semana (segunda-feira, terça-feira, etc.) corresponde a uma data (dd/MM/yyyy) no fuso horário de Brasília/Brasil.";
    n.parameters.jsCode = `const input = query;\nconst [day, month, year] = input.split('/').map(Number);\nconst date = new Date(year, month - 1, day);\nreturn date.toLocaleDateString('pt-BR', { weekday: 'long' });`;
  }

  // --- BUSCA/CRIAR LEAD NA TABELA conversas ---
  if (n.name === "BUSCA LEAD" || n.name === "BUSCA LEAD 2" || n.name === "Get a row1" || n.name === "Get a row2") {
    n.parameters.tableId = "conversas";
    n.credentials = { supabaseApi: { id: "CRED_SUPABASE_ID", name: "Kassiele Advocacia" } };
  }

  if (n.name === "CRIAR LEAD") {
    n.parameters.tableId = "conversas";
    n.parameters.fieldsUi = {
      fieldValues: [
        { fieldId: "nome_contato", fieldValue: "={{ $('Webhook').item.json.body.data.pushName || 'Segurado' }}" },
        { fieldId: "telefone", fieldValue: '={{ $(\'Webhook\').item.json.body.data.key.remoteJidAlt.replaceAll("@s.whatsapp.net","") }}' },
        { fieldId: "status", fieldValue: "bot" },
        { fieldId: "tag", fieldValue: "triagem" },
        { fieldId: "ultima_mensagem", fieldValue: "={{ $('Webhook').item.json.body.data.message.conversation || '' }}" },
      ],
    };
    n.credentials = { supabaseApi: { id: "CRED_SUPABASE_ID", name: "Kassiele Advocacia" } };
  }

  if (n.name === "If4") {
    n.parameters.conditions.conditions = [
      { id: "cond-status-bot", leftValue: "={{ $json.status }}", rightValue: "humano", operator: { type: "string", operation: "notEquals" } },
    ];
  }

  if (n.name === "Switch") {
    n.parameters.rules.values[0].conditions.conditions[0] = { leftValue: "={{ $json.status }}", rightValue: "bot", operator: { type: "string", operation: "equals" }, id: "switch-status-bot" };
    n.parameters.rules.values[0].renameOutput = true;
    n.parameters.rules.values[0].outputKey = "Bot Ativo";

    n.parameters.rules.values[1].conditions.conditions[0] = { id: "switch-status-humano", leftValue: "={{ $json.status }}", rightValue: "humano", operator: { type: "string", operation: "equals" } };
    n.parameters.rules.values[1].renameOutput = true;
    n.parameters.rules.values[1].outputKey = "Humano Assumiu";
  }

  if (n.name === "If2") {
    n.parameters.conditions.conditions[0] = { id: "if2-always-stop", leftValue: "={{ true }}", rightValue: "", operator: { type: "boolean", operation: "true", singleValue: true } };
  }

  if (n.name === "Update a row" || (n.name === "Get a row" && n.id === "4a18729d-243c-4d3f-be78-79a6a5c343d4") || n.name === "Update a row1") {
    n.parameters.tableId = "conversas";
    if (n.parameters.fieldsUi) n.parameters.fieldsUi.fieldValues = [{ fieldId: "status", fieldValue: n.name === "Update a row1" ? "humano" : "bot" }];
    n.credentials = { supabaseApi: { id: "CRED_SUPABASE_ID", name: "Kassiele Advocacia" } };
  }

  if (n.name === "If1") {
    n.parameters.conditions.conditions = [{ id: "cond-if1-humano", leftValue: "={{ $json.status }}", rightValue: "humano", operator: { type: "string", operation: "equals" } }];
  }

  // --- TOOLS DE ESCALONAMENTO E SALVAMENTO ---
  if (n.name === "FALA HUMANO" || n.name === "timeout +1H") {
    if (n.name === "timeout +1H") n.name = "Marcar Atendimento Humano";
    n.parameters.tableId = "conversas";
    n.parameters.toolDescription =
      "Caso o lead peça, durante a conversa, para falar com um humano, ou atendente real, executar essa tool.";
    n.parameters.filters = {
      conditions: [{ keyName: "telefone", condition: "eq", keyValue: "={{ $('Edit Fields').item.json.Telefone }}" }],
    };
    n.parameters.fieldsUi = { fieldValues: [{ fieldId: "status", fieldValue: "humano" }] };
    n.credentials = { supabaseApi: { id: "CRED_SUPABASE_ID", name: "Kassiele Advocacia" } };
  }

  if (n.name === "SALVAR_INFO_LEAD") {
    n.parameters.tableId = "conversas";
    n.parameters.toolDescription = "Execute esta ferramenta ao concluir a triagem de um lead para salvar um resumo do caso, funil classificado e documentos recebidos.";
    n.parameters.filters = {
      conditions: [{ keyName: "telefone", condition: "eq", keyValue: "={{ $('Edit Fields').item.json.Telefone }}" }],
    };
    n.parameters.fieldsUi = { fieldValues: [{ fieldId: "ultima_mensagem", fieldValue: "={{ $fromAI('resumo', 'Resumo da triagem, funil e documentos recebidos do segurado', 'string') }}" }] };
    n.credentials = { supabaseApi: { id: "CRED_SUPABASE_ID", name: "Kassiele Advocacia" } };
  }

  if (n.name === "MSG SECRETÁRIA") {
    n.parameters.instanceName = "Kassiele Advocacia";
    n.parameters.remoteJid = "SEU_NUMERO_ESCRITORIO";
    n.parameters.messageText = '=🔴 *Segurado Solicita Atendimento Humano*\n- Nome: {{ $(\'Webhook\').item.json.body.data.pushName }}\n- Celular: {{ $(\'Webhook\').item.json.body.data.key.remoteJid.replaceAll("@s.whatsapp.net","") }}\n- Horário: {{ $now.format(\'dd/MM/yyyy HH:mm:ss\') }}\n\n📌 Acesse o painel CRM para assumir o atendimento.';
    n.credentials = { evolutionApi: { id: "CRED_EVOLUTION_ID", name: "Kassiele Advocacia" } };
  }

  if (n.name === "Postgres Chat Memory") {
    n.parameters.tableName = "n8n_chat_histories_kassiele";
    n.parameters.sessionKey = "=memory-{{ $('Edit Fields').item.json.Telefone }}";
    n.credentials = { postgres: { id: "CRED_POSTGRES_ID", name: "Kassiele Advocacia" } };
  }

  if (n.name === "OpenAI Chat Model1" || (n.name === "OpenAI" && n.parameters.resource === "image") || (n.name === "OpenAI1" && n.parameters.resource === "audio")) {
    if (n.name === "OpenAI" && n.parameters.resource === "image") {
      n.parameters.text = "Analise este documento médico ou pessoal (laudo, atestado, RG, CadÚnico). Extraia o CID, nome do paciente, nome do médico, data de emissão e informe se o laudo está legível e nítido para fins previdenciários.";
    }
    n.credentials = { openAiApi: { id: "CRED_OPENAI_ID", name: "Kassiele Advocacia" } };
  }

  if (n.name === "Enviar texto" || n.name === "Marcar mensagens como lidas") {
    n.parameters.instanceName = "Kassiele Advocacia";
    n.credentials = { evolutionApi: { id: "CRED_EVOLUTION_ID", name: "Kassiele Advocacia" } };
    if (n.name === "Marcar mensagens como lidas") {
      n.parameters.remoteJid = "={{ $('Edit Fields').item.json.Telefone }}";
      n.parameters.messageId = "={{ $('Webhook').item.json.body.data.key.id }}";
    }
    if (n.name === "Enviar texto") {
      n.parameters.remoteJid = "={{ $('Edit Fields').item.json.Telefone }}";
      n.parameters.messageText = "={{ $json.output || $json.text || '' }}";
    }
  }

  if (n.name === "MCP Client1" || n.name === "MCP Client Tool") {
    n.name = "MCP Client1";
    n.parameters = {
      endpointUrl: "https://SEU-N8N.com/mcp/kassiele-previdenciario",
      options: {},
    };
  }

  if (n.name === "Edit Fields3") {
    n.parameters.assignments.assignments = [
      {
        id: "c321c7c8-addc-4912-b1b4-316cc0bab974",
        name: "toString",
        value: "={{ $json.mensagem_completa }}",
        type: "string",
      },
    ];
  }

  if (n.name === "Sticky Note4") {
    n.parameters.content = "# AGENTE PRINCIPAL PREVIDENCIÁRIO (SOFIA/CRM)\n";
  }

  if (n.credentials && n.credentials.redis) {
    n.credentials.redis = { id: "CRED_REDIS_ID", name: "Kassiele Advocacia" };
  }

  if (n.name === "AI Agent1") {
    n.parameters.promptType = "define";
    n.parameters.text = "={{ $json.toString }}";
    n.parameters.options = {
      systemMessage: `=## IDENTIDADE E FUNÇÃO
Você é a **{{ $('BUSCA CONFIG IA').item?.json?.nome_agente || 'Sofia' }}**, inteligência artificial jurídica e especialista em acolhimento inicial do escritório **Kassiele Advocacia / Sul & Associados**, focado em **Direito Previdenciário (INSS)**.
Seu objetivo principal é **acolher o segurado com empatia instantânea, realizar a triagem especializada para identificar o funil correto e orientar a coleta dos documentos e laudos médicos necessários**, sem cobrar consultas iniciais nem exigir agendamento prévio.

---

## ESCRITÓRIO E REGRAS COMERCIAIS
- **Advogada Titular**: Dra. Kassiele (OAB/RS)
- **Especialidade**: Benefícios do INSS (BPC-LOAS, Auxílio-Doença, Aposentadorias e Pensões).
- **Regra de Honorários no Êxito (30%)**: O escritório trabalha no formato *ad exitum*. **NÃO COBRAMOS NENHUMA CONSULTA OU TAXA INICIAL**. O segurado só paga 30% do valor quando vencermos o processo e ele receber o benefício no banco/Caixa.
- **Segurança Anti-Golpe**: Sempre que perguntarem sobre a legitimidade ou tiverem receio de fraudes, informe a OAB/RS da Dra. Kassiele, o endereço do escritório e indique nosso Instagram oficial (\`@kassieleadv\`). Lembre que **nunca pedimos transferências Pix para agendamento de perícias ou liberação de alvarás**.

---

## DADOS DA SESSÃO
"data_hora_brasil": "{{ $now.setZone('America/Sao_Paulo').toISO() }}"
- Nome do contato: {{ $('Edit Fields').item.json.Nome }}
- Celular: {{ $('Edit Fields').item.json.Telefone }}
- Atendente Virtual configurada no CRM: {{ $('BUSCA CONFIG IA').item?.json?.nome_agente || 'Sofia' }}

---

## FLUXO DE ATENDIMENTO PREVIDENCIÁRIO (AS 4 FASES DA {{ $('BUSCA CONFIG IA').item?.json?.nome_agente || 'Sofia' }})

### FASE 1 — ACOLHIMENTO E PERGUNTA DE OURO (TRIAGEM DO FUNIL)
No primeiro contato, cumprimente de forma humana e acolhedora se apresentando como **{{ $('BUSCA CONFIG IA').item?.json?.nome_agente || 'Sofia' }}** e faça a **Pergunta de Ouro** para descobrir o perfil contributivo do segurado:
*"Olá, {{ $('Edit Fields').item.json.Nome }}! 👋 Sou a {{ $('BUSCA CONFIG IA').item?.json?.nome_agente || 'Sofia' }}, assistente virtual da Dra. Kassiele. Para entendermos direitinho a sua situação no INSS e agilizarmos seu atendimento, me conta: **O(a) senhor(a) já trabalhou de carteira assinada, é MEI ou costuma pagar o INSS por conta própria?**"*

- Se o cliente responder que **NUNCA contribuiu / não paga INSS / cuida de idoso ou pessoa com deficiência** ➔ Acione a tool \`classificar_lead\` definindo o funil **\`BPC_LOAS\`**.
- Se o cliente responder que **TRABALHOU / CONTRIBUI (CLT, MEI, Carnê)** ➔ Acione a tool \`classificar_lead\` definindo o funil **\`AUXILIO_DOENCA\`**.

---

## FASE 2 — QUALIFICAÇÃO E COLETA DO CHECKLIST DE DOCUMENTOS
Após classificar o funil, oriente o segurado a enviar fotos nítidas ou arquivos PDF da documentação prioritária:
- **Para BPC-LOAS**: Peça foto do **CadÚnico atualizado**, **Laudos ou relatórios médicos/escolares** (mesmo que antigos) e **RG/CPF**.
- **Para Auxílio-Doença**: Peça **Laudo Médico com indicação do CID**, **CNIS ou Carteira de Trabalho** e **RG/CPF**.

> **ATENÇÃO:** Nunca recuse um laudo na primeira resposta por ser antigo! Elogie o envio, acione \`registrar_documento\` e avise que a Dra. Kassiele fará a análise técnica na pasta do CRM.

---

## FASE 3 — PREPARAÇÃO PARA ASSINATURA E FECHAMENTO
Quando o checklist estiver completo ou quando o segurado enviar os laudos principais:
1. Explique com transparência que o próximo passo é a assinatura digital do contrato/procuração para a Dra. Kassiele abrir o requerimento no INSS.
2. Reforce que **só recebemos 30% no êxito (quando o cliente ganhar)**.
3. Acione a tool \`avancar_etapa\` movendo para \`assinatura\`.

---

## FASE 4 — ACOMPANHAMENTO E RAG PROCESSUAL (QUANDO CLIENTES DA CARTEIRA PERGUNTAM)
Se um cliente que já possui processo em andamento perguntar *"Dra., como está meu processo?"*, *"Saiu o resultado da perícia?"*:
- Acione imediatamente a tool \`consultar_andamento\`.
- O banco retornará apenas os documentos, laudos e resumos que o advogado liberou no CRM com a pílula verde (\`liberado_cliente = true\`).
- Se houver diretriz escrita em \`obs_interna\`, obedeça integralmente ao que a equipe determinou.

---

## REGRAS DE TOM E COMUNICAÇÃO
- Seja humana, clara, empática e evite termos jurídicos complicados.
- Proibido dizer "vou consultar o sistema", "estou processando". Fale naturalmente.
- Se o cliente pedir para falar com atendente humano ou se for um caso jurídico complexo/urgência ➔ Acione \`FALA HUMANO\`.

---

## CONTROLE DE COMPORTAMENTO ATIVO (TOGGLES DO CRM)
- **Enviar Áudios Gravados pela Dra. (\`enviar_audios\`):** {{ $('BUSCA CONFIG IA').item?.json?.enviar_audios ?? true }} -> Se for "false", NUNCA envie ou mencione áudios, responda exclusivamente em texto.
- **Escalar Casos Sensíveis (\`escalar_urgente\`):** {{ $('BUSCA CONFIG IA').item?.json?.escalar_urgente ?? true }} -> Se for "false", evite acionar a tool FALA HUMANO, exceto se o cliente insistir muito.
- **Atender Fora do Horário (\`fora_horario\`):** {{ $('BUSCA CONFIG IA').item?.json?.fora_horario ?? true }} -> Se for "false" e for fora do expediente, avise gentilmente que o escritório está fechado e a equipe retornará no próximo dia útil.

---

## AJUSTES FINOS E DIRETRIZES DO ESCRITÓRIO (VIA PAINEL CRM)
Abaixo estão as instruções complementares e ajustes finos definidos diretamente pelos advogados no painel CRM. Essas instruções e diretrizes devem ser seguidas com máxima prioridade no decorrer do atendimento:
{{ $('BUSCA CONFIG IA').item?.json?.prompt_sistema || 'Nenhum ajuste adicional configurado no CRM no momento.' }}`,
    };
  }
});

// Adicionar nó BUSCA CONFIG IA para buscar as configurações da IA que vêm do CRM
const temBuscaConfig = wfOriginal.nodes.some((n) => n.name === "BUSCA CONFIG IA");
if (!temBuscaConfig) {
  wfOriginal.nodes.push({
    parameters: {
      operation: "getAll",
      tableId: "config_ia",
      limit: 1,
      options: {},
    },
    type: "n8n-nodes-base.supabase",
    typeVersion: 1,
    position: [-840, 176],
    id: "busca-config-ia-node-id",
    name: "BUSCA CONFIG IA",
    alwaysOutputData: true,
    credentials: { supabaseApi: { id: "CRED_SUPABASE_ID", name: "Kassiele Advocacia" } },
  });

  // Roteia conexões que iam direto para Edit Fields3 para passarem por BUSCA CONFIG IA
  for (const [src, connTypes] of Object.entries(wfOriginal.connections)) {
    for (const [ct, outputs] of Object.entries(connTypes)) {
      for (const arr of outputs) {
        for (const c of arr) {
          if (c.node === "Edit Fields3" && src !== "BUSCA CONFIG IA") {
            c.node = "BUSCA CONFIG IA";
          }
        }
      }
    }
  }
  wfOriginal.connections["BUSCA CONFIG IA"] = {
    main: [
      [
        {
          node: "Edit Fields3",
          type: "main",
          index: 0,
        },
      ],
    ],
  };
}

if (wfOriginal.connections["Pinecone Vector Store1"]) {
  wfOriginal.connections["Base RAG Juridica (pgvector)"] = wfOriginal.connections["Pinecone Vector Store1"];
  delete wfOriginal.connections["Pinecone Vector Store1"];
}
if (wfOriginal.connections["timeout +1H"]) {
  wfOriginal.connections["Marcar Atendimento Humano"] = wfOriginal.connections["timeout +1H"];
  delete wfOriginal.connections["timeout +1H"];
}
for (const [src, connTypes] of Object.entries(wfOriginal.connections)) {
  for (const [ct, outputs] of Object.entries(connTypes)) {
    for (const arr of outputs) {
      for (const c of arr) {
        if (c.node === "timeout +1H") c.node = "Marcar Atendimento Humano";
        if (c.node === "Pinecone Vector Store1") c.node = "Base RAG Juridica (pgvector)";
      }
    }
  }
}

wfOriginal.settings = { executionOrder: "v1", binaryMode: "separate", timezone: "America/Sao_Paulo" };
delete wfOriginal.versionId;
delete wfOriginal.id;
wfOriginal.meta = { templateCredsSetupCompleted: true };

fs.writeFileSync(
  "./[KASSIELE] AGENTE WHATSAPP & CRM PREVIDENCIARIO.json",
  JSON.stringify(wfOriginal, null, 2),
  "utf8"
);
console.log(`✅ Workflow 1 (Agente Previdenciário) gerado com sucesso: ${wfOriginal.nodes.length} nós.`);

// ===================================================================
// WORKFLOW 2: SERVER MCP PREVIDENCIÁRIO & RAG (SUPABASE TOOLS)
// ===================================================================

const wfMCPPrevi = {
  name: "[KASSIELE] SERVER MCP PREVIDENCIARIO E RAG",
  nodes: [
    {
      parameters: { content: "# MCP SERVER — TOOLS PREVIDENCIÁRIAS (INSS)", height: 400, width: 2200, color: 5 },
      type: "n8n-nodes-base.stickyNote",
      position: [256, -64],
      typeVersion: 1,
      id: "sticky-mcp-previ",
      name: "Sticky Note",
    },
    {
      parameters: { options: {} },
      type: "n8n-nodes-base.dateTimeTool",
      typeVersion: 2,
      position: [1216, 192],
      id: "tool-datetime",
      name: "Date & Time",
    },
    {
      parameters: { path: "kassiele-previdenciario" },
      type: "@n8n/n8n-nodes-langchain.mcpTrigger",
      typeVersion: 2,
      position: [992, -48],
      id: "mcp-trigger-previ",
      name: "MCP Server Trigger",
    },
    // Tool 1: Contexto do Lead
    {
      parameters: {
        descriptionType: "manual",
        toolDescription: "Retorna o chassi 360° do lead: funil atual, etapa, checklist de documentos pendentes/recebidos, próximas perícias INSS agendadas e diretrizes internas (obs_interna). Chamar sempre no início da conversa.",
        operation: "getAll",
        tableId: "leads",
        limit: "=1",
        filters: { conditions: [{ keyName: "telefone", condition: "eq", keyValue: "={{ $fromAI('telefone','Telefone do segurado apenas números','string') }}" }] },
      },
      type: "n8n-nodes-base.supabaseTool",
      typeVersion: 1,
      position: [304, 192],
      id: "tool-contexto-lead",
      name: "contexto_lead",
      credentials: { supabaseApi: { id: "CRED_SUPABASE_ID", name: "Kassiele Advocacia" } },
    },
    // Tool 2: Classificar Lead (Funil BPC-LOAS ou AUXILIO_DOENCA)
    {
      parameters: {
        descriptionType: "manual",
        toolDescription: "Classifica o segurado em um dos funis especializados após a pergunta sobre contribuição: 'BPC_LOAS' (não contribui/idoso/PCD) ou 'AUXILIO_DOENCA' (contribuinte com incapacidade).",
        operation: "update",
        tableId: "leads",
        filters: { conditions: [{ keyName: "telefone", condition: "eq", keyValue: "={{ $fromAI('telefone','Telefone do segurado','string') }}" }] },
        fieldsUi: {
          fieldValues: [
            { fieldId: "funil_slug", fieldValue: "={{ $fromAI('funil_slug','BPC_LOAS ou AUXILIO_DOENCA','string') }}" },
            { fieldId: "etapa_slug", fieldValue: "triagem" },
            { fieldId: "contribuinte", fieldValue: "={{ $fromAI('contribuinte','true ou false','boolean') }}" },
          ],
        },
      },
      type: "n8n-nodes-base.supabaseTool",
      typeVersion: 1,
      position: [512, 192],
      id: "tool-classificar",
      name: "classificar_lead",
      credentials: { supabaseApi: { id: "CRED_SUPABASE_ID", name: "Kassiele Advocacia" } },
    },
    // Tool 3: Atualizar Dados Sócios e Médicos
    {
      parameters: {
        descriptionType: "manual",
        toolDescription: "Atualiza os dados médicos e sociais coletados na triagem: tem_cadunico, doenca_relatada, ultima_contribuicao.",
        operation: "update",
        tableId: "leads",
        filters: { conditions: [{ keyName: "telefone", condition: "eq", keyValue: "={{ $fromAI('telefone','Telefone','string') }}" }] },
        fieldsUi: {
          fieldValues: [
            { fieldId: "tem_cadunico", fieldValue: "={{ $fromAI('tem_cadunico','true ou false','boolean') }}" },
            { fieldId: "doenca_relatada", fieldValue: "={{ $fromAI('doenca_relatada','Resumo do problema de saúde ou CID','string') }}" },
          ],
        },
      },
      type: "n8n-nodes-base.supabaseTool",
      typeVersion: 1,
      position: [720, 192],
      id: "tool-atualizar",
      name: "atualizar_lead",
      credentials: { supabaseApi: { id: "CRED_SUPABASE_ID", name: "Kassiele Advocacia" } },
    },
    // Tool 4: Avançar Etapa no Kanban
    {
      parameters: {
        descriptionType: "manual",
        toolDescription: "Move o card do segurado no funil Kanban do CRM (ex.: para 'coleta_docs', 'assinatura', 'analise_medica').",
        operation: "update",
        tableId: "leads",
        filters: { conditions: [{ keyName: "telefone", condition: "eq", keyValue: "={{ $fromAI('telefone','Telefone','string') }}" }] },
        fieldsUi: {
          fieldValues: [{ fieldId: "etapa_slug", fieldValue: "={{ $fromAI('etapa_slug','Slug da nova etapa','string') }}" }],
        },
      },
      type: "n8n-nodes-base.supabaseTool",
      typeVersion: 1,
      position: [928, 192],
      id: "tool-avancar",
      name: "avancar_etapa",
      credentials: { supabaseApi: { id: "CRED_SUPABASE_ID", name: "Kassiele Advocacia" } },
    },
    // Tool 5: Consultar Andamento (RAG onde liberado_cliente = true)
    {
      parameters: {
        descriptionType: "manual",
        toolDescription: "Consulta resumos processuais, laudos e peças que o advogado liberou explicitamente com a pílula verde (liberado_cliente = true) no CRM para informar ao cliente.",
        operation: "getAll",
        tableId: "documentos_cliente",
        limit: "=5",
        filters: { conditions: [{ keyName: "liberado_cliente", condition: "eq", keyValue: "true" }] },
      },
      type: "n8n-nodes-base.supabaseTool",
      typeVersion: 1,
      position: [1136, 192],
      id: "tool-consultar-rag",
      name: "consultar_andamento",
      credentials: { supabaseApi: { id: "CRED_SUPABASE_ID", name: "Kassiele Advocacia" } },
    },
  ],
  pinData: {},
  connections: {
    "Date & Time": { ai_tool: [[{ node: "MCP Server Trigger", type: "ai_tool", index: 0 }]] },
    contexto_lead: { ai_tool: [[{ node: "MCP Server Trigger", type: "ai_tool", index: 0 }]] },
    classificar_lead: { ai_tool: [[{ node: "MCP Server Trigger", type: "ai_tool", index: 0 }]] },
    atualizar_lead: { ai_tool: [[{ node: "MCP Server Trigger", type: "ai_tool", index: 0 }]] },
    avancar_etapa: { ai_tool: [[{ node: "MCP Server Trigger", type: "ai_tool", index: 0 }]] },
    consultar_andamento: { ai_tool: [[{ node: "MCP Server Trigger", type: "ai_tool", index: 0 }]] },
  },
  active: false,
  settings: { executionOrder: "v1", binaryMode: "separate", timezone: "America/Sao_Paulo" },
  meta: { templateCredsSetupCompleted: true },
};

fs.writeFileSync(
  "./[KASSIELE] SERVER MCP PREVIDENCIARIO E RAG.json",
  JSON.stringify(wfMCPPrevi, null, 2),
  "utf8"
);
console.log(`✅ Workflow 2 (MCP Server Previdenciário) gerado com sucesso: ${wfMCPPrevi.nodes.length} nós.`);

// ===================================================================
// WORKFLOW 3, 4 e 5: AUTOMAÇÕES E CRONS N8N
// ===================================================================

const wfFollowup = {
  name: "[KASSIELE] AUTOMACAO 1 - FOLLOWUP E REPESCAGEM DIARIA",
  nodes: [
    {
      parameters: { rule: { interval: [{ field: "hours", hoursInterval: 24 }] } },
      type: "n8n-nodes-base.scheduleTrigger",
      typeVersion: 1.2,
      position: [240, 300],
      id: "cron-09h",
      name: "Cron 09h Diário",
    },
    {
      parameters: {
        operation: "rpc",
        functionName: "fn_fila_followup",
      },
      type: "n8n-nodes-base.supabase",
      typeVersion: 1,
      position: [460, 300],
      id: "rpc-fila",
      name: "Buscar Fila de Follow-up",
      credentials: { supabaseApi: { id: "CRED_SUPABASE_ID", name: "Kassiele Advocacia" } },
    },
    {
      parameters: { instanceName: "Kassiele Advocacia", remoteJid: "={{ $json.telefone }}@s.whatsapp.net", messageText: "={{ $json.mensagem }}" },
      type: "n8n-nodes-base.evolutionApi",
      typeVersion: 1,
      position: [700, 300],
      id: "send-followup",
      name: "Enviar Cobrança de Laudos",
      credentials: { evolutionApi: { id: "CRED_EVOLUTION_ID", name: "Kassiele Advocacia" } },
    },
  ],
  connections: {
    "Cron 09h Diário": { main: [[{ node: "Buscar Fila de Follow-up", type: "main", index: 0 }]] },
    "Buscar Fila de Follow-up": { main: [[{ node: "Enviar Cobrança de Laudos", type: "main", index: 0 }]] },
  },
  settings: { timezone: "America/Sao_Paulo" },
};

const wfPericia = {
  name: "[KASSIELE] AUTOMACAO 2 - LEMBRETE DE PERICIA INSS",
  nodes: [
    {
      parameters: { rule: { interval: [{ field: "hours", hoursInterval: 24 }] } },
      type: "n8n-nodes-base.scheduleTrigger",
      typeVersion: 1.2,
      position: [240, 300],
      id: "cron-08h",
      name: "Cron 08h Diário",
    },
    {
      parameters: { operation: "rpc", functionName: "fn_fila_lembretes_evento" },
      type: "n8n-nodes-base.supabase",
      typeVersion: 1,
      position: [460, 300],
      id: "rpc-lembrete",
      name: "Buscar Perícias em 2 Dias",
      credentials: { supabaseApi: { id: "CRED_SUPABASE_ID", name: "Kassiele Advocacia" } },
    },
    {
      parameters: {
        instanceName: "Kassiele Advocacia",
        remoteJid: "={{ $json.telefone }}@s.whatsapp.net",
        messageText: "=⚠️ *Atenção, {{ $json.nome }}! Lembrete da Dra. Kassiele:*\n\nSua **Perícia Médica no INSS** está agendada para: **{{ $json.data_hora }}** na **{{ $json.local_detalhe }}**.\n\n📌 **ORIENTAÇÕES OBRIGATÓRIAS:**\n1. Chegue com no mínimo 30 minutos de antecedência.\n2. Leve **TODOS OS SEUS LAUDOS MÉDICOS, ATESTADOS E RECEITAS ORIGINAIS** em mãos.\n3. Leve RG, CPF e Carteira de Trabalho originais.",
      },
      type: "n8n-nodes-base.evolutionApi",
      typeVersion: 1,
      position: [700, 300],
      id: "send-pericia",
      name: "Enviar Lembrete de Perícia",
      credentials: { evolutionApi: { id: "CRED_EVOLUTION_ID", name: "Kassiele Advocacia" } },
    },
  ],
  connections: {
    "Cron 08h Diário": { main: [[{ node: "Buscar Perícias em 2 Dias", type: "main", index: 0 }]] },
    "Buscar Perícias em 2 Dias": { main: [[{ node: "Enviar Lembrete de Perícia", type: "main", index: 0 }]] },
  },
  settings: { timezone: "America/Sao_Paulo" },
};

fs.writeFileSync("./[KASSIELE] AUTOMACAO 1 - FOLLOWUP E REPESCAGEM DIARIA.json", JSON.stringify(wfFollowup, null, 2), "utf8");
fs.writeFileSync("./[KASSIELE] AUTOMACAO 2 - LEMBRETE DE PERICIA INSS.json", JSON.stringify(wfPericia, null, 2), "utf8");
console.log("✅ Automações 1 e 2 (Follow-up e Perícia INSS) geradas com sucesso.");

// Limpar JSONs antigos de agendamento que não usamos mais
["[KASSIELE] AGENTE WHATSAPP & CRM JURIDICO.json", "[KASSIELE] SERVER MCP AGENDA & COMPROMISSOS.json"].forEach(f => {
  if (fs.existsSync(`./${f}`)) {
    fs.unlinkSync(`./${f}`);
    console.log(`🗑️  Substituído com sucesso: ${f}`);
  }
});

console.log("\n🚀 TODOS OS FLUXOS 100% PREVIDENCIÁRIOS PRONTOS NA PASTA!");

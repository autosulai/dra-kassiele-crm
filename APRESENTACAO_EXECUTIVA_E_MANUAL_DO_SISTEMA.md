# 🚀 Manual Completo & Guia Executivo do CRM Jurídico e Agente IA Sofia

Este documento foi elaborado como um **Guia Definitivo e Material de Apresentação Executiva** para o dono do CRM, sócios do escritório e equipe técnica. Ele detalha a arquitetura, o valor de negócio, o funcionamento detalhado de cada aba do sistema e, principalmente, a inteligência autônoma da **Sofia**, nossa Inteligência Artificial operando 24/7 no WhatsApp.

---

## 💎 Parte 1: Visão Geral — O Que é o Sistema e Seu Diferencial Competitivo

CRMs tradicionais sofrem de um grande problema: **dependem exclusivamente da disciplina humana** para serem alimentados e não conversam ativamente com os clientes. 

O **CRM Jurídico Sul & Associados / Kassiele Advocacia** revoluciona essa dinâmica ao unir **três pilares em uma única plataforma integrada**:

```
+-----------------------------------------------------------------------------------+
|                           ECOSISTEMA CRM JURÍDICO 360°                             |
+------------------------------------+----------------------------------------------+
| 1. PAINEL CRM MODERNIZADO          | 2. AGENTE IA SOFIA (WHATSAPP)                |
| - Funil Kanban & BI                | - Atendimento Autônomo 24/7                  |
| - Central Omnichannel              | - Qualificação de Leads (Áudio & Texto)      |
| - Agenda Jurídica Inteligente      | - Agendamento & Cancelamento Autônomo        |
| - Ficha de Clientes PF/PJ & Casos  | - RAG Processual Controlado (Zero Vazamento) |
+------------------------------------+----------------------------------------------+
| 3. INFRAESTRUTURA SÓLIDA (SUPABASE POSTGRESQL + N8N WORKFLOWS / MCP SERVER)       |
+-----------------------------------------------------------------------------------+
```

### Principais Benefícios de Negócio (O "Porquê" do Sistema):
1. **Fim da Perda de Leads por Demora no Atendimento**: A Sofia responde instantaneamente no WhatsApp, ouve áudios, entende o caso jurídico e qualifica o potencial cliente na hora.
2. **Automação Operacional (Secretariado Digital)**: Agendamentos de reuniões presenciais, videoconferências ou ligações são negociados pela própria IA olhando a disponibilidade real da agenda do escritório.
3. **Consulta Processual Humanizada 24h sem Risco Jurídico**: Quando um cliente pergunta *"Dra., como está meu processo?"*, a IA consulta o banco de dados e lê **apenas os resumos liberados explicitamente pelo advogado**, preservando o sigilo de estratégias internas e economizando custos com tokens da OpenAI.
4. **Visão 360° para os Sócios**: Acompanhamento visual claro de todas as oportunidades (valor em negociação, taxa de conversão) e controle total da carteira de clientes e processos.

---

## 🏛️ Parte 1.5: Especialização Operacional — O Modelo Previdenciário Kassiele Advocacia (INSS)

Em alinhamento estratégico com a **Dra. Kassiele**, o sistema foi otimizado para o fluxo de **Direito Previdenciário (INSS)**, eliminando a barreira de agendamento manual prévio e focando 100% no **Acolhimento imediato, Triagem Qualificada no WhatsApp e Coleta de Documentação**.

### 🔹 Os 2 Funis Previdenciários de Triagem Instantânea:
A IA **Sofia** foi treinada para fazer uma única pergunta-chave que separa o segurado de forma natural: *"O senhor(a) já trabalhou de carteira assinada, ou paga o INSS por conta própria, como MEI ou autônomo?"*

1. **Funil BPC-LOAS (Assistencial para Idosos 65+ ou Pessoa com Deficiência)**
   - **Gatilho**: Cliente responde que **não possui contribuição ativa** ao INSS.
   - **Ação da IA**: Acolhe, verifica renda/composição familiar com delicadeza e solicita imediatamente o **CadÚnico atualizado** e **Laudos/Relatórios Médicos** ou escolares.
2. **Funil Auxílio Doença / Incapacidade (Segurado Contribuinte)**
   - **Gatilho**: Cliente responde que **possui contribuição** (CLT, MEI ou carnê).
   - **Ação da IA**: Solicita **Laudo Médico com CID** (ou atestados), CNIS/Carteira de Trabalho, RG, CPF e Comprovante de Residência.

### 💡 Regra de Ouro da Documentação & Transparência Comercial:
- **Laudos Desatualizados são Aceitos**: A Sofia **nunca recusa** um laudo antigo na primeira mensagem. Ela pede que o cliente envie mesmo assim para a Dra. Kassiele abrir a pasta de atendimento, gerando compromisso imediato e evitando que o lead procure outro escritório.
- **Honorários 30% no Êxito (Ad Exitum)**: A IA comunica de forma clara e espontânea que o escritório **só recebe quando o cliente vencer e receber o benefício (30% sobre o êxito)**, sem nenhuma taxa ou consulta cobrada antecipadamente.
- **Garantia Anti-Fraude & Legitimidade**: Para combater o medo de golpes frequente no público vulnerável do INSS, a Sofia informa a **OAB/RS da Dra. Kassiele**, indica o Instagram oficial (`@kassieleadv`) e alerta que o escritório **nunca solicita transferências Pix** para agendamento de perícias ou liberação de alvarás.

---

## 🤖 Parte 2: A Inteligência Artificial — Quem é a Sofia e o Que Ela Faz?

A **Sofia** não é um robô de opções mecânicas (*"desgaste digitando 1 para Trabalhista, 2 para Família"*). Ela é uma **IA Autônoma com Raciocínio Jurídico (LLM de Última Geração)** conectada ao CRM através de um **Servidor MCP (Model Context Protocol)** construído no **n8n**.

A Sofia possui **7 Super-Habilidades (Tools)** que ela aciona autonomamente durante a conversa com o cliente no WhatsApp:

### 1. `qualificar_chassi_lead` (Classificação e Movimentação no Funil)
- **O que faz**: Identifica a dor do cliente, extrai a **Área Jurídica** (Trabalhista, Cível, Família, Previdenciário, Criminal, Empresarial) e estima o valor ou grau de urgência.
- **Efeito no CRM**: Cria ou atualiza o card do lead na aba **Funil & BI** com as tags corretas e move o card entre as colunas (*Novo Lead → Qualificado → Agendado*).

### 2. `listar_horarios_atendimento` & `listar_compromissos` (Grade Horária & Conflitos)
- **O que faz**: Antes de sugerir um horário para o cliente, a Sofia lê a configuração oficial do escritório na tabela `horarios_atendimento` (ex.: Seg a Sex das 08h às 18h) e cruza com a tabela `agenda_compromissos` para ver quais horários já estão ocupados ou bloqueados.
- **Diferencial**: Garante **Zero Conflito** de agenda e respeita pausas de almoço ou bloqueios estratégicos dos advogados.

### 3. `criar_compromisso` (Agendamento Autônomo e Multicanais)
- **O que faz**: Assim que o cliente escolhe o dia e horário, a Sofia agenda formalmente a consulta no banco de dados.
- **Locais Genéricos e Links**: Ela define o tipo de atendimento e salva no banco o **Link da Vídeo Chamada** (Google Meet/Zoom), o endereço da reunião presencial ou o número para ligação telefônica. Esse link fica salvo para o envio de lembretes automáticos.

### 4. `reagendar_compromisso` & `cancelar_compromisso` (Flexibilidade no Atendimento)
- **O que faz**: Se o cliente pedir para mudar a data ou desmarcar, a Sofia localiza o agendamento pelo telefone ou ID, altera a data/hora ou muda o status para `cancelado`, liberando a agenda na hora para outro lead.

### 5. `consultar_documentos_cliente` (Inteligência Processual & RAG Jurídico Seguro)
- **O que faz**: Acionada quando clientes já contratados perguntam sobre o andamento das suas ações na justiça (*"Já saiu a liminar?"*, *"O juiz marcou audiência?"*).
- **Segurança e Economia de Tokens (Regra Inviolável)**: A Sofia executa uma busca restrita no Supabase filtrando **exclusivamente por `liberado_cliente = true`**.
  - Se o advogado liberou o resumo/notícia processual (chave verde ligada no CRM), a Sofia lê e explica de forma clara e acolhedora ao cliente.
  - Se a chave estiver desligada (`liberado_cliente = false`), o documento é tratado como anotação interna e **nunca é enviado à IA**, garantindo sigilo absoluto da estratégia advocatícia e reduzindo em até 80% o consumo de tokens da OpenAI.

### 6. `criar_cliente_crm` (Conversão de Lead em Cliente Formal)
- **O que faz**: Quando o contrato é fechado ou o atendimento exige cadastro formal, a Sofia converte o lead em **Cliente (PF ou PJ)** no banco de dados, criando sua ficha completa na aba **Clientes**.

### 7. Alertas de Urgência & Transbordo Humano
- **O que faz**: Se detectar situações que exigem ação imediata do advogado (ex.: prisão em flagrante, liminar de saúde urgente, oficial de justiça na porta), a Sofia pausa o atendimento automatizado e emite um alerta de transbordo para a equipe assumir o WhatsApp.

---

## 🖥️ Parte 3: Guia Completo das Abas do Painel CRM

O painel foi desenhado com uma estética premium, limpa e altamente produtiva, proporcionando controle total sobre o escritório.

### 📊 1. Funil & BI (Kanban Oportunidades)
- **Visão Kanban Interativa**: Dividida em colunas intuitivas (*Novo Lead, Qualificado, Agendado, Contrato Assinado, Arquivado*).
- **Cards Ricos**: Exibem nome, telefone, tags coloridas de área jurídica, valor estimado da causa, advogado responsável e um **botão de atalho rápido para o WhatsApp**.
- **Chassi de Negociação Completo**: Clicar em um card abre um modal detalhado com histórico, anotações, checklist de conversão e dados de contato do chassi.
- **Painel de BI (Business Intelligence)**: Métricas em tempo real sobre total de oportunidades no funil, valor em pipeline e distribuição por especialidade.

---

### 💬 2. Chat & Central Omnichannel WhatsApp
- **Central Unificada**: Exibe a lista de conversas do WhatsApp à esquerda e a janela de chat à direita, permitindo acompanhar exatamente o que a Sofia está respondendo.
- **Chave Verde de Liga/Desliga da IA (Chatwoot Compacto)**: Um interruptor no cabeçalho permite **pausar a IA instantaneamente** para que o advogado ou secretária assuma o comando da conversa, poupando espaço visual na tela.
- **Lateral Direita Inteligente (Contexto do Contato)**:
  - **Botão `+ Agendar` (Agendamento Rápido)**: Puxa automaticamente todo o histórico e contexto da conversa do lead até aquele momento e abre um **Popup de Agendamento Rápido** preenchido para o advogado revisar e confirmar antes de salvar.
  - **Repositório de Documentos & Resumos para RAG (IA via WhatsApp)**: Permite adicionar peças, minutas e notícias processuais do cliente. Cada item possui a chave **`✓ Liberado (IA)`** vs **`🔒 Interno`**. Ao ativar a chave verde, aquele resumo fica imediatamente liberado para a Sofia consultar no WhatsApp quando o cliente perguntar pelo caso.

---

### 📅 3. Agenda Jurídica Inteligente
- **Visões Flexíveis**: Alternância rápida entre visão **Diária**, **Semanal** e **Mensal**.
- **Grade de Horários Reais**: Na visão do dia, exibe todos os blocos de horário disponíveis e configurados nas configurações do escritório, mostrando clareza sobre o tempo livre.
- **Tipos de Compromisso Genéricos & Salvação de Links**:
  - Aceita reuniões presenciais, videoconferências, ligações telefônicas, audiências e prazos judiciais.
  - Ao selecionar **Vídeo Chamada**, o sistema permite salvar o link (Zoom/Meet/Teams) no banco de dados, que é utilizado posteriormente no envio automático de lembretes.
- **Criação Direta pelo Calendário**: Clicar em qualquer dia do mês ou horário da semana abre o modal limpo em primeiro plano (sem sobreposição por elementos de filtro) para inserção de compromissos manuais ou bloqueios de agenda (`agenda · bloqueio`).

---

### 👥 4. Clientes (Gestão 360° e Ações Processuais)
- **Divisão Inteligente de Layout**: Grade em duas colunas (`340px 1fr`). À esquerda fica a lista rolável com busca rápida e filtros por tipo (**Pessoa Física PF** e **Pessoa Jurídica PJ**). À direita, a ficha cadastral 360° do cliente ativo.
- **Gestão Integrada de Processos (`+ Novo processo`)**:
  - Dentro da ficha de qualquer cliente, na seção *"Processos e Casos"*, há o botão **`+ Novo processo`** e linhas interativas.
  - Clicar em criar ou em qualquer processo existente abre o **Modal de Gestão de Processo**, onde o advogado cadastra/edita Título da Ação, Número CNJ, Área do Direito, Fase Processual (ex.: *Petição Inicial, Conhecimento, Recurso, Execução*), Data da Próxima Audiência e Observações Internas.
  - Tudo sincronizado instantaneamente na tabela `processos` do Supabase.
- **Acesso Documental RAG na Ficha**: A mesma central de documentos e resumos com chave de liberação (`liberado_cliente`) está disponível dentro da ficha do cliente, unificando a gestão operacional e a inteligência da IA.

---

### ⚖️ 5. Processos (Repositório Geral de Casos)
- **Visão Global do Escritório**: Tabela geral listando todos os processos cadastrados no escritório, independentemente de qual cliente seja.
- **Busca e Edição Rápida**: Permite filtrar por número CNJ, título da ação ou fase processual, e clicar em qualquer registro para editar detalhes ou prazos. As alterações refletem simultaneamente na ficha individual do cliente na aba Clientes.

---

### ⚙️ 6. Configurações (Parametrização & Motor da IA)
- **Horários de Atendimento (`horarios_atendimento`)**: Definição exata dos dias da semana e intervalos em que o escritório opera. A IA consulta essa tabela em tempo real para não agendar em feriados, fins de semana ou fora do expediente.
- **Áreas e Tags (`config_tags`)**: Customização das áreas do direito (ex.: *Direito Digital, Sucessões, Tributário*) e das etiquetas do funil.
- **Regras de IA e Prompt de Personalidade (`config_regras`)**: Espaço onde o escritório calibra o tom de voz da Sofia (mais formal, mais acolhedor), insere dados da bancada de advogados, tabela de honorários iniciais e regras de corte de atendimento.

---

## 🏗️ Parte 4: Arquitetura & Fluxo de Dados (Especificação Técnica)

Para o domínio absoluto da arquitetura do sistema por parte dos donos e gestores de TI, o CRM opera em uma estrutura moderna em 3 camadas:

```
[ FRONTEND CRM — REACT/VITE ]
       |
       | (Sincronização em Tempo Real via REST/Realtime)
       v
[ BANCO DE DADOS — SUPABASE POSTGRESQL ] <====== (Consultas SQL e RAG via Tools MCP)
       ^                                                |
       |                                                |
[ MOTOR DE AUTOMACÃO — N8N WORKFLOWS ] <================+
       |
       +---> (Conexão API WhatsApp / Chatwoot)
       +---> (Motor LLM OpenAI GPT-4o / Claude)
```

1. **Supabase (PostgreSQL)**: Armazena com segurança relacional as tabelas `clientes`, `processos`, `documentos_cliente`, `agenda_compromissos`, `horarios_atendimento` e `funil_leads`.
2. **n8n (Workflows & MCP Server)**: Orquestra o fluxo. O workflow **`[KASSIELE] 1. AGENTE PRINCIPAL WHATSAPP & RAG JURIDICO`** recebe a mensagem, analisa o raciocínio com o modelo de IA e invoca as ferramentas expostas pelo workflow **`[KASSIELE] 2. SUBWORKFLOW TOOLS & AGENDA SUPABASE`**.
3. **Frontend CRM**: Conecta-se diretamente ao Supabase com reatividade, garantindo que quando a IA agenda um compromisso ou qualifica um lead no WhatsApp, a tela do advogado seja atualizada imediatamente.

---

## 🔌 Parte 4.5: Integrações Futuras Pré-Prontas (Arquitetura Plug & Play para Kassiele Advocacia)

O sistema foi concebido com uma **arquitetura orientada a eventos** via n8n e Supabase, deixando o terreno 100% preparado e pré-estruturado para ativar **4 Integrações de Alta Performance** de acordo com a expansão operacional do escritório:

| Integração Futura | Como Opera no Nosso Ecossistema | Valor & Impacto Operacional |
| :--- | :--- | :--- |
| **1. Follow-up Automático de Documentos Pendentes** | Cron no n8n rodando diariamente às 10h. Identifica no Supabase leads em *"Coleta de Documentação"* há mais de 24h/48h e envia mensagem humanizada cobrando o Laudo ou CadÚnico. | Evita o esquecimento do lead no meio do funil, resgatando potenciais clientes sem necessidade de cobrança manual pela equipe. |
| **2. Envio de Resumos Semanais do INSS** | Cron no n8n disparado toda sexta-feira. Consulta a tabela `processos` e envia no WhatsApp de cada cliente ativo um resumo humanizado da fase processual e notas do advogado. | Zera as ligações ansiosas perguntando *"como está meu benefício?"*, mantendo o segurado tranquilo, bem informado e confiante na equipe. |
| **3. Assinatura Digital de Contratos (D4Sign / Clicksign)** | Ao mover o card para a etapa *"Assinatura"*, o n8n preenche automaticamente o modelo de Procuração e Contrato ad exitum (30%), gera o link de assinatura e envia no WhatsApp via IA. | Reduz o tempo de formalização de dias para menos de 5 minutos, garantindo fechamento instantâneo do contrato de honorários. |
| **4. Centralização em Pastas Locais / Google Drive / OneDrive** | Quando o segurado envia foto ou PDF de laudo no WhatsApp, o n8n faz o download automático, renomeia com o CPF do cliente, organiza na pasta `[Nome_do_Cliente]/Laudos` no Drive/OneDrive da Dra. Kassiele e vincula a URL em `documentos_cliente.arquivo_url`. | Fim do download manual de arquivos no WhatsApp Web; a equipe técnica já abre o Drive e encontra toda a pasta probatória do segurado limpa e organizada. |

---

## 💡 Parte 5: Roteiro para Apresentação Executiva (Slide a Slide)

Ao apresentar este sistema para sócios, investidores ou para o proprietário do CRM, utilize o seguinte roteiro de 6 slides estruturados por impacto de valor:

### 🎯 Slide 1: O Desafio da Advocacia Moderna vs. Nossa Solução
- **O Problema**: Escritórios perdem até 60% dos novos contatos por demorarem a responder no WhatsApp ou perdem horas preciosas dos advogados em agendamentos repetitivos e dúvidas básicas de status de processo.
- **A Solução**: Um CRM Operacional 360° emparelhado com a **Sofia**, nossa IA autônoma no WhatsApp.

### 🤖 Slide 2: Conheça a Sofia — Sua Linha de Frente 24/7 no WhatsApp
- Mostre como a Sofia recebe o lead (mesmo por mensagem de áudio!), entende a dor jurídica e o qualifica automaticamente no funil.
- Destaque que ela não é um "robô burro de botões", mas um agente com linguagem natural, cordial e assertiva.

### 📅 Slide 3: Automação Total de Agenda (Zero Conflito)
- Apresente a integração da agenda inteligente.
- Explique que a Sofia lê a grade real do escritório e agenda compromissos salvando o link da vídeo chamada no banco para envio automático de lembretes.

### 🔒 Slide 4: O Grande Diferencial — RAG Jurídico Controlado e Seguro
- Explique o conceito de **Token Economy & Blindagem Jurídica**.
- Mostre a chave verde (`liberado_cliente`) na aba Clientes/Chat: quando um cliente pergunta sobre o processo, a IA só lê e informa o que o advogado autorizou. Anotações estratégicas e sigilosas jamais vazam e não consomem créditos da API.

### 📊 Slide 5: Visão 360° no Painel CRM
- Mostre o Funil Kanban com o valor financeiro do pipeline.
- Mostre a facilidade de clicar na ficha do cliente e abrir o modal completo para gerenciar processos, prazos de audiência e anexos em um só lugar.

### 📈 Slide 6: Retorno sobre Investimento (ROI) e Próximos Passos
- **Ganho de Tempo**: Economia estimada de 15 a 20 horas semanais de secretariado e atendimento inicial.
- **Aumento de Conversão**: Atendimento imediato (em menos de 5 segundos) aumenta drasticamente a taxa de fechamento de contratos de novos leads.
- **Escalabilidade**: O escritório pode dobrar sua carteira de clientes sem precisar dobrar a equipe de recepção e triagem.

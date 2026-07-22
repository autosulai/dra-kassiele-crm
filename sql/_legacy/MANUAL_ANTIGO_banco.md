# 📘 Manual Completo do Banco de Dados Supabase & Automações CRM Jurídico IA

Este manual técnico contém **toda a modelagem relacional**, **extensões de Inteligência Artificial (`pgvector`)**, **funções de busca semântica (RAG)** e o **mapeamento completo dos fluxos de automação (n8n + Evolution API + Supabase)** do seu CRM Jurídico.

Com este documento, você poderá subir o seu projeto no **Supabase** de forma 100% estruturada, bastando copiar e colar os blocos SQL no **SQL Editor** do seu painel Supabase.

---

## 🏛️ 1. Arquitetura do Banco & Extensões

O CRM Jurídico utiliza o **PostgreSQL** (via Supabase) com a extensão nativa **`vector`** (`pgvector`) habilitada. Isso permite que o banco armazene e busque **embeddings vetoriais** gerados pela OpenAI (ou similares) para alimentar a base de conhecimento da IA em tempo real.

### 1.1. Habilitando Extensões Essenciais
No **SQL Editor** do Supabase, execute primeiro o comando abaixo:

```sql
-- Habilita a extensão de vetores para IA / RAG
CREATE EXTENSION IF NOT EXISTS vector;

-- Habilita funções de UUID para chaves primárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

---

## 📋 2. Script SQL Completo de Criação das Tabelas (DDL)

Copie o script abaixo e execute no **SQL Editor** do Supabase para criar todas as tabelas e relacionamentos necessários para o CRM:

```sql
-- ============================================================================
-- 1. TABELA DE ESCRITÓRIOS (Dados institucionais e identidades visuais)
-- ============================================================================
CREATE TABLE IF NOT EXISTS escritorio (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    cidade VARCHAR(255) NOT NULL,
    endereco TEXT,
    telefone VARCHAR(50),
    email VARCHAR(255),
    horario TEXT,
    logo TEXT, -- URL da logo no Supabase Storage ou DataURI
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- 2. ADVOGADOS E EQUIPE DO ESCRITÓRIO
-- ============================================================================
CREATE TABLE IF NOT EXISTS advogados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorio(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    area VARCHAR(100) NOT NULL, -- Ex: Trabalhista, Família, Empresarial
    cor VARCHAR(50) DEFAULT 'indigo', -- indigo, teal, amber, rose, slate
    oab VARCHAR(50),
    email VARCHAR(255),
    telefone VARCHAR(50),
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- 3. TIPOS DE COMPROMISSO E TABELA DE VALORES (Agenda e IA)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tipos_compromisso (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorio(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    duracao_min INT DEFAULT 60,
    valor VARCHAR(100), -- Ex: 'R$ 250,00', 'Gratuito', 'Sob consulta'
    cor VARCHAR(50) DEFAULT 'slate',
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- 4. HORÁRIOS DE ATENDIMENTO E DISPONIBILIDADE SEMANAL
-- ============================================================================
CREATE TABLE IF NOT EXISTS horarios_atendimento (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorio(id) ON DELETE CASCADE,
    dia_semana VARCHAR(20) NOT NULL, -- 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'
    ordem_dia INT NOT NULL, -- 1 a 7
    hora_inicio VARCHAR(10) DEFAULT '09:00',
    hora_fim VARCHAR(10) DEFAULT '18:00',
    ativo BOOLEAN DEFAULT true,
    UNIQUE(escritorio_id, dia_semana)
);

-- ============================================================================
-- 5. CONFIGURAÇÕES DA IA E COMPORTAMENTO (Agente Sofia / n8n)
-- ============================================================================
CREATE TABLE IF NOT EXISTS config_ia (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorio(id) ON DELETE CASCADE UNIQUE,
    nome_agente VARCHAR(100) DEFAULT 'Sofia',
    tom_voz VARCHAR(50) DEFAULT 'formal', -- 'formal', 'profissional', 'proximo'
    prompt_sistema TEXT NOT NULL,
    auto_agendar BOOLEAN DEFAULT true,
    confirmar_24h BOOLEAN DEFAULT true,
    escalar_urgente BOOLEAN DEFAULT true,
    fora_horario BOOLEAN DEFAULT true,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- 6. BASE DE CONHECIMENTO IA & RAG (COM VETORES PGVECTOR)
-- ============================================================================
CREATE TABLE IF NOT EXISTS conhecimento_ia (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_ia_id UUID REFERENCES config_ia(id) ON DELETE CASCADE,
    tipo VARCHAR(50) DEFAULT 'texto', -- 'texto', 'doc', 'pdf'
    titulo VARCHAR(255) NOT NULL,
    conteudo TEXT NOT NULL,
    arquivo_url TEXT, -- Link para documento no Supabase Storage (se houver)
    arquivo_nome VARCHAR(255),
    -- Vetor de embedding de 1536 dimensões (Padrão OpenAI text-embedding-3-small / text-embedding-ada-002)
    embedding vector(1536),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índice especial IVFFlat para busca vetorial ultrarrápida no RAG
CREATE INDEX IF NOT EXISTS idx_conhecimento_embedding 
ON conhecimento_ia USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- ============================================================================
-- 7. MODELOS DE MENSAGEM (TEMPLATES DE ATENDIMENTO)
-- ============================================================================
CREATE TABLE IF NOT EXISTS modelos_mensagem (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorio(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    mensagem TEXT NOT NULL,
    categoria VARCHAR(100) DEFAULT 'Geral',
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- 8. CLIENTES DO ESCRITÓRIO (CRM)
-- ============================================================================
CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorio(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(10) DEFAULT 'PF', -- 'PF' ou 'PJ'
    doc_cpf_cnpj VARCHAR(50),
    telefone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    advogado_id UUID REFERENCES advogados(id) ON DELETE SET NULL,
    area VARCHAR(100) DEFAULT 'Trabalhista',
    status VARCHAR(50) DEFAULT 'ativo', -- 'ativo', 'arquivado', 'prospeccao'
    origem VARCHAR(100) DEFAULT 'WhatsApp · Evolution',
    data_cadastro DATE DEFAULT CURRENT_DATE,
    notas TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- 9. PROCESSOS JURÍDICOS (ABA PROCESSOS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS processos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorio(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    advogado_id UUID REFERENCES advogados(id) ON DELETE SET NULL,
    numero_cnj VARCHAR(100) UNIQUE NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    vara VARCHAR(255),
    area VARCHAR(100) DEFAULT 'Trabalhista',
    status VARCHAR(50) DEFAULT 'Ativo', -- 'Ativo', 'Suspenso', 'Concluído'
    fase VARCHAR(100) DEFAULT 'Inicial / Conhecimento',
    valor_causa DECIMAL(15, 2) DEFAULT 0.00,
    data_abertura DATE DEFAULT CURRENT_DATE,
    proximo_prazo DATE,
    notas TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- 9.1. DOCUMENTOS E RESUMOS DE ANDAMENTOS DO CLIENTE (CONSULTA RAG VIA IA / WHATSAPP)
-- ============================================================================
CREATE TABLE IF NOT EXISTS documentos_cliente (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorio(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    processo_id UUID REFERENCES processos(id) ON DELETE SET NULL,
    titulo VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) DEFAULT 'andamento', -- 'peticao', 'andamento', 'sentenca', 'contrato', 'outro'
    conteudo_texto TEXT, -- Resumo ou conteúdo que a IA lê para responder ao cliente
    arquivo_url TEXT, -- Link para arquivo ou PDF (se houver)
    liberado_cliente BOOLEAN DEFAULT false, -- SE TRUE: A IA PODE CONSULTAR E INFORMAR VIA WHATSAPP. SE FALSE: INTERNO DO ESCRITÓRIO.
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_documentos_cliente_busca ON documentos_cliente (cliente_id, liberado_cliente);

-- ============================================================================
-- 10. COMPROMISSOS E AGENDA
-- ============================================================================
CREATE TABLE IF NOT EXISTS compromissos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorio(id) ON DELETE CASCADE,
    tipo_id UUID REFERENCES tipos_compromisso(id) ON DELETE SET NULL,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    advogado_id UUID REFERENCES advogados(id) ON DELETE SET NULL,
    titulo VARCHAR(255) NOT NULL,
    data_hora TIMESTAMP WITH TIME ZONE NOT NULL,
    duracao_min INT DEFAULT 60,
    status VARCHAR(50) DEFAULT 'confirmado', -- 'confirmado', 'pendente', 'cancelado', 'bloqueado'
    local_tipo VARCHAR(100) DEFAULT 'Presencial', -- 'Presencial', 'Videoconferência (Meet)', 'Tribunal / Fórum', 'WhatsApp'
    obs TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- 11. CONVERSAS DO CHAT (WHATSAPP VIA EVOLUTION API)
-- ============================================================================
CREATE TABLE IF NOT EXISTS conversas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorio(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    telefone VARCHAR(50) UNIQUE NOT NULL, -- JID ou Número WhatsApp com DDI (Ex: 555199999999@s.whatsapp.net)
    nome_contato VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    ultima_mensagem TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status VARCHAR(50) DEFAULT 'bot', -- 'bot' (IA respondendo) ou 'humano' (Advogado assumiu)
    tag VARCHAR(50) DEFAULT 'lead', -- 'novo', 'lead', 'cliente', 'urgente'
    nao_lidas INT DEFAULT 0,
    cpf_identificado VARCHAR(50),
    email_identificado VARCHAR(255),
    advogado_atribuido_id UUID REFERENCES advogados(id) ON DELETE SET NULL,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- 12. MENSAGENS INDIVIDUAIS DO HISTÓRICO DO CHAT
-- ============================================================================
CREATE TABLE IF NOT EXISTS mensagens_chat (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversa_id UUID REFERENCES conversas(id) ON DELETE CASCADE,
    remetente VARCHAR(20) NOT NULL, -- 'user' (Cliente), 'bot' (IA Sofia), 'humano' (Advogado via CRM)
    texto TEXT NOT NULL,
    tipo_midia VARCHAR(50) DEFAULT 'texto', -- 'texto', 'áudio', 'imagem', 'documento'
    url_midia TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    lida BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_mensagens_conversa_timestamp ON mensagens_chat(conversa_id, timestamp ASC);

-- ============================================================================
-- 13. ATIVIDADE DO AGENTE (TIMELINE DO PAINEL À DIREITA & TOOL CALLS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS atividade_agente (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversa_id UUID REFERENCES conversas(id) ON DELETE CASCADE,
    telefone VARCHAR(50),
    tipo VARCHAR(50) DEFAULT 'tool_call', -- ex: 'tool_call', 'status', 'tag_update'
    nome_acao VARCHAR(100) NOT NULL, -- ex: 'verificar_disponibilidade', 'criar_agendamento', 'atualizou_tag_agendou', 'FALA HUMANO'
    detalhes TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_atividade_conversa ON atividade_agente(conversa_id, timestamp ASC);
```

---

## 🔍 3. Função SQL para Busca Semântica (RAG no n8n)

Para que o **n8n** consiga consultar a **Base de Conhecimento RAG** (tabela `conhecimento_ia`) de forma inteligente quando um cliente fizer uma pergunta jurídica ou sobre o escritório no WhatsApp, crie esta função no **SQL Editor**:

```sql
CREATE OR REPLACE FUNCTION match_conhecimento_ia (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_config_ia_id uuid
)
RETURNS TABLE (
  id uuid,
  titulo varchar,
  conteudo text,
  similaridade float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.titulo,
    c.conteudo,
    1 - (c.embedding <=> query_embedding) AS similaridade
  FROM conhecimento_ia c
  WHERE c.config_ia_id = p_config_ia_id
    AND 1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

> **Como usar no n8n?** Quando o cliente mandar uma pergunta, o n8n gera o embedding da pergunta pela OpenAI (`text-embedding-3-small`) e faz uma chamada ao Supabase executando o RPC `match_conhecimento_ia`. O retorno será o texto exato dos tópicos ou documentos mais relevantes!

---

## 🛠️ 3.5. Atualização Automática de Colunas em Bancos Existentes (Idempotência)

Caso você já tenha executado uma versão anterior deste SQL no seu Supabase e queira apenas adicionar novos campos sem perder dados, execute também:

```sql
ALTER TABLE compromissos ADD COLUMN IF NOT EXISTS local_detalhe TEXT;
ALTER TABLE documentos_cliente ADD COLUMN IF NOT EXISTS liberado_cliente BOOLEAN DEFAULT false;
ALTER TABLE conversas ADD COLUMN IF NOT EXISTS cpf_identificado VARCHAR(50);
ALTER TABLE conversas ADD COLUMN IF NOT EXISTS email_identificado VARCHAR(255);
ALTER TABLE conversas ADD COLUMN IF NOT EXISTS advogado_atribuido_id UUID REFERENCES advogados(id) ON DELETE SET NULL;
ALTER TABLE modelos_mensagem ADD COLUMN IF NOT EXISTS categoria VARCHAR(100) DEFAULT 'Geral';
ALTER TABLE processos ADD COLUMN IF NOT EXISTS proximo_prazo DATE;
```

---

## 🔒 4. Políticas de Segurança e Acesso (RLS)

Por segurança, recomende ativar o **Row Level Security (RLS)** nas tabelas sensíveis e permitir leitura/escrita autenticada (ou via chave de serviço `service_role` usada no n8n e no backend):

```sql
-- Habilitar RLS em todas as tabelas
ALTER TABLE escritorio ENABLE ROW LEVEL SECURITY;
ALTER TABLE advogados ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_compromisso ENABLE ROW LEVEL SECURITY;
ALTER TABLE horarios_atendimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_ia ENABLE ROW LEVEL SECURITY;
ALTER TABLE conhecimento_ia ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE processos ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE compromissos ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE atividade_agente ENABLE ROW LEVEL SECURITY;

-- Política permissiva para Service Role (com DROP IF EXISTS para ser 100% idempotente ao rodar novamente)
DROP POLICY IF EXISTS "Permitir tudo para Service Role" ON escritorio;
CREATE POLICY "Permitir tudo para Service Role" ON escritorio FOR ALL USING (true);

DROP POLICY IF EXISTS "Permitir tudo para Service Role" ON advogados;
CREATE POLICY "Permitir tudo para Service Role" ON advogados FOR ALL USING (true);

DROP POLICY IF EXISTS "Permitir tudo para Service Role" ON tipos_compromisso;
CREATE POLICY "Permitir tudo para Service Role" ON tipos_compromisso FOR ALL USING (true);

DROP POLICY IF EXISTS "Permitir tudo para Service Role" ON horarios_atendimento;
CREATE POLICY "Permitir tudo para Service Role" ON horarios_atendimento FOR ALL USING (true);

DROP POLICY IF EXISTS "Permitir tudo para Service Role" ON config_ia;
CREATE POLICY "Permitir tudo para Service Role" ON config_ia FOR ALL USING (true);

DROP POLICY IF EXISTS "Permitir tudo para Service Role" ON conhecimento_ia;
CREATE POLICY "Permitir tudo para Service Role" ON conhecimento_ia FOR ALL USING (true);

DROP POLICY IF EXISTS "Permitir tudo para Service Role" ON clientes;
CREATE POLICY "Permitir tudo para Service Role" ON clientes FOR ALL USING (true);

DROP POLICY IF EXISTS "Permitir tudo para Service Role" ON processos;
CREATE POLICY "Permitir tudo para Service Role" ON processos FOR ALL USING (true);

DROP POLICY IF EXISTS "Permitir tudo para Service Role" ON documentos_cliente;
CREATE POLICY "Permitir tudo para Service Role" ON documentos_cliente FOR ALL USING (true);

DROP POLICY IF EXISTS "Permitir tudo para Service Role" ON compromissos;
CREATE POLICY "Permitir tudo para Service Role" ON compromissos FOR ALL USING (true);

DROP POLICY IF EXISTS "Permitir tudo para Service Role" ON conversas;
CREATE POLICY "Permitir tudo para Service Role" ON conversas FOR ALL USING (true);

DROP POLICY IF EXISTS "Permitir tudo para Service Role" ON mensagens_chat;
CREATE POLICY "Permitir tudo para Service Role" ON mensagens_chat FOR ALL USING (true);

DROP POLICY IF EXISTS "Permitir tudo para Service Role" ON atividade_agente;
CREATE POLICY "Permitir tudo para Service Role" ON atividade_agente FOR ALL USING (true);
```

---

## ⚡ 5. Mapa de Automações e Fluxos (n8n + Evolution API + Supabase + CRM)

Aqui está o detalhamento técnico de cada automação para conectar o seu fluxo perfeitamente:

### ⚙️ Fluxo 1: Recebimento e Atendimento com Inteligência Artificial (WhatsApp)
1. **Evolution API (Webhook)**: Recebe a mensagem do cliente no WhatsApp (`messages.upsert`) e dispara um Webhook HTTP POST para o **n8n**.
2. **n8n (Verificação do Status do Chat)**:
   - Consulta a tabela `conversas` pelo `telefone`.
   - Se a conversa não existir, cria um novo registro (`status = 'bot'`, `tag = 'lead'`).
   - Se `status === 'humano'`, **a IA é pausada automaticamente**. O n8n apenas salva a mensagem em `mensagens_chat` (`remetente = 'user'`) e **não responde nada** no WhatsApp.
3. **n8n (Se `status === 'bot'`)**:
   - Salva a mensagem em `mensagens_chat`.
   - Gera o embedding vetorial do texto da mensagem via OpenAI.
   - Consulta o **RAG** usando a função RPC `match_conhecimento_ia` no Supabase para buscar horários, endereços, regras ou PDFs cadastrados.
   - Consulta a tabela `tipos_compromisso` e `horarios_atendimento` para saber valores e agendas disponíveis.
   - Envia o **Prompt de Sistema (`config_ia.prompt_sistema`) + Contexto RAG + Histórico do Chat** para a OpenAI (`gpt-4o-mini` ou `gpt-4o`).
   - Recebe a resposta, salva em `mensagens_chat` (`remetente = 'bot'`) e envia para o WhatsApp do cliente via Evolution API (`sendText`).

---

### ⚙️ Fluxo 2: Assumir Conversa e Devolver à IA no Painel CRM
1. **Quando o Advogado clica em "Assumir Conversa" (`Humano Assumiu`)**:
   - O painel CRM faz um `UPDATE conversas SET status = 'humano' WHERE id = :id` no Supabase.
   - O indicador na UI muda instantaneamente para amarelo (`Humano assumiu`).
   - **Resultado na Automação**: Na próxima mensagem que o cliente mandar no WhatsApp, o n8n identificará `status = 'humano'` e **não responderá com IA**, deixando o advogado atender tranquilamente.
2. **Quando o Advogado clica em "Devolver para IA"**:
   - O painel CRM faz um `UPDATE conversas SET status = 'bot' WHERE id = :id`.
   - O indicador na UI muda para verde (`IA Ativa`).
   - O bot volta a responder automaticamente à próxima interação.

---

### ⚙️ Fluxo 3: Conversão de Lead em Cliente com Tagificação Automática
1. **Ação no Painel**: Na lateral direita do Chat (`Chat.jsx`), quando o lead fornecer os dados e o usuário (ou a IA) clicar em **Adicionar a Clientes**:
   - O sistema insere um novo registro na tabela `clientes`:
     ```sql
     INSERT INTO clientes (escritorio_id, nome, tipo, doc_cpf_cnpj, telefone, email, advogado_id, area, status, origem)
     VALUES (...);
     ```
   - E atualiza a conversa vinculando o cliente e alterando a tag:
     ```sql
     UPDATE conversas 
     SET cliente_id = :novo_cliente_id, tag = 'cliente' 
     WHERE id = :conversa_id;
     ```
2. **Ação da IA (n8n)**: Se durante a conversa no WhatsApp o cliente passar o CPF/CNPJ e o nome completo, o n8n pode rodar uma **Function Tool** (`converter_para_cliente`) que executa exatamente o `INSERT` acima, convertendo o lead em cliente automaticamente sem intervenção humana!

---

### ⚙️ Fluxo 4: Sincronização e Alimentação Automática do RAG (Escritório e Valores)
1. **Ação no Painel (`CfgEscritorio` e `CfgTipos`)**:
   - Quando o administrador salva dados na aba **Escritório** (horário, endereço, telefone) ou na aba **Tipos & horários** (adicionando valores como `R$ 250,00` ou `Gratuito`), o CRM faz um `UPSERT` automático na tabela `conhecimento_ia`.
2. **Geração de Embedding via Webhook ou Trigger**:
   - Ao inserir/atualizar um texto na `conhecimento_ia` onde `embedding IS NULL`, o **Supabase Database Webhook** (ou um webhook disparado pelo próprio frontend) chama um node no n8n (`Gerar Embedding RAG`), que converte o `conteudo` em vetor de 1536 dimensões via OpenAI e grava de volta:
     ```sql
     UPDATE conhecimento_ia SET embedding = :vetor_openai WHERE id = :id;
     ```
   - Isso garante que em menos de 2 segundos a Sofia já está ciente das novas regras e preços do escritório!

---

### ⚙️ Fluxo 5: Agendamento e Confirmação no WhatsApp
1. Quando a IA (Sofia) concilia um agendamento durante o bate-papo no WhatsApp:
   - O n8n executa a tool `agendar_compromisso`, inserindo na tabela `compromissos`:
     ```sql
     INSERT INTO compromissos (escritorio_id, tipo_id, cliente_id, advogado_id, titulo, data_hora, duracao_min, status, local_tipo)
     VALUES (...);
     ```
2. **Automação Diária de Lembretes (n8n Cron Job - 08:00 AM)**:
   - O n8n roda um trigger agendado buscando compromissos para o dia seguinte onde `config_ia.confirmar_24h = true`:
     ```sql
     SELECT c.*, cl.telefone, cl.nome FROM compromissos c
     JOIN clientes cl ON cl.id = c.cliente_id
     WHERE c.data_hora::date = (CURRENT_DATE + INTERVAL '1 day') AND c.status = 'confirmado';
     ```
   - Dispara via Evolution API uma mensagem de confirmação: *"Olá {nome}, passando para confirmar sua consulta amanhã às {hora}. Podemos confirmar?"*.

---

### ⚙️ Fluxo 6: Consulta do Status do Processo via WhatsApp e RAG (Inteligência e Economia de Tokens)
1. **Ação do Advogado no Painel (`Chat.jsx` ou `Clientes.jsx`)**:
   - O advogado vincula e salva resumos de andamentos, petições ou notas na tabela `documentos_cliente`.
   - Utiliza a chave liga/desliga (`liberado_cliente`) para controlar o que o cliente pode consultar.
   - **Economia de Tokens e Sigilo**: Se um documento ou estratégia processual interna estiver com `liberado_cliente = false`, o Supabase nem sequer o envia para a IA. Isso economiza até 80% do consumo de tokens na OpenAI e garante 100% de sigilo profissional nas anotações internas.
2. **Interação do Cliente via WhatsApp**:
   - Quando o cliente envia uma mensagem perguntando: *"Como está o meu processo?"*, *"Teve novidade na minha ação?"* ou *"Saiu a sentença?"*:
   - A agente virtual (Sofia) executa a ferramenta MCP `consultar_documentos_cliente`, que consulta no Supabase todos os documentos onde:
     ```sql
     SELECT titulo, tipo, conteudo_texto, criado_em 
     FROM documentos_cliente 
     WHERE cliente_id = :id_do_cliente AND liberado_cliente = true
     ORDER BY criado_em DESC;
     ```
   - **Resposta Inteligente**: Se houver documentos liberados, a Sofia resume com clareza o status processual em linguagem simples. Se não houver documentos novos liberados, ela responde de forma acolhedora informando que a equipe jurídica está monitorando o caso e avisará assim que houver atualizações formais do fórum.

---

## 🚀 6. Checklist Rápido de Deploy no Supabase
1. [ ] Criar novo projeto no painel do [Supabase](https://supabase.com/).
2. [ ] Abrir o **SQL Editor**, colar o script das **extensões e tabelas (Seção 1 e 2)** e executar (`Run`).
3. [ ] Executar o script da **função de busca semântica RAG (Seção 3)** e das **políticas RLS (Seção 4)**.
4. [ ] Copiar a **Project URL** e a **Service Role Key (`service_role`)** em `Project Settings > API`.
5. [ ] Configurar essas credenciais no arquivo `.env` do nosso frontend/backend e nos nós do **n8n (Supabase Credentials)**.
6. [ ] Conectar a instância da **Evolution API** no n8n para enviar e receber mensagens!

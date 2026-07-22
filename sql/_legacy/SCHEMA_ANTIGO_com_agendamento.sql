-- ============================================================================
-- SCRIPT SQL ÚNICO PARA COLAR NO SQL EDITOR DO SUPABASE (RUN)
-- ============================================================================
-- Este script cria: Extensões (pgvector, uuid), 12 Tabelas, Relacionamentos,
-- Índices Vetoriais (ivfflat), Função RAG (match_conhecimento_ia) e RLS.
-- ============================================================================

-- 0. EXTENSÕES ESSENCIAIS
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
    logo TEXT,
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
    area VARCHAR(100) NOT NULL,
    cor VARCHAR(50) DEFAULT 'indigo',
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
    valor VARCHAR(100),
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
    dia_semana VARCHAR(20) NOT NULL,
    ordem_dia INT NOT NULL,
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
    tom_voz VARCHAR(50) DEFAULT 'formal',
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
    tipo VARCHAR(50) DEFAULT 'texto',
    titulo VARCHAR(255) NOT NULL,
    conteudo TEXT NOT NULL,
    arquivo_url TEXT,
    arquivo_nome VARCHAR(255),
    embedding vector(1536),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

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
    tipo VARCHAR(10) DEFAULT 'PF',
    doc_cpf_cnpj VARCHAR(50),
    telefone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    advogado_id UUID REFERENCES advogados(id) ON DELETE SET NULL,
    area VARCHAR(100) DEFAULT 'Trabalhista',
    status VARCHAR(50) DEFAULT 'ativo',
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
    status VARCHAR(50) DEFAULT 'Ativo',
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
    conteudo_texto TEXT, -- Resumo ou conteúdo de andamento que alimenta a resposta da IA para o cliente
    arquivo_url TEXT, -- Link para arquivo físico ou PDF (se houver)
    liberado_cliente BOOLEAN DEFAULT false, -- SE TRUE: A IA PODE CONSULTAR E INFORMAR VIA WHATSAPP. SE FALSE: INTERNO DO ESCRITÓRIO.
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índice para acelerar busca da IA por documentos liberados
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
    status VARCHAR(50) DEFAULT 'confirmado',
    local_tipo VARCHAR(100) DEFAULT 'Vídeo Chamada',
    local_detalhe TEXT,
    obs TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Garantir colunas adicionais caso a tabela compromissos ou outras já existam em bancos mais antigos
ALTER TABLE compromissos ADD COLUMN IF NOT EXISTS local_detalhe TEXT;
ALTER TABLE documentos_cliente ADD COLUMN IF NOT EXISTS liberado_cliente BOOLEAN DEFAULT false;
ALTER TABLE conversas ADD COLUMN IF NOT EXISTS cpf_identificado VARCHAR(50);
ALTER TABLE conversas ADD COLUMN IF NOT EXISTS email_identificado VARCHAR(255);
ALTER TABLE conversas ADD COLUMN IF NOT EXISTS advogado_atribuido_id UUID REFERENCES advogados(id) ON DELETE SET NULL;
ALTER TABLE modelos_mensagem ADD COLUMN IF NOT EXISTS categoria VARCHAR(100) DEFAULT 'Geral';
ALTER TABLE processos ADD COLUMN IF NOT EXISTS proximo_prazo DATE;

-- ============================================================================
-- 11. CONVERSAS DO CHAT (WHATSAPP VIA EVOLUTION API)
-- ============================================================================
CREATE TABLE IF NOT EXISTS conversas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorio(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    telefone VARCHAR(50) UNIQUE NOT NULL,
    nome_contato VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    ultima_mensagem TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status VARCHAR(50) DEFAULT 'bot',
    tag VARCHAR(50) DEFAULT 'lead',
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
    remetente VARCHAR(20) NOT NULL,
    texto TEXT NOT NULL,
    tipo_midia VARCHAR(50) DEFAULT 'texto',
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
    tipo VARCHAR(50) DEFAULT 'tool_call', -- ex: 'tool_call', 'status', 'marco'
    nome_acao VARCHAR(100) NOT NULL, -- ex: 'verificar_disponibilidade', 'criar_agendamento', 'atualizar_tag_lead', 'FALA HUMANO', 'Ativa com bot'
    detalhes TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_atividade_conversa ON atividade_agente(conversa_id, timestamp ASC);

-- ============================================================================
-- 14. FUNÇÃO SQL PARA BUSCA SEMÂNTICA (RAG NO N8N VIA PGVECTOR)
-- ============================================================================
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

-- ============================================================================
-- 15. POLÍTICAS DE SEGURANÇA E ACESSO (ROW LEVEL SECURITY)
-- ============================================================================
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

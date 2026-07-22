-- ============================================================================
-- CRM JURÍDICO PREVIDENCIÁRIO — KASSIELE ADVOCACIA
-- SCHEMA V1 (sem agendamento de consultas · foco em funil de triagem INSS)
-- ============================================================================
-- Cole este arquivo inteiro no SQL Editor do Supabase e execute (RUN).
-- Depois execute 02_SEEDS_FUNIL.sql e 03_SEEDS_RAG_MENSAGENS.sql.
--
-- MUDANÇAS EM RELAÇÃO AO SCHEMA ANTERIOR:
--   · `leads` passa a ser a entidade central do funil (antes: conversas.tag)
--   · `compromissos` vira `eventos_processuais` (perícia, exigência, audiência)
--   · `tipos_compromisso` vira `tipos_evento`
--   · `processos.numero_cnj` deixa de ser NOT NULL/UNIQUE — processo
--     administrativo do INSS não tem CNJ, tem protocolo
--   · área padrão passa de 'Trabalhista' para 'Previdenciário'
-- ============================================================================

-- 0. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- LIMPEZA (recriação do zero — autorizada)
-- ============================================================================
DROP VIEW IF EXISTS vw_kanban_funil CASCADE;
DROP VIEW IF EXISTS vw_leads_parados CASCADE;
DROP VIEW IF EXISTS vw_checklist_progresso CASCADE;
DROP VIEW IF EXISTS vw_agenda_prazos CASCADE;

DROP TABLE IF EXISTS lead_historico CASCADE;
DROP TABLE IF EXISTS followups_disparados CASCADE;
DROP TABLE IF EXISTS regras_followup CASCADE;
DROP TABLE IF EXISTS checklist_documentos CASCADE;
DROP TABLE IF EXISTS catalogo_documentos CASCADE;
DROP TABLE IF EXISTS etapas_funil CASCADE;
DROP TABLE IF EXISTS atividade_agente CASCADE;
DROP TABLE IF EXISTS mensagens_chat CASCADE;
DROP TABLE IF EXISTS eventos_processuais CASCADE;
DROP TABLE IF EXISTS compromissos CASCADE;
DROP TABLE IF EXISTS documentos_cliente CASCADE;
DROP TABLE IF EXISTS processos CASCADE;
DROP TABLE IF EXISTS conversas CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS modelos_mensagem CASCADE;
DROP TABLE IF EXISTS conhecimento_ia CASCADE;
DROP TABLE IF EXISTS config_ia CASCADE;
DROP TABLE IF EXISTS horarios_atendimento CASCADE;
DROP TABLE IF EXISTS tipos_compromisso CASCADE;
DROP TABLE IF EXISTS tipos_evento CASCADE;
DROP TABLE IF EXISTS funis CASCADE;
DROP TABLE IF EXISTS advogados CASCADE;
DROP TABLE IF EXISTS escritorio CASCADE;

-- ============================================================================
-- 1. ESCRITÓRIO
-- ============================================================================
CREATE TABLE escritorio (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    cidade VARCHAR(255) NOT NULL,
    endereco TEXT,
    telefone VARCHAR(50),
    email VARCHAR(255),
    horario TEXT,
    logo TEXT,
    -- Prova de legitimidade usada pela IA contra a objeção "é golpe?"
    instagram_url TEXT,
    site_url TEXT,
    google_maps_url TEXT,
    criado_em TIMESTAMPTZ DEFAULT now() NOT NULL,
    atualizado_em TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================================
-- 2. ADVOGADOS
-- ============================================================================
CREATE TABLE advogados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorio(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    area VARCHAR(100) NOT NULL DEFAULT 'Previdenciário',
    cor VARCHAR(50) DEFAULT 'indigo',
    oab VARCHAR(50),
    email VARCHAR(255),
    telefone VARCHAR(50),
    -- Se TRUE, recebe os leads escalados pela IA
    recebe_escalonamento BOOLEAN DEFAULT false,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================================
-- 3. FUNIS (catálogo dos dois funis previdenciários)
-- ============================================================================
CREATE TABLE funis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorio(id) ON DELETE CASCADE,
    slug VARCHAR(50) UNIQUE NOT NULL,      -- 'BPC_LOAS' | 'AUXILIO_DOENCA'
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    cor VARCHAR(50) DEFAULT 'indigo',
    ativo BOOLEAN DEFAULT true,
    ordem INT DEFAULT 1
);

-- ============================================================================
-- 4. ETAPAS DO FUNIL
-- ============================================================================
CREATE TABLE etapas_funil (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    funil_id UUID REFERENCES funis(id) ON DELETE CASCADE,
    slug VARCHAR(60) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    ordem INT NOT NULL,
    cor VARCHAR(50) DEFAULT 'slate',
    -- Dias que um lead pode ficar nesta etapa antes de virar "parado" no Kanban
    sla_dias INT DEFAULT 3,
    -- TRUE quando a etapa exige ação humana (protocolo, análise da Dra.)
    requer_humano BOOLEAN DEFAULT false,
    descricao TEXT,
    UNIQUE(funil_id, slug)
);

-- ============================================================================
-- 5. TIPOS DE EVENTO PROCESSUAL (ex-tipos_compromisso)
-- ============================================================================
CREATE TABLE tipos_evento (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorio(id) ON DELETE CASCADE,
    slug VARCHAR(60) UNIQUE NOT NULL,
    nome VARCHAR(255) NOT NULL,
    cor VARCHAR(50) DEFAULT 'slate',
    -- Quantos dias antes a IA avisa o cliente no WhatsApp (NULL = não avisa)
    lembrete_dias_antes INT DEFAULT 1,
    -- Se TRUE, o cliente precisa comparecer presencialmente (perícia, audiência)
    exige_presenca BOOLEAN DEFAULT false,
    ativo BOOLEAN DEFAULT true
);

-- ============================================================================
-- 6. HORÁRIOS DE ATENDIMENTO HUMANO
-- ============================================================================
-- Não é mais grade de agendamento. É a janela em que a IA pode prometer
-- retorno humano ("a Dra. te responde a partir das 9h").
CREATE TABLE horarios_atendimento (
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
-- 7. CONFIGURAÇÃO DA IA
-- ============================================================================
CREATE TABLE config_ia (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorio(id) ON DELETE CASCADE UNIQUE,
    nome_agente VARCHAR(100) DEFAULT 'Sofia',
    tom_voz VARCHAR(50) DEFAULT 'acolhedor',
    prompt_sistema TEXT NOT NULL,
    -- Flags de comportamento (substituem auto_agendar / confirmar_24h)
    followup_automatico BOOLEAN DEFAULT true,
    lembrete_evento BOOLEAN DEFAULT true,
    escalar_urgente BOOLEAN DEFAULT true,
    fora_horario BOOLEAN DEFAULT true,
    enviar_audios BOOLEAN DEFAULT true,
    -- Após N mensagens sem avançar de etapa, a IA passa para humano
    max_mensagens_sem_avanco INT DEFAULT 6,
    atualizado_em TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================================
-- 8. BASE DE CONHECIMENTO RAG (pgvector)
-- ============================================================================
CREATE TABLE conhecimento_ia (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_ia_id UUID REFERENCES config_ia(id) ON DELETE CASCADE,
    tipo VARCHAR(50) DEFAULT 'texto',
    categoria VARCHAR(100) DEFAULT 'geral',  -- 'bpc', 'auxilio_doenca', 'honorarios', 'institucional', 'pericia'
    titulo VARCHAR(255) NOT NULL,
    conteudo TEXT NOT NULL,
    arquivo_url TEXT,
    arquivo_nome VARCHAR(255),
    embedding vector(1536),
    criado_em TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_conhecimento_embedding
ON conhecimento_ia USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================================
-- 9. MODELOS DE MENSAGEM (agora com áudio e vínculo a etapa)
-- ============================================================================
CREATE TABLE modelos_mensagem (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorio(id) ON DELETE CASCADE,
    slug VARCHAR(80) UNIQUE NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    mensagem TEXT NOT NULL,
    categoria VARCHAR(100) DEFAULT 'Geral',
    funil_slug VARCHAR(50),      -- NULL = serve para os dois funis
    etapa_slug VARCHAR(60),      -- etapa em que este texto é usado
    -- 'texto' | 'audio' — áudio na voz da Dra. mantém a naturalidade
    tipo_midia VARCHAR(30) DEFAULT 'texto',
    url_audio TEXT,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================================
-- 10. CLIENTES (lead que assinou contrato)
-- ============================================================================
CREATE TABLE clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorio(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(10) DEFAULT 'PF',
    doc_cpf_cnpj VARCHAR(50),
    telefone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    data_nascimento DATE,
    advogado_id UUID REFERENCES advogados(id) ON DELETE SET NULL,
    area VARCHAR(100) DEFAULT 'Previdenciário',
    status VARCHAR(50) DEFAULT 'ativo',
    origem VARCHAR(100) DEFAULT 'WhatsApp · Evolution',
    -- Pré-cabeamento Google Drive: pasta espelho do cliente
    drive_folder_id TEXT,
    data_cadastro DATE DEFAULT CURRENT_DATE,
    notas TEXT,
    criado_em TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================================
-- 11. LEADS — ENTIDADE CENTRAL DO FUNIL
-- ============================================================================
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorio(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    advogado_id UUID REFERENCES advogados(id) ON DELETE SET NULL,

    -- Identificação
    nome VARCHAR(255) NOT NULL,
    telefone VARCHAR(50) NOT NULL,
    cpf VARCHAR(20),
    data_nascimento DATE,

    -- Classificação do funil
    funil_slug VARCHAR(50) DEFAULT 'INDEFINIDO',   -- BPC_LOAS | AUXILIO_DOENCA | INDEFINIDO
    etapa_slug VARCHAR(60) DEFAULT 'triagem',

    -- Dados de triagem (respostas que definem o funil)
    contribuinte BOOLEAN,                       -- pergunta-chave da triagem
    vinculo VARCHAR(30),                        -- 'CLT' | 'MEI' | 'AUTONOMO' | 'NENHUM' | 'NAO_SABE'
    ultima_contribuicao DATE,                   -- qualidade de segurado / período de graça
    tem_cadunico BOOLEAN,                       -- só BPC-LOAS
    cadunico_atualizado BOOLEAN,
    renda_familiar_declarada DECIMAL(10,2),
    pessoas_no_domicilio INT,
    tipo_publico VARCHAR(30),                   -- 'IDOSO' | 'PCD' (BPC)
    doenca_relatada TEXT,
    cid_identificado VARCHAR(20),               -- extraído do laudo pela visão do GPT
    data_ultimo_laudo DATE,

    -- Motor de follow-up
    proxima_acao_em TIMESTAMPTZ,                -- CAMPO MAIS IMPORTANTE DO SISTEMA
    tentativas_followup INT DEFAULT 0,
    ultimo_contato_em TIMESTAMPTZ DEFAULT now(),

    -- Controle de saída
    status VARCHAR(30) DEFAULT 'aberto',        -- 'aberto' | 'ganho' | 'perdido' | 'congelado'
    motivo_perda VARCHAR(100),
    -- 'nao_qualifica' | 'sem_resposta' | 'outro_escritorio' | 'desistiu' | 'ja_tem_advogado'
    perdido_em TIMESTAMPTZ,

    -- Pré-cabeamento D4Sign (integração futura)
    d4sign_documento_uuid TEXT,
    status_assinatura VARCHAR(30) DEFAULT 'nao_enviado',
    -- 'nao_enviado' | 'enviado' | 'assinado' | 'recusado'
    assinado_em TIMESTAMPTZ,

    -- Protocolo no INSS
    protocolo_inss VARCHAR(80),
    protocolado_em DATE,

    origem VARCHAR(100) DEFAULT 'WhatsApp · Evolution',
    notas TEXT,
    criado_em TIMESTAMPTZ DEFAULT now() NOT NULL,
    atualizado_em TIMESTAMPTZ DEFAULT now() NOT NULL,

    UNIQUE(escritorio_id, telefone)
);

CREATE INDEX idx_leads_funil_etapa ON leads (funil_slug, etapa_slug) WHERE status = 'aberto';
CREATE INDEX idx_leads_proxima_acao ON leads (proxima_acao_em) WHERE status = 'aberto';
CREATE INDEX idx_leads_telefone ON leads (telefone);

-- ============================================================================
-- 12. CATÁLOGO DE DOCUMENTOS EXIGIDOS POR FUNIL
-- ============================================================================
CREATE TABLE catalogo_documentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    funil_slug VARCHAR(50) NOT NULL,
    slug VARCHAR(60) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    obrigatorio BOOLEAN DEFAULT true,
    ordem INT DEFAULT 1,
    -- Texto que a IA usa para pedir este documento no WhatsApp
    instrucao_cliente TEXT,
    -- Dias de validade (laudo médico envelhece; CadÚnico precisa estar atualizado)
    validade_dias INT,
    UNIQUE(funil_slug, slug)
);

-- ============================================================================
-- 13. CHECKLIST DE DOCUMENTOS DO LEAD
-- ============================================================================
CREATE TABLE checklist_documentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    documento_slug VARCHAR(60) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    obrigatorio BOOLEAN DEFAULT true,
    ordem INT DEFAULT 1,
    status VARCHAR(30) DEFAULT 'pendente',
    -- 'pendente' | 'recebido' | 'ilegivel' | 'vencido' | 'dispensado'
    arquivo_url TEXT,
    -- Dados extraídos pela leitura de imagem do GPT no n8n (CID, NIS, datas)
    dados_extraidos JSONB,
    observacao TEXT,
    recebido_em TIMESTAMPTZ,
    atualizado_em TIMESTAMPTZ DEFAULT now(),
    UNIQUE(lead_id, documento_slug)
);

CREATE INDEX idx_checklist_lead ON checklist_documentos (lead_id, status);

-- ============================================================================
-- 14. REGRAS DE FOLLOW-UP (cadência parametrizável pela Dra. no painel)
-- ============================================================================
CREATE TABLE regras_followup (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorio(id) ON DELETE CASCADE,
    funil_slug VARCHAR(50),        -- NULL = vale para todos
    etapa_slug VARCHAR(60),        -- NULL = vale para todas
    tentativa INT NOT NULL,        -- 1, 2, 3, 4
    dias_apos INT NOT NULL,        -- D+1, D+3, D+7, D+15
    modelo_slug VARCHAR(80),       -- FK lógica para modelos_mensagem.slug
    canal VARCHAR(20) DEFAULT 'texto',   -- 'texto' | 'audio'
    acao_final VARCHAR(40) DEFAULT 'proxima_tentativa',
    -- 'proxima_tentativa' | 'escalar_humano' | 'marcar_perdido'
    ativo BOOLEAN DEFAULT true,
    UNIQUE(escritorio_id, funil_slug, etapa_slug, tentativa)
);

-- ============================================================================
-- 15. HISTÓRICO DE FOLLOW-UPS DISPARADOS (evita duplicidade)
-- ============================================================================
CREATE TABLE followups_disparados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    regra_id UUID REFERENCES regras_followup(id) ON DELETE SET NULL,
    tentativa INT,
    etapa_slug VARCHAR(60),
    canal VARCHAR(20),
    mensagem_enviada TEXT,
    houve_resposta BOOLEAN DEFAULT false,
    disparado_em TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_followups_lead ON followups_disparados (lead_id, disparado_em DESC);

-- ============================================================================
-- 16. HISTÓRICO DE MUDANÇA DE ETAPA (auditoria do funil)
-- ============================================================================
CREATE TABLE lead_historico (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    etapa_anterior VARCHAR(60),
    etapa_nova VARCHAR(60),
    funil_anterior VARCHAR(50),
    funil_novo VARCHAR(50),
    origem VARCHAR(30) DEFAULT 'ia',   -- 'ia' | 'painel' | 'sistema'
    autor VARCHAR(255),
    observacao TEXT,
    criado_em TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_lead_historico ON lead_historico (lead_id, criado_em DESC);

-- ============================================================================
-- 17. PROCESSOS (administrativo INSS ou judicial)
-- ============================================================================
CREATE TABLE processos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorio(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    advogado_id UUID REFERENCES advogados(id) ON DELETE SET NULL,
    -- Administrativo do INSS não tem CNJ. Por isso ambos são opcionais.
    numero_cnj VARCHAR(100),
    protocolo_inss VARCHAR(80),
    esfera VARCHAR(30) DEFAULT 'administrativo',  -- 'administrativo' | 'judicial'
    titulo VARCHAR(255) NOT NULL,
    beneficio VARCHAR(60),        -- 'BPC_LOAS' | 'AUXILIO_DOENCA' | 'APOSENTADORIA_INVALIDEZ'
    vara VARCHAR(255),
    area VARCHAR(100) DEFAULT 'Previdenciário',
    status VARCHAR(50) DEFAULT 'Ativo',
    fase VARCHAR(100) DEFAULT 'Protocolado',
    -- 'Protocolado' | 'Exigência' | 'Perícia Agendada' | 'Em Análise'
    -- | 'Deferido' | 'Indeferido' | 'Recurso' | 'Judicializado'
    valor_causa DECIMAL(15,2) DEFAULT 0.00,
    data_abertura DATE DEFAULT CURRENT_DATE,
    proximo_prazo DATE,
    notas TEXT,
    criado_em TIMESTAMPTZ DEFAULT now() NOT NULL,
    atualizado_em TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_processos_cliente ON processos (cliente_id);

-- ============================================================================
-- 18. DOCUMENTOS E ANDAMENTOS (consulta RAG do cliente via WhatsApp)
-- ============================================================================
CREATE TABLE documentos_cliente (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorio(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    processo_id UUID REFERENCES processos(id) ON DELETE SET NULL,
    titulo VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) DEFAULT 'andamento',
    conteudo_texto TEXT,
    arquivo_url TEXT,
    -- SE TRUE: a IA pode informar via WhatsApp. SE FALSE: interno do escritório.
    liberado_cliente BOOLEAN DEFAULT false,
    criado_em TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_documentos_cliente_busca ON documentos_cliente (cliente_id, liberado_cliente);

-- ============================================================================
-- 19. EVENTOS PROCESSUAIS (ex-compromissos) — PERÍCIAS, EXIGÊNCIAS, PRAZOS
-- ============================================================================
-- Não é agendamento de consulta. É a data que o INSS ou o juízo determinou,
-- registrada pela equipe, com lembrete automático para o cliente.
CREATE TABLE eventos_processuais (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorio(id) ON DELETE CASCADE,
    tipo_id UUID REFERENCES tipos_evento(id) ON DELETE SET NULL,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    processo_id UUID REFERENCES processos(id) ON DELETE CASCADE,
    advogado_id UUID REFERENCES advogados(id) ON DELETE SET NULL,
    titulo VARCHAR(255) NOT NULL,
    data_hora TIMESTAMPTZ NOT NULL,
    duracao_min INT DEFAULT 60,
    status VARCHAR(50) DEFAULT 'agendado',
    -- 'agendado' | 'cumprido' | 'perdido' | 'remarcado' | 'cancelado'
    local_tipo VARCHAR(100) DEFAULT 'Agência INSS',
    local_detalhe TEXT,
    -- Controle do lembrete automático no WhatsApp
    lembrete_enviado BOOLEAN DEFAULT false,
    lembrete_enviado_em TIMESTAMPTZ,
    obs TEXT,
    criado_em TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_eventos_data ON eventos_processuais (data_hora) WHERE status = 'agendado';

-- ============================================================================
-- 20. CONVERSAS (canal WhatsApp)
-- ============================================================================
CREATE TABLE conversas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorio(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    telefone VARCHAR(50) UNIQUE NOT NULL,
    nome_contato VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    ultima_mensagem TEXT,
    timestamp TIMESTAMPTZ DEFAULT now() NOT NULL,
    status VARCHAR(50) DEFAULT 'bot',      -- 'bot' | 'humano'
    tag VARCHAR(50) DEFAULT 'lead',
    nao_lidas INT DEFAULT 0,
    -- Contador que dispara o escalonamento por falta de progresso
    mensagens_sem_avanco INT DEFAULT 0,
    cpf_identificado VARCHAR(50),
    email_identificado VARCHAR(255),
    advogado_atribuido_id UUID REFERENCES advogados(id) ON DELETE SET NULL,
    atualizado_em TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================================
-- 21. MENSAGENS DO CHAT
-- ============================================================================
CREATE TABLE mensagens_chat (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversa_id UUID REFERENCES conversas(id) ON DELETE CASCADE,
    remetente VARCHAR(20) NOT NULL,    -- 'cliente' | 'bot' | 'humano'
    texto TEXT NOT NULL,
    tipo_midia VARCHAR(50) DEFAULT 'texto',
    url_midia TEXT,
    -- Transcrição do áudio / leitura da imagem já feitas no n8n
    transcricao TEXT,
    timestamp TIMESTAMPTZ DEFAULT now() NOT NULL,
    lida BOOLEAN DEFAULT false
);

CREATE INDEX idx_mensagens_conversa_timestamp ON mensagens_chat (conversa_id, timestamp ASC);

-- ============================================================================
-- 22. ATIVIDADE DO AGENTE (timeline de tool calls no painel)
-- ============================================================================
CREATE TABLE atividade_agente (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversa_id UUID REFERENCES conversas(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    telefone VARCHAR(50),
    tipo VARCHAR(50) DEFAULT 'tool_call',
    nome_acao VARCHAR(100) NOT NULL,
    detalhes TEXT,
    timestamp TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_atividade_conversa ON atividade_agente (conversa_id, timestamp ASC);

-- ============================================================================
-- 23. FUNÇÕES E GATILHOS
-- ============================================================================

-- 23.1 Atualiza `atualizado_em` automaticamente
CREATE OR REPLACE FUNCTION fn_touch_atualizado_em()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.atualizado_em := now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_leads_touch BEFORE UPDATE ON leads
FOR EACH ROW EXECUTE FUNCTION fn_touch_atualizado_em();

CREATE TRIGGER trg_processos_touch BEFORE UPDATE ON processos
FOR EACH ROW EXECUTE FUNCTION fn_touch_atualizado_em();

CREATE TRIGGER trg_conversas_touch BEFORE UPDATE ON conversas
FOR EACH ROW EXECUTE FUNCTION fn_touch_atualizado_em();


-- 23.2 Monta o checklist automaticamente quando o funil do lead é definido
-- POR QUE: garante que nenhum lead exista sem checklist. É o checklist que
-- alimenta o follow-up específico ("falta só o CadÚnico"), que converte muito
-- mais que o follow-up genérico ("oi, tudo bem?").
CREATE OR REPLACE FUNCTION fn_montar_checklist_lead()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_mudou BOOLEAN := false;
BEGIN
    -- PostgreSQL NÃO garante avaliação em curto-circuito de OR, e OLD não
    -- existe em trigger de INSERT. Por isso o TG_OP é testado separado.
    IF TG_OP = 'INSERT' THEN
        v_mudou := true;
    ELSE
        v_mudou := (NEW.funil_slug IS DISTINCT FROM OLD.funil_slug);
    END IF;

    IF NEW.funil_slug IS DISTINCT FROM 'INDEFINIDO' AND v_mudou THEN

        -- Remove itens do funil antigo que ainda não foram recebidos
        DELETE FROM checklist_documentos
        WHERE lead_id = NEW.id AND status = 'pendente';

        INSERT INTO checklist_documentos (lead_id, documento_slug, nome, obrigatorio, ordem)
        SELECT NEW.id, cd.slug, cd.nome, cd.obrigatorio, cd.ordem
        FROM catalogo_documentos cd
        WHERE cd.funil_slug = NEW.funil_slug
        ON CONFLICT (lead_id, documento_slug) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_leads_checklist AFTER INSERT OR UPDATE OF funil_slug ON leads
FOR EACH ROW EXECUTE FUNCTION fn_montar_checklist_lead();


-- 23.3 Registra mudança de etapa/funil no histórico e zera a cadência
-- POR QUE: quando o lead avança, a contagem de follow-up precisa reiniciar.
-- Sem isso, um lead que respondeu continuaria recebendo cobrança da etapa antiga.
CREATE OR REPLACE FUNCTION fn_log_mudanca_etapa()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.etapa_slug IS DISTINCT FROM OLD.etapa_slug
       OR NEW.funil_slug IS DISTINCT FROM OLD.funil_slug THEN

        INSERT INTO lead_historico (lead_id, etapa_anterior, etapa_nova,
                                    funil_anterior, funil_novo, origem)
        VALUES (NEW.id, OLD.etapa_slug, NEW.etapa_slug,
                OLD.funil_slug, NEW.funil_slug, 'sistema');

        NEW.tentativas_followup := 0;
        NEW.ultimo_contato_em := now();
        -- Só reprograma cobrança se o lead continua aberto. Sem esta guarda,
        -- um lead marcado como ganho ou perdido voltaria a receber follow-up.
        IF NEW.status = 'aberto' THEN
            NEW.proxima_acao_em := now() + INTERVAL '1 day';
        ELSE
            NEW.proxima_acao_em := NULL;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_leads_historico BEFORE UPDATE ON leads
FOR EACH ROW EXECUTE FUNCTION fn_log_mudanca_etapa();


-- 23.4 Busca semântica na base de conhecimento (RAG usado pelo n8n)
DROP FUNCTION IF EXISTS match_conhecimento_ia CASCADE;
CREATE OR REPLACE FUNCTION match_conhecimento_ia (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_config_ia_id uuid
)
RETURNS TABLE (id uuid, titulo varchar, conteudo text, categoria varchar, similaridade float)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.titulo, c.conteudo, c.categoria,
         1 - (c.embedding <=> query_embedding) AS similaridade
  FROM conhecimento_ia c
  WHERE c.config_ia_id = p_config_ia_id
    AND 1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


-- 23.5 TOOL DO n8n: retorna o estado completo do lead para a IA
-- POR QUE: uma única chamada devolve tudo que a Sofia precisa saber para
-- responder com contexto — economiza tokens e evita várias queries no agente.
DROP FUNCTION IF EXISTS fn_contexto_lead CASCADE;
CREATE OR REPLACE FUNCTION fn_contexto_lead(p_telefone VARCHAR)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE resultado JSONB;
BEGIN
  SELECT jsonb_build_object(
    'lead_id', l.id,
    'nome', l.nome,
    'funil', l.funil_slug,
    'etapa', l.etapa_slug,
    'contribuinte', l.contribuinte,
    'vinculo', l.vinculo,
    'tem_cadunico', l.tem_cadunico,
    'data_ultimo_laudo', l.data_ultimo_laudo,
    'status', l.status,
    'protocolo_inss', l.protocolo_inss,
    'status_assinatura', l.status_assinatura,
    'e_cliente', (l.cliente_id IS NOT NULL),
    'documentos_pendentes', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('slug', cd.documento_slug, 'nome', cd.nome))
        FROM checklist_documentos cd
        WHERE cd.lead_id = l.id AND cd.status = 'pendente' AND cd.obrigatorio
    ), '[]'::jsonb),
    'documentos_recebidos', COALESCE((
        SELECT jsonb_agg(cd.nome)
        FROM checklist_documentos cd
        WHERE cd.lead_id = l.id AND cd.status = 'recebido'
    ), '[]'::jsonb),
    'proximo_evento', (
        SELECT jsonb_build_object('titulo', e.titulo, 'data_hora', e.data_hora,
                                  'local', e.local_detalhe)
        FROM eventos_processuais e
        WHERE e.lead_id = l.id AND e.status = 'agendado' AND e.data_hora > now()
        ORDER BY e.data_hora ASC LIMIT 1
    )
  ) INTO resultado
  FROM leads l
  WHERE l.telefone = p_telefone
  LIMIT 1;

  RETURN COALESCE(resultado, '{"lead_id": null}'::jsonb);
END;
$$;


-- 23.6 TOOL DO n8n: marca um documento como recebido
DROP FUNCTION IF EXISTS fn_registrar_documento CASCADE;
CREATE OR REPLACE FUNCTION fn_registrar_documento(
  p_lead_id UUID,
  p_documento_slug VARCHAR,
  p_arquivo_url TEXT DEFAULT NULL,
  p_status VARCHAR DEFAULT 'recebido',
  p_dados_extraidos JSONB DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE v_pendentes INT; v_total INT;
BEGIN
  UPDATE checklist_documentos
  SET status = p_status,
      arquivo_url = COALESCE(p_arquivo_url, arquivo_url),
      dados_extraidos = COALESCE(p_dados_extraidos, dados_extraidos),
      recebido_em = CASE WHEN p_status = 'recebido' THEN now() ELSE recebido_em END,
      atualizado_em = now()
  WHERE lead_id = p_lead_id AND documento_slug = p_documento_slug;

  -- Se o laudo trouxe CID/data pela leitura de imagem, propaga para o lead
  IF p_documento_slug = 'laudo_medico' AND p_dados_extraidos IS NOT NULL THEN
    UPDATE leads SET
      cid_identificado = COALESCE(p_dados_extraidos->>'cid', cid_identificado),
      data_ultimo_laudo = COALESCE((p_dados_extraidos->>'data_emissao')::DATE, data_ultimo_laudo)
    WHERE id = p_lead_id;
  END IF;

  SELECT COUNT(*) FILTER (WHERE status = 'pendente' AND obrigatorio),
         COUNT(*) FILTER (WHERE obrigatorio)
  INTO v_pendentes, v_total
  FROM checklist_documentos WHERE lead_id = p_lead_id;

  UPDATE leads SET ultimo_contato_em = now(), tentativas_followup = 0 WHERE id = p_lead_id;

  RETURN jsonb_build_object(
    'ok', true,
    'pendentes', v_pendentes,
    'total_obrigatorios', v_total,
    'checklist_completo', (v_pendentes = 0)
  );
END;
$$;


-- 23.7 TOOL DO n8n: fila diária de follow-up
-- Chamada pelo Schedule Trigger. Retorna quem precisa ser cobrado hoje,
-- já com o texto do modelo e o documento que está faltando.
DROP FUNCTION IF EXISTS fn_fila_followup CASCADE;
CREATE OR REPLACE FUNCTION fn_fila_followup()
RETURNS TABLE (
  lead_id UUID, nome VARCHAR, telefone VARCHAR, funil_slug VARCHAR,
  etapa_slug VARCHAR, tentativa INT, canal VARCHAR,
  modelo_slug VARCHAR, mensagem TEXT, url_audio TEXT,
  acao_final VARCHAR, documentos_pendentes TEXT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT l.id, l.nome, l.telefone, l.funil_slug, l.etapa_slug,
         (l.tentativas_followup + 1)::INT,
         r.canal, r.modelo_slug, m.mensagem, m.url_audio, r.acao_final,
         COALESCE((
            SELECT string_agg(cd.nome, ', ' ORDER BY cd.ordem)
            FROM checklist_documentos cd
            WHERE cd.lead_id = l.id AND cd.status = 'pendente' AND cd.obrigatorio
         ), '')
  FROM leads l
  JOIN regras_followup r
    ON r.tentativa = l.tentativas_followup + 1
   AND r.ativo
   AND (r.funil_slug IS NULL OR r.funil_slug = l.funil_slug)
   AND (r.etapa_slug IS NULL OR r.etapa_slug = l.etapa_slug)
  LEFT JOIN modelos_mensagem m ON m.slug = r.modelo_slug
  WHERE l.status = 'aberto'
    AND l.proxima_acao_em IS NOT NULL
    AND l.proxima_acao_em <= now()
    AND EXISTS (SELECT 1 FROM config_ia WHERE COALESCE(followup_automatico, true) = true)
  ORDER BY l.proxima_acao_em ASC;
END;
$$;


-- 23.8 TOOL DO n8n: registra o disparo e reprograma a próxima ação
DROP FUNCTION IF EXISTS fn_registrar_followup CASCADE;
CREATE OR REPLACE FUNCTION fn_registrar_followup(
  p_lead_id UUID,
  p_tentativa INT,
  p_canal VARCHAR,
  p_mensagem TEXT,
  p_acao_final VARCHAR DEFAULT 'proxima_tentativa'
)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE v_lead leads%ROWTYPE; v_proximo_dias INT;
BEGIN
  SELECT * INTO v_lead FROM leads WHERE id = p_lead_id;

  INSERT INTO followups_disparados (lead_id, tentativa, etapa_slug, canal, mensagem_enviada)
  VALUES (p_lead_id, p_tentativa, v_lead.etapa_slug, p_canal, p_mensagem);

  IF p_acao_final = 'marcar_perdido' THEN
    UPDATE leads SET status = 'perdido', motivo_perda = 'sem_resposta',
                     perdido_em = now(), proxima_acao_em = NULL,
                     tentativas_followup = p_tentativa
    WHERE id = p_lead_id;
    RETURN jsonb_build_object('ok', true, 'acao', 'lead_marcado_perdido');
  END IF;

  IF p_acao_final = 'escalar_humano' THEN
    UPDATE conversas SET status = 'humano' WHERE lead_id = p_lead_id;
    UPDATE leads SET tentativas_followup = p_tentativa, proxima_acao_em = NULL
    WHERE id = p_lead_id;
    RETURN jsonb_build_object('ok', true, 'acao', 'escalado_para_humano');
  END IF;

  SELECT r.dias_apos INTO v_proximo_dias
  FROM regras_followup r
  WHERE r.tentativa = p_tentativa + 1 AND r.ativo
    AND (r.funil_slug IS NULL OR r.funil_slug = v_lead.funil_slug)
    AND (r.etapa_slug IS NULL OR r.etapa_slug = v_lead.etapa_slug)
  LIMIT 1;

  UPDATE leads SET
    tentativas_followup = p_tentativa,
    proxima_acao_em = CASE WHEN v_proximo_dias IS NULL THEN NULL
                           ELSE now() + (v_proximo_dias || ' days')::INTERVAL END
  WHERE id = p_lead_id;

  RETURN jsonb_build_object('ok', true, 'acao', 'reprogramado',
                            'proximo_em_dias', v_proximo_dias);
END;
$$;


-- 23.9 TOOL DO n8n: lembretes de perícia/exigência a disparar
DROP FUNCTION IF EXISTS fn_fila_lembretes_evento CASCADE;
CREATE OR REPLACE FUNCTION fn_fila_lembretes_evento()
RETURNS TABLE (
  evento_id UUID, titulo VARCHAR, data_hora TIMESTAMPTZ,
  local_detalhe TEXT, nome VARCHAR, telefone VARCHAR, exige_presenca BOOLEAN
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT e.id, e.titulo, e.data_hora, e.local_detalhe,
         COALESCE(c.nome, l.nome), COALESCE(c.telefone, l.telefone),
         COALESCE(t.exige_presenca, false)
  FROM eventos_processuais e
  LEFT JOIN clientes c ON c.id = e.cliente_id
  LEFT JOIN leads l ON l.id = e.lead_id
  LEFT JOIN tipos_evento t ON t.id = e.tipo_id
  WHERE e.status = 'agendado'
    AND e.lembrete_enviado = false
    AND e.data_hora::date = CURRENT_DATE + COALESCE(t.lembrete_dias_antes, 1)
    AND COALESCE(c.telefone, l.telefone) IS NOT NULL
    AND EXISTS (SELECT 1 FROM config_ia WHERE COALESCE(lembrete_evento, true) = true);
END;
$$;

-- ============================================================================
-- 24. VIEWS PARA O PAINEL REACT
-- ============================================================================

-- 24.1 Kanban: cada lead com progresso do checklist e dias parado
DROP VIEW IF EXISTS vw_leads_parados CASCADE;
DROP VIEW IF EXISTS vw_kanban_funil CASCADE;
CREATE OR REPLACE VIEW vw_kanban_funil AS
SELECT
  l.id, l.escritorio_id, l.nome, l.telefone, l.cpf,
  l.funil_slug, l.etapa_slug, l.status, l.advogado_id,
  l.proxima_acao_em, l.tentativas_followup, l.status_assinatura,
  l.protocolo_inss, l.cliente_id, l.criado_em, l.ultimo_contato_em,
  ef.nome  AS etapa_nome,
  ef.ordem AS etapa_ordem,
  ef.cor   AS etapa_cor,
  ef.sla_dias,
  f.nome   AS funil_nome,
  f.cor    AS funil_cor,
  COALESCE(doc.total, 0)     AS docs_total,
  COALESCE(doc.recebidos, 0) AS docs_recebidos,
  EXTRACT(DAY FROM now() - l.ultimo_contato_em)::INT AS dias_parado,
  (EXTRACT(DAY FROM now() - l.ultimo_contato_em)::INT > COALESCE(ef.sla_dias, 3)) AS fora_do_sla
FROM leads l
LEFT JOIN funis f ON f.slug = l.funil_slug
LEFT JOIN etapas_funil ef ON ef.funil_id = f.id AND ef.slug = l.etapa_slug
LEFT JOIN LATERAL (
    SELECT COUNT(*) FILTER (WHERE obrigatorio) AS total,
           COUNT(*) FILTER (WHERE obrigatorio AND status = 'recebido') AS recebidos
    FROM checklist_documentos WHERE lead_id = l.id
) doc ON true;

-- 24.2 Leads estourando o SLA — alimenta o alerta do Dashboard
CREATE OR REPLACE VIEW vw_leads_parados AS
SELECT * FROM vw_kanban_funil
WHERE status = 'aberto' AND fora_do_sla
ORDER BY dias_parado DESC;

-- 24.3 Agenda de prazos e perícias
CREATE OR REPLACE VIEW vw_agenda_prazos AS
SELECT
  e.id, e.escritorio_id, e.titulo, e.data_hora, e.duracao_min, e.status,
  e.local_tipo, e.local_detalhe, e.obs, e.lembrete_enviado, e.advogado_id,
  t.slug AS tipo_slug, t.nome AS tipo_nome, t.cor AS tipo_cor,
  t.exige_presenca,
  COALESCE(c.nome, l.nome)         AS pessoa_nome,
  COALESCE(c.telefone, l.telefone) AS pessoa_telefone,
  p.numero_cnj, p.protocolo_inss, p.beneficio
FROM eventos_processuais e
LEFT JOIN tipos_evento t ON t.id = e.tipo_id
LEFT JOIN clientes c ON c.id = e.cliente_id
LEFT JOIN leads l ON l.id = e.lead_id
LEFT JOIN processos p ON p.id = e.processo_id;

-- ============================================================================
-- 25. ROW LEVEL SECURITY
-- ============================================================================
-- ATENÇÃO — LGPD: laudo médico e CID são DADO PESSOAL SENSÍVEL (Lei 13.709,
-- art. 11). As políticas abaixo são PERMISSIVAS para o painel funcionar com a
-- chave anon durante o desenvolvimento. ANTES DE PRODUÇÃO, substitua pelo
-- bloco comentado no fim deste arquivo (Supabase Auth + policy por usuário).
-- ============================================================================
ALTER TABLE escritorio             ENABLE ROW LEVEL SECURITY;
ALTER TABLE advogados              ENABLE ROW LEVEL SECURITY;
ALTER TABLE funis                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE etapas_funil           ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_evento           ENABLE ROW LEVEL SECURITY;
ALTER TABLE horarios_atendimento   ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_ia              ENABLE ROW LEVEL SECURITY;
ALTER TABLE conhecimento_ia        ENABLE ROW LEVEL SECURITY;
ALTER TABLE modelos_mensagem       ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalogo_documentos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_documentos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE regras_followup        ENABLE ROW LEVEL SECURITY;
ALTER TABLE followups_disparados   ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_historico         ENABLE ROW LEVEL SECURITY;
ALTER TABLE processos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos_cliente     ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos_processuais    ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens_chat         ENABLE ROW LEVEL SECURITY;
ALTER TABLE atividade_agente       ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'escritorio','advogados','funis','etapas_funil','tipos_evento',
    'horarios_atendimento','config_ia','conhecimento_ia','modelos_mensagem',
    'clientes','leads','catalogo_documentos','checklist_documentos',
    'regras_followup','followups_disparados','lead_historico','processos',
    'documentos_cliente','eventos_processuais','conversas','mensagens_chat',
    'atividade_agente'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "acesso_total" ON %I;', t);
    EXECUTE format('CREATE POLICY "acesso_total" ON %I FOR ALL USING (true) WITH CHECK (true);', t);
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- BLOCO DE ENDURECIMENTO PARA PRODUÇÃO (descomente quando ativar Supabase Auth)
-- ----------------------------------------------------------------------------
-- DROP POLICY IF EXISTS "acesso_total" ON leads;
-- CREATE POLICY "equipe_autenticada" ON leads FOR ALL
--   USING (auth.role() = 'authenticated')
--   WITH CHECK (auth.role() = 'authenticated');
--
-- DROP POLICY IF EXISTS "acesso_total" ON checklist_documentos;
-- CREATE POLICY "equipe_autenticada" ON checklist_documentos FOR ALL
--   USING (auth.role() = 'authenticated')
--   WITH CHECK (auth.role() = 'authenticated');
-- (repetir para as demais tabelas com dado sensível: documentos_cliente,
--  mensagens_chat, processos, clientes)
--
-- O n8n continua usando a service_role key, que ignora RLS por definição.
-- ----------------------------------------------------------------------------

-- ============================================================================
-- 26. REALTIME (para o painel React atualizar sozinho)
-- ============================================================================
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE leads; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE checklist_documentos; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE conversas; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE mensagens_chat; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE eventos_processuais; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE atividade_agente; EXCEPTION WHEN duplicate_object THEN NULL; END;
EXCEPTION WHEN undefined_object THEN
  RAISE NOTICE 'Publicação supabase_realtime não encontrada — ignorando.';
END $$;

-- ============================================================================
-- FIM DO SCHEMA. Execute agora 02_SEEDS_FUNIL.sql
-- ============================================================================

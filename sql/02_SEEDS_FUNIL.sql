-- ============================================================================
-- SEEDS 02 — ESCRITÓRIO, FUNIS, ETAPAS, DOCUMENTOS E CADÊNCIA
-- Execute DEPOIS de 01_SCHEMA_PREVIDENCIARIO.sql
-- ============================================================================
-- AJUSTE OS DADOS DO ESCRITÓRIO ABAIXO ANTES DE EXECUTAR (marcados com <<< )
--
-- IDEMPOTENTE: serve tanto para banco novo (após 01_SCHEMA) quanto para banco
-- existente (após 01b_MIGRACAO). Se o escritório, os advogados ou os horários
-- já existirem, eles são PRESERVADOS e o bloco correspondente é ignorado.
-- Rodar duas vezes não duplica nada.
-- ============================================================================

DO $$
DECLARE
  v_esc UUID;
  v_bpc UUID;
  v_aux UUID;
BEGIN

-- ---------------------------------------------------------------------------
-- ESCRITÓRIO
-- ---------------------------------------------------------------------------
-- Reaproveita o escritório já cadastrado, se houver.
SELECT id INTO v_esc FROM escritorio ORDER BY criado_em ASC LIMIT 1;

IF v_esc IS NULL THEN
INSERT INTO escritorio (nome, cidade, endereco, telefone, email, horario,
                        instagram_url, site_url)
VALUES (
  'Kassiele Advocacia',                                    -- <<< AJUSTAR
  'Brasil',                                                -- <<< AJUSTAR cidade/UF
  'Endereço do escritório',                                -- <<< AJUSTAR
  '+55 00 00000-0000',                                     -- <<< AJUSTAR
  'contato@kassieleadvocacia.adv.br',                      -- <<< AJUSTAR
  'Segunda a sexta, das 09:00 às 18:00',
  'https://instagram.com/kassieleadv',                     -- <<< AJUSTAR (prova anti-golpe)
  NULL
) RETURNING id INTO v_esc;
  RAISE NOTICE 'Escritório criado.';
ELSE
  RAISE NOTICE 'Escritório já existia (%) — preservado. Ajuste OAB/Instagram manualmente se necessário.', v_esc;
END IF;

-- ---------------------------------------------------------------------------
-- ADVOGADOS
-- ---------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM advogados WHERE escritorio_id = v_esc) THEN
  INSERT INTO advogados (escritorio_id, nome, area, cor, oab, recebe_escalonamento, ativo)
  VALUES
    (v_esc, 'Dra. Kassiele', 'Previdenciário', 'indigo', 'OAB/__ 000.000', true, true),  -- <<< AJUSTAR OAB
    (v_esc, 'Equipe Operacional', 'Suporte', 'slate', NULL, false, true);
ELSE
  -- Banco existente: garante que ao menos um advogado receba escalonamento
  UPDATE advogados SET recebe_escalonamento = true
  WHERE id = (SELECT id FROM advogados WHERE escritorio_id = v_esc AND ativo ORDER BY criado_em LIMIT 1)
    AND NOT EXISTS (SELECT 1 FROM advogados WHERE escritorio_id = v_esc AND recebe_escalonamento);
END IF;

-- ---------------------------------------------------------------------------
-- HORÁRIO DE ATENDIMENTO HUMANO
-- ---------------------------------------------------------------------------
INSERT INTO horarios_atendimento (escritorio_id, dia_semana, ordem_dia, hora_inicio, hora_fim, ativo)
VALUES
  (v_esc, 'Segunda-feira', 1, '09:00', '18:00', true),
  (v_esc, 'Terça-feira',   2, '09:00', '18:00', true),
  (v_esc, 'Quarta-feira',  3, '09:00', '18:00', true),
  (v_esc, 'Quinta-feira',  4, '09:00', '18:00', true),
  (v_esc, 'Sexta-feira',   5, '09:00', '18:00', true),
  (v_esc, 'Sábado',        6, '09:00', '12:00', false),
  (v_esc, 'Domingo',       7, '09:00', '12:00', false)
ON CONFLICT (escritorio_id, dia_semana) DO NOTHING;

-- ---------------------------------------------------------------------------
-- FUNIS
-- ---------------------------------------------------------------------------
INSERT INTO funis (escritorio_id, slug, nome, descricao, cor, ordem)
VALUES (v_esc, 'BPC_LOAS', 'BPC-LOAS',
        'Benefício de Prestação Continuada para pessoa idosa (65+) ou com deficiência, sem exigência de contribuição ao INSS.',
        'teal', 1)
ON CONFLICT (slug) DO NOTHING;
SELECT id INTO v_bpc FROM funis WHERE slug = 'BPC_LOAS';

INSERT INTO funis (escritorio_id, slug, nome, descricao, cor, ordem)
VALUES (v_esc, 'AUXILIO_DOENCA', 'Auxílio por Incapacidade',
        'Benefício por incapacidade temporária para quem contribui ou contribuiu ao INSS (CLT, MEI ou autônomo).',
        'indigo', 2)
ON CONFLICT (slug) DO NOTHING;
SELECT id INTO v_aux FROM funis WHERE slug = 'AUXILIO_DOENCA';

INSERT INTO funis (escritorio_id, slug, nome, descricao, cor, ordem)
VALUES (v_esc, 'INDEFINIDO', 'Triagem inicial',
        'Lead que ainda não foi classificado em nenhum dos funis.', 'slate', 0)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- ETAPAS — BPC-LOAS
-- ---------------------------------------------------------------------------
-- A etapa de RENDA vem cedo de propósito: é o filtro que mais desqualifica no
-- BPC (renda per capita > 1/4 do salário mínimo elimina o direito). Descobrir
-- isso antes de coletar documento economiza esforço do escritório.
INSERT INTO etapas_funil (funil_id, slug, nome, ordem, cor, sla_dias, requer_humano, descricao) VALUES
 (v_bpc, 'triagem',        '1. Triagem',              1, 'slate',  1, false, 'Confirmar que não contribui e identificar se é idoso (65+) ou PcD.'),
 (v_bpc, 'renda',          '2. Análise de renda',     2, 'amber',  2, false, 'Composição familiar e renda per capita. Filtro decisivo do BPC.'),
 (v_bpc, 'cadunico',       '3. CadÚnico',             3, 'amber',  3, false, 'Verificar se possui CadÚnico e se está atualizado (últimos 24 meses).'),
 (v_bpc, 'laudo',          '4. Laudo médico',         4, 'purple', 3, false, 'Coletar laudo ou relatório médico. ACEITAR MESMO DESATUALIZADO.'),
 (v_bpc, 'qualificado',    '5. Proposta',             5, 'teal',   2, false, 'Explicar honorários de 30% no êxito e reforçar legitimidade (OAB).'),
 (v_bpc, 'documentacao',   '6. Documentação',         6, 'teal',   3, false, 'RG, CPF e comprovante de residência.'),
 (v_bpc, 'assinatura',     '7. Assinatura',           7, 'indigo', 3, false, 'Procuração e contrato de honorários via D4Sign.'),
 (v_bpc, 'protocolo',      '8. Protocolo INSS',       8, 'indigo', 2, true,  'Equipe protocola o requerimento no Meu INSS.'),
 (v_bpc, 'pericia',        '9. Perícia / Avaliação',  9, 'rose',   7, true,  'Perícia médica e avaliação social do INSS.'),
 (v_bpc, 'acompanhamento','10. Acompanhamento',      10, 'slate', 14, false, 'Atualização periódica até a decisão do INSS.')
ON CONFLICT (funil_id, slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- ETAPAS — AUXÍLIO POR INCAPACIDADE
-- ---------------------------------------------------------------------------
-- Funil mais curto que o BPC (sem CadÚnico e sem análise de renda), por isso
-- converte mais rápido e vale priorizar na fila da equipe.
INSERT INTO etapas_funil (funil_id, slug, nome, ordem, cor, sla_dias, requer_humano, descricao) VALUES
 (v_aux, 'triagem',        '1. Triagem',             1, 'slate',  1, false, 'Confirmar que contribui ou contribuiu (CLT, MEI ou autônomo).'),
 (v_aux, 'vinculo',        '2. Vínculo e carência',  2, 'amber',  2, false, 'Última contribuição, qualidade de segurado e período de graça.'),
 (v_aux, 'laudo',          '3. Laudo médico',        3, 'purple', 3, false, 'Documento central deste funil. ACEITAR MESMO DESATUALIZADO.'),
 (v_aux, 'qualificado',    '4. Proposta',            4, 'teal',   2, false, 'Honorários de 30% no êxito e prova de legitimidade.'),
 (v_aux, 'documentacao',   '5. Documentação',        5, 'teal',   3, false, 'RG, CPF, comprovante de residência e CNIS/carteira.'),
 (v_aux, 'assinatura',     '6. Assinatura',          6, 'indigo', 3, false, 'Procuração e contrato via D4Sign.'),
 (v_aux, 'protocolo',      '7. Protocolo INSS',      7, 'indigo', 2, true,  'Equipe protocola o requerimento no Meu INSS.'),
 (v_aux, 'pericia',        '8. Perícia médica',      8, 'rose',   7, true,  'Perícia médica do INSS — falta = benefício negado.'),
 (v_aux, 'acompanhamento', '9. Acompanhamento',      9, 'slate', 14, false, 'Atualização periódica até a decisão do INSS.')
ON CONFLICT (funil_id, slug) DO NOTHING;

-- Etapa única do funil indefinido
INSERT INTO etapas_funil (funil_id, slug, nome, ordem, cor, sla_dias, descricao)
SELECT id, 'triagem', 'Triagem inicial', 1, 'slate', 1,
       'Lead entrou pelo WhatsApp e ainda não foi classificado.'
FROM funis WHERE slug = 'INDEFINIDO'
ON CONFLICT (funil_id, slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- CATÁLOGO DE DOCUMENTOS — BPC-LOAS
-- ---------------------------------------------------------------------------
INSERT INTO catalogo_documentos (funil_slug, slug, nome, obrigatorio, ordem, validade_dias, instrucao_cliente) VALUES
 ('BPC_LOAS','laudo_medico','Laudo ou relatório médico', true, 1, NULL,
  'Pode ser foto do laudo, relatório ou receituário do médico. Mesmo que seja antigo, me manda — a gente avalia aqui.'),
 ('BPC_LOAS','cadunico','CadÚnico (Cadastro Único)', true, 2, 730,
  'É o cadastro feito no CRAS da sua cidade. Se tiver o número do NIS ou uma foto do comprovante, me envia.'),
 ('BPC_LOAS','rg','Documento de identidade (RG ou CNH)', true, 3, NULL,
  'Foto da frente e do verso, com os dados bem legíveis.'),
 ('BPC_LOAS','cpf','CPF', true, 4, NULL,
  'Pode ser foto do cartão do CPF ou o número digitado aqui mesmo.'),
 ('BPC_LOAS','comp_residencia','Comprovante de residência', true, 5, 90,
  'Conta de luz, água ou telefone dos últimos 3 meses.'),
 ('BPC_LOAS','comp_renda_familiar','Comprovante de renda da família', false, 6, 90,
  'Se alguém da casa trabalha ou recebe benefício, um comprovante ajuda a montar o processo.')
ON CONFLICT (funil_slug, slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- CATÁLOGO DE DOCUMENTOS — AUXÍLIO POR INCAPACIDADE
-- ---------------------------------------------------------------------------
INSERT INTO catalogo_documentos (funil_slug, slug, nome, obrigatorio, ordem, validade_dias, instrucao_cliente) VALUES
 ('AUXILIO_DOENCA','laudo_medico','Laudo ou relatório médico', true, 1, NULL,
  'Pode ser foto do laudo, relatório, atestado ou exame. Mesmo antigo serve — a gente analisa aqui.'),
 ('AUXILIO_DOENCA','rg','Documento de identidade (RG ou CNH)', true, 2, NULL,
  'Foto da frente e do verso, bem legível.'),
 ('AUXILIO_DOENCA','cpf','CPF', true, 3, NULL,
  'Foto do cartão ou o número digitado aqui.'),
 ('AUXILIO_DOENCA','comp_residencia','Comprovante de residência', true, 4, 90,
  'Conta de luz, água ou telefone dos últimos 3 meses.'),
 ('AUXILIO_DOENCA','cnis','CNIS ou carteira de trabalho', true, 5, NULL,
  'O CNIS você baixa no aplicativo Meu INSS. Se preferir, pode mandar foto das páginas da carteira de trabalho.'),
 ('AUXILIO_DOENCA','comp_mei','Comprovantes de pagamento do MEI/GPS', false, 6, NULL,
  'Só se você paga como MEI ou autônomo — as guias dos últimos meses.')
ON CONFLICT (funil_slug, slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- TIPOS DE EVENTO PROCESSUAL
-- ---------------------------------------------------------------------------
-- A perícia é o evento mais crítico do funil: faltar significa benefício
-- negado. Por isso o lembrete é enviado com 2 dias de antecedência.
INSERT INTO tipos_evento (escritorio_id, slug, nome, cor, lembrete_dias_antes, exige_presenca) VALUES
 (v_esc, 'pericia_medica',   'Perícia médica do INSS',        'rose',   2, true),
 (v_esc, 'avaliacao_social', 'Avaliação social (BPC)',        'purple', 2, true),
 (v_esc, 'exigencia',        'Exigência do INSS (prazo 30d)', 'amber',  3, false),
 (v_esc, 'audiencia',        'Audiência judicial',            'rose',   3, true),
 (v_esc, 'prazo_recursal',   'Prazo recursal',                'indigo', 5, false),
 (v_esc, 'prazo_interno',    'Prazo interno do escritório',   'slate',  1, false)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- CADÊNCIA DE FOLLOW-UP (padrão, vale para os dois funis)
-- ---------------------------------------------------------------------------
-- Lógica da escada: começa leve, ganha contexto (áudio explicando POR QUE o
-- documento importa), reforça legitimidade e só então encerra. A tentativa 4
-- não marca perdido direto: escala para humano, porque um lead que já mandou
-- laudo tem valor alto demais para ser descartado por um bot.
-- O UNIQUE de regras_followup tem colunas anuláveis, e no PostgreSQL NULLs não
-- conflitam entre si — ON CONFLICT não funcionaria aqui. Por isso a cadência
-- padrão é substituída inteira a cada execução. Só afeta as REGRAS, nunca os
-- follow-ups já disparados (que ficam em followups_disparados).
DELETE FROM regras_followup WHERE escritorio_id = v_esc;

INSERT INTO regras_followup (escritorio_id, funil_slug, etapa_slug, tentativa, dias_apos, modelo_slug, canal, acao_final) VALUES
 (v_esc, NULL, NULL, 1, 1,  'followup_d1_leve',        'texto', 'proxima_tentativa'),
 (v_esc, NULL, NULL, 2, 3,  'followup_d3_porque',      'audio', 'proxima_tentativa'),
 (v_esc, NULL, NULL, 3, 7,  'followup_d7_legitimidade','texto', 'proxima_tentativa'),
 (v_esc, NULL, NULL, 4, 15, 'followup_d15_ultima',     'texto', 'escalar_humano');

-- Cadência específica da ASSINATURA: mais curta e mais insistente.
-- Quem chegou até aqui já está convencido; a demora costuma ser dificuldade
-- técnica com o D4Sign, não falta de interesse.
INSERT INTO regras_followup (escritorio_id, funil_slug, etapa_slug, tentativa, dias_apos, modelo_slug, canal, acao_final) VALUES
 (v_esc, 'BPC_LOAS',       'assinatura', 1, 1, 'followup_assinatura_1', 'texto', 'proxima_tentativa'),
 (v_esc, 'BPC_LOAS',       'assinatura', 2, 2, 'followup_assinatura_2', 'texto', 'escalar_humano'),
 (v_esc, 'AUXILIO_DOENCA', 'assinatura', 1, 1, 'followup_assinatura_1', 'texto', 'proxima_tentativa'),
 (v_esc, 'AUXILIO_DOENCA', 'assinatura', 2, 2, 'followup_assinatura_2', 'texto', 'escalar_humano');

RAISE NOTICE 'Seeds do funil concluídos. Escritório: %', v_esc;

END $$;

-- ============================================================================
-- FIM. Execute agora 03_SEEDS_RAG_MENSAGENS.sql
-- ============================================================================

// ---------------------------------------------------------------------------
// Dados de demonstração do funil previdenciário.
// Usados quando o Supabase não está configurado, para que o painel possa ser
// apresentado sem depender de conexão. Espelham exatamente o formato das
// views vw_kanban_funil e vw_agenda_prazos.
// ---------------------------------------------------------------------------

const hoje = new Date('2026-07-20T10:00:00-03:00');
const dias = (n) => new Date(hoje.getTime() + n * 86400000).toISOString();

export const funisMock = [
  { id: 'f_bpc', slug: 'BPC_LOAS', nome: 'BPC-LOAS', cor: 'teal', ordem: 1,
    descricao: 'Benefício assistencial para idoso (65+) ou pessoa com deficiência, sem exigência de contribuição.' },
  { id: 'f_aux', slug: 'AUXILIO_DOENCA', nome: 'Auxílio por Incapacidade', cor: 'indigo', ordem: 2,
    descricao: 'Benefício por incapacidade temporária para quem contribui ou contribuiu ao INSS.' },
];

export const etapasMock = [
  // BPC-LOAS
  { id: 'e_b1', funil_id: 'f_bpc', slug: 'triagem',        nome: '1. Triagem',             ordem: 1,  cor: 'slate',  sla_dias: 1 },
  { id: 'e_b2', funil_id: 'f_bpc', slug: 'renda',          nome: '2. Análise de renda',    ordem: 2,  cor: 'amber',  sla_dias: 2 },
  { id: 'e_b3', funil_id: 'f_bpc', slug: 'cadunico',       nome: '3. CadÚnico',            ordem: 3,  cor: 'amber',  sla_dias: 3 },
  { id: 'e_b4', funil_id: 'f_bpc', slug: 'laudo',          nome: '4. Laudo médico',        ordem: 4,  cor: 'purple', sla_dias: 3 },
  { id: 'e_b5', funil_id: 'f_bpc', slug: 'qualificado',    nome: '5. Proposta',            ordem: 5,  cor: 'teal',   sla_dias: 2 },
  { id: 'e_b6', funil_id: 'f_bpc', slug: 'documentacao',   nome: '6. Documentação',        ordem: 6,  cor: 'teal',   sla_dias: 3 },
  { id: 'e_b7', funil_id: 'f_bpc', slug: 'assinatura',     nome: '7. Assinatura',          ordem: 7,  cor: 'indigo', sla_dias: 3 },
  { id: 'e_b8', funil_id: 'f_bpc', slug: 'protocolo',      nome: '8. Protocolo INSS',      ordem: 8,  cor: 'indigo', sla_dias: 2 },
  { id: 'e_b9', funil_id: 'f_bpc', slug: 'pericia',        nome: '9. Perícia / Avaliação', ordem: 9,  cor: 'rose',   sla_dias: 7 },
  { id: 'e_b10',funil_id: 'f_bpc', slug: 'acompanhamento', nome: '10. Acompanhamento',     ordem: 10, cor: 'slate',  sla_dias: 14 },
  // Auxílio por incapacidade
  { id: 'e_a1', funil_id: 'f_aux', slug: 'triagem',        nome: '1. Triagem',            ordem: 1, cor: 'slate',  sla_dias: 1 },
  { id: 'e_a2', funil_id: 'f_aux', slug: 'vinculo',        nome: '2. Vínculo e carência', ordem: 2, cor: 'amber',  sla_dias: 2 },
  { id: 'e_a3', funil_id: 'f_aux', slug: 'laudo',          nome: '3. Laudo médico',       ordem: 3, cor: 'purple', sla_dias: 3 },
  { id: 'e_a4', funil_id: 'f_aux', slug: 'qualificado',    nome: '4. Proposta',           ordem: 4, cor: 'teal',   sla_dias: 2 },
  { id: 'e_a5', funil_id: 'f_aux', slug: 'documentacao',   nome: '5. Documentação',       ordem: 5, cor: 'teal',   sla_dias: 3 },
  { id: 'e_a6', funil_id: 'f_aux', slug: 'assinatura',     nome: '6. Assinatura',         ordem: 6, cor: 'indigo', sla_dias: 3 },
  { id: 'e_a7', funil_id: 'f_aux', slug: 'protocolo',      nome: '7. Protocolo INSS',     ordem: 7, cor: 'indigo', sla_dias: 2 },
  { id: 'e_a8', funil_id: 'f_aux', slug: 'pericia',        nome: '8. Perícia médica',     ordem: 8, cor: 'rose',   sla_dias: 7 },
  { id: 'e_a9', funil_id: 'f_aux', slug: 'acompanhamento', nome: '9. Acompanhamento',     ordem: 9, cor: 'slate',  sla_dias: 14 },
];

export const leadsMock = [
  { id: 'l1', nome: 'Maria de Lourdes Santos', telefone: '+55 51 98123-4455', cpf: '012.345.678-90',
    funil_slug: 'BPC_LOAS', etapa_slug: 'cadunico', etapa_nome: '3. CadÚnico', etapa_ordem: 3, etapa_cor: 'amber',
    funil_nome: 'BPC-LOAS', funil_cor: 'teal', status: 'aberto', sla_dias: 3,
    docs_total: 5, docs_recebidos: 2, dias_parado: 5, fora_do_sla: true,
    proxima_acao_em: dias(0), tentativas_followup: 2, status_assinatura: 'nao_enviado',
    ultimo_contato_em: dias(-5), criado_em: dias(-12) },

  { id: 'l2', nome: 'José Carlos Ribeiro', telefone: '+55 51 99420-1187', cpf: '234.567.890-11',
    funil_slug: 'AUXILIO_DOENCA', etapa_slug: 'laudo', etapa_nome: '3. Laudo médico', etapa_ordem: 3, etapa_cor: 'purple',
    funil_nome: 'Auxílio por Incapacidade', funil_cor: 'indigo', status: 'aberto', sla_dias: 3,
    docs_total: 5, docs_recebidos: 1, dias_parado: 1, fora_do_sla: false,
    proxima_acao_em: dias(1), tentativas_followup: 0, status_assinatura: 'nao_enviado',
    ultimo_contato_em: dias(-1), criado_em: dias(-3) },

  { id: 'l3', nome: 'Antônia Ferreira da Silva', telefone: '+55 51 98877-2310', cpf: null,
    funil_slug: 'BPC_LOAS', etapa_slug: 'triagem', etapa_nome: '1. Triagem', etapa_ordem: 1, etapa_cor: 'slate',
    funil_nome: 'BPC-LOAS', funil_cor: 'teal', status: 'aberto', sla_dias: 1,
    docs_total: 0, docs_recebidos: 0, dias_parado: 0, fora_do_sla: false,
    proxima_acao_em: dias(1), tentativas_followup: 0, status_assinatura: 'nao_enviado',
    ultimo_contato_em: dias(0), criado_em: dias(0) },

  { id: 'l4', nome: 'Sebastião Alves Pinto', telefone: '+55 51 99133-8890', cpf: '345.678.901-22',
    funil_slug: 'AUXILIO_DOENCA', etapa_slug: 'assinatura', etapa_nome: '6. Assinatura', etapa_ordem: 6, etapa_cor: 'indigo',
    funil_nome: 'Auxílio por Incapacidade', funil_cor: 'indigo', status: 'aberto', sla_dias: 3,
    docs_total: 0, docs_recebidos: 0, dias_parado: 4, fora_do_sla: true,
    proxima_acao_em: dias(0), tentativas_followup: 1, status_assinatura: 'enviado',
    ultimo_contato_em: dias(-4), criado_em: dias(-21) },

  { id: 'l5', nome: 'Rosa Maria Nogueira', telefone: '+55 51 98455-0022', cpf: '456.789.012-33',
    funil_slug: 'BPC_LOAS', etapa_slug: 'pericia', etapa_nome: '9. Perícia / Avaliação', etapa_ordem: 9, etapa_cor: 'rose',
    funil_nome: 'BPC-LOAS', funil_cor: 'teal', status: 'aberto', sla_dias: 7,
    docs_total: 0, docs_recebidos: 0, dias_parado: 2, fora_do_sla: false,
    proxima_acao_em: dias(3), tentativas_followup: 0, status_assinatura: 'assinado',
    protocolo_inss: '1234567890', cliente_id: 'c_rosa',
    ultimo_contato_em: dias(-2), criado_em: dias(-45) },

  { id: 'l6', nome: 'Paulo Henrique Duarte', telefone: '+55 51 99711-6644', cpf: '567.890.123-44',
    funil_slug: 'AUXILIO_DOENCA', etapa_slug: 'qualificado', etapa_nome: '4. Proposta', etapa_ordem: 4, etapa_cor: 'teal',
    funil_nome: 'Auxílio por Incapacidade', funil_cor: 'indigo', status: 'aberto', sla_dias: 2,
    docs_total: 0, docs_recebidos: 0, dias_parado: 6, fora_do_sla: true,
    proxima_acao_em: dias(-1), tentativas_followup: 3, status_assinatura: 'nao_enviado',
    ultimo_contato_em: dias(-6), criado_em: dias(-14) },

  { id: 'l7', nome: 'Terezinha Gomes', telefone: '+55 51 98200-7799', cpf: '678.901.234-55',
    funil_slug: 'BPC_LOAS', etapa_slug: 'laudo', etapa_nome: '4. Laudo médico', etapa_ordem: 4, etapa_cor: 'purple',
    funil_nome: 'BPC-LOAS', funil_cor: 'teal', status: 'aberto', sla_dias: 3,
    docs_total: 0, docs_recebidos: 0, dias_parado: 2, fora_do_sla: false,
    proxima_acao_em: dias(1), tentativas_followup: 1, status_assinatura: 'nao_enviado',
    ultimo_contato_em: dias(-2), criado_em: dias(-8) },

  { id: 'l8', nome: 'Valdir Souza Lima', telefone: '+55 51 99566-3321', cpf: '789.012.345-66',
    funil_slug: 'AUXILIO_DOENCA', etapa_slug: 'acompanhamento', etapa_nome: '9. Acompanhamento', etapa_ordem: 9, etapa_cor: 'slate',
    funil_nome: 'Auxílio por Incapacidade', funil_cor: 'indigo', status: 'aberto', sla_dias: 14,
    docs_total: 0, docs_recebidos: 0, dias_parado: 9, fora_do_sla: false,
    proxima_acao_em: dias(5), tentativas_followup: 0, status_assinatura: 'assinado',
    protocolo_inss: '0987654321', cliente_id: 'c_valdir',
    ultimo_contato_em: dias(-9), criado_em: dias(-70) },
];

export const checklistMock = [
  { id: 'ck1', lead_id: 'l1', documento_slug: 'laudo_medico',    nome: 'Laudo ou relatório médico',        status: 'recebido', obrigatorio: true, ordem: 1 },
  { id: 'ck2', lead_id: 'l1', documento_slug: 'cadunico',        nome: 'CadÚnico (Cadastro Único)',        status: 'pendente', obrigatorio: true, ordem: 2 },
  { id: 'ck3', lead_id: 'l1', documento_slug: 'rg',              nome: 'Documento de identidade (RG ou CNH)', status: 'recebido', obrigatorio: true, ordem: 3 },
  { id: 'ck4', lead_id: 'l1', documento_slug: 'cpf',             nome: 'CPF',                              status: 'pendente', obrigatorio: true, ordem: 4 },
  { id: 'ck5', lead_id: 'l1', documento_slug: 'comp_residencia', nome: 'Comprovante de residência',        status: 'pendente', obrigatorio: true, ordem: 5 },

  { id: 'ck6',  lead_id: 'l2', documento_slug: 'laudo_medico',    nome: 'Laudo ou relatório médico',       status: 'recebido', obrigatorio: true, ordem: 1 },
  { id: 'ck7',  lead_id: 'l2', documento_slug: 'rg',              nome: 'Documento de identidade (RG ou CNH)', status: 'pendente', obrigatorio: true, ordem: 2 },
  { id: 'ck8',  lead_id: 'l2', documento_slug: 'cpf',             nome: 'CPF',                             status: 'pendente', obrigatorio: true, ordem: 3 },
  { id: 'ck9',  lead_id: 'l2', documento_slug: 'comp_residencia', nome: 'Comprovante de residência',       status: 'pendente', obrigatorio: true, ordem: 4 },
  { id: 'ck10', lead_id: 'l2', documento_slug: 'cnis',            nome: 'CNIS ou carteira de trabalho',    status: 'pendente', obrigatorio: true, ordem: 5 },
];

export const eventosMock = [
  { id: 'ev1', titulo: 'Perícia médica — Rosa Maria Nogueira', data_hora: dias(2),
    tipo_slug: 'pericia_medica', tipo_nome: 'Perícia médica do INSS', tipo_cor: 'rose', exige_presenca: true,
    status: 'agendado', local_tipo: 'Agência INSS', local_detalhe: 'APS Porto Alegre Centro — Av. Loureiro da Silva, 445',
    pessoa_nome: 'Rosa Maria Nogueira', pessoa_telefone: '+55 51 98455-0022',
    protocolo_inss: '1234567890', beneficio: 'BPC_LOAS', lembrete_enviado: false, duracao_min: 60 },

  { id: 'ev2', titulo: 'Exigência do INSS — Valdir Souza Lima', data_hora: dias(6),
    tipo_slug: 'exigencia', tipo_nome: 'Exigência do INSS (prazo 30d)', tipo_cor: 'amber', exige_presenca: false,
    status: 'agendado', local_tipo: 'Meu INSS', local_detalhe: 'Anexar CNIS atualizado no protocolo',
    pessoa_nome: 'Valdir Souza Lima', pessoa_telefone: '+55 51 99566-3321',
    protocolo_inss: '0987654321', beneficio: 'AUXILIO_DOENCA', lembrete_enviado: false, duracao_min: 30 },

  { id: 'ev3', titulo: 'Avaliação social (BPC) — Maria de Lourdes', data_hora: dias(11),
    tipo_slug: 'avaliacao_social', tipo_nome: 'Avaliação social (BPC)', tipo_cor: 'purple', exige_presenca: true,
    status: 'agendado', local_tipo: 'Agência INSS', local_detalhe: 'APS Porto Alegre Centro',
    pessoa_nome: 'Maria de Lourdes Santos', pessoa_telefone: '+55 51 98123-4455',
    beneficio: 'BPC_LOAS', lembrete_enviado: false, duracao_min: 60 },

  { id: 'ev4', titulo: 'Perícia médica — Sebastião Alves Pinto', data_hora: dias(-3),
    tipo_slug: 'pericia_medica', tipo_nome: 'Perícia médica do INSS', tipo_cor: 'rose', exige_presenca: true,
    status: 'cumprido', local_tipo: 'Agência INSS', local_detalhe: 'APS Canoas',
    pessoa_nome: 'Sebastião Alves Pinto', pessoa_telefone: '+55 51 99133-8890',
    beneficio: 'AUXILIO_DOENCA', lembrete_enviado: true, duracao_min: 60 },
];

export const MOTIVOS_PERDA = [
  { id: 'nao_qualifica',    label: 'Não se enquadra nas regras' },
  { id: 'sem_resposta',     label: 'Parou de responder' },
  { id: 'outro_escritorio', label: 'Foi para outro escritório' },
  { id: 'desistiu',         label: 'Desistiu do pedido' },
  { id: 'ja_tem_advogado',  label: 'Já tinha advogado' },
  { id: 'outro',            label: 'Outro motivo' },
];

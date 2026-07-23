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

export const leadsMock = [];

export const checklistMock = [];

export const eventosMock = [];

export const MOTIVOS_PERDA = [
  { id: 'nao_qualifica',    label: 'Não se enquadra nas regras' },
  { id: 'sem_resposta',     label: 'Parou de responder' },
  { id: 'outro_escritorio', label: 'Foi para outro escritório' },
  { id: 'desistiu',         label: 'Desistiu do pedido' },
  { id: 'ja_tem_advogado',  label: 'Já tinha advogado' },
  { id: 'outro',            label: 'Outro motivo' },
];

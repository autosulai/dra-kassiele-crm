// CRM Jurídico — dados mock e helpers unificados (prontos para migração para Supabase)

export const HOJE = new Date('2026-07-20T10:15:00-03:00');

export const escritorio = {
  nome: 'Kassiele Advocacia',
  cidade: 'Porto Alegre · RS',
  endereco: 'Centro, Porto Alegre/RS · Atendimento Digital para todo o Brasil',
  telefone: '+55 51 99999-8888',
  email: 'contato@kassieleadvocacia.adv.br',
  horario: 'Segunda a sexta das 09:00 às 18:00',
  logo: null,
  chatwootUrl: import.meta.env.VITE_CHATWOOT_URL || '',
  chatwootToken: import.meta.env.VITE_CHATWOOT_TOKEN || '',
  chatwootAccountId: import.meta.env.VITE_CHATWOOT_ACCOUNT_ID || '1',
  advogados: [
    { id: 'a1', nome: 'Dra. Kassiele', area: 'Previdenciário (BPC/INSS)', cor: 'indigo', oab: 'OAB/RS 88.412' },
  ],
  tipos: [
    { id: 't1', nome: 'Triagem Previdenciária Inicial (BPC/Auxílio)', dur: 30, cor: 'indigo', valor: 'Gratuito (Análise de Direito)', descricao: 'Realização de entrevista inicial humanizada para identificar histórico de contribuição do segurado ou condição de baixa renda/deficiência (BPC-LOAS). A IA deve explicar que esta etapa preliminar é 100% gratuita e sem compromisso.' },
    { id: 't2', nome: 'Análise de Laudo Médico & Parecer Técnico', dur: 45, cor: 'purple', valor: 'Gratuito (Via WhatsApp / Equipe)', descricao: 'Análise técnica de laudos, exames, atestados médicos e receituários para verificar se há incapacidade laboral compatível com Auxílio-Doença ou Aposentadoria por Invalidez. A IA deve orientar o envio de fotos nítidas do laudo contendo CID e assinatura médica.' },
    { id: 't3', nome: 'Assinatura D4Sign & Fechamento de Contrato', dur: 30, cor: 'teal', valor: '30% sobre Êxito Final', descricao: 'Envio e formalização da procuração e contrato de honorários advocatícios por assinatura digital no celular (D4Sign). A IA deve frisar que o escritório não cobra nenhuma consulta inicial ou taxa antecipada, recebendo apenas 30% no êxito final quando o benefício for concedido.' },
    { id: 't4', nome: 'Perícia Médica INSS (Acompanhamento)', dur: 90, cor: 'rose', valor: 'Obrigatório presença do segurado', descricao: 'Orientações preparatórias e acompanhamento sobre data, horário e local do exame pericial no INSS. A IA deve lembrar o segurado de levar documento com foto original, carteira de trabalho e todos os laudos médicos originais no dia agendado.' },
    { id: 't5', nome: 'Atendimento Rápido / Dúvida Processual', dur: 20, cor: 'slate', valor: 'Sem custo adicional', descricao: 'Esclarecimento pontual de dúvidas de clientes sobre o andamento do requerimento no INSS ou processo judicial. A IA deve consultar o status no CRM e informar com empatia os documentos que estão liberados para visualização do cliente.' },
  ],
};

export const clientes = [];

export const casos = [];

export const documentosCliente = [];

export const compromissosHoje = [];

export const resumo = {
  hoje: { compromissos: 0, audiencias: 0, prazos: 0, consultas: 0 },
  prazosSemana: 0,
  novosLeads: 0,
};

export const TAGS_DISPONIVEIS = [
  { id: 'lead', label: 'lead', cor: 'muted', desc: 'Contato inicial, em fase de qualificação' },
  { id: 'triado', label: 'triado', cor: 'ok', desc: 'Triagem de benefício INSS concluída pela IA' },
  { id: 'pericia_agendada', label: 'perícia agendada', cor: 'ok', desc: 'Perícia médica do INSS confirmada com o segurado' },
  { id: 'documentos_pendentes', label: 'docs pendentes', cor: 'warn', desc: 'Aguardando envio do CadÚnico ou Laudo Médico' },
  { id: 'humano', label: 'humano', cor: 'warn', desc: 'Solicitou atendimento por advogado ou urgente' },
  { id: 'cliente', label: 'cliente', cor: 'accent', desc: 'Cadastrado como cliente ativo no CRM' },
  { id: 'urgente', label: 'urgente', cor: 'danger', desc: 'Prazo processual ou intimação imediata' },
  { id: 'em_analise', label: 'em análise', cor: 'purple', desc: 'Caso sob avaliação jurídica da Dra. Kassiele' },
];



export const configIA = {
  nome: 'Sofia',
  tom: 'acolhedor',
  prompt: '',
  followup_automatico: true,
  lembrete_evento: true,
  escalar_urgente: true,
  enviar_audios: true,
  fora_horario: true,
  max_mensagens_sem_avanco: 6,
  valorConsulta: 'Gratuito (Análise Previdenciária)',
  areas: ['Previdenciário', 'BPC-LOAS', 'Auxílio Doença'],
  conhecimento: [],
};

// Helpers de formatação e busca de estilos
export const corTipo = (id) => (escritorio.tipos.find(t => t.id === id) || {}).cor || 'slate';
export const nomeAdv = (id) => (escritorio.advogados.find(a => a.id === id) || {}).nome || '—';
export const corAdv = (id) => (escritorio.advogados.find(a => a.id === id) || {}).cor || 'slate';
export const getTagInfo = (id) => TAGS_DISPONIVEIS.find(t => t.id === id) || { id, label: id, cor: 'slate' };
export const iniciais = (n) => {
  if (!n || typeof n !== 'string') return 'CL';
  const parts = n.split(' ').filter(w => w && w.length > 0);
  if (parts.length === 0) return 'CL';
  return parts.slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
};
export const fmtData = (iso) => {
  if (!iso || typeof iso !== 'string') return '—';
  if (iso.includes('/')) return iso;
  const parts = iso.split('-');
  if (parts.length < 3) return iso;
  const [y, m, d] = parts;
  return `${d}/${m}/${(y || '').slice(-2)}`;
};


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
    { id: 'a2', nome: 'Equipe Operacional', area: 'Suporte & Triagem INSS', cor: 'slate', oab: 'Interno' },
    { id: 'a3', nome: 'Dr. Lucas Prado', area: 'Previdenciário (Perícias & Auxílios)', cor: 'amber', oab: 'OAB/RS 91.204' },
  ],
  tipos: [
    { id: 't1', nome: 'Triagem Previdenciária Inicial (BPC/Auxílio)', dur: 30, cor: 'indigo', valor: 'Gratuito (Análise de Direito)', descricao: 'Realização de entrevista inicial humanizada para identificar histórico de contribuição do segurado ou condição de baixa renda/deficiência (BPC-LOAS). A IA deve explicar que esta etapa preliminar é 100% gratuita e sem compromisso.' },
    { id: 't2', nome: 'Análise de Laudo Médico & Parecer Técnico', dur: 45, cor: 'purple', valor: 'Gratuito (Via WhatsApp / Equipe)', descricao: 'Análise técnica de laudos, exames, atestados médicos e receituários para verificar se há incapacidade laboral compatível com Auxílio-Doença ou Aposentadoria por Invalidez. A IA deve orientar o envio de fotos nítidas do laudo contendo CID e assinatura médica.' },
    { id: 't3', nome: 'Assinatura D4Sign & Fechamento de Contrato', dur: 30, cor: 'teal', valor: '30% sobre Êxito Final', descricao: 'Envio e formalização da procuração e contrato de honorários advocatícios por assinatura digital no celular (D4Sign). A IA deve frisar que o escritório não cobra nenhuma consulta inicial ou taxa antecipada, recebendo apenas 30% no êxito final quando o benefício for concedido.' },
    { id: 't4', nome: 'Perícia Médica INSS (Acompanhamento)', dur: 90, cor: 'rose', valor: 'Obrigatório presença do segurado', descricao: 'Orientações preparatórias e acompanhamento sobre data, horário e local do exame pericial no INSS. A IA deve lembrar o segurado de levar documento com foto original, carteira de trabalho e todos os laudos médicos originais no dia agendado.' },
    { id: 't5', nome: 'Atendimento Rápido / Dúvida Processual', dur: 20, cor: 'slate', valor: 'Sem custo adicional', descricao: 'Esclarecimento pontual de dúvidas de clientes sobre o andamento do requerimento no INSS ou processo judicial. A IA deve consultar o status no CRM e informar com empatia os documentos que estão liberados para visualização do cliente.' },
  ],
};

export const clientes = [
  { id: 'c1', nome: 'Dona Maria da Conceição', tipo: 'PF', doc: '123.456.789-00', tel: '+55 51 99812-4410', email: 'maria.conceicao@gmail.com', advogado: 'a1', area: 'Previdenciário', casos: 1, status: 'ativo', desde: '2026-07-10', origem: 'WhatsApp' },
  { id: 'c2', nome: 'Sr. Antônio Carlos Silva', tipo: 'PF', doc: '234.567.890-11', tel: '+55 51 99412-0871', email: 'antonio.csilva@gmail.com', advogado: 'a1', area: 'Previdenciário', casos: 1, status: 'ativo', desde: '2026-07-12', origem: 'Indicação' },
  { id: 'c3', nome: 'Lúcia Helena Santos (Mãe do Pedro)', tipo: 'PF', doc: '345.678.901-22', tel: '+55 51 98812-3390', email: 'lucia.hsantos@uol.com.br', advogado: 'a1', area: 'Previdenciário', casos: 1, status: 'ativo', desde: '2026-07-14', origem: 'WhatsApp' },
  { id: 'c4', nome: 'José Almir Ferreira (MEI)', tipo: 'PF', doc: '456.789.012-33', tel: '+55 51 99122-8800', email: 'jalmir.ferreira@hotmail.com', advogado: 'a1', area: 'Previdenciário', casos: 2, status: 'ativo', desde: '2026-07-05', origem: 'Site' },
  { id: 'c5', nome: 'Clarice Mendes Souza', tipo: 'PF', doc: '567.890.123-44', tel: '+55 51 99021-4410', email: 'clarice.mendes@gmail.com', advogado: 'a1', area: 'Previdenciário', casos: 1, status: 'lead', desde: '2026-07-18', origem: 'WhatsApp' },
  { id: 'c6', nome: 'Sebastião Oliveira', tipo: 'PF', doc: '678.901.234-55', tel: '+55 51 98455-3320', email: 'sebastiao.oli@gmail.com', advogado: 'a1', area: 'Previdenciário', casos: 1, status: 'encerrado', desde: '2025-11-15', origem: 'Indicação' },
];

export const casos = [
  { id: 'p1', clienteId: 'c1', titulo: 'BPC-LOAS — Concessão por Idade (68 anos, sem contribuição)', numero: '5001234-56.2026.8.21.0001', area: 'Previdenciário', fase: 'Coleta de Documentos', status: 'ativo', advogado: 'a1', proximoPrazo: '2026-07-24' },
  { id: 'p2', clienteId: 'c2', titulo: 'Auxílio Doença — Restabelecimento (Ortopédico CID M54)', numero: '0010987-65.2026.4.04.7100', area: 'Previdenciário', fase: 'Perícia Agendada', status: 'ativo', advogado: 'a1', proximoPrazo: '2026-07-25' },
  { id: 'p3', clienteId: 'c3', titulo: 'BPC-LOAS — Pessoa com Deficiência (Espectro Autista - Filho)', numero: '5009876-54.2026.8.21.0001', area: 'Previdenciário', fase: 'Análise Médica/Jurídica', status: 'ativo', advogado: 'a1', proximoPrazo: '2026-07-28' },
  { id: 'p4', clienteId: 'c4', titulo: 'Auxílio Doença — Segurado Contribuinte MEI (Lesão LER/DORT)', numero: '—', area: 'Previdenciário', fase: 'Triagem & Qualificação', status: 'ativo', advogado: 'a1', proximoPrazo: null },
  { id: 'p5', clienteId: 'c4', titulo: 'Conversão de Auxílio em Aposentadoria por Invalidez', numero: '5004321-98.2026.8.21.0001', area: 'Previdenciário', fase: 'Protocolo INSS', status: 'ativo', advogado: 'a1', proximoPrazo: '2026-08-03' },
  { id: 'p6', clienteId: 'c6', titulo: 'Aposentadoria por Tempo de Contribuição — Concessão Êxito', numero: '5006543-21.2025.8.21.0001', area: 'Previdenciário', fase: 'Concluído / Êxito', status: 'ativo', advogado: 'a1', proximoPrazo: '2026-07-30' },
];

export const documentosCliente = [
  {
    id: 'doc1',
    clienteId: 'c2',
    processoId: 'p2',
    titulo: 'Petição Inicial Previdenciária — Restabelecimento de Auxílio-Doença',
    tipo: 'peticao',
    conteudo_texto: 'Ação previdenciária requerendo o restabelecimento imediato de Auxílio-Doença perante o INSS em razão de incapacidade ortopédica severa (CID M54), com pedido de tutela de urgência.',
    arquivo_url: 'https://cdn.exemplo.com/docs/peticao_inicial_c2.pdf',
    liberado_cliente: true,
    data: '2026-05-10'
  },
  {
    id: 'doc2',
    clienteId: 'c2',
    processoId: 'p2',
    titulo: 'Andamento: Perícia Médica Judicial Designada',
    tipo: 'andamento',
    conteudo_texto: 'A Justiça Federal designou perícia médica judicial para o dia 22/07/2026 às 14:00 na 1ª Vara Federal de Porto Alegre. Indispensável comparecer com os laudos originais e atestados recentes.',
    arquivo_url: '',
    liberado_cliente: true,
    data: '2026-07-01'
  },
  {
    id: 'doc3',
    clienteId: 'c2',
    processoId: 'p2',
    titulo: 'Notas Jurídicas e Análise Técnica do CID M54',
    tipo: 'outro',
    conteudo_texto: 'Anotações internas sobre a gravidade da hérnia de disco e incapacidade laborativa para confrontar o laudo pericial do INSS. Documento estritamente confidencial da Dra. Kassiele.',
    arquivo_url: '',
    liberado_cliente: false,
    data: '2026-07-15'
  },
  {
    id: 'doc4',
    clienteId: 'c3',
    processoId: 'p3',
    titulo: 'Requerimento Administrativo INSS — Concessão BPC-LOAS',
    tipo: 'peticao',
    conteudo_texto: 'Petição protocolada no Meu INSS requerendo a concessão do Benefício de Prestação Continuada (BPC-LOAS) para idosa em situação de vulnerabilidade com CadÚnico atualizado.',
    arquivo_url: 'https://cdn.exemplo.com/docs/requerimento_bpc_c3.pdf',
    liberado_cliente: true,
    data: '2026-06-20'
  },
  {
    id: 'doc5',
    clienteId: 'c5',
    processoId: null,
    titulo: 'Laudo Ortopédico — Coluna Lombar CID M54.pdf',
    tipo: 'laudo',
    conteudo_texto: 'Laudo médico emitido pelo Dr. Silveira apontando compressão radicular severa e incapacidade total para esforço físico. Anexado pelo segurado no WhatsApp.',
    arquivo_url: 'https://cdn.exemplo.com/docs/laudo_ortopedico_lucas.pdf',
    liberado_cliente: true,
    data: '2026-07-18'
  },
  {
    id: 'doc6',
    clienteId: 'c5',
    processoId: null,
    titulo: 'Documento Pessoal com Foto (RG / CPF).png',
    tipo: 'documento',
    conteudo_texto: 'Foto nítida da Carteira de Identidade e CPF do segurado Lucas Fontes para instrução do requerimento no INSS.',
    arquivo_url: 'https://cdn.exemplo.com/docs/rg_lucas_fontes.png',
    liberado_cliente: false,
    data: '2026-07-18'
  },
  {
    id: 'doc7',
    clienteId: 'c6',
    processoId: null,
    titulo: 'Comprovante CadÚnico e Relatório Médico.pdf',
    tipo: 'laudo',
    conteudo_texto: 'Folha resumo do Cadastro Único e relatório médico detalhando o quadro assistencial para requerimento de BPC-LOAS.',
    arquivo_url: 'https://cdn.exemplo.com/docs/cadunico_isabela.pdf',
    liberado_cliente: true,
    data: '2026-07-19'
  }
];

export const compromissosHoje = [
  { id: 'ag1', hora: '08:30', dur: 60, tipo: 't1', titulo: 'Triagem de Benefício BPC', cliente: 'Lucas Fontes', advogado: 'a1', status: 'concluido', local: 'APS Centro' },
  { id: 'ag2', hora: '09:30', dur: 45, tipo: 't2', titulo: 'Perícia Médica INSS', cliente: 'Carlos Eduardo', advogado: 'a1', status: 'concluido', local: 'APS INSS' },
  { id: 'ag3', hora: '10:30', dur: 90, tipo: 't3', titulo: 'Perícia Judicial Federal', cliente: 'Mariana Teixeira', advogado: 'a1', status: 'em_andamento', local: '1ª Vara Federal', destaque: true },
  { id: 'ag4', hora: '12:00', dur: 60, tipo: 'bloqueio', titulo: 'Almoço', advogado: 'all', status: 'bloqueio' },
  { id: 'ag5', hora: '14:00', dur: 45, tipo: 't2', titulo: 'Revisão de Aposentadoria', cliente: 'Roberto Alves', advogado: 'a1', status: 'confirmado', local: 'APS INSS' },
  { id: 'ag6', hora: '15:00', dur: 30, tipo: 't4', titulo: 'Prazo — Recurso CRPS', cliente: 'Mariana Teixeira', advogado: 'a1', status: 'confirmado', local: 'Interno' },
  { id: 'ag7', hora: '16:00', dur: 60, tipo: 't1', titulo: 'Perícia Médica INSS', cliente: 'Isabela Moraes', advogado: 'a1', status: 'confirmado', local: 'APS Norte' },
  { id: 'ag8', hora: '17:00', dur: 30, tipo: 't5', titulo: 'Análise de Laudos', cliente: 'Dona Maria Aparecida', advogado: 'a1', status: 'pendente', local: 'Interno' },
];

export const resumo = {
  hoje: { compromissos: 7, audiencias: 1, prazos: 1, consultas: 2 },
  prazosSemana: 4,
  novosLeads: 2,
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
  conhecimento: [
    { id: 'k1', tipo: 'texto', t: 'Horário de funcionamento e atendimento humanizado', v: 'Segunda a sexta das 09:00 às 18:00. Fora desse horário a Sofia continua atendendo e coletando laudos no WhatsApp; a Dra. Kassiele retorna no próximo dia útil.' },
    { id: 'k2', tipo: 'doc', t: 'Checklist Documentação BPC-LOAS (Deficiência e Idoso 65+)', v: 'CadÚnico atualizado (últimos 24 meses), Laudo ou relatório médico/escolar (mesmo antigo), RG, CPF e comprovante de residência.', arquivo: { nome: 'Checklist_BPC_LOAS_Kassiele.pdf', tamanho: '950 KB', paginas: 3, status: 'indexado', data: '18/07/2026' } },
    { id: 'k3', tipo: 'doc', t: 'Checklist Documentação Auxílio Doença / Incapacidade', v: 'Laudo médico com CID (atual ou antigo), Atestados, CNIS (via Meu INSS) ou Carteira de Trabalho, comprovantes de recolhimento MEI/autônomo, RG e CPF.', arquivo: { nome: 'Checklist_Auxilio_Doenca_INSS.pdf', tamanho: '810 KB', paginas: 3, status: 'indexado', data: '18/07/2026' } },
    { id: 'k4', tipo: 'texto', t: 'Política de Cobrança Transparente (30% no Êxito)', v: 'O escritório trabalha no modelo ad exitum: honorários contratuais de 30% cobrados exclusivamente no final do processo após a concessão e êxito do benefício previdenciário. Zero cobrança antecipada para iniciar a análise.' },
    { id: 'k5', tipo: 'texto', t: 'Garantia Anti-Fraude, OAB e Assinatura Digital D4Sign', v: 'Dra. Kassiele devidamente inscrita na OAB/RS 88.412. Escritório não solicita transferências Pix para liberação de alvarás ou perícias. Formalização de contratos ágil e segura via plataforma D4Sign no WhatsApp.' },
  ],
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


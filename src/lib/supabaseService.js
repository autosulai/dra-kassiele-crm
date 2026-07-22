import { supabase } from './supabase';
import { loadLeadsKanban } from './funilService';
import {
  escritorio as mockEscritorio,
  configIA as mockConfigIA,
  clientes as mockClientes,
  casos as mockCasos
} from '../data/mockData';

async function mesclarLeadsAosClientes(listaClientes, listaCasos) {
  try {
    const leads = await loadLeadsKanban().catch(() => []);
    const clientesFinal = [...listaClientes];
    const casosFinal = [...listaCasos];

    const cIds = new Set(clientesFinal.map(c => c && c.id));
    const cCpfs = new Set(clientesFinal.map(c => c && c.doc).filter(d => d && d !== '—'));

    leads.forEach(l => {
      if (!l || !l.id) return;
      if (!cIds.has(l.id) && (!l.cpf || !cCpfs.has(l.cpf))) {
        cIds.add(l.id);
        if (l.cpf) cCpfs.add(l.cpf);
        clientesFinal.push({
          id: l.id,
          nome: l.nome || 'Lead do Funil',
          tipo: 'PF',
          doc: l.cpf || '—',
          tel: l.telefone || '—',
          email: l.email || `${(l.nome||'cliente').toLowerCase().replace(/[^a-z0-9]/g, '.')}@email.com`,
          advogado: l.advogado_id || 'a1',
          area: l.funil_nome || 'Previdenciário',
          casos: l.protocolo_inss ? 1 : 0,
          status: l.status === 'aberto' ? 'lead' : (l.status === 'ganho' ? 'ativo' : 'encerrado'),
          desde: l.criado_em ? new Date(l.criado_em).toLocaleDateString('pt-BR') : 'Hoje',
          origem: `Funil (${l.etapa_nome || 'Triagem'})`,
          etapa_nome: l.etapa_nome,
          funil_slug: l.funil_slug,
          protocolo_inss: l.protocolo_inss
        });
      }
    });

    const pIds = new Set(casosFinal.map(p => p && p.id));
    leads.forEach(l => {
      if (!l || !l.id) return;
      if (l.protocolo_inss && l.protocolo_inss.trim() !== '' && l.protocolo_inss !== '—' && !pIds.has('caso_' + l.id)) {
        const jaTem = casosFinal.some(p => p && (p.clienteId === l.id || p.leadId === l.id));
        if (!jaTem) {
          casosFinal.push({
            id: 'caso_' + l.id,
            clienteId: l.id,
            leadId: l.id,
            titulo: `${l.funil_nome || 'Previdenciário'} — ${l.etapa_nome || 'Em Análise'}`,
            numero: l.protocolo_inss || 'Em Análise',
            esfera: 'administrativo',
            beneficio: l.funil_nome || 'BPC-LOAS / Auxílio',
            area: 'Previdenciário',
            fase: l.etapa_nome || 'Triagem',
            status: l.status === 'aberto' ? 'Ativo' : (l.status === 'ganho' ? 'Concluído' : 'Inativo'),
            advogado: l.advogado_id || 'a1',
            proximoPrazo: l.proxima_acao_em || null,
            notas: `Processo / benefício vinculado ao lead do funil. SLA atual: ${l.sla_dias || 3} dias.`
          });
        }
      }
    });

    // Limpar processos orfãos sem cliente correspondente
    const clientesMap = new Set(clientesFinal.map(c => c && c.id));
    const casosLimpos = casosFinal.filter(p => {
      if (!p) return false;
      return clientesMap.has(p.clienteId) || clientesMap.has(p.leadId) || clientesMap.has(p.cliente_id);
    });

    return { clientesFinal, casosFinal: casosLimpos };
  } catch (e) {
    const clientesMap = new Set((listaClientes || []).map(c => c && c.id));
    const casosLimpos = (listaCasos || []).filter(p => p && (clientesMap.has(p.clienteId) || clientesMap.has(p.leadId) || clientesMap.has(p.cliente_id)));
    return { clientesFinal: listaClientes, casosFinal: casosLimpos };
  }
}

/**
 * Carrega os dados institucionais e de CRM do Supabase.
 *
 * MUDANÇA V1: o seed programático foi removido daqui. Escritório, advogados,
 * funis, etapas, documentos, cadência, prompt e base de conhecimento agora são
 * criados pelos scripts SQL em /sql. Manter duas fontes de seed causava
 * divergência entre o que o painel escrevia e o que o n8n lia.
 *
 * Os dados do funil (leads, checklist, prazos) ficam em funilService.js.
 */
export async function loadAllCRMData() {
  if (!supabase) {
    const { clientesFinal, casosFinal } = await mesclarLeadsAosClientes(mockClientes, mockCasos);
    return {
      escritorio: mockEscritorio,
      conversas: mockConversas,
      clientes: clientesFinal,
      casos: casosFinal,
      configIA: { ...mockConfigIA },
      isSupabase: false
    };
  }

  try {
    // --- Escritório + advogados ---------------------------------------------
    const { data: escList } = await supabase.from('escritorio').select('*').limit(1);
    const escDb = escList && escList[0];
    let escObj = { ...mockEscritorio };
    let advogadosMapeados = mockEscritorio.advogados;

    if (escDb) {
      const { data: advList } = await supabase
        .from('advogados').select('*').eq('escritorio_id', escDb.id).eq('ativo', true);

      if (advList && advList.length > 0) {
        const vistos = new Set();
        const unicos = [];
        advList.forEach(a => {
          const chave = (a.nome || '').trim();
          if (chave && !vistos.has(chave)) {
            vistos.add(chave);
            unicos.push({
              id: a.id, nome: a.nome, area: a.area, cor: a.cor || 'indigo',
              oab: a.oab || '', email: a.email || '', tel: a.telefone || '',
              recebeEscalonamento: !!a.recebe_escalonamento
            });
          }
        });
        if (unicos.length > 0) advogadosMapeados = unicos;
      }

      escObj = {
        id: escDb.id,
        nome: escDb.nome || mockEscritorio.nome,
        cidade: escDb.cidade || mockEscritorio.cidade,
        endereco: escDb.endereco || mockEscritorio.endereco,
        telefone: escDb.telefone || mockEscritorio.telefone,
        email: escDb.email || mockEscritorio.email,
        horario: escDb.horario || mockEscritorio.horario,
        logo: escDb.logo || mockEscritorio.logo,
        instagram: escDb.instagram_url || '',
        site: escDb.site_url || '',
        advogados: advogadosMapeados
      };
    }

    // --- Config da IA --------------------------------------------------------
    const { data: cfgList } = await supabase.from('config_ia').select('*').limit(1);
    if (cfgList && cfgList[0]) {
      const c = cfgList[0];
      if (c.nome_agente) mockConfigIA.nome = c.nome_agente;
      if (c.tom_voz) mockConfigIA.tom = c.tom_voz;
      if (c.prompt_sistema !== undefined && c.prompt_sistema !== null) mockConfigIA.prompt = c.prompt_sistema;
      mockConfigIA.followup_automatico = c.followup_automatico ?? true;
      mockConfigIA.lembrete_evento = c.lembrete_evento ?? true;
      mockConfigIA.escalar_urgente = c.escalar_urgente ?? true;
      mockConfigIA.fora_horario = c.fora_horario ?? true;
      mockConfigIA.enviar_audios = c.enviar_audios ?? true;
      mockConfigIA.max_mensagens_sem_avanco = c.max_mensagens_sem_avanco ?? 6;
      mockConfigIA.configId = c.id;
    }



    // --- Clientes ------------------------------------------------------------
    const { data: cliDb } = await supabase
      .from('clientes').select('*').order('criado_em', { ascending: false });

    const clientesFormatted = (cliDb && cliDb.length > 0)
      ? cliDb.map(cl => ({
          id: cl.id,
          nome: cl.nome || 'Cliente sem nome',
          tipo: cl.tipo || 'PF',
          doc: cl.doc_cpf_cnpj || '—',
          tel: cl.telefone || '—',
          email: cl.email || '—',
          advogado: cl.advogado_id || null,
          area: cl.area || 'Previdenciário',
          casos: 1,
          status: cl.status || 'ativo',
          desde: cl.data_cadastro
            ? new Date(cl.data_cadastro).toLocaleDateString('pt-BR')
            : 'Hoje',
          origem: cl.origem || 'WhatsApp · Evolution'
        }))
      : [...mockClientes];

    // --- Processos -----------------------------------------------------------
    const { data: procDb } = await supabase
      .from('processos').select('*').order('criado_em', { ascending: false });

    const casosFormatted = (procDb && procDb.length > 0)
      ? procDb.map(p => ({
          id: p.id,
          clienteId: p.cliente_id,
          leadId: p.lead_id,
          titulo: p.titulo || 'Processo sem título',
          numero: p.numero_cnj || p.protocolo_inss || '—',
          esfera: p.esfera || 'administrativo',
          beneficio: p.beneficio || null,
          area: p.area || 'Previdenciário',
          fase: p.fase || 'Protocolado',
          status: p.status || 'Ativo',
          advogado: p.advogado_id || null,
          proximoPrazo: p.proximo_prazo || null,
          notas: p.notas || ''
        }))
      : [...mockCasos];

    const { clientesFinal, casosFinal } = await mesclarLeadsAosClientes(clientesFormatted, casosFormatted);

    return {
      escritorio: escObj,
      clientes: clientesFinal,
      casos: casosFinal,
      configIA: { ...mockConfigIA },
      isSupabase: true
    };
  } catch (err) {
    console.error('Erro ao carregar dados do Supabase:', err);
    const { clientesFinal, casosFinal } = await mesclarLeadsAosClientes(mockClientes, mockCasos);
    return {
      escritorio: mockEscritorio,
      clientes: clientesFinal,
      casos: casosFinal,
      configIA: { ...mockConfigIA },
      isSupabase: false
    };
  }
}

/**
 * Realiza upload real de arquivo para o Supabase Storage no bucket 'documentos'.
 * Se o bucket não existir ou o modo for mock, retorna um caminho ou URL legível para teste.
 */
export async function uploadArquivoSupabase(file, prefix = 'clientes') {
  if (!file) return null;
  if (!supabase) {
    console.warn('Supabase não conectado. Gerando URL mock.');
    return 'https://cdn.exemplo.com/docs/' + prefix + '_' + encodeURIComponent(file.name);
  }

  try {
    const ext = file.name.split('.').pop() || 'pdf';
    const cleanName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const path = `${prefix}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${cleanName}`;

    const { data, error } = await supabase.storage
      .from('documentos')
      .upload(path, file, { cacheControl: '3600', upsert: true });

    if (error) {
      console.error('Erro ao fazer upload para o bucket documentos do Supabase:', error);
      // Fallback gracioso se o bucket não estiver criado/liberado no painel do Supabase ainda
      return 'https://storage.supabase.co/mock/' + encodeURIComponent(file.name);
    }

    const { data: urlData } = supabase.storage.from('documentos').getPublicUrl(path);
    return urlData?.publicUrl || ('https://storage.supabase.co/documentos/' + path);
  } catch (err) {
    console.error('Falha na requisição de upload:', err);
    return null;
  }
}


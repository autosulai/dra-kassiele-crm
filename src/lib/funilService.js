import { supabase } from './supabase';
import { funisMock, etapasMock, leadsMock, checklistMock, eventosMock } from '../data/funilMock';

/**
 * Camada de acesso ao funil previdenciário.
 *
 * Regra do arquivo: nenhuma função lança exceção para a UI. Se o Supabase
 * estiver indisponível ou as credenciais faltarem, cai no mock e o painel
 * continua navegável — isso permite demonstrar o CRM para a Dra. Kassiele
 * sem depender de conexão.
 */

const semSupabase = () => !supabase;

// ---------------------------------------------------------------------------
// LEITURA
// ---------------------------------------------------------------------------

/** Funis ativos + etapas ordenadas, montados em árvore para o Kanban. */
export async function loadFunis() {
  if (semSupabase()) return montarArvore(funisMock, etapasMock);

  try {
    const { data: funis } = await supabase
      .from('funis').select('*').eq('ativo', true).order('ordem');
    const { data: etapas } = await supabase
      .from('etapas_funil').select('*').order('ordem');

    if (!funis || funis.length === 0) return montarArvore(funisMock, etapasMock);
    return montarArvore(funis, etapas || []);
  } catch (err) {
    console.error('loadFunis:', err);
    return montarArvore(funisMock, etapasMock);
  }
}

function montarArvore(funis, etapas) {
  return funis
    .filter(f => f.slug !== 'INDEFINIDO')
    .map(f => ({
      ...f,
      etapas: etapas.filter(e => e.funil_id === f.id).sort((a, b) => a.ordem - b.ordem)
    }));
}

/** Leads do Kanban, já com progresso do checklist e dias parado (view SQL). */
export async function loadLeadsKanban() {
  if (semSupabase()) return leadsMock;

  try {
    const { data, error } = await supabase
      .from('vw_kanban_funil')
      .select('*')
      .eq('status', 'aberto')
      .order('etapa_ordem', { ascending: true });

    if (error) throw error;
    return data && data.length > 0 ? data : leadsMock;
  } catch (err) {
    console.error('loadLeadsKanban:', err);
    return leadsMock;
  }
}

/** Checklist de documentos de um lead específico. */
export async function loadChecklist(leadId) {
  if (semSupabase()) return checklistMock.filter(c => c.lead_id === leadId);

  try {
    const { data } = await supabase
      .from('checklist_documentos')
      .select('*')
      .eq('lead_id', leadId)
      .order('ordem');
    return data || [];
  } catch (err) {
    console.error('loadChecklist:', err);
    return [];
  }
}

/** Histórico de movimentação do lead no funil. */
export async function loadHistoricoLead(leadId) {
  if (semSupabase()) return [];
  try {
    const { data } = await supabase
      .from('lead_historico')
      .select('*')
      .eq('lead_id', leadId)
      .order('criado_em', { ascending: false })
      .limit(20);
    return data || [];
  } catch (err) {
    console.error('loadHistoricoLead:', err);
    return [];
  }
}

/** Prazos e perícias (view vw_agenda_prazos). */
export async function loadEventos() {
  if (semSupabase()) return eventosMock;

  try {
    const { data, error } = await supabase
      .from('vw_agenda_prazos')
      .select('*')
      .order('data_hora', { ascending: true });
    if (error) throw error;
    return data && data.length > 0 ? data : eventosMock;
  } catch (err) {
    console.error('loadEventos:', err);
    return eventosMock;
  }
}

export async function loadTiposEvento() {
  if (semSupabase()) {
    return [
      { id: 'te1', slug: 'pericia_medica', nome: 'Perícia médica do INSS', cor: 'rose', exige_presenca: true },
      { id: 'te2', slug: 'avaliacao_social', nome: 'Avaliação social (BPC)', cor: 'purple', exige_presenca: true },
      { id: 'te3', slug: 'exigencia', nome: 'Exigência do INSS (prazo 30d)', cor: 'amber', exige_presenca: false },
      { id: 'te4', slug: 'audiencia', nome: 'Audiência judicial', cor: 'rose', exige_presenca: true },
      { id: 'te5', slug: 'prazo_recursal', nome: 'Prazo recursal', cor: 'indigo', exige_presenca: false },
      { id: 'te6', slug: 'prazo_interno', nome: 'Prazo interno do escritório', cor: 'slate', exige_presenca: false },
    ];
  }
  try {
    const { data } = await supabase.from('tipos_evento').select('*').eq('ativo', true);
    return data || [];
  } catch (err) {
    console.error('loadTiposEvento:', err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// ESCRITA
// ---------------------------------------------------------------------------

/**
 * Move o lead de etapa.
 * O gatilho trg_leads_historico no banco cuida de registrar o histórico,
 * zerar as tentativas de follow-up e reprogramar a próxima ação — por isso
 * aqui só o etapa_slug é enviado.
 */
export async function moverEtapa(leadId, novaEtapaSlug) {
  // Atualiza cache em memória para que o arrasto permaneça mesmo offline ou em fallback
  const idx = leadsMock.findIndex(l => l.id === leadId);
  if (idx >= 0) {
    const etapaObj = etapasMock.find(e => e.slug === novaEtapaSlug && (e.funil_id === leadsMock[idx].funil_id || e.funil_slug === leadsMock[idx].funil_slug));
    leadsMock[idx] = {
      ...leadsMock[idx],
      etapa_slug: novaEtapaSlug,
      etapa_nome: etapaObj ? etapaObj.nome : novaEtapaSlug,
      etapa_ordem: etapaObj ? etapaObj.ordem : leadsMock[idx].etapa_ordem,
      etapa_cor: etapaObj ? etapaObj.cor : leadsMock[idx].etapa_cor,
      dias_parado: 0,
      fora_do_sla: false
    };
  }
  if (semSupabase()) return { ok: true, offline: true };
  try {
    const { error } = await supabase
      .from('leads')
      .update({ etapa_slug: novaEtapaSlug })
      .eq('id', leadId);
    if (error) throw error;
    return { ok: true };
  } catch (err) {
    console.error('moverEtapa:', err);
    return { ok: true, offlineFallback: true }; // Retorna true para manter a alteração visual
  }
}

/** Troca o funil do lead (o gatilho remonta o checklist automaticamente). */
export async function trocarFunil(leadId, funilSlug, primeiraEtapa = 'triagem') {
  const idx = leadsMock.findIndex(l => l.id === leadId);
  if (idx >= 0) {
    const funilObj = funisMock.find(f => f.slug === funilSlug);
    const etapaObj = etapasMock.find(e => e.slug === primeiraEtapa && (e.funil_slug === funilSlug || e.funil_id === funilObj?.id));
    leadsMock[idx] = {
      ...leadsMock[idx],
      funil_slug: funilSlug,
      funil_nome: funilObj ? funilObj.nome : funilSlug,
      funil_cor: funilObj ? funilObj.cor : 'slate',
      etapa_slug: primeiraEtapa,
      etapa_nome: etapaObj ? etapaObj.nome : primeiraEtapa,
      etapa_ordem: etapaObj ? etapaObj.ordem : 1,
      etapa_cor: etapaObj ? etapaObj.cor : 'slate'
    };
  }
  if (semSupabase()) return { ok: true, offline: true };
  try {
    const { error } = await supabase
      .from('leads')
      .update({ funil_slug: funilSlug, etapa_slug: primeiraEtapa })
      .eq('id', leadId);
    if (error) throw error;
    return { ok: true };
  } catch (err) {
    console.error('trocarFunil:', err);
    return { ok: true, offlineFallback: true };
  }
}

/** Marca um documento do checklist. Usa a função SQL para manter a mesma
 *  regra de negócio que o n8n usa quando o documento chega pelo WhatsApp. */
export async function marcarDocumento(leadId, documentoSlug, status = 'recebido') {
  const cIdx = checklistMock.findIndex(c => c.lead_id === leadId && (c.documento_slug === documentoSlug || c.id === documentoSlug));
  if (cIdx >= 0) {
    const oldStatus = checklistMock[cIdx].status;
    checklistMock[cIdx] = { ...checklistMock[cIdx], status };
    const lIdx = leadsMock.findIndex(l => l.id === leadId);
    if (lIdx >= 0 && oldStatus !== status) {
      const delta = status === 'recebido' ? 1 : (oldStatus === 'recebido' ? -1 : 0);
      leadsMock[lIdx] = { ...leadsMock[lIdx], docs_recebidos: Math.max(0, (leadsMock[lIdx].docs_recebidos || 0) + delta) };
    }
  }
  if (semSupabase()) return { ok: true, offline: true };
  try {
    const { data, error } = await supabase.rpc('fn_registrar_documento', {
      p_lead_id: leadId,
      p_documento_slug: documentoSlug,
      p_arquivo_url: null,
      p_status: status,
      p_dados_extraidos: null
    });
    if (error) throw error;
    return { ok: true, ...data };
  } catch (err) {
    console.error('marcarDocumento:', err);
    return { ok: true, offlineFallback: true };
  }
}

/** Adiciona uma nova atividade ou documento ao checklist do lead. */
export async function adicionarChecklist(leadId, novoItem) {
  checklistMock.push(novoItem);
  const lIdx = leadsMock.findIndex(l => l.id === leadId);
  if (lIdx >= 0) {
    leadsMock[lIdx] = { ...leadsMock[lIdx], docs_total: (leadsMock[lIdx].docs_total || 0) + 1 };
  }
  if (semSupabase()) return { ok: true, offline: true, item: novoItem };
  try {
    const { data, error } = await supabase
      .from('checklist_documentos')
      .insert([novoItem])
      .select()
      .single();
    if (error) throw error;
    return { ok: true, item: data || novoItem };
  } catch (err) {
    console.error('adicionarChecklist:', err);
    return { ok: true, item: novoItem, offlineFallback: true };
  }
}

/** Encerra o lead como perdido, com motivo obrigatório para análise depois. */
export async function marcarPerdido(leadId, motivo) {
  const idx = leadsMock.findIndex(l => l.id === leadId);
  if (idx >= 0) {
    leadsMock[idx] = { ...leadsMock[idx], status: 'perdido', motivo_perda: motivo };
  }
  if (semSupabase()) return { ok: true, offline: true };
  try {
    const { error } = await supabase
      .from('leads')
      .update({
        status: 'perdido',
        motivo_perda: motivo,
        perdido_em: new Date().toISOString(),
        proxima_acao_em: null
      })
      .eq('id', leadId);
    if (error) throw error;
    return { ok: true };
  } catch (err) {
    console.error('marcarPerdido:', err);
    return { ok: true, offlineFallback: true };
  }
}

/** Reabre um lead perdido e reprograma a cobrança para o dia seguinte. */
export async function reabrirLead(leadId) {
  const idx = leadsMock.findIndex(l => l.id === leadId);
  if (idx >= 0) {
    const amanha = new Date(Date.now() + 86400000).toISOString();
    leadsMock[idx] = { ...leadsMock[idx], status: 'aberto', motivo_perda: null, tentativas_followup: 0, proxima_acao_em: amanha };
  }
  if (semSupabase()) return { ok: true, offline: true };
  try {
    const amanha = new Date(Date.now() + 86400000).toISOString();
    const { error } = await supabase
      .from('leads')
      .update({
        status: 'aberto', motivo_perda: null, perdido_em: null,
        tentativas_followup: 0, proxima_acao_em: amanha
      })
      .eq('id', leadId);
    if (error) throw error;
    return { ok: true };
  } catch (err) {
    console.error('reabrirLead:', err);
    return { ok: true, offlineFallback: true };
  }
}

/** Adia a próxima cobrança automática em N dias (botão "adiar" do card). */
export async function adiarFollowup(leadId, dias = 3) {
  const alvo = new Date(Date.now() + dias * 86400000).toISOString();
  const idx = leadsMock.findIndex(l => l.id === leadId);
  if (idx >= 0) {
    leadsMock[idx] = { ...leadsMock[idx], proxima_acao_em: alvo };
  }
  if (semSupabase()) return { ok: true, offline: true };
  try {
    const { error } = await supabase
      .from('leads').update({ proxima_acao_em: alvo }).eq('id', leadId);
    if (error) throw error;
    return { ok: true };
  } catch (err) {
    console.error('adiarFollowup:', err);
    return { ok: true, offlineFallback: true };
  }
}

/** Cria ou atualiza um prazo/perícia. */
export async function salvarEvento(evento) {
  if (semSupabase()) {
    const tipos = await loadTiposEvento();
    const t = tipos.find(x => x.id === evento.tipo_id) || tipos[0] || {};
    const payload = {
      id: evento.id || ('ev_' + Date.now()),
      tipo_id: evento.tipo_id || t.id || null,
      tipo_slug: t.slug || 'pericia_medica',
      tipo_nome: t.nome || 'Prazo / Perícia',
      tipo_cor: t.cor || 'rose',
      exige_presenca: t.exige_presenca !== undefined ? t.exige_presenca : true,
      lead_id: evento.lead_id || null,
      cliente_id: evento.cliente_id || null,
      processo_id: evento.processo_id || null,
      advogado_id: evento.advogado_id || null,
      titulo: evento.titulo,
      data_hora: evento.data_hora,
      duracao_min: evento.duracao_min || 60,
      status: evento.status || 'agendado',
      local_tipo: evento.local_tipo || 'Agência INSS',
      local_detalhe: evento.local_detalhe || null,
      obs: evento.obs || null,
      pessoa_nome: evento.pessoa_nome || evento.titulo,
      pessoa_telefone: evento.pessoa_telefone || '',
      protocolo_inss: evento.protocolo_inss || null,
      beneficio: evento.beneficio || null,
    };

    const idx = eventosMock.findIndex(e => e.id === payload.id);
    if (idx >= 0) {
      eventosMock[idx] = { ...eventosMock[idx], ...payload };
    } else {
      eventosMock.push(payload);
    }
    return { ok: true, offline: true };
  }
  try {
    const payload = {
      tipo_id: evento.tipo_id || null,
      lead_id: evento.lead_id || null,
      cliente_id: evento.cliente_id || null,
      processo_id: evento.processo_id || null,
      advogado_id: evento.advogado_id || null,
      titulo: evento.titulo,
      data_hora: evento.data_hora,
      duracao_min: evento.duracao_min || 60,
      status: evento.status || 'agendado',
      local_tipo: evento.local_tipo || 'Agência INSS',
      local_detalhe: evento.local_detalhe || null,
      obs: evento.obs || null
    };
    const resp = evento.id
      ? await supabase.from('eventos_processuais').update(payload).eq('id', evento.id)
      : await supabase.from('eventos_processuais').insert(payload);
    if (resp.error) throw resp.error;
    return { ok: true };
  } catch (err) {
    console.error('salvarEvento:', err);
    return { ok: false, erro: err.message };
  }
}

export async function atualizarStatusEvento(eventoId, status) {
  if (semSupabase()) {
    const idx = eventosMock.findIndex(e => e.id === eventoId);
    if (idx >= 0) {
      eventosMock[idx] = { ...eventosMock[idx], status };
    }
    return { ok: true, offline: true };
  }
  try {
    const { error } = await supabase
      .from('eventos_processuais').update({ status }).eq('id', eventoId);
    if (error) throw error;
    return { ok: true };
  } catch (err) {
    console.error('atualizarStatusEvento:', err);
    return { ok: false, erro: err.message };
  }
}

/** Salvar edições, adições, reordenação e remoção de etapas de um funil no Supabase e no mock. */
export async function salvarEtapasKanban(funilId, etapas, deletedIds = []) {
  if (deletedIds.length > 0) {
    for (let i = etapasMock.length - 1; i >= 0; i--) {
      if (deletedIds.includes(etapasMock[i].id)) {
        etapasMock.splice(i, 1);
      }
    }
  }
  etapas.forEach((e, idx) => {
    const slugFinal = e.slug || e.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '_').slice(0, 50);
    const p = {
      id: e.id || 'e_' + Math.random().toString(36).slice(2, 9),
      funil_id: funilId,
      slug: slugFinal,
      nome: e.nome,
      ordem: idx + 1,
      cor: e.cor || 'slate',
      sla_dias: Number(e.sla_dias) || 1,
      requer_humano: !!e.requer_humano,
      descricao: e.descricao || ''
    };
    const mockIdx = etapasMock.findIndex(m => m.id === p.id || (m.funil_id === funilId && m.slug === p.slug));
    if (mockIdx >= 0) {
      etapasMock[mockIdx] = { ...etapasMock[mockIdx], ...p };
    } else {
      etapasMock.push(p);
    }
  });

  if (semSupabase()) return { ok: true, offline: true };

  try {
    if (deletedIds.length > 0) {
      for (const idDel of deletedIds) {
        await supabase.from('etapas_funil').delete().eq('id', idDel).eq('funil_id', funilId);
      }
    }

    for (let idx = 0; idx < etapas.length; idx++) {
      const e = etapas[idx];
      const slugFinal = e.slug || e.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '_').slice(0, 50);
      const payload = {
        funil_id: funilId,
        slug: slugFinal,
        nome: e.nome,
        ordem: idx + 1,
        cor: e.cor || 'slate',
        sla_dias: Number(e.sla_dias) || 1,
        requer_humano: !!e.requer_humano,
        descricao: e.descricao || null
      };

      if (e.id && String(e.id).includes('-')) {
        await supabase.from('etapas_funil').update(payload).eq('id', e.id);
      } else {
        const { data: exist } = await supabase.from('etapas_funil').select('id').eq('funil_id', funilId).eq('slug', payload.slug).limit(1);
        if (exist && exist[0]) {
          await supabase.from('etapas_funil').update(payload).eq('id', exist[0].id);
        } else {
          await supabase.from('etapas_funil').insert([payload]);
        }
      }
    }

    return { ok: true };
  } catch (err) {
    console.error('salvarEtapasKanban erro:', err);
    return { ok: false, erro: err.message };
  }
}

/** Adiciona um lead manualmente pelo Kanban */
export async function adicionarLeadKanban(dados) {
  const novoLead = {
    nome: dados.nome,
    telefone: dados.telefone,
    funil_slug: dados.funil_slug,
    etapa_slug: dados.etapa_slug || 'triagem',
    status: 'aberto',
    origem: 'Inclusão Manual (Kanban)'
  };
  
  if (semSupabase()) {
    return { ok: true, id: 'mock_' + Date.now(), ...novoLead };
  }

  try {
    // get escritorio_id from context if available, otherwise just insert
    const { data: escData } = await supabase.from('escritorio').select('id').limit(1);
    const escritorio_id = escData?.[0]?.id || null;

    const { data, error } = await supabase.from('leads').insert([{
      ...novoLead,
      escritorio_id
    }]).select('id').single();

    if (error) throw error;
    
    // Inserir no histórico
    await supabase.from('historico_etapas_lead').insert([{
      lead_id: data.id,
      etapa_nova: novoLead.etapa_slug
    }]);

    return { ok: true, id: data.id, ...novoLead };
  } catch (err) {
    console.error('adicionarLeadKanban erro:', err);
    return { ok: false, erro: err.message };
  }
}

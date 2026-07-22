import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Icon } from './Icon';
import { MOTIVOS_PERDA } from '../data/funilMock';
import {
  loadFunis, loadLeadsKanban, loadChecklist, loadHistoricoLead,
  moverEtapa, marcarDocumento, marcarPerdido, adiarFollowup, trocarFunil, salvarEtapasKanban, adicionarChecklist
} from '../lib/funilService';

const fmtData = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

const rotuloProximaAcao = (iso) => {
  if (!iso) return { texto: 'Sem cobrança agendada', atrasado: false };
  const alvo = new Date(iso);
  const diff = Math.round((alvo - new Date()) / 86400000);
  if (diff < 0) return { texto: `Cobrança atrasada ${Math.abs(diff)}d`, atrasado: true };
  if (diff === 0) return { texto: 'Cobrar hoje', atrasado: true };
  if (diff === 1) return { texto: 'Cobrar amanhã', atrasado: false };
  return { texto: `Cobrar em ${diff}d`, atrasado: false };
};

// ---------------------------------------------------------------------------

export const Funil = ({ onGoToChat }) => {
  const [funis, setFunis] = useState([]);
  const [leads, setLeads] = useState([]);
  const [funilAtivo, setFunilAtivo] = useState(null);
  const [selecionado, setSelecionado] = useState(null);
  const [checklist, setChecklist] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [busca, setBusca] = useState('');
  const [soAtrasados, setSoAtrasados] = useState(false);
  const [arrastando, setArrastando] = useState(null);
  const arrastandoRef = useRef(null);
  const [colunaAlvo, setColunaAlvo] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [modalPerda, setModalPerda] = useState(null);

  // -- Estados de Edição do Kanban (Colunas) --
  const [modoEdicao, setModoEdicao] = useState(false);
  const [etapasEditando, setEtapasEditando] = useState([]);
  const [etapasDeletadas, setEtapasDeletadas] = useState([]);
  const [salvandoColunas, setSalvandoColunas] = useState(false);
  const [arrastandoColunaIdx, setArrastandoColunaIdx] = useState(null);
  const [colunaAlvoIdx, setColunaAlvoIdx] = useState(null);
  const [toast, setToast] = useState(null);
  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const recarregar = useCallback(async () => {
    const [fs, ls] = await Promise.all([loadFunis(), loadLeadsKanban()]);
    setFunis(fs);
    setLeads(ls);
    setFunilAtivo(prev => prev || (fs[0]?.slug ?? null));
    setCarregando(false);
  }, []);

  useEffect(() => { recarregar(); }, [recarregar]);

  useEffect(() => {
    if (!selecionado) { setChecklist([]); setHistorico([]); return; }
    loadChecklist(selecionado.id).then(setChecklist);
    loadHistoricoLead(selecionado.id).then(setHistorico);
  }, [selecionado]);

  const funil = useMemo(
    () => funis.find(f => f.slug === funilAtivo) || funis[0],
    [funis, funilAtivo]
  );

  const leadsFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return leads.filter(l => {
      if (funil && l.funil_slug !== funil.slug) return false;
      if (soAtrasados && !l.fora_do_sla) return false;
      if (!termo) return true;
      return (l.nome || '').toLowerCase().includes(termo)
          || (l.telefone || '').includes(termo)
          || (l.cpf || '').includes(termo);
    });
  }, [leads, funil, busca, soAtrasados]);

  const totalAtrasados = useMemo(
    () => leads.filter(l => l.fora_do_sla).length, [leads]
  );

  // -- Funções do Gerenciador de Colunas (Modo Edição Kanban) --
  const iniciarEdicao = () => {
    if (!funil) return;
    setEtapasEditando(JSON.parse(JSON.stringify(funil.etapas || [])));
    setEtapasDeletadas([]);
    setModoEdicao(true);
  };

  const cancelarEdicao = () => {
    setModoEdicao(false);
    setEtapasEditando([]);
    setEtapasDeletadas([]);
  };

  const aoAtualizarEtapa = (idx, campo, valor) => {
    setEtapasEditando(prev => {
      const proximo = [...prev];
      proximo[idx] = { ...proximo[idx], [campo]: valor };
      return proximo;
    });
  };

  const aoMoverEtapa = (idx, direcao) => {
    setEtapasEditando(prev => {
      const proximo = [...prev];
      const alvo = idx + direcao;
      if (alvo < 0 || alvo >= proximo.length) return prev;
      const tmp = proximo[idx];
      proximo[idx] = proximo[alvo];
      proximo[alvo] = tmp;
      return proximo;
    });
  };

  const aoSoltarColunaEdicao = (idxDestino) => {
    if (arrastandoColunaIdx === null || arrastandoColunaIdx === idxDestino) {
      setArrastandoColunaIdx(null);
      setColunaAlvoIdx(null);
      return;
    }
    setEtapasEditando(prev => {
      const proximo = [...prev];
      const [item] = proximo.splice(arrastandoColunaIdx, 1);
      proximo.splice(idxDestino, 0, item);
      return proximo;
    });
    setArrastandoColunaIdx(null);
    setColunaAlvoIdx(null);
  };

  const aoAdicionarEtapa = () => {
    setEtapasEditando(prev => [
      ...prev,
      {
        id: 'e_' + Math.random().toString(36).slice(2, 9),
        funil_id: funil.id,
        slug: 'etapa_' + Date.now().toString(36),
        nome: `${prev.length + 1}. Nova Etapa`,
        cor: 'indigo',
        sla_dias: 3,
        requer_humano: false,
        descricao: ''
      }
    ]);
  };

  const aoExcluirEtapa = (idx) => {
    const etapa = etapasEditando[idx];
    const leadsNaEtapa = leads.filter(l => l.etapa_slug === etapa.slug && (l.funil_slug === funil.slug || !l.funil_slug));
    if (leadsNaEtapa.length > 0) {
      if (!window.confirm(`⚠️ Atenção: Há ${leadsNaEtapa.length} lead(s) na coluna "${etapa.nome}". Deseja realmente excluir esta coluna? Os leads ficarão ocultos até serem movidos para outra etapa.`)) {
        return;
      }
    }
    if (etapa.id) {
      setEtapasDeletadas(prev => [...prev, etapa.id]);
    }
    setEtapasEditando(prev => prev.filter((_, i) => i !== idx));
  };

  const salvarEdicaoKanban = async () => {
    if (!funil) return;
    setSalvandoColunas(true);
    const resp = await salvarEtapasKanban(funil.id, etapasEditando, etapasDeletadas);
    setSalvandoColunas(false);
    if (resp.ok) {
      flash('✅ Colunas do Kanban salvas no banco com sucesso!');
      await recarregar();
      setModoEdicao(false);
    } else {
      flash('❌ Erro ao salvar no banco: ' + (resp.erro || 'Verifique a conexão'));
    }
  };

  // -- Ações -----------------------------------------------------------------

  const aoSoltar = async (etapaSlug) => {
    const lead = arrastandoRef.current || arrastando;
    arrastandoRef.current = null;
    setArrastando(null);
    setColunaAlvo(null);
    if (!lead || lead.etapa_slug === etapaSlug) return;

    // Atualização otimista: o card se move na hora, o banco confirma depois.
    const etapa = funil?.etapas.find(e => e.slug === etapaSlug);
    setLeads(prev => prev.map(l => l.id === lead.id
      ? { ...l, etapa_slug: etapaSlug, etapa_nome: etapa?.nome || etapaSlug,
          etapa_ordem: etapa?.ordem, etapa_cor: etapa?.cor,
          dias_parado: 0, fora_do_sla: false }
      : l));

    await moverEtapa(lead.id, etapaSlug);
  };

  const alternarDocumento = async (item) => {
    if (!selecionado) return;
    const novo = item.status === 'recebido' ? 'pendente' : 'recebido';
    const novoChecklist = checklist.map(c => c.id === item.id ? { ...c, status: novo } : c);
    setChecklist(novoChecklist);
    const total = novoChecklist.length;
    const recebidos = novoChecklist.filter(c => c.status === 'recebido').length;
    setLeads(prev => prev.map(l => l.id === selecionado.id
      ? { ...l, docs_total: total, docs_recebidos: recebidos }
      : l));
    await marcarDocumento(selecionado.id, item.documento_slug, novo);
  };

  const adicionarItemChecklist = async (nomeItem) => {
    if (!selecionado || !nomeItem.trim()) return;
    const novoDoc = {
      id: 'ck_' + Date.now(),
      lead_id: selecionado.id,
      documento_slug: 'item_' + Date.now(),
      nome: nomeItem.trim(),
      status: 'pendente',
      obrigatorio: true,
      ordem: checklist.length + 1
    };
    const novoChecklist = [...checklist, novoDoc];
    setChecklist(novoChecklist);
    const total = novoChecklist.length;
    const recebidos = novoChecklist.filter(c => c.status === 'recebido').length;
    setLeads(prev => prev.map(l => l.id === selecionado.id
      ? { ...l, docs_total: total, docs_recebidos: recebidos }
      : l));
    flash('✅ Tarefa adicionada ao checklist!');
    await adicionarChecklist(selecionado.id, novoDoc);
  };

  const removerItemChecklist = async (item) => {
    if (!selecionado) return;
    const novoChecklist = checklist.filter(c => c.id !== item.id);
    setChecklist(novoChecklist);
    const total = novoChecklist.length;
    const recebidos = novoChecklist.filter(c => c.status === 'recebido').length;
    setLeads(prev => prev.map(l => l.id === selecionado.id
      ? { ...l, docs_total: total, docs_recebidos: recebidos }
      : l));
    flash('🗑️ Tarefa removida do checklist!');
    try {
      await supabase.from('checklist_documentos').delete().eq('id', item.id);
    } catch (err) {
      // ignora se mock
    }
  };

  const confirmarPerda = async (motivo) => {
    const leadId = modalPerda.id;
    setModalPerda(null);
    setSelecionado(null);
    setLeads(prev => prev.filter(l => l.id !== leadId));
    flash('❌ Lead encerrado.');
    await marcarPerdido(leadId, motivo);
  };

  const adiar = async (lead, dias) => {
    const alvo = new Date(Date.now() + dias * 86400000).toISOString();
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, proxima_acao_em: alvo } : l));
    if (selecionado && selecionado.id === lead.id) {
      setSelecionado(prev => ({ ...prev, proxima_acao_em: alvo }));
    }
    flash(`⏰ Cobrança adiada por ${dias} dias!`);
    await adiarFollowup(lead.id, dias);
  };

  const moverFunil = async (lead, novoFunilSlug) => {
    const funilObj = funis.find(f => f.slug === novoFunilSlug);
    const primEtapa = funilObj?.etapas?.[0] || { slug: 'triagem', nome: '1. Triagem', ordem: 1, cor: 'slate' };
    setLeads(prev => prev.map(l => l.id === lead.id ? {
      ...l,
      funil_slug: novoFunilSlug,
      funil_nome: funilObj?.nome || novoFunilSlug,
      funil_cor: funilObj?.cor || 'slate',
      etapa_slug: primEtapa.slug,
      etapa_nome: primEtapa.nome,
      etapa_ordem: primEtapa.ordem,
      etapa_cor: primEtapa.cor
    } : l));
    if (selecionado && selecionado.id === lead.id) {
      setSelecionado(prev => ({
        ...prev,
        funil_slug: novoFunilSlug,
        funil_nome: funilObj?.nome || novoFunilSlug,
        funil_cor: funilObj?.cor || 'slate',
        etapa_slug: primEtapa.slug,
        etapa_nome: primEtapa.nome,
        etapa_ordem: primEtapa.ordem,
        etapa_cor: primEtapa.cor
      }));
    }
    flash(`✅ Lead reclassificado para ${funilObj?.nome || novoFunilSlug}!`);
    await trocarFunil(lead.id, novoFunilSlug, primEtapa.slug);
    if (selecionado && selecionado.id === lead.id) {
      loadChecklist(lead.id).then(setChecklist);
    }
  };

  // -------------------------------------------------------------------------

  if (carregando) {
    return <div className="cj-fn-vazio">Carregando funil…</div>;
  }

  return (
    <div className="cj-fn">
      {/* ---------------- Cabeçalho ---------------- */}
      <header className="cj-fn-head">
        <div>
          <h1 className="cj-fn-title">
            <Icon name="funnel" size={20}/> Funil de Atendimento
          </h1>
          <p className="cj-fn-sub">
            {leadsFiltrados.length} leads em aberto
            {totalAtrasados > 0 && (
              <> · <b className="cj-fn-alerta">{totalAtrasados} fora do prazo</b></>
            )}
          </p>
        </div>

        <div className="cj-fn-tools">
          <div className="cj-fn-tabs">
            {funis.map(f => (
              <button
                key={f.slug}
                className={`cj-fn-tab ${funil?.slug === f.slug ? 'active' : ''} cor-${f.cor}`}
                onClick={() => setFunilAtivo(f.slug)}
              >
                {f.nome}
                <span className="cj-fn-tab-n">
                  {leads.filter(l => l.funil_slug === f.slug).length}
                </span>
              </button>
            ))}
          </div>

          <div className="cj-fn-search">
            <Icon name="search" size={14}/>
            <input
              placeholder="Buscar por nome, telefone ou CPF"
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>

          <button
            className={`cj-fn-filtro ${soAtrasados ? 'active' : ''}`}
            onClick={() => setSoAtrasados(v => !v)}
            title="Mostrar apenas quem estourou o prazo da etapa"
          >
            <Icon name="clock" size={14}/> Fora do prazo
          </button>

          <button
            className={`cj-fn-filtro ${modoEdicao ? 'active' : ''}`}
            onClick={() => { if (modoEdicao) cancelarEdicao(); else iniciarEdicao(); }}
            title="Adicionar, remover, editar títulos, prazos e reordenar as colunas do Kanban"
            style={modoEdicao ? { background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' } : {}}
          >
            <Icon name="settings" size={14}/> {modoEdicao ? 'Sair da Edição' : 'Editar Kanban'}
          </button>
        </div>
      </header>

      {toast && (
        <div style={{ padding: '10px 20px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', color: 'var(--primary)', fontWeight: 600 }}>
          {toast}
        </div>
      )}

      {modoEdicao ? (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '16px 24px', overflowY: 'auto' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-1)' }}>
                <Icon name="settings" size={18}/> Edição de Colunas — {funil?.nome}
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-3)' }}>
                Edite os títulos, prazos e cores de cada coluna. Arraste ou use os botões ← / → para reordenar. Adicione ou exclua colunas livremente.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="cj-btn ghost sm" onClick={aoAdicionarEtapa}>
                <Icon name="plus" size={14}/> Nova Coluna
              </button>
              <button className="cj-btn ghost sm" onClick={cancelarEdicao}>
                Cancelar
              </button>
              <button className="cj-btn sm" disabled={salvandoColunas} onClick={salvarEdicaoKanban}>
                {salvandoColunas ? 'Salvando no banco...' : '💾 Salvar Alterações no Banco'}
              </button>
            </div>
          </div>

          <div className="cj-fn-board" style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 16, flex: 1, alignItems: 'stretch' }}>
            {etapasEditando.map((etapa, idx) => (
              <div
                key={etapa.slug || idx}
                draggable
                onDragStart={() => setArrastandoColunaIdx(idx)}
                onDragOver={e => { e.preventDefault(); setColunaAlvoIdx(idx); }}
                onDrop={() => aoSoltarColunaEdicao(idx)}
                className={`cj-fn-col cor-${etapa.cor || 'slate'}`}
                style={{
                  width: 280, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 10, padding: 14,
                  background: 'var(--bg-card)', border: colunaAlvoIdx === idx ? '2px dashed var(--primary)' : '1px solid var(--border)', borderRadius: 12, opacity: arrastandoColunaIdx === idx ? 0.6 : 1
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, borderBottom: '1px solid var(--border-light)', paddingBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'move' }} title="Clique e arraste para reordenar">
                    <span style={{ fontSize: 14, color: 'var(--ink-3)' }}>⠿</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)' }}>Ordem #{idx + 1}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      type="button"
                      className="cj-btn ghost sm"
                      style={{ padding: '2px 8px', fontSize: 12 }}
                      disabled={idx === 0}
                      onClick={() => aoMoverEtapa(idx, -1)}
                      title="Mover para trás"
                    >←</button>
                    <button
                      type="button"
                      className="cj-btn ghost sm"
                      style={{ padding: '2px 8px', fontSize: 12 }}
                      disabled={idx === etapasEditando.length - 1}
                      onClick={() => aoMoverEtapa(idx, 1)}
                      title="Mover para frente"
                    >→</button>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink-2)', display: 'block', marginBottom: 3 }}>Título da Coluna</label>
                  <input
                    type="text"
                    className="cj-input-sm"
                    style={{ width: '100%', fontWeight: 600 }}
                    value={etapa.nome || ''}
                    onChange={e => aoAtualizarEtapa(idx, 'nome', e.target.value)}
                    placeholder="Ex: 1. Triagem"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink-2)', display: 'block', marginBottom: 3 }}>Prazo SLA (dias)</label>
                    <input
                      type="number"
                      min="1"
                      className="cj-input-sm"
                      style={{ width: '100%' }}
                      value={etapa.sla_dias ?? 1}
                      onChange={e => aoAtualizarEtapa(idx, 'sla_dias', e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink-2)', display: 'block', marginBottom: 3 }}>Cor da Coluna</label>
                    <select
                      className="cj-input-sm"
                      style={{ width: '100%' }}
                      value={etapa.cor || 'slate'}
                      onChange={e => aoAtualizarEtapa(idx, 'cor', e.target.value)}
                    >
                      <option value="slate">Cinza / Neutro</option>
                      <option value="amber">Amarelo / Alerta</option>
                      <option value="purple">Roxo / Laudo</option>
                      <option value="teal">Verde / Proposta</option>
                      <option value="indigo">Azul / Assinatura</option>
                      <option value="rose">Rosa / Perícia</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink-2)', display: 'block', marginBottom: 3 }}>Descrição / Objetivo da Etapa</label>
                  <textarea
                    className="cj-input-sm"
                    rows={2}
                    style={{ width: '100%', resize: 'vertical' }}
                    value={etapa.descricao || ''}
                    onChange={e => aoAtualizarEtapa(idx, 'descricao', e.target.value)}
                    placeholder="Instruções ou checklist para esta etapa..."
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 4 }}>
                  <input
                    type="checkbox"
                    id={`humano_${idx}`}
                    checked={!!etapa.requer_humano}
                    onChange={e => aoAtualizarEtapa(idx, 'requer_humano', e.target.checked)}
                  />
                  <label htmlFor={`humano_${idx}`} style={{ fontSize: 12, color: 'var(--ink-2)', cursor: 'pointer', fontWeight: 500 }}>
                    Exige análise manual da equipe
                  </label>
                </div>

                <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--border-light)' }}>
                  <button
                    type="button"
                    className="cj-btn danger sm"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() => aoExcluirEtapa(idx)}
                  >
                    🗑️ Excluir Coluna
                  </button>
                </div>
              </div>
            ))}

            <div
              style={{ width: 220, minWidth: 220, border: '2px dashed var(--border)', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, cursor: 'pointer', background: 'var(--bg-alt)' }}
              onClick={aoAdicionarEtapa}
            >
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                <Icon name="plus" size={20}/>
              </div>
              <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink-1)' }}>Nova Coluna</span>
              <span style={{ fontSize: 12, color: 'var(--ink-3)', textAlign: 'center', marginTop: 4 }}>Clique para adicionar uma etapa em {funil?.nome}</span>
            </div>
          </div>
        </div>
      ) : (
        /* ---------------- Kanban Original ---------------- */
        <div className="cj-fn-board">
          {funil?.etapas.map(etapa => {
            const daEtapa = leadsFiltrados.filter(l => l.etapa_slug === etapa.slug);
            return (
              <section
                key={etapa.slug}
                className={`cj-fn-col ${colunaAlvo === etapa.slug ? 'alvo' : ''}`}
                onDragOver={e => { e.preventDefault(); setColunaAlvo(etapa.slug); }}
                onDragLeave={() => setColunaAlvo(c => c === etapa.slug ? null : c)}
                onDrop={() => aoSoltar(etapa.slug)}
              >
                <div className={`cj-fn-col-head cor-${etapa.cor}`}>
                  <span className="cj-dot"/>
                  <span className="cj-fn-col-nome">{etapa.nome}</span>
                  <span className="cj-fn-col-n">{daEtapa.length}</span>
                </div>
                <div className="cj-fn-col-sla">
                  {etapa.sla_dias}d de prazo
                  {etapa.requer_humano && <> · <b>equipe</b></>}
                </div>

                <div className="cj-fn-col-body">
                  {daEtapa.map(lead => (
                    <CardLead
                      key={lead.id}
                      lead={lead}
                      etapa={etapa}
                      onClick={() => setSelecionado(lead)}
                      onDragStart={() => { setArrastando(lead); arrastandoRef.current = lead; }}
                      onDragEnd={() => { setArrastando(null); setColunaAlvo(null); arrastandoRef.current = null; }}
                    />
                  ))}
                  {daEtapa.length === 0 && (
                    <div className="cj-fn-col-vazia">Nenhum lead aqui</div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* ---------------- Painel de detalhe ---------------- */}
      {selecionado && (
        <DetalheLead
          lead={selecionado}
          checklist={checklist}
          historico={historico}
          etapas={funil?.etapas || []}
          funis={funis}
          onFechar={() => setSelecionado(null)}
          onToggleDoc={alternarDocumento}
          onAdicionarChecklist={adicionarItemChecklist}
          onRemoverDoc={removerItemChecklist}
          onMover={async (slug) => {
            const etapaObj = funil?.etapas.find(e => e.slug === slug);
            setLeads(prev => prev.map(l => l.id === selecionado.id ? {
              ...l,
              etapa_slug: slug,
              etapa_nome: etapaObj ? etapaObj.nome : slug,
              etapa_ordem: etapaObj ? etapaObj.ordem : l.etapa_ordem,
              etapa_cor: etapaObj ? etapaObj.cor : l.etapa_cor,
              dias_parado: 0,
              fora_do_sla: false
            } : l));
            setSelecionado(prev => ({
              ...prev,
              etapa_slug: slug,
              etapa_nome: etapaObj ? etapaObj.nome : slug,
              etapa_ordem: etapaObj ? etapaObj.ordem : prev.etapa_ordem,
              etapa_cor: etapaObj ? etapaObj.cor : prev.etapa_cor,
              dias_parado: 0,
              fora_do_sla: false
            }));
            flash(`✅ Lead movido para ${etapaObj ? etapaObj.nome : slug}!`);
            await moverEtapa(selecionado.id, slug);
          }}
          onTrocarFunil={(slug) => moverFunil(selecionado, slug)}
          onPerder={() => setModalPerda(selecionado)}
          onAdiar={(d) => adiar(selecionado, d)}
          onChat={() => onGoToChat && onGoToChat(selecionado)}
        />
      )}

      {/* ---------------- Modal de perda ---------------- */}
      {modalPerda && (
        <div className="cj-fn-modal-bg" onClick={() => setModalPerda(null)}>
          <div className="cj-fn-modal" onClick={e => e.stopPropagation()}>
            <h3>Encerrar {modalPerda.nome}</h3>
            <p className="cj-fn-modal-sub">
              O motivo fica registrado para você entender depois onde o funil
              perde mais gente.
            </p>
            <div className="cj-fn-motivos">
              {MOTIVOS_PERDA.map(m => (
                <button key={m.id} onClick={() => confirmarPerda(m.id)}>
                  {m.label}
                </button>
              ))}
            </div>
            <button className="cj-fn-cancelar" onClick={() => setModalPerda(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------

const CardLead = ({ lead, etapa, onClick, onDragStart, onDragEnd }) => {
  const acao = rotuloProximaAcao(lead.proxima_acao_em);
  const total = lead.docs_total || 0;
  const recebidos = lead.docs_recebidos || 0;
  const pct = total > 0 ? Math.round((recebidos / total) * 100) : 0;

  const slaMax = etapa?.sla_dias || lead.sla_dias || 3;
  const diasParado = lead.dias_parado || 0;
  const estagnado = diasParado > slaMax || lead.fora_do_sla;
  const diasExcedidos = estagnado ? Math.max(1, diasParado - slaMax) : 0;

  return (
    <article
      className={`cj-fn-card ${estagnado ? 'atrasado' : ''}`}
      style={estagnado ? {
        border: '1.5px solid #e11d48',
        boxShadow: '0 4px 14px rgba(225, 29, 72, 0.18)',
        background: 'linear-gradient(to bottom, #fff1f2 0%, #ffffff 42px)'
      } : {}}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
    >
      <div className="cj-fn-card-top">
        <span className="cj-fn-card-nome" style={estagnado ? { color: '#be123c', fontWeight: 700 } : {}}>
          {lead.nome}
        </span>
        {estagnado && (
          <span
            style={{
              background: '#e11d48',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '999px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 2px 5px rgba(225,29,72,0.3)',
              flexShrink: 0
            }}
            title={`O prazo desta coluna (${slaMax}d) foi vencido. O lead está estagnado há +${diasExcedidos} dia(s) após o prazo. Mova para outra coluna para atualizar seu status.`}
          >
            ⚠️ +{diasExcedidos}d estagnado
          </span>
        )}
      </div>

      <div className="cj-fn-card-tel">{lead.telefone}</div>

      {total > 0 && (
        <div className="cj-fn-card-docs">
          <div className="cj-fn-bar">
            <div
              className={`cj-fn-bar-fill ${pct === 100 ? 'ok' : ''}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="cj-fn-card-docs-n">{recebidos}/{total} itens</span>
        </div>
      )}

      <div className="cj-fn-card-foot">
        <span className={`cj-fn-card-acao ${acao.atrasado ? 'urgente' : ''}`}>
          <Icon name="clock" size={11}/> {acao.texto}
        </span>
        {lead.status_assinatura === 'enviado' && (
          <span className="cj-fn-card-badge">contrato enviado</span>
        )}
        {lead.status_assinatura === 'assinado' && (
          <span className="cj-fn-card-badge ok">assinado</span>
        )}
      </div>
    </article>
  );
};

// ---------------------------------------------------------------------------

const DetalheLead = ({
  lead, checklist, historico, etapas, funis, onFechar, onToggleDoc, onAdicionarChecklist, onRemoverDoc,
  onMover, onTrocarFunil, onPerder, onAdiar, onChat
}) => {
  const [novoItem, setNovoItem] = useState('');
  const pendentes = checklist.filter(c => c.status !== 'recebido' && c.obrigatorio);
  const acao = rotuloProximaAcao(lead.proxima_acao_em);

  const etapaAtualObj = etapas?.find(e => e.slug === lead.etapa_slug);
  const slaMax = etapaAtualObj?.sla_dias || lead.sla_dias || 3;
  const diasParado = lead.dias_parado || 0;
  const estagnado = diasParado > slaMax || lead.fora_do_sla;
  const diasExcedidos = estagnado ? Math.max(1, diasParado - slaMax) : 0;

  return (
    <>
      <div className="cj-fn-drawer-bg" onClick={onFechar}/>
      <aside className="cj-fn-drawer">
        <header className="cj-fn-drawer-head">
          <div>
            <h2>{lead.nome}</h2>
            <span className="cj-fn-drawer-tel">{lead.telefone}</span>
          </div>
          <button onClick={onFechar} className="cj-fn-x"><Icon name="x" size={16}/></button>
        </header>

        <div className="cj-fn-drawer-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          <span className={`cj-chattag cor-${lead.funil_cor || 'slate'}`}>{lead.funil_nome}</span>
          <span className={`cj-chattag cor-${lead.etapa_cor || 'slate'}`}>{lead.etapa_nome}</span>
          {estagnado && (
            <span
              style={{
                background: '#e11d48',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 9px',
                borderRadius: '999px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 2px 5px rgba(225,29,72,0.3)'
              }}
              title={`O prazo (${slaMax}d) venceu. Estagnado há +${diasExcedidos} dias. Mova para outra coluna para atualizar seu status.`}
            >
              ⚠️ +{diasExcedidos}d estagnado (Prazo de {slaMax}d vencido)
            </span>
          )}
        </div>

        {estagnado && (
          <div style={{
            margin: '8px 18px 0',
            padding: '8px 12px',
            background: '#fff1f2',
            border: '1px solid #fda4af',
            borderRadius: '6px',
            color: '#be123c',
            fontSize: '12px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span>📌 <b>Atenção:</b> Este lead excedeu o prazo em <b>+{diasExcedidos} dias</b>. Para atualizar e zerar o tempo estagnado, mude de coluna (atualize o status) abaixo.</span>
          </div>
        )}

        {/* Cobrança automática */}
        <section className="cj-fn-bloco">
          <h4>Cobrança automática</h4>
          <p className={acao.atrasado ? 'cj-fn-alerta' : ''}>
            {acao.texto} · {lead.tentativas_followup || 0} tentativa(s) já feita(s)
          </p>
          <div className="cj-fn-acoes-linha">
            <button onClick={() => onAdiar(3)}>Adiar 3 dias</button>
            <button onClick={() => onAdiar(7)}>Adiar 7 dias</button>
          </div>
        </section>

        {/* Checklist */}
        <section className="cj-fn-bloco">
          <h4>
            Checklist de Atividades / Docs
            <span className="cj-fn-bloco-n">
              {checklist.filter(c => c.status === 'recebido').length}/{checklist.length}
            </span>
          </h4>
          {checklist.length === 0 && (
            <p className="cj-fn-vazio-inline">
              Checklist ainda não montado — adicione itens abaixo ou defina o funil.
            </p>
          )}
          <ul className="cj-fn-check">
            {checklist.map(item => (
              <li key={item.id} className={item.status === 'recebido' ? 'ok' : ''}>
                <button onClick={() => onToggleDoc(item)}>
                  <span className="cj-fn-check-box">
                    {item.status === 'recebido' && <Icon name="check" size={12}/>}
                  </span>
                  <span className="cj-fn-check-nome">
                    {item.nome}
                    {!item.obrigatorio && <em> (opcional)</em>}
                  </span>
                </button>
                {item.status === 'ilegivel' && <span className="cj-fn-check-flag">ilegível</span>}
                {item.status === 'vencido' && <span className="cj-fn-check-flag">vencido</span>}
                {onRemoverDoc && (
                  <button
                    type="button"
                    title="Excluir tarefa do checklist"
                    onClick={(e) => { e.stopPropagation(); onRemoverDoc(item); }}
                    style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#e11d48', cursor: 'pointer', padding: '4px 6px', display: 'flex', alignItems: 'center', borderRadius: '6px', transition: 'all 0.15s ease', marginLeft: '6px' }}
                    onMouseOver={e => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.background = '#e11d48'; }}
                    onMouseOut={e => { e.currentTarget.style.color = '#e11d48'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)'; }}
                  >
                    <Icon name="trash-2" size={14}/>
                  </button>
                )}
              </li>
            ))}
          </ul>
          {pendentes.length > 0 && (
            <p className="cj-fn-hint">
              A IA cobrará pendentes no WhatsApp: {pendentes.map(p => p.nome).join(', ')}.
            </p>
          )}

          <form
            onSubmit={e => {
              e.preventDefault();
              if (novoItem.trim() && onAdicionarChecklist) {
                onAdicionarChecklist(novoItem);
                setNovoItem('');
              }
            }}
            style={{ display: 'flex', gap: 6, marginTop: 14 }}
          >
            <input
              type="text"
              value={novoItem}
              onChange={e => setNovoItem(e.target.value)}
              placeholder="+ Nova atividade ou documento..."
              style={{
                flex: 1,
                padding: '7px 10px',
                fontSize: '12.5px',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                background: 'var(--surface)',
                color: 'var(--ink)'
              }}
            />
            <button
              type="submit"
              style={{
                padding: '7px 12px',
                background: 'var(--primary)',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Adicionar
            </button>
          </form>
        </section>

        {/* Mover etapa */}
        <section className="cj-fn-bloco">
          <h4>Mover para</h4>
          <div className="cj-fn-etapas">
            {etapas.map(e => (
              <button
                key={e.slug}
                className={`cor-${e.cor} ${e.slug === lead.etapa_slug ? 'atual' : ''}`}
                disabled={e.slug === lead.etapa_slug}
                onClick={() => onMover(e.slug)}
              >
                {e.nome}
              </button>
            ))}
          </div>
        </section>

        {/* Trocar funil */}
        <section className="cj-fn-bloco">
          <h4>Reclassificar funil</h4>
          <p className="cj-fn-hint">
            Trocar o funil remonta o checklist de documentos automaticamente.
          </p>
          <div className="cj-fn-acoes-linha">
            {funis.filter(f => f.slug !== lead.funil_slug).map(f => (
              <button key={f.slug} onClick={() => onTrocarFunil(f.slug)}>
                Mover para {f.nome}
              </button>
            ))}
          </div>
        </section>

        {/* Histórico */}
        {historico.length > 0 && (
          <section className="cj-fn-bloco">
            <h4>Histórico</h4>
            <ul className="cj-fn-hist">
              {historico.map(h => (
                <li key={h.id}>
                  <b>{fmtData(h.criado_em)}</b> {h.etapa_anterior || '—'} → {h.etapa_nova}
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="cj-fn-drawer-foot">
          <button className="cj-fn-btn-primario" onClick={onChat}>
            <Icon name="send" size={14}/> Abrir conversa
          </button>
          <button className="cj-fn-btn-perigo" onClick={onPerder}>
            Encerrar lead
          </button>
        </footer>
      </aside>
    </>
  );
};

export default Funil;

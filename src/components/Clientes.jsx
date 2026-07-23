import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';
import { clientes, casos, corAdv, nomeAdv, iniciais, fmtData, documentosCliente, escritorio, configIA, TAGS_DISPONIVEIS as tagsInitial } from '../data/mockData';
import { ChatTag } from './ChatTag';
import { ModalNovaTag } from './ModalNovaTag';
import { supabase } from '../lib/supabase';
import { loadEventos } from '../lib/funilService';
import { uploadArquivoSupabase } from '../lib/supabaseService';
import { abrirConversaChatwoot } from '../lib/chatwootService';

export const Clientes = ({ clientesList = clientes, casosList = casos, onUpdateCasos, onEdit, onUpdateCliente, targetClient, aiName = configIA.nome || 'Sofia', tagsLista: tagsListaProp, onAddTag }) => {
  const [q, setQ] = useState('');
  const [filtro, setFiltro] = useState('all');
  const [ativoId, setAtivoId] = useState(clientesList[0]?.id);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [showNewTagModal, setShowNewTagModal] = useState(false);
  const [tagsListaState, setTagsListaState] = useState(tagsInitial);
  const tagsLista = tagsListaProp || tagsListaState;
  const [toast, setToast] = useState(null);

  const cleanDigits = (s) => (s || '').replace(/\D/g, '');

  useEffect(() => {
    if (!targetClient) return;
    const tId = typeof targetClient === 'string' ? targetClient : targetClient.id;
    const tTel = typeof targetClient === 'string' ? targetClient : (targetClient.tel || targetClient.telefone || '');
    const tDoc = typeof targetClient === 'string' ? targetClient : (targetClient.doc || targetClient.cpf || '');
    const tNome = typeof targetClient === 'string' ? targetClient : (targetClient.nome || '');

    const found = (clientesList || []).find(c => {
      if (!c) return false;
      if (c.id === tId) return true;
      const cTel = cleanDigits(c.tel || c.telefone);
      const tTelClean = cleanDigits(tTel);
      if (tTelClean && cTel && (cTel === tTelClean || cTel.includes(tTelClean) || tTelClean.includes(cTel))) return true;
      const cDoc = cleanDigits(c.doc || c.cpf);
      const tDocClean = cleanDigits(tDoc);
      if (tDocClean && cDoc && cDoc === tDocClean) return true;
      if (tNome && c.nome && c.nome.toLowerCase() === tNome.toLowerCase()) return true;
      return false;
    });

    if (found) {
      setAtivoId(found.id);
    }
  }, [targetClient, clientesList]);

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const busca = (q || '').trim().toLowerCase();
  const baseClientes = clientesList || [];
  const lista = baseClientes.filter(c => {
    if (!c) return false;
    if (filtro === 'PF' && c.tipo !== 'PF') return false;
    if (filtro === 'PJ' && c.tipo !== 'PJ') return false;
    if (filtro === 'lead' && c.status !== 'lead' && !c.origem?.includes('Funil')) return false;
    if (filtro === 'ativo' && (c.status === 'lead' || c.origem?.includes('Funil')) && c.status !== 'ativo') return false;
    if (!busca) return true;
    return (c.nome || '').toLowerCase().includes(busca) || 
           (c.doc || '').toLowerCase().includes(busca) || 
           (c.email || '').toLowerCase().includes(busca) ||
           (c.origem || '').toLowerCase().includes(busca);
  });

  const ativo = baseClientes.find(c => c && c.id === ativoId) || lista[0] || baseClientes[0];

  useEffect(() => {
    setShowTagSelector(false);
  }, [ativoId]);

  const alterarTag = async (tId) => {
    if (!ativo) return;
    ativo.tag = tId;
    if (onUpdateCliente) {
      onUpdateCliente({ ...ativo, tag: tId });
    } else if (onEdit && typeof onEdit === 'function') {
      onEdit({ ...ativo, tag: tId }, 'atualizar_cliente');
    }
    setShowTagSelector(false);
    flash('✓ Etapa / Tag alterada para ' + tId.toUpperCase());
    if (supabase && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ativo.id)) {
      try {
        await supabase.from('clientes').update({ tag: tId }).eq('id', ativo.id);
      } catch (err) {
        console.error('Erro ao atualizar tag no supabase:', err);
      }
    }
  };

  const salvarNovaTag = (nova) => {
    if (onAddTag) onAddTag(nova);
    else setTagsListaState(prev => [...prev, nova]);
    alterarTag(nova.id);
    setShowNewTagModal(false);
  };

  return (
    <div className="cj-clientes">
      <div className="cj-cli-list-pane">
        <div className="cj-cli-head">
          <div className="cj-cli-titlerow">
            <div>
              <h1>Clientes & Leads</h1>
              <span className="cj-count">{baseClientes.length} cadastrados · {baseClientes.filter(c=>c && (c.status==='lead' || c.origem?.includes('Funil'))).length} no Funil · {baseClientes.filter(c=>c && c.status!=='lead' && !c.origem?.includes('Funil')).length} Clientes Ativos</span>
            </div>
            <button className="cj-btn sm ghost" onClick={() => onEdit({ cliente: '', advogado: 'a1', tipo: 'PF', doc: '', tel: '', email: '' }, 'novo_cliente')} title="Novo cliente">
              <Icon name="plus" size={14}/>
            </button>
          </div>
          <div className="cj-search">
            <Icon name="search" size={14}/>
            <input placeholder="Buscar por nome, CPF ou origem..." value={q} onChange={e => setQ(e.target.value)}/>
          </div>
          <div className="cj-cli-filtros" style={{ flexWrap: 'wrap' }}>
            {[
              { k: 'all', l: `Todos (${baseClientes.length})` },
              { k: 'ativo', l: `Clientes (${baseClientes.filter(c=>c && c.status!=='lead' && !c.origem?.includes('Funil')).length})` },
              { k: 'lead', l: `Leads Funil (${baseClientes.filter(c=>c && (c.status==='lead' || c.origem?.includes('Funil'))).length})` },
              { k: 'PF', l: `PF (${baseClientes.filter(c=>c && c.tipo==='PF').length})` }
            ].map(f => (
              <button
                key={f.k}
                className={`cj-chip ${filtro === f.k ? 'active' : ''}`}
                onClick={() => setFiltro(f.k)}
              >
                {f.l}
              </button>
            ))}
          </div>
        </div>
        <div className="cj-cli-list">
          {lista.map(c => {
            if (!c) return null;
            const numCasos = (casosList || casos || []).filter(p => p && (p.clienteId === c.id || p.leadId === c.id || p.cliente_id === c.id || p.lead_id === c.id)).length;
            return (
              <div
                key={c.id}
                className={`cj-cli-row ${ativo?.id === c.id ? 'active' : ''}`}
                onClick={() => setAtivoId(c.id)}
              >
                <div className={`cj-cli-av ${(c.tipo || 'PF') === 'PJ' ? 'tipo-PJ' : ''}`}>{iniciais(c.nome)}</div>
                <div className="cj-cli-body">
                  <div className="cj-cli-top">
                    <div className="cj-cli-nome">{c.nome || 'Cliente sem nome'}</div>
                    <ChatTag tag={c.tag || (c.status === 'lead' || c.origem?.includes('Funil') ? 'lead' : 'cliente')} tagsLista={tagsLista}/>
                  </div>
                  <div className="cj-cli-meta">
                    <span className="cj-badge-tipo" style={{ fontSize: '9px', padding: '1px 5px' }}>{c.tipo || 'PF'}</span>
                    <span>{numCasos} {numCasos === 1 ? 'processo' : 'processos'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh' }}>
        <ClienteDetalhe
          cliente={ativo}
          casosList={casosList || casos}
          onUpdateCasos={onUpdateCasos}
          onEdit={onEdit}
          flash={flash}
          aiName={aiName}
          tagsLista={tagsLista}
          showTagSelector={showTagSelector}
          setShowTagSelector={setShowTagSelector}
          alterarTag={alterarTag}
          showNewTagModal={showNewTagModal}
          setShowNewTagModal={setShowNewTagModal}
          salvarNovaTag={salvarNovaTag}
        />
        {toast && <div className="cj-toast"><Icon name="check" size={14}/> {toast}</div>}
      </div>
    </div>
  );
};

function ClienteDetalhe({
  cliente,
  casosList,
  onUpdateCasos,
  onEdit,
  flash,
  aiName = configIA.nome || 'Sofia',
  tagsLista = [],
  showTagSelector,
  setShowTagSelector,
  alterarTag,
  showNewTagModal,
  setShowNewTagModal,
  salvarNovaTag
}) {
  const [docsList, setDocsList] = useState(documentosCliente);
  const [showDocModal, setShowDocModal] = useState(false);
  const [docForm, setDocForm] = useState({ titulo: '', tipo: 'andamento', conteudo_texto: '', arquivo_url: '', liberado_cliente: true, arquivo: null, arquivoNome: '', arquivoUrl: '' });
  const [showProcModal, setShowProcModal] = useState(false);
  const [editingProc, setEditingProc] = useState(null);

  const handleFileSelectClient = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    setDocForm(prev => ({
      ...prev,
      arquivo: file,
      arquivoNome: file.name,
      arquivoUrl: URL.createObjectURL(file),
      titulo: prev.titulo || cleanTitle
    }));
    if (flash) flash(`Arquivo selecionado: ${file.name}`);
  };

  const handleOpenNewProc = () => {
    setEditingProc({
      id: 'p_' + Date.now(),
      titulo: '',
      numero: '',
      clienteId: cliente.id,
      area: cliente.area || 'Previdenciário',
      fase: 'Inicial',
      status: 'ativo',
      advogado: cliente.advogado || 'a1',
      proximoPrazo: '',
      notas: '',
      isNew: true
    });
    setShowProcModal(true);
  };

  const handleOpenEditProc = (proc) => {
    setEditingProc({ ...proc, isNew: false });
    setShowProcModal(true);
  };

  const handleSaveProc = async (e) => {
    e.preventDefault();
    if (!editingProc.titulo.trim()) {
      flash && flash('Por favor, informe o título do processo');
      return;
    }

    const item = { ...editingProc, isNew: undefined };
    const base = casosList || casos;
    let novos;
    if (editingProc.isNew) {
      novos = [item, ...base];
      flash && flash(`Processo "${item.titulo}" vinculado a ${cliente.nome}!`);
    } else {
      novos = base.map(p => p.id === item.id ? item : p);
      flash && flash(`Processo "${item.titulo}" atualizado com sucesso!`);
    }

    if (onUpdateCasos) onUpdateCasos(novos);
    else {
      casos.length = 0;
      casos.push(...novos);
    }
    setShowProcModal(false);

    if (supabase) {
      try {
        const payload = {
          id: (!item.id.startsWith('p_') && item.id.length > 10) ? item.id : undefined,
          escritorio_id: undefined,
          cliente_id: item.clienteId || null,
          titulo: item.titulo,
          numero_cnj: item.numero || '—',
          area: item.area || 'Previdenciário',
          fase: item.fase || 'Inicial',
          status: item.status || 'ativo',
          advogado_id: item.advogado || null,
          proximo_prazo: item.proximoPrazo || null,
          notas: item.notas || ''
        };
        const { error } = await supabase.from('processos').upsert(payload);
        if (error && (error.message.includes('proximo_prazo') || error.message.includes('schema cache'))) {
          delete payload.proximo_prazo;
          await supabase.from('processos').upsert(payload);
        }
      } catch (err) {
        console.error('Erro ao salvar processo no Supabase:', err);
      }
    }
  };

  const handleDeleteProc = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir ou arquivar este processo?')) {
      const base = casosList || casos;
      const novos = base.filter(p => p.id !== id);
      if (onUpdateCasos) onUpdateCasos(novos);
      else {
        casos.length = 0;
        casos.push(...novos);
      }
      setShowProcModal(false);
      flash && flash('Processo desvinculado e removido');

      if (supabase && (!id.startsWith('p_') || id.length > 10)) {
        try {
          await supabase.from('processos').delete().eq('id', id);
        } catch (err) {
          console.error('Erro ao excluir processo no Supabase:', err);
        }
      }
    }
  };

  useEffect(() => {
    async function fetchDocs() {
      const isUuid = cliente?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cliente.id);
      if (supabase && cliente?.id && isUuid) {
        try {
          const { data } = await supabase.from('documentos_cliente').select('*').eq('cliente_id', cliente.id).order('criado_em', { ascending: false });
          if (data && data.length > 0) {
            setDocsList(prev => {
              const semAtuais = prev.filter(d => d.clienteId !== cliente.id);
              const formatados = data.map(d => ({
                id: d.id,
                clienteId: d.cliente_id,
                processoId: d.processo_id,
                titulo: d.titulo,
                tipo: d.tipo,
                conteudo_texto: d.conteudo_texto,
                arquivo_url: d.arquivo_url,
                liberado_cliente: d.liberado_cliente,
                data: d.criado_em ? d.criado_em.slice(0, 10) : new Date().toISOString().slice(0, 10)
              }));
              return [...formatados, ...semAtuais];
            });
          }
        } catch (e) {
          console.error('Erro ao buscar documentos do cliente no Supabase:', e);
        }
      }
    }
    fetchDocs();
  }, [cliente?.id]);

  const [eventosCli, setEventosCli] = useState([]);
  useEffect(() => {
    if (cliente?.id) {
      loadEventos().then(evs => {
        setEventosCli(evs.filter(e => e && (e.cliente_id === cliente.id || e.lead_id === cliente.id || e.clienteId === cliente.id || e.leadId === cliente.id)));
      }).catch(() => {});
    }
  }, [cliente?.id]);

  if (!cliente) return <div className="cj-cli-detalhe empty">Selecione um cliente.</div>;
  const processos = (casosList || casos || []).filter(p => p && (p.clienteId === cliente.id || p.leadId === cliente.id || p.cliente_id === cliente.id || p.lead_id === cliente.id));
  const proximos = eventosCli.filter(e => e && (e.status === 'agendado' || !e.status));
  const docsClienteAtual = (docsList || []).filter(d => d && d.clienteId === cliente.id);

  const toggleLiberado = async (docId, valorAtual) => {
    const novoValor = !valorAtual;
    setDocsList(prev => prev.map(d => d.id === docId ? { ...d, liberado_cliente: novoValor } : d));
    flash && flash(novoValor ? '✓ Documento liberado para consulta no WhatsApp (IA)' : '🔒 Documento restrito ao uso interno');

    if (supabase && (!docId.startsWith('doc') || docId.length > 10)) {
      try {
        await supabase.from('documentos_cliente').update({ liberado_cliente: novoValor }).eq('id', docId);
      } catch (e) {
        console.error('Erro ao atualizar liberado_cliente no Supabase:', e);
      }
    }
  };

  const salvarNovoDoc = async () => {
    if (!docForm.titulo.trim() && !docForm.arquivoNome) {
      flash && flash('Selecione um arquivo ou informe o título do documento/resumo.');
      return;
    }
    flash && flash('Enviando e salvando documento no Storage...');
    const tituloFinal = docForm.titulo.trim() || (docForm.arquivoNome ? docForm.arquivoNome.replace(/\.[^/.]+$/, '') : 'Documento Anexado');
    
    let urlReal = docForm.arquivoUrl || docForm.arquivo_url || ('https://cdn.exemplo.com/docs/' + tituloFinal.toLowerCase().replace(/[^a-z0-9]/g, '_') + '.pdf');
    if (docForm.arquivo) {
      const respUrl = await uploadArquivoSupabase(docForm.arquivo, 'clientes_docs');
      if (respUrl) urlReal = respUrl;
    }

    const novo = {
      id: 'doc_' + Date.now(),
      clienteId: cliente.id,
      processoId: processos[0]?.id || null,
      titulo: tituloFinal,
      tipo: docForm.tipo || 'andamento',
      conteudo_texto: docForm.conteudo_texto || `Documento (${docForm.arquivoNome || tituloFinal}) anexado à ficha do cliente.`,
      arquivo_url: urlReal,
      arquivoNome: docForm.arquivoNome || (docForm.arquivo_url ? docForm.arquivo_url.split('/').pop() : tituloFinal + '.pdf'),
      liberado_cliente: docForm.liberado_cliente,
      data: new Date().toISOString().slice(0, 10)
    };
    setDocsList(prev => [novo, ...prev]);
    setShowDocModal(false);
    setDocForm({ titulo: '', tipo: 'andamento', conteudo_texto: '', arquivo_url: '', liberado_cliente: true, arquivo: null, arquivoNome: '', arquivoUrl: '' });
    flash && flash(novo.liberado_cliente ? `✓ Arquivo [${novo.arquivoNome}] atrelado ao cliente e liberado para IA!` : `🔒 Arquivo [${novo.arquivoNome}] salvo como sigiloso!`);

    if (supabase && cliente.id && !cliente.id.startsWith('c')) {
      try {
        const { data } = await supabase.from('documentos_cliente').insert({
          cliente_id: cliente.id,
          processo_id: processos[0]?.id || null,
          titulo: novo.titulo,
          tipo: novo.tipo,
          conteudo_texto: novo.conteudo_texto,
          arquivo_url: novo.arquivo_url,
          liberado_cliente: novo.liberado_cliente
        }).select();
        if (data && data[0]) {
          setDocsList(prev => prev.map(d => d.id === novo.id ? { ...d, id: data[0].id } : d));
        }
      } catch (e) {
        console.error('Erro ao salvar no Supabase:', e);
      }
    }
  };

  return (
    <div className="cj-cli-detalhe">
      <header className="cj-cli-det-head">
        <div className="cj-cli-det-id">
          <div className={`cj-cli-av lg tipo-${cliente.tipo || 'PF'}`}>{(cliente.tipo || 'PF') === 'PJ' ? <Icon name="folder" size={22}/> : iniciais(cliente.nome)}</div>
          <div>
            <h2>{cliente.nome || 'Cliente sem nome'}</h2>
            <div className="cj-cli-det-sub">
              <span className="cj-badge-tipo">{cliente.tipo || 'PF'}</span>
              <span>{cliente.doc || '—'}</span>
              <span className="sep">·</span>
              <span>cliente desde {fmtData(cliente.desde)}</span>
            </div>
          </div>
        </div>
        <div className="cj-cli-det-actions">
          <button className="cj-btn ghost"><Icon name="phone" size={13}/> Ligar</button>
          <button className="cj-btn ghost"><Icon name="mail" size={13}/> E-mail</button>
          <button className="cj-btn ghost" onClick={() => abrirConversaChatwoot(cliente.tel || cliente.telefone, flash)} title="Abrir a conversa deste cliente no Chatwoot"><Icon name="external" size={13}/> Chatwoot</button>
          <button className="cj-btn" onClick={() => onEdit()}><Icon name="calendar" size={13}/> Prazos & Perícias</button>
        </div>
      </header>

      <div className="cj-cli-det-grid">
        <section className="cj-card">
          <h3>Contato</h3>
          <div className="cj-fields">
            <div><label>Telefone</label><span>{cliente.tel || '—'}</span></div>
            <div><label>E-mail</label><span>{cliente.email || '—'}</span></div>
            <div><label>Advogado responsável</label><span>{nomeAdv(cliente.advogado)}</span></div>
            <div><label>Origem</label><span>{cliente.origem || '—'}</span></div>

            {/* Seletor Rápido de Etapa / Tag Integrado igual ao Chat */}
            <div style={{ gridColumn: '1 / -1', paddingTop: '10px', marginTop: '6px', borderTop: '1px dashed var(--border-2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Etapa / Tag</label>
              <div className="cj-tag-selector-wrapper">
                <button className="cj-clean-tag-pill" onClick={() => setShowTagSelector(!showTagSelector)}>
                  <ChatTag tag={cliente.tag || (cliente.status === 'lead' || cliente.origem?.includes('Funil') ? 'lead' : 'cliente')} tagsLista={tagsLista}/>
                  <Icon name="chevron" size={11}/>
                </button>

                {showTagSelector && (
                  <div className="cj-tag-dropdown" style={{ right: 0, left: 'auto', zIndex: 50 }}>
                    <div className="cj-tag-dropdown-title">Alterar etapa / tag do cliente:</div>
                    <div className="cj-tag-options">
                      {tagsLista.map(t => (
                        <button key={t.id} className={`cj-tag-option ${(cliente.tag || (cliente.status === 'lead' || cliente.origem?.includes('Funil') ? 'lead' : 'cliente')) === t.id ? 'active' : ''}`} onClick={() => alterarTag(t.id)}>
                          <span className={`cj-chattag ${t.cor}`}>{t.label}</span>
                          <span className="cj-tag-desc">{t.desc}</span>
                        </button>
                      ))}
                    </div>
                    <button className="cj-tag-add-btn" onClick={() => { setShowTagSelector(false); setShowNewTagModal(true); }}>
                      <Icon name="plus" size={12}/> Criar nova tag
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="cj-card">
          <h3>Próximos prazos e perícias</h3>
          {proximos.length > 0 ? proximos.map(a => (
            <div key={a.id} className="cj-cli-appt" onClick={() => onEdit(a)}>
              <div className="cj-cli-appt-time"><b>{a.hora || (a.data_hora ? new Date(a.data_hora).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}) : '09:00')}</b><span>{fmtData(a.data_hora)}</span></div>
              <div className="cj-cli-appt-main"><div>{a.titulo}</div><span>{nomeAdv(a.advogado || a.advogado_id)} · {a.local || 'INSS/Juízo'}</span></div>
              <Icon name="chevron" size={14}/>
            </div>
          )) : <div className="cj-empty-inline">Nenhuma perícia ou prazo registrado. <button onClick={() => onEdit()}>Abrir Prazos &amp; Perícias</button></div>}
        </section>

        <section className="cj-card span-2">
          <div className="cj-card-head">
            <h3>Processos e casos</h3>
            <button className="cj-btn ghost sm" onClick={handleOpenNewProc}><Icon name="plus" size={12}/> Novo processo</button>
          </div>
          <div className="cj-proc-list">
            {processos.length > 0 ? processos.map(p => (
              <div key={p.id} className="cj-proc-row" onClick={() => handleOpenEditProc(p)} style={{ cursor: 'pointer' }} title="Clique para abrir e editar processo">
                <div className="cj-proc-icon"><Icon name="gavel" size={14}/></div>
                <div className="cj-proc-main">
                  <div className="cj-proc-titulo">{p.titulo}</div>
                  <div className="cj-proc-num">{p.numero}</div>
                </div>
                <span className="cj-proc-fase">{p.fase}</span>
                {p.proximoPrazo && <span className="cj-proc-prazo"><Icon name="clock" size={11}/> {fmtData(p.proximoPrazo)}</span>}
                <button className="cj-dia-edit" onClick={(e) => { e.stopPropagation(); handleOpenEditProc(p); }} title="Editar processo">
                  <Icon name="more" size={14}/>
                </button>
              </div>
            )) : (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--ink-3)', fontSize: '12.5px' }}>
                Nenhum processo cadastrado para este cliente. <button onClick={handleOpenNewProc} style={{ color: 'var(--accent)', fontWeight: '600', textDecoration: 'underline' }}>Adicionar novo processo</button>
              </div>
            )}
          </div>
        </section>

        {/* Seção Documentos e Resumos para RAG/IA no WhatsApp */}
        <section className="cj-card span-2">
          <div className="cj-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '24px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Icon name="folder" size={16} style={{ color: 'var(--accent)' }}/> Documentos & Resumos para IA (WhatsApp)
              </h3>
              <p style={{ fontSize: '12.5px', color: 'var(--ink-3)', marginTop: '6px', marginBottom: 0, fontWeight: '400', lineHeight: '1.45' }}>
                Atrele peças e resumos de andamento ao cliente. A chave verde define quais documentos a {aiName} (IA) pode consultar para responder ao cliente no WhatsApp.
              </p>
            </div>
            <button className="cj-btn sm" onClick={() => setShowDocModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginTop: '2px' }}>
              <Icon name="plus" size={12}/> Adicionar Documento / Resumo
            </button>
          </div>

          <div className="cj-proc-list" style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {docsClienteAtual.length > 0 ? docsClienteAtual.map(doc => (
              <div key={doc.id} className="cj-proc-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--surface, rgba(255,255,255,0.4))', borderRadius: '10px', border: '1px solid var(--border-2)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1, minWidth: 0 }}>
                  <div className="cj-proc-icon" style={{ marginTop: '2px', background: doc.tipo === 'peticao' ? 'rgba(59,130,246,0.1)' : doc.tipo === 'sentenca' ? 'rgba(16,185,129,0.1)' : 'rgba(139,92,246,0.1)', color: doc.tipo === 'peticao' ? '#3b82f6' : doc.tipo === 'sentenca' ? '#10b981' : '#8b5cf6', padding: '8px', borderRadius: '8px' }}>
                    <Icon name={doc.tipo === 'peticao' ? 'file' : doc.tipo === 'sentenca' ? 'gavel' : 'info'} size={15}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span className="cj-proc-titulo" style={{ fontWeight: '600', color: 'var(--ink)' }}>{doc.titulo}</span>
                      <span className="cj-badge-tipo" style={{ fontSize: '10.5px', textTransform: 'uppercase', padding: '2px 7px' }}>{doc.tipo}</span>
                      <span style={{ fontSize: '11px', color: 'var(--ink-4)' }}>{fmtData(doc.data)}</span>
                    </div>
                    {doc.conteudo_texto && (
                      <p style={{ fontSize: '12.5px', color: 'var(--ink-3)', marginTop: '4px', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {doc.conteudo_texto}
                      </p>
                    )}
                    {doc.arquivo_url && (
                      <a href={doc.arquivo_url} target="_blank" rel="noreferrer" style={{ fontSize: '11.5px', color: 'var(--accent)', marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontWeight: '500' }}>
                        <Icon name="link" size={11}/> Abrir arquivo / link anexo
                      </a>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '14px', flexShrink: 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
                    <button
                      className={`cj-switch sm ${doc.liberado_cliente ? 'on' : ''}`}
                      onClick={() => toggleLiberado(doc.id, doc.liberado_cliente)}
                      title={doc.liberado_cliente ? 'Liberado para consulta via WhatsApp (IA)' : 'Restrito / Interno'}
                    >
                      <span/>
                    </button>
                    <span style={{ fontSize: '10.5px', fontWeight: '600', color: doc.liberado_cliente ? '#10b981' : 'var(--ink-4)' }}>
                      {doc.liberado_cliente ? '✓ Liberado (IA)' : '🔒 Interno'}
                    </span>
                  </div>
                  <button
                    className="cj-dia-edit"
                    onClick={async () => {
                      setDocsList(prev => prev.filter(d => d.id !== doc.id));
                      flash && flash('Documento removido');
                      if (supabase && (!doc.id.startsWith('doc') || doc.id.length > 10)) {
                        await supabase.from('documentos_cliente').delete().eq('id', doc.id);
                      }
                    }}
                    title="Excluir documento"
                  >
                    <Icon name="trash" size={13}/>
                  </button>
                </div>
              </div>
            )) : (
              <div className="cj-empty-inline" style={{ padding: '24px', textAlign: 'center', color: 'var(--ink-4)', border: '1px dashed var(--border-2)', borderRadius: '10px' }}>
                Nenhum documento ou resumo de andamento anexado para este cliente. Clique no botão acima para adicionar.
              </div>
            )}
          </div>
        </section>
      </div>

      {showDocModal && (
        <div className="cj-modal-bg" style={{ zIndex: 999999 }}>
          <div className="cj-modal" style={{ maxWidth: '540px', width: '90%' }}>
            <div className="cj-modal-head">
              <div>
                <div className="cj-modal-eyebrow">INTELIGÊNCIA JURÍDICA E ANEXOS</div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--ink)' }}>Novo Documento / Resumo de Andamento</h2>
              </div>
              <button className="cj-modal-x" onClick={() => setShowDocModal(false)}><Icon name="x" size={16}/></button>
            </div>
            <div className="cj-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Seletor de Arquivo (Upload do Computador) */}
              <div className="cj-field">
                <label style={{ fontWeight: '600', color: 'var(--ink)' }}>Anexar Arquivo (PDF / Laudo / Imagem)</label>
                <input
                  type="file"
                  id="file-upload-client"
                  style={{ display: 'none' }}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={handleFileSelectClient}
                />
                <label
                  htmlFor="file-upload-client"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: docForm.arquivoNome ? 'space-between' : 'center',
                    gap: '8px',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: docForm.arquivoNome ? '1px solid var(--accent)' : '1px dashed var(--border-2)',
                    background: docForm.arquivoNome ? 'rgba(99, 102, 241, 0.08)' : 'var(--surface-2, rgba(0,0,0,0.02))',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    color: docForm.arquivoNome ? 'var(--accent)' : 'var(--ink-3)',
                    fontSize: '13px',
                    fontWeight: '500'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    <Icon name={docForm.arquivoNome ? 'file-text' : 'upload'} size={18}/>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {docForm.arquivoNome || '📁 Clique aqui para selecionar arquivo...'}
                    </span>
                  </div>
                  {docForm.arquivoNome && (
                    <span
                      onClick={(e) => {
                        e.preventDefault();
                        setDocForm(prev => ({ ...prev, arquivo: null, arquivoNome: '', arquivoUrl: '' }));
                      }}
                      style={{ fontSize: '11px', color: 'var(--ink-4)', cursor: 'pointer', padding: '2px 6px', borderRadius: '4px' }}
                      title="Remover arquivo selecionado"
                    >
                      ✕ Remover
                    </span>
                  )}
                </label>
              </div>

              <div className="cj-field">
                <label>Título do Documento / Andamento</label>
                <input
                  type="text"
                  placeholder="Ex.: Petição Inicial Protocolada, Laudo Ortopédico..."
                  value={docForm.titulo}
                  onChange={e => setDocForm({ ...docForm, titulo: e.target.value })}
                />
              </div>
              <div className="cj-field">
                <label>Tipo de Documento</label>
                <select value={docForm.tipo} onChange={e => setDocForm({ ...docForm, tipo: e.target.value })} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-2)', background: 'var(--bg)', color: 'var(--ink)' }}>
                  <option value="andamento">📌 Andamento / Notícia Processual</option>
                  <option value="peticao">📄 Petição / Manifestação</option>
                  <option value="sentenca">⚖️ Decisão / Sentença</option>
                  <option value="contrato">🤝 Contrato / Acordo</option>
                  <option value="outro">📁 Outro / Anexo Geral</option>
                </select>
              </div>
              <div className="cj-field">
                <label>Resumo / Conteúdo do Documento (Alimenta a IA para responder ao cliente via WhatsApp)</label>
                <textarea
                  rows={4}
                  placeholder={`Escreva de forma clara o que aconteceu ou o resumo desta peça. A ${aiName} (IA) usará este texto para explicar o andamento ao cliente quando ele perguntar...`}
                  value={docForm.conteudo_texto}
                  onChange={e => setDocForm({ ...docForm, conteudo_texto: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-2)', background: 'var(--bg)', color: 'var(--ink)', fontSize: '13px' }}
                />
              </div>
              <div className="cj-field">
                <label>Link para Arquivo / PDF (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex.: https://... (link do drive, pdf no storage ou processo)"
                  value={docForm.arquivo_url}
                  onChange={e => setDocForm({ ...docForm, arquivo_url: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#059669' }}>✓ Liberar para consulta via WhatsApp?</span>
                  <span style={{ fontSize: '11.5px', color: 'var(--ink-3)' }}>Se ativo, a IA poderá ler este resumo e responder ao cliente caso ele pergunte pelo status do caso.</span>
                </div>
                <button
                  type="button"
                  className={`cj-switch sm ${docForm.liberado_cliente ? 'on' : ''}`}
                  onClick={() => setDocForm({ ...docForm, liberado_cliente: !docForm.liberado_cliente })}
                >
                  <span/>
                </button>
              </div>
            </div>
            <div className="cj-modal-foot" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button type="button" className="cj-btn ghost" onClick={() => setShowDocModal(false)}>Cancelar</button>
              <button type="button" className="cj-btn" onClick={salvarNovoDoc}>Salvar Documento</button>
            </div>
          </div>
        </div>
      )}

      {showProcModal && editingProc && (
        <div className="cj-modal-bg" style={{ zIndex: 999999 }}>
          <div className="cj-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px', width: '90%' }}>
            <div className="cj-modal-head">
              <div>
                <div className="cj-modal-eyebrow">{editingProc.isNew ? 'integração crm · novo processo' : 'integração crm · editar processo'}</div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--ink)' }}>
                  {editingProc.isNew ? `Novo Processo · ${cliente.nome}` : `Editar Processo · ${editingProc.titulo}`}
                </h2>
              </div>
              <button className="cj-modal-x" onClick={() => setShowProcModal(false)}><Icon name="x" size={16}/></button>
            </div>
            <form onSubmit={handleSaveProc} className="cj-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="cj-field">
                <label>Título da Ação / Caso *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: BPC-LOAS — Maria de Lourdes Santos"
                  value={editingProc.titulo}
                  onChange={e => setEditingProc({ ...editingProc, titulo: e.target.value })}
                />
              </div>
              <div className="cj-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="cj-field">
                  <label>Número do Processo (CNJ)</label>
                  <input
                    type="text"
                    placeholder="0000000-00.2026.5.04.0000"
                    value={editingProc.numero}
                    onChange={e => setEditingProc({ ...editingProc, numero: e.target.value })}
                  />
                </div>
                <div className="cj-field">
                  <label>Área do Direito</label>
                  <select
                    value={editingProc.area}
                    onChange={e => setEditingProc({ ...editingProc, area: e.target.value })}
                  >
                    <option value="Previdenciário">Previdenciário (INSS)</option>
                    <option value="BPC-LOAS">BPC-LOAS (Assistencial)</option>
                    <option value="Auxílio Doença">Auxílio Doença / Incapacidade</option>
                    <option value="Aposentadoria">Aposentadorias & Revisões</option>
                    <option value="Pensão por Morte">Pensão por Morte / Maternidade</option>
                    <option value="Recurso / Revisão">Recurso / Revisão INSS</option>
                  </select>
                </div>
              </div>
              <div className="cj-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="cj-field">
                  <label>Fase Processual</label>
                  <select
                    value={editingProc.fase}
                    onChange={e => setEditingProc({ ...editingProc, fase: e.target.value })}
                  >
                    <option value="Triagem & Qualificação">Triagem & Qualificação (IA/WhatsApp)</option>
                    <option value="Coleta de Documentos">Coleta de Documentos (CadÚnico/Laudos)</option>
                    <option value="Análise Médica/Jurídica">Análise Médica/Jurídica (Interno)</option>
                    <option value="Protocolo INSS">Protocolo Meu INSS / Judicial</option>
                    <option value="Perícia Agendada">Perícia Médica Agendada</option>
                    <option value="Concluído / Êxito">Concluído / Êxito (30% Honorários)</option>
                    <option value="Arquivado / Indeferido">Arquivado / Indeferido</option>
                  </select>
                </div>
                <div className="cj-field">
                  <label>Próximo Prazo / Audiência</label>
                  <input
                    type="date"
                    value={editingProc.proximoPrazo || ''}
                    onChange={e => setEditingProc({ ...editingProc, proximoPrazo: e.target.value })}
                  />
                </div>
              </div>
              <div className="cj-field">
                <label>Advogado Responsável</label>
                <select
                  value={editingProc.advogado}
                  onChange={e => setEditingProc({ ...editingProc, advogado: e.target.value })}
                >
                  {escritorio?.advogados?.map(a => (
                    <option key={a.id} value={a.id}>{a.nome} ({a.area})</option>
                  )) || <option value="a1">Dra. Kassiele (Previdenciário)</option>}
                </select>
              </div>
              <div className="cj-field">
                <label>Notas Internas / Estratégia do Caso</label>
                <textarea
                  rows={3}
                  placeholder="Anotações confidenciais do escritório para este processo..."
                  value={editingProc.notas || ''}
                  onChange={e => setEditingProc({ ...editingProc, notas: e.target.value })}
                />
              </div>
              <div className="cj-modal-foot" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                <div>
                  {!editingProc.isNew && (
                    <button
                      type="button"
                      className="cj-btn danger sm"
                      onClick={() => handleDeleteProc(editingProc.id)}
                    >
                      <Icon name="trash" size={14}/> Excluir processo
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="cj-btn ghost" onClick={() => setShowProcModal(false)}>Cancelar</button>
                  <button type="submit" className="cj-btn">Salvar Alterações</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {showNewTagModal && <ModalNovaTag onClose={() => setShowNewTagModal(false)} onSave={salvarNovaTag} />}
    </div>
  );
}

export default Clientes;

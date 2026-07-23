import React, { useState, useEffect, useRef } from 'react';
import { Icon } from './Icon';
import { ChatTag } from './ChatTag';
import { escritorio, nomeAdv, fmtData, documentosCliente, configIA, TAGS_DISPONIVEIS as tagsInitial } from '../data/mockData';
import { supabase } from '../lib/supabase';
import { uploadArquivoSupabase } from '../lib/supabaseService';

export const Chat = ({
  clientes = [],
  onConverterCliente,
  onGoToCRM,
  onGoToPrazos,
  aiName = configIA.nome || 'Sofia',
  tagsLista: tagsListaProp,
  onAddTag,
  escritorioState,
}) => {
  const esc = escritorioState || escritorio;
  const chatwootUrl = esc.chatwootUrl || '';
  const chatwootToken = esc.chatwootToken || '';
  const chatwootAccountId = esc.chatwootAccountId || '1';

  // Estado: contato ativo vindo do Chatwoot (via postMessage ou busca manual)
  const [activeContact, setActiveContact] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editingLead, setEditingLead] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [newDocForm, setNewDocForm] = useState({ titulo: '', tipo: 'laudo', liberado_cliente: true });
  const [docsChatList, setDocsChatList] = useState(documentosCliente);
  const [atividades, setAtividades] = useState([]);
  const [toast, setToast] = useState(null);
  const [manualSearch, setManualSearch] = useState('');

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const cleanDigits = (s) => (s || '').replace(/\D/g, '');

  // ─── Listener: Chatwoot envia contexto via postMessage ────────────────────
  useEffect(() => {
    const handler = (event) => {
      if (!event.data || typeof event.data !== 'string') return;
      try {
        const payload = JSON.parse(event.data);
        // Chatwoot Dashboard App envia: { event: 'appContext', data: { conversation, contact, currentAgent } }
        if (payload.event === 'appContext' && payload.data) {
          const cwContact = payload.data.contact || {};
          const cwConversation = payload.data.conversation || {};
          const phone = cwContact.phone_number || '';
          const name = cwContact.name || '';
          const email = cwContact.email || '';
          const cwContactId = cwContact.id;
          const cwConversationId = cwConversation.id;
          const labels = cwConversation.labels || [];

          // Busca o cliente CRM pelo telefone
          const numClean = cleanDigits(phone);
          const clienteVinculado = clientes.find(cl => {
            const cliClean = cleanDigits(cl.tel);
            return cliClean && numClean && (cliClean === numClean || cliClean.includes(numClean) || numClean.includes(cliClean));
          });

          setActiveContact({
            nome: name,
            tel: phone,
            email: email,
            cwContactId,
            cwConversationId,
            labels,
            clienteVinculado: clienteVinculado || null,
            // Custom attributes do Chatwoot
            cpf: cwContact.custom_attributes?.cpf || '',
            beneficio: cwContact.custom_attributes?.beneficio || '',
            advogado: cwContact.custom_attributes?.advogado || '',
          });
        }
      } catch (e) {
        // Ignorar mensagens que não são JSON do Chatwoot
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [clientes]);

  // ─── Busca manual de contato por telefone/nome ────────────────────────────
  const buscarContatoManual = () => {
    if (!manualSearch.trim()) return;
    const q = manualSearch.trim().toLowerCase();
    const numClean = cleanDigits(q);
    const found = clientes.find(cl => {
      const cliClean = cleanDigits(cl.tel);
      if (numClean && cliClean && (cliClean.includes(numClean) || numClean.includes(cliClean))) return true;
      if (cl.nome && cl.nome.toLowerCase().includes(q)) return true;
      return false;
    });
    if (found) {
      setActiveContact({
        nome: found.nome,
        tel: found.tel,
        email: found.email || '',
        clienteVinculado: found,
        cpf: found.doc || '',
        labels: [],
      });
      flash(`✓ Cliente encontrado: ${found.nome}`);
    } else {
      setActiveContact({
        nome: manualSearch,
        tel: numClean ? q : '',
        email: '',
        clienteVinculado: null,
        cpf: '',
        labels: [],
      });
      flash('Contato não encontrado no CRM. Preencha a sidebar.');
    }
  };

  // Derivados
  const clienteVinculado = activeContact?.clienteVinculado || null;

  // ─── Carrega atividade do agente IA e documentos do Supabase ──────────────
  useEffect(() => {
    async function loadSidebarData() {
      if (!supabase || !activeContact) {
        setAtividades([]);
        return;
      }
      try {
        // Busca atividades por telefone
        if (activeContact.tel) {
          const telClean = cleanDigits(activeContact.tel);
          if (telClean) {
            const { data: actData } = await supabase
              .from('atividade_agente')
              .select('*')
              .ilike('telefone', `%${telClean.slice(-8)}%`)
              .order('timestamp', { ascending: true })
              .limit(20);
            setAtividades(actData || []);
          }
        }

        // Busca documentos se tem cliente vinculado
        const cliId = clienteVinculado?.id;
        const isUuid = cliId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cliId);
        if (isUuid) {
          const { data } = await supabase.from('documentos_cliente').select('*').eq('cliente_id', cliId).order('criado_em', { ascending: false });
          if (data && data.length > 0) {
            setDocsChatList(prev => {
              const out = prev.filter(d => d.clienteId !== cliId);
              const fmt = data.map(d => ({
                id: d.id,
                clienteId: d.cliente_id,
                processoId: d.processo_id,
                titulo: d.titulo,
                tipo: d.tipo,
                conteudo_texto: d.conteudo_texto,
                arquivo_url: d.arquivo_url,
                arquivoNome: d.arquivo_url ? d.arquivo_url.split('/').pop() : d.titulo + '.pdf',
                liberado_cliente: d.liberado_cliente,
                data: d.criado_em ? d.criado_em.slice(0, 10) : new Date().toISOString().slice(0, 10)
              }));
              return [...fmt, ...out];
            });
          }
        }
      } catch (err) {
        console.error('Erro ao carregar dados na Sidebar:', err);
      }
    }
    loadSidebarData();
  }, [activeContact?.tel, clienteVinculado?.id]);

  // ─── Ações: CRM, Agendamento, Documentos ─────────────────────────────────
  const acaoHeaderCRM = () => {
    if (clienteVinculado) {
      if (onGoToCRM) onGoToCRM(clienteVinculado);
      else flash(`✓ Contato já é cliente (${clienteVinculado.id}). Acesse a aba Clientes.`);
    } else {
      setShowConvertModal(true);
    }
  };

  const abrirAgendamentoRapido = () => {
    if (onGoToPrazos) onGoToPrazos(clienteVinculado || activeContact);
    else flash('Acesse a aba Prazos & Perícias para registrar eventos INSS');
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    setNewDocForm(prev => ({
      ...prev,
      arquivo: file,
      arquivoNome: file.name,
      arquivoUrl: URL.createObjectURL(file),
      titulo: prev.titulo || cleanTitle
    }));
    flash(`Arquivo selecionado: ${file.name}`);
  };

  const salvarNovoDocNoCRM = async () => {
    if (!newDocForm.titulo.trim() && !newDocForm.arquivoNome) {
      flash('Selecione um arquivo ou digite um título para o documento');
      return;
    }
    flash('Enviando e registrando documento...');
    const clienteAlvoId = clienteVinculado?.id || 'c1';
    const tituloFinal = newDocForm.titulo.trim() || (newDocForm.arquivoNome ? newDocForm.arquivoNome.replace(/\.[^/.]+$/, '') : 'Documento Anexado');

    let urlReal = newDocForm.arquivoUrl || ('https://cdn.exemplo.com/docs/' + tituloFinal.toLowerCase().replace(/[^a-z0-9]/g, '_') + '.pdf');
    if (newDocForm.arquivo) {
      const respUrl = await uploadArquivoSupabase(newDocForm.arquivo, 'chat_docs');
      if (respUrl) urlReal = respUrl;
    }

    const novoDoc = {
      id: 'doc_' + Date.now(),
      clienteId: clienteAlvoId,
      processoId: null,
      titulo: tituloFinal,
      tipo: newDocForm.tipo || 'laudo',
      conteudo_texto: `Documento (${newDocForm.arquivoNome || tituloFinal}) anexado diretamente do painel de Atendimento em ${new Date().toLocaleDateString('pt-BR')}.`,
      arquivo_url: urlReal,
      arquivoNome: newDocForm.arquivoNome || (tituloFinal + '.pdf'),
      liberado_cliente: newDocForm.liberado_cliente,
      data: new Date().toISOString().slice(0, 10)
    };

    setDocsChatList(prev => [novoDoc, ...prev]);
    setShowAddDocModal(false);
    setNewDocForm({ titulo: '', tipo: 'laudo', liberado_cliente: true, arquivo: null, arquivoNome: '', arquivoUrl: '' });
    flash(novoDoc.liberado_cliente ? `✓ Arquivo [${novoDoc.arquivoNome}] anexado e liberado para IA!` : `🔒 Arquivo [${novoDoc.arquivoNome}] salvo no CRM (Sigiloso)`);

    const isUuid = clienteAlvoId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clienteAlvoId);
    if (supabase && isUuid) {
      try {
        await supabase.from('documentos_cliente').insert({
          cliente_id: clienteAlvoId,
          titulo: novoDoc.titulo,
          tipo: novoDoc.tipo,
          conteudo_texto: novoDoc.conteudo_texto,
          arquivo_url: novoDoc.arquivo_url,
          liberado_cliente: novoDoc.liberado_cliente
        });
      } catch (err) {
        console.error('Erro ao salvar novo doc no Supabase:', err);
      }
    }
  };

  const converterEAdicionarAoCRM = async (dadosCRM) => {
    let novoCli = null;
    if (onConverterCliente && activeContact) {
      const fakeConversa = {
        id: activeContact.cwConversationId || 'cw_' + Date.now(),
        nome: activeContact.nome,
        tel: activeContact.tel,
        cpf: activeContact.cpf || dadosCRM.cpf,
        email: activeContact.email || dadosCRM.email,
      };
      novoCli = await onConverterCliente(fakeConversa, dadosCRM);
    }
    setShowConvertModal(false);
    flash('✅ Lead cadastrado e vinculado ao CRM com sucesso!');
    if (onGoToCRM && novoCli) onGoToCRM(novoCli);
  };

  const salvarDadosContato = (dadosForm) => {
    setActiveContact(prev => ({ ...prev, ...dadosForm }));
    setEditingLead(false);
    flash('Dados do lead salvos com sucesso');
  };

  // ─── Solicitar contexto do Chatwoot (pedir dados da conversa ativa) ───────
  const requestChatwootContext = () => {
    const iframe = document.querySelector('iframe[title="Chatwoot"]');
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage('chatwoot-dashboard-app:fetch-info', '*');
    }
  };

  // Solicitar contexto ao montar e ao abrir sidebar
  useEffect(() => {
    const timer = setTimeout(requestChatwootContext, 2000);
    return () => clearTimeout(timer);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  const isChatwootConfigured = chatwootUrl && !chatwootUrl.includes('app.chatwoot.com/app/login');

  return (
    <div className={`cj-chat ${sidebarOpen ? 'has-sidebar' : 'no-sidebar'}`}>
      {/* ═══ CENTRO: Chatwoot iframe (ocupa toda a área) ═══ */}
      <section className="cj-thread" style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Header minimalista */}
        <header className="cj-thread-head" style={{ padding: '8px 14px', minHeight: '52px', maxHeight: '54px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="cj-livedot"/>
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--ink)' }}>Chatwoot</span>
              <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>· Atendimento ao vivo via Evolution API</span>
            </div>
          </div>
          <div className="cj-thread-actions" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            {activeContact && (
              <button
                className="cj-btn ghost icon"
                title={clienteVinculado ? `Ver painel deste Cliente no CRM (${clienteVinculado.nome})` : "Cadastrar contato como Cliente (Adicionar ao CRM)"}
                onClick={acaoHeaderCRM}
                style={{ width: '30px', height: '30px', flexShrink: 0, color: clienteVinculado ? 'var(--ok)' : 'var(--accent)', borderColor: clienteVinculado ? 'var(--ok)' : 'var(--border)' }}
              >
                <Icon name={clienteVinculado ? "check" : "plus"} size={14}/>
              </button>
            )}
            <a
              href={chatwootUrl || '#'}
              target="_blank"
              rel="noreferrer"
              className="cj-btn ghost sm"
              style={{ fontSize: '11px', padding: '4px 8px', textDecoration: 'none' }}
            >
              <Icon name="external" size={12}/> Nova aba
            </a>
            <button
              className={`cj-btn ghost icon ${sidebarOpen ? 'active' : ''}`}
              title="Painel CRM / sidebar direita"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{ width: '30px', height: '30px', flexShrink: 0 }}
            >
              <Icon name="users" size={14}/>
            </button>
          </div>
        </header>

        {/* Iframe do Chatwoot ou Placeholder */}
        {isChatwootConfigured ? (
          <iframe
            src={chatwootUrl}
            style={{ flex: 1, width: '100%', border: 'none' }}
            title="Chatwoot"
          />
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', textAlign: 'center', background: 'var(--bg)' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
              <Icon name="sparkles" size={30}/>
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--ink)', margin: '0 0 10px 0' }}>Configure o Chatwoot</h3>
            <p style={{ fontSize: '13px', color: 'var(--ink-3)', maxWidth: '460px', lineHeight: '1.6', margin: '0 0 24px 0' }}>
              Para ativar o atendimento ao vivo integrado, vá em <b>Configurações → Integrações</b> e insira a URL da sua instância self-hosted do Chatwoot, o Token de acesso e o ID da conta.
            </p>
            <button className="cj-btn" onClick={() => flash('Abra a aba Configurações → Integrações para inserir a URL do Chatwoot')}>
              <Icon name="sparkles" size={14}/> Ir para Configurações
            </button>
            <p style={{ fontSize: '11px', color: 'var(--ink-4)', marginTop: '20px' }}>
              💡 Precisa ser uma instância <b>self-hosted</b> para funcionar embutida aqui (o cloud público bloqueia iframe).
            </p>
          </div>
        )}
      </section>

      {/* ═══ DIREITA: Sidebar CRM (preservada e refatorada) ═══ */}
      {sidebarOpen && (
        <aside className="cj-chat-info-clean">
          {/* ── Busca manual de contato (fallback se postMessage não funcionar) ── */}
          <div className="cj-clean-sec" style={{ paddingBottom: '8px' }}>
            <div className="cj-clean-sec-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="cj-clean-sec-label">CONTATO ATIVO</span>
              <button className="cj-clean-x" onClick={() => setSidebarOpen(false)} title="Fechar painel"><Icon name="x" size={14}/></button>
            </div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
              <input
                type="text"
                placeholder="Buscar por telefone ou nome…"
                value={manualSearch}
                onChange={e => setManualSearch(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') buscarContatoManual(); }}
                style={{ flex: 1, fontSize: '12px', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)' }}
              />
              <button className="cj-btn sm" onClick={buscarContatoManual} style={{ padding: '5px 10px', fontSize: '11px' }}>
                <Icon name="search" size={12}/>
              </button>
            </div>
            {activeContact && (
              <div style={{ marginTop: '8px', padding: '8px 10px', background: 'var(--surface-2, rgba(0,0,0,0.02))', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--ink)' }}>{activeContact.nome || '—'}</div>
                <div style={{ fontSize: '11px', color: 'var(--ink-3)', marginTop: '2px', fontFamily: 'monospace' }}>{activeContact.tel || '—'}</div>
                {activeContact.labels?.length > 0 && (
                  <div style={{ marginTop: '6px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {activeContact.labels.map(l => (
                      <span key={l} className="cj-chattag accent" style={{ fontSize: '9px' }}>{l}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Seção: CLIENTE ── */}
          {activeContact && (
            <div className="cj-clean-sec">
              <div className="cj-clean-sec-head">
                <span className="cj-clean-sec-label">CLIENTE</span>
                <div className="cj-clean-sec-actions">
                  <button className="cj-clean-mini-btn" onClick={() => setEditingLead(!editingLead)} title="Editar dados">
                    {editingLead ? 'Concluir' : 'Editar'}
                  </button>
                </div>
              </div>

              <div className="cj-clean-card">
                {!editingLead ? (
                  <div className="cj-clean-kv-list">
                    <div className="cj-clean-kv">
                      <span className="cj-clean-k">Nome</span>
                      <span className="cj-clean-v bold">{activeContact.nome || '—'}</span>
                    </div>
                    <div className="cj-clean-kv">
                      <span className="cj-clean-k">Telefone</span>
                      <span className="cj-clean-v mono">{activeContact.tel || '—'}</span>
                    </div>
                    <div className="cj-clean-kv">
                      <span className="cj-clean-k">E-mail</span>
                      <span className="cj-clean-v">{activeContact.email || '—'}</span>
                    </div>
                    <div className="cj-clean-kv">
                      <span className="cj-clean-k">CPF</span>
                      <span className="cj-clean-v mono">{activeContact.cpf || '—'}</span>
                    </div>
                    <div className="cj-clean-kv">
                      <span className="cj-clean-k">Benefício</span>
                      <span className="cj-clean-v" style={{ fontWeight: '600', color: 'var(--accent)' }}>
                        {clienteVinculado?.area || activeContact.beneficio || 'Previdenciário'}
                      </span>
                    </div>

                    {!clienteVinculado ? (
                      <div className="mt-3 pt-2 border-t border-border/40">
                        <button className="cj-clean-crm-add" onClick={() => setShowConvertModal(true)}>
                          <Icon name="plus" size={13}/> Adicionar aos Clientes (CRM)
                        </button>
                      </div>
                    ) : (
                      <div className="mt-3 pt-2 border-t border-border/40 flex justify-between items-center" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <span className="text-xs font-semibold flex items-center gap-1" style={{ color: 'var(--ok)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}><Icon name="check" size={13}/> No CRM</span>
                        <button className="text-xs font-semibold hover:underline" style={{ color: 'var(--accent)', fontSize: '12px', fontWeight: '600', cursor: 'pointer', background: 'none', border: 'none' }} onClick={() => onGoToCRM && onGoToCRM(clienteVinculado)}>Abrir →</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <FormEdicaoLead
                    contato={activeContact}
                    onCancel={() => setEditingLead(false)}
                    onSave={salvarDadosContato}
                  />
                )}
              </div>
            </div>
          )}

          {/* ── Seção: ATIVIDADE DO AGENTE ── */}
          <div className="cj-clean-sec">
            <div className="cj-clean-sec-head">
              <span className="cj-clean-sec-label">ATIVIDADE DO AGENTE</span>
            </div>
            <div className="cj-clean-timeline">
              {atividades.length > 0 ? (
                atividades.map((act, i) => (
                  <div key={act.id || i} className="cj-tl-item">
                    <div className="cj-tl-icon">
                      <Icon name={act.nome_acao?.includes('humano') ? 'user' : act.nome_acao?.includes('iniciada') ? 'phone' : act.nome_acao?.includes('tag') || act.nome_acao?.includes('etapa') ? 'tag' : 'zap'} size={13}/>
                    </div>
                    <div className="cj-tl-body">
                      <span className={act.tipo === 'tool_call' || act.nome_acao?.includes('_') ? "cj-tl-code" : "cj-tl-text"}>
                        {act.nome_acao}
                      </span>
                      {act.detalhes && <div className="text-[10px] text-muted-foreground mt-0.5">{act.detalhes}</div>}
                    </div>
                    <div className="cj-tl-time">
                      {act.timestamp ? new Date(act.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--ink-3)' }}>
                  {activeContact ? 'Nenhuma atividade registrada para este contato.' : 'Selecione um contato para ver a atividade da IA.'}
                </div>
              )}
            </div>
          </div>

          {/* ── Seção: PRAZOS & PERÍCIAS INSS ── */}
          <div className="cj-clean-sec">
            <div className="cj-clean-sec-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="cj-clean-sec-label">PRAZOS & PERÍCIAS INSS</span>
              <button className="cj-clean-mini-btn" style={{ color: 'var(--accent)', fontWeight: '600' }} onClick={abrirAgendamentoRapido}>+ Registrar</button>
            </div>
            <div className="cj-clean-card">
              {clienteVinculado ? (
                <div className="cj-clean-appt">
                  <div className="cj-appt-datepill">
                    <span className="cj-appt-num">24</span>
                    <span className="cj-appt-month">MAI</span>
                  </div>
                  <div className="cj-appt-body">
                    <div className="cj-appt-time">14:00 — Perícia Médica INSS</div>
                    <div className="cj-appt-title">{nomeAdv(clienteVinculado.advogado || 'a1')} · APS INSS</div>
                    <div className="cj-appt-by">triagem por {aiName} · há 10 min</div>
                  </div>
                </div>
              ) : (
                <div className="cj-clean-appt empty">
                  <div className="cj-appt-body">
                    <div className="cj-appt-title" style={{ color: 'var(--ink-3)', fontWeight: '400', fontSize: '13px' }}>Nenhuma perícia ou prazo pendente</div>
                  </div>
                  <button className="cj-clean-mini-btn" style={{ color: 'var(--accent)', fontWeight: '600' }} onClick={abrirAgendamentoRapido}>+ Registrar</button>
                </div>
              )}
            </div>
          </div>

          {/* ── Seção: ARQUIVOS DO CLIENTE / RAG ── */}
          <div className="cj-clean-sec">
            <div className="cj-clean-sec-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="cj-clean-sec-label" style={{ whiteSpace: 'nowrap' }}>ARQUIVOS DO CLIENTE</span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button className="cj-clean-mini-btn" style={{ color: 'var(--accent)', fontWeight: '600' }} onClick={() => setShowAddDocModal(true)}>
                  + Anexar
                </button>
                {clienteVinculado && (
                  <button className="cj-clean-mini-btn" style={{ color: 'var(--ink-3)', fontWeight: '600' }} onClick={() => { if (onGoToCRM) onGoToCRM(); flash('Abrindo pasta no CRM'); }}>
                    CRM ↗
                  </button>
                )}
              </div>
            </div>
            <div className="cj-clean-card">
              {showAddDocModal && (
                <div style={{ padding: '10px', background: 'var(--surface-2, rgba(0,0,0,0.04))', borderRadius: '8px', border: '1px solid var(--accent)', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--ink)' }}>Anexar Arquivo / Laudo</span>
                    <button onClick={() => setShowAddDocModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)' }}><Icon name="close" size={12}/></button>
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <input type="file" id="file-upload-chat" style={{ display: 'none' }} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={handleFileSelect}/>
                    <label htmlFor="file-upload-chat" style={{ display: 'flex', alignItems: 'center', justifyContent: newDocForm.arquivoNome ? 'space-between' : 'center', gap: '6px', padding: '8px 10px', borderRadius: '6px', border: newDocForm.arquivoNome ? '1px solid var(--accent)' : '1px dashed var(--border-2)', background: newDocForm.arquivoNome ? 'rgba(99, 102, 241, 0.08)' : 'var(--surface-2, rgba(0,0,0,0.02))', cursor: 'pointer', transition: 'all 0.15s ease', color: newDocForm.arquivoNome ? 'var(--accent)' : 'var(--ink-3)', fontSize: '11px', fontWeight: '500' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                        <Icon name={newDocForm.arquivoNome ? 'file-text' : 'upload'} size={14}/>
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{newDocForm.arquivoNome || '📁 Selecionar Arquivo do Computador...'}</span>
                      </div>
                      {newDocForm.arquivoNome && (
                        <span onClick={(e) => { e.preventDefault(); setNewDocForm(prev => ({ ...prev, arquivo: null, arquivoNome: '', arquivoUrl: '' })); }} style={{ fontSize: '10px', color: 'var(--ink-4)', cursor: 'pointer', padding: '2px 4px', borderRadius: '4px' }} title="Remover arquivo">✕</span>
                      )}
                    </label>
                  </div>
                  <input type="text" style={{ fontSize: '11px', padding: '6px', width: '100%', borderRadius: '4px', border: '1px solid var(--border)', marginBottom: '8px' }} placeholder="Título (Ex.: Laudo Dr. Silva ou RG)" value={newDocForm.titulo} onChange={e => setNewDocForm({ ...newDocForm, titulo: e.target.value })}/>
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                    <select style={{ fontSize: '11px', padding: '5px', width: '100%', borderRadius: '4px', border: '1px solid var(--border)' }} value={newDocForm.tipo} onChange={e => setNewDocForm({ ...newDocForm, tipo: e.target.value })}>
                      <option value="laudo">Laudo Médico</option>
                      <option value="documento">Documento Pessoal</option>
                      <option value="peticao">Petição / Requerimento</option>
                      <option value="andamento">Decisão Judicial</option>
                    </select>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--ink)', cursor: 'pointer', marginBottom: '10px', fontWeight: '500' }}>
                    <input type="checkbox" checked={newDocForm.liberado_cliente} onChange={e => setNewDocForm({ ...newDocForm, liberado_cliente: e.target.checked })}/>
                    <span>Liberado para consulta da IA (RAG)</span>
                  </label>
                  <button style={{ fontSize: '11px', padding: '6px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', width: '100%' }} onClick={salvarNovoDocNoCRM}>
                    Salvar no CRM
                  </button>
                </div>
              )}

              {(() => {
                const idBusca = clienteVinculado?.id;
                const docsLead = idBusca ? docsChatList.filter(d => d.clienteId === idBusca) : [];
                return docsLead.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {docsLead.map(doc => (
                      <div key={doc.id} style={{ padding: '8px 10px', background: 'var(--surface-2, rgba(0,0,0,0.02))', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                          <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--ink)', lineHeight: '1.3', wordBreak: 'break-word', flex: 1 }}>{doc.titulo}</div>
                          <button
                            onClick={async () => {
                              const nextVal = !doc.liberado_cliente;
                              setDocsChatList(prev => prev.map(d => d.id === doc.id ? { ...d, liberado_cliente: nextVal } : d));
                              flash(nextVal ? '✓ Visível para a IA informar ao cliente no WhatsApp' : '🔒 Arquivo tornado sigiloso');
                              if (supabase && (!doc.id.startsWith('doc') || doc.id.length > 10)) {
                                try { await supabase.from('documentos_cliente').update({ liberado_cliente: nextVal }).eq('id', doc.id); } catch (e) {}
                              }
                            }}
                            title={doc.liberado_cliente ? 'Ativo no RAG: Clique para tornar sigiloso' : 'Sigiloso: Clique para disponibilizar para a IA'}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: '600', border: 'none', cursor: 'pointer', flexShrink: 0, background: doc.liberado_cliente ? 'rgba(16, 185, 129, 0.12)' : 'rgba(100, 116, 139, 0.12)', color: doc.liberado_cliente ? '#10b981' : 'var(--ink-4)', transition: 'all 0.15s ease' }}
                          >
                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'currentColor' }}/>
                            {doc.liberado_cliente ? 'Visível IA' : 'Sigiloso'}
                          </button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px', color: 'var(--ink-4)' }}>
                          <span style={{ textTransform: 'uppercase', fontWeight: '500' }}>{doc.tipo}</span>
                          <span>{fmtData(doc.data)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="cj-clean-appt empty" style={{ padding: '12px', textAlign: 'center' }}>
                    <div className="cj-appt-body">
                      <div className="cj-appt-title" style={{ color: 'var(--ink-3)', fontWeight: '400', fontSize: '12px', marginBottom: '6px' }}>Nenhum arquivo ou laudo anexado.</div>
                    </div>
                    <button className="cj-clean-mini-btn" style={{ color: 'var(--accent)', fontWeight: '600' }} onClick={() => setShowAddDocModal(true)}>+ Anexar primeiro documento</button>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* ── Seção: DIRETRIZES DA IA (RAG) ── */}
          <div className="cj-clean-sec">
            <div className="cj-clean-sec-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="cj-clean-sec-label" style={{ whiteSpace: 'nowrap' }}>DIRETRIZES DA IA</span>
              <span style={{ fontSize: '10px', fontWeight: '600', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981' }}/> RAG Ativo
              </span>
            </div>
            <textarea
              className="cj-clean-notes"
              rows={4}
              style={{ width: '100%', padding: '9px', fontSize: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--ink)', lineHeight: '1.4', resize: 'vertical' }}
              placeholder={`Instruções para a IA (${aiName}) responder ao lead no WhatsApp (Ex.: A perícia no INSS foi marcada para 24/05 às 14h, orientar a levar os laudos originais)...`}
              value={activeContact?.obsInterna || ''}
              onChange={e => {
                setActiveContact(prev => prev ? { ...prev, obsInterna: e.target.value } : prev);
              }}
              onBlur={async e => {
                if (supabase && clienteVinculado?.id) {
                  try {
                    const isUuid = /^[0-9a-f]{8}-/i.test(clienteVinculado.id);
                    if (isUuid) {
                      await supabase.from('clientes').update({ obs_interna: e.target.value }).eq('id', clienteVinculado.id);
                    }
                  } catch (err) {}
                }
                flash('✓ Diretriz salva e sincronizada com a IA');
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px', padding: '0 2px' }}>
              <span style={{ fontSize: '10px', color: 'var(--ink-4)' }}>Salvo automaticamente ao digitar</span>
            </div>
          </div>
        </aside>
      )}

      {/* ═══ Modal: CONVERTER LEAD → CLIENTE CRM ═══ */}
      {showConvertModal && activeContact && (
        <ModalConversaoCRM
          contato={activeContact}
          onClose={() => setShowConvertModal(false)}
          onConfirm={converterEAdicionarAoCRM}
        />
      )}

      {toast && <div className="cj-toast"><Icon name="check" size={14}/> {toast}</div>}
    </div>
  );
};

// ─── Subcomponentes internos ────────────────────────────────────────────────

function FormEdicaoLead({ contato, onCancel, onSave }) {
  const [form, setForm] = useState({
    nome: contato.nome || '',
    tel: contato.tel || '',
    email: contato.email || '',
    cpf: contato.cpf || '',
    advogado: contato.advogado || 'a1',
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="cj-fields-edit">
      <div className="cj-field"><label>Nome completo</label><input type="text" value={form.nome} onChange={e => set('nome', e.target.value)}/></div>
      <div className="cj-field"><label>Telefone / WhatsApp</label><input type="text" value={form.tel} onChange={e => set('tel', e.target.value)}/></div>
      <div className="cj-field"><label>E-mail</label><input type="email" placeholder="cliente@email.com" value={form.email} onChange={e => set('email', e.target.value)}/></div>
      <div className="cj-field"><label>CPF / CNPJ</label><input type="text" placeholder="000.000.000-00" value={form.cpf} onChange={e => set('cpf', e.target.value)}/></div>
      <div className="cj-field"><label>Advogado preferencial</label>
        <select value={form.advogado} onChange={e => set('advogado', e.target.value)}>
          {escritorio.advogados.map(a => (<option key={a.id} value={a.id}>{a.nome}</option>))}
        </select>
      </div>
      <div className="cj-field-actions">
        <button className="cj-btn ghost sm" onClick={onCancel}>Cancelar</button>
        <button className="cj-btn sm" onClick={() => onSave(form)}>Salvar alterações</button>
      </div>
    </div>
  );
}

function ModalConversaoCRM({ contato, onClose, onConfirm }) {
  const [form, setForm] = useState({
    nome: contato.nome || '',
    tipo: 'PF',
    cpf: contato.cpf || '',
    email: contato.email || '',
    area: 'Previdenciário',
    advogado: contato.advogado || 'a1',
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="cj-modal-bg" onClick={onClose}>
      <div className="cj-modal" onClick={e => e.stopPropagation()}>
        <header className="cj-modal-head">
          <div>
            <div className="cj-modal-eyebrow">integração crm · novo cliente</div>
            <h2>Adicionar aos Clientes (CRM)</h2>
          </div>
          <button className="cj-modal-x" onClick={onClose}><Icon name="x" size={16}/></button>
        </header>
        <div className="cj-modal-body">
          <p className="cj-card-p">Confirme os dados e a área jurídica para cadastrar <b>{contato.nome}</b> diretamente na aba Clientes.</p>
          <div className="cj-field"><label>Tipo de Pessoa</label>
            <div className="cj-seg">
              <button className={form.tipo === 'PF' ? 'active' : ''} onClick={() => set('tipo', 'PF')}>Pessoa Física (PF)</button>
              <button className={form.tipo === 'PJ' ? 'active' : ''} onClick={() => set('tipo', 'PJ')}>Pessoa Jurídica (PJ)</button>
            </div>
          </div>
          <div className="cj-field"><label>Nome do Cliente / Razão Social</label><input type="text" value={form.nome} onChange={e => set('nome', e.target.value)}/></div>
          <div className="cj-field-row">
            <div className="cj-field"><label>{form.tipo === 'PF' ? 'CPF' : 'CNPJ'}</label><input type="text" placeholder={form.tipo === 'PF' ? '000.000.000-00' : '00.000.000/0001-00'} value={form.cpf} onChange={e => set('cpf', e.target.value)}/></div>
            <div className="cj-field"><label>E-mail</label><input type="email" placeholder="contato@email.com" value={form.email} onChange={e => set('email', e.target.value)}/></div>
          </div>
          <div className="cj-field-row">
            <div className="cj-field"><label>Área do Caso</label>
              <select value={form.area} onChange={e => set('area', e.target.value)}>
                <option value="Previdenciário">Previdenciário (INSS)</option>
                <option value="BPC-LOAS">BPC-LOAS (Assistencial)</option>
                <option value="Auxílio Doença">Auxílio Doença / Incapacidade</option>
                <option value="Aposentadoria">Aposentadorias & Revisões</option>
                <option value="Pensão por Morte">Pensão por Morte / Maternidade</option>
                <option value="Recurso / Revisão">Recurso / Revisão INSS</option>
              </select>
            </div>
            <div className="cj-field"><label>Advogado Responsável</label>
              <select value={form.advogado} onChange={e => set('advogado', e.target.value)}>
                {escritorio.advogados.map(a => (<option key={a.id} value={a.id}>{a.nome} ({a.area})</option>))}
              </select>
            </div>
          </div>
        </div>
        <footer className="cj-modal-foot">
          <span/>
          <div className="cj-modal-foot-right">
            <button className="cj-btn ghost" onClick={onClose}>Cancelar</button>
            <button className="cj-btn accent" onClick={() => onConfirm(form)}>
              <Icon name="check" size={14}/> Confirmar e Cadastrar no CRM
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default Chat;

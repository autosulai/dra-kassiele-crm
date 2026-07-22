import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';
import { casos as casosInitial, clientes as clientesInitial, resumo, corAdv, nomeAdv, fmtData, escritorio } from '../data/mockData';
import { supabase } from '../lib/supabase';

export const Processos = ({ casosList = casosInitial, clientesList = clientesInitial, onUpdateCasos }) => {
  const [listaProcessos, setListaProcessos] = useState(casosList);
  const [q, setQ] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProc, setEditingProc] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    setListaProcessos(casosList);
  }, [casosList]);

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const busca = q.trim().toLowerCase();
  const lista = listaProcessos.filter(p => {
    if (!p) return false;
    const cli = clientesList.find(c => c && (c.id === p.clienteId || c.id === p.leadId || p.cliente_id === c.id));
    // Exclui e limpa processos orfãos que não possuem cliente vinculado no CRM
    if (!cli) return false;

    if (!busca) return true;
    return (p.titulo && p.titulo.toLowerCase().includes(busca)) || 
           (p.numero && p.numero.toLowerCase().includes(busca)) || 
           (p.area && p.area.toLowerCase().includes(busca)) ||
           (cli && cli.nome && cli.nome.toLowerCase().includes(busca));
  });

  const handleOpenNew = () => {
    setEditingProc({
      id: 'p_' + Date.now(),
      titulo: '',
      numero: '',
      clienteId: clientesList[0]?.id || 'c1',
      area: 'Previdenciário',
      fase: 'Triagem & Qualificação',
      status: 'ativo',
      advogado: escritorio.advogados[0]?.id || 'a1',
      proximoPrazo: '',
      notas: '',
      isNew: true
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (proc) => {
    setEditingProc({ ...proc, isNew: false });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editingProc.titulo.trim()) {
      flash('Por favor, informe o título do processo');
      return;
    }

    let novos;
    const item = { ...editingProc, isNew: undefined };
    if (editingProc.isNew) {
      novos = [item, ...listaProcessos];
      flash(`Processo "${item.titulo}" cadastrado com sucesso!`);
    } else {
      novos = listaProcessos.map(p => p.id === item.id ? item : p);
      flash(`Processo "${item.titulo}" atualizado!`);
    }
    setListaProcessos(novos);
    if (onUpdateCasos) onUpdateCasos(novos);
    setModalOpen(false);

    if (supabase) {
      try {
        const payload = {
          id: (!item.id.startsWith('p_') && item.id.length > 10) ? item.id : undefined,
          escritorio_id: undefined,
          cliente_id: item.clienteId || null,
          titulo: item.titulo,
          numero_cnj: item.numero || '—',
          area: item.area || 'Previdenciário',
          fase: item.fase || 'Triagem & Qualificação',
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

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir ou arquivar este processo?')) {
      const novos = listaProcessos.filter(p => p.id !== id);
      setListaProcessos(novos);
      if (onUpdateCasos) onUpdateCasos(novos);
      setModalOpen(false);
      flash('Processo removido da lista ativa');

      if (supabase && (!id.startsWith('p_') || id.length > 10)) {
        try {
          await supabase.from('processos').delete().eq('id', id);
        } catch (err) {
          console.error('Erro ao excluir processo no Supabase:', err);
        }
      }
    }
  };

  return (
    <div className="cj-proc">
      <header className="cj-head">
        <div>
          <h1>Processos</h1>
          <p className="cj-sub">{listaProcessos.length} processos ativos · {resumo.prazosSemana} prazos esta semana</p>
        </div>
        <div className="cj-head-actions">
          <div className="cj-search">
            <Icon name="search" size={14}/>
            <input placeholder="Buscar processo, número, cliente…" value={q} onChange={e => setQ(e.target.value)}/>
          </div>
          <button className="cj-btn" onClick={handleOpenNew}>
            <Icon name="plus" size={14}/> Novo processo
          </button>
        </div>
      </header>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: 'var(--ink)', color: 'var(--bg)', padding: '10px 18px', borderRadius: 'var(--r-sm)', fontSize: 13, fontWeight: 600, zIndex: 1000, boxShadow: 'var(--shadow-lg)' }}>
          ✓ {toast}
        </div>
      )}

      <div className="cj-proc-table">
        <div className="cj-proc-th" style={{ gridTemplateColumns: 'minmax(240px,2fr) minmax(150px,1.4fr) 1fr 1fr 1.2fr 1.1fr 40px' }}>
          <div>Processo</div><div>Cliente</div><div>Área</div><div>Fase</div><div>Responsável</div><div>Próximo prazo</div><div/>
        </div>
        {lista.map(p => {
          const cli = clientesList.find(c => c && (c.id === p.clienteId || c.id === p.leadId || p.cliente_id === c.id));
          return (
            <div key={p.id} className="cj-proc-tr" onClick={() => handleOpenEdit(p)} style={{ cursor: 'pointer', gridTemplateColumns: 'minmax(240px,2fr) minmax(150px,1.4fr) 1fr 1fr 1.2fr 1.1fr 40px' }} title="Clique para abrir e editar processo">
              <div className="cj-proc-td-main">
                <div className="cj-proc-titulo">{p.titulo}</div>
                <div className="cj-proc-num">{p.numero || 'Em distribuição'}</div>
              </div>
              <div style={{ fontWeight: 500 }}>{cli?.nome || '—'}</div>
              <div><span className="cj-area-tag">{p.area}</span></div>
              <div><span className="cj-proc-fase">{p.fase}</span></div>
              <div className="cj-proc-resp">
                <span className={`cj-dot cor-${corAdv(p.advogado)}`}/> 
                {nomeAdv(p.advogado).replace(/Dra?\.\s/, '')}
              </div>
              <div>
                {p.proximoPrazo ? (
                  <span className="cj-proc-prazo"><Icon name="clock" size={11}/> {fmtData(p.proximoPrazo)}</span>
                ) : (
                  <span className="cj-muted">—</span>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <button className="cj-btn ghost icon" onClick={(e) => { e.stopPropagation(); handleOpenEdit(p); }} title="Editar processo">
                  <Icon name="pencil" size={13}/>
                </button>
              </div>
            </div>
          );
        })}
        {lista.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
            Nenhum processo encontrado. <button onClick={handleOpenNew} style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'underline' }}>Cadastrar novo processo</button>
          </div>
        )}
      </div>

      {/* Modal de Criação / Edição de Processo */}
      {modalOpen && editingProc && (
        <div className="cj-modal-bg" onClick={() => setModalOpen(false)}>
          <div className="cj-modal" onClick={e => e.stopPropagation()} style={{ width: 'min(620px, 96vw)' }}>
            <div className="cj-modal-head">
              <div>
                <div className="cj-modal-eyebrow">{editingProc.isNew ? 'Novo Cadastro' : 'Edição de Processo'}</div>
                <h2>{editingProc.isNew ? 'Adicionar Novo Processo' : editingProc.titulo}</h2>
              </div>
              <button className="cj-modal-x" onClick={() => setModalOpen(false)}><Icon name="x" size={16}/></button>
            </div>

            <form onSubmit={handleSave} className="cj-modal-body">
              <div className="cj-field">
                <label>Título do Processo / Ação</label>
                <input 
                  required
                  placeholder="Ex: Concessão BPC-LOAS — Espectro Autista ou Auxílio Doença Ortopédico"
                  value={editingProc.titulo}
                  onChange={e => setEditingProc({ ...editingProc, titulo: e.target.value })}
                />
              </div>

              <div className="cj-field-row" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
                <div className="cj-field">
                  <label>Número do Processo (CNJ)</label>
                  <input 
                    placeholder="Ex: 5001234-56.2026.8.21.0001"
                    value={editingProc.numero}
                    onChange={e => setEditingProc({ ...editingProc, numero: e.target.value })}
                  />
                </div>
                <div className="cj-field">
                  <label>Cliente Vinculado</label>
                  <select 
                    value={editingProc.clienteId}
                    onChange={e => setEditingProc({ ...editingProc, clienteId: e.target.value })}
                  >
                    {clientesList.map(c => (
                      <option key={c.id} value={c.id}>{c.nome} ({c.tipo || 'PF'})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="cj-field-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                <div className="cj-field">
                  <label>Área Jurídica</label>
                  <select 
                    value={editingProc.area}
                    onChange={e => setEditingProc({ ...editingProc, area: e.target.value })}
                  >
                    <option value="Previdenciário">Previdenciário (Geral)</option>
                    <option value="BPC-LOAS">BPC-LOAS (Assistencial)</option>
                    <option value="Auxílio Doença">Auxílio Doença / Incapacidade</option>
                    <option value="Aposentadoria">Aposentadorias & Revisões</option>
                    <option value="Pensão por Morte">Pensão por Morte / Maternidade</option>
                    <option value="Recurso / Revisão">Recurso / Revisão INSS</option>
                  </select>
                </div>

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
                <div className="cj-adv-select">
                  {escritorio.advogados.map(a => (
                    <button
                      key={a.id}
                      type="button"
                      className={`cj-adv-opt ${editingProc.advogado === a.id ? 'active' : ''}`}
                      onClick={() => setEditingProc({ ...editingProc, advogado: a.id })}
                    >
                      <span className={`cj-dot cor-${a.cor}`}/> {a.nome} ({a.area})
                    </button>
                  ))}
                </div>
              </div>

              <div className="cj-field">
                <label>Notas Estratégicas / Resumo do Caso</label>
                <textarea 
                  placeholder="Informações internas sobre andamento, teses jurídicas ou contatos com o juízo..."
                  value={editingProc.notas || ''}
                  onChange={e => setEditingProc({ ...editingProc, notas: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="cj-modal-foot" style={{ marginTop: 8, marginHorizontal: -24, marginBottom: -18 }}>
                <div>
                  {!editingProc.isNew && (
                    <button type="button" className="cj-btn ghost danger" onClick={() => handleDelete(editingProc.id)}>
                      <Icon name="trash" size={13}/> Excluir processo
                    </button>
                  )}
                </div>
                <div className="cj-modal-foot-right">
                  <button type="button" className="cj-btn ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
                  <button type="submit" className="cj-btn">
                    <Icon name="check" size={14}/> {editingProc.isNew ? 'Cadastrar Processo' : 'Salvar Alterações'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Processos;

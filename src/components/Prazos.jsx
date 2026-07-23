import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Icon } from './Icon';
import { loadEventos, loadTiposEvento, salvarEvento, atualizarStatusEvento } from '../lib/funilService';

/**
 * Prazos & Perícias
 *
 * Substitui a antiga Agenda. A diferença conceitual importa: aqui NINGUÉM
 * agenda nada. As datas são determinadas pelo INSS ou pelo juízo e apenas
 * registradas pela equipe. O valor da tela é não deixar passar — perder uma
 * perícia significa benefício negado.
 */

const MS_DIA = 86400000;

const fmtDataHora = (iso) => {
  const d = new Date(iso);
  return {
    data: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }),
    hora: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    diaSemana: d.toLocaleDateString('pt-BR', { weekday: 'long' }),
    dia: d.getDate(),
    mes: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
  };
};

const diasAte = (iso) => Math.ceil((new Date(iso) - new Date()) / MS_DIA);

const agrupar = (eventos) => {
  const grupos = { atrasado: [], hoje: [], semana: [], proximos: [], concluidos: [] };
  eventos.forEach(ev => {
    if (ev.status !== 'agendado') { grupos.concluidos.push(ev); return; }
    const d = diasAte(ev.data_hora);
    if (d < 0) grupos.atrasado.push(ev);
    else if (d === 0) grupos.hoje.push(ev);
    else if (d <= 7) grupos.semana.push(ev);
    else grupos.proximos.push(ev);
  });
  return grupos;
};

const SECOES = [
  { chave: 'atrasado',   titulo: 'Vencidos sem baixa', tom: 'perigo',
    ajuda: 'A data já passou e ninguém marcou o que aconteceu. Confirme antes de qualquer outra coisa.' },
  { chave: 'hoje',       titulo: 'Hoje', tom: 'urgente', ajuda: null },
  { chave: 'semana',     titulo: 'Próximos 7 dias', tom: 'atencao', ajuda: null },
  { chave: 'proximos',   titulo: 'Mais adiante', tom: 'normal', ajuda: null },
  { chave: 'concluidos', titulo: 'Já resolvidos', tom: 'normal', ajuda: null },
];

// ---------------------------------------------------------------------------

export const Prazos = ({ clientesList = [], casosList = [], advogados = [], targetClient, autoOpenNew, onAutoOpenEnd }) => {
  const [eventos, setEventos] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [abaPer, setAbaPer] = useState('todos');
  const [editor, setEditor] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (autoOpenNew) {
      setEditor({});
      if (onAutoOpenEnd) onAutoOpenEnd();
    }
  }, [autoOpenNew, onAutoOpenEnd]);

  useEffect(() => {
    if (targetClient && targetClient.id) {
      setEditor({ cliente_id: targetClient.id, tipo: 'pericia_médica' });
    }
  }, [targetClient]);

  const recarregar = useCallback(async () => {
    const [evs, tps] = await Promise.all([loadEventos(), loadTiposEvento()]);
    setEventos(evs);
    setTipos(tps);
    setCarregando(false);
  }, []);

  useEffect(() => { recarregar(); }, [recarregar]);

  const clientesMap = useMemo(() => {
    const m = {};
    clientesList.forEach(c => { m[c.id] = c; });
    return m;
  }, [clientesList]);

  const casosMap = useMemo(() => {
    const m = {};
    casosList.forEach(p => { m[p.id] = p; });
    return m;
  }, [casosList]);

  const advogadosMap = useMemo(() => {
    const m = {};
    advogados.forEach(a => { m[a.id] = a; });
    return m;
  }, [advogados]);

  const filtrados = useMemo(
    () => filtroTipo === 'todos' ? eventos : eventos.filter(e => e.tipo_slug === filtroTipo),
    [eventos, filtroTipo]
  );

  const grupos = useMemo(() => agrupar(filtrados), [filtrados]);

  const totais = useMemo(() => ({
    atrasados: grupos.atrasado.length,
    semana: grupos.hoje.length + grupos.semana.length,
    presenciais: [...grupos.hoje, ...grupos.semana].filter(e => e.exige_presenca).length,
  }), [grupos]);

  const mudarStatus = async (ev, status) => {
    setEventos(prev => prev.map(e => e.id === ev.id ? { ...e, status } : e));
    await atualizarStatusEvento(ev.id, status);
  };

  const gravar = async (dados) => {
    setEditor(null);
    await salvarEvento(dados);
    recarregar();
  };

  if (carregando) return <div className="cj-fn-vazio">Carregando prazos e perícias…</div>;

  const secoesFiltradas = SECOES.filter(sec => {
    if (abaPer === 'todos') return true;
    if (abaPer === 'hoje') return sec.chave === 'atrasado' || sec.chave === 'hoje';
    if (abaPer === 'semana') return sec.chave === 'semana';
    if (abaPer === 'proximos') return sec.chave === 'proximos';
    if (abaPer === 'concluidos') return sec.chave === 'concluidos';
    return true;
  });

  return (
    <div className="cj-pz">
      <header className="cj-fn-head">
        <div>
          <h1 className="cj-fn-title"><Icon name="calendar" size={20}/> Prazos & Perícias</h1>
          <p className="cj-fn-sub">
            Datas determinadas pelo INSS e pelo juízo. Faltar em perícia significa benefício negado.
          </p>
        </div>
        <div className="cj-fn-tools">
          <select
            className="cj-pz-select"
            value={filtroTipo}
            onChange={e => setFiltroTipo(e.target.value)}
          >
            <option value="todos">Todos os tipos</option>
            {tipos.map(t => <option key={t.slug || t.id} value={t.slug}>{t.nome}</option>)}
          </select>
          <button className="cj-fn-btn-primario" onClick={() => setEditor({})}>
            <Icon name="plus" size={14}/> Registrar prazo
          </button>
        </div>
      </header>

      <div className="cj-pz-periodos-bar">
        <button className={abaPer === 'todos' ? 'ativo' : ''} onClick={() => setAbaPer('todos')}>
          <Icon name="calendar" size={13}/> Todos <span className="cj-badge-num">{filtrados.length}</span>
        </button>
        <button className={abaPer === 'hoje' ? 'ativo' : ''} onClick={() => setAbaPer('hoje')}>
          Do dia / Urgente <span className="cj-badge-num">{grupos.atrasado.length + grupos.hoje.length}</span>
        </button>
        <button className={abaPer === 'semana' ? 'ativo' : ''} onClick={() => setAbaPer('semana')}>
          Próximos 7 dias <span className="cj-badge-num">{grupos.semana.length}</span>
        </button>
        <button className={abaPer === 'proximos' ? 'ativo' : ''} onClick={() => setAbaPer('proximos')}>
          Mais adiante <span className="cj-badge-num">{grupos.proximos.length}</span>
        </button>
        <button className={abaPer === 'concluidos' ? 'ativo' : ''} onClick={() => setAbaPer('concluidos')}>
          Já resolvidos <span className="cj-badge-num">{grupos.concluidos.length}</span>
        </button>
      </div>

      <div className="cj-pz-kpis">
        <div className={`cj-pz-kpi ${totais.atrasados > 0 ? 'perigo' : ''}`}>
          <b>{totais.atrasados}</b><span>vencidos sem baixa</span>
        </div>
        <div className="cj-pz-kpi">
          <b>{totais.semana}</b><span>nos próximos 7 dias</span>
        </div>
        <div className="cj-pz-kpi">
          <b>{totais.presenciais}</b><span>exigem presença do cliente</span>
        </div>
      </div>

      <div className="cj-pz-lista">
        {secoesFiltradas.map(sec => {
          const itens = grupos[sec.chave];
          if (!itens || itens.length === 0) return null;
          return (
            <section key={sec.chave} className={`cj-pz-sec tom-${sec.tom}`}>
              <div className="cj-pz-sec-head">
                <h2>{sec.titulo}</h2>
                <span>{itens.length}</span>
              </div>
              {sec.ajuda && <p className="cj-pz-sec-ajuda">{sec.ajuda}</p>}
              <div className="cj-pz-itens">
                {itens.map(ev => (
                  <CardEvento
                    key={ev.id}
                    evento={ev}
                    clientesMap={clientesMap}
                    casosMap={casosMap}
                    advogadosMap={advogadosMap}
                    onCumprido={() => mudarStatus(ev, 'cumprido')}
                    onPerdido={() => mudarStatus(ev, 'perdido')}
                    onEditar={() => setEditor(ev)}
                  />
                ))}
              </div>
            </section>
          );
        })}

        {filtrados.length === 0 && (
          <div className="cj-fn-vazio">Nenhum prazo registrado ainda. Clique no botão acima para cadastrar.</div>
        )}
      </div>

      {editor && (
        <EditorPrazo
          evento={editor}
          tipos={tipos}
          clientesList={clientesList}
          casosList={casosList}
          advogados={advogados}
          onFechar={() => setEditor(null)}
          onSalvar={gravar}
        />
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------

const CardEvento = ({ evento, clientesMap = {}, casosMap = {}, advogadosMap = {}, onCumprido, onPerdido, onEditar }) => {
  const f = fmtDataHora(evento.data_hora);
  const d = diasAte(evento.data_hora);
  const aberto = evento.status === 'agendado';

  const cli = clientesMap[evento.cliente_id];
  const pNome = evento.pessoa_nome || cli?.nome || evento.titulo;

  const proc = casosMap[evento.processo_id];
  const pProtocolo = evento.protocolo_inss || proc?.numero || proc?.protocolo_inss || evento.numero_cnj || '';
  const pBeneficio = evento.beneficio || proc?.titulo || '';
  const adv = advogadosMap[evento.advogado_id];

  return (
    <article className={`cj-pz-card cor-${evento.tipo_cor || 'slate'} ${aberto ? '' : 'fechado'}`}>
      <div className="cj-pz-card-data">
        <b>{f.dia}</b>
        <span>{f.mes}</span>
      </div>

      <div className="cj-pz-card-corpo">
        <div className="cj-pz-card-linha1">
          <span className="cj-pz-card-tipo"><span className="cj-dot"/> {evento.tipo_nome || 'Prazo / Perícia'}</span>
          {pBeneficio && (
            <span style={{ fontSize: '10px', fontWeight: 600, padding: '1px 7px', background: 'var(--bg-3)', color: 'var(--ink-2)', borderRadius: '6px' }}>
              {pBeneficio.replace('_', '-')}
            </span>
          )}
          {evento.exige_presenca && aberto && (
            <span className="cj-pz-card-presenca">presença obrigatória</span>
          )}
          {evento.status === 'cumprido' && <span className="cj-pz-card-ok">cumprido</span>}
          {evento.status === 'perdido' && <span className="cj-pz-card-perdido">perdido</span>}
        </div>

        <h3>{pNome}</h3>
        {(evento.titulo && evento.titulo !== pNome && !evento.titulo.includes(pNome) && !evento.titulo.includes(evento.tipo_nome)) && (
          <div style={{ fontSize: '12px', color: 'var(--ink-2)', fontWeight: 500, marginTop: '2px' }}>{evento.titulo}</div>
        )}

        <div className="cj-pz-card-meta">
          <span><Icon name="clock" size={12}/> {f.diaSemana}, {f.hora} {evento.duracao_min ? `(${evento.duracao_min}m)` : ''}</span>
          {evento.local_detalhe && <span><Icon name="doc" size={12}/> {evento.local_detalhe}</span>}
          {pProtocolo && pProtocolo !== '—' && <span>protocolo {pProtocolo}</span>}
          {adv && <span><Icon name="user" size={12}/> {adv.nome}</span>}
        </div>

        {aberto && (
          <div className="cj-pz-card-lembrete">
            {evento.lembrete_enviado
              ? <><Icon name="check" size={12}/> Cliente já avisado no WhatsApp</>
              : <><Icon name="bell" size={12}/> Lembrete automático pendente no WhatsApp</>}
          </div>
        )}
      </div>

      <div className="cj-pz-card-acoes">
        {aberto && d < 1 && (
          <>
            <button className="ok" onClick={onCumprido}>Compareceu</button>
            <button className="perigo" onClick={onPerdido}>Faltou</button>
          </>
        )}
        <button onClick={onEditar} title="Editar Prazo/Perícia"><Icon name="pencil" size={13}/></button>
      </div>
    </article>
  );
};

// ---------------------------------------------------------------------------

const SelectBuscaInteligente = ({
  opcoes = [],
  valorSelecionado,
  onSelecionar,
  placeholder = "-- Selecione ou busque --",
  labelRecentes = "🕒 ÚLTIMOS 5 RECENTES",
  labelBusca = "🔍 Digite para pesquisar...",
  msgVazio = "Nenhum resultado encontrado."
}) => {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const containerRef = useRef(null);
  const inputBuscaRef = useRef(null);

  useEffect(() => {
    const handleClickFora = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setAberto(false);
      }
    };
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, []);

  useEffect(() => {
    if (aberto && inputBuscaRef.current) {
      inputBuscaRef.current.focus();
    }
  }, [aberto]);

  const recentes = useMemo(() => {
    return [...opcoes].reverse().slice(0, 5);
  }, [opcoes]);

  const filtrados = useMemo(() => {
    if (!busca.trim()) return [];
    const q = busca.toLowerCase();
    return opcoes.filter(item =>
      item.titulo.toLowerCase().includes(q) ||
      (item.subtitulo && item.subtitulo.toLowerCase().includes(q))
    ).slice(0, 30);
  }, [busca, opcoes]);

  const itemAtual = opcoes.find(o => o.id === valorSelecionado);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', minWidth: 0 }}>
      <div
        onClick={() => { setAberto(!aberto); if (!aberto) setBusca(''); }}
        style={{
          padding: '9px 12px',
          border: aberto ? '1px solid var(--primary)' : '1px solid var(--border)',
          borderRadius: 'var(--r-sm)',
          fontSize: '13.5px',
          background: 'var(--surface)',
          color: itemAtual ? 'var(--ink)' : 'var(--ink-4)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          userSelect: 'none',
          boxShadow: aberto ? '0 0 0 2px var(--primary-2)' : 'none'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {itemAtual ? (
            <>
              <b>{itemAtual.titulo}</b> {itemAtual.subtitulo && <span style={{ color: 'var(--ink-3)', fontSize: '12px', fontWeight: 400 }}>({itemAtual.subtitulo})</span>}
            </>
          ) : (
            placeholder
          )}
        </span>
        <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>{aberto ? '▲' : '▼'}</span>
      </div>

      {aberto && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 9999,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-sm)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            maxHeight: '320px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          <div style={{ padding: '8px', borderBottom: '1px solid var(--border)', background: 'var(--bg-alt)' }}>
            <input
              ref={inputBuscaRef}
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder={labelBusca}
              style={{
                width: '100%',
                padding: '7px 10px',
                fontSize: '13px',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                background: 'var(--surface)',
                outline: 'none',
                color: 'var(--ink)'
              }}
            />
          </div>

          <div style={{ overflowY: 'auto', flex: 1, padding: '4px 0' }}>
            <div
              onClick={() => { onSelecionar(''); setAberto(false); setBusca(''); }}
              style={{
                padding: '8px 12px',
                fontSize: '13px',
                color: 'var(--ink-3)',
                cursor: 'pointer',
                borderBottom: '1px solid var(--border-light)',
                fontWeight: 500
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-alt)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              -- Nenhum ou Avulso --
            </div>

            {!busca.trim() && (
              <>
                {recentes.length === 0 ? (
                  <div style={{ padding: '8px 12px', fontSize: '12.5px', color: 'var(--ink-4)' }}>Nenhum item cadastrado ainda.</div>
                ) : (
                  recentes.map(item => (
                    <div
                      key={item.id}
                      onClick={() => { onSelecionar(item.id); setAberto(false); setBusca(''); }}
                      style={{
                        padding: '8px 12px',
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: item.id === valorSelecionado ? 'var(--primary-2)' : 'transparent',
                        color: item.id === valorSelecionado ? 'var(--primary)' : 'var(--ink)'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = item.id === valorSelecionado ? 'var(--primary-2)' : 'var(--bg-alt)'}
                      onMouseLeave={e => e.currentTarget.style.background = item.id === valorSelecionado ? 'var(--primary-2)' : 'transparent'}
                    >
                      <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.titulo}</span>
                      {item.subtitulo && <span style={{ fontSize: '11.5px', color: 'var(--ink-3)', flexShrink: 0, marginLeft: 6 }}>{item.subtitulo}</span>}
                    </div>
                  ))
                )}
              </>
            )}

            {busca.trim() && (
              <>
                <div style={{ padding: '7px 12px 4px', fontSize: '11px', fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '0.04em' }}>
                  RESULTADOS DA PESQUISA ({filtrados.length}):
                </div>
                {filtrados.length === 0 ? (
                  <div style={{ padding: '12px', fontSize: '13px', color: 'var(--ink-4)', textAlign: 'center' }}>
                    {msgVazio}
                  </div>
                ) : (
                  filtrados.map(item => (
                    <div
                      key={item.id}
                      onClick={() => { onSelecionar(item.id); setAberto(false); setBusca(''); }}
                      style={{
                        padding: '8px 12px',
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: item.id === valorSelecionado ? 'var(--primary-2)' : 'transparent',
                        color: item.id === valorSelecionado ? 'var(--primary)' : 'var(--ink)'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = item.id === valorSelecionado ? 'var(--primary-2)' : 'var(--bg-alt)'}
                      onMouseLeave={e => e.currentTarget.style.background = item.id === valorSelecionado ? 'var(--primary-2)' : 'transparent'}
                    >
                      <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.titulo}</span>
                      {item.subtitulo && <span style={{ fontSize: '11.5px', color: 'var(--ink-3)', flexShrink: 0, marginLeft: 6 }}>{item.subtitulo}</span>}
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const AjudaDica = ({ que, porque }) => (
  <span
    className="cj-ajuda-dica"
    title={`📌 O QUE PREENCHER / PARA QUE SERVE:\n${que}\n\n💡 POR QUE PREENCHER (IMPACTO NO SISTEMA):\n${porque}`}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 15,
      height: 15,
      borderRadius: '50%',
      background: 'var(--primary-2)',
      color: 'var(--primary)',
      fontSize: 10.5,
      fontWeight: 700,
      cursor: 'help',
      marginLeft: 5,
      verticalAlign: 'middle',
      border: '1px solid var(--primary)',
      boxShadow: '0 1px 2px rgba(0,0,0,0.06)'
    }}
  >
    ?
  </span>
);

const EditorPrazo = ({ evento, tipos, clientesList = [], casosList = [], advogados = [], onFechar, onSalvar }) => {
  const inicial = evento.data_hora ? new Date(evento.data_hora) : new Date();
  const tipoDefault = tipos.find(t => t.id === evento.tipo_id) || tipos[0] || {};

  const [form, setForm] = useState({
    id: evento.id,
    tipo_id: evento.tipo_id || tipoDefault.id || '',
    cliente_id: evento.cliente_id || '',
    processo_id: evento.processo_id || '',
    advogado_id: evento.advogado_id || advogados[0]?.id || '',
    pessoa_nome: evento.pessoa_nome || '',
    pessoa_telefone: evento.pessoa_telefone || '',
    protocolo_inss: evento.protocolo_inss || evento.numero_cnj || '',
    beneficio: evento.beneficio || '',
    titulo: evento.titulo || '',
    data: inicial.toISOString().slice(0, 10),
    hora: inicial.toTimeString().slice(0, 5),
    duracao_min: evento.duracao_min || 60,
    local_tipo: evento.local_tipo || 'Agência INSS',
    local_detalhe: evento.local_detalhe || '',
    obs: evento.obs || '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const casosDisponiveis = useMemo(() => {
    if (!form.cliente_id) return casosList;
    return casosList.filter(p => p.clienteId === form.cliente_id || p.cliente_id === form.cliente_id);
  }, [form.cliente_id, casosList]);

  const handleSelectCliente = (cliId) => {
    if (!cliId) {
      setForm(f => ({ ...f, cliente_id: '', pessoa_nome: '', pessoa_telefone: '', processo_id: '', protocolo_inss: '' }));
      return;
    }
    const cli = clientesList.find(c => c.id === cliId);
    if (!cli) return;

    const caso = casosList.find(p => p.clienteId === cliId || p.cliente_id === cliId);
    const prot = caso ? (caso.numero !== '—' ? caso.numero : '') : '';
    const ben = caso ? caso.titulo : '';

    const tipoObj = tipos.find(t => t.id === form.tipo_id) || tipoDefault;
    const novoTitulo = `${tipoObj.nome || 'Prazo'} — ${cli.nome}`;

    setForm(f => ({
      ...f,
      cliente_id: cliId,
      pessoa_nome: cli.nome,
      pessoa_telefone: cli.tel || cli.telefone || '',
      processo_id: caso ? caso.id : '',
      protocolo_inss: prot || f.protocolo_inss,
      beneficio: ben || f.beneficio,
      titulo: (!f.titulo || f.titulo.includes('—') || f.titulo.includes('Perícia') || f.titulo.includes('Prazo')) ? novoTitulo : f.titulo,
    }));
  };

  const handleSelectTipo = (tId) => {
    const tObj = tipos.find(t => t.id === tId);
    set('tipo_id', tId);
    if (tObj && form.pessoa_nome && (!form.titulo || form.titulo.includes('—'))) {
      set('titulo', `${tObj.nome} — ${form.pessoa_nome}`);
    }
  };

  const submeter = (e) => {
    e.preventDefault();
    onSalvar({
      ...form,
      duracao_min: Number(form.duracao_min) || 60,
      data_hora: new Date(`${form.data}T${form.hora}:00`).toISOString(),
    });
  };

  return (
    <div className="cj-fn-modal-bg" onClick={onFechar}>
      <form className="cj-fn-modal extra-largo" onClick={e => e.stopPropagation()} onSubmit={submeter} style={{ width: '660px', maxWidth: '94vw', maxHeight: '88vh', overflowY: 'auto', overflowX: 'hidden' }}>
        <h3 style={{ fontSize: 17, color: 'var(--ink-1)' }}>
          {evento.id ? 'Editar Prazo & Perícia' : 'Registrar Novo Prazo ou Perícia'}
        </h3>
        <p className="cj-fn-modal-sub" style={{ marginBottom: 4 }}>
          Vincule o cliente e o processo para ativar o agendamento no histórico e o lembrete automático no WhatsApp.
        </p>

        <div className="cj-fn-modal-divisao">1. Vínculo do Cliente & Processo</div>

        <div className="cj-fn-modal-linha">
          <label>
            <span>Cliente / Segurado no CRM <AjudaDica que="Selecione o cliente já salvo no seu banco do CRM ou de Leads." porque="Conecta este compromisso à ficha do cliente e ativa o envio automático de lembretes no WhatsApp dele."/></span>
            <SelectBuscaInteligente
              opcoes={clientesList.map(c => ({
                id: c.id,
                titulo: c.nome,
                subtitulo: c.doc || c.tel || c.telefone || 'Segurado'
              }))}
              valorSelecionado={form.cliente_id}
              onSelecionar={handleSelectCliente}
              placeholder="-- Selecione ou busque um cliente --"
              labelRecentes="🕒 ÚLTIMOS 5 CLIENTES ADICIONADOS NO CRM:"
              labelBusca="🔍 Buscar cliente por nome, CPF ou telefone..."
            />
          </label>

          <label>
            <span>Nome para Exibição no Card <AjudaDica que="Nome oficial ou curto do segurado (ex: Maria da Conceição)." porque="É o nome que aparecerá em destaque no cartão da agenda para a equipe identificar o cliente rapidamente."/></span>
            <input
              value={form.pessoa_nome}
              onChange={e => set('pessoa_nome', e.target.value)}
              placeholder="Digite o nome do cliente..."
              required
            />
          </label>
        </div>

        <div className="cj-fn-modal-linha">
          <label>
            <span>Benefício ou Processo Vinculado <AjudaDica que="Selecione o caso/benefício (ex: Auxílio-Doença, BPC ou Ação Judicial)." porque="Mantém o histórico do processo organizado na pasta jurídica certa e preenche o número automaticamente."/></span>
            <SelectBuscaInteligente
              opcoes={casosDisponiveis.map(p => ({
                id: p.id,
                titulo: p.titulo,
                subtitulo: p.numero !== '—' ? `Nº ${p.numero}` : 'Sem número/protocolo'
              }))}
              valorSelecionado={form.processo_id}
              onSelecionar={(pId) => {
                if (!pId) {
                  setForm(f => ({ ...f, processo_id: '' }));
                  return;
                }
                const pObj = casosList.find(x => x.id === pId);
                setForm(f => ({
                  ...f,
                  processo_id: pId,
                  protocolo_inss: pObj ? (pObj.numero !== '—' ? pObj.numero : f.protocolo_inss) : f.protocolo_inss,
                  beneficio: pObj ? pObj.titulo : f.beneficio
                }));
              }}
              placeholder="-- Nenhum ou Avulso --"
              labelRecentes="🕒 ÚLTIMOS 5 PROCESSOS ADICIONADOS:"
              labelBusca="🔍 Buscar processo por título ou número..."
            />
          </label>

          <label>
            <span>Nº do Protocolo INSS / Processo <AjudaDica que="Número do Benefício (NB), requerimento do INSS ou número CNJ do processo." porque="Essencial para consulta rápida de andamento no Meu INSS ou no fórum (PJe) no dia da perícia ou audiência."/></span>
            <input
              value={form.protocolo_inss}
              onChange={e => set('protocolo_inss', e.target.value)}
              placeholder="Número de benefício ou protocolo..."
            />
          </label>
        </div>

        <div className="cj-fn-modal-divisao">2. Detalhes do Evento & Calendário</div>

        <div className="cj-fn-modal-linha">
          <label>
            <span>Tipo de Compromisso / Prazo <AjudaDica que="Categoria do agendamento (ex: Perícia Médica, Audiência, Consulta Inicial)." porque="Define a cor do alerta no calendário, a urgência e como o robô formulará a mensagem para o cliente."/></span>
            <select value={form.tipo_id} onChange={e => handleSelectTipo(e.target.value)}>
              {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </label>

          <label>
            <span>Título / Identificação no Calendário <AjudaDica que="Resumo principal do compromisso (ex: Perícia Médica — Maria da Conceição)." porque="É o texto principal que aparece na agenda da equipe e no painel de acompanhamento de prazos."/></span>
            <input
              value={form.titulo}
              onChange={e => set('titulo', e.target.value)}
              placeholder="Identificação rápida do prazo..."
              required
            />
          </label>
        </div>

        <div className="cj-fn-modal-linha-3">
          <label>
            <span>Data</span>
            <input type="date" value={form.data} onChange={e => set('data', e.target.value)} required/>
          </label>
          <label>
            <span>Hora</span>
            <input type="time" value={form.hora} onChange={e => set('hora', e.target.value)} required/>
          </label>
          <label>
            <span>Duração Prevista</span>
            <select value={form.duracao_min} onChange={e => set('duracao_min', Number(e.target.value))}>
              <option value={30}>30 min</option>
              <option value={45}>45 min</option>
              <option value={60}>1 hora (60m)</option>
              <option value={90}>1h 30m (90m)</option>
              <option value={120}>2 horas (120m)</option>
            </select>
          </label>
        </div>

        <div className="cj-fn-modal-divisao">3. Local do Atendimento & Responsável</div>

        <div className="cj-fn-modal-linha">
          <label>
            <span>Modalidade ou Local <AjudaDica que="Onde ou como será o ato (Presencial no INSS, Digital pelo Meu INSS, Fórum ou Escritório)." porque="Permite ao robô dar instruções personalizadas (ex: se for na APS, orienta chegar 30m antes com documento com foto)."/></span>
            <select value={form.local_tipo} onChange={e => set('local_tipo', e.target.value)}>
              <option value="Agência INSS">Agência INSS (APS presencial)</option>
              <option value="Meu INSS">Meu INSS (Digital / Sistema)</option>
              <option value="Justiça Federal">Justiça Federal / Fórum</option>
              <option value="Escritório">Escritório / Telefone</option>
              <option value="Outro">Outro local</option>
            </select>
          </label>

          <label>
            <span>Advogado / Responsável Interno <AjudaDica que="Membro da equipe do escritório designado para conduzir ou acompanhar o ato." porque="Direciona a responsabilidade e permite filtrar a agenda individual por advogado ou colaborador."/></span>
            <select value={form.advogado_id} onChange={e => set('advogado_id', e.target.value)}>
              <option value="">-- Selecione a equipe --</option>
              {advogados.map(a => (
                <option key={a.id} value={a.id}>{a.nome} ({a.area})</option>
              ))}
            </select>
          </label>
        </div>

        <label>
          <span>Endereço da Agência INSS ou Link Digital <AjudaDica que="Endereço físico completo da APS/fórum ou link da sala virtual de atendimento." porque="O cliente recebe este endereço/link no WhatsApp para não errar o local no dia da perícia ou audiência."/></span>
          <input
            value={form.local_detalhe}
            onChange={e => set('local_detalhe', e.target.value)}
            placeholder="Endereço da APS, link da sala ou observação de local..."
          />
        </label>

        <div className="cj-fn-modal-divisao">4. Observações Internas & Lembrete</div>

        <label>
          <span>Orientação para a Equipe ou ao Segurado no WhatsApp <AjudaDica que="Checklist de documentos (RG, CTPS, laudos originais) ou orientações especiais." porque="O robô do WhatsApp lê estas observações e repassa ao cliente como recomendações de preparação para a perícia."/></span>
          <textarea
            rows={3}
            value={form.obs}
            onChange={e => set('obs', e.target.value)}
            placeholder="Anotações sobre documentos necessários, orientações para a perícia ou lembrete para envio ao cliente..."
            style={{ resize: 'vertical' }}
          />
        </label>

        <div className="cj-fn-modal-foot">
          <button type="button" className="cj-fn-cancelar" onClick={onFechar}>Cancelar</button>
          <button type="submit" className="cj-fn-btn-primario">Salvar & Configurar Lembrete</button>
        </div>
      </form>
    </div>
  );
};

export default Prazos;

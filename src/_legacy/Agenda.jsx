import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Icon } from './Icon';
import { escritorio, resumo, corTipo, nomeAdv } from '../data/mockData';

const mesesNomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const diasSemanaNomes = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

export const Agenda = ({ items = [], onNew, onEdit, onBlock, filtroAdv, setFiltroAdv }) => {
  const [view, setView] = useState('mes'); // Padrão agora como 'mes' para ver o calendário completo
  const [currentDate, setCurrentDate] = useState(() => new Date(2026, 6, 20)); // Base em julho 2026
  const [isMesOpen, setIsMesOpen] = useState(false);
  const dropdownRef = useRef(null);
  const listRef = useRef(null);

  const anoAtual = currentDate.getFullYear();
  const mesAtual = currentDate.getMonth();
  const diaAtual = currentDate.getDate();

  // Opções de mês para o dropdown de consulta de meses anteriores e futuros (2025 a 2028)
  const mesesOpcoes = useMemo(() => {
    const lista = [];
    for (let ano = 2025; ano <= 2028; ano++) {
      for (let m = 0; m < 12; m++) {
        lista.push({ ano, mes: m, label: `${mesesNomes[m]} ${ano}` });
      }
    }
    return lista;
  }, []);

  // Navegação (Anterior / Próximo / Hoje)
  const navegar = (direcao) => {
    if (direcao === 'hoje') {
      setCurrentDate(new Date(2026, 6, 20));
      return;
    }
    const d = new Date(currentDate);
    if (view === 'mes') {
      d.setMonth(d.getMonth() + direcao);
    } else if (view === 'semana') {
      d.setDate(d.getDate() + (direcao * 7));
    } else {
      d.setDate(d.getDate() + direcao);
    }
    setCurrentDate(d);
  };

  useEffect(() => {
    const handleOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsMesOpen(false);
      }
    };
    if (isMesOpen) {
      document.addEventListener('mousedown', handleOutside);
    }
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isMesOpen]);

  useEffect(() => {
    if (isMesOpen && listRef.current) {
      const selectedIdx = mesesOpcoes.findIndex(op => op.ano === anoAtual && op.mes === mesAtual);
      if (selectedIdx !== -1) {
        // Altura de cada item = 34px. Altura visível do container = 170px (exatamente 5 itens visíveis: 2 acima + 1 centro + 2 abaixo)
        const scrollTop = Math.max(0, (selectedIdx * 34) - (170 / 2) + 17);
        listRef.current.scrollTop = scrollTop;
      }
    }
  }, [isMesOpen, anoAtual, mesAtual, mesesOpcoes]);

  // Formatação do título dinâmico
  const getHeaderTitle = () => {
    if (view === 'dia') {
      const dow = diasSemanaNomes[currentDate.getDay()];
      return `${dow}, ${diaAtual} de ${mesesNomes[mesAtual].toLowerCase()} de ${anoAtual}`;
    } else if (view === 'semana') {
      const inicioSemana = new Date(currentDate);
      const diaSem = (currentDate.getDay() + 6) % 7; // Seg = 0
      inicioSemana.setDate(currentDate.getDate() - diaSem);
      const fimSemana = new Date(inicioSemana);
      fimSemana.setDate(inicioSemana.getDate() + 6);
      return `${inicioSemana.getDate()} de ${mesesNomes[inicioSemana.getMonth()]} – ${fimSemana.getDate()} de ${mesesNomes[fimSemana.getMonth()]} de ${fimSemana.getFullYear()}`;
    } else {
      return `${mesesNomes[mesAtual]} de ${anoAtual}`;
    }
  };

  // Itens filtrados pelo advogado e pela data
  const filtrados = useMemo(() => {
    let lista = filtroAdv === 'all' ? items : items.filter(a => a.advogado === filtroAdv || a.advogado === 'all');
    
    if (view === 'dia') {
      const isoDia = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(diaAtual).padStart(2, '0')}`;
      return lista.filter(a => !a.data || a.data === isoDia || (anoAtual === 2026 && mesAtual === 6 && diaAtual === 20 && !a.data));
    }
    return lista;
  }, [items, filtroAdv, view, anoAtual, mesAtual, diaAtual]);

  // Formatar data em ISO para passar na criação de compromisso
  const dataSelecionadaIso = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(diaAtual).padStart(2, '0')}`;

  return (
    <div className="cj-agenda">
      <header className="cj-head" style={{ position: 'relative', zIndex: 30 }}>
        <div>
          <h1>Agenda · {getHeaderTitle()}</h1>
          <p className="cj-sub">
            {view === 'dia' && `${filtrados.length} compromissos agendados para este dia`}
            {view === 'semana' && `Visão semanal de compromissos e audiências · ${mesesNomes[mesAtual]} ${anoAtual}`}
            {view === 'mes' && `Calendário completo de ${mesesNomes[mesAtual]} de ${anoAtual} · clique em qualquer dia para agendar`}
          </p>
        </div>
        <div className="cj-head-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          
          {/* Seletor Customizado de Mês e Ano (mostra exatamente 2 acima e 2 abaixo com scroll) */}
          <div ref={dropdownRef} style={{ position: 'relative', zIndex: 40 }}>
            <button
              onClick={() => setIsMesOpen(prev => !prev)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                background: 'var(--surface, #ffffff)',
                border: '1px solid var(--border)',
                color: 'var(--ink, #1e293b)',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}
            >
              <span>{mesesNomes[mesAtual]} {anoAtual}</span>
              <Icon name="chevron" size={14} style={{ transform: isMesOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', opacity: 0.7 }} />
            </button>

            {isMesOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  zIndex: 50,
                  width: '200px',
                  background: 'var(--surface, #ffffff)',
                  backgroundColor: 'var(--surface, #ffffff)',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  boxShadow: '0 15px 35px rgba(0,0,0,0.25)',
                  padding: '6px 0',
                  overflow: 'hidden'
                }}
              >
                <div
                  ref={listRef}
                  style={{
                    maxHeight: '170px', // Exatamente 5 itens visíveis: 2 para cima, 1 no centro, 2 para baixo
                    overflowY: 'auto',
                    scrollbarWidth: 'thin'
                  }}
                >
                  {mesesOpcoes.map((op) => {
                    const active = op.ano === anoAtual && op.mes === mesAtual;
                    return (
                      <div
                        key={`${op.ano}-${op.mes}`}
                        onClick={() => {
                          setCurrentDate(new Date(op.ano, op.mes, Math.min(diaAtual, new Date(op.ano, op.mes + 1, 0).getDate())));
                          setIsMesOpen(false);
                        }}
                        style={{
                          height: '34px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0 14px',
                          fontSize: '13px',
                          fontWeight: active ? '700' : '500',
                          color: active ? '#fff' : 'var(--ink, #1e293b)',
                          background: active ? 'var(--accent)' : 'transparent',
                          cursor: 'pointer',
                          transition: 'background 0.15s'
                        }}
                        onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                        onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <span>{op.label}</span>
                        {active && <Icon name="check" size={13} />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Botões de Visualização */}
          <div className="cj-viewsw">
            <button className={view === 'dia' ? 'active' : ''} onClick={() => setView('dia')}>Dia</button>
            <button className={view === 'semana' ? 'active' : ''} onClick={() => setView('semana')}>Semana</button>
            <button className={view === 'mes' ? 'active' : ''} onClick={() => setView('mes')}>Mês</button>
          </div>

          {/* Setas de Navegação (Anterior / Hoje / Próximo) */}
          <div className="cj-nav-arrows">
            <button title="Anterior" onClick={() => navegar(-1)}><Icon name="left" size={15}/></button>
            <button className="hoje" onClick={() => navegar('hoje')}>Hoje</button>
            <button title="Próximo" onClick={() => navegar(1)}><Icon name="right" size={15}/></button>
          </div>

          <button className="cj-btn ghost" onClick={onBlock}><Icon name="lock" size={13}/> Bloquear</button>
          <button className="cj-btn" onClick={() => onNew && onNew(dataSelecionadaIso)}><Icon name="plus" size={14}/> Compromisso</button>
        </div>
      </header>

      <div className="cj-adv-filter" style={{ position: 'relative', zIndex: 10 }}>
        <button className={`cj-chip ${filtroAdv === 'all' ? 'active' : ''}`} onClick={() => setFiltroAdv('all')}>Todos</button>
        {escritorio.advogados.map(a => (
          <button key={a.id} className={`cj-chip ${filtroAdv === a.id ? 'active' : ''}`} onClick={() => setFiltroAdv(a.id)}>
            <span className={`cj-dot cor-${a.cor}`}/> {a.nome.replace(/Dra?\.\s/, '')}
          </button>
        ))}
      </div>

      <div className="cj-agenda-views-wrap" style={{ position: 'relative', zIndex: 1 }}>
        {view === 'dia' && <DiaView items={filtrados} dataSelecionadaIso={dataSelecionadaIso} onEdit={onEdit} onNew={onNew}/>}
        {view === 'semana' && <SemanaView filtroAdv={filtroAdv} currentDate={currentDate} onEdit={onEdit} onNew={onNew}/>}
        {view === 'mes' && <MesView filtroAdv={filtroAdv} items={items} currentDate={currentDate} onEdit={onEdit} onNew={onNew}/>}
      </div>
    </div>
  );
};

// ---------- Dia ----------
function DiaView({ items, dataSelecionadaIso, onEdit, onNew }) {
  // Grade padrão de blocos configurados para atendimento no escritório
  const gradeConfig = ['08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'];
  
  // Combina com quaisquer horários de compromissos existentes e ordena em ordem cronológica
  const todasHoras = Array.from(new Set([...gradeConfig, ...items.map(a => a.hora || '09:00')])).sort();

  const toMin = (h) => {
    const [hh, mm] = (h || '00:00').split(':').map(Number);
    return hh * 60 + (mm || 0);
  };

  return (
    <div className="cj-dia">
      {todasHoras.map(slotHora => {
        const appsNoSlot = items.filter(a => (a.hora || '09:00') === slotHora);
        const slotMin = toMin(slotHora);

        if (appsNoSlot.length > 0) {
          return appsNoSlot.map(a => {
            const bloqueio = a.status === 'bloqueio' || a.tipo === 'bloqueio';
            return (
              <div key={a.id} className={`cj-dia-row ${bloqueio ? 'bloqueio' : ''} ${a.destaque ? 'destaque' : ''} status-${a.status}`}
                   onClick={() => !bloqueio && onEdit(a)}>
                <div className="cj-dia-time">
                  <b>{a.hora || '09:00'}</b>
                  <span>{a.dur || 60}min</span>
                </div>
                <div className={`cj-dia-bar cor-${bloqueio ? 'slate' : corTipo(a.tipo)}`}/>
                <div className="cj-dia-main">
                  {bloqueio ? (
                    <div className="cj-dia-bloqueio"><Icon name="lock" size={12}/> {a.titulo || 'Horário Bloqueado'}</div>
                  ) : (
                    <>
                      <div className="cj-dia-titulo">{a.titulo || 'Consulta'}</div>
                      <div className="cj-dia-meta">
                        <span className="cj-cliente">{a.cliente || 'Cliente'}</span>
                        <span className="sep">·</span>
                        <span>{nomeAdv(a.advogado)}</span>
                        {a.local && <><span className="sep">·</span><span>{a.local}</span></>}
                      </div>
                    </>
                  )}
                </div>
                {!bloqueio && (
                  <div className="cj-dia-tags">
                    <span className={`cj-tipo-tag cor-${corTipo(a.tipo)}`}>{(escritorio.tipos.find(t => t.id === a.tipo) || {}).nome || 'Consulta'}</span>
                    {a.status === 'em_andamento' && <span className="cj-mini live"><span className="cj-livedot"/> em andamento</span>}
                    {a.status === 'confirmado' && <span className="cj-mini ok"><Icon name="check" size={10}/> confirmado</span>}
                    {a.status === 'pendente' && <span className="cj-mini warn">a confirmar</span>}
                    {a.status === 'concluido' && <span className="cj-mini muted">concluído</span>}
                    <button className="cj-dia-edit" onClick={(e) => { e.stopPropagation(); onEdit(a); }}><Icon name="pencil" size={13}/></button>
                  </div>
                )}
              </div>
            );
          });
        }

        // Se não tem compromisso começando neste horário, verifica se este slot cai no meio de um compromisso anterior em andamento
        const estaOcupado = items.some(item => {
          const start = toMin(item.hora || '09:00');
          const end = start + (item.dur || 60);
          return slotMin > start && slotMin < end;
        });

        if (estaOcupado) return null;

        // Horário totalmente livre para agendamento
        return (
          <div
            key={`free-${slotHora}`}
            className="cj-dia-row disponivel"
            onClick={() => onNew && onNew(dataSelecionadaIso, slotHora)}
            style={{
              border: '1px dashed var(--border-2)',
              background: 'var(--surface, rgba(255, 255, 255, 0.4))',
              cursor: 'pointer',
              opacity: 0.88,
              transition: 'all 0.15s ease'
            }}
          >
            <div className="cj-dia-time">
              <b style={{ color: 'var(--ink-2)' }}>{slotHora}</b>
              <span style={{ color: 'var(--ink-4)' }}>livre</span>
            </div>
            <div className="cj-dia-bar" style={{ background: 'var(--border-2)' }}/>
            <div className="cj-dia-main">
              <div className="cj-dia-titulo" style={{ color: 'var(--ink-3)', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Icon name="clock" size={13} style={{ color: 'var(--ink-4)' }}/> Horário Disponível para Atendimento / Consulta
              </div>
              <div className="cj-dia-meta" style={{ color: 'var(--ink-4)' }}>
                <span>Clique para agendar um compromisso neste horário</span>
              </div>
            </div>
            <div className="cj-dia-tags">
              <span className="cj-mini ok" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                ✓ disponível
              </span>
              <button
                className="cj-btn sm"
                style={{
                  padding: '5px 12px',
                  fontSize: '12px',
                  background: 'var(--accent)',
                  color: '#ffffff',
                  borderRadius: '6px',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontWeight: '600'
                }}
                onClick={(e) => { e.stopPropagation(); onNew && onNew(dataSelecionadaIso, slotHora); }}
              >
                <Icon name="plus" size={12}/> Agendar
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Semana ----------
function SemanaView({ filtroAdv, currentDate, onEdit, onNew }) {
  const horas = ['08','09','10','11','12','13','14','15','16','17','18'];
  const ROW = 56;

  // Calcular os 7 dias (Seg a Dom) da semana de currentDate
  const diasSemana = useMemo(() => {
    const inicioSemana = new Date(currentDate);
    const diaSem = (currentDate.getDay() + 6) % 7; // Seg = 0
    inicioSemana.setDate(currentDate.getDate() - diaSem);

    return ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((nome, index) => {
      const d = new Date(inicioSemana);
      d.setDate(inicioSemana.getDate() + index);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return {
        l: nome,
        d: String(d.getDate()),
        iso,
        hoje: d.toDateString() === new Date().toDateString() || (d.getFullYear() === 2026 && d.getMonth() === 6 && d.getDate() === 20),
        fim: index >= 5
      };
    });
  }, [currentDate]);

  const eventosSemana = useMemo(() => {
    const advs = escritorio.advogados;
    const tipos = ['t1','t2','t3','t4','t5'];
    const out = [];
    diasSemana.forEach((d, di) => {
      if (d.fim && di === 6) return;
      horas.forEach((_, hi) => {
        if (hi === 4 || hi === 10) return; // pular almoço ou final da tarde
        const seed = (di * 5 + hi * 11 + (currentDate.getMonth() * 3)) % 13;
        if (seed > 8) return;
        const adv = advs[(di + hi) % advs.length];
        if (filtroAdv !== 'all' && adv.id !== filtroAdv) return;
        const tipo = tipos[(di + hi) % tipos.length];
        const span = tipo === 't3' ? 2 : 1;
        out.push({ di, hi, adv, tipo, span, hora: horas[hi], dataIso: d.iso });
      });
    });
    return out;
  }, [filtroAdv, diasSemana, currentDate]);

  return (
    <div className="cj-week">
      <div className="cj-week-head">
        <div className="cj-week-spacer"/>
        <div className="cj-week-days">
          {diasSemana.map(d => (
            <div key={d.l} className={`cj-week-day ${d.hoje ? 'hoje' : ''} ${d.fim ? 'fim' : ''}`}>
              <span className="cj-week-dow">{d.l}</span>
              <span className="cj-week-num">{d.d}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="cj-week-body">
        <div className="cj-week-hours">
          {horas.map(h => <div key={h} className="cj-week-hour" style={{ height: ROW }}>{h}:00</div>)}
        </div>
        <div className="cj-week-canvas" style={{ height: horas.length * ROW }}>
          {/* Colunas verticais interativas */}
          {diasSemana.map((d, di) => (
            <div key={d.l} className={`cj-week-col ${d.fim ? 'fim' : ''}`} style={{ left: `${(di * 100) / 7}%`, width: `${100 / 7}%` }}>
              {horas.map((h, hi) => (
                <div key={h} className="cj-week-cell" style={{ height: ROW, cursor: 'pointer' }}
                     onClick={() => onNew && onNew(d.iso)}
                     title={`Agendar em ${d.d}/${String(currentDate.getMonth()+1).padStart(2,'0')} às ${h}:00`}/>
              ))}
            </div>
          ))}

          {/* Eventos no canvas */}
          {eventosSemana.map((ev, i) => {
            const top = ev.hi * ROW + 3;
            const height = ev.span * ROW - 6;
            const left = `calc(${(ev.di * 100) / 7}% + 3px)`;
            const width = `calc(${100 / 7}% - 6px)`;
            const t = escritorio.tipos.find(x => x.id === ev.tipo) || {};
            return (
              <div key={i} className={`cj-week-ev cor-${t.cor}`} style={{ top, height, left, width, zIndex: 10 }}
                   onClick={(e) => { e.stopPropagation(); onEdit({ titulo: t.nome, tipo: ev.tipo, advogado: ev.adv.id, hora: ev.hora + ':00', dur: ev.span * 60, status: 'confirmado', local: 'Sala 1', data: ev.dataIso }, 'editar'); }}>
                <div className="cj-week-ev-t">{t.nome}</div>
                <div className="cj-week-ev-nome">{ev.adv.nome.replace(/Dra?\.\s/, '')}</div>
                <div className="cj-week-ev-adv">{ev.hora}:00 · {ev.span * 60}min</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------- Mês ----------
function MesView({ filtroAdv, items, currentDate, onEdit, onNew }) {
  const advs = escritorio.advogados;
  const anoAtual = currentDate.getFullYear();
  const mesAtual = currentDate.getMonth();

  // Dias no mês e offset (dia da semana do dia 1º)
  const numDias = new Date(anoAtual, mesAtual + 1, 0).getDate();
  const dias = Array.from({ length: numDias }, (_, i) => i + 1);
  const offset = (new Date(anoAtual, mesAtual, 1).getDay() + 6) % 7; // Seg = 0

  const eventosMes = useMemo(() => {
    const tipos = escritorio.tipos;
    const mapa = {};

    // 1. Inserir itens reais / passados em prop `items`
    items.forEach(it => {
      if (filtroAdv !== 'all' && it.advogado !== filtroAdv && it.advogado !== 'all') return;
      let diaEv = null;
      if (it.data) {
        const [a, m, d] = it.data.split('-').map(Number);
        if (a === anoAtual && m === mesAtual + 1) diaEv = d;
      } else if (anoAtual === 2026 && mesAtual === 6) {
        diaEv = 20; // Padrão se não tiver data no mock
      }
      if (diaEv) {
        if (!mapa[diaEv]) mapa[diaEv] = [];
        mapa[diaEv].push(it);
      }
    });

    // 2. Para enriquecer visualmente meses passados/futuros ou julho, adicionar compromissos simulados/recorrentes
    dias.forEach(d => {
      const isFim = new Date(anoAtual, mesAtual, d).getDay() === 0 || new Date(anoAtual, mesAtual, d).getDay() === 6;
      if (isFim) return; // não simular em fins de semana

      const numEvs = (d * 3 + mesAtual + 1) % 3; // de 0 a 2 compromissos por dia
      for (let i = 0; i < numEvs; i++) {
        const adv = advs[(d + i) % advs.length];
        if (filtroAdv !== 'all' && adv.id !== filtroAdv) continue;
        const t = tipos[(d + i * 2) % tipos.length];
        const hora = `${8 + ((d + i * 3) % 9).toString().padStart(2, '0')}:00`;
        const idSim = `m-${anoAtual}-${mesAtual}-${d}-${i}`;
        
        // Evitar duplicar se já tiver item real naquele horário
        if (!mapa[d] || !mapa[d].some(x => x.hora === hora)) {
          if (!mapa[d]) mapa[d] = [];
          const isoData = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          mapa[d].push({ id: idSim, dia: d, hora, dur: t.dur, tipo: t.id, titulo: t.nome, cliente: `Cliente ${d * 5 + i}`, advogado: adv.id, status: 'confirmado', local: 'Sala 1', data: isoData });
        }
      }
    });

    // Ordenar horários do dia
    Object.keys(mapa).forEach(k => mapa[k].sort((a, b) => (a.hora || '09:00').localeCompare(b.hora || '09:00')));
    return mapa;
  }, [filtroAdv, items, anoAtual, mesAtual, dias]);

  return (
    <div className="cj-month">
      <div className="cj-month-head">
        {['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(d => <div key={d} className="cj-month-dow">{d}</div>)}
      </div>
      <div className="cj-month-grid">
        {Array.from({ length: offset }).map((_, i) => <div key={'o'+i} className="cj-month-cell mudo"/>)}
        {dias.map(d => {
          const dataC = new Date(anoAtual, mesAtual, d);
          const dow = dataC.getDay();
          const fim = dow === 0 || dow === 6;
          const hoje = d === 20 && anoAtual === 2026 && mesAtual === 6;
          const evsDia = eventosMes[d] || [];
          const isoDataCell = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

          return (
            <div
              key={d}
              className={`cj-month-cell ${fim ? 'fim' : ''}`}
              onClick={() => onNew && onNew(isoDataCell)}
              style={{ cursor: 'pointer', transition: 'border-color 0.2s' }}
              title={`Clique para agendar em ${d} de ${mesesNomes[mesAtual]} de ${anoAtual}`}
            >
              <div className="cj-month-num">
                <span className={hoje ? 'cj-month-hoje' : ''}>{d}</span>
                {evsDia.length > 0 && <span className="cj-month-count">{evsDia.length}</span>}
              </div>
              <div className="cj-month-evs">
                {evsDia.map(ev => {
                  const t = escritorio.tipos.find(x => x.id === ev.tipo) || {};
                  return (
                    <div
                      key={ev.id}
                      className={`cj-month-ev cor-${t.cor}`}
                      onClick={(e) => { e.stopPropagation(); onEdit && onEdit(ev, 'editar'); }}
                      title={`${ev.hora || '09:00'} - ${ev.titulo || 'Consulta'} (${nomeAdv(ev.advogado)})`}
                    >
                      <span>{ev.hora || '09:00'}</span> {ev.titulo || 'Consulta'}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Agenda;

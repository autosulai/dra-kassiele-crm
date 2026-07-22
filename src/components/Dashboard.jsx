import React, { useState, useEffect, useMemo } from 'react';
import { Icon } from './Icon';
import { loadLeadsKanban, loadFunis, loadEventos } from '../lib/funilService';

/**
 * Indicadores do escritório.
 *
 * Regra de leitura desta tela: cada número existe para provocar uma ação.
 * "Leads parados" é o mais importante — foi a dor que a Dra. Kassiele
 * levantou (gente esquecida no fluxo), e é o único número aqui que deveria
 * estar sempre próximo de zero.
 */

const MS_DIA = 86400000;

export const Dashboard = ({ onGoToChat, onGoToFunil, onGoToPrazos, clientesList = [] }) => {
  const [leads, setLeads] = useState([]);
  const [funis, setFunis] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [funilSel, setFunilSel] = useState('todos');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    Promise.all([loadLeadsKanban(), loadFunis(), loadEventos()]).then(([l, f, e]) => {
      setLeads(l); setFunis(f); setEventos(e); setCarregando(false);
    });
  }, []);

  const leadsFiltrados = useMemo(
    () => funilSel === 'todos' ? leads : leads.filter(l => l.funil_slug === funilSel),
    [leads, funilSel]
  );

  const kpis = useMemo(() => {
    const parados = leadsFiltrados.filter(l => l.fora_do_sla);
    const semDocs = leadsFiltrados.filter(l => (l.docs_recebidos || 0) < (l.docs_total || 0));
    const aguardandoAssinatura = leadsFiltrados.filter(l => l.status_assinatura === 'enviado');
    const protocolados = leadsFiltrados.filter(l => !!l.protocolo_inss);

    const periciasProximas = eventos.filter(e => {
      if (e.status !== 'agendado' || !e.exige_presenca) return false;
      const d = Math.ceil((new Date(e.data_hora) - new Date()) / MS_DIA);
      return d >= 0 && d <= 7;
    });
    const prazosVencidos = eventos.filter(e =>
      e.status === 'agendado' && new Date(e.data_hora) < new Date()
    );

    return {
      abertos: leadsFiltrados.length,
      parados: parados.length,
      semDocs: semDocs.length,
      aguardandoAssinatura: aguardandoAssinatura.length,
      protocolados: protocolados.length,
      periciasProximas: periciasProximas.length,
      prazosVencidos: prazosVencidos.length,
      listaParados: parados.sort((a, b) => (b.dias_parado || 0) - (a.dias_parado || 0)).slice(0, 8),
    };
  }, [leadsFiltrados, eventos]);

  // Distribuição por etapa do funil selecionado (ou do primeiro, se "todos")
  const distribuicao = useMemo(() => {
    const alvo = funilSel === 'todos' ? null : funis.find(f => f.slug === funilSel);
    const etapas = alvo ? alvo.etapas : (funis[0]?.etapas || []);
    const base = alvo ? leadsFiltrados : leads.filter(l => l.funil_slug === funis[0]?.slug);
    const max = Math.max(1, ...etapas.map(e => base.filter(l => l.etapa_slug === e.slug).length));
    return etapas.map(e => {
      const n = base.filter(l => l.etapa_slug === e.slug).length;
      return { ...e, n, pct: Math.round((n / max) * 100) };
    });
  }, [funis, funilSel, leads, leadsFiltrados]);

  // Onde o funil mais trava: etapa com mais leads fora do prazo
  const gargalo = useMemo(() => {
    const contagem = {};
    leadsFiltrados.filter(l => l.fora_do_sla).forEach(l => {
      contagem[l.etapa_nome || l.etapa_slug] = (contagem[l.etapa_nome || l.etapa_slug] || 0) + 1;
    });
    const ord = Object.entries(contagem).sort((a, b) => b[1] - a[1]);
    return ord[0] ? { etapa: ord[0][0], n: ord[0][1] } : null;
  }, [leadsFiltrados]);

  if (carregando) return <div className="cj-fn-vazio">Carregando indicadores…</div>;

  return (
    <div className="cj-db">
      <header className="cj-fn-head">
        <div>
          <h1 className="cj-fn-title"><Icon name="chart" size={20}/> Indicadores</h1>
          <p className="cj-fn-sub">
            Onde o funil está travando e quem corre risco de ser esquecido.
          </p>
        </div>
        <div className="cj-fn-tabs">
          <button
            className={`cj-fn-tab ${funilSel === 'todos' ? 'active' : ''}`}
            onClick={() => setFunilSel('todos')}
          >Todos</button>
          {funis.map(f => (
            <button
              key={f.slug}
              className={`cj-fn-tab ${funilSel === f.slug ? 'active' : ''} cor-${f.cor}`}
              onClick={() => setFunilSel(f.slug)}
            >{f.nome}</button>
          ))}
        </div>
      </header>

      <div className="cj-db-body">
        {/* ---- KPIs ---- */}
        <div className="cj-db-kpis">
          <Kpi rotulo="Leads em aberto" valor={kpis.abertos} icone="users"
               nota="No funil agora" onClick={onGoToFunil}/>
          <Kpi rotulo="Parados além do prazo" valor={kpis.parados} icone="clock"
               tom={kpis.parados > 0 ? 'perigo' : 'ok'}
               nota={kpis.parados > 0 ? 'Precisam de ação hoje' : 'Nenhum lead esquecido'}
               onClick={onGoToFunil}/>
          <Kpi rotulo="Com documento faltando" valor={kpis.semDocs} icone="doc"
               nota="Checklist incompleto"/>
          <Kpi rotulo="Contrato sem assinar" valor={kpis.aguardandoAssinatura} icone="pencil"
               tom={kpis.aguardandoAssinatura > 0 ? 'atencao' : 'normal'}
               nota="Enviado e não assinado"/>
          <Kpi rotulo="Perícias em 7 dias" valor={kpis.periciasProximas} icone="calendar"
               tom={kpis.periciasProximas > 0 ? 'atencao' : 'normal'}
               nota="Exigem presença do cliente" onClick={onGoToPrazos}/>
          <Kpi rotulo="Prazos vencidos" valor={kpis.prazosVencidos} icone="bell"
               tom={kpis.prazosVencidos > 0 ? 'perigo' : 'ok'}
               nota="Sem baixa registrada" onClick={onGoToPrazos}/>
        </div>

        {gargalo && (
          <div className="cj-db-insight">
            <Icon name="zap" size={15}/>
            <span>
              O funil trava mais em <b>{gargalo.etapa}</b> — {gargalo.n} lead(s)
              parado(s) além do prazo nessa etapa. Vale revisar o texto que a IA
              usa aqui ou o documento que está sendo pedido.
            </span>
          </div>
        )}

        <div className="cj-db-grid">
          {/* ---- Distribuição por etapa ---- */}
          <section className="cj-db-card">
            <h2>Distribuição por etapa</h2>
            <p className="cj-db-card-sub">
              {funilSel === 'todos'
                ? `Mostrando ${funis[0]?.nome || 'o primeiro funil'} — selecione um funil acima para trocar.`
                : 'Quantos leads estão parados em cada fase.'}
            </p>
            <div className="cj-db-etapas">
              {distribuicao.map(e => (
                <div key={e.slug} className={`cj-db-etapa cor-${e.cor}`}>
                  <div className="cj-db-etapa-nome">{e.nome}</div>
                  <div className="cj-db-etapa-bar">
                    <div className="cj-db-etapa-fill" style={{ width: `${e.pct}%` }}/>
                  </div>
                  <div className="cj-db-etapa-n">{e.n}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ---- Leads esquecidos ---- */}
          <section className="cj-db-card">
            <h2>
              Quem está sendo esquecido
              {kpis.parados > 0 && <span className="cj-db-tag">{kpis.parados}</span>}
            </h2>
            <p className="cj-db-card-sub">
              Leads parados além do prazo da própria etapa, do mais antigo para o mais recente.
            </p>

            {kpis.listaParados.length === 0 ? (
              <div className="cj-db-ok">
                <Icon name="check" size={18}/>
                Nenhum lead fora do prazo. O follow-up automático está dando conta.
              </div>
            ) : (
              <table className="cj-db-tab">
                <thead>
                  <tr><th>Lead</th><th>Etapa</th><th>Docs</th><th>Parado</th><th/></tr>
                </thead>
                <tbody>
                  {kpis.listaParados.map(l => (
                    <tr key={l.id}>
                      <td>
                        <b>{l.nome}</b>
                        <span>{l.telefone}</span>
                      </td>
                      <td><span className={`cj-chattag cor-${l.etapa_cor || 'slate'}`}>{l.etapa_nome}</span></td>
                      <td className="mono">{l.docs_recebidos || 0}/{l.docs_total || 0}</td>
                      <td><span className="cj-db-dias">{l.dias_parado}d</span></td>
                      <td>
                        <button onClick={() => onGoToChat && onGoToChat(l.telefone)}>Abrir</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>

        <div className="cj-db-rodape">
          {kpis.protocolados} pedido(s) já protocolado(s) no INSS ·
          {' '}{clientesList.length} cliente(s) com contrato assinado
        </div>
      </div>
    </div>
  );
};

const Kpi = ({ rotulo, valor, nota, icone, tom = 'normal', onClick }) => (
  <div
    className={`cj-db-kpi tom-${tom} ${onClick ? 'clicavel' : ''}`}
    onClick={onClick}
    role={onClick ? 'button' : undefined}
  >
    <div className="cj-db-kpi-top">
      <span>{rotulo}</span>
      <Icon name={icone} size={15}/>
    </div>
    <b>{valor}</b>
    <span className="cj-db-kpi-nota">{nota}</span>
  </div>
);

export default Dashboard;

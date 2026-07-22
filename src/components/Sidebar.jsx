import React, { useMemo } from 'react';
import { Icon } from './Icon';
import { escritorio } from '../data/mockData';

export const Sidebar = ({ view, setView, onNew, escritorioState }) => {
  const esc = escritorioState || escritorio;
  const items = [
    { id: 'funil', label: 'Funil', icon: 'funnel' },
    { id: 'chat', label: 'Chat', icon: 'bell' },
    { id: 'prazos', label: 'Prazos & Perícias', icon: 'calendar' },
    { id: 'clientes', label: 'Clientes', icon: 'users' },
    { id: 'casos', label: 'Processos', icon: 'folder' },
    { id: 'dashboard', label: 'Indicadores', icon: 'chart' },
  ];

  const advogadosUnicos = useMemo(() => {
    const lista = esc.advogados || [];
    if (!Array.isArray(lista)) return [];
    const mapa = new Map();
    lista.forEach(a => {
      if (a && a.nome && !mapa.has(a.nome.trim())) {
        mapa.set(a.nome.trim(), a);
      }
    });
    return Array.from(mapa.values());
  }, [esc.advogados]);

  return (
    <aside className="cj-sidebar">
      <div className="cj-brand">
        <div className="cj-logo">
          {esc.logo ? <img src={esc.logo} alt="Logo" className="cj-logo-img"/> : <Icon name="scale" size={18}/>}
        </div>
        <div>
          <div className="cj-brand-name">{esc.nome}</div>
          <div className="cj-brand-sub">{esc.cidade}</div>
        </div>
      </div>

      <button className="cj-new" onClick={onNew}>
        <Icon name="plus" size={15}/> Registrar prazo
      </button>

      <nav className="cj-nav">
        {items.map(it => (
          <button
            key={it.id}
            className={`cj-nav-item ${view === it.id ? 'active' : ''}`}
            onClick={() => setView(it.id)}
          >
            <Icon name={it.icon} size={17}/>
            <span>{it.label}</span>
          </button>
        ))}
      </nav>

      <div className="cj-side-card">
        <div className="cj-side-card-h">Direito Previdenciário</div>
        <div className="cj-side-stats">
          <div><b>2</b><span>funis ativos</span></div>
          <div><b>30%</b><span>no êxito</span></div>
          <div><b>IA</b><span>na triagem</span></div>
        </div>
        <div className="cj-side-alert">
          <Icon name="clock" size={12}/> Perícia perdida = benefício negado
        </div>
      </div>

      <div className="cj-side-foot">
        <div className="cj-adv-list">
          {advogadosUnicos.map(a => (
            <div key={a.id || a.nome} className="cj-adv-row">
              <span className={`cj-dot cor-${a.cor || 'indigo'}`}/>
              <div>
                <div className="cj-adv-nome">{a.nome}</div>
                <div className="cj-adv-area">{a.area}</div>
              </div>
            </div>
          ))}
        </div>
        <button
          className={`cj-nav-item ghost ${view === 'config' ? 'active' : ''}`}
          onClick={() => setView('config')}
        >
          <Icon name="settings" size={16}/>
          <span>Configurações</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

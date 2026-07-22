import React, { useState } from 'react';
import { Icon } from './Icon';

// Modal para criar/customizar nova Tag
export function ModalNovaTag({ onClose, onSave }) {
  const [id, setId] = useState('');
  const [cor, setCor] = useState('ok');
  const [desc, setDesc] = useState('');

  return (
    <div className="cj-modal-bg" onClick={onClose}>
      <div className="cj-modal" onClick={e => e.stopPropagation()}>
        <header className="cj-modal-head">
          <div>
            <div className="cj-modal-eyebrow">tags & automação</div>
            <h2>Criar Nova Tag de Lead</h2>
          </div>
          <button className="cj-modal-x" onClick={onClose}><Icon name="x" size={16}/></button>
        </header>
        <div className="cj-modal-body">
          <div className="cj-field">
            <label>Nome da Tag</label>
            <input type="text" placeholder="Ex.: PROPOSTA_ENVIADA ou RETORNO_PENDENTE" value={id} onChange={e => setId(e.target.value.toLowerCase().replace(/\s+/g, '_'))}/>
            <span className="cj-sub">O nome será exibido no formato badge no chat e usado pela IA na categorização.</span>
          </div>
          <div className="cj-field">
            <label>Cor / Estilo do Badge</label>
            <div className="cj-seg">
              {['ok', 'warn', 'accent', 'muted', 'danger'].map(c => (
                <button key={c} className={cor === c ? 'active' : ''} onClick={() => setCor(c)}>
                  <span className={`cj-chattag ${c}`}>{c.toUpperCase()}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="cj-field">
            <label>Descrição para a IA (como e quando atribuir)</label>
            <input type="text" placeholder="Ex.: Atribuir quando enviarmos o orçamento por PDF." value={desc} onChange={e => setDesc(e.target.value)}/>
          </div>
        </div>
        <footer className="cj-modal-foot">
          <span/>
          <div className="cj-modal-foot-right">
            <button className="cj-btn ghost" onClick={onClose}>Cancelar</button>
            <button className="cj-btn" disabled={!id.trim()} onClick={() => onSave({ id, label: id, cor, desc })}>
              Salvar Nova Tag
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default ModalNovaTag;

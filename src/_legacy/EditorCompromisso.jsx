import React, { useState } from 'react';
import { Icon } from './Icon';
import { escritorio, clientes, configIA } from '../data/mockData';

export const EditorCompromisso = ({ modo, compromisso, onClose, onSalvar, onCancelar, aiName = configIA.nome || 'Sofia' }) => {
  const isBloqueio = modo === 'bloquear' || compromisso?.status === 'bloqueio';
  const isNovo = modo === 'novo' || modo === 'bloquear';

  const [form, setForm] = useState(() => {
    const defaultLocal = compromisso?.local || compromisso?.local_tipo || 'Vídeo Chamada';
    const mapeado = ['Vídeo Chamada', 'Presencial', 'Ligação', 'Externo'].includes(defaultLocal)
      ? defaultLocal
      : (defaultLocal === 'Online' ? 'Vídeo Chamada' : 'Presencial');
    const detalhe = compromisso?.localDetalhe || compromisso?.local_detalhe || (!['Vídeo Chamada', 'Presencial', 'Ligação', 'Externo', 'Online'].includes(defaultLocal) ? defaultLocal : '');

    return compromisso ? {
      titulo: compromisso.titulo || '',
      tipo: compromisso.tipo && compromisso.tipo !== 'bloqueio' ? compromisso.tipo : 't1',
      cliente: compromisso.cliente || '',
      advogado: compromisso.advogado && compromisso.advogado !== 'all' ? compromisso.advogado : 'a1',
      data: compromisso.data || new Date().toISOString().slice(0, 10),
      hora: compromisso.hora || '09:00',
      dur: compromisso.dur || 60,
      local: mapeado,
      localDetalhe: detalhe,
      obs: compromisso.obs || '',
    } : {
      titulo: '', tipo: isBloqueio ? 'bloqueio' : 't1', cliente: '', advogado: 'a1',
      data: new Date().toISOString().slice(0, 10), hora: '09:00', dur: 60, local: 'Vídeo Chamada', localDetalhe: '', obs: '',
    };
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const titulo = isBloqueio
    ? (isNovo ? 'Bloquear horário' : 'Editar bloqueio')
    : (isNovo ? 'Novo compromisso' : 'Editar compromisso');

  return (
    <div className="cj-modal-bg" onClick={onClose}>
      <div className="cj-modal" onClick={(e) => e.stopPropagation()}>
        <header className="cj-modal-head">
          <div>
            <div className="cj-modal-eyebrow">{isBloqueio ? 'agenda · bloqueio' : 'agenda · compromisso'}</div>
            <h2>{titulo}</h2>
          </div>
          <button className="cj-modal-x" onClick={onClose}><Icon name="x" size={16}/></button>
        </header>

        <div className="cj-modal-body">
          {!isBloqueio && (
            <>
              <div className="cj-field">
                <label>Tipo de compromisso</label>
                <div className="cj-tipo-grid">
                  {escritorio.tipos.map(t => (
                    <button key={t.id} className={`cj-tipo-opt ${form.tipo === t.id ? 'active' : ''}`} onClick={() => { set('tipo', t.id); set('dur', t.dur); }}>
                      <span className={`cj-dot cor-${t.cor}`}/> {t.nome}
                    </button>
                  ))}
                </div>
              </div>
              <div className="cj-field">
                <label>Título</label>
                <input type="text" value={form.titulo} placeholder="Ex.: Consulta inicial — trabalhista" onChange={e => set('titulo', e.target.value)}/>
              </div>
              <div className="cj-field">
                <label>Cliente</label>
                <input type="text" list="cj-clientes" value={form.cliente} placeholder="Buscar cliente…" onChange={e => set('cliente', e.target.value)}/>
                <datalist id="cj-clientes">
                  {clientes.map(c => <option key={c.id} value={c.nome}/>)}
                </datalist>
              </div>
            </>
          )}

          {isBloqueio && (
            <div className="cj-field">
              <label>Motivo do bloqueio</label>
              <input type="text" value={form.titulo} placeholder="Ex.: Almoço, Fórum, Indisponível" onChange={e => set('titulo', e.target.value)}/>
            </div>
          )}

          <div className="cj-field">
            <label>Advogado</label>
            <div className="cj-adv-select">
              {escritorio.advogados.map(a => (
                <button key={a.id} className={`cj-adv-opt ${form.advogado === a.id ? 'active' : ''}`} onClick={() => set('advogado', a.id)}>
                  <span className={`cj-dot cor-${a.cor}`}/> {a.nome.replace(/Dra?\.\s/, '')}
                </button>
              ))}
              {isBloqueio && (
                <button className={`cj-adv-opt ${form.advogado === 'all' ? 'active' : ''}`} onClick={() => set('advogado', 'all')}>Todos</button>
              )}
            </div>
          </div>

          <div className="cj-field-row">
            <div className="cj-field">
              <label>Data</label>
              <input type="date" value={form.data} onChange={e => set('data', e.target.value)}/>
            </div>
            <div className="cj-field">
              <label>Início</label>
              <input type="time" value={form.hora} onChange={e => set('hora', e.target.value)}/>
            </div>
            <div className="cj-field">
              <label>Duração</label>
              <select value={form.dur} onChange={e => set('dur', Number(e.target.value))}>
                {[15,30,45,60,90,120].map(n => <option key={n} value={n}>{n} min</option>)}
              </select>
            </div>
          </div>

          {!isBloqueio && (
            <>
              <div className="cj-field">
                <label>Modalidade / Local</label>
                <div className="cj-local-opts" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  {[
                    { id: 'Vídeo Chamada', label: '🎥 Vídeo Chamada', placeholder: 'Link da reunião (ex.: https://meet.google.com/abc... ou Zoom)' },
                    { id: 'Presencial', label: '🏢 Presencial', placeholder: 'Endereço / Sala (ex.: Sala de Reuniões 1 — Escritório Sul)' },
                    { id: 'Ligação', label: '📞 Ligação', placeholder: 'Número de telefone / celular para contato na ligação' },
                    { id: 'Externo', label: '📍 Externo / Diligência', placeholder: 'Endereço externo / Tribunal / Fórum / Cliente' }
                  ].map(l => (
                    <button
                      key={l.id}
                      type="button"
                      className={`cj-chip ${form.local === l.id ? 'active' : ''}`}
                      onClick={() => set('local', l.id)}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
                <div style={{ marginTop: '2px' }}>
                  <input
                    type="text"
                    value={form.localDetalhe || ''}
                    placeholder={
                      form.local === 'Vídeo Chamada' ? 'Link da vídeo chamada (ex.: https://meet.google.com/abc... ou Zoom)' :
                      form.local === 'Ligação' ? 'Número de telefone / celular para ligação' :
                      form.local === 'Externo' ? 'Local / Endereço externo (Fórum, Tribunal, Cliente...)' :
                      'Endereço ou Sala presencial no escritório (ex.: Sala 1)'
                    }
                    onChange={e => set('localDetalhe', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-2)',
                      background: 'var(--bg)',
                      color: 'var(--ink)',
                      fontSize: '13px'
                    }}
                  />
                  <span style={{ display: 'block', fontSize: '11.5px', color: 'var(--ink-3)', marginTop: '5px', lineHeight: '1.4' }}>
                    {form.local === 'Vídeo Chamada' && `💡 Este link ficará salvo no banco e será enviado automaticamente pela ${aiName} ao cliente nas mensagens de lembrete do agendamento.`}
                    {form.local === 'Presencial' && '💡 O endereço/sala presencial ficará registrado e será informado no lembrete de confirmação.'}
                    {form.local === 'Ligação' && '💡 O número salvo será utilizado no horário agendado para o contato telefônico.'}
                    {form.local === 'Externo' && '💡 Endereço completo ou referência para deslocamento/audiência externa.'}
                  </span>
                </div>
              </div>
              <div className="cj-field">
                <label>Observações</label>
                <textarea value={form.obs} placeholder="Anotações internas, documentos a levar…" onChange={e => set('obs', e.target.value)}/>
              </div>
            </>
          )}
        </div>

        <footer className="cj-modal-foot">
          {!isNovo ? (
            <button className="cj-btn ghost danger" onClick={() => onCancelar(compromisso)}>
              <Icon name="trash" size={13}/> {isBloqueio ? 'Remover bloqueio' : 'Cancelar compromisso'}
            </button>
          ) : <span/>}
          <div className="cj-modal-foot-right">
            <button className="cj-btn ghost" onClick={onClose}>Descartar</button>
            <button className="cj-btn" onClick={() => onSalvar({ ...compromisso, ...form, status: isBloqueio ? 'bloqueio' : (compromisso?.status && compromisso.status !== 'bloqueio' ? compromisso.status : 'confirmado') })}>
              {isNovo ? 'Criar' : 'Salvar alterações'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default EditorCompromisso;

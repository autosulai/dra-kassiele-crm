import React, { useState } from 'react';
import { Icon } from './Icon';
import { escritorio, configIA } from '../data/mockData';
import { supabase } from '../lib/supabase';

export const Config = ({ escritorioState, onUpdateEscritorio, aiName, onUpdateIA }) => {
  const esc = escritorioState || escritorio;
  const [tab, setTab] = useState('escritorio');
  const [toast, setToast] = useState(null);
  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };
  const tabs = [
    { id: 'escritorio', label: 'Escritório', icon: 'scale' },
    { id: 'ia', label: 'Agente IA', icon: 'bell' },
    { id: 'advogados', label: 'Advogados', icon: 'users' },
    { id: 'tipos', label: 'Catálogo de Serviços', icon: 'calendar' },
  ];
  return (
    <div className="cj-config">
      <header className="cj-head">
        <div>
          <h1>Configurações</h1>
          <p className="cj-sub">{esc.nome} · {esc.cidade}</p>
        </div>
      </header>
      <div className="cj-config-body">
        <nav className="cj-config-nav">
          {tabs.map(t => (
            <button key={t.id} className={`cj-config-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              <Icon name={t.icon} size={15}/><span>{t.label}</span>
            </button>
          ))}
        </nav>
        <div className="cj-config-content">
          {tab === 'escritorio' && <CfgEscritorio flash={flash} onUpdateEscritorio={onUpdateEscritorio} escritorioState={escritorioState}/>}
          {tab === 'ia' && <CfgIA flash={flash} escritorioState={escritorioState} onUpdateIA={onUpdateIA} aiName={aiName}/>}
          {tab === 'advogados' && <CfgAdvogados flash={flash} escritorioState={escritorioState} onUpdateEscritorio={onUpdateEscritorio}/>}
          {tab === 'tipos' && <CfgTipos flash={flash}/>}
        </div>
      </div>
      {toast && <div className="cj-toast"><Icon name="check" size={14}/> {toast}</div>}
    </div>
  );
};

function Toggle({ label, desc, on, onChange }) {
  return (
    <div className="cj-toggle">
      <div><b>{label}</b><span>{desc}</span></div>
      <button className={`cj-switch ${on ? 'on' : ''}`} onClick={() => onChange(!on)}><span/></button>
    </div>
  );
}

// Modal genérico de formulário
function CfgModal({ titulo, eyebrow, campos, valores, onClose, onSalvar, onExcluir, excluirLabel }) {
  const [form, setForm] = useState(valores);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="cj-modal-bg" onClick={onClose}>
      <div className="cj-modal" onClick={e => e.stopPropagation()}>
        <header className="cj-modal-head">
          <div>
            {eyebrow && <div className="cj-modal-eyebrow">{eyebrow}</div>}
            <h2>{titulo}</h2>
          </div>
          <button className="cj-modal-x" onClick={onClose}><Icon name="x" size={16}/></button>
        </header>
        <div className="cj-modal-body">
          {campos.map(c => (
            <div className="cj-field" key={c.k}>
              <label>{c.label}</label>
              {c.tipo === 'textarea'
                ? <textarea value={form[c.k] || ''} rows={c.rows || 4} onChange={e => set(c.k, e.target.value)} placeholder={c.ph}/>
                : c.tipo === 'select'
                ? <select value={form[c.k]} onChange={e => set(c.k, e.target.value)}>{c.opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}</select>
                : c.tipo === 'cor'
                ? <div className="cj-cor-pick">{['indigo','teal','amber','rose','slate'].map(cor => <button key={cor} className={`cj-cor-opt cor-${cor} ${form[c.k] === cor ? 'active' : ''}`} onClick={() => set(c.k, cor)}/>)}</div>
                : <input type={c.tipo || 'text'} value={form[c.k] || ''} onChange={e => set(c.k, c.tipo === 'number' ? Number(e.target.value) : e.target.value)} placeholder={c.ph}/>}
            </div>
          ))}
        </div>
        <footer className="cj-modal-foot">
          {onExcluir ? <button className="cj-btn ghost danger" onClick={onExcluir}><Icon name="trash" size={13}/> {excluirLabel || 'Excluir'}</button> : <span/>}
          <div className="cj-modal-foot-right">
            <button className="cj-btn ghost" onClick={onClose}>Cancelar</button>
            <button className="cj-btn" onClick={() => onSalvar(form)}>Salvar</button>
          </div>
        </footer>
      </div>
    </div>
  );
}

// ---------- Agente IA ----------
function CfgIA({ flash, escritorioState, onUpdateIA, aiName }) {
  const esc = escritorioState || escritorio;
  const [nome, setNome] = useState(configIA.nome);
  const [tom, setTom] = useState(configIA.tom);
  const [prompt, setPrompt] = useState(configIA.prompt);
  const [tg, setTg] = useState({ followup_automatico: configIA.followup_automatico ?? true, lembrete_evento: configIA.lembrete_evento ?? true, escalar_urgente: configIA.escalar_urgente ?? true, enviar_audios: configIA.enviar_audios ?? true, fora_horario: configIA.fora_horario ?? true });
  const [conhec, setConhec] = useState(configIA.conhecimento);
  const [modal, setModal] = useState(null);
  const setT = (k, v) => setTg(p => ({ ...p, [k]: v }));

  useEffect(() => {
    async function carregarDaBase() {
      if (!supabase) return;
      try {
        const { data: cfgList } = await supabase.from('config_ia').select('*').limit(1);
        if (cfgList && cfgList[0]) {
          const c = cfgList[0];
          if (c.nome_agente) setNome(c.nome_agente);
          if (c.tom_voz) setTom(c.tom_voz);
          if (c.prompt_sistema !== undefined && c.prompt_sistema !== null) {
            setPrompt(c.prompt_sistema);
            configIA.prompt = c.prompt_sistema;
          }
          setTg(p => ({
            ...p,
            followup_automatico: c.followup_automatico ?? true,
            lembrete_evento: c.lembrete_evento ?? true,
            escalar_urgente: c.escalar_urgente ?? true,
            enviar_audios: c.enviar_audios ?? true,
            fora_horario: c.fora_horario ?? true
          }));
        }
      } catch (err) {
        console.error('Erro ao carregar configurações de IA do Supabase:', err);
      }
    }
    carregarDaBase();
  }, []);

  const salvarIdentidade = async () => {
    const oldNomeIA = configIA.nome;
    if (configIA.prompt && oldNomeIA && configIA.prompt.includes(oldNomeIA) && oldNomeIA !== nome) {
      configIA.prompt = configIA.prompt.replaceAll(oldNomeIA, nome);
      setPrompt(configIA.prompt);
    }
    configIA.nome = nome; configIA.tom = tom;
    flash('Identidade salva');
    if (onUpdateIA) onUpdateIA({ nome, tom, prompt: configIA.prompt });
    if (supabase) {
      try {
        const { data: cfgList } = await supabase.from('config_ia').select('id').limit(1);
        if (cfgList && cfgList[0]) {
          await supabase.from('config_ia').update({ nome_agente: nome, tom_voz: tom, prompt_sistema: configIA.prompt }).eq('id', cfgList[0].id);
        } else {
          await supabase.from('config_ia').insert({ nome_agente: nome, tom_voz: tom, prompt_sistema: configIA.prompt });
        }
      } catch (err) { console.error('Erro ao salvar identidade no Supabase:', err); }
    }
  };

  const salvarPrompt = async () => {
    const promptLimitado = (prompt || '').slice(0, 3000);
    configIA.prompt = promptLimitado;
    if (prompt !== promptLimitado) setPrompt(promptLimitado);
    flash('Prompt salvo');
    if (onUpdateIA) onUpdateIA({ prompt: promptLimitado });
    if (supabase) {
      try {
        const { data: cfgList } = await supabase.from('config_ia').select('id').limit(1);
        if (cfgList && cfgList[0]) {
          await supabase.from('config_ia').update({ prompt_sistema: promptLimitado }).eq('id', cfgList[0].id);
        } else {
          await supabase.from('config_ia').insert({ nome_agente: nome || 'Sofia', tom_voz: tom || 'acolhedor', prompt_sistema: promptLimitado });
        }
      } catch (err) { console.error('Erro ao salvar prompt no Supabase:', err); }
    }
  };

  const salvarToggles = async (k, v) => {
    setT(k, v); configIA[k] = v;
    if (supabase) {
      try {
        const { data: cfgList } = await supabase.from('config_ia').select('id').limit(1);
        if (cfgList && cfgList[0]) {
          await supabase.from('config_ia').update({ [k]: v }).eq('id', cfgList[0].id);
        } else {
          await supabase.from('config_ia').insert({ nome_agente: nome || 'Sofia', tom_voz: tom || 'acolhedor', [k]: v });
        }
      } catch (err) { console.error('Erro ao salvar toggle no Supabase:', err); }
    }
  };

  return (
    <div className="cj-cfg-stack">
      <section className="cj-card">
        <div className="cj-card-head"><h3>Identidade do agente</h3><span className="cj-mini ok"><span className="cj-livedot"/> ativo</span></div>
        <div className="cj-field">
          <label>Nome do agente</label>
          <input type="text" value={nome} onChange={e => setNome(e.target.value)}/>
        </div>
        <div className="cj-field">
          <label>Tom de voz</label>
          <div className="cj-seg">
            {[['formal','Formal'],['profissional','Profissional'],['proximo','Próximo']].map(([id,l]) => (
              <button key={id} className={tom === id ? 'active' : ''} onClick={() => setTom(id)}>{l}</button>
            ))}
          </div>
        </div>
        <div className="cj-preview">
          <div className="cj-preview-bubble">Olá! 👋 Aqui é a {nome}, assistente do {esc.nome}. {tom === 'formal' ? 'Em que posso auxiliá-lo?' : tom === 'proximo' ? 'Como posso te ajudar hoje?' : 'Como posso ajudar com sua questão jurídica?'}</div>
        </div>
        <div className="cj-card-actions"><button className="cj-btn" onClick={salvarIdentidade}>Salvar identidade</button></div>
      </section>

      <section className="cj-card">
        <div className="cj-card-head"><h3>Comportamento da IA</h3></div>
        <div className="cj-cfg-toggles">
          {[
            ['followup_automatico', 'Cobrança automática de documentos',
             'A IA persegue quem parou de responder seguindo a cadência configurada. Desligar isto faz leads voltarem a ser esquecidos.'],
            ['lembrete_evento', 'Lembrete de perícia e exigência',
             'Avisa o cliente no WhatsApp antes da data. Faltar em perícia significa benefício negado.'],
            ['enviar_audios', 'Enviar áudios gravados pela Dra.',
             'Usa os áudios de honorários e de apresentação no lugar do texto, mantendo a naturalidade do atendimento.'],
            ['escalar_urgente', 'Escalar casos sensíveis',
             'Passa para atendimento humano quando o caso foge dos dois funis ou o cliente pede a advogada.'],
            ['fora_horario', 'Atender fora do horário',
             'A IA continua coletando documentos à noite e no fim de semana, sem prometer retorno humano imediato.'],
          ].map(([chave, titulo, ajuda]) => (
            <label key={chave} className="cj-cfg-toggle">
              <input
                type="checkbox"
                checked={!!tg[chave]}
                onChange={e => salvarToggles(chave, e.target.checked)}
              />
              <span>
                <b>{titulo}</b>
                <em>{ajuda}</em>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="cj-card">
        <div className="cj-card-head">
          <div>
            <h3>Ajustes Finos & Diretrizes (Prompt do Sistema)</h3>
            <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>Enviado dinamicamente para o fluxo da Sofia no n8n · Limite de 3.000 caracteres</span>
          </div>
          <button className="cj-btn ghost sm" onClick={() => { const lim = (configIA.prompt || '').slice(0, 3000); setPrompt(lim); flash('Prompt restaurado'); }}>
            Restaurar
          </button>
        </div>
        <p className="cj-card-p">Escreva aqui as diretrizes adicionais, regras ou ajustes finos que a advogada deseja acrescentar ao comportamento da Sofia no WhatsApp. Estas instruções são incorporadas automaticamente ao final do Prompt Principal no n8n em cada conversa.</p>
        <textarea
          className="cj-prompt"
          value={prompt || ''}
          maxLength={3000}
          onChange={e => setPrompt(e.target.value.slice(0, 3000))}
          rows={10}
          placeholder="Ex.: Solicite sempre o laudo médico com indicação de CID antes de avançar para a assinatura, evite enviar mensagens longas ou áudios após as 18h e priorize agendar perícias para o período da manhã."
        />
        <div className="cj-prompt-foot">
          <span style={{ color: (prompt || '').length >= 2800 ? 'var(--danger)' : 'var(--ink-3)', fontWeight: (prompt || '').length >= 2800 ? 600 : 400 }}>
            {(prompt || '').length} / 3.000 caracteres · ~{Math.ceil((prompt || '').length/4)} tokens
          </span>
          <button className="cj-btn" onClick={salvarPrompt}>Salvar prompt</button>
        </div>
      </section>

      <section className="cj-card">
        <div className="cj-card-head">
          <div>
            <h3>Base de conhecimento (RAG & Inteligência IA)</h3>
            <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>Documentos, PDFs e instruções indexadas para busca rápida pela {nome || configIA.nome || 'Sofia'}</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="cj-btn ghost sm" onClick={() => setModal({ novo: true, valores: { id: 'k' + Date.now(), tipo: 'texto', t: '', v: '' } })}>
              <Icon name="plus" size={12}/> Adicionar Texto
            </button>
            <button className="cj-btn sm" onClick={() => setModal({ novo: true, valores: { id: 'k' + Date.now(), tipo: 'doc', t: '', v: '', arquivo: null } })}>
              <Icon name="doc" size={12}/> Upload PDF/Doc
            </button>
          </div>
        </div>
        <div className="cj-know">
          {conhec.map((k, i) => (
            <div key={k.id || i} className="cj-know-row">
              <div style={{ flex: 1, minWidth: 0 }}>
                <b>
                  <Icon name={k.tipo === 'doc' ? 'doc' : 'folder'} size={14}/>
                  <span>{k.t || 'Sem título'}</span>
                  <span className="cj-know-badge">{k.tipo === 'doc' ? '📄 PDF/DOC · RAG' : '📝 Instrução'}</span>
                </b>
                <span>{k.v}</span>
                {k.arquivo && (
                  <div className="cj-know-file">
                    <Icon name="doc" size={13}/>
                    <span>{k.arquivo.nome}</span>
                    <em>({k.arquivo.tamanho || '1.2 MB'} · {k.arquivo.paginas || 5} págs)</em>
                    <span className="cj-chattag ok" style={{ marginLeft: 'auto' }}>✓ {k.arquivo.status || 'Indexado no pgvector'}</span>
                  </div>
                )}
              </div>
              <button className="cj-dia-edit" onClick={() => setModal({ idx: i, valores: { ...k } })} title="Editar ou visualizar documento">
                <Icon name="pencil" size={13}/>
              </button>
            </div>
          ))}
          {conhec.length === 0 && <div className="cj-empty-inline">Nenhum tópico ainda. Clique em Adicionar ou Upload para ensinar a IA.</div>}
        </div>
      </section>

      {modal && (
        <ModalConhecimento
          item={modal.valores}
          isNovo={modal.novo}
          onClose={() => setModal(null)}
          onExcluir={modal.novo ? null : () => {
            const next = conhec.filter((_, j) => j !== modal.idx);
            setConhec(next);
            configIA.conhecimento = next;
            setModal(null);
            flash('Conhecimento/Documento removido');
          }}
          onSalvar={(novoItem) => {
            let next;
            if (modal.novo) next = [novoItem, ...conhec];
            else next = conhec.map((x, j) => j === modal.idx ? novoItem : x);
            setConhec(next);
            configIA.conhecimento = next;
            setModal(null);
            flash('Base de conhecimento atualizada com sucesso!');
          }}
        />
      )}
    </div>
  );
}

// Modal Especializado para Base de Conhecimento RAG + Upload de Documentos
function ModalConhecimento({ item, isNovo, onClose, onSalvar, onExcluir }) {
  const [form, setForm] = useState(item || { tipo: 'doc', t: '', v: '', arquivo: null });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef(null);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleFileSelect = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    setTimeout(() => {
      const titleFromFileName = f.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
      setForm(prev => ({
        ...prev,
        tipo: 'doc',
        t: prev.t.trim() ? prev.t : titleFromFileName,
        arquivo: {
          nome: f.name,
          tamanho: (f.size / (1024 * 1024)).toFixed(1) + ' MB',
          paginas: Math.max(3, Math.ceil(f.size / 50000)),
          status: 'Indexado via Evolution/n8n',
          data: new Date().toLocaleDateString('pt-BR')
        }
      }));
      setUploading(false);
    }, 800);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.t?.trim()) {
      alert('O Título é obrigatório e muito importante para a busca rápida da IA.');
      return;
    }
    if (form.tipo === 'doc' && !form.arquivo) {
      alert('Por favor, faça o upload ou selecione um arquivo PDF/DOC para continuar.');
      return;
    }
    onSalvar(form);
  };

  return (
    <div className="cj-modal-bg" onClick={onClose}>
      <div className="cj-modal" onClick={e => e.stopPropagation()} style={{ width: 'min(580px, 96vw)' }}>
        <header className="cj-modal-head">
          <div>
            <div className="cj-modal-eyebrow">Inteligência da IA · {form.tipo === 'doc' ? 'RAG / PDF' : 'Regra / Texto'}</div>
            <h2>{isNovo ? 'Adicionar Novo Conhecimento' : 'Editar Conhecimento'}</h2>
          </div>
          <button className="cj-modal-x" onClick={onClose}><Icon name="x" size={16}/></button>
        </header>

        <form onSubmit={handleSubmit} className="cj-modal-body">
          <div className="cj-field">
            <label style={{ color: 'var(--accent)', fontSize: 11.5 }}>Título Prioritário / Palavra-Chave (⭐ Muito importante para a IA)</label>
            <input
              required
              placeholder="Ex: Checklist BPC-LOAS, Auxílio Doença, Tabela Honorários 30% no Êxito"
              value={form.t || ''}
              onChange={e => set('t', e.target.value)}
              style={{ fontWeight: 600, fontSize: 14 }}
            />
            <span style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 1 }}>
              O título exato e descritivo ajuda a IA (via Supabase pgvector) a localizar e priorizar rapidamente este conteúdo ao responder o lead no WhatsApp.
            </span>
          </div>

          <div className="cj-field">
            <label>Formato do Conhecimento</label>
            <div className="cj-tipo-grid">
              <button
                type="button"
                className={`cj-tipo-opt ${form.tipo === 'doc' ? 'active' : ''}`}
                onClick={() => set('tipo', 'doc')}
              >
                <Icon name="doc" size={15}/> <span>Documento / PDF (RAG)</span>
              </button>
              <button
                type="button"
                className={`cj-tipo-opt ${form.tipo === 'texto' ? 'active' : ''}`}
                onClick={() => set('tipo', 'texto')}
              >
                <Icon name="folder" size={15}/> <span>Texto / Instrução Direta</span>
              </button>
            </div>
          </div>

          {form.tipo === 'doc' ? (
            <div className="cj-field">
              <label>Arquivo Documento (.PDF, .DOCX ou .TXT)</label>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileSelect}
              />

              {!form.arquivo ? (
                <div className="cj-dropzone" onClick={() => fileInputRef.current?.click()}>
                  <div className="cj-dropzone-icon"><Icon name="doc" size={22}/></div>
                  <b>Clique ou arraste um arquivo PDF/DOC para enviar</b>
                  <span>A IA processa o texto do arquivo e indexa em vetores para consulta em tempo real durante os atendimentos</span>
                  {uploading && <span style={{ color: 'var(--accent)', fontWeight: 600 }}>⏳ Extraindo texto e processando no n8n...</span>}
                </div>
              ) : (
                <div className="cj-file-preview">
                  <div className="cj-file-preview-main">
                    <div className="cj-dropzone-icon" style={{ width: 38, height: 38 }}><Icon name="doc" size={18}/></div>
                    <div>
                      <b>{form.arquivo.nome}</b>
                      <span>{form.arquivo.tamanho} · {form.arquivo.paginas || 4} páginas · Indexação ativa</span>
                    </div>
                  </div>
                  <button type="button" className="cj-btn ghost sm" onClick={() => fileInputRef.current?.click()}>
                    Substituir arquivo
                  </button>
                </div>
              )}

              <div className="cj-field" style={{ marginTop: 8 }}>
                <label>Resumo ou Observações do Arquivo (Opcional)</label>
                <textarea
                  placeholder="Descreva o objetivo deste documento ou quando a IA deve utilizá-lo na conversa..."
                  value={form.v || ''}
                  onChange={e => set('v', e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          ) : (
            <div className="cj-field">
              <label>Conteúdo / Regra da Instrução</label>
              <textarea
                required={form.tipo === 'texto'}
                placeholder="Ex: Para triagem de Direito Previdenciário (INSS), identificar primeiro se o segurado contribui ou não antes de pedir documentos..."
                value={form.v || ''}
                onChange={e => set('v', e.target.value)}
                rows={5}
              />
            </div>
          )}
        </form>

        <footer className="cj-modal-foot">
          {onExcluir ? (
            <button type="button" className="cj-btn ghost danger" onClick={onExcluir}>
              <Icon name="trash" size={13}/> Excluir conhecimento
            </button>
          ) : <span/>}
          <div className="cj-modal-foot-right">
            <button type="button" className="cj-btn ghost" onClick={onClose}>Cancelar</button>
            <button type="button" className="cj-btn" onClick={handleSubmit}>
              <Icon name="check" size={14}/> Salvar Conhecimento
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

// ---------- Advogados ----------
// ---------- Advogados ----------
function CfgAdvogados({ flash, escritorioState, onUpdateEscritorio }) {
  const esc = escritorioState || escritorio;
  const [advs, setAdvs] = useState(() => esc.advogados || escritorio.advogados || []);
  const [acessos, setAcessos] = useState(() => {
    try {
      const salvas = localStorage.getItem('cj_acessos_painel');
      if (salvas) return JSON.parse(salvas);
    } catch(e){}
    return [
      { n: 'Helena Prado', e: 'helena@sulassociados.adv.br', r: 'Administrador' },
      { n: 'Rafael Motta', e: 'rafael@sulassociados.adv.br', r: 'Advogado' },
      { n: 'Camila Reis', e: 'camila@sulassociados.adv.br', r: 'Advogado' },
      { n: 'Recepção', e: 'recepcao@sulassociados.adv.br', r: 'Secretaria' },
    ];
  });
  const [modalAdv, setModalAdv] = useState(null);
  const [modalAcesso, setModalAcesso] = useState(null);
  const [menu, setMenu] = useState(null);

  const atualizarListaAdvs = (next) => {
    setAdvs(next);
    escritorio.advogados = next;
    if (onUpdateEscritorio) onUpdateEscritorio({ ...esc, advogados: next });
  };

  const atualizarListaAcessos = (next) => {
    setAcessos(next);
    try {
      localStorage.setItem('cj_acessos_painel', JSON.stringify(next));
    } catch(e){}
  };

  const salvarAdv = async (f) => {
    let next;
    let advId = modalAdv.valores?.id || 'a_' + Date.now();
    if (modalAdv.novo) {
      const novo = { ...f, id: advId };
      next = [...advs, novo];
    } else {
      next = advs.map(a => a.id === advId ? { ...a, ...f } : a);
    }
    atualizarListaAdvs(next);
    setModalAdv(null);
    flash('Advogado salvo com sucesso!');

    if (supabase) {
      try {
        const payload = {
          id: (!advId.startsWith('a') && advId.length > 10) ? advId : undefined,
          escritorio_id: esc.id || null,
          nome: f.nome,
          area: f.area || 'Previdenciário',
          oab: f.oab || '',
          cor: f.cor || 'indigo',
          ativo: true
        };
        if (!payload.id) delete payload.id;
        const { data, error } = await supabase.from('advogados').upsert(payload).select();
        if (data && data[0] && advId.startsWith('a')) {
          const reid = next.map(a => a.id === advId ? { ...a, id: data[0].id } : a);
          atualizarListaAdvs(reid);
        }
      } catch (err) {
        console.error('Erro ao salvar advogado no Supabase:', err);
      }
    }
  };

  const excluirAdv = async () => {
    const advId = modalAdv.valores.id;
    const next = advs.filter(a => a.id !== advId);
    atualizarListaAdvs(next);
    setModalAdv(null);
    flash('Advogado removido e desativado com sucesso!');

    if (supabase && advId && (!advId.startsWith('a') || advId.length > 10)) {
      try {
        await supabase.from('advogados').delete().eq('id', advId);
        // Ou desativa por segurança caso haja restrição de FK
        await supabase.from('advogados').update({ ativo: false }).eq('id', advId);
      } catch (err) {
        console.error('Erro ao excluir/desativar advogado no Supabase:', err);
      }
    }
  };

  return (
    <div className="cj-cfg-stack">
      <section className="cj-card">
        <div className="cj-card-head"><h3>Advogados do escritório</h3><button className="cj-btn" onClick={() => setModalAdv({ novo: true, valores: { nome: '', area: 'Previdenciário (INSS)', oab: '', cor: 'indigo' } })}><Icon name="plus" size={13}/> Novo advogado</button></div>
        <p className="cj-card-p">Cada advogado aparece na agenda e recebe os leads da sua área.</p>
        <div className="cj-adv-cards">
          {advs.map(a => (
            <div key={a.id} className="cj-adv-card">
              <div className="cj-adv-card-top">
                <div className={`cj-adv-av cor-${a.cor || 'indigo'}`}>{(a.nome || 'Adv').replace(/Dra?\.\s/, '').split(' ').slice(0,2).map(s => s[0]).join('')}</div>
                <div className="cj-adv-card-id">
                  <b>{a.nome}</b>
                  <span>{a.area} · {a.oab}</span>
                </div>
                <button className="cj-dia-edit" onClick={() => setModalAdv({ valores: { ...a } })}><Icon name="pencil" size={13}/></button>
              </div>
              <div className="cj-adv-card-foot">
                <span className="cj-mini ok"><span className="cj-livedot"/> ativo</span>
                <label className="cj-inline-color">Cor: <span className={`cj-dot cor-${a.cor || 'indigo'}`}/></label>
              </div>
            </div>
          ))}
          <button className="cj-adv-add" onClick={() => setModalAdv({ novo: true, valores: { nome: '', area: 'Previdenciário (INSS)', oab: '', cor: 'teal' } })}><span>+</span><span>Adicionar advogado</span></button>
        </div>
      </section>

      <section className="cj-card">
        <div className="cj-card-head"><h3>Acesso ao painel</h3><button className="cj-btn ghost sm" onClick={() => setModalAcesso({ novo: true, valores: { n: '', e: '', r: 'Advogado' } })}><Icon name="plus" size={12}/> Convidar</button></div>
        <div className="cj-cfg-table">
          <div className="cj-cfg-th"><span>Pessoa</span><span>E-mail</span><span>Permissão</span><span></span></div>
          {acessos.map((u, i) => (
            <div key={i} className="cj-cfg-tr">
              <span className="cj-cfg-pessoa"><span className="cj-cli-av sm">{u.n.split(' ').map(w=>w[0]).slice(0,2).join('')}</span> {u.n}</span>
              <span className="cj-muted">{u.e}</span>
              <span className="cj-cfg-role">{u.r}</span>
              <div className="cj-menu-wrap">
                <button className="cj-dia-edit" onClick={() => setMenu(menu === i ? null : i)}><Icon name="more" size={14}/></button>
                {menu === i && (
                  <div className="cj-menu" onMouseLeave={() => setMenu(null)}>
                    <button onClick={() => { setModalAcesso({ idx: i, valores: { ...u } }); setMenu(null); }}><Icon name="pencil" size={13}/> Editar acesso</button>
                    <button className="danger" onClick={() => { 
                      const next = acessos.filter((_, j) => j !== i); 
                      atualizarListaAcessos(next); 
                      setMenu(null); 
                      flash('Acesso removido com sucesso!'); 
                    }}><Icon name="trash" size={13}/> Remover</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {modalAdv && (
        <CfgModal
          eyebrow="advogado" titulo={modalAdv.novo ? 'Novo advogado' : 'Editar advogado'}
          campos={[
            { k: 'nome', label: 'Nome', ph: 'Ex.: Dra. Kassiele' },
            { k: 'area', label: 'Área de atuação', ph: 'Ex.: Previdenciário (INSS)' },
            { k: 'oab', label: 'OAB', ph: 'Ex.: OAB/RS 48.221' },
            { k: 'cor', label: 'Cor na agenda', tipo: 'cor' },
          ]}
          valores={modalAdv.valores}
          onClose={() => setModalAdv(null)}
          onExcluir={modalAdv.novo ? null : excluirAdv}
          excluirLabel="Remover advogado"
          onSalvar={salvarAdv}
        />
      )}
      {modalAcesso && (
        <CfgModal
          eyebrow="acesso ao painel" titulo={modalAcesso.novo ? 'Convidar pessoa' : 'Editar acesso'}
          campos={[
            { k: 'n', label: 'Nome', ph: 'Nome completo' },
            { k: 'e', label: 'E-mail', tipo: 'email', ph: 'email@escritorio.adv.br' },
            { k: 'r', label: 'Permissão', tipo: 'select', opts: [{v:'Administrador',l:'Administrador'},{v:'Advogado',l:'Advogado'},{v:'Secretaria',l:'Secretaria'},{v:'Leitura',l:'Leitura'}] },
          ]}
          valores={modalAcesso.valores}
          onClose={() => setModalAcesso(null)}
          onExcluir={modalAcesso.novo ? null : () => { 
            const next = acessos.filter((_, j) => j !== modalAcesso.idx); 
            atualizarListaAcessos(next); 
            setModalAcesso(null); 
            flash('Acesso removido com sucesso!'); 
          }}
          onSalvar={(f) => {
            let next;
            if (modalAcesso.novo) next = [...acessos, f];
            else next = acessos.map((x, j) => j === modalAcesso.idx ? f : x);
            atualizarListaAcessos(next);
            setModalAcesso(null); 
            flash(modalAcesso.novo ? 'Convite enviado' : 'Acesso atualizado');
          }}
        />
      )}
    </div>
  );
}

// ---------- Catálogo de Serviços ----------
function CfgTipos({ flash }) {
  const [tipos, setTipos] = useState(escritorio.tipos);
  const [modal, setModal] = useState(null);

  const salvarTipo = (f) => {
    let next;
    if (modal.novo) next = [...tipos, { ...f, id: 't' + Date.now() }];
    else next = tipos.map(t => t.id === modal.valores.id ? { ...t, ...f } : t);
    setTipos(next);
    escritorio.tipos = next;

    // Sincronizar automaticamente os serviços com a Base RAG da Sofia
    const resumoValores = next.map(x => `• ${x.nome} (${x.dur} min) | Honorários: ${x.valor || 'A combinar/sob consulta'}\n  Como funciona / Regras: ${x.descricao || 'Atendimento padrão conforme diretrizes gerais do escritório.'}`).join('\n\n');
    const itemTiposRAG = {
      id: 'k_tipos_valores',
      tipo: 'texto',
      t: 'Catálogo de Serviços Previdenciários e Regras de Atendimento para a IA',
      v: `Abaixo está o catálogo oficial dos serviços prestados pelo escritório Kassiele Advocacia e como a IA deve explicar cada um deles aos segurados no WhatsApp:\n\n${resumoValores}\n\nRegra para IA: Ao identificar o interesse ou necessidade do segurado em algum destes serviços ou etapas, siga rigorosamente a explicação de "Como funciona / Regras" cadastrada acima.`
    };

    const conhecimentoFiltrado = (configIA.conhecimento || []).filter(k => k.id !== 'k_tipos_valores' && !((k.t || '').toLowerCase().includes('catálogo de serviços previdenciários') || (k.t || '').toLowerCase().includes('valores cobrados por tipo de compromisso')));
    configIA.conhecimento = [itemTiposRAG, ...conhecimentoFiltrado];

    setModal(null);
    flash('✓ Serviço e instruções salvos! A IA já consulta essa descrição no RAG.');
  };

  return (
    <div className="cj-cfg-stack">
      <section className="cj-card">
        <div className="cj-card-head">
          <div>
            <h3>Catálogo de Serviços Previdenciários & Regras para a IA</h3>
            <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>Alimentação automática para consulta RAG nos atendimentos no WhatsApp</span>
          </div>
          <button className="cj-btn ghost sm" onClick={() => setModal({ novo: true, valores: { nome: '', valor: 'Gratuito (Análise de Direito)', dur: 30, cor: 'indigo', descricao: '' } })}>
            <Icon name="plus" size={12}/> Novo Serviço
          </button>
        </div>
        <p className="cj-card-p">Cada serviço definido abaixo alimenta a base de conhecimento RAG da Sofia. Ao clicar em editar, você pode detalhar <b>Como Funciona</b> cada etapa para que a IA explique exatamente com as suas palavras aos segurados.</p>
        <div className="cj-tipos-list">
          {tipos.map(t => (
            <div key={t.id} className="cj-tipo-row" style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'stretch' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className={`cj-dot cor-${t.cor}`}/>
                <b style={{ flex: 1, fontSize: 13.5 }}>{t.nome}</b>
                <span className="cj-know-badge" style={{ background: 'var(--bg-3)', color: 'var(--ink-2)', fontSize: 11 }}>
                  {t.valor || 'Sob consulta'}
                </span>
                <span className="cj-muted">{t.dur} min</span>
                <button className="cj-dia-edit" onClick={() => setModal({ valores: { ...t } })} title="Editar serviço e instruções para a IA">
                  <Icon name="pencil" size={12}/>
                </button>
              </div>
              {t.descricao && (
                <div style={{ fontSize: 12, color: 'var(--ink-3)', paddingLeft: 18, borderLeft: '2px solid var(--border)', lineHeight: 1.4 }}>
                  {t.descricao}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {modal && (
        <CfgModal
          eyebrow="catálogo de serviços & regras" titulo={modal.novo ? 'Novo Serviço Previdenciário' : 'Editar Serviço & Regras para a IA'}
          campos={[
            { k: 'nome', label: 'Nome do Serviço ou Etapa', ph: 'Ex.: Triagem Previdenciária Inicial, Análise de Laudo Médico' },
            { k: 'valor', label: 'Honorários / Custo Cobrado', ph: 'Ex.: Gratuito (Análise de Direito) · 30% sobre Êxito Final' },
            { k: 'dur', label: 'Prazo ou Duração Média (min/dias)', tipo: 'number', ph: '30' },
            { k: 'descricao', label: '💡 Como Funciona / Orientação para a IA (Consulta RAG)', tipo: 'textarea', rows: 4, ph: 'Explique em detalhes como funciona este serviço e como a IA deve orientar o segurado quando ele demonstrar interesse por este assunto no chat.' },
            { k: 'cor', label: 'Cor de destaque', tipo: 'cor' },
          ]}
          valores={modal.valores}
          onClose={() => setModal(null)}
          onExcluir={modal.novo ? null : () => { const next = tipos.filter(t => t.id !== modal.valores.id); setTipos(next); escritorio.tipos = next; setModal(null); flash('Serviço removido'); }}
          excluirLabel="Remover serviço"
          onSalvar={salvarTipo}
        />
      )}
    </div>
  );
}

// ---------- WhatsApp ----------
function CfgWhatsApp({ flash }) {
  const [qr, setQr] = useState(false);
  const [modelos, setModelos] = useState([
    { t: 'Saudação inicial', m: `Olá! 👋 Aqui é a ${configIA.nome || 'Sofia'}, assistente de atendimento do escritório Kassiele Advocacia (Direito Previdenciário / INSS). Como posso ajudar?` },
    { t: 'Confirmação 24h antes', m: 'Oi {nome}! Confirmando sua consulta de amanhã ({data}) às {hora} com {advogado}. Podemos confirmar?' },
    { t: 'Fora do horário', m: 'Olá! Nosso atendimento é de seg a sex, 9h–18h. Retornamos assim que abrirmos. 🙌' },
    { t: 'Escalou para humano', m: 'Vou te transferir para um de nossos advogados para avaliar seu caso, tudo bem? Um instante…' },
  ]);
  const [modal, setModal] = useState(null);

  return (
    <div className="cj-cfg-stack">
      <section className="cj-card">
        <div className="cj-card-head"><h3>Conexão WhatsApp</h3><span className="cj-mini ok"><span className="cj-livedot"/> conectado</span></div>
        <p className="cj-card-p">Instância da Evolution API que atende a linha do escritório.</p>
        <div className="cj-field inline"><label>Instância</label><code className="cj-code">sul-associados-01</code></div>
        <div className="cj-field inline"><label>Número</label><span>+55 51 3025-8080</span></div>
        <div className="cj-field inline"><label>Webhook</label><code className="cj-code">https://n8n.sulassociados.adv.br/webhook/whatsapp</code></div>
        {qr && (
          <div className="cj-qr">
            <svg viewBox="0 0 80 80" width="130" height="130">
              {Array.from({length:15}).map((_,r)=>Array.from({length:15}).map((_,c)=>((r*7+c*13+r*c)%5===0)?<rect key={r+'-'+c} x={5+c*5} y={5+r*5} width="4" height="4" fill="currentColor"/>:null))}
              <rect x="5" y="5" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2"/><rect x="60" y="5" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2"/><rect x="5" y="60" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <span>Escaneie em Aparelhos conectados no WhatsApp.</span>
          </div>
        )}
        <div className="cj-cfg-actions">
          <button className="cj-btn ghost" onClick={() => setQr(!qr)}>{qr ? 'Ocultar QR' : 'Ver QR Code'}</button>
          <button className="cj-btn ghost" onClick={() => flash('Reconectando à Evolution…')}>Reconectar</button>
          <button className="cj-btn ghost danger" onClick={() => flash('Instância desconectada')}>Desconectar</button>
        </div>
      </section>

      <section className="cj-card">
        <div className="cj-card-head"><h3>Mensagens automáticas</h3><button className="cj-btn ghost sm" onClick={() => setModal({ novo: true, valores: { t: '', m: '' } })}><Icon name="plus" size={12}/> Novo modelo</button></div>
        <p className="cj-card-p">Modelos usados pelo agente em momentos específicos. Variáveis: {'{nome}'}, {'{data}'}, {'{hora}'}, {'{advogado}'}.</p>
        <div className="cj-templates">
          {modelos.map((tm, i) => (
            <div key={i} className="cj-template">
              <div className="cj-template-head"><b>{tm.t}</b><button className="cj-dia-edit" onClick={() => setModal({ idx: i, valores: { ...tm } })}><Icon name="pencil" size={12}/></button></div>
              <div className="cj-template-msg">{tm.m}</div>
            </div>
          ))}
        </div>
      </section>

      {modal && (
        <CfgModal
          eyebrow="mensagem automática" titulo={modal.novo ? 'Novo modelo' : 'Editar modelo'}
          campos={[
            { k: 't', label: 'Nome do modelo', ph: 'Ex.: Saudação inicial' },
            { k: 'm', label: 'Mensagem', tipo: 'textarea', rows: 4, ph: 'Texto com variáveis {nome}…' },
          ]}
          valores={modal.valores}
          onClose={() => setModal(null)}
          onExcluir={modal.novo ? null : () => { setModelos(modelos.filter((_, j) => j !== modal.idx)); setModal(null); flash('Modelo removido'); }}
          onSalvar={(f) => {
            if (modal.novo) setModelos([...modelos, f]);
            else setModelos(modelos.map((x, j) => j === modal.idx ? f : x));
            setModal(null); flash('Modelo salvo');
          }}
        />
      )}
    </div>
  );
}

// ---------- Escritório & Inteligência da IA ----------
function CfgEscritorio({ flash, onUpdateEscritorio, escritorioState }) {
  const esc = escritorioState || escritorio;
  const [nome, setNome] = useState(esc.nome || '');
  const [cidade, setCidade] = useState(esc.cidade || '');
  const [endereco, setEndereco] = useState(esc.endereco || '');
  const [telefone, setTelefone] = useState(esc.telefone || '');
  const [email, setEmail] = useState(esc.email || '');
  const [horario, setHorario] = useState(esc.horario || '');
  const [logo, setLogo] = useState(esc.logo || null);
  const fileInputRef = React.useRef(null);

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUri = event.target.result;
      setLogo(dataUri);
      escritorio.logo = dataUri;
      if (onUpdateEscritorio) onUpdateEscritorio({ logo: dataUri });
      flash('Logo carregada e atualizada na barra lateral do painel!');
    };
    reader.readAsDataURL(file);
  };

  const salvarEscritorio = (e) => {
    e?.preventDefault();
    const oldNome = escritorio.nome;
    escritorio.nome = nome;
    escritorio.cidade = cidade;
    escritorio.endereco = endereco;
    escritorio.telefone = telefone;
    escritorio.email = email;
    escritorio.horario = horario;
    escritorio.logo = logo;

    // 1. Atualizar Prompt da IA com o nome e cidade corretos
    if (configIA.prompt && oldNome && configIA.prompt.includes(oldNome)) {
      configIA.prompt = configIA.prompt.replaceAll(oldNome, nome);
    } else if (!configIA.prompt.includes(nome)) {
      configIA.prompt = `Você é a ${configIA.nome || 'Sofia'}, assistente virtual do escritório ${nome}, em ${cidade}.\n\n` + configIA.prompt;
    }

    // 2. Atualizar ou alimentar a Base de Conhecimento RAG dinamicamente
    const novosItensRAG = [
      {
        id: 'k_esc_horario',
        tipo: 'texto',
        t: 'Horário de funcionamento e atendimento do escritório',
        v: `${horario || 'Segunda a sexta das 09:00 às 18:00'}. Sábados e domingos apenas plantão para urgências.`
      },
      {
        id: 'k_esc_end',
        tipo: 'texto',
        t: 'Endereço e localização do escritório',
        v: `${endereco || 'Endereço não informado'} (${cidade || 'RS'}).`
      },
      {
        id: 'k_esc_contato',
        tipo: 'texto',
        t: 'Telefones e e-mail de contato oficial',
        v: `Telefone / WhatsApp institucional: ${telefone || '+55 51 3000-0000'} · E-mail: ${email || 'contato@escritorio.com.br'}`
      }
    ];

    const conhecimentoFiltrado = (configIA.conhecimento || []).filter(item => {
      const tit = (item.t || '').toLowerCase();
      if (item.id && (item.id.startsWith('k_esc_') || item.id === 'k1')) return false;
      if (tit.startsWith('horário de funcionamento')) return false;
      if (tit.startsWith('endereço') || tit.startsWith('telefones')) return false;
      return true;
    });

    configIA.conhecimento = [...novosItensRAG, ...conhecimentoFiltrado];

    if (onUpdateEscritorio) {
      onUpdateEscritorio({
        nome, cidade, endereco, telefone, email, horario, logo
      });
    }

    flash('✓ Dados salvos! Logo, nome e cidade foram sincronizados com o painel e com a IA.');
  };

  return (
    <form onSubmit={salvarEscritorio} className="cj-cfg-stack">
      <section className="cj-card" style={{ border: '1px solid var(--accent-3)', background: 'linear-gradient(to bottom right, var(--surface), var(--accent-2))' }}>
        <div className="cj-card-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent)', color: 'white', display: 'grid', placeItems: 'center' }}>
              <Icon name="zap" size={18}/>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, color: 'var(--ink)' }}>Alimentação Automática da IA & RAG</h3>
              <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>Conexão direta com {configIA.nome || 'Sofia'} (Agente no WhatsApp) e Base pgvector</span>
            </div>
          </div>
          <span className="cj-mini ok"><span className="cj-livedot"/> Sincronização em tempo real</span>
        </div>
        <p className="cj-card-p" style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5, marginTop: 4 }}>
          Todas as alterações feitas no nome, endereço, telefone, e-mail e horário nesta tela são <b>injetadas instantaneamente no Prompt de Identidade</b> e na <b>Base de Conhecimento RAG</b> do seu agente no n8n. Quando qualquer lead no WhatsApp perguntar onde fica o escritório ou se está aberto, a IA responderá com precisão absoluta usando os dados atualizados abaixo!
        </p>
      </section>

      <section className="cj-card">
        <div className="cj-card-head">
          <h3>Identidade Visual & Foto da Logo</h3>
          <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>Aparece na barra lateral do painel e relatórios</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '12px 0' }}>
          <div style={{
            width: 76, height: 76, borderRadius: 18, border: '2px dashed var(--border-2)',
            background: 'var(--bg)', display: 'grid', placeItems: 'center', overflow: 'hidden', flexShrink: 0
          }}>
            {logo ? (
              <img src={logo} alt="Logo preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--ink-4)' }}>
                <Icon name="scale" size={26}/>
                <span style={{ display: 'block', fontSize: 10, marginTop: 2 }}>Sem logo</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="image/*"
              onChange={handleLogoUpload}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="cj-btn sm" onClick={() => fileInputRef.current?.click()}>
                <Icon name="doc" size={13}/> {logo ? 'Trocar foto da logo' : 'Fazer upload da logo'}
              </button>
              {logo && (
                <button type="button" className="cj-btn ghost danger sm" onClick={() => { setLogo(null); flash('Logo removida'); }}>
                  Remover
                </button>
              )}
            </div>
            <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
              Recomendado: formato PNG, JPG ou WebP de alta qualidade. Formato quadrado ou horizontal.
            </span>
          </div>
        </div>
      </section>

      <section className="cj-card">
        <div className="cj-card-head">
          <h3>Informações de Contato e Localização</h3>
          <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>Dados que alimentam a IA no atendimento</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
          <div className="cj-field">
            <label>Nome Oficial do Escritório</label>
            <input required type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Kassiele Advocacia Previdenciária"/>
          </div>

          <div className="cj-field">
            <label>Cidade e Estado (Subtítulo)</label>
            <input required type="text" value={cidade} onChange={e => setCidade(e.target.value)} placeholder="Ex: Porto Alegre · RS"/>
          </div>

          <div className="cj-field">
            <label>Telefone / WhatsApp Institucional</label>
            <input required type="text" value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="Ex: +55 51 3025-8080"/>
          </div>

          <div className="cj-field">
            <label>E-mail de Contato / Recepção</label>
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Ex: contato@escritorio.adv.br"/>
          </div>
        </div>

        <div className="cj-field" style={{ marginTop: 14 }}>
          <label>Endereço Completo do Escritório</label>
          <input required type="text" value={endereco} onChange={e => setEndereco(e.target.value)} placeholder="Ex: Av. Borges de Medeiros, 1200 · sala 45 · Centro Histórico, Porto Alegre/RS"/>
        </div>

        <div className="cj-field" style={{ marginTop: 14 }}>
          <label>Horário de Funcionamento e Plantão</label>
          <textarea
            rows={2}
            value={horario}
            onChange={e => setHorario(e.target.value)}
            placeholder="Ex: Segunda a sexta das 09:00 às 18:00. Sábado e domingo apenas plantão para urgências."
          />
        </div>

        <div className="cj-card-actions">
          <button type="submit" className="cj-btn">
            <Icon name="check" size={14}/> Salvar Escritório e Sincronizar IA
          </button>
        </div>
      </section>
    </form>
  );
}

function CfgIntegracoes({ flash, onUpdateEscritorio, escritorioState }) {
  const esc = escritorioState || escritorio;
  const chatwootUrl = import.meta.env.VITE_CHATWOOT_URL;

  const salvarIntegracoes = (e) => {
    e.preventDefault();
    flash('As configurações do Chatwoot agora são gerenciadas via variáveis de ambiente (.env)!');
  };

  return (
    <form onSubmit={salvarIntegracoes} className="cj-cfg-stack">
      <section className="cj-card" style={{ border: '1px solid var(--accent-3)', background: 'linear-gradient(to bottom right, var(--surface), var(--accent-2))' }}>
        <div className="cj-card-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent)', color: 'white', display: 'grid', placeItems: 'center' }}>
              <Icon name="sparkles" size={18}/>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, color: 'var(--ink)' }}>Integração Chatwoot Embutida no CRM</h3>
              <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>Atendimento Omnichannel da Evolution API com IA ao lado</span>
            </div>
          </div>
          <span className="cj-mini ok"><span className="cj-livedot"/> Ativo via .env</span>
        </div>
        <p className="cj-card-p" style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5, marginTop: 4 }}>
          A integração com o Chatwoot está habilitada através do arquivo <b>.env</b> por questões de segurança.
        </p>

        <div className="cj-field" style={{ marginTop: 14 }}>
          <label>URL Configurada (Apenas Leitura)</label>
          <input
            type="text"
            value={chatwootUrl || 'Não configurada no .env'}
            disabled
            style={{ fontFamily: 'monospace', fontSize: 13, background: 'var(--bg)', color: 'var(--ink-3)', cursor: 'not-allowed' }}
          />
        </div>

        <div className="cj-card-actions" style={{ marginTop: 16 }}>
          <a
            href={chatwootUrl || '#'}
            target="_blank"
            rel="noreferrer"
            className="cj-btn ghost"
            style={{ textDecoration: 'none' }}
          >
            <Icon name="external" size={14}/> Testar Abrindo em Nova Aba
          </a>
        </div>
      </section>
    </form>
  );
}

export default Config;

import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { Funil } from './components/Funil';
import { Prazos } from './components/Prazos';
import { Chat } from './components/Chat';
import { Clientes } from './components/Clientes';
import { Processos } from './components/Processos';
import { Config } from './components/Config';
import { Dashboard } from './components/Dashboard';
import { clientes, escritorio, casos, configIA, TAGS_DISPONIVEIS } from './data/mockData';
import { supabase } from './lib/supabase';
import { loadAllCRMData } from './lib/supabaseService';
import { abrirConversas, abrirConversaChatwoot } from './lib/chatwootService';

export function App() {
  const [view, setView] = useState(() => localStorage.getItem('cj_view') || 'funil');
  const [escritorioState, setEscritorioState] = useState({ ...escritorio });
  const [configIAState, setConfigIAState] = useState({ ...configIA });
  const [clientesList, setClientesList] = useState(clientes);
  const [casosList, setCasosList] = useState(casos);
  const [tagsLista, setTagsLista] = useState(TAGS_DISPONIVEIS);
  const [autoOpenNovaPrazo, setAutoOpenNovaPrazo] = useState(false);

  const handleAddTag = (novaTag) => {
    if (!TAGS_DISPONIVEIS.some(t => t.id === novaTag.id)) {
      TAGS_DISPONIVEIS.push(novaTag);
    }
    setTagsLista(prev => prev.some(t => t.id === novaTag.id) ? prev : [...prev, novaTag]);
  };

  const sidebarStats = useMemo(() => {
    const leads = clientesList.filter(c => c.status === 'lead' || c.origem?.includes('Funil')).length;
    const clientes = clientesList.filter(c => c.status !== 'lead' && !c.origem?.includes('Funil')).length;
    const processos = casosList.length;
    return { leads, clientes, processos };
  }, [clientesList, casosList]);

  const refreshData = async () => {
    const data = await loadAllCRMData();
    if (data) {
      setEscritorioState(data.escritorio);
      if (data.configIA) {
        Object.assign(configIA, data.configIA);
        setConfigIAState({ ...configIA });
      }
      setClientesList(data.clientes);
      if (data.casos) {
        setCasosList(data.casos);
        casos.length = 0;
        casos.push(...data.casos);
      }
    }
  };

  const handleUpdateCasos = (novosCasos) => {
    setCasosList(novosCasos);
    casos.length = 0;
    casos.push(...novosCasos);
  };

  useEffect(() => {
    refreshData();

    // Inscrição Realtime no Supabase (conversas e mensagens_chat removidas — agora gerenciadas pelo Chatwoot)
    if (supabase) {
      const channel = supabase.channel('crm-realtime-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'eventos_processuais' }, () => {
          refreshData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
          refreshData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'checklist_documentos' }, () => {
          refreshData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes' }, () => {
          refreshData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'atividade_agente' }, () => {
          refreshData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'config_ia' }, () => {
          refreshData();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, []);

  const updateEscritorio = async (novo) => {
    Object.assign(escritorio, novo);
    setEscritorioState({ ...escritorio });
    if (supabase && escritorioState.id) {
      await supabase.from('escritorio').update(novo).eq('id', escritorioState.id);
    }
  };

  useEffect(() => {
    localStorage.setItem('cj_view', view);
  }, [view]);

  // Função para converter/cadastrar um Lead do Chatwoot no CRM (Aba Clientes)
  const converterCliente = async (conversa, dadosCRM) => {
    const novoId = 'c_' + Date.now();
    const novoCliente = {
      id: novoId,
      nome: dadosCRM?.nome || conversa.nome,
      tipo: dadosCRM?.tipo || 'PF',
      doc: dadosCRM?.cpf || conversa.cpf || '—',
      tel: conversa.tel,
      email: dadosCRM?.email || conversa.email || '—',
      advogado: dadosCRM?.advogado || conversa.advogado || 'a1',
      area: dadosCRM?.area || 'Previdenciário',
      casos: 0,
      status: 'ativo',
      desde: new Date().toISOString().slice(0, 10),
      origem: 'WhatsApp · Chatwoot',
    };

    setClientesList(prev => [...prev, novoCliente]);
    clientes.push(novoCliente);

    if (supabase) {
      try {
        await supabase.from('clientes').insert({
          nome: novoCliente.nome,
          tipo: novoCliente.tipo,
          doc_cpf_cnpj: novoCliente.doc,
          telefone: novoCliente.tel,
          email: novoCliente.email,
          area: novoCliente.area,
          status: 'ativo',
          origem: novoCliente.origem
        }).select().single();
      } catch (err) {
        console.error('Erro ao converter cliente no Supabase:', err);
      }
    }

    return novoCliente;
  };

  const updateConfigIA = (novo) => {
    Object.assign(configIA, novo);
    setConfigIAState({ ...configIA });
  };

  const [crmTarget, setCrmTarget] = useState(null);
  const [prazosTarget, setPrazosTarget] = useState(null);

  const handleGoToChat = (leadOrClient) => {
    const tel = leadOrClient?.telefone || leadOrClient?.tel;
    if (tel) {
      abrirConversaChatwoot(tel, (msg) => console.log('Chatwoot:', msg));
    } else {
      abrirConversas((msg) => console.log('Chatwoot:', msg));
    }
  };

  const handleGoToCRM = (target) => {
    setCrmTarget(target);
    setView('clientes');
  };

  const handleUpdateCliente = async (clienteAtualizado) => {
    setClientesList(prev => prev.map(c => c.id === clienteAtualizado.id ? clienteAtualizado : c));

    if (supabase && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clienteAtualizado.id)) {
      try {
        await supabase.from('clientes').update({ tag: clienteAtualizado.tag }).eq('id', clienteAtualizado.id);
      } catch (err) {
        console.error('Erro ao sincronizar tag de cliente no Supabase:', err);
      }
    }
  };

  const handleGoToPrazos = (target, acao) => {
    if (acao === 'atualizar_cliente') {
      handleUpdateCliente(target);
      return;
    }
    setPrazosTarget(target);
    setView('prazos');
  };

  const aiName = configIAState.nome || 'Sofia';

  return (
    <div className="cj-app">
      <Sidebar view={view} setView={setView} onNew={() => { setView('prazos'); setAutoOpenNovaPrazo(true); }} escritorioState={escritorioState} sidebarStats={sidebarStats}/>
      <main className="cj-main">
        {view === 'dashboard' && (
          <Dashboard
            clientesList={clientesList}
            casosList={casosList}
            onGoToChat={handleGoToChat}
            onGoToCRM={handleGoToCRM}
            onGoToFunil={() => setView('funil')}
            onGoToPrazos={handleGoToPrazos}
          />
        )}
        {view === 'funil' && (
          <Funil onGoToChat={handleGoToChat} />
        )}
        {view === 'prazos' && (
          <Prazos 
            clientesList={clientesList} 
            casosList={casosList} 
            advogados={escritorioState?.advogados || []}
            targetClient={prazosTarget}
            autoOpenNew={autoOpenNovaPrazo}
            onAutoOpenEnd={() => setAutoOpenNovaPrazo(false)}
          />
        )}
        {view === 'chat' && (
          <Chat
            clientes={clientesList}
            onConverterCliente={converterCliente}
            onGoToCRM={handleGoToCRM}
            onGoToPrazos={handleGoToPrazos}
            aiName={aiName}
            tagsLista={tagsLista}
            onAddTag={handleAddTag}
            escritorioState={escritorioState}
          />
        )}
        {view === 'clientes' && (
          <Clientes
            clientesList={clientesList}
            casosList={casosList}
            onUpdateCasos={handleUpdateCasos}
            onEdit={handleGoToPrazos}
            onUpdateCliente={handleUpdateCliente}
            targetClient={crmTarget}
            aiName={aiName}
            tagsLista={tagsLista}
            onAddTag={handleAddTag}
          />
        )}
        {view === 'casos' && (
          <Processos
            casosList={casosList}
            clientesList={clientesList}
            onUpdateCasos={handleUpdateCasos}
          />
        )}
        {view === 'config' && (
          <Config 
            escritorioState={escritorioState} 
            onUpdateEscritorio={updateEscritorio}
            aiName={aiName}
            onUpdateIA={updateConfigIA}
          />
        )}
      </main>
    </div>
  );
}

export default App;

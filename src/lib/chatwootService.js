// ─────────────────────────────────────────────────────────────────────────────
//  chatwootService.js
//  Abre o Chatwoot a partir do CRM sem depender de iframe.
//  - chatwootInboxUrl(): URL da caixa de entrada configurada (.env)
//  - abrirConversas():    abre a caixa de entrada em nova guia
//  - abrirConversaChatwoot(telefone, flash):
//        tenta resolver, via API do Chatwoot, a conversa daquele telefone e
//        abre direto nela. Se a API falhar (CORS, sem token, não encontrado),
//        cai no fallback: abre a caixa de entrada e copia o número para colar.
// ─────────────────────────────────────────────────────────────────────────────

const soDigitos = (s) => (s || '').replace(/\D/g, '');

export function chatwootInboxUrl() {
  return import.meta.env.VITE_CHATWOOT_URL || '';
}

// Extrai origin + accountId a partir da URL da inbox (ex.: .../accounts/1/inbox/4)
function baseChatwoot() {
  const url = chatwootInboxUrl();
  if (!url) return null;
  try {
    const u = new URL(url);
    const m = url.match(/accounts\/(\d+)/);
    const accountId = m ? m[1] : (import.meta.env.VITE_CHATWOOT_ACCOUNT_ID || '1');
    return { origin: u.origin, accountId };
  } catch {
    return null;
  }
}

export function abrirConversas(flash) {
  const url = chatwootInboxUrl();
  if (!url) { flash && flash('Configure a URL do Chatwoot em Configurações → Integrações'); return; }
  window.open(url, 'chatwoot_inbox', 'noopener,noreferrer');
  flash && flash('Abrindo a caixa de entrada do Chatwoot…');
}

export async function abrirConversaChatwoot(telefone, flash) {
  const info = baseChatwoot();
  const token = import.meta.env.VITE_CHATWOOT_TOKEN;
  const digits = soDigitos(telefone);

  // Abre a aba já no clique (evita bloqueio de pop-up) e navega depois.
  const win = window.open('', 'chatwoot_inbox');

  const fallback = (msg) => {
    const url = chatwootInboxUrl();
    if (win) win.location = url; else window.open(url, 'chatwoot_inbox');
    if (digits) { try { navigator.clipboard?.writeText(digits); } catch {} }
    flash && flash(msg || 'Abri o Chatwoot — número copiado, é só colar na busca.');
  };

  if (!info || !token || !digits) { fallback(); return; }

  try {
    const headers = { api_access_token: token };
    // 1) acha o contato pelo telefone
    const rc = await fetch(
      `${info.origin}/api/v1/accounts/${info.accountId}/contacts/search?q=${encodeURIComponent(digits)}`,
      { headers }
    );
    if (!rc.ok) throw new Error('search falhou');
    const jc = await rc.json();
    const contato = jc?.payload?.[0];
    if (!contato) { fallback('Contato ainda não existe no Chatwoot — abri a caixa de entrada.'); return; }

    // 2) acha a conversa mais recente do contato
    const rk = await fetch(
      `${info.origin}/api/v1/accounts/${info.accountId}/contacts/${contato.id}/conversations`,
      { headers }
    );
    if (!rk.ok) throw new Error('conversations falhou');
    const jk = await rk.json();
    const conv = jk?.payload?.[0];
    const convId = conv?.id || conv?.messages?.[0]?.conversation_id;

    if (convId) {
      const dest = `${info.origin}/app/accounts/${info.accountId}/conversations/${convId}`;
      if (win) win.location = dest; else window.open(dest, 'chatwoot_inbox');
      flash && flash('Abrindo a conversa do cliente no Chatwoot…');
      return;
    }
    fallback('Contato sem conversa aberta — abri a caixa de entrada.');
  } catch {
    // Erro de rede/CORS: degrada para a caixa de entrada + número copiado.
    fallback();
  }
}

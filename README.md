# CRM Jurídico — Painel de Agendamentos

Painel autônomo de **CRM e agenda para escritórios de advocacia**. Controle de compromissos (consultas, reuniões, audiências, prazos), bloqueio de agenda, clientes e processos. Feito para ser **configurado por cliente** (um painel por escritório) e conectado a **n8n + Supabase**.

> Projeto independente. Não faz parte do SaaS AutoSul — é uma base isolada para instâncias individuais.

---

## Como rodar

Servidor estático (os componentes carregam via `fetch`, então **não** use `file://`):

```bash
npx serve crm-juridico
# ou, dentro da pasta:
cd crm-juridico && python3 -m http.server 5173
```

Abra a porta indicada. Sem build step — React 18 + Babel Standalone via CDN.

---

## Estrutura

```
crm-juridico/
├── index.html
├── styles.css
├── components/
│   ├── data.jsx        # dados mock (SUBSTITUIR por Supabase)
│   ├── shell.jsx       # sidebar + ícones
│   ├── agenda.jsx      # agenda dia/semana/mês
│   ├── editor.jsx      # modal criar/editar/remarcar/cancelar/bloquear
│   ├── chat.jsx        # inbox ao vivo do WhatsApp (Evolution)
│   ├── config.jsx      # configurações: agente IA, advogados, tipos, WhatsApp
│   ├── clients.jsx     # CRM de clientes + processos
│   └── app.jsx         # estado + roteamento de views
└── README.md
```

---

## O que o painel faz

- **Agenda** dia / semana / mês, filtrável por advogado.
- **Novo compromisso** — tipo (consulta, reunião, audiência, prazo, atendimento), cliente, advogado, data/hora, duração, local, observações.
- **Bloquear horário** — indisponibilidade (almoço, fórum, etc.), por advogado ou para todos.
- **Editar / remarcar / cancelar** — clique num compromisso abre o editor.
- **Clientes (CRM)** — PF/PJ, busca, filtros, detalhe com contato, próximos compromissos e processos.
- **Processos** — lista com número CNJ, área, fase e próximo prazo.
- **Chat** — inbox ao vivo do WhatsApp: acompanha as conversas da IA com os leads, assume/devolve a conversa e responde manualmente.
- **Configurações** — agente de IA (nome, tom, prompt, comportamentos, base de conhecimento), cadastro de advogados e acessos, tipos de compromisso e horários, e conexão WhatsApp (instância Evolution + modelos de mensagem).

Todas as ações operam em estado local (mock). O ponto de integração está em `app.jsx` (`salvar`, `cancelar`) e nas leituras em `data.jsx`.

---

## Chat ao vivo (Evolution API)

A aba **Chat** exibe as conversas do WhatsApp em tempo real. Os dados em `components/data.jsx` (`conversas`) são mock — substitua pela leitura da Evolution API / Supabase:

- **Recebimento:** o n8n recebe o webhook `messages.upsert` da Evolution, grava em `mensagens`/`conversas` no Supabase; o painel faz *subscribe* (Supabase Realtime) e atualiza a lista.
- **Assumir / devolver:** os botões “Assumir conversa” / “Devolver à IA” alteram `conversas.status` (`bot` ↔ `humano`). Quando `humano`, o n8n **não** deixa a IA responder aquela conversa.
- **Envio manual:** o compositor envia via Evolution (`POST /message/sendText`) e grava a mensagem com `de='humano'`.

Schema sugerido:
```sql
create type conversa_status as enum ('bot','humano');
create table conversas (
  id uuid primary key default gen_random_uuid(),
  contato_tel text not null,          -- E.164
  contato_nome text,
  cliente_id uuid references clientes(id),
  status conversa_status default 'bot',
  ultima_msg text,
  ultima_em timestamptz,
  nao_lidas int default 0
);
create table mensagens (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid references conversas(id) on delete cascade,
  de text check (de in ('lead','bot','humano')),
  corpo text,
  enviada_em timestamptz default now()
);
```

---

## Configurações (o que é editado)

A aba **Configurações** grava em tabelas próprias; o n8n lê esses valores em cada conversa:

| Seção | Grava em | Usado por |
|---|---|---|
| **Agente IA** (nome, tom, prompt, comportamentos, conhecimento) | `config_ia` (1 linha) + `conhecimento` | Prompt do agente no n8n |
| **Advogados** (nome, área, OAB, cor) + acessos | `advogados`, `usuarios` | Agenda e roteamento de leads por área |
| **Tipos & horários** | `tipos_compromisso`, `horarios` | Disponibilidade que a IA oferece |
| **WhatsApp** (instância, webhook, modelos) | `whatsapp_config`, `modelos_msg` | Conexão Evolution + mensagens automáticas |

```sql
create table config_ia (
  id int primary key default 1,
  agente_nome text default 'Sofia',
  tom text default 'profissional',
  system_prompt text,
  auto_agendar boolean default true,
  confirmar_24h boolean default true,
  escalar_urgente boolean default true,
  fora_horario boolean default true
);
```

---

## Integração com Supabase

Substitua os arrays de `components/data.jsx` por leituras do Supabase. Sugestão de schema (uma instância por escritório, então **não precisa de multi-tenant** — cada painel aponta para seu próprio projeto/schema):

```sql
create table advogados (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  area text,
  oab text,
  cor text default 'indigo',
  ativo boolean default true
);

create table clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text check (tipo in ('PF','PJ')),
  documento text,               -- CPF ou CNPJ
  telefone text,                -- E.164, usado pelo WhatsApp
  email text,
  advogado_id uuid references advogados(id),
  area text,
  origem text,                  -- Site, Indicação, WhatsApp…
  status text default 'ativo',  -- lead | ativo | encerrado
  criado_em timestamptz default now()
);

create table processos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id) on delete cascade,
  advogado_id uuid references advogados(id),
  titulo text not null,
  numero text,                  -- número CNJ
  area text,
  fase text,                    -- Inicial, Instrução, Recursal, Execução…
  status text default 'ativo',
  proximo_prazo date
);

create type compromisso_status as enum
  ('pendente','confirmado','em_andamento','concluido','cancelado','bloqueio');

create table compromissos (
  id uuid primary key default gen_random_uuid(),
  advogado_id uuid references advogados(id),  -- null = todos (bloqueio geral)
  cliente_id uuid references clientes(id),    -- null em bloqueios
  processo_id uuid references processos(id),  -- opcional
  tipo text,                    -- consulta | reuniao | audiencia | prazo | atendimento | bloqueio
  titulo text,
  inicio timestamptz not null,
  fim timestamptz not null,
  local text,
  status compromisso_status default 'confirmado',
  observacoes text,
  criado_em timestamptz default now()
);

-- índice para as visões da agenda e checagem de conflito
create index compromissos_adv_inicio on compromissos (advogado_id, inicio)
  where status <> 'cancelado';
```

### Leitura no front
Troque em `data.jsx` (ou crie um `api.jsx`):
```js
const { data: compromissos } = await supabase
  .from('compromissos')
  .select('*, cliente:clientes(nome), advogado:advogados(nome,cor)')
  .gte('inicio', inicioDoDia).lt('inicio', fimDoDia)
  .order('inicio');
```

### Escrita
Em `app.jsx`, `salvar()` e `cancelar()` fazem hoje `setItems(...)`. Aponte para o Supabase:
```js
// criar / editar
await supabase.from('compromissos').upsert(payload);
// cancelar
await supabase.from('compromissos').update({ status: 'cancelado' }).eq('id', id);
```

**Conflito de horário:** antes de inserir, verifique sobreposição do mesmo `advogado_id`
(`inicio < novo.fim` e `fim > novo.inicio`, `status <> 'cancelado'`).

---

## Integração com n8n (WhatsApp)

O painel é a interface humana; o n8n cuida da automação por WhatsApp (Evolution API + OpenAI), lendo/escrevendo nas mesmas tabelas.

Fluxos sugeridos:

| Workflow | Gatilho | Ação |
|---|---|---|
| **Agendamento pelo WhatsApp** | Webhook Evolution (`messages.upsert`) | Agente identifica o cliente, checa disponibilidade do advogado e cria `compromissos`. |
| **Confirmação de compromisso** | Cron diário | Envia lembrete 24h antes de consultas/reuniões/audiências. |
| **Alerta de prazo** | Cron diário | Avisa o advogado (WhatsApp) sobre `processos.proximo_prazo` próximo. |
| **Aviso de remarcação/cancelamento** | Webhook do app (Supabase → n8n) | Quando o painel altera um compromisso, notifica o cliente. |

### Endpoints sugeridos (Next.js ou Edge Function)
Protegidos por um segredo compartilhado (`x-n8n-secret`):

```
POST /api/n8n/disponibilidade   → horários livres de um advogado numa data
POST /api/n8n/compromissos      → criar (agendar)
PATCH /api/n8n/compromissos     → remarcar / cancelar
GET  /api/n8n/compromissos      → listar por cliente/telefone
```

O agente resolve o cliente pelo `telefone` (E.164). Cada painel/instância aponta para
seu próprio projeto Supabase e sua própria instância Evolution — não há mistura entre escritórios.

---

## Personalização por cliente

Ao criar um painel novo para um escritório, ajuste em `components/data.jsx`:
- `escritorio.nome`, `escritorio.cidade`
- `escritorio.advogados` (nome, área, OAB, cor)
- `escritorio.tipos` (tipos de compromisso e durações)

E conecte as credenciais do Supabase/n8n daquele cliente.

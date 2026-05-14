# Alto Valor FC — Sorteador de Times

App de sorteio de times de futebol/racha com **votação pós-baba**. Frontend estático + backend serverless (Cloudflare Pages Functions + D1).

## Stack
- **Frontend**: HTML5 + CSS3 + JavaScript vanilla (sem build, sem dependências)
- **Hosting**: Cloudflare Pages
- **Backend**: Pages Functions (`functions/api/*`)
- **DB**: Cloudflare D1 (SQLite serverless)
- **Persistência local (front)**: `localStorage` (chaves `racha_*` e `avfc_voted_*`)
- Idioma: pt-BR

## Estrutura
```
index.html                  # SPA de sorteio (3 passos) + botão "🗳️ Votação"
votar.html                  # Página pública de votação + ranking
schema.sql                  # DDL D1 (sessions, votes)
wrangler.toml               # Config Pages + binding DB
DEPLOY.md                   # Passos: criar D1, aplicar schema, dev e prod
postman/                    # Collection + envs (local/prod) para testar API
functions/
  _utils.js                 # json/error/newSessionId/readJson
  api/
    sessions/index.js       # POST /api/sessions
    sessions/[id].js        # GET  /api/sessions/:id
    votes.js                # POST /api/votes
    results/[id].js         # GET  /api/results/:id
```

## Fluxo da app de sorteio
1. **Configurar** (`#step1`) — cola nomes (1/linha), define nº de times e jogadores/time.
2. **Classificar** (`#step2`) — 1–5 estrelas e marca goleiros (GK).
3. **Sortear** (`#step3`) — modo (aleatório ou balanceado) + opções (capitães, 1 GK/time) → cards de times.

## Fluxo da votação
1. Após sortear, botão **🗳️ Votação** abre modal e chama `POST /api/sessions` com os jogadores do baba (todos os `currentTeams.players` deduplicados).
2. API retorna `id` de 8 chars `[A-Z2-9]`. App mostra link `https://APP/votar?s=<id>` com "Copiar" e "Abrir".
3. Votante abre `votar.html` → busca jogadores via `GET /api/sessions/:id` → atribui 1–5 estrelas em cada → `POST /api/votes`.
4. `localStorage.avfc_voted_<sid>` marca quem votou (gate de duplicidade só client-side, MVP).
5. Após votar (ou se já tiver flag), mostra ranking via `GET /api/results/:id` — média desc, total como desempate, 🥇🥈🥉 nos 3 primeiros.
6. Link "Ver ranking sem votar" pra espectadores.

## API contract
| Método | Rota | Body | Resposta |
|---|---|---|---|
| `POST` | `/api/sessions` | `{ players: [{id,name}] }` | `201 { id, createdAt, players }` |
| `GET`  | `/api/sessions/:id` | — | `200 { id, createdAt, players }` ou `404` |
| `POST` | `/api/votes` | `{ sessionId, votes: [{playerId, score}] }` | `201 { ok, inserted }` |
| `GET`  | `/api/results/:id` | — | `200 { sessionId, createdAt, ranking: [{id,name,avg,total}] }` |

Validações: score inteiro 1–5, playerId tem que existir na session, máx 100 jogadores/session, ids únicos.

## Schema D1
```sql
sessions(id TEXT PK, created_at INT, players TEXT JSON)
votes(id PK, session_id FK, player_id TEXT, score INT 1-5, created_at INT)
-- idx_votes_session, idx_votes_session_player
```

## Modos de sorteio
- **Aleatório** — embaralha e distribui em snake-fill.
- **Balanceado** — ordena por estrelas (desc) e atribui cada jogador ao time com menor soma de estrelas que ainda tem vaga.

## Estado global (`index.html` `<script>`)
- `players` — `[{ id, name, stars, isGK }]`
- `config` — `{ numTeams, ppTeam }`
- `sortMode` — `'random' | 'balanced'`
- `opts` — `{ cap, gk }`
- `currentTeams` — último resultado
- `fixed` — `{ playerId: teamIdx }`
- `history` — últimos 5 sorteios
- `currentVoteSession` — cache da sessão de votação criada pro `currentTeams` atual (reset ao ressortear)

## Funções principais (`index.html`)
- `gotoStep1/2/3()` — navegação e validação entre passos
- `renderList()` — lista de jogadores no passo 2
- `buildTeams()` — núcleo do algoritmo (fixos → GKs → capitães → distribuição)
- `sortear()` — orquestra validação, animação, build e render
- `renderResults()` — gera os cards dos times + leftover
- `toggleFixed()` — fixa/desafixa jogador sem ressortear
- `openVoteShare()` — cria session na API e mostra link no modal
- `save()` — grava tudo no localStorage

## Como rodar
- **Dev local**: `wrangler pages dev . --port 8788` (precisa rodar schema em `--local` antes — ver `DEPLOY.md`)
- **Prod**: conectar repo em Cloudflare Pages, criar D1 `racha`, binding `DB`, rodar `schema.sql --remote`

## Testes
- `postman/AltoValorFC.postman_collection.json` — 11 requests (4 caminhos felizes + 6 erros esperados). Test scripts gravam `sessionId` automaticamente entre requests.

## Pontos de atenção para edição
- `index.html` é tudo num arquivo só — IDs únicos, funções no escopo global (handlers `onclick=`), passar nome do usuário por `esc()`.
- IDs de jogador são `Date.now()+i` — colisão teoricamente possível em loops apertados.
- Ao recuperar elementos via `getElementById('st_' + playerId)` em `votar.html`, **não** use `CSS.escape` (é pra seletor CSS, quebra ids que começam com dígito).
- Histórico limitado a 5 entradas.
- IDs de sessão: 8 chars excluindo `I O 0 1` pra evitar confusão visual ao digitar.

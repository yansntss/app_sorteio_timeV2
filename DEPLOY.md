# Deploy — Cloudflare Pages + D1

## 1. Pre-requisitos
- Conta Cloudflare (gratis)
- `npm i -g wrangler` e `wrangler login`

## 2. Criar o banco D1
```bash
wrangler d1 create racha
```
Copie o `database_id` retornado e cole em `wrangler.toml` no campo `database_id`.

## 3. Aplicar o schema
Local (banco efemero, util pra dev):
```bash
wrangler d1 execute racha --local --file=schema.sql
```

Producao:
```bash
wrangler d1 execute racha --remote --file=schema.sql
```

## 4. Dev local
```bash
wrangler pages dev . --d1 DB=racha
```
Abre em http://localhost:8788. As Functions de `functions/api/*` ficam em `/api/*`.

## 5. Deploy
**Opcao A — via painel (recomendado)**
1. Em dash.cloudflare.com -> Workers & Pages -> Create -> Pages -> Connect to Git
2. Selecione o repo
3. Build command: vazio; Output dir: `/`
4. Em Settings -> Functions -> D1 bindings: `DB` -> `racha`

**Opcao B — direto via CLI**
```bash
wrangler pages deploy .
```

## 6. Sanity check (apos deploy)
```bash
# criar sessao
curl -X POST https://SEU-APP.pages.dev/api/sessions \
  -H "content-type: application/json" \
  -d '{"players":[{"id":"1","name":"Yan"},{"id":"2","name":"Vini"}]}'

# ler sessao
curl https://SEU-APP.pages.dev/api/sessions/<ID>

# votar
curl -X POST https://SEU-APP.pages.dev/api/votes \
  -H "content-type: application/json" \
  -d '{"sessionId":"<ID>","votes":[{"playerId":"1","score":5},{"playerId":"2","score":4}]}'

# ranking
curl https://SEU-APP.pages.dev/api/results/<ID>
```

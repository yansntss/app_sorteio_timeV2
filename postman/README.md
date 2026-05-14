# Postman — Alto Valor FC

## Importar

No Postman: **Import** → arraste os 3 arquivos `.json`:

- `AltoValorFC.postman_collection.json` — a collection com as requests
- `AltoValorFC.local.postman_environment.json` — env apontando pra `http://127.0.0.1:8788`
- `AltoValorFC.prod.postman_environment.json` — env de produção (edite o `baseUrl`)

No canto superior direito, selecione o environment **Local** (ou Prod).

## Como usar

A collection tem 4 pastas:

1. **Sessions**
   - `POST criar sessao` — cria a sessão e **salva o `sessionId` automaticamente** na collection (via test script). As próximas requests usam essa variável.
   - `GET sessao por id`
2. **Votes**
   - `POST registrar votos (round 1)` — 4 votos
   - `POST registrar votos (round 2)` — mais 4 votos do mesmo "votante simulado"
3. **Results**
   - `GET ranking da sessao` — confere se está ordenado por `avg` desc
4. **Validacao (erros esperados)** — payloads inválidos pra confirmar 400/404

Rode na ordem das pastas (1 → 2 → 3) ou use **Run Collection** pra rodar tudo de uma vez.

## Variáveis

- `baseUrl` (no environment) — onde a API está rodando
- `sessionId` (na collection) — preenchido automaticamente pela primeira request

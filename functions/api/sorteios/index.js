// GET  /api/sorteios → lists last 20 sorteios for the authenticated user
// POST /api/sorteios with { mode, config, teams } → saves to sorteio_history

import { json, error, newSessionId, readJson } from "../../_utils.js";

export async function onRequestGet({ env, data }) {
  const userId = data.user.sub;

  const result = await env.DB.prepare(
    `SELECT id, mode, config, teams, created_at
     FROM sorteio_history
     WHERE owner_id = ?
     ORDER BY created_at DESC
     LIMIT 20`
  )
    .bind(userId)
    .all();

  return json({ sorteios: result.results || [] });
}

export async function onRequestPost({ request, env, data }) {
  const body = await readJson(request);
  if (!body || !body.mode || !body.config || !Array.isArray(body.teams)) {
    return error("payload invalido: esperado { mode, config, teams }");
  }

  const userId = data.user.sub;
  const id     = newSessionId();
  const now    = Date.now();

  await env.DB.prepare(
    "INSERT INTO sorteio_history (id, owner_id, mode, config, teams, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  )
    .bind(id, userId, String(body.mode), JSON.stringify(body.config), JSON.stringify(body.teams), now)
    .run();

  return json({ id, created_at: now }, 201);
}

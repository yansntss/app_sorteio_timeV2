import { json, error } from "../../_utils.js";

export async function onRequestGet({ params, env }) {
  const id = String(params.id || "").trim();
  if (!id) return error("id obrigatorio", 400);

  const row = await env.DB.prepare(
    "SELECT id, created_at, players, expires_at FROM sessions WHERE id = ?"
  )
    .bind(id)
    .first();

  if (!row) return error("sessao nao encontrada", 404);

  if (row.expires_at && Date.now() > row.expires_at) {
    return error("sessao de votacao encerrada", 410);
  }

  return json({
    id: row.id,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    players: JSON.parse(row.players),
  });
}

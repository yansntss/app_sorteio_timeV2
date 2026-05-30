import { json, error, readJson } from "../../_utils.js";

// GET /api/games/:id — public
export async function onRequestGet({ params, env, data }) {
  const { id } = params;

  const game = await env.DB.prepare(`
    SELECT g.*, COUNT(gc.id) as confirmed_count
    FROM games g
    LEFT JOIN game_confirmations gc ON gc.game_id = g.id
    WHERE g.id = ?
    GROUP BY g.id
  `).bind(id).first();

  if (!game) return error("jogo nao encontrado", 404);

  const { results: confirmations } = await env.DB.prepare(`
    SELECT gc.id, gc.user_id, gc.guest_name, gc.confirmed_at,
           u.name as user_name, u.picture as user_picture
    FROM game_confirmations gc
    LEFT JOIN users u ON u.id = gc.user_id
    WHERE gc.game_id = ?
    ORDER BY gc.confirmed_at ASC
  `).bind(id).all();

  let myConfirmationId = null;
  if (data.user) {
    const mine = confirmations.find(c => c.user_id === data.user.sub);
    if (mine) myConfirmationId = mine.id;
  }

  return json({ game, confirmations, myConfirmationId });
}

// PATCH /api/games/:id — admin only
export async function onRequestPatch({ params, request, env, data }) {
  const user = data.user;
  if (!user) return error("nao autenticado", 401);

  const adminRow = await env.DB.prepare(
    "SELECT is_admin FROM users WHERE id = ?"
  ).bind(user.sub).first();

  if (!adminRow || adminRow.is_admin !== 1) return error("acesso restrito", 403);

  const { id } = params;
  const game = await env.DB.prepare("SELECT id FROM games WHERE id = ?").bind(id).first();
  if (!game) return error("jogo nao encontrado", 404);

  const body = await readJson(request);
  if (!body) return error("body invalido", 400);

  const allowed = ["status", "title", "game_date", "game_time", "location", "max_players"];
  const sets = [];
  const vals = [];

  for (const key of allowed) {
    if (body[key] !== undefined) {
      sets.push(`${key} = ?`);
      vals.push(body[key]);
    }
  }

  if (sets.length === 0) return error("nenhum campo para atualizar", 400);

  vals.push(id);
  await env.DB.prepare(
    `UPDATE games SET ${sets.join(", ")} WHERE id = ?`
  ).bind(...vals).run();

  return json({ ok: true });
}

import { json, error, readJson, newSessionId } from "../../_utils.js";

// GET /api/games — public
export async function onRequestGet({ env }) {
  try {
    const { results } = await env.DB.prepare(`
      SELECT g.*, COUNT(gc.id) as confirmed_count
      FROM games g
      LEFT JOIN game_confirmations gc ON gc.game_id = g.id
      GROUP BY g.id
      ORDER BY g.game_date DESC, g.created_at DESC
    `).all();

    return json({ games: results });
  } catch (e) {
    return error("erro ao buscar jogos", 500);
  }
}

// POST /api/games — admin only
export async function onRequestPost({ request, env, data }) {
  const user = data.user;
  if (!user) return error("nao autenticado", 401);

  // Check admin status from DB
  const row = await env.DB.prepare(
    "SELECT is_admin FROM users WHERE id = ?"
  ).bind(user.sub).first();

  if (!row || row.is_admin !== 1) return error("acesso restrito", 403);

  const body = await readJson(request);
  if (!body) return error("body invalido", 400);

  const { title, game_date, game_time, location, max_players } = body;
  if (!title || !title.trim()) return error("titulo obrigatorio", 400);
  if (!game_date || !/^\d{4}-\d{2}-\d{2}$/.test(game_date)) return error("data invalida (YYYY-MM-DD)", 400);

  const id = newSessionId();
  const now = Date.now();

  await env.DB.prepare(`
    INSERT INTO games (id, owner_id, title, game_date, game_time, location, max_players, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?)
  `).bind(
    id,
    user.sub,
    title.trim(),
    game_date,
    game_time || "21:00",
    location || null,
    max_players || 24,
    now
  ).run();

  return json({ id }, 201);
}

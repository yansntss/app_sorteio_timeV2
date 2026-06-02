import { json, error, readJson, newSessionId } from "../../_utils.js";

// POST /api/confirmations
export async function onRequestPost({ request, env, data }) {
  const body = await readJson(request);
  if (!body) return error("body invalido", 400);

  const { gameId, guestName } = body;
  if (!gameId) return error("gameId obrigatorio", 400);

  // Load game with confirmation count
  const game = await env.DB.prepare(`
    SELECT g.*, COUNT(gc.id) as confirmed_count
    FROM games g
    LEFT JOIN game_confirmations gc ON gc.game_id = g.id
    WHERE g.id = ?
    GROUP BY g.id
  `).bind(gameId).first();

  if (!game) return error("jogo nao encontrado", 404);
  if (game.status !== "open") return error("inscricoes encerradas", 403);
  if (game.confirmed_count >= game.max_players) return error("vagas esgotadas", 409);

  const id = newSessionId();
  const now = Date.now();
  const user = data.user;

  // If guestName is provided, always add as guest (even when logged in — admin adding guests)
  if (guestName) {
    if (typeof guestName !== "string" || !guestName.trim()) {
      return error("nome do convidado invalido", 400);
    }
    const name = guestName.trim().slice(0, 50);
    await env.DB.prepare(`
      INSERT INTO game_confirmations (id, game_id, user_id, guest_name, confirmed_at, added_by)
      VALUES (?, ?, NULL, ?, ?, ?)
    `).bind(id, gameId, name, now, user?.sub ?? null).run();
    return json({ id, guestName: name });
  }

  // No guestName — confirm own presence (must be logged in)
  if (!user) return error("nome obrigatorio para confirmar como convidado", 400);

  const stars = (typeof body.stars === 'number' && body.stars >= 1 && body.stars <= 5)
    ? Math.round(body.stars) : null;

  try {
    await env.DB.prepare(`
      INSERT INTO game_confirmations (id, game_id, user_id, guest_name, confirmed_at, added_by, stars)
      VALUES (?, ?, ?, NULL, ?, ?, ?)
    `).bind(id, gameId, user.sub, now, user.sub, stars).run();
  } catch (e) {
    if (e.message && e.message.includes("UNIQUE")) {
      return error("voce ja confirmou presenca", 409);
    }
    return error("erro ao confirmar presenca", 500);
  }
  return json({ id, guestName: null });
}

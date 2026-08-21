import { json, error, readJson, newSessionId, GOALS_ASSISTS_ENABLED } from "../../_utils.js";

// GET /api/games/:id — public
export async function onRequestGet({ params, env, data }) {
  const { id } = params;

  try {
    const game = await env.DB.prepare(`
      SELECT g.*, COUNT(gc.id) as confirmed_count
      FROM games g
      LEFT JOIN game_confirmations gc ON gc.game_id = g.id
      WHERE g.id = ?
      GROUP BY g.id
    `).bind(id).first();

    if (!game) return error("jogo nao encontrado", 404);

    const { results: confirmations } = await env.DB.prepare(`
      SELECT gc.id, gc.user_id, gc.guest_name, gc.confirmed_at, gc.stars,
             ${GOALS_ASSISTS_ENABLED ? "gc.goals, gc.assists," : ""}
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
  } catch (e) {
    return error("erro ao buscar jogo: " + (e && e.message ? e.message : e), 500);
  }
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
  const game = await env.DB.prepare(
    "SELECT id, owner_id, status, rating_applied_at FROM games WHERE id = ?"
  ).bind(id).first();
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

  // Apply stars (and goals/assists when enabled) to player_profiles when the
  // game is finished for the first time
  if (body.status === "finished" && game.status !== "finished" && !game.rating_applied_at) {
    const now = Date.now();

    const { results: confs } = await env.DB.prepare(`
      SELECT gc.stars, ${GOALS_ASSISTS_ENABLED ? "gc.goals, gc.assists," : ""} COALESCE(u.name, gc.guest_name) as name
      FROM game_confirmations gc
      LEFT JOIN users u ON u.id = gc.user_id
      WHERE gc.game_id = ? AND (gc.stars IS NOT NULL${GOALS_ASSISTS_ENABLED ? " OR gc.goals IS NOT NULL OR gc.assists IS NOT NULL" : ""})
    `).bind(id).all();

    for (const c of confs) {
      if (!c.name) continue;
      const goalsAdd   = c.goals   != null ? c.goals   : 0;
      const assistsAdd = c.assists != null ? c.assists : 0;

      const existing = await env.DB.prepare(
        `SELECT id, avg_rating, vote_count${GOALS_ASSISTS_ENABLED ? ", total_goals, total_assists" : ""} FROM player_profiles WHERE owner_id = ? AND name = ?`
      ).bind(game.owner_id, c.name).first();

      if (existing) {
        let newAvg   = existing.avg_rating;
        let newCount = existing.vote_count;
        if (c.stars != null) {
          newCount = existing.vote_count + 1;
          newAvg   = Math.round(((existing.avg_rating * existing.vote_count + c.stars) / newCount) * 100) / 100;
        }
        const statSet  = GOALS_ASSISTS_ENABLED ? ", total_goals = ?, total_assists = ?" : "";
        const statVals = GOALS_ASSISTS_ENABLED
          ? [existing.total_goals + goalsAdd, existing.total_assists + assistsAdd]
          : [];
        await env.DB.prepare(
          `UPDATE player_profiles SET avg_rating = ?, vote_count = ?${statSet}, updated_at = ? WHERE id = ?`
        ).bind(newAvg, newCount, ...statVals, now, existing.id).run();
      } else {
        const statCols = GOALS_ASSISTS_ENABLED ? ", total_goals, total_assists" : "";
        const statQs   = GOALS_ASSISTS_ENABLED ? ", ?, ?" : "";
        const statVals = GOALS_ASSISTS_ENABLED ? [goalsAdd, assistsAdd] : [];
        await env.DB.prepare(
          `INSERT INTO player_profiles (id, owner_id, name, avg_rating, vote_count${statCols}, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?${statQs}, ?, ?)`
        ).bind(
          newSessionId(), game.owner_id, c.name,
          c.stars != null ? c.stars : 3.0, c.stars != null ? 1 : 0,
          ...statVals, now, now
        ).run();
      }
    }

    await env.DB.prepare(
      "UPDATE games SET rating_applied_at = ? WHERE id = ?"
    ).bind(now, id).run();
  }

  return json({ ok: true });
}

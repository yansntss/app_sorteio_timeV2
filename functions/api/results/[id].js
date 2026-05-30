import { json, error, newSessionId } from "../../_utils.js";

export async function onRequestGet({ params, env, data }) {
  const id = String(params.id || "").trim();
  if (!id) return error("id obrigatorio");

  const session = await env.DB.prepare(
    "SELECT id, created_at, players, owner_id, rating_applied_at FROM sessions WHERE id = ?"
  )
    .bind(id)
    .first();

  if (!session) return error("sessao nao encontrada", 404);

  const players = JSON.parse(session.players);

  const agg = await env.DB.prepare(
    `SELECT player_id, AVG(score) AS avg_score, COUNT(*) AS total
     FROM votes
     WHERE session_id = ?
     GROUP BY player_id`
  )
    .bind(id)
    .all();

  const byId = new Map(
    (agg.results || []).map((r) => [
      r.player_id,
      { avg: Number(r.avg_score), total: Number(r.total) },
    ])
  );

  const ranking = players
    .map((p) => {
      const v = byId.get(p.id);
      return {
        id:    p.id,
        name:  p.name,
        avg:   v ? Number(v.avg.toFixed(2)) : 0,
        total: v ? v.total : 0,
      };
    })
    .sort((a, b) => b.avg - a.avg || b.total - a.total);

  // Apply ratings to player_profiles when the owner views for the first time
  const userId = data?.user?.sub;
  if (userId && userId === session.owner_id && !session.rating_applied_at && byId.size > 0) {
    const now = Date.now();

    for (const p of players) {
      const v = byId.get(p.id);
      if (!v || v.total === 0) continue;

      const existing = await env.DB.prepare(
        "SELECT id, avg_rating, vote_count FROM player_profiles WHERE owner_id = ? AND name = ?"
      ).bind(userId, p.name).first();

      if (existing) {
        const newCount = existing.vote_count + v.total;
        const newAvg   = (existing.avg_rating * existing.vote_count + v.avg * v.total) / newCount;
        await env.DB.prepare(
          "UPDATE player_profiles SET avg_rating = ?, vote_count = ?, updated_at = ? WHERE id = ?"
        ).bind(Math.round(newAvg * 100) / 100, newCount, now, existing.id).run();
      } else {
        await env.DB.prepare(
          "INSERT INTO player_profiles (id, owner_id, name, avg_rating, vote_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).bind(newSessionId(), userId, p.name, Math.round(v.avg * 100) / 100, v.total, now, now).run();
      }
    }

    await env.DB.prepare(
      "UPDATE sessions SET rating_applied_at = ? WHERE id = ?"
    ).bind(now, id).run();
  }

  return json({
    sessionId:        id,
    createdAt:        session.created_at,
    ratingsApplied:   !!session.rating_applied_at,
    ranking,
  });
}

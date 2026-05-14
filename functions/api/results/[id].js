import { json, error } from "../../_utils.js";

export async function onRequestGet({ params, env }) {
  const id = String(params.id || "").trim();
  if (!id) return error("id obrigatorio");

  const session = await env.DB.prepare(
    "SELECT id, created_at, players FROM sessions WHERE id = ?"
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
        id: p.id,
        name: p.name,
        avg: v ? Number(v.avg.toFixed(2)) : 0,
        total: v ? v.total : 0,
      };
    })
    .sort((a, b) => b.avg - a.avg || b.total - a.total);

  return json({
    sessionId: id,
    createdAt: session.created_at,
    ranking,
  });
}

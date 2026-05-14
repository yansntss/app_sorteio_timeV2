import { json, error, readJson } from "../_utils.js";

export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  if (!body || typeof body.sessionId !== "string" || !Array.isArray(body.votes)) {
    return error("payload invalido: esperado { sessionId, votes: [...] }");
  }

  const sessionId = body.sessionId.trim();
  if (!sessionId) return error("sessionId obrigatorio");

  const session = await env.DB.prepare(
    "SELECT players FROM sessions WHERE id = ?"
  )
    .bind(sessionId)
    .first();

  if (!session) return error("sessao nao encontrada", 404);

  const validIds = new Set(JSON.parse(session.players).map((p) => p.id));

  const votes = [];
  for (const v of body.votes) {
    const playerId = String(v.playerId ?? "").trim();
    const score = Number(v.score);
    if (!validIds.has(playerId)) return error(`jogador invalido: ${playerId}`);
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      return error(`score invalido para ${playerId}: precisa ser inteiro 1-5`);
    }
    votes.push({ playerId, score });
  }

  if (votes.length === 0) return error("nenhum voto enviado");

  const createdAt = Date.now();
  const stmt = env.DB.prepare(
    "INSERT INTO votes (session_id, player_id, score, created_at) VALUES (?, ?, ?, ?)"
  );
  await env.DB.batch(
    votes.map((v) => stmt.bind(sessionId, v.playerId, v.score, createdAt))
  );

  return json({ ok: true, inserted: votes.length }, 201);
}

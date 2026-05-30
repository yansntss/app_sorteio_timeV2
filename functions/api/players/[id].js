import { json, error, readJson } from "../../_utils.js";

export async function onRequestPatch({ params, request, env, data }) {
  const id     = String(params.id || "").trim();
  if (!id) return error("id obrigatorio", 400);

  const userId = data.user.sub;

  const existing = await env.DB.prepare(
    "SELECT id FROM player_profiles WHERE id = ? AND owner_id = ?"
  ).bind(id, userId).first();

  if (!existing) return error("jogador nao encontrado", 404);

  const body = await readJson(request);
  if (!body) return error("payload invalido");

  const avg = Number(body.avg_rating);
  if (!Number.isFinite(avg) || avg < 1 || avg > 5) {
    return error("avg_rating deve ser entre 1.0 e 5.0");
  }

  await env.DB.prepare(
    "UPDATE player_profiles SET avg_rating = ?, updated_at = ? WHERE id = ? AND owner_id = ?"
  ).bind(Math.round(avg * 10) / 10, Date.now(), id, userId).run();

  return json({ ok: true });
}

export async function onRequestDelete({ params, env, data }) {
  const id     = String(params.id || "").trim();
  if (!id) return error("id obrigatorio", 400);

  const userId = data.user.sub;

  const result = await env.DB.prepare(
    "DELETE FROM player_profiles WHERE id = ? AND owner_id = ?"
  ).bind(id, userId).run();

  if (!result.meta?.changes) return error("jogador nao encontrado", 404);

  return json({ ok: true });
}

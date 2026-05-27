import { json, error, newSessionId, readJson } from "../../_utils.js";

export async function onRequestPost({ request, env, data }) {
  const body = await readJson(request);
  if (!body || !Array.isArray(body.players) || body.players.length === 0) {
    return error("payload invalido: esperado { players: [...] } nao vazio");
  }

  const players = body.players
    .map((p) => ({
      id:   String(p.id ?? "").trim(),
      name: String(p.name ?? "").trim(),
    }))
    .filter((p) => p.id && p.name);

  if (players.length === 0) return error("nenhum jogador valido");
  if (players.length > 100) return error("limite de 100 jogadores por sessao");

  const ids = new Set(players.map((p) => p.id));
  if (ids.size !== players.length) return error("ids de jogador duplicados");

  const id        = newSessionId();
  const createdAt = Date.now();
  const ownerId   = data?.user?.sub ?? null;

  await env.DB.prepare(
    "INSERT INTO sessions (id, created_at, players, owner_id) VALUES (?, ?, ?, ?)"
  )
    .bind(id, createdAt, JSON.stringify(players), ownerId)
    .run();

  return json({ id, createdAt, players }, 201);
}

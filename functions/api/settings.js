// GET  /api/settings → returns user_settings (defaults if not set)
// PUT  /api/settings with { num_teams, pp_team, sort_mode } → upsert

import { json, error, readJson } from "../_utils.js";

export async function onRequestGet({ env, data }) {
  const userId = data.user.sub;

  const row = await env.DB.prepare(
    "SELECT num_teams, pp_team, sort_mode FROM user_settings WHERE user_id = ?"
  )
    .bind(userId)
    .first();

  return json({
    num_teams: row?.num_teams ?? 2,
    pp_team:   row?.pp_team   ?? 5,
    sort_mode: row?.sort_mode ?? "random",
  });
}

export async function onRequestPut({ request, env, data }) {
  const body = await readJson(request);
  if (!body) return error("payload invalido");

  const userId   = data.user.sub;
  const numTeams = typeof body.num_teams === "number" ? Math.max(2, Math.min(10, body.num_teams)) : 2;
  const ppTeam   = typeof body.pp_team   === "number" ? Math.max(1, Math.min(20, body.pp_team))  : 5;
  const sortMode = ["random", "balanced"].includes(body.sort_mode) ? body.sort_mode : "random";
  const now      = Date.now();

  await env.DB.prepare(
    `INSERT INTO user_settings (user_id, num_teams, pp_team, sort_mode, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       num_teams  = excluded.num_teams,
       pp_team    = excluded.pp_team,
       sort_mode  = excluded.sort_mode,
       updated_at = excluded.updated_at`
  )
    .bind(userId, numTeams, ppTeam, sortMode, now)
    .run();

  return json({ ok: true });
}

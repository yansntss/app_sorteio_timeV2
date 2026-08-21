// GET /api/players
// Returns all player_profiles for the authenticated user, ordered by name ASC

import { json, GOALS_ASSISTS_ENABLED } from "../../_utils.js";

export async function onRequestGet({ env, data }) {
  const userId = data.user.sub;

  const statCols = GOALS_ASSISTS_ENABLED ? ", total_goals, total_assists" : "";
  const result = await env.DB.prepare(
    `SELECT id, name, avg_rating, vote_count${statCols} FROM player_profiles WHERE owner_id = ? ORDER BY name ASC`
  )
    .bind(userId)
    .all();

  return json({ players: result.results || [] });
}

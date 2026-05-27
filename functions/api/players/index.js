// GET /api/players
// Returns all player_profiles for the authenticated user, ordered by name ASC

import { json } from "../../_utils.js";

export async function onRequestGet({ env, data }) {
  const userId = data.user.sub;

  const result = await env.DB.prepare(
    "SELECT id, name, avg_rating, vote_count FROM player_profiles WHERE owner_id = ? ORDER BY name ASC"
  )
    .bind(userId)
    .all();

  return json({ players: result.results || [] });
}

// GET /api/auth/me
// Returns { user: { id, email, name, picture } } or { user: null }
// Does NOT require auth (middleware allows /api/auth/*)

import { getUser, json } from "../../_utils.js";

export async function onRequestGet({ request, env }) {
  const payload = await getUser(request, env);
  if (!payload) return json({ user: null });

  // Fetch fresh data from D1 (ensures picture is up to date)
  try {
    const row = await env.DB.prepare(
      "SELECT id, email, name, picture FROM users WHERE id = ?"
    )
      .bind(payload.sub)
      .first();

    if (!row) return json({ user: null });

    return json({
      user: {
        id:      row.id,
        email:   row.email,
        name:    row.name,
        picture: row.picture,
      },
    });
  } catch {
    return json({ user: null });
  }
}

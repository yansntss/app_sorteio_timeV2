// GET /api/auth/me
// Returns { user: { id, email, name, picture, is_admin } } or { user: null }
// Does NOT require auth (middleware allows /api/auth/*)

import { getUser, json } from "../../_utils.js";

export async function onRequestGet({ request, env }) {
  const payload = await getUser(request, env);
  if (!payload) return json({ user: null });

  // Fetch fresh data from D1 (ensures picture and is_admin are up to date)
  try {
    const row = await env.DB.prepare(
      "SELECT id, email, name, picture, is_admin FROM users WHERE id = ?"
    )
      .bind(payload.sub)
      .first();

    if (!row) return json({ user: null });

    return json({
      user: {
        id:       row.id,
        email:    row.email,
        name:     row.name,
        picture:  row.picture,
        is_admin: row.is_admin === 1,
      },
    });
  } catch {
    return json({ user: null });
  }
}

import { json, error } from "../../_utils.js";

// DELETE /api/confirmations/:id
export async function onRequestDelete({ params, env, data }) {
  const { id } = params;
  const user = data.user;

  const conf = await env.DB.prepare(
    "SELECT id, user_id, game_id FROM game_confirmations WHERE id = ?"
  ).bind(id).first();

  if (!conf) return error("confirmacao nao encontrada", 404);

  // Check permission:
  // - Admin can delete anyone
  // - User owns this confirmation (user_id matches)
  // - Guest confirmation (user_id IS NULL) — security by obscurity via ID
  const isGuest = conf.user_id === null;
  const ownsIt = user && conf.user_id === user.sub;

  let isAdmin = false;
  if (user) {
    const adminRow = await env.DB.prepare(
      "SELECT is_admin FROM users WHERE id = ?"
    ).bind(user.sub).first();
    isAdmin = adminRow && adminRow.is_admin === 1;
  }

  if (!isAdmin && !ownsIt && !isGuest) {
    return error("sem permissao", 403);
  }

  await env.DB.prepare(
    "DELETE FROM game_confirmations WHERE id = ?"
  ).bind(id).run();

  return json({ ok: true });
}

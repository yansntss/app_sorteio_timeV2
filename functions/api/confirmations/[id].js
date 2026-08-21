import { json, error, readJson, GOALS_ASSISTS_ENABLED } from "../../_utils.js";

// PATCH /api/confirmations/:id — admin can edit stars/goals/assists for anyone;
// the confirmation's own owner can edit their own goals/assists (not stars).
export async function onRequestPatch({ request, params, env, data }) {
  const { id } = params;
  const user = data.user;
  if (!user) return error("nao autenticado", 401);

  const conf = await env.DB.prepare(
    "SELECT id, user_id FROM game_confirmations WHERE id = ?"
  ).bind(id).first();
  if (!conf) return error("confirmacao nao encontrada", 404);

  const adminRow = await env.DB.prepare(
    "SELECT is_admin FROM users WHERE id = ?"
  ).bind(user.sub).first();
  const isAdmin = !!(adminRow && adminRow.is_admin === 1);
  const isOwner = conf.user_id === user.sub;

  if (!isAdmin && !isOwner) return error("sem permissao", 403);

  const body = await readJson(request);
  if (!body) return error("body invalido", 400);

  if ("stars" in body && !isAdmin) {
    return error("apenas admin pode definir a nota", 403);
  }

  const sets = [];
  const vals = [];

  if ("stars" in body) {
    const stars = body.stars;
    if (stars !== null && (typeof stars !== "number" || stars < 1 || stars > 5)) {
      return error("stars invalido (1-5 ou null)", 400);
    }
    sets.push("stars = ?");
    vals.push(stars === null ? null : Math.round(stars));
  }

  for (const field of ["goals", "assists"]) {
    if (!(field in body)) continue;
    if (!GOALS_ASSISTS_ENABLED) {
      return error("gols/assistencias desativado", 400);
    }
    const val = body[field];
    if (val !== null && (typeof val !== "number" || !Number.isInteger(val) || val < 0)) {
      return error(`${field} invalido (inteiro >= 0 ou null)`, 400);
    }
    sets.push(`${field} = ?`);
    vals.push(val);
  }

  if (sets.length === 0) return error("nenhum campo para atualizar", 400);

  vals.push(id);
  await env.DB.prepare(
    `UPDATE game_confirmations SET ${sets.join(", ")} WHERE id = ?`
  ).bind(...vals).run();

  return json({ ok: true });
}

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

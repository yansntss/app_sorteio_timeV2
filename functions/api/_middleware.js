import { getUser, error } from "../_utils.js";

export async function onRequest(ctx) {
  const url = new URL(ctx.request.url);
  const path = url.pathname;

  // Always resolve user (may be null)
  const user = await getUser(ctx.request, ctx.env);
  ctx.data.user = user;

  // Auth-free routes
  if (path.startsWith("/api/auth/")) return ctx.next();
  if (path === "/api/dev-login") return ctx.next();
  if (path.startsWith("/api/games") || path.startsWith("/api/confirmations")) return ctx.next();

  // All other /api/* require login
  if (!user) return error("nao autenticado", 401);
  return ctx.next();
}

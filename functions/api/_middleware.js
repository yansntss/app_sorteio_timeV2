import { getUser, error } from "../_utils.js";

export async function onRequest(ctx) {
  const url = new URL(ctx.request.url);
  if (url.pathname.startsWith("/api/auth/")) return ctx.next();

  const user = await getUser(ctx.request, ctx.env);
  if (!user) return error("nao autenticado", 401);

  ctx.data.user = user;
  return ctx.next();
}

// GET /api/auth/callback?code=...&state=...
// Exchanges code for access_token, fetches user info, upserts user, sets session cookie

import { signJWT, newSessionId } from "../../_utils.js";

export async function onRequestGet({ request, env }) {
  const url    = new URL(request.url);
  const code   = url.searchParams.get("code");
  const state  = url.searchParams.get("state");

  // Basic validation
  if (!code || !state) {
    return new Response("Parametros invalidos", { status: 400 });
  }

  // CSRF check: compare state cookie
  const cookieHeader = request.headers.get("cookie") || "";
  const cookieState  = cookieHeader
    .split(";")
    .map(c => c.trim().split("="))
    .find(([k]) => k === "oauth_state")?.[1];

  if (!cookieState || cookieState !== state) {
    return new Response("Estado invalido (CSRF check falhou)", { status: 400 });
  }

  // Decode redirect URL from state
  let redirectTo = "/";
  try {
    const decoded = JSON.parse(
      atob(state.replace(/-/g, "+").replace(/_/g, "/").padEnd(
        state.length + (4 - (state.length % 4)) % 4,
        "="
      ))
    );
    redirectTo = decoded.redirect || "/";
  } catch {
    // use default /
  }

  const clientId     = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  const callbackUrl  = `${url.origin}/api/auth/callback`;

  if (!clientId || !clientSecret || !env.JWT_SECRET) {
    return new Response("OAuth nao configurado", { status: 500 });
  }

  // Exchange code for tokens
  let tokens;
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id:     clientId,
        client_secret: clientSecret,
        redirect_uri:  callbackUrl,
        grant_type:    "authorization_code",
      }),
    });
    tokens = await tokenRes.json();
    if (!tokens.access_token) {
      return new Response(`Falha ao obter token: ${tokens.error || "desconhecido"}`, { status: 500 });
    }
  } catch (e) {
    return new Response(`Erro ao contactar Google: ${e.message}`, { status: 500 });
  }

  // Fetch user info
  let userInfo;
  try {
    const infoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    userInfo = await infoRes.json();
    if (!userInfo.id) {
      return new Response("Nao foi possivel obter dados do usuario", { status: 500 });
    }
  } catch (e) {
    return new Response(`Erro ao buscar perfil: ${e.message}`, { status: 500 });
  }

  // Upsert user in D1
  const now    = Date.now();
  const userId = newSessionId(); // generate an internal ID

  // ADMIN_EMAILS is a comma-separated whitelist. Source of truth on every login:
  // emails on the list are promoted to admin, others are demoted.
  const adminEmails = (env.ADMIN_EMAILS || "")
    .split(",")
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  const isAdmin = adminEmails.includes(userInfo.email.toLowerCase()) ? 1 : 0;

  // Try to find existing user by google_id
  const existing = await env.DB.prepare(
    "SELECT id FROM users WHERE google_id = ?"
  )
    .bind(userInfo.id)
    .first();

  let finalUserId;
  if (existing) {
    finalUserId = existing.id;
    await env.DB.prepare(
      "UPDATE users SET email = ?, name = ?, picture = ?, is_admin = ? WHERE google_id = ?"
    )
      .bind(userInfo.email, userInfo.name, userInfo.picture || null, isAdmin, userInfo.id)
      .run();
  } else {
    finalUserId = userId;
    await env.DB.prepare(
      "INSERT INTO users (id, google_id, email, name, picture, is_admin, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(finalUserId, userInfo.id, userInfo.email, userInfo.name, userInfo.picture || null, isAdmin, now)
      .run();
  }

  // Sign JWT (30 days)
  const exp = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
  const token = await signJWT(
    {
      sub:     finalUserId,
      email:   userInfo.email,
      name:    userInfo.name,
      picture: userInfo.picture || null,
      exp,
    },
    env.JWT_SECRET
  );

  // Redirect with session cookie; clear oauth_state
  const headers = new Headers();
  headers.set("Location", redirectTo);
  headers.append("Set-Cookie", `avfc_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`);
  headers.append("Set-Cookie", `oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`);

  return new Response(null, { status: 302, headers });
}

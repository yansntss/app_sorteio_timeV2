// GET /api/auth/login?redirect=<url>
// Redirects to Google OAuth with state containing redirect URL

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const redirect = url.searchParams.get("redirect") || "/";

  const clientId = env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return new Response("GOOGLE_CLIENT_ID not configured", { status: 500 });
  }

  const state = btoa(JSON.stringify({ redirect, ts: Date.now() }))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const callbackUrl = `${url.origin}/api/auth/callback`;

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  callbackUrl,
    response_type: "code",
    scope:         "openid email profile",
    state,
    access_type:   "online",
  });

  const googleUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

  return new Response(null, {
    status: 302,
    headers: {
      Location:   googleUrl,
      "Set-Cookie": `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
    },
  });
}

// GET /api/auth/logout
// Clears session cookie and redirects to /

export async function onRequestGet() {
  return new Response(null, {
    status: 302,
    headers: {
      Location:     "/",
      "Set-Cookie": "avfc_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
    },
  });
}

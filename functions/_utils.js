export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

export const error = (message, status = 400) => json({ error: message }, status);

export function newSessionId() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  let id = "";
  for (const b of bytes) id += alphabet[b % alphabet.length];
  return id;
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

// ── base64url helpers ────────────────────────────────────────────────────────

function b64url(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function b64urlEncode(str) {
  const bytes = new TextEncoder().encode(str);
  return b64url(bytes);
}

function b64urlDecode(str) {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = (4 - (padded.length % 4)) % 4;
  const binary = atob(padded + "=".repeat(pad));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

// ── JWT (HS256) ──────────────────────────────────────────────────────────────

async function importKey(secret) {
  const keyBytes = new TextEncoder().encode(secret);
  return crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signJWT(payload, secret) {
  const header = b64urlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body   = b64urlEncode(JSON.stringify(payload));
  const signingInput = `${header}.${body}`;
  const key = await importKey(secret);
  const sigBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signingInput)
  );
  const sig = b64url(new Uint8Array(sigBuffer));
  return `${signingInput}.${sig}`;
}

export async function verifyJWT(token, secret) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [header, body, sig] = parts;
    const signingInput = `${header}.${body}`;

    const key = await importKey(secret);
    const sigBytes = Uint8Array.from(
      atob(sig.replace(/-/g, "+").replace(/_/g, "/")),
      c => c.charCodeAt(0)
    );

    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      new TextEncoder().encode(signingInput)
    );
    if (!valid) return null;

    const payload = JSON.parse(b64urlDecode(body));
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;

    return payload;
  } catch {
    return null;
  }
}

// ── Cookie helpers ───────────────────────────────────────────────────────────

export function getCookie(request, name) {
  const header = request.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k.trim() === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

// ── Auth helper ──────────────────────────────────────────────────────────────

export async function getUser(request, env) {
  try {
    const token = getCookie(request, "avfc_session");
    if (!token) return null;
    const secret = env.JWT_SECRET;
    if (!secret) return null;
    return await verifyJWT(token, secret);
  } catch {
    return null;
  }
}

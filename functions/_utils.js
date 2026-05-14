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

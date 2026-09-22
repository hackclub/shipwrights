export const SESSION_COOKIE_NAME = "shipwrights_admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours
export const SESSION_MAX_AGE_SECONDS = SESSION_TTL_MS / 1000;

const encoder = new TextEncoder();

async function getKey(): Promise<CryptoKey> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET is not set");
  }
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function sign(payload: string): Promise<string> {
  const key = await getKey();
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toHex(signature);
}

// This runs in both the Node.js runtime (server actions) and the Edge
// runtime (middleware), so it relies only on the standard Web Crypto API.
export async function createSessionToken(adminId: string): Promise<string> {
  const expires = String(Date.now() + SESSION_TTL_MS);
  const payload = `${adminId}.${expires}`;
  return `${payload}.${await sign(payload)}`;
}

export type Session = { adminId: string };

export async function verifySessionToken(
  token: string | undefined | null
): Promise<Session | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [adminId, expires, signature] = parts;
  if (!adminId || !expires || !signature) return null;

  const expected = await sign(`${adminId}.${expires}`);
  if (!timingSafeEqualHex(signature, expected)) return null;
  if (Number(expires) <= Date.now()) return null;

  return { adminId };
}

export async function isValidSessionToken(
  token: string | undefined | null
): Promise<boolean> {
  return (await verifySessionToken(token)) !== null;
}

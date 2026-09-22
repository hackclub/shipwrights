import crypto from "crypto";

const KEY_LENGTH = 64;

function scrypt(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, KEY_LENGTH, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

// Only ever called from server actions (Node runtime), never from
// middleware, so scrypt (unavailable in the Edge runtime) is safe here.
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt);
  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;

  const derivedKey = await scrypt(password, salt);
  const expected = Buffer.from(key, "hex");
  return (
    derivedKey.length === expected.length &&
    crypto.timingSafeEqual(derivedKey, expected)
  );
}

// Hashing helpers. Uses Web Crypto, available in Cloudflare Workers and Node 20+.

const encoder = new TextEncoder();

export async function sha256Bytes(text) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(String(text)));
  return new Uint8Array(digest);
}

export async function sha256Hex(text) {
  const bytes = await sha256Bytes(text);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

const FALLBACK_SALT = 'askthemove-unset-salt';
let warnedAboutSalt = false;

/** Salted SHA-256 of an IP address. The raw IP is never stored. */
export async function hashIp(ip, salt) {
  if (!salt) {
    if (!warnedAboutSalt) {
      console.warn('IP_HASH_SALT is not set; using a fixed fallback salt. Set it as a secret.');
      warnedAboutSalt = true;
    }
    salt = FALLBACK_SALT;
  }
  return sha256Hex(`${salt}:${ip || 'unknown'}`);
}

/**
 * Constant-time string comparison. Both sides are hashed first so the loop
 * always runs over 32 bytes and the length of the secret does not leak.
 */
export async function timingSafeEqualText(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a === '' || b === '') return false;
  const [ha, hb] = await Promise.all([sha256Bytes(a), sha256Bytes(b)]);
  let diff = 0;
  for (let i = 0; i < ha.length; i += 1) diff |= ha[i] ^ hb[i];
  return diff === 0;
}

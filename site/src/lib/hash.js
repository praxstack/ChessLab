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

/**
 * Salted SHA-256 of an IP address. The raw IP is never stored. There is no
 * fallback salt: a known salt would let anyone reverse the hash by trying
 * every IPv4 address, so callers must refuse to store anything without one.
 */
export async function hashIp(ip, salt, scope = '') {
  if (!salt) throw new Error('IP_HASH_SALT is not set');
  // A scope keeps separate counters, so manage-link requests and sign-ups don't share a limit.
  return sha256Hex(scope ? `${salt}:${scope}:${ip || 'unknown'}` : `${salt}:${ip || 'unknown'}`);
}

/** The private code in a manage link: 128 random bits as 32 lower-case hex characters. */
export function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
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

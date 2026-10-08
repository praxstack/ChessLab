// Optional Cloudflare Turnstile verification. Only used when TURNSTILE_SECRET is set.

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
// A stalled Siteverify call fails closed after this long instead of holding the sign-up open.
const TIMEOUT_MS = 5000;

export async function verifyTurnstile({ secret, token, ip, fetchImpl = fetch, timeoutMs = TIMEOUT_MS }) {
  if (!token || typeof token !== 'string') return false;
  const form = new URLSearchParams({ secret, response: token });
  if (ip) form.set('remoteip', ip);
  try {
    const res = await fetchImpl(VERIFY_URL, { method: 'POST', body: form, signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return false;
    const data = await res.json();
    return data && data.success === true;
  } catch {
    return false;
  }
}

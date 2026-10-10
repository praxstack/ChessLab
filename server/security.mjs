import {createHash, timingSafeEqual} from 'node:crypto';

// Settings for an internet-facing beta. Every value defaults to today's local behaviour.
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);

export function canonicalOrigin(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('APP_ORIGIN must be an origin such as https://app.example.com.'); }
  const secure = url.protocol === 'https:', loopback = url.protocol === 'http:' && LOOPBACK.has(url.hostname);
  if ((!secure && !loopback) || url.origin !== value) throw new Error('APP_ORIGIN must be a canonical HTTPS origin with no path, for example https://app.example.com.');
  return url.origin;
}

// Express trusts X-Forwarded-* only from the configured proxy hops. "true" would trust any client.
export function parseTrustProxy(value) {
  if (value === undefined || value === '' || value === '0' || value === 'false') return false;
  if (/^[1-9]$/.test(value)) return Number(value);
  if (value === 'true') throw new Error('TRUST_PROXY=true trusts addresses supplied by any client. Use the number of proxy hops, for example TRUST_PROXY=1.');
  const entries = value.split(',').map(item => item.trim()).filter(Boolean);
  if (!entries.length || !entries.every(item => /^(?:loopback|linklocal|uniquelocal|[0-9a-fA-F:.]+(?:\/\d{1,3})?)$/.test(item))) throw new Error('TRUST_PROXY must be a hop count (1-9), loopback, uniquelocal, linklocal or a comma-separated list of proxy addresses.');
  return entries.length === 1 ? entries[0] : entries;
}

export function parseInviteCodes(value, name = 'BETA_INVITE_CODES') {
  if (!value) return [];
  // An empty entry (",", a trailing comma or only spaces) must not leave an empty list that turns the gate off.
  const codes = value.split(',').map(code => code.trim());
  if (codes.some(code => code.length < 8 || code.length > 128 || /\s/.test(code))) throw new Error(`Each ${name} entry needs 8 to 128 characters without spaces.`);
  return codes;
}

const digest = value => createHash('sha256').update(value).digest();
// Stored with the account so a code can later grant or lose the server's Claude key without keeping the code itself.
export const inviteDigest = code => digest(code.trim()).toString('hex');
export function inviteAccepted(codes, supplied) {
  if (!codes.length) return true;
  if (typeof supplied !== 'string' || !supplied.trim() || supplied.length > 128) return false;
  const candidate = digest(supplied.trim());
  // Compare every code so the response time does not reveal which one matched.
  return codes.reduce((matched, code) => timingSafeEqual(digest(code), candidate) || matched, false);
}

export function securityConfig(env = process.env) {
  const appOrigin = env.APP_ORIGIN ? canonicalOrigin(env.APP_ORIGIN) : null;
  // PUBLIC_ORIGIN belongs to the earlier owner-private Sites tunnel. Two different origins would refuse one of them.
  if (appOrigin && env.PUBLIC_ORIGIN && env.PUBLIC_ORIGIN !== appOrigin) throw new Error('APP_ORIGIN and PUBLIC_ORIGIN name different origins. PUBLIC_ORIGIN is for the earlier private Sites tunnel; unset it for the hosted beta.');
  const https = appOrigin?.startsWith('https:') ?? false;
  // Accounts created with a COACH_AI_INVITE_CODES code use the server's Claude key; each such code also admits sign-up.
  const coachInviteCodes = parseInviteCodes(env.COACH_AI_INVITE_CODES, 'COACH_AI_INVITE_CODES');
  return {
    appOrigin,
    hosted:Boolean(appOrigin),
    trustProxy:parseTrustProxy(env.TRUST_PROXY),
    cookieSecure:env.COOKIE_SECURE === '1' || https,
    hsts:https,
    contentSecurityPolicy:env.NODE_ENV === 'production' || Boolean(appOrigin),
    inviteCodes:[...new Set([...parseInviteCodes(env.BETA_INVITE_CODES), ...coachInviteCodes])],
    coachInviteCodes,
    serveArchives:env.SERVE_ARCHIVES ? env.SERVE_ARCHIVES === '1' : !appOrigin,
  };
}

const CSP = ["default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob:", "font-src 'self' data:", "connect-src 'self'", "media-src 'self' data: blob:", "worker-src 'self' blob:", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'"].join('; ');

export function securityHeaders(config) {
  return (req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Referrer-Policy', 'same-origin');
    res.set('X-Frame-Options', 'DENY');
    res.set('Cross-Origin-Opener-Policy', 'same-origin');
    res.set('Cross-Origin-Resource-Policy', 'same-origin');
    res.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    if (config.hsts) res.set('Strict-Transport-Security', 'max-age=31536000');
    // The research and design archives are static HTML with their own inline scripts. When they are not
    // served, those paths fall through to the app and keep the policy.
    if (config.contentSecurityPolicy && !(config.serveArchives && /^\/(?:research|design)(?:\/|$)/.test(req.path))) res.set('Content-Security-Policy', CSP);
    next();
  };
}

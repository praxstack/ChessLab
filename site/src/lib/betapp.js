// The beta app at /betapp/: the browser-only AskTheMove app, behind an email + beta code.
//
// Every request under /betapp goes through functions/betapp/_middleware.js first, so no app
// file is served until the visitor has a valid session cookie. The allowed people live in the
// BETA_USERS secret (never in the repository), one "email code" pair per line or comma:
//
//   npx wrangler pages secret put BETA_USERS --project-name askthemove
//   npx wrangler pages secret put BETA_SESSION_SECRET --project-name askthemove
//
// The cookie holds the email, an expiry and an HMAC over both. Removing someone from
// BETA_USERS (or changing BETA_SESSION_SECRET) and deploying again ends their session.
// Sign-in attempts share the waitlist's per-IP rate limit table, under their own scope.
import { hashIp, timingSafeEqualText } from './hash.js';
import { countSubmission, retryAfterSeconds } from './ratelimit.js';
import { clientIp, isAllowedOrigin } from './http.js';
import { readCappedText } from './body.js';

export const BASE = '/betapp';
export const COOKIE = 'atm_beta';
export const SESSION_DAYS = 30;
export const MAX_ATTEMPTS = 10; // per IP per rate-limit window (10 minutes)
const MAX_FORM_BYTES = 2048;

const encoder = new TextEncoder();
const b64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = (text) => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

/** Reads BETA_USERS into a Map of lower-case email -> code. Malformed entries are skipped. */
export function parseUsers(value) {
  const users = new Map();
  for (const entry of String(value || '').split(/[\n,;]+/)) {
    const match = entry.trim().match(/^([^\s:@]+@[^\s:@]+\.[^\s:@]+)[\s:]+(\S.*)$/);
    if (match) users.set(match[1].toLowerCase(), match[2].trim());
  }
  return users;
}

async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

/** A cookie value: base64url(email).expiry.base64url(hmac). */
export async function signSession(email, secret, now = Date.now()) {
  const expires = Math.floor(now / 1000) + SESSION_DAYS * 86400;
  const payload = `${b64url(encoder.encode(email))}.${expires}`;
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(payload)));
  return `${payload}.${b64url(mac)}`;
}

/** The email in a valid, unexpired cookie value, or null. */
export async function verifySession(value, secret, now = Date.now()) {
  const parts = String(value || '').split('.');
  if (parts.length !== 3 || !/^\d{1,12}$/.test(parts[1])) return null;
  if (Number(parts[1]) * 1000 <= now) return null;
  try {
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), fromB64url(parts[2]), encoder.encode(`${parts[0]}.${parts[1]}`));
    return ok ? new TextDecoder().decode(fromB64url(parts[0])) : null;
  } catch {
    return null;
  }
}

function readCookie(request, name) {
  for (const part of (request.headers.get('cookie') || '').split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return '';
}

const sessionCookie = (value, maxAge) =>
  `${COOKIE}=${value}; Path=${BASE}; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;

// The sign-in page is a Function response, so it carries its own headers (_headers does not apply).
const PAGE_HEADERS = {
  'content-type': 'text/html; charset=utf-8',
  'cache-control': 'no-store',
  'content-security-policy':
    "default-src 'none'; style-src 'self'; font-src 'self'; img-src 'self' data:; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'same-origin',
  'x-frame-options': 'DENY',
  'x-robots-tag': 'noindex',
};

const escapeHtml = (text) =>
  String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function signInPage({ message = '', email = '', status = 200 } = {}) {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Beta sign-in · AskTheMove</title>
<link rel="stylesheet" href="/assets/app.css">
<link rel="stylesheet" href="/assets/betapp.css">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
</head>
<body class="betapp-signin">
<main class="betapp-card">
<p class="betapp-mark"><a href="/">AskTheMove</a></p>
<h1>Beta sign-in</h1>
<p>The app is open to beta testers. Use the email and beta code you were given.</p>
${message ? `<p class="betapp-error" role="alert">${escapeHtml(message)}</p>` : ''}
<form method="post" action="${BASE}/sign-in">
<label for="email">Email</label>
<input id="email" name="email" type="email" autocomplete="username" required value="${escapeHtml(email)}">
<label for="code">Beta code</label>
<input id="code" name="code" type="password" autocomplete="current-password" required>
<button type="submit">Open the app</button>
</form>
<p class="betapp-small">No code yet? <a href="/#join">Join the beta waitlist</a>.</p>
</main>
</body>
</html>
`;
  return new Response(html, { status, headers: PAGE_HEADERS });
}

/** Headers for the app's own files, read once from the build's headers.json (see scripts/build-betapp.mjs). */
let appHeaders = null;
async function loadAppHeaders(env, request) {
  if (appHeaders) return appHeaders;
  const res = await env.ASSETS.fetch(new Request(new URL(`${BASE}/headers.json`, request.url)));
  if (!res.ok) return null;
  appHeaders = await res.json();
  return appHeaders;
}
export function resetAppHeadersForTests() {
  appHeaders = null;
}

function redirect(location, cookie) {
  const headers = { location, 'cache-control': 'no-store' };
  if (cookie) headers['set-cookie'] = cookie;
  return new Response(null, { status: 303, headers });
}

async function readForm(request) {
  const declared = Number(request.headers.get('content-length'));
  if (declared > MAX_FORM_BYTES) return null;
  let text;
  try {
    // Stops reading (and cancels the upload) as soon as it passes the cap.
    text = await readCappedText(request, MAX_FORM_BYTES);
  } catch {
    return null;
  }
  const form = new URLSearchParams(text);
  return { email: String(form.get('email') || '').trim().toLowerCase(), code: String(form.get('code') || '').trim() };
}

async function signIn(request, env) {
  if (!isAllowedOrigin(request)) return signInPage({ message: 'Please sign in from askthemove.online.', status: 403 });
  const form = await readForm(request);
  if (!form) return signInPage({ message: 'That form was too large.', status: 413 });
  const ipHash = await hashIp(clientIp(request), env.IP_HASH_SALT, 'betapp');
  if ((await countSubmission(env.DB, ipHash)) > MAX_ATTEMPTS) {
    const res = signInPage({ message: 'Too many tries. Wait ten minutes and try again.', email: form.email, status: 429 });
    res.headers.set('retry-after', String(retryAfterSeconds()));
    return res;
  }
  const expected = parseUsers(env.BETA_USERS).get(form.email);
  // Compare even when the email is unknown, so the answer takes the same time either way.
  const ok = await timingSafeEqualText(form.code, expected || 'no-such-user-placeholder');
  if (!expected || !ok) return signInPage({ message: 'That email and code don’t match. Check both and try again.', email: form.email, status: 401 });
  return redirect(`${BASE}/`, sessionCookie(await signSession(form.email, env.BETA_SESSION_SECRET), SESSION_DAYS * 86400));
}

/** The whole gate: sign-in, sign-out, and the app's files for signed-in testers. */
export async function handleBetapp({ request, env, next }) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (!env.BETA_USERS || !env.BETA_SESSION_SECRET || !env.IP_HASH_SALT || !env.DB) {
    return new Response('The beta app is not set up yet.', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
  }
  if (path === `${BASE}/sign-in`) {
    if (request.method === 'POST') return signIn(request, env);
    return redirect(`${BASE}/`);
  }
  if (path === `${BASE}/sign-out`) return redirect('/', sessionCookie('', 0));

  const email = await verifySession(readCookie(request, COOKIE), env.BETA_SESSION_SECRET);
  if (!email || !parseUsers(env.BETA_USERS).has(email)) {
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response(null, { status: 401 });
    // Only a page visit gets the form; files and data get a plain 401.
    const page = path === BASE || path.endsWith('/') || (request.headers.get('accept') || '').includes('text/html');
    return page ? signInPage({ status: 401 }) : new Response(null, { status: 401, headers: { 'cache-control': 'no-store' } });
  }
  if (path === BASE) return redirect(`${BASE}/`);
  if (path === `${BASE}/headers.json`) return new Response(null, { status: 404 });

  const headers = await loadAppHeaders(env, request);
  if (!headers) return new Response('The beta app has not been built into this deploy.', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  const res = await next();
  const out = new Response(res.body, res);
  for (const [name, value] of Object.entries(headers)) out.headers.set(name, value);
  // Signed-in files must not land in a shared cache.
  if (!/\/assets\/|\/engine\//.test(path)) out.headers.set('cache-control', 'private, no-cache');
  else out.headers.set('cache-control', 'private, max-age=604800');
  return out;
}

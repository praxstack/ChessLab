// The /betapp gate: sign-in with email + beta code, the session cookie, and serving the app.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../functions/betapp/_middleware.js';
import { MAX_ATTEMPTS, parseUsers, resetAppHeadersForTests, signSession, verifySession } from '../src/lib/betapp.js';
import { makeEnv, request } from './helpers/d1.js';

const USERS = 'tester@example.com  correct-horse-1\nsecond@example.com:another-code';
const SECRET = 'session-secret-for-tests-0123456789abcdef';
const APP_HEADERS = { 'Content-Security-Policy': "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'", 'X-Frame-Options': 'DENY' };

function setup(overrides = {}) {
  const served = [];
  const env = makeEnv({
    BETA_USERS: USERS,
    BETA_SESSION_SECRET: SECRET,
    ASSETS: { fetch: async (req) => (new URL(req.url).pathname === '/betapp/headers.json' ? Response.json(APP_HEADERS) : new Response('missing', { status: 404 })) },
    ...overrides,
  });
  const call = (req) =>
    onRequest({
      request: req,
      env,
      next: async () => {
        served.push(new URL(req.url).pathname);
        return new Response('app file', { headers: { 'content-type': 'text/javascript' } });
      },
    });
  return { env, served, call };
}

const signIn = (call, email, code, opts = {}) => call(request('/betapp/sign-in', { method: 'POST', body: { email, code }, ...opts }));
const cookieOf = (res) => (res.headers.get('set-cookie') || '').split(';')[0];
const withCookie = (path, cookie, headers = {}) => request(path, { headers: { cookie, accept: 'text/html', ...headers } });

beforeEach(() => resetAppHeadersForTests());

test('parseUsers reads email + code pairs and skips junk', () => {
  const users = parseUsers(`${USERS}\nnot an entry\n,  Third@Example.org code with spaces ;bad@`);
  assert.deepEqual([...users], [
    ['tester@example.com', 'correct-horse-1'],
    ['second@example.com', 'another-code'],
    ['third@example.org', 'code with spaces'],
  ]);
  assert.equal(parseUsers('').size, 0);
  assert.equal(parseUsers(undefined).size, 0);
});

test('a session cookie verifies, and fails when tampered, expired or signed with another secret', async () => {
  const now = Date.parse('2026-10-30T12:00:00Z');
  const value = await signSession('tester@example.com', SECRET, now);
  assert.equal(await verifySession(value, SECRET, now), 'tester@example.com');
  assert.equal(await verifySession(value, 'other-secret', now), null);
  const [email, expires, mac] = value.split('.');
  assert.equal(await verifySession(`${email}.${Number(expires) + 1}.${mac}`, SECRET, now), null);
  assert.equal(await verifySession(`${btoa('someone@else.com')}.${expires}.${mac}`, SECRET, now), null);
  assert.equal(await verifySession(value, SECRET, now + 31 * 86400 * 1000), null);
  for (const junk of ['', 'a.b', 'a.b.c', 'x.123.!!!', null]) assert.equal(await verifySession(junk, SECRET, now), null);
});

test('without a session, the app is not served: pages get the sign-in form, files get 401', async () => {
  const { call, served } = setup();
  const page = await call(withCookie('/betapp/', ''));
  assert.equal(page.status, 401);
  const html = await page.text();
  assert.match(html, /Beta sign-in/);
  assert.match(html, /action="\/betapp\/sign-in"/);
  assert.match(page.headers.get('content-security-policy'), /default-src 'none'/);
  const file = await call(request('/betapp/assets/index-abc.js', { headers: { accept: '*/*' } }));
  assert.equal(file.status, 401);
  assert.equal(await file.text(), '');
  const forged = await call(withCookie('/betapp/', 'atm_beta=dGVzdGVyQGV4YW1wbGUuY29t.9999999999.AAAA'));
  assert.equal(forged.status, 401);
  assert.deepEqual(served, []);
});

test('the right email and code sign in; the app then loads with its own security headers', async () => {
  const { call, served } = setup();
  const res = await signIn(call, ' Tester@Example.com ', 'correct-horse-1');
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('location'), '/betapp/');
  const setCookie = res.headers.get('set-cookie');
  assert.match(setCookie, /^atm_beta=[^;]+; Path=\/betapp; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax$/);
  const app = await call(withCookie('/betapp/assets/index-abc.js', cookieOf(res)));
  assert.equal(app.status, 200);
  assert.equal(await app.text(), 'app file');
  assert.equal(app.headers.get('content-security-policy'), APP_HEADERS['Content-Security-Policy']);
  assert.equal(app.headers.get('x-frame-options'), 'DENY');
  assert.match(app.headers.get('cache-control'), /^private/);
  assert.deepEqual(served, ['/betapp/assets/index-abc.js']);
  // The bare path goes to the folder, and headers.json itself is never handed out.
  assert.equal((await call(withCookie('/betapp', cookieOf(res)))).headers.get('location'), '/betapp/');
  assert.equal((await call(withCookie('/betapp/headers.json', cookieOf(res)))).status, 404);
});

test('a wrong code, an unknown email or another person\'s code is refused without a cookie', async () => {
  const { call } = setup();
  for (const [email, code] of [
    ['tester@example.com', 'wrong'],
    ['tester@example.com', 'another-code'],
    ['nobody@example.com', 'correct-horse-1'],
    ['tester@example.com', ''],
  ]) {
    const res = await signIn(call, email, code);
    assert.equal(res.status, 401, `${email} / ${code}`);
    assert.equal(res.headers.get('set-cookie'), null);
    assert.match(await res.text(), /don’t match/);
  }
});

test('removing someone from BETA_USERS ends their session at once', async () => {
  const { call, env } = setup();
  const cookie = cookieOf(await signIn(call, 'second@example.com', 'another-code'));
  assert.equal((await call(withCookie('/betapp/', cookie))).status, 200);
  env.BETA_USERS = 'tester@example.com correct-horse-1';
  assert.equal((await call(withCookie('/betapp/', cookie))).status, 401);
});

test('sign-in attempts are rate limited per IP, and a foreign origin is refused', async () => {
  const { call } = setup();
  for (let i = 0; i < MAX_ATTEMPTS; i += 1) assert.equal((await signIn(call, 'tester@example.com', `guess-${i}`)).status, 401);
  const limited = await signIn(call, 'tester@example.com', 'correct-horse-1');
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get('retry-after')) > 0);
  assert.equal((await signIn(call, 'tester@example.com', 'correct-horse-1', { ip: '198.51.100.9' })).status, 303);
  assert.equal((await signIn(call, 'tester@example.com', 'correct-horse-1', { ip: '198.51.100.10', origin: 'https://evil.example' })).status, 403);
});

test('sign-out clears the cookie; a missing secret keeps everything closed', async () => {
  const { call } = setup();
  const out = await call(request('/betapp/sign-out'));
  assert.equal(out.status, 303);
  assert.match(out.headers.get('set-cookie'), /^atm_beta=; Path=\/betapp; Max-Age=0/);
  for (const missing of ['BETA_USERS', 'BETA_SESSION_SECRET', 'IP_HASH_SALT']) {
    const closed = setup({ [missing]: undefined });
    assert.equal((await closed.call(withCookie('/betapp/', ''))).status, 503, missing);
    assert.deepEqual(closed.served, []);
  }
});

test('an app build missing from the deploy is a 503, not an unprotected file', async () => {
  const { call, served } = setup({ ASSETS: { fetch: async () => new Response('missing', { status: 404 }) } });
  const cookie = cookieOf(await signIn(call, 'tester@example.com', 'correct-horse-1'));
  assert.equal((await call(withCookie('/betapp/', cookie))).status, 503);
  assert.deepEqual(served, []);
});

test('an oversized sign-in body is cut off while streaming, before the rate limiter or any check', async () => {
  const { call } = setup();
  let pulled = 0;
  let cancelled = false;
  const chunk = new TextEncoder().encode('x'.repeat(1024));
  const body = new ReadableStream({
    pull(controller) {
      pulled += chunk.byteLength;
      controller.enqueue(chunk);
      if (pulled >= 4 * 1024 * 1024) controller.close();
    },
    cancel() {
      cancelled = true;
    },
  });
  const req = new Request('https://askthemove.online/betapp/sign-in', {
    method: 'POST',
    body,
    duplex: 'half',
    headers: { origin: 'https://askthemove.online', 'content-type': 'application/x-www-form-urlencoded', 'cf-connecting-ip': '203.0.113.50' },
  });
  const res = await call(req);
  assert.equal(res.status, 413);
  assert.equal(res.headers.get('set-cookie'), null);
  assert.ok(cancelled, 'the upload is cancelled');
  assert.ok(pulled < 64 * 1024, `read only ${pulled} bytes`);
});

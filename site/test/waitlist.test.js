import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';
import { onRequestPost, onRequest as waitlistAny } from '../functions/api/waitlist.js';
import { onRequestGet as exportGet, onRequest as exportAny } from '../functions/api/waitlist/export.js';
import { onRequestGet as healthGet } from '../functions/api/health.js';
import { makeEnv, postForm, postJson } from './helpers/d1.js';

const call = (request, env) => onRequestPost({ request, env });
const good = { email: 'Learner@Gmail.com', consent: true, rating: '800-1200', source: 'hero' };

test('valid signup returns ok and stores one normalised row', async () => {
  const env = makeEnv();
  const res = await call(postJson({ ...good, utm_source: 'reddit', referrer: 'https://news.ycombinator.com/' }), env);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  assert.match(res.headers.get('content-type'), /application\/json/);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.match(body.pulse, /^[0-9a-f]{32}$/, 'a sign-up gets a pulse code for the market pulse');
  assert.ok(!('manage' in body), 'the private manage link is never returned to the page');
  const rows = env.DB.rows('waitlist');
  assert.equal(rows.length, 1);
  const [row] = rows;
  assert.equal(row.email, 'learner@gmail.com');
  assert.equal(row.product, 'askthemove');
  assert.deepEqual(JSON.parse(row.fields), { rating: '800-1200' });
  assert.equal(row.source, 'hero');
  assert.deepEqual(JSON.parse(row.utm), { utm_source: 'reddit', referrer: 'https://news.ycombinator.com/' });
  assert.ok(row.consent_at && row.created_at);
  assert.equal(row.pulse_token, body.pulse);
  assert.match(row.manage_token, /^[0-9a-f]{32}$/);
  assert.notEqual(row.manage_token, row.pulse_token);
  assert.deepEqual(JSON.parse(row.lists), { beta: row.consent_at, letter: null, research: null });
  assert.equal(row.lists_updated_at, row.consent_at);
  assert.equal(row.answers, null);
  assert.ok(!('ip_hash' in row), 'the IP hash stays in the rate-limit table, not with the email');
  assert.ok(!JSON.stringify(row).includes('203.0.113.7'), 'raw IP must not be stored');
  const [counter] = env.DB.rows('rate_limits');
  assert.match(counter.ip_hash, /^[0-9a-f]{64}$/);
});

test('duplicate email gets an answer of the same shape as a new one, and nothing is stored or changed', async () => {
  const env = makeEnv();
  const first = await call(postJson(good), env);
  const before = env.DB.rows('waitlist')[0];
  const res = await call(postJson({ ...good, email: '  LEARNER@gmail.com ', rating: '1600-plus' }), env);
  assert.equal(res.status, first.status);
  assert.equal(res.status, 200);
  const a = await first.json();
  const b = await res.json();
  assert.deepEqual(Object.keys(a), ['ok', 'pulse']);
  assert.deepEqual(Object.keys(b), ['ok', 'pulse']);
  assert.match(b.pulse, /^[0-9a-f]{32}$/);
  assert.notEqual(a.pulse, b.pulse);
  // Nothing about the second answer says the address was already there.
  const rows = env.DB.rows('waitlist');
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], before, 'an existing row is never touched by the public form');
  assert.notEqual(rows[0].pulse_token, b.pulse, 'the throwaway pulse code matches nothing');
});

test('without IP_HASH_SALT sign-ups are refused and nothing is stored', async () => {
  const env = makeEnv({ IP_HASH_SALT: '' });
  const res = await call(postJson(good), env);
  assert.equal(res.status, 503);
  assert.equal((await res.json()).ok, false);
  assert.equal(env.DB.rows('waitlist').length, 0);
  assert.equal(env.DB.rows('rate_limits').length, 0);

  const form = await call(postForm({ email: 'form@gmail.com', consent: 'on' }), env);
  assert.equal(form.headers.get('location'), '/?error=server#join-error');
  assert.equal(env.DB.rows('waitlist').length, 0);
});

test('multipart posts keep their case-sensitive boundary', async () => {
  const env = makeEnv();
  const fd = new FormData();
  fd.set('email', 'multi@gmail.com');
  fd.set('consent', 'on');
  const encoded = new Request('https://example.invalid/', { method: 'POST', body: fd });
  const type = encoded.headers.get('content-type');
  const boundary = type.split('boundary=')[1];
  const upper = 'AaBb' + boundary;
  const body = (await encoded.text()).split(boundary).join(upper);
  const res = await call(postJson({}, { headers: { 'content-type': `multipart/form-data; boundary=${upper}` }, raw: body }), env);
  assert.equal(res.status, 200);
  assert.equal(env.DB.rows('waitlist')[0].email, 'multi@gmail.com');

  const broken = await call(postJson({}, { headers: { 'content-type': 'multipart/form-data; boundary=missing' }, raw: 'not multipart' }), env);
  assert.equal(broken.status, 400);
});

test('honeypot returns 200, shaped like a real sign-up, and stores nothing at all', async () => {
  const env = makeEnv();
  const res = await call(postJson({ ...good, website: 'http://spam.example' }), env);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(Object.keys(body), ['ok', 'pulse']);
  assert.match(body.pulse, /^[0-9a-f]{32}$/);
  assert.equal(env.DB.rows('waitlist').length, 0);
  assert.equal(env.DB.rows('rate_limits').length, 0);
});

test('bad email returns 400 with a sentence the page can show', async () => {
  const env = makeEnv();
  const res = await call(postJson({ ...good, email: 'not-an-email' }), env);
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.ok, false);
  assert.match(body.error, /email address/);
  assert.equal(env.DB.rows('waitlist').length, 0);
});

test('missing consent returns 400', async () => {
  const env = makeEnv();
  for (const consent of [undefined, false, 'off']) {
    const res = await call(postJson({ ...good, consent }), env);
    assert.equal(res.status, 400);
    assert.match((await res.json()).error, /Tick the box/);
  }
  assert.equal(env.DB.rows('waitlist').length, 0);
});

test('unknown rating band returns 400; blank rating is fine', async () => {
  const env = makeEnv();
  assert.equal((await call(postJson({ ...good, rating: '3000' }), env)).status, 400);
  const res = await call(postJson({ email: 'b@gmail.com', consent: 'on', rating: '' }, { ip: '198.51.100.9' }), env);
  assert.equal(res.status, 200);
  assert.deepEqual(JSON.parse(env.DB.rows('waitlist')[0].fields), {});
});

test('sixth attempt from one IP inside ten minutes gets 429; other IPs are unaffected', async () => {
  const env = makeEnv();
  const t0 = Date.UTC(2026, 9, 8, 10, 0, 0);
  const statuses = [];
  for (let i = 0; i < 6; i += 1) {
    const res = await onRequestPost({
      request: postJson({ ...good, email: `p${i}@gmail.com` }),
      env,
    }).then((r) => r);
    statuses.push(res.status);
  }
  // Uses the real clock above; repeat with a fixed clock through the lib to check the window rolls.
  assert.deepEqual(statuses, [200, 200, 200, 200, 200, 429]);
  assert.equal(env.DB.rows('waitlist').length, 5);

  const other = await call(postJson({ ...good, email: 'other@gmail.com' }, { ip: '192.0.2.50' }), env);
  assert.equal(other.status, 200);

  const { handleWaitlistPost } = await import('../src/lib/waitlist.js');
  const env2 = makeEnv();
  const at = (minutes) => t0 + minutes * 60 * 1000;
  for (let i = 0; i < 5; i += 1) {
    const r = await handleWaitlistPost(postJson({ ...good, email: `q${i}@gmail.com` }), env2, { now: at(i) });
    assert.equal(r.status, 200);
  }
  const blocked = await handleWaitlistPost(postJson({ ...good, email: 'q5@gmail.com' }), env2, { now: at(5) });
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers.get('retry-after')) > 0);
  assert.match((await blocked.json()).error, /wait ten minutes/);
  // 11 minutes after the first attempt, the oldest attempts have left the window.
  const later = await handleWaitlistPost(postJson({ ...good, email: 'q6@gmail.com' }), env2, { now: at(12) });
  assert.equal(later.status, 200);
});

test('attempts late in a minute still count for the full ten minutes', async () => {
  const { handleWaitlistPost } = await import('../src/lib/waitlist.js');
  const env = makeEnv();
  const t0 = Date.UTC(2026, 9, 8, 10, 0, 59);
  for (let i = 0; i < 5; i += 1) {
    const r = await handleWaitlistPost(postJson({ ...good, email: `r${i}@gmail.com` }), env, { now: t0 });
    assert.equal(r.status, 200);
  }
  // 9 minutes 2 seconds later all five are still inside the window.
  const sixth = await handleWaitlistPost(postJson({ ...good, email: 'r5@gmail.com' }), env, {
    now: Date.UTC(2026, 9, 8, 10, 10, 1),
  });
  assert.equal(sixth.status, 429);
  assert.equal(sixth.headers.get('retry-after'), '660');
});

test('cross-origin posts are refused; same origin and localhost dev are allowed', async () => {
  const env = makeEnv();
  const res = await call(postJson(good, { origin: 'https://evil.example' }), env);
  assert.equal(res.status, 403);
  assert.equal(env.DB.rows('waitlist').length, 0);

  // Same host over plain HTTP is a different origin.
  const plain = await call(postJson(good, { origin: 'http://askthemove.pages.dev' }), env);
  assert.equal(plain.status, 403);
  assert.equal(env.DB.rows('waitlist').length, 0);

  const noOrigin = await call(postJson({ ...good, email: 'n@gmail.com' }, { origin: null }), env);
  assert.equal(noOrigin.status, 200);

  const local = new Request('http://localhost:8788/api/waitlist', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:8788' },
    body: JSON.stringify({ ...good, email: 'local@gmail.com' }),
  });
  assert.equal((await call(local, env)).status, 200);
});

test('plain HTML form posts are redirected back to the page', async () => {
  const env = makeEnv();
  const ok = await call(postForm({ email: 'form@gmail.com', consent: 'on', rating: 'not-sure' }), env);
  assert.equal(ok.status, 303);
  assert.equal(ok.headers.get('location'), '/?joined=1#joined');
  assert.equal(env.DB.rows('waitlist')[0].email, 'form@gmail.com');

  const again = await call(postForm({ email: 'form@gmail.com', consent: 'on' }), env);
  assert.equal(again.headers.get('location'), '/?joined=1#joined');

  const bad = await call(postForm({ email: 'nope', consent: 'on' }), env);
  assert.equal(bad.status, 303);
  assert.equal(bad.headers.get('location'), '/?error=email#join-error');
});

test('unreadable and oversized bodies are rejected', async () => {
  const env = makeEnv();
  const broken = new Request('https://askthemove.pages.dev/api/waitlist', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{"email":',
  });
  assert.equal((await call(broken, env)).status, 400);
  const huge = postJson({ ...good, source: 'x'.repeat(20000) });
  assert.equal((await call(huge, env)).status, 413);
});

test('a chunked body with no length is cut off once it passes 16 KB', async () => {
  const env = makeEnv();
  const chunk = new TextEncoder().encode('x'.repeat(1024));
  let pulled = 0;
  let cancelled = false;
  const stream = new ReadableStream({
    pull(controller) {
      pulled += 1;
      if (pulled > 1024) controller.close();
      else controller.enqueue(chunk);
    },
    cancel() {
      cancelled = true;
    },
  });
  const request = new Request('https://askthemove.pages.dev/api/waitlist', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json', 'cf-connecting-ip': '203.0.113.7' },
    body: stream,
    duplex: 'half',
  });
  assert.equal(request.headers.get('content-length'), null);
  const res = await call(request, env);
  assert.equal(res.status, 413);
  assert.ok(cancelled, 'the rest of the body is not read');
  assert.ok(pulled < 40, `read ${pulled} KB before stopping`);
  assert.equal(env.DB.rows('waitlist').length, 0);
});

test('Turnstile is enforced only when TURNSTILE_SECRET is set', async () => {
  const env = makeEnv({ TURNSTILE_SECRET: 'ts-secret' });
  const { handleWaitlistPost } = await import('../src/lib/waitlist.js');
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, body: String(init.body) });
    const token = new URLSearchParams(String(init.body)).get('response');
    return new Response(JSON.stringify({ success: token === 'pass' }), { status: 200 });
  };
  const missing = await handleWaitlistPost(postJson(good), env, { fetchImpl });
  assert.equal(missing.status, 400);
  assert.match((await missing.json()).error, /human check/);
  const failed = await handleWaitlistPost(postJson({ ...good, 'cf-turnstile-response': 'nope' }), env, { fetchImpl });
  assert.equal(failed.status, 400);
  const passed = await handleWaitlistPost(postJson({ ...good, 'cf-turnstile-response': 'pass' }), env, { fetchImpl });
  assert.equal(passed.status, 200);
  assert.ok(calls.every((c) => c.url.includes('challenges.cloudflare.com')));
  assert.ok(calls.at(-1).body.includes('secret=ts-secret'));
});

test('a stalled Turnstile check fails closed instead of hanging', async () => {
  const { verifyTurnstile } = await import('../src/lib/turnstile.js');
  // Siteverify accepts the connection and never answers; only an abort ends the request.
  const fetchImpl = (url, init) => new Promise((_, reject) => {
    init.signal?.addEventListener('abort', () => reject(init.signal.reason));
  });
  const giveUp = new AbortController();
  const stalled = sleep(1000, 'still waiting', { signal: giveUp.signal }).catch(() => {});
  const result = await Promise.race([verifyTurnstile({ secret: 's', token: 't', fetchImpl, timeoutMs: 50 }), stalled]);
  giveUp.abort();
  assert.equal(result, false);
});

test('database failure returns a generic 500', async () => {
  const env = makeEnv();
  env.DB.failNext = true;
  const res = await call(postJson(good), env);
  assert.equal(res.status, 500);
  const body = await res.json();
  assert.equal(body.ok, false);
  assert.doesNotMatch(body.error, /D1|sqlite|simulated/i);
});

test('wrong method on /api/waitlist is 405', async () => {
  const env = makeEnv();
  const res = await waitlistAny({ request: new Request('https://askthemove.pages.dev/api/waitlist'), env });
  assert.equal(res.status, 405);
  assert.equal(res.headers.get('allow'), 'POST');
  const viaAny = await waitlistAny({ request: postJson(good), env });
  assert.equal(viaAny.status, 200);
});

const exportRequest = (auth) =>
  new Request('https://askthemove.pages.dev/api/waitlist/export', {
    headers: auth ? { authorization: auth } : {},
  });

test('export requires the admin token', async () => {
  const env = makeEnv();
  for (const auth of [undefined, 'Bearer wrong', 'Basic dGVzdA==', 'Bearer ', 'test-admin-token']) {
    const res = await exportGet({ request: exportRequest(auth), env });
    assert.equal(res.status, 401, String(auth));
    assert.equal(res.headers.get('cache-control'), 'no-store');
  }
  const noToken = makeEnv({ ADMIN_TOKEN: '' });
  assert.equal((await exportGet({ request: exportRequest('Bearer '), env: noToken })).status, 401);
  assert.equal((await exportGet({ request: exportRequest('Bearer undefined'), env: noToken })).status, 401);
});

test('export returns CSV with escaping and formula guard', async () => {
  const env = makeEnv();
  await call(postJson({ ...good, email: 'first@gmail.com', source: '=cmd|calc' }), env);
  await call(postJson({ ...good, email: 'second@gmail.com', rating: '', source: 'footer, bottom' }), env);
  const res = await exportGet({ request: exportRequest('Bearer test-admin-token'), env });
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/csv/);
  assert.match(res.headers.get('content-disposition'), /attachment; filename="askthemove-waitlist-\d{4}-\d{2}-\d{2}\.csv"/);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  const lines = (await res.text()).trim().split('\r\n');
  assert.equal(lines[0], 'email,created_at,fields,source,utm,lists,answers,manage_url');
  assert.equal(lines.length, 3);
  assert.ok(lines[1].startsWith('first@gmail.com,'));
  assert.ok(lines[1].includes(`"{""rating"":""800-1200""}"`));
  assert.ok(lines[1].includes(",'=cmd|calc,"));
  assert.ok(lines[2].includes('"footer, bottom"'));
  assert.ok(!lines.join('').includes('ip_hash'));
  // The lists JSON and the full manage link, built from the request's own origin.
  const [first] = env.DB.rows('waitlist');
  assert.ok(lines[1].includes(`"{""beta"":""${first.consent_at}"",""letter"":null,""research"":null}"`));
  assert.ok(lines[1].endsWith(`,,https://askthemove.pages.dev/manage/?t=${first.manage_token}`), lines[1]);
});

test('export rejects other methods with 405', async () => {
  const env = makeEnv();
  const res = await exportAny({
    request: new Request('https://askthemove.pages.dev/api/waitlist/export', { method: 'DELETE' }),
    env,
  });
  assert.equal(res.status, 405);
});

test('health check', async () => {
  const res = await healthGet({ request: new Request('https://askthemove.pages.dev/api/health'), env: {} });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
});

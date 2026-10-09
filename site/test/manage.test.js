// The manage link: lists, one-click unsubscribe, the market pulse, self-delete,
// the server-rendered manage page, and the admin stats.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost as signupPost } from '../functions/api/waitlist.js';
import { onRequestPost as prefsPost, onRequest as prefsAny } from '../functions/api/waitlist/preferences.js';
import { onRequestPost as unsubPost, onRequest as unsubAny } from '../functions/api/waitlist/unsubscribe.js';
import { onRequestPost as deletePost, onRequest as deleteAny } from '../functions/api/waitlist/delete.js';
import { onRequestPost as pulsePost, onRequest as pulseAny } from '../functions/api/waitlist/pulse.js';
import { onRequestGet as statsGet, onRequest as statsAny } from '../functions/api/waitlist/stats.js';
import { onRequestGet as manageGet, onRequest as manageAny } from '../functions/manage/[[path]].js';
import { handleManageGet, handlePreferencesPost, renderManagePage, summarize } from '../src/lib/waitlist.js';
import { LIMITS, PULSE } from '../src/lib/config.js';
import { MESSAGES, parseLists, parsePulse, parseToken } from '../src/lib/validate.js';
import { makeEnv, postJson, request } from './helpers/d1.js';

const TOKEN = /^[0-9a-f]{32}$/;

/** Signs up and returns the row's manage code (from the database: it is never in the response) and the pulse code. */
async function signup(env, email, extra = {}, opts = {}) {
  const res = await signupPost({ request: postJson({ email, consent: true, source: 'hero', ...extra }, opts), env });
  const body = await res.json();
  const row = env.DB.rows('waitlist').find((r) => r.email === email.trim().toLowerCase());
  return { res, body, token: row ? row.manage_token : null, pulse: body.pulse };
}
const rowOf = (env, email) => env.DB.rows('waitlist').find((r) => r.email === email);
const lists = (env, email) => JSON.parse(rowOf(env, email).lists);
const answers = (env, email) => JSON.parse(rowOf(env, email).answers || 'null');

test('parseToken accepts 32 hex characters and nothing else', () => {
  const good = 'a6518ae057db2596a2c48d7a2933796d';
  assert.equal(parseToken(good), good);
  assert.equal(parseToken(` ${good.toUpperCase()} `), good);
  for (const bad of ['', 'x', good.slice(1), `${good}0`, good.replace('a', 'g'), 42, null, undefined]) {
    assert.equal(parseToken(bad), '', String(bad));
  }
});

test('parseLists reads the three boxes; parsePulse keeps known answers and rejects unknown ones', () => {
  assert.deepEqual(parseLists({ beta: 'on', letter: true, research: 'off' }), { beta: true, letter: true, research: false });
  assert.deepEqual(parseLists(undefined), { beta: false, letter: false, research: false });
  assert.deepEqual(parsePulse({ review: 'Lichess', pay: '5to10', wish: '  mate patterns \u0000 ', hardest: '' }), {
    ok: true,
    answers: { review: 'lichess', pay: '5to10', wish: 'mate patterns' },
  });
  assert.deepEqual(parsePulse({}), { ok: true, answers: {} });
  assert.deepEqual(parsePulse({ wish: '' }), { ok: true, answers: { wish: null } }, 'an empty wish means clear it');
  assert.deepEqual(parsePulse({ review: 'telepathy' }), { ok: false, error: MESSAGES.pulseInvalid });
  assert.equal(parsePulse({ wish: 'x'.repeat(500) }).answers.wish.length, PULSE.freeText.max);
});

test('a new sign-up stores a manage code and a pulse code; only the pulse code is returned', async () => {
  const env = makeEnv();
  const { body, token, pulse } = await signup(env, 'first@gmail.com');
  assert.match(token, TOKEN);
  assert.match(pulse, TOKEN);
  assert.notEqual(token, pulse);
  assert.deepEqual(Object.keys(body), ['ok', 'pulse']);
  const row = rowOf(env, 'first@gmail.com');
  assert.equal(row.pulse_token, pulse);
  assert.deepEqual(lists(env, 'first@gmail.com'), { beta: row.consent_at, letter: null, research: null });
});

test('a repeat sign-up never changes an existing row, even after it left every list; the manage link brings it back', async () => {
  const env = makeEnv();
  const { token } = await signup(env, 'back@gmail.com');
  const left = await unsubPost({ request: request('/api/waitlist/unsubscribe', { method: 'POST', body: { t: token }, json: true }), env });
  assert.equal(left.status, 200);
  const suppressed = rowOf(env, 'back@gmail.com');
  assert.deepEqual(JSON.parse(suppressed.lists), { beta: null, letter: null, research: null });

  const again = await signup(env, 'back@gmail.com', {}, { ip: '198.51.100.2' });
  assert.equal(again.res.status, 200);
  assert.match(again.pulse, TOKEN, 'the answer looks exactly like a fresh sign-up');
  assert.deepEqual(rowOf(env, 'back@gmail.com'), suppressed, 'a ticked box on a public form proves nothing, so nothing moves');
  assert.equal(env.DB.rows('waitlist').length, 1);

  const rejoin = await prefsPost({ request: request('/api/waitlist/preferences', { method: 'POST', body: { t: token, beta: 'on' }, json: true }), env });
  assert.equal(rejoin.status, 200);
  assert.match(lists(env, 'back@gmail.com').beta, /^\d{4}-/);
});

test('the manage page renders the current choices, the email and the code into every form, and sends no referrer', async () => {
  const env = makeEnv();
  const { token } = await signup(env, 'Page@Gmail.com');
  const res = await manageGet({ request: request(`/manage/?t=${token}&saved=1`), env });
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/html/);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  assert.equal(res.headers.get('x-robots-tag'), 'noindex');
  assert.equal(res.headers.get('referrer-policy'), 'no-referrer');
  // Cloudflare does not apply _headers to Function responses, so the page sets them itself.
  assert.match(res.headers.get('content-security-policy'), /default-src 'self'.*frame-ancestors 'none'/);
  assert.equal(res.headers.get('x-frame-options'), 'DENY');
  assert.equal(res.headers.get('cross-origin-opener-policy'), 'same-origin');
  const head = await manageGet({ request: request(`/manage/?t=${token}`, { method: 'HEAD' }), env });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  const html = await res.text();
  assert.match(html, /<section class="manage__state" data-state="form">/);
  assert.match(html, /<section class="manage__state" data-state="invalid" hidden>/);
  assert.match(html, /<section class="manage__state" data-state="deleted" hidden>/);
  assert.match(html, /<section class="manage__state" data-state="later" hidden>/);
  assert.match(html, /<span data-email>page@gmail\.com<\/span>/);
  assert.equal((html.match(new RegExp(`<input type="hidden" name="t" value="${token}">`, 'g')) || []).length, 4);
  assert.match(html, /<input id="list-beta" name="beta" type="checkbox" checked>/);
  assert.match(html, /<input id="list-letter" name="letter" type="checkbox">/);
  assert.match(html, /<p class="manage__note" data-note="saved" role="status">Saved\.<\/p>/);
  assert.match(html, /<p class="manage__note" data-note="left" role="status" hidden>/);
});

test('the manage page shows invalid, deleted or later, never a good link as bad', async () => {
  const env = makeEnv();
  for (const path of ['/manage/', '/manage/?t=nope', `/manage/?t=${'0'.repeat(32)}`]) {
    const res = await manageGet({ request: request(path), env });
    assert.equal(res.status, 404, path);
    const html = await res.text();
    assert.match(html, /<section class="manage__state" data-state="invalid">/);
    assert.match(html, /<section class="manage__state" data-state="form" hidden>/);
    assert.doesNotMatch(html, /data-email>[^<]/, 'no email leaks');
  }
  const deleted = await manageGet({ request: request('/manage/?deleted=1'), env });
  assert.equal(deleted.status, 200);
  assert.match(await deleted.text(), /<section class="manage__state" data-state="deleted">/);

  // The database is down: a service problem, not a bad link.
  const { token } = await signup(env, 'later@gmail.com');
  env.DB.failNext = true;
  const down = await manageGet({ request: request(`/manage/?t=${token}`), env });
  assert.equal(down.status, 500);
  const downHtml = await down.text();
  assert.match(downHtml, /<section class="manage__state" data-state="later">/);
  assert.match(downHtml, /<section class="manage__state" data-state="invalid" hidden>/);
  // A page view is not counted, so it needs no salt and still renders.
  const noSalt = await manageGet({ request: request(`/manage/?t=${token}`), env: makeEnv({ IP_HASH_SALT: '', DB: env.DB }) });
  assert.equal(noSalt.status, 200);

  assert.equal((await manageAny({ request: request('/manage/', { method: 'POST', body: {} }), env })).status, 405);
});

test('a dollar sign in the address or the wish lands on the page as text', async () => {
  const env = makeEnv();
  const { token } = await signup(env, 'a$`b$&c@gmail.com');
  await pulsePost({ request: request('/api/waitlist/pulse', { method: 'POST', body: { t: token, wish: "I wish $` and $' were $1 explained" }, json: true }), env });
  const res = await manageGet({ request: request(`/manage/?t=${token}`), env });
  const html = await res.text();
  assert.match(html, /<span data-email>a\$`b\$&amp;c@gmail\.com<\/span>/);
  assert.match(html, /<textarea id="pulse-manage-wish" name="wish" rows="2" maxlength="200">I wish \$` and \$&#39; were \$1 explained<\/textarea>/);
  assert.equal((html.match(/<head>/g) || []).length, 1, 'no copy of the page got spliced in');
});

test('an empty wish clears the stored one; the honeypot answer has the same shape as a real sign-up', async () => {
  const env = makeEnv();
  const { token } = await signup(env, 'clear@gmail.com');
  await pulsePost({ request: request('/api/waitlist/pulse', { method: 'POST', body: { t: token, wish: 'tempo', review: 'none' }, json: true }), env });
  assert.equal(answers(env, 'clear@gmail.com').wish, 'tempo');
  const cleared = await pulsePost({ request: request('/api/waitlist/pulse', { method: 'POST', body: { t: token, wish: '' }, json: true }), env });
  assert.deepEqual(await cleared.json(), { ok: true, lists: { beta: true, letter: false, research: false }, answered: 0 });
  assert.equal(answers(env, 'clear@gmail.com').wish, undefined);
  assert.equal(answers(env, 'clear@gmail.com').review, 'none', 'other answers stay');

  const bot = await signupPost({ request: postJson({ email: 'bot@gmail.com', consent: true, website: 'spam' }), env });
  const body = await bot.json();
  assert.deepEqual(Object.keys(body), ['ok', 'pulse']);
  assert.match(body.pulse, TOKEN);
  assert.equal(rowOf(env, 'bot@gmail.com'), undefined);
});

test('rows written before the lists existed read as beta-on since consent, in the page, the export and the stats', async () => {
  const env = makeEnv();
  await signup(env, 'old@gmail.com');
  env.DB.db.prepare("UPDATE waitlist SET lists = NULL, lists_updated_at = NULL WHERE email = 'old@gmail.com'").run();
  const { token } = { token: rowOf(env, 'old@gmail.com').manage_token };
  const page = await manageGet({ request: request(`/manage/?t=${token}`), env });
  assert.match(await page.text(), /<input id="list-beta" name="beta" type="checkbox" checked>/);
  const stats = await (await statsGet({ request: request('/api/waitlist/stats', { headers: { authorization: 'Bearer test-admin-token' } }), env })).json();
  assert.equal(stats.lists.beta, 1);
  const { onRequestGet: exportGet } = await import('../functions/api/waitlist/export.js');
  const csv = await (await exportGet({ request: request('/api/waitlist/export', { headers: { authorization: 'Bearer test-admin-token' } }), env })).text();
  assert.match(csv, /"{""beta"":""\d{4}-[^"]+"",""letter"":null,""research"":null}"/);
});

test('renderManagePage escapes what it fills in', () => {
  const template = [
    '<section data-state="invalid"></section>',
    '<section data-state="deleted" hidden></section>',
    '<section data-state="later" hidden></section>',
    '<section data-state="form" hidden><span data-email></span>',
    '<input type="hidden" name="t" value="">',
    '<input id="list-beta" name="beta" type="checkbox">',
    '<input id="pulse-manage-review-lichess" name="review" type="radio" value="lichess">',
    '<textarea id="pulse-manage-wish" name="wish"></textarea></section>',
  ].join('\n');
  const html = renderManagePage(template, {
    state: 'form',
    email: 'a<b>@x.com',
    token: 'f'.repeat(32),
    lists: { beta: '2026-10-09T00:00:00Z', letter: null, research: null },
    answers: { review: 'lichess', wish: '</textarea><script>1</script>' },
  });
  assert.match(html, /<span data-email>a&lt;b&gt;@x\.com<\/span>/);
  assert.match(html, /<input id="list-beta" name="beta" type="checkbox" checked>/);
  assert.match(html, /<input id="pulse-manage-review-lichess" name="review" type="radio" value="lichess" checked>/);
  assert.match(html, /<textarea id="pulse-manage-wish" name="wish">&lt;\/textarea&gt;&lt;script&gt;1&lt;\/script&gt;<\/textarea>/);
  assert.match(html, /<section data-state="invalid" hidden>/);
  assert.match(html, /<section data-state="later" hidden>/);
  assert.match(html, /<section data-state="form">/);
});

test('preferences: a form post saves the boxes and redirects; JSON returns the lists; timestamps of lists kept on survive', async () => {
  const env = makeEnv();
  const { token } = await signup(env, 'prefs@gmail.com');
  const before = lists(env, 'prefs@gmail.com');
  const form = await prefsPost({ request: request('/api/waitlist/preferences', { method: 'POST', body: { t: token, beta: 'on', letter: 'on' } }), env });
  assert.equal(form.status, 303);
  assert.equal(form.headers.get('location'), `/manage/?t=${token}&saved=1#manage`);
  let now = lists(env, 'prefs@gmail.com');
  assert.equal(now.beta, before.beta, 'beta stayed on with its original timestamp');
  assert.match(now.letter, /^\d{4}-/);
  assert.equal(now.research, null);

  const json = await prefsPost({ request: request('/api/waitlist/preferences', { method: 'POST', body: { t: token, research: true }, json: true }), env });
  assert.equal(json.status, 200);
  assert.deepEqual(await json.json(), { ok: true, lists: { beta: false, letter: false, research: true } });
  now = lists(env, 'prefs@gmail.com');
  assert.equal(now.beta, null);
  assert.equal(now.letter, null);
  assert.match(now.research, /^\d{4}-/);
  assert.ok(rowOf(env, 'prefs@gmail.com').lists_updated_at);
  assert.deepEqual(JSON.parse(rowOf(env, 'prefs@gmail.com').fields), {}, 'nothing cleared while a list is still on? the rating was blank anyway');
});

test('leaving every list, by unsubscribe or by unticking all, clears everything but the address, the choice and the manage code', async () => {
  const env = makeEnv();
  const { token, pulse } = await signup(env, 'leave@gmail.com', { rating: '1200-1600', utm_source: 'x' });
  await pulsePost({ request: request('/api/waitlist/pulse', { method: 'POST', body: { p: pulse, review: 'engine', wish: 'tempo' }, json: true }), env });
  const full = rowOf(env, 'leave@gmail.com');
  assert.ok(full.answers && full.created_at && full.consent_at && full.pulse_token);

  const form = await unsubPost({ request: request('/api/waitlist/unsubscribe', { method: 'POST', body: { t: token } }), env });
  assert.equal(form.status, 303);
  assert.equal(form.headers.get('location'), `/manage/?t=${token}&left=1#manage`);
  const cleared = rowOf(env, 'leave@gmail.com');
  assert.equal(cleared.email, 'leave@gmail.com');
  assert.equal(cleared.manage_token, token, 'the link still works, to delete or to come back');
  assert.deepEqual(JSON.parse(cleared.lists), { beta: null, letter: null, research: null });
  assert.match(cleared.lists_updated_at, /^\d{4}-/);
  for (const column of ['answers', 'source', 'consent_at', 'created_at', 'pulse_token']) assert.equal(cleared[column], null, column);
  assert.equal(cleared.fields, '{}');
  assert.equal(cleared.utm, '{}');
  assert.equal(env.DB.rows('waitlist').length, 1, 'the row stays so the address is not re-added by mistake');

  // Unticking every box on the preferences form is the same as unsubscribing.
  const other = await signup(env, 'untick@gmail.com', { rating: 'not-sure' }, { ip: '198.51.100.9' });
  const none = await prefsPost({ request: request('/api/waitlist/preferences', { method: 'POST', body: { t: other.token }, json: true }), env });
  assert.equal(none.status, 200);
  assert.equal(rowOf(env, 'untick@gmail.com').fields, '{}');
  assert.equal(rowOf(env, 'untick@gmail.com').created_at, null);
});

test('one-click unsubscribe: the RFC 8058 post with no Origin answers 200, never a redirect, and is not rate limited', async () => {
  const env = makeEnv();
  const { token } = await signup(env, 'oneclick@gmail.com');
  const oneClick = await unsubPost({
    request: request(`/api/waitlist/unsubscribe?t=${token}`, { method: 'POST', body: { 'List-Unsubscribe': 'One-Click' }, origin: null }),
    env,
  });
  assert.equal(oneClick.status, 200);
  assert.match(oneClick.headers.get('content-type'), /text\/plain/);
  assert.equal(await oneClick.text(), 'Unsubscribed.\n');
  assert.deepEqual(lists(env, 'oneclick@gmail.com'), { beta: null, letter: null, research: null });

  // A provider posts for everyone from a few addresses: the 31st in ten minutes still works.
  const { handleUnsubscribePost } = await import('../src/lib/waitlist.js');
  const t0 = Date.UTC(2026, 9, 9, 5, 0, 0);
  const people = [];
  for (let i = 0; i < LIMITS.manageRateLimitMax + 2; i += 1) people.push(await signup(env, `p${i}@gmail.com`, {}, { ip: `203.0.113.${(i % 200) + 10}` }));
  for (let i = 0; i < people.length; i += 1) {
    const res = await handleUnsubscribePost(
      request(`/api/waitlist/unsubscribe?t=${people[i].token}`, { method: 'POST', body: { 'List-Unsubscribe': 'One-Click' }, origin: null, ip: '66.102.0.1' }),
      env,
      { now: t0 + i * 1000 },
    );
    assert.equal(res.status, 200, `one-click number ${i + 1}`);
  }
  // An unknown code gets a plain 404, not a redirect the provider can't follow.
  const unknown = await unsubPost({
    request: request(`/api/waitlist/unsubscribe?t=${'c'.repeat(32)}`, { method: 'POST', body: { 'List-Unsubscribe': 'One-Click' }, origin: null }),
    env,
  });
  assert.equal(unknown.status, 404);
  assert.match(unknown.headers.get('content-type'), /text\/plain/);
  assert.equal(unknown.headers.get('location'), null);

  const json = await unsubPost({ request: request('/api/waitlist/unsubscribe', { method: 'POST', body: { t: token }, json: true }), env });
  assert.deepEqual(await json.json(), { ok: true, lists: { beta: false, letter: false, research: false } });
});

test('delete removes the row and the link stops working, and needs the confirmation on the server', async () => {
  const env = makeEnv();
  const { token } = await signup(env, 'gone@gmail.com');
  await signup(env, 'stays@gmail.com', {}, { ip: '198.51.100.3' });
  const unconfirmed = await deletePost({ request: request('/api/waitlist/delete', { method: 'POST', body: { t: token }, json: true }), env });
  assert.equal(unconfirmed.status, 400);
  assert.match((await unconfirmed.json()).error, /Tick the box/);
  const unconfirmedForm = await deletePost({ request: request('/api/waitlist/delete', { method: 'POST', body: { t: token } }), env });
  assert.equal(unconfirmedForm.headers.get('location'), `/manage/?t=${token}&error=1#manage`);
  assert.equal(env.DB.rows('waitlist').length, 2, 'nothing deleted without the tick');
  const res = await deletePost({ request: request('/api/waitlist/delete', { method: 'POST', body: { t: token, confirm: 'on' } }), env });
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('location'), '/manage/?deleted=1#manage');
  assert.deepEqual(env.DB.rows('waitlist').map((r) => r.email), ['stays@gmail.com']);
  const again = await deletePost({ request: request('/api/waitlist/delete', { method: 'POST', body: { t: token, confirm: true }, json: true }), env });
  assert.equal(again.status, 404);
  assert.equal((await manageGet({ request: request(`/manage/?t=${token}`), env })).status, 404);
});

test('pulse by the sign-up code: stores answers and opt-ins for a real code, discards them for any other, and answers the same either way', async () => {
  const env = makeEnv();
  const { pulse } = await signup(env, 'pulse@gmail.com');
  const real = await pulsePost({
    request: request('/api/waitlist/pulse', { method: 'POST', body: { p: pulse, review: 'chesscom', pay: 'under5', wish: ' Rook endings ', letter: 'on' }, json: true }),
    env,
  });
  assert.equal(real.status, 200);
  assert.deepEqual(await real.json(), { ok: true });
  let stored = answers(env, 'pulse@gmail.com');
  assert.equal(stored.v, PULSE.version);
  assert.equal(stored.review, 'chesscom');
  assert.equal(stored.pay, 'under5');
  assert.equal(stored.wish, 'Rook endings');
  assert.match(stored.at, /^\d{4}-/);
  assert.ok(lists(env, 'pulse@gmail.com').letter);

  const fake = await pulsePost({
    request: request('/api/waitlist/pulse', { method: 'POST', body: { p: 'b'.repeat(32), review: 'lichess', research: 'on' }, json: true }),
    env,
  });
  assert.equal(fake.status, 200);
  assert.deepEqual(await fake.json(), { ok: true }, 'indistinguishable from the real one');
  stored = answers(env, 'pulse@gmail.com');
  assert.equal(stored.review, 'chesscom', 'nothing changed');
  assert.equal(lists(env, 'pulse@gmail.com').research, null);

  const bad = await pulsePost({ request: request('/api/waitlist/pulse', { method: 'POST', body: { p: 'b'.repeat(32), review: 'telepathy' }, json: true }), env });
  assert.equal(bad.status, 400, 'validation is the same for a code that matches nothing');
  const badReal = await pulsePost({ request: request('/api/waitlist/pulse', { method: 'POST', body: { p: pulse, review: 'telepathy' }, json: true }), env });
  assert.equal(badReal.status, 400);
  assert.equal((await badReal.json()).error, MESSAGES.pulseInvalid);
});

test('pulse by code: a bad answer gets the same reply whether or not the code matched, as JSON and as a form post', async () => {
  const env = makeEnv();
  const { pulse } = await signup(env, 'shape@gmail.com');
  const fake = 'e'.repeat(32);
  for (const json of [true, false]) {
    const real = await pulsePost({ request: request('/api/waitlist/pulse', { method: 'POST', body: { p: pulse, review: 'telepathy' }, json }), env });
    const none = await pulsePost({ request: request('/api/waitlist/pulse', { method: 'POST', body: { p: fake, review: 'telepathy' }, json }), env });
    assert.equal(real.status, none.status, `status, json=${json}`);
    assert.equal(real.headers.get('location'), none.headers.get('location'), `location, json=${json}`);
    assert.equal(real.headers.get('content-type'), none.headers.get('content-type'), `type, json=${json}`);
    assert.equal(await real.text(), await none.text(), `body, json=${json}`);
    const okReal = await pulsePost({ request: request('/api/waitlist/pulse', { method: 'POST', body: { p: pulse, review: 'engine' }, json }), env });
    const okNone = await pulsePost({ request: request('/api/waitlist/pulse', { method: 'POST', body: { p: fake, review: 'engine' }, json }), env });
    assert.equal(okReal.status, okNone.status);
    assert.equal(okReal.headers.get('location'), okNone.headers.get('location'));
    assert.equal(await okReal.text(), await okNone.text());
  }
  assert.equal(answers(env, 'shape@gmail.com').review, 'engine');
});

// The pulse handler's first batch call is the rate-limit counter and its
// second is the write, so "between the read and the write" is just before
// the second call. Runs `fn` there once, then restores the real batch.
function beforeSecondBatch(env, fn) {
  const realBatch = env.DB.batch.bind(env.DB);
  let calls = 0;
  env.DB.batch = async (statements) => {
    calls += 1;
    if (calls < 2) return realBatch(statements);
    env.DB.batch = realBatch;
    await fn();
    return realBatch(statements);
  };
}

test('pulse writes merge against the current row, never a snapshot, and a late pulse cannot undo an unsubscribe', async () => {
  const env = makeEnv();
  const { token, pulse } = await signup(env, 'race@gmail.com');
  // Between the pulse's read and its write, preferences turn beta off and research on.
  beforeSecondBatch(env, () =>
    prefsPost({ request: request('/api/waitlist/preferences', { method: 'POST', body: { t: token, research: 'on' }, json: true }), env }),
  );
  const res = await pulsePost({ request: request('/api/waitlist/pulse', { method: 'POST', body: { p: pulse, letter: 'on', review: 'none' }, json: true }), env });
  assert.equal(res.status, 200);
  const after = lists(env, 'race@gmail.com');
  assert.equal(after.beta, null, 'the pulse did not turn beta back on');
  assert.match(after.research, /^\d{4}-/, 'the pulse did not turn research back off');
  assert.match(after.letter, /^\d{4}-/, 'the opt-in landed');

  // After leaving every list, the old pulse code writes nothing and still answers 200.
  await unsubPost({ request: request('/api/waitlist/unsubscribe', { method: 'POST', body: { t: token }, json: true }), env });
  const late = await pulsePost({ request: request('/api/waitlist/pulse', { method: 'POST', body: { p: pulse, letter: 'on', review: 'coach' }, json: true }), env });
  assert.equal(late.status, 200);
  assert.deepEqual(await late.json(), { ok: true });
  assert.deepEqual(lists(env, 'race@gmail.com'), { beta: null, letter: null, research: null });
  assert.equal(answers(env, 'race@gmail.com'), null);
});

test('a write failure by pulse code is a 500 for a stored code and a throwaway one alike, so the page can say so', async () => {
  const env = makeEnv();
  const { pulse } = await signup(env, 'wfail@gmail.com');
  const failWrite = () =>
    beforeSecondBatch(env, () => {
      throw new Error('simulated write failure');
    });
  failWrite();
  const real = await pulsePost({ request: request('/api/waitlist/pulse', { method: 'POST', body: { p: pulse, review: 'engine' }, json: true }), env });
  failWrite();
  const none = await pulsePost({ request: request('/api/waitlist/pulse', { method: 'POST', body: { p: 'a'.repeat(32), review: 'engine' }, json: true }), env });
  assert.equal(real.status, 500, 'the visitor is not thanked for answers that were not saved');
  assert.equal(none.status, 500);
  assert.equal(await real.text(), await none.text());
  assert.equal(answers(env, 'wfail@gmail.com'), null, 'the failed write wrote nothing');
  failWrite();
  const formReal = await pulsePost({ request: request('/api/waitlist/pulse', { method: 'POST', body: { p: pulse, review: 'engine' } }), env });
  failWrite();
  const formNone = await pulsePost({ request: request('/api/waitlist/pulse', { method: 'POST', body: { p: 'a'.repeat(32), review: 'engine' } }), env });
  assert.equal(formReal.status, formNone.status);
  assert.equal(formReal.headers.get('location'), formNone.headers.get('location'));
  // Without a failure, both still answer 200 and only the stored code writes.
  const okNone = await pulsePost({ request: request('/api/waitlist/pulse', { method: 'POST', body: { p: 'a'.repeat(32), review: 'engine' }, json: true }), env });
  assert.equal(okNone.status, 200);
  assert.equal(answers(env, 'wfail@gmail.com'), null);
});

test('a sign-up retried with the same per-visit key gets the same pulse code, and it still works', async () => {
  const env = makeEnv();
  const key = 'c'.repeat(32);
  const first = await signupPost({ request: postJson({ email: 'retry@gmail.com', consent: true, k: key }), env });
  const again = await signupPost({ request: postJson({ email: 'retry@gmail.com', consent: true, k: key }), env });
  const a = await first.json();
  const b = await again.json();
  assert.equal(a.pulse, b.pulse, 'the retry recovers the same code');
  assert.equal(rowOf(env, 'retry@gmail.com').pulse_token, a.pulse);
  const saved = await pulsePost({ request: request('/api/waitlist/pulse', { method: 'POST', body: { p: b.pulse, review: 'coach' }, json: true }), env });
  assert.equal(saved.status, 200);
  assert.equal(answers(env, 'retry@gmail.com').review, 'coach', 'answers after the retry still count');
  // Someone else's key for the same address gets a code that matches nothing.
  const other = await signupPost({ request: postJson({ email: 'retry@gmail.com', consent: true, k: 'd'.repeat(32) }, { ip: '198.51.100.7' }), env });
  const c = await other.json();
  assert.match(c.pulse, TOKEN);
  assert.notEqual(c.pulse, a.pulse);
  await pulsePost({ request: request('/api/waitlist/pulse', { method: 'POST', body: { p: c.pulse, review: 'none' }, json: true }), env });
  assert.equal(answers(env, 'retry@gmail.com').review, 'coach', 'nothing changed');
  // The same key for a different, brand-new address must not collide with the stored code.
  const reused = await signupPost({ request: postJson({ email: 'fresh@gmail.com', consent: true, k: key }, { ip: '198.51.100.9' }), env });
  assert.equal(reused.status, 200, 'no unique-index failure, so no oracle');
  const d = await reused.json();
  assert.notEqual(d.pulse, a.pulse, 'the code depends on the address too');
  assert.equal(rowOf(env, 'fresh@gmail.com').pulse_token, d.pulse);
  // No key: a random code each time, as before.
  const r1 = await (await signupPost({ request: postJson({ email: 'nokey@gmail.com', consent: true }, { ip: '198.51.100.8' }), env })).json();
  const r2 = await (await signupPost({ request: postJson({ email: 'nokey@gmail.com', consent: true }, { ip: '198.51.100.8' }), env })).json();
  assert.notEqual(r1.pulse, r2.pulse);
});

test('a stale preferences form cannot undo a one-click unsubscribe that landed in between', async () => {
  const env = makeEnv();
  const { token } = await signup(env, 'stale@gmail.com');
  const { handlePreferencesPost: prefs } = await import('../src/lib/waitlist.js');
  // Preferences are read at t0; just before their guarded write runs, a one-click unsubscribe lands.
  const realRun = env.DB.prepare.bind(env.DB);
  let intercepted = false;
  env.DB.prepare = (sql) => {
    const statement = realRun(sql);
    if (!intercepted && /WHERE id = \? AND COALESCE\(lists_updated_at/.test(sql)) {
      intercepted = true;
      const realBind = statement.bind.bind(statement);
      statement.bind = (...args) => {
        const bound = realBind(...args);
        const originalRun = bound.run.bind(bound);
        bound.run = async () => {
          await unsubPost({
            request: request(`/api/waitlist/unsubscribe?t=${token}`, { method: 'POST', body: { 'List-Unsubscribe': 'One-Click' }, origin: null }),
            env,
          });
          return originalRun();
        };
        return bound;
      };
    }
    return statement;
  };
  const res = await prefs(
    request('/api/waitlist/preferences', { method: 'POST', body: { t: token, beta: 'on', letter: 'on' }, json: true }),
    env,
    { now: Date.UTC(2026, 9, 9, 6, 0, 0) },
  );
  env.DB.prepare = realRun;
  assert.equal(res.status, 409);
  const body = await res.json();
  assert.equal(body.ok, false);
  assert.deepEqual(body.lists, { beta: false, letter: false, research: false }, 'the current state is reported');
  assert.deepEqual(lists(env, 'stale@gmail.com'), { beta: null, letter: null, research: null }, 'the unsubscribe stood');
  // The same stale form as a plain post goes back to the page with the "changed" note.
  env.DB.prepare = (sql) => {
    const statement = realRun(sql);
    if (/WHERE id = \? AND COALESCE\(lists_updated_at/.test(sql)) {
      const originalBind = statement.bind.bind(statement);
      statement.bind = (...args) => originalBind(...args.slice(0, -1), 'never-this-value');
    }
    return statement;
  };
  const form = await prefs(request('/api/waitlist/preferences', { method: 'POST', body: { t: token, beta: 'on' } }), env);
  env.DB.prepare = realRun;
  assert.equal(form.status, 303);
  assert.equal(form.headers.get('location'), `/manage/?t=${token}&changed=1#manage`);
  const page = await manageGet({ request: request(`/manage/?t=${token}&changed=1`), env });
  assert.match(await page.text(), /<p class="manage__note is-error" data-note="changed" role="status">/);
});

test('one-click unsubscribe works without the rate-limit salt; counted requests still refuse', async () => {
  const env = makeEnv();
  const { token } = await signup(env, 'nosalt@gmail.com');
  const noSalt = makeEnv({ IP_HASH_SALT: '', DB: env.DB });
  const oneClick = await unsubPost({
    request: request(`/api/waitlist/unsubscribe?t=${token}`, { method: 'POST', body: { 'List-Unsubscribe': 'One-Click' }, origin: null }),
    env: noSalt,
  });
  assert.equal(oneClick.status, 200);
  assert.deepEqual(lists(env, 'nosalt@gmail.com'), { beta: null, letter: null, research: null });
  const counted = await prefsPost({ request: request('/api/waitlist/preferences', { method: 'POST', body: { t: token, beta: 'on' }, json: true }), env: noSalt });
  assert.equal(counted.status, 503);
  const view = await manageGet({ request: request(`/manage/?t=${token}`), env: noSalt });
  assert.equal(view.status, 200, 'a page view is not counted either');
});

test('stats read every row a page at a time, and count older answers whatever questions they were to', async () => {
  const env = makeEnv();
  for (let i = 0; i < 7; i += 1) await signup(env, `page${i}@gmail.com`, {}, { ip: `203.0.113.${50 + i}` });
  env.DB.db.prepare("UPDATE waitlist SET answers = ? WHERE email = 'page3@gmail.com'").run(JSON.stringify({ v: 0, retired: 'yes' }));
  const { handleStatsGet: stats } = await import('../src/lib/waitlist.js');
  const res = await stats(request('/api/waitlist/stats', { headers: { authorization: 'Bearer test-admin-token' } }), env, { pageSize: 3 });
  const body = await res.json();
  assert.equal(body.total, 7, 'every row across three pages');
  assert.equal(body.lists.beta, 7);
  assert.equal(body.pulse.older, 1, 'an answer to a question that no longer exists still counts as older');
  assert.equal(body.truncated, false);
});

test('a database failure during a one-click unsubscribe is a bare 500, never a redirect', async () => {
  const env = makeEnv();
  const { token } = await signup(env, 'db@gmail.com');
  env.DB.failNext = true;
  const res = await unsubPost({
    request: request(`/api/waitlist/unsubscribe?t=${token}`, { method: 'POST', body: { 'List-Unsubscribe': 'One-Click' }, origin: null }),
    env,
  });
  assert.equal(res.status, 500);
  assert.equal(res.headers.get('location'), null);
  assert.match(res.headers.get('content-type'), /text\/plain/);
  assert.ok(lists(env, 'db@gmail.com').beta, 'nothing changed');
  // The same failure on a form post from the page goes back to the page with a note.
  env.DB.failNext = true;
  const form = await prefsPost({ request: request('/api/waitlist/preferences', { method: 'POST', body: { t: token, beta: 'on' } }), env });
  assert.equal(form.status, 303);
  assert.equal(form.headers.get('location'), `/manage/?t=${token}&error=1#manage`);
});

test('stats count only answers to the current questionnaire, and visitor labels never become properties', () => {
  const now = Date.UTC(2026, 9, 9, 12, 0, 0);
  const s = summarize(
    [
      { created_at: '2026-10-09T01:00:00Z', fields: '{}', source: '__proto__', utm: '{"utm_source":"constructor"}', lists: '{}', answers: JSON.stringify({ v: PULSE.version, review: 'lichess', at: '2026-10-09T01:00:00Z' }) },
      { created_at: '2026-10-09T02:00:00Z', fields: '{}', source: 'hero', utm: '{"utm_source":"__proto__"}', lists: '{}', answers: JSON.stringify({ v: PULSE.version - 1, review: 'lichess', wish: 'old wish' }) },
      { created_at: '2026-10-09T03:00:00Z', fields: '{}', source: 'hero', utm: '{"utm_source":["x"]}', lists: '{}', answers: null },
    ],
    { now },
  );
  assert.equal(s.pulse.version, PULSE.version);
  assert.equal(s.pulse.answered, 1);
  assert.equal(s.pulse.older, 1);
  assert.equal(s.pulse.review.lichess, 1, 'the older answer is not mixed in');
  assert.deepEqual(s.pulse.wishes, [], 'an old-version wish is not listed');
  // Object.fromEntries makes an own "__proto__" property; an object literal would set the prototype instead.
  assert.deepEqual(s.sources, Object.fromEntries([['__proto__', 1], ['hero', 2]]));
  assert.equal(Object.getPrototypeOf(s.sources), Object.prototype, 'still a plain object');
  assert.ok(JSON.stringify(s.sources).includes('"__proto__":1'), 'the label survives into JSON');
  assert.deepEqual(s.utmSources, Object.fromEntries([['constructor', 1], ['__proto__', 1], ['direct', 1]]));
});

test('pulse by the manage code merges answers of the same version, replaces an older version, and never turns a list off', async () => {
  const env = makeEnv();
  const { token } = await signup(env, 'merge@gmail.com');
  const first = await pulsePost({
    request: request('/api/waitlist/pulse', { method: 'POST', body: { t: token, review: 'coach', hardest: 'time', letter: 'on' }, json: true }),
    env,
  });
  assert.deepEqual(await first.json(), { ok: true, lists: { beta: true, letter: true, research: false }, answered: 2 });

  const second = await pulsePost({ request: request('/api/waitlist/pulse', { method: 'POST', body: { t: token, pay: 'free', letter: '' } }), env });
  assert.equal(second.status, 303);
  assert.equal(second.headers.get('location'), `/manage/?t=${token}&saved=1#manage`);
  let stored = answers(env, 'merge@gmail.com');
  assert.equal(stored.review, 'coach', 'earlier answers of the same version survive');
  assert.equal(stored.pay, 'free');
  assert.ok(lists(env, 'merge@gmail.com').letter, 'an unticked box on the pulse never removes a list');

  // Answers saved under an older questionnaire are replaced, not merged.
  env.DB.db.prepare('UPDATE waitlist SET answers = ? WHERE email = ?').run(JSON.stringify({ v: PULSE.version - 1, review: 'engine', hardest: 'time' }), 'merge@gmail.com');
  await pulsePost({ request: request('/api/waitlist/pulse', { method: 'POST', body: { t: token, pay: 'unsure' }, json: true }), env });
  stored = answers(env, 'merge@gmail.com');
  assert.equal(stored.v, PULSE.version);
  assert.equal(stored.pay, 'unsure');
  assert.equal(stored.review, undefined, 'the old questionnaire\'s answers are gone');
  assert.equal(stored.hardest, undefined);
});

test('every manage endpoint needs a real code, the same origin and the salt', async () => {
  const env = makeEnv();
  const { token } = await signup(env, 'guard@gmail.com');
  const endpoints = [
    ['/api/waitlist/preferences', prefsPost],
    ['/api/waitlist/unsubscribe', unsubPost],
    ['/api/waitlist/delete', deletePost],
    ['/api/waitlist/pulse', pulsePost],
  ];
  for (const [path, handler] of endpoints) {
    const missing = await handler({ request: request(path, { method: 'POST', body: {}, json: true }), env });
    assert.equal(missing.status, 404, `${path} without a code`);
    const unknown = await handler({ request: request(path, { method: 'POST', body: { t: 'e'.repeat(32) }, json: true }), env });
    assert.equal(unknown.status, 404, `${path} with an unknown manage code`);
    const formUnknown = await handler({ request: request(path, { method: 'POST', body: { t: 'e'.repeat(32) } }), env });
    assert.equal(formUnknown.headers.get('location'), '/manage/?invalid=1#manage', `${path} form post with an unknown code`);
    const foreign = await handler({ request: request(path, { method: 'POST', body: { t: token }, json: true, origin: 'https://evil.example' }), env });
    assert.equal(foreign.status, 403, `${path} from another origin`);
  }
  // A pulse code is accepted only by the pulse endpoint.
  const { pulse } = await signup(env, 'pulseonly@gmail.com', {}, { ip: '198.51.100.8' });
  for (const [path, handler] of endpoints.slice(0, 3)) {
    const res = await handler({ request: request(path, { method: 'POST', body: { p: pulse }, json: true }), env });
    assert.equal(res.status, 404, `${path} must ignore a pulse code`);
  }
  const noSalt = makeEnv({ IP_HASH_SALT: '' });
  const res = await prefsPost({ request: request('/api/waitlist/preferences', { method: 'POST', body: { t: token }, json: true }), env: noSalt });
  assert.equal(res.status, 503);
  assert.match(lists(env, 'guard@gmail.com').beta, /^\d{4}-/);
});

test('manage posts have their own rate limit; page views and sign-ups do not count against it', async () => {
  const env = makeEnv();
  const { token } = await signup(env, 'limit@gmail.com');
  const t0 = Date.UTC(2026, 9, 9, 3, 0, 0);
  for (let i = 0; i < 5; i += 1) {
    const view = await handleManageGet(request(`/manage/?t=${token}`), env, { now: t0 + i });
    assert.equal(view.status, 200);
  }
  const statuses = [];
  for (let i = 0; i <= LIMITS.manageRateLimitMax; i += 1) {
    const res = await handlePreferencesPost(
      request('/api/waitlist/preferences', { method: 'POST', body: { t: token, beta: 'on' }, json: true }),
      env,
      { now: t0 + 10 + i * 1000 },
    );
    statuses.push(res.status);
  }
  assert.deepEqual(statuses.slice(0, LIMITS.manageRateLimitMax), Array(LIMITS.manageRateLimitMax).fill(200));
  assert.equal(statuses[LIMITS.manageRateLimitMax], 429);
  const stillViewable = await handleManageGet(request(`/manage/?t=${token}`), env, { now: t0 + 60000 });
  assert.equal(stillViewable.status, 200, 'the page itself never says a good link is bad');
  const fresh = await signup(env, 'second@gmail.com');
  assert.equal(fresh.res.status, 200, 'the sign-up counter for the same IP is untouched');
});

test('stats needs the admin token and sums the lists, ratings, sources, pulse and days, after clearing on unsubscribe', async () => {
  const env = makeEnv();
  assert.equal((await statsGet({ request: request('/api/waitlist/stats'), env })).status, 401);
  assert.equal((await statsAny({ request: request('/api/waitlist/stats', { method: 'POST', body: {} }), env })).status, 405);

  const a = await signup(env, 'a@gmail.com', { rating: '800-1200', utm_source: 'reddit' });
  const b = await signup(env, 'b@gmail.com', { rating: '800-1200' }, { ip: '198.51.100.4' });
  await signup(env, 'c@gmail.com', { source: 'footer' }, { ip: '198.51.100.5' });
  await pulsePost({ request: request('/api/waitlist/pulse', { method: 'POST', body: { t: a.token, review: 'lichess', pay: 'over10', wish: 'Why my plan was wrong', letter: 'on' }, json: true }), env });
  await pulsePost({ request: request('/api/waitlist/pulse', { method: 'POST', body: { t: b.token, review: 'lichess', hardest: 'why' }, json: true }), env });
  await unsubPost({ request: request('/api/waitlist/unsubscribe', { method: 'POST', body: { t: b.token }, json: true }), env });

  const res = await statsGet({ request: request('/api/waitlist/stats', { headers: { authorization: 'Bearer test-admin-token' } }), env });
  assert.equal(res.status, 200);
  const stats = await res.json();
  assert.equal(stats.ok, true);
  assert.equal(stats.truncated, false);
  assert.equal(stats.total, 3);
  assert.deepEqual(stats.lists, { beta: 2, letter: 1, research: 0 });
  assert.equal(stats.ratings['800-1200'], 1, 'the unsubscribed row lost its rating');
  assert.equal(stats.ratings.unanswered, 2);
  assert.deepEqual(stats.sources, { hero: 1, unknown: 1, footer: 1 });
  assert.deepEqual(stats.utmSources, { reddit: 1, direct: 2 });
  assert.equal(stats.pulse.answered, 1, 'the unsubscribed row lost its answers');
  assert.equal(stats.pulse.review.lichess, 1);
  assert.equal(stats.pulse.pay.over10, 1);
  assert.equal(stats.pulse.hardest.why, 0);
  assert.deepEqual(stats.pulse.wishes.map((w) => w.text), ['Why my plan was wrong']);
  assert.equal(stats.perDay.length, 30);
  assert.equal(stats.perDay[29].day, stats.today);
  assert.equal(stats.perDay[29].count, 3, 'the day tally is anonymous and survives an unsubscribe');
  await deletePost({ request: request('/api/waitlist/delete', { method: 'POST', body: { t: a.token, confirm: true }, json: true }), env });
  const after = await (await statsGet({ request: request('/api/waitlist/stats', { headers: { authorization: 'Bearer test-admin-token' } }), env })).json();
  assert.equal(after.total, 2);
  assert.equal(after.perDay[29].count, 3, 'and survives a delete');
  assert.ok(!JSON.stringify(stats).includes('@gmail.com'), 'stats carry no addresses');
});

test('summarize tolerates odd rows and ignores answers that are not options', () => {
  const now = Date.UTC(2026, 9, 9, 12, 0, 0);
  const s = summarize(
    [
      { created_at: '2026-10-09T01:00:00Z', fields: 'not json', source: null, utm: null, lists: 'nope', answers: '{"review":"telepathy","wish":42}' },
      { created_at: '2026-09-01T01:00:00Z', fields: '{"rating":"not-sure"}', source: 'hero', utm: '{}', lists: '{"beta":"x","letter":"y"}', answers: null },
    ],
    { now },
  );
  assert.equal(s.total, 2);
  assert.deepEqual(s.lists, { beta: 1, letter: 1, research: 0 });
  assert.equal(s.ratings.unanswered, 1);
  assert.equal(s.ratings['not-sure'], 1);
  assert.deepEqual(s.sources, { unknown: 1, hero: 1 });
  assert.equal(s.pulse.answered, 0);
  assert.equal(s.perDay.reduce((n, d) => n + d.count, 0), 0, 'rows no longer feed the day chart');
  const withDays = summarize([], { now, signupDays: [{ day: '2026-10-09', count: 4 }, { day: '2026-09-01', count: 9 }] });
  assert.equal(withDays.perDay.reduce((n, d) => n + d.count, 0), 4, 'only tally days inside the window count');
});

test('wrong methods are 405 on every new endpoint', async () => {
  const env = makeEnv();
  for (const [path, handler] of [
    ['/api/waitlist/preferences', prefsAny],
    ['/api/waitlist/unsubscribe', unsubAny],
    ['/api/waitlist/delete', deleteAny],
    ['/api/waitlist/pulse', pulseAny],
  ]) {
    const res = await handler({ request: request(path), env });
    assert.equal(res.status, 405, path);
    assert.equal(res.headers.get('allow'), 'POST');
  }
});

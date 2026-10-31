import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handle } from '../worker.js';

const env = { LAUNCHER_URL: 'https://askthemove.online/puzzleanalyzr' };
const html = (path = '/', method = 'GET') => new Request('https://app.askthemove.online' + path, { method, headers: { accept: 'text/html,*/*' } });
const api = (path = '/api/status') => new Request('https://app.askthemove.online' + path, { headers: { accept: 'application/json' } });
const origin = (status, body = 'app') => async () => new Response(status === 304 ? null : body, { status });

test('passes the app through while the Mac is up', async () => {
  for (const status of [200, 304, 401, 404, 503]) {
    const res = await handle(html(), env, origin(status));
    assert.equal(res.status, status);
    if (status !== 304) assert.equal(await res.text(), 'app');
  }
});

test('shows the resting page when the tunnel is down, the app is down, or the fetch fails', async () => {
  for (const fetchOrigin of [origin(530), origin(502), async () => { throw new Error('down'); }]) {
    const res = await handle(html('/play'), env, fetchOrigin);
    assert.equal(res.status, 503);
    assert.equal(res.headers.get('cache-control'), 'no-store');
    assert.match(res.headers.get('content-type'), /text\/html/);
    const body = await res.text();
    assert.match(body, /The board is <em>resting<\/em>/);
    assert.match(body, /href="https:\/\/askthemove\.online\/puzzleanalyzr"/);
    assert.match(body, /http-equiv="refresh" content="60"/);
    assert.doesNotMatch(body, /<script/);
  }
});

test('API calls get JSON, not the page', async () => {
  const res = await handle(api(), env, origin(530));
  assert.equal(res.status, 503);
  assert.match(res.headers.get('content-type'), /application\/json/);
  assert.match((await res.json()).error, /offline/);
  const post = await handle(new Request('https://app.askthemove.online/api/games', { method: 'POST', headers: { accept: 'text/html' } }), env, origin(530));
  assert.match(post.headers.get('content-type'), /application\/json/);
});

test('HEAD gets the status without a body', async () => {
  const res = await handle(html('/', 'HEAD'), env, origin(530));
  assert.equal(res.status, 503);
  assert.equal(await res.text(), '');
});

test('a bad launcher setting falls back to the main site page', async () => {
  for (const LAUNCHER_URL of [undefined, 'javascript:alert(1)', 'http://evil.example/', '"><script>']) {
    const body = await (await handle(html(), { LAUNCHER_URL }, origin(530))).text();
    assert.match(body, /href="https:\/\/askthemove\.online\/puzzleanalyzr"/);
  }
});

test('borrows only the listed fonts and piece from the main site', async () => {
  const seen = [];
  const fetchOrigin = async (req) => { seen.push(req.url); return new Response('x', { status: 200, headers: { 'content-type': 'font/woff2' } }); };
  const font = await handle(html('/__resting/fonts/kalam-700.woff2'), env, fetchOrigin);
  assert.equal(font.status, 200);
  assert.deepEqual(seen, ['https://askthemove.online/assets/fonts/kalam-700.woff2']);
  // Anything else under the prefix is an ordinary app path, sent to the app.
  seen.length = 0;
  await handle(html('/__resting/../../etc'), env, fetchOrigin);
  assert.equal(seen[0], 'https://app.askthemove.online/etc');
});

test('ALWAYS_REST keeps the app closed even when the Mac is up', async () => {
  let called = false;
  const up = async () => { called = true; return new Response('app', { status: 200 }); };
  const res = await handle(html('/play'), { ...env, ALWAYS_REST: 'true' }, up);
  assert.equal(called, false);
  assert.equal(res.status, 503);
  const body = await res.text();
  assert.match(body, /rebuilding/);
  assert.doesNotMatch(body, /http-equiv="refresh"/);
  const json = await handle(api(), { ...env, ALWAYS_REST: 'true' }, up);
  assert.match((await json.json()).error, /closed until launch/);
  assert.equal(called, false);
  // Fonts still load.
  const font = await handle(html('/__resting/fonts/kalam-700.woff2'), { ...env, ALWAYS_REST: 'true' }, up);
  assert.equal(font.status, 200);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {appCsp, appHeaders, appManifest, coachOrigin, ICONS, ICON_DIR} from './browser-app-hosting.mjs';
import {parseHeaders, headersFor} from './smoke-browser-app.mjs';

const directives = csp => Object.fromEntries(csp.split('; ').map(part => { const [name, ...values] = part.split(' '); return [name, values]; }));

test('the CSP allows the engine and the public chess and Claude services, and nothing inline', () => {
  const csp = directives(appCsp());
  assert.deepEqual(csp['script-src'], ["'self'", "'wasm-unsafe-eval'"]);
  assert.deepEqual(csp['connect-src'], ["'self'", 'https://tablebase.lichess.ovh', 'https://lichess.org', 'https://api.anthropic.com']);
  assert.deepEqual(csp['worker-src'], ["'self'"]);
  assert.deepEqual(csp['style-src'], ["'self'"]);
  assert.deepEqual(csp['frame-ancestors'], ["'none'"]);
  assert.deepEqual(csp['object-src'], ["'none'"]);
  assert.ok(!appCsp().includes('unsafe-inline'));
});

test('the coach Worker origin joins connect-src only when VITE_COACH_URL is set', () => {
  assert.equal(coachOrigin(undefined), null);
  assert.equal(coachOrigin('  '), null);
  assert.equal(coachOrigin('https://coach.example.workers.dev/v1/explain'), 'https://coach.example.workers.dev');
  assert.equal(coachOrigin('http://localhost:8787'), 'http://localhost:8787');
  assert.ok(directives(appCsp({coachUrl: 'https://coach.example.workers.dev/v1'}))['connect-src'].includes('https://coach.example.workers.dev'));
  assert.ok(!appCsp({coachUrl: ''}).includes('workers.dev'));
});

test('a coach URL that is not https stops the build', () => {
  assert.throws(() => coachOrigin('http://coach.example.com'), /must use https/);
  assert.throws(() => coachOrigin('coach.example.com'), /full URL/);
});

test('every path gets exactly one CSP and the security headers', () => {
  const rules = parseHeaders(appHeaders({coachUrl: 'https://coach.example.workers.dev'}));
  for (const path of ['/', '/index.html', '/assets/index-abc.js', '/engine/stockfish.wasm', '/manifest.webmanifest']) {
    const headers = headersFor(rules, path);
    assert.equal(headers['content-security-policy'], appCsp({coachUrl: 'https://coach.example.workers.dev'}), path);
    assert.equal(headers['x-frame-options'], 'DENY');
    assert.equal(headers['x-content-type-options'], 'nosniff');
    assert.equal(headers['cross-origin-opener-policy'], 'same-origin');
  }
  assert.match(headersFor(rules, '/assets/index-abc.js')['cache-control'], /immutable/);
  assert.equal(headersFor(rules, '/')['cache-control'], undefined);
});

test('the manifest names the app and its icons', () => {
  const manifest = appManifest();
  assert.equal(manifest.name, 'AskTheMove');
  assert.equal(manifest.start_url, '/');
  assert.deepEqual(manifest.icons.map(icon => icon.sizes), ['any', '192x192', '512x512']);
});

test('the app icons are the site\'s brand mark, byte for byte', () => {
  // One source of truth: site/public/ holds the askthemove.online mark at every size. The app ships copies,
  // so if the site's mark changes this fails until the copies are refreshed (cp site/public/<file> web/app-public/).
  const site = fileURLToPath(new URL('../site/public/', import.meta.url));
  for (const icon of ICONS) assert.ok(readFileSync(ICON_DIR + icon).equals(readFileSync(site + icon)), `${icon} matches the site's`);
  const appSvg = fileURLToPath(new URL('../web/public/favicon.svg', import.meta.url));
  assert.equal(readFileSync(appSvg, 'utf8'), readFileSync(site + 'favicon.svg', 'utf8'), 'favicon.svg matches the site\'s');
  assert.ok(ICONS.includes('favicon-32.png'), 'the 32px PNG fallback ships too');
});

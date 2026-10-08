import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from './app.mjs';
import {createCoach} from './coach-explain.mjs';
import {securityConfig, securityHeaders, parseTrustProxy, parseInviteCodes, canonicalOrigin, inviteAccepted} from './security.mjs';

async function fixture(env = {}) {
  const temp = mkdtempSync(join(tmpdir(), 'chesslab-security-'));
  const engineApi = {engineStatus:async () => ({available:true, name:'test engine'}), analyze:async () => ({bestmove:'e2e4'})};
  const state = createApp({databasePath:join(temp, 'db.sqlite'), engineApi, config:securityConfig(env), coach:createCoach({config:{apiKey:''}})});
  const server = state.app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (path, {body, headers = {}} = {}) => {
    const response = await fetch(base + path, {method:body === undefined ? 'GET' : 'POST', headers:{...(body !== undefined ? {'Content-Type':'application/json'} : {}), ...headers}, body:body === undefined ? undefined : JSON.stringify(body)});
    return {status:response.status, headers:response.headers, body:response.headers.get('content-type')?.includes('json') ? await response.json() : await response.text()};
  };
  return {request, base, close:async () => { await new Promise(resolve => server.close(resolve)); state.close(); rmSync(temp, {recursive:true, force:true}); }};
}
const account = (username, extra = {}) => ({username, password:'test-password-123', ...extra});

test('hosting settings fail closed on unsafe values and stay local by default', () => {
  assert.deepEqual(securityConfig({}), {appOrigin:null, hosted:false, trustProxy:false, cookieSecure:false, hsts:false, contentSecurityPolicy:false, inviteCodes:[], serveArchives:true});
  const hosted = securityConfig({APP_ORIGIN:'https://app.example.com', TRUST_PROXY:'1', BETA_INVITE_CODES:'first-cohort-2026, second-cohort-2026', NODE_ENV:'production'});
  assert.deepEqual(hosted, {appOrigin:'https://app.example.com', hosted:true, trustProxy:1, cookieSecure:true, hsts:true, contentSecurityPolicy:true, inviteCodes:['first-cohort-2026', 'second-cohort-2026'], serveArchives:false});
  assert.equal(securityConfig({APP_ORIGIN:'https://app.example.com', SERVE_ARCHIVES:'1'}).serveArchives, true);
  for (const origin of ['http://app.example.com', 'https://app.example.com/', 'https://app.example.com/path', 'app.example.com']) assert.throws(() => canonicalOrigin(origin), /APP_ORIGIN/, origin);
  assert.equal(canonicalOrigin('http://127.0.0.1:8770'), 'http://127.0.0.1:8770');
  assert.throws(() => parseTrustProxy('true'), /hop/);
  assert.throws(() => parseTrustProxy('everyone'));
  assert.deepEqual([parseTrustProxy(undefined), parseTrustProxy('0'), parseTrustProxy('2'), parseTrustProxy('loopback'), parseTrustProxy('10.0.0.0/8, 172.16.0.1')], [false, false, 2, 'loopback', ['10.0.0.0/8', '172.16.0.1']]);
  assert.throws(() => parseInviteCodes('short'), /8 to 128/);
  for (const value of [',', ' ', ' , ', 'first-cohort-2026,', 'first-cohort-2026,,second-cohort-2026']) assert.throws(() => parseInviteCodes(value), /8 to 128/, `An empty entry must not silently turn off invites: ${JSON.stringify(value)}`);
  assert.throws(() => securityConfig({APP_ORIGIN:'https://app.example.com', PUBLIC_ORIGIN:'https://private.example.com'}), /PUBLIC_ORIGIN/, 'Conflicting origins fail at startup');
  assert.equal(securityConfig({APP_ORIGIN:'https://app.example.com', PUBLIC_ORIGIN:'https://app.example.com'}).appOrigin, 'https://app.example.com');
  assert.equal(inviteAccepted([], undefined), true);
  assert.equal(inviteAccepted(['first-cohort-2026'], ' first-cohort-2026 '), true);
  for (const code of [undefined, '', 'first-cohort-2027', 'x'.repeat(129), {}]) assert.equal(inviteAccepted(['first-cohort-2026'], code), false);
});

test('archive paths skip the content security policy only when the archives are served', () => {
  const policyFor = (env, path) => { const headers = {}; securityHeaders(securityConfig(env))({path}, {set:(name, value) => { headers[name.toLowerCase()] = value; }}, () => {}); return headers['content-security-policy']; };
  for (const path of ['/design/', '/research/index.html', '/']) assert.match(policyFor({APP_ORIGIN:'https://app.example.com'}, path) ?? '', /default-src 'self'/, `Hosted ${path} falls through to the app and keeps the policy`);
  assert.equal(policyFor({APP_ORIGIN:'https://app.example.com', SERVE_ARCHIVES:'1'}, '/design/'), undefined, 'Served archives keep their inline scripts');
  assert.match(policyFor({APP_ORIGIN:'https://app.example.com', SERVE_ARCHIVES:'1'}, '/'), /default-src 'self'/);
  assert.equal(policyFor({NODE_ENV:'production'}, '/research/'), undefined, 'Local production still serves the archives');
});

test('health check, security headers and secure session cookie for a hosted origin', async () => {
  const f = await fixture({APP_ORIGIN:'https://app.example.com', TRUST_PROXY:'1'});
  try {
    const health = await f.request('/healthz');
    assert.deepEqual([health.status, health.body], [200, {status:'ok'}]);
    assert.equal(health.headers.get('cache-control'), 'no-store');
    for (const [name, value] of [['strict-transport-security', 'max-age=31536000'], ['x-frame-options', 'DENY'], ['x-content-type-options', 'nosniff'], ['cross-origin-opener-policy', 'same-origin'], ['referrer-policy', 'same-origin']]) assert.equal(health.headers.get(name), value, name);
    assert.match(health.headers.get('content-security-policy'), /default-src 'self'.*script-src 'self'.*frame-ancestors 'none'/);
    assert.equal(health.headers.get('x-powered-by'), null);
    const status = (await f.request('/api/status')).body;
    assert.deepEqual([status.hosted, status.archives, status.inviteRequired, status.coachAi], [true, false, false, {enabled:false}]);
    assert.equal((await f.request('/api/register', {body:account('no_origin')})).status, 403, 'A hosted origin requires an Origin header on changes');
    assert.equal((await f.request('/api/register', {body:account('wrong_origin'), headers:{Origin:'https://evil.example'}})).status, 403);
    assert.equal((await f.request('/api/register', {body:account('cross_site'), headers:{Origin:'https://app.example.com', 'Sec-Fetch-Site':'cross-site'}})).status, 403);
    const created = await f.request('/api/register', {body:account('hosted_user'), headers:{Origin:'https://app.example.com'}});
    assert.equal(created.status, 201);
    const cookie = created.headers.get('set-cookie');
    assert.match(cookie, /^chesslab_session=[a-f0-9]{64};/);
    for (const flag of [/; HttpOnly/i, /; Secure/i, /; SameSite=Strict/i, /; Path=\//]) assert.match(cookie, flag);
  } finally { await f.close(); }
});

test('local defaults keep today\'s behaviour: no CSP or HSTS, archives on, cookies usable over HTTP', async () => {
  const f = await fixture({});
  try {
    const health = await f.request('/healthz');
    assert.equal(health.headers.get('content-security-policy'), null);
    assert.equal(health.headers.get('strict-transport-security'), null);
    const created = await f.request('/api/register', {body:account('local_user')});
    assert.equal(created.status, 201);
    assert.doesNotMatch(created.headers.get('set-cookie'), /Secure/i);
    assert.equal((await f.request('/api/status')).body.archives, true);
  } finally { await f.close(); }
});

test('trusted proxy hops give each visitor a separate sign-in limit; untrusted forwarding headers are ignored', async () => {
  const shared = await fixture({});
  try {
    const statuses = [];
    for (let i = 0; i < 16; i++) statuses.push((await shared.request('/api/login', {body:account(`nobody${i}`), headers:{'X-Forwarded-For':`203.0.113.${i}`}})).status);
    assert.deepEqual(statuses.slice(0, 15), Array(15).fill(401));
    assert.equal(statuses[15], 429, 'Without TRUST_PROXY a forged X-Forwarded-For cannot escape the limit');
  } finally { await shared.close(); }
  const proxied = await fixture({TRUST_PROXY:'1'});
  try {
    const statuses = [];
    for (let i = 0; i < 16; i++) statuses.push((await proxied.request('/api/login', {body:account(`nobody${i}`), headers:{'X-Forwarded-For':`203.0.113.${i}`}})).status);
    assert.deepEqual(statuses, Array(16).fill(401));
  } finally { await proxied.close(); }
});

test('one account cannot be password-guessed from many addresses', async () => {
  const f = await fixture({TRUST_PROXY:'1'});
  try {
    const created = await f.request('/api/register', {body:account('target_user'), headers:{'X-Forwarded-For':'198.51.100.1'}});
    assert.equal(created.status, 201);
    const statuses = [];
    for (let i = 0; i < 11; i++) statuses.push((await f.request('/api/login', {body:{username:'Target_User', password:`wrong-password-${i}`}, headers:{'X-Forwarded-For':`203.0.113.${i}`}})).status);
    assert.deepEqual(statuses, [...Array(10).fill(401), 429]);
    const locked = await f.request('/api/login', {body:account('target_user'), headers:{'X-Forwarded-For':'198.51.100.9'}});
    assert.equal(locked.status, 429);
    assert.match(locked.body.error, /15 minutes/);
    assert.equal((await f.request('/api/login', {body:account('other_user'), headers:{'X-Forwarded-For':'198.51.100.9'}})).status, 401, 'Other accounts are unaffected');
  } finally { await f.close(); }
});

test('beta invite codes gate registration only when configured', async () => {
  const f = await fixture({BETA_INVITE_CODES:'first-cohort-2026'});
  try {
    assert.equal((await f.request('/api/status')).body.inviteRequired, true);
    assert.equal((await f.request('/api/register', {body:account('uninvited')})).status, 403);
    assert.equal((await f.request('/api/register', {body:account('wrong_code', {inviteCode:'second-cohort-2026'})})).status, 403);
    const invited = await f.request('/api/register', {body:account('invited', {inviteCode:'first-cohort-2026'})});
    assert.equal(invited.status, 201);
    assert.equal((await f.request('/api/login', {body:account('invited')})).status, 200, 'Existing accounts sign in without a code');
  } finally { await f.close(); }
  assert.throws(() => securityConfig({BETA_INVITE_CODES:'abc'}), /8 to 128/);
});

test('JSON body limits and content type remain enforced', async () => {
  const f = await fixture({});
  try {
    const large = await f.request('/api/login', {body:{username:'x', password:'y', padding:'z'.repeat(300000)}});
    assert.equal(large.status, 413);
    const form = await fetch(`${f.base}/api/login`, {method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:'username=a&password=b'});
    assert.equal(form.status, 415);
  } finally { await f.close(); }
});

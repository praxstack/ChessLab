import test from 'node:test';
import assert from 'node:assert/strict';
import {createBrowserCoach} from './client.js';
import {createCredentials, coachEndpoint, KEY_ENTRY, INVITE_ENTRY} from './credentials.js';
import {fixture} from '../testing/fixture.js';
import {createBackup, restoreBackup} from '../backup.js';
import {createMemoryStore} from '../store/memory-store.js';
import {normalizeSettings} from '../../settings-state.js';

// Fakes only: no real key or code, and no network.
const FAKE_KEY = 'sk-ant-fake-0000000000000000000000';
const FAKE_CODE = 'fake-invite-123';
const WORKER = 'https://coach.example.workers.dev';

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {map, getItem: name => map.get(name) ?? null, setItem: (name, value) => map.set(name, String(value)), removeItem: name => map.delete(name)};
}

// Records every request and answers like api.anthropic.com or the coach Worker would.
function fakeNetwork({claudeText = 'The engine prefers [[a3]] here at this search depth.', claudeStatus = 200, worker} = {}) {
  const calls = [];
  const fetch = async (url, init = {}) => {
    calls.push({url: String(url), headers: init.headers || {}, body: init.body ? JSON.parse(init.body) : null});
    if (String(url) === 'https://api.anthropic.com/v1/messages') {
      return new Response(JSON.stringify({model: 'claude-opus-5-5', stop_reason: 'end_turn', content: [{type: 'text', text: claudeText}]}), {status: claudeStatus});
    }
    if (String(url) === `${WORKER}/explain`) return worker ? worker(init) : new Response('{}', {status: 500});
    throw new TypeError('Failed to fetch');
  };
  return {calls, fetch};
}

function setup({stored = {}, coachUrl = WORKER, network = fakeNetwork()} = {}) {
  const storage = memoryStorage(stored);
  const coach = createBrowserCoach({credentials: createCredentials(storage), coachUrl, fetch: network.fetch});
  return {storage, coach, network, f: fixture({coach})};
}

const explain = (f, body = {moves: []}) => f.post('/api/coach/explain', body).then(response => response.body);

test('with nothing saved, the coach is off and answers from the engine without any request', async () => {
  const {coach, network, f} = setup();
  assert.deepEqual(coach.status(), {enabled: false});
  assert.equal((await f.get('/api/me')).body.user.coachAi, false);
  const answer = await explain(f);
  assert.equal(answer.source, 'engine');
  assert.equal(answer.fallbackReason, 'not_covered');
  assert.equal(network.calls.length, 0);
});

test('an own key picks path A: api.anthropic.com with the browser header and the same checks', async () => {
  const {coach, network, f} = setup({stored: {[KEY_ENTRY]: FAKE_KEY}});
  assert.deepEqual(coach.status(), {enabled: true, via: 'key', model: 'claude-opus-5-5'});
  assert.equal((await f.get('/api/me')).body.user.coachAi, true);
  const answer = await explain(f);
  assert.equal(answer.source, 'claude', JSON.stringify(answer));
  assert.deepEqual(answer.citedMoves, ['a3']);
  assert.equal(network.calls.length, 1);
  const [call] = network.calls;
  assert.equal(call.url, 'https://api.anthropic.com/v1/messages');
  assert.equal(call.headers['x-api-key'], FAKE_KEY);
  assert.equal(call.headers['anthropic-dangerous-direct-browser-access'], 'true');
  assert.match(call.body.messages[0].content, /^<evidence>/);
});

test('an invite code picks path B: evidence only to the Worker, never a key or a prompt', async () => {
  let sent;
  const network = fakeNetwork({worker: init => {
    sent = JSON.parse(init.body);
    return new Response(JSON.stringify({source: 'claude', model: 'claude-opus-5-5', text: 'a3 is the engine move.', citedMoves: ['a3'], fallbackReason: null}), {status: 200});
  }});
  const {coach, f} = setup({stored: {[INVITE_ENTRY]: FAKE_CODE}, network});
  assert.deepEqual(coach.status(), {enabled: true, via: 'invite'});
  const answer = await explain(f);
  assert.equal(answer.source, 'claude');
  assert.equal(network.calls.length, 1);
  assert.equal(network.calls[0].url, `${WORKER}/explain`);
  assert.deepEqual(Object.keys(sent).sort(), ['asked', 'evidence', 'inviteCode']);
  assert.equal(sent.inviteCode, FAKE_CODE);
  assert.deepEqual(Object.keys(sent.evidence).sort(), ['engine', 'lines', 'position']);
  assert.doesNotMatch(JSON.stringify(sent), /sk-ant|SYSTEM|<evidence>|Task:/);
});

test('without VITE_COACH_URL an invite code is ignored and path B stays hidden', async () => {
  const {coach, network, f} = setup({stored: {[INVITE_ENTRY]: FAKE_CODE}, coachUrl: null});
  assert.deepEqual(coach.status(), {enabled: false});
  assert.equal((await explain(f)).fallbackReason, 'not_covered');
  assert.equal(network.calls.length, 0);
  assert.equal(coachEndpoint(''), null);
  assert.equal(coachEndpoint('http://coach.example.com'), null, 'plain http is refused');
  assert.equal(coachEndpoint(`${WORKER}/`), `${WORKER}/explain`);
  assert.equal(coachEndpoint(`${WORKER}/explain`), `${WORKER}/explain`);
});

test('every failure falls back to the engine summary with a short reason', async () => {
  const cases = [
    [{[KEY_ENTRY]: FAKE_KEY}, fakeNetwork({claudeText: 'Play [[Nf3]], it wins a queen.'}), 'unverified_claims'],
    [{[KEY_ENTRY]: FAKE_KEY}, fakeNetwork({claudeStatus: 401}), 'not_authorized'],
    [{[KEY_ENTRY]: FAKE_KEY}, fakeNetwork({claudeStatus: 429}), 'upstream_busy'],
    [{[KEY_ENTRY]: FAKE_KEY}, {calls: [], fetch: async () => { throw new TypeError('Failed to fetch'); }}, 'unreachable'],
    [{[INVITE_ENTRY]: FAKE_CODE}, fakeNetwork({worker: () => new Response('{"message":"no"}', {status: 403})}), 'invite_rejected'],
    [{[INVITE_ENTRY]: FAKE_CODE}, fakeNetwork({worker: () => new Response(JSON.stringify({source: 'engine', text: 'x', citedMoves: [], fallbackReason: 'daily_limit'}), {status: 200})}), 'daily_limit'],
    [{[INVITE_ENTRY]: FAKE_CODE}, fakeNetwork({worker: () => new Response('oops', {status: 502})}), 'upstream_busy'],
    [{[INVITE_ENTRY]: FAKE_CODE}, fakeNetwork({worker: () => new Response('not json', {status: 200})}), 'unreachable'],
  ];
  for (const [stored, network, reason] of cases) {
    const {f} = setup({stored, network});
    const answer = await explain(f);
    assert.equal(answer.source, 'engine', reason);
    assert.equal(answer.fallbackReason, reason);
    assert.match(answer.text, /to move/);
  }
});

test('a question about a move goes through the same path with the asked move', async () => {
  const network = fakeNetwork({claudeText: '[[h3]] is slower than the engine\'s [[a3]] at this search depth.'});
  const {f} = setup({stored: {[KEY_ENTRY]: FAKE_KEY}, network});
  const answer = await explain(f, {moves: [], question: 'why not h3?'});
  assert.equal(answer.source, 'claude', JSON.stringify(answer));
  assert.equal(answer.question, 'h3');
  assert.match(network.calls[0].body.messages[0].content, /why not \[\[h3\]\]/);
});

test('the key is only ever sent to api.anthropic.com, and never lands in backups or settings', async () => {
  const network = fakeNetwork({worker: () => new Response(JSON.stringify({source: 'engine', fallbackReason: 'daily_limit'}), {status: 200})});
  const {storage, f} = setup({stored: {[KEY_ENTRY]: FAKE_KEY, 'chesslab-settings': JSON.stringify({boardTheme: 'walnut'})}, network});
  await f.post('/api/import', {pgn: '1. e4 e5 *'});
  await explain(f);
  await explain(f, {moves: [], question: 'h3'});
  // Switching to an invite code removes the key; the Worker request carries no key.
  createCredentials(storage).saveInvite(FAKE_CODE);
  assert.equal(storage.map.has(KEY_ENTRY), false);
  await explain(f);
  for (const call of network.calls) {
    const text = JSON.stringify(call);
    if (text.includes(FAKE_KEY)) assert.equal(call.url, 'https://api.anthropic.com/v1/messages');
  }
  assert.ok(network.calls.some(call => call.url === `${WORKER}/explain`));
  // Back up with the settings the app holds; the key and the code live outside them.
  createCredentials(storage).saveKey(FAKE_KEY);
  const settings = normalizeSettings(JSON.parse(storage.getItem('chesslab-settings')));
  const backup = JSON.stringify(await createBackup(f.store, settings));
  assert.doesNotMatch(backup, new RegExp(`${FAKE_KEY}|${FAKE_CODE}|sk-ant`));
  assert.doesNotMatch(JSON.stringify(settings), /sk-ant/);
  // Restore replaces data and settings, but leaves this browser's own key where it was.
  const restored = await restoreBackup(createMemoryStore(), backup);
  storage.setItem('chesslab-settings', JSON.stringify(restored));
  assert.equal(storage.getItem(KEY_ENTRY), FAKE_KEY);
});

test('credentials reject pasted text that is not a key or a code', () => {
  const credentials = createCredentials(memoryStorage());
  assert.throws(() => credentials.saveKey('hello'), /starts with sk-ant-/);
  assert.throws(() => credentials.saveInvite('a b'), /exactly as you received it/);
  credentials.saveKey(`  ${FAKE_KEY}  `);
  assert.equal(credentials.key(), FAKE_KEY);
  credentials.clear();
  assert.equal(credentials.key(), '');
  assert.equal(createCredentials(null).key(), '', 'no storage at all is treated as nothing saved');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Chess} from 'chess.js';
import {createApp} from './app.mjs';
import {createCoach, coachConfig, buildEvidence, verifyAnswer, parseAskedMove, SYSTEM_PROMPT, DEFAULT_MODEL} from './coach-explain.mjs';
import {securityConfig} from './security.mjs';

// 1. e4 e5 2. Bc4 Nc6 3. Qh5: Black to move. Nf6 allows Qxf7#.
const BASE = ['e2e4', 'e7e5', 'f1c4', 'b8c6', 'd1h5'];
const sanLine = (moves, line) => { const board = new Chess(); moves.forEach(m => board.move({from:m.slice(0, 2), to:m.slice(2, 4)})); return line.map(m => board.move({from:m.slice(0, 2), to:m.slice(2, 4)}).san); };
function fakeAnalysis({moves = BASE, playedMove} = {}) {
  const board = new Chess(); moves.forEach(m => board.move({from:m.slice(0, 2), to:m.slice(2, 4)}));
  const line = (uci, value) => ({move:uci[0], moves:uci, san:sanLine(moves, uci), score:{type:'cp', value}, depth:18});
  const analysis = {engine:'Stockfish 18', fen:board.fen(), turn:board.turn(), bestmove:'g7g6', lines:moves.join() === BASE.join() ? [line(['g7g6', 'h5f3', 'g8f6'], 30), line(['d8e7', 'b1c3'], 45)] : board.moves({verbose:true}).slice(0, 1).map(move => line([move.from + move.to], 0)), limits:{movetime:800, lines:3}, facts:{inCheck:false, material:{white:39, black:39}, legalMoves:board.moves().length}, explanation:'Black to move. g6. Sample line: g6 → Qf3 → Nf6. No material changes in this line. Estimate: 0.30 pawns from White\'s perspective.'};
  if (playedMove) {
    const mate = playedMove === 'g8f6';
    const after = new Chess(board.fen()); after.move({from:playedMove.slice(0, 2), to:playedMove.slice(2, 4)});
    const reply = mate ? ['h5f7'] : after.moves({verbose:true}).filter(move => move.from + move.to === 'b1c3').map(move => move.from + move.to);
    const san = sanLine(moves, [playedMove])[0];
    analysis.played = {move:playedMove, san, classification:mate ? 'Mate sequence' : 'Inaccuracy', lossCp:mate ? null : 60, afterScore:mate ? {type:'mate', value:1} : {type:'cp', value:90}, line:{moves:reply, san:sanLine([...moves, playedMove], reply), score:mate ? {type:'mate', value:1} : {type:'cp', value:90}, depth:16}, explanation:mate ? `${san}. Sample line: Qxf7#. Black is checkmated. Mate scores have no centipawn-loss estimate.` : `${san}. Sample line: Nc3. Estimated loss: 60 centipawns for Black.`};
  }
  return analysis;
}
const answer = text => ({model:DEFAULT_MODEL, stop_reason:'end_turn', content:[{type:'thinking', thinking:''}, {type:'text', text}]});
function fakeClient(respond) {
  const calls = [];
  return {calls, beta:{messages:{create:async (body, options) => { calls.push({body, options}); return respond(body, options, calls.length); }}}};
}
const silentLogger = () => { const lines = []; return {lines, warn:line => lines.push(String(line))}; };
const testConfig = overrides => ({...coachConfig({}), apiKey:'sk-ant-test-not-a-real-key', ...overrides});

async function fixture({client, config = testConfig(), logger = silentLogger(), security = securityConfig({}), nowMs} = {}) {
  const temp = mkdtempSync(join(tmpdir(), 'chesslab-coach-'));
  const engineCalls = [];
  const engineApi = {engineStatus:async () => ({available:true, name:'test engine'}), analyze:async request => { engineCalls.push(request); return fakeAnalysis(request); }};
  let state, server, base;
  // A restart builds a new coach as well, so anything that survives it was stored by the app.
  const start = async settings => {
    security = settings;
    state = createApp({databasePath:join(temp, 'db.sqlite'), engineApi, coach:createCoach({client, config, logger, ...(nowMs ? {nowMs} : {})}), config:security});
    server = state.app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
  };
  const stop = async () => { await new Promise(resolve => server.close(resolve)); state.close(); };
  await start(security);
  const request = async (path, {body, cookie} = {}) => {
    const response = await fetch(base + path, {method:body === undefined ? 'GET' : 'POST', headers:{...(body !== undefined ? {'Content-Type':'application/json'} : {}), ...(body !== undefined && security.appOrigin ? {Origin:security.appOrigin} : {}), ...(cookie ? {Cookie:cookie} : {})}, body:body === undefined ? undefined : JSON.stringify(body)});
    return {status:response.status, body:await response.json(), cookie:response.headers.get('set-cookie')?.split(';')[0]};
  };
  const register = async (username, inviteCode) => (await request('/api/register', {body:{username, password:'test-password-123', ...(inviteCode ? {inviteCode} : {})}})).cookie;
  return {request, register, engineCalls, logger, restart:async (settings = security) => { await stop(); await start(settings); }, close:async () => { await stop(); rmSync(temp, {recursive:true, force:true}); }};
}

test('evidence is replayed from the rules library and limits the vocabulary Claude may cite', () => {
  const bundle = buildEvidence(fakeAnalysis({playedMove:'g8f6'}), {moves:BASE});
  assert.equal(bundle.evidence.position.sideToMove, 'Black');
  assert.deepEqual(bundle.evidence.candidateLines[0].moves.map(m => m.san), ['g6', 'Qf3', 'Nf6']);
  assert.deepEqual(bundle.evidence.playedMove.engineReplyLine, [{san:'Qxf7#', side:'White', captures:'pawn', checkmate:true}]);
  assert.equal(bundle.evidence.playedMove.classification, 'Mate sequence');
  assert.deepEqual(bundle.evidence.engine, {name:'Stockfish 18', movetimeMs:800, candidateLines:3, depth:18});
  assert.ok(!JSON.stringify(bundle.evidence).includes('fen'), 'No board string is offered for the model to analyse itself');
  assert.deepEqual([...bundle.allowed.values()].sort(), ['Nf6', 'Qe7', 'Qf3', 'Qxf7#', 'Nc3', 'g6'].sort());
  assert.deepEqual([[...bundle.mates.scores], [...bundle.mates.sides]], [['White 1'], ['White']]);
  assert.throws(() => buildEvidence(fakeAnalysis(), {moves:BASE.slice(0, 4)}), {status:503}, 'Evidence for another position is refused');
});

test('answer check accepts cited evidence and rejects invented moves, unbracketed moves and mate claims', () => {
  const bundle = buildEvidence(fakeAnalysis({playedMove:'g8f6'}), {moves:BASE});
  const good = verifyAnswer('[[Nf6]] lets White play [[Qxf7#]] in the engine\'s line. The engine preferred [[g6]], keeping the f7 square covered and e5 intact.', bundle);
  assert.equal(good.ok, true);
  assert.equal(good.text, 'Nf6 lets White play Qxf7# in the engine\'s line. The engine preferred g6, keeping the f7 square covered and e5 intact.');
  assert.deepEqual(good.cited, ['Nf6', 'Qxf7#', 'g6']);
  assert.equal(verifyAnswer('[[Nf6+]] is not really check, but [[O-O]] would be safer.', bundle).ok, false);
  assert.deepEqual(verifyAnswer('After [[Nf6]], Bxf7+ wins material.', bundle).problems, ['Bxf7+']);
  assert.equal(verifyAnswer('After [[Nf6]], it is mate in 2.', bundle).ok, false);
  assert.equal(verifyAnswer('After [[Nf6]], it is mate in 1.', bundle).ok, true);
  assert.equal(verifyAnswer('[[Nf6 is unbalanced', bundle).ok, false);
});

test('a cited move keeps its check and mate markers; only ! and ? annotations are ignored', () => {
  const bundle = buildEvidence(fakeAnalysis({playedMove:'g8f6'}), {moves:BASE});
  for (const invented of ['[[Nf6+]] gives check.', '[[Nf6#]] ends the game.', 'After Nf6+ the king is exposed.', '[[Qxf7+]] is only a check.', 'White plays [[Qxf7]] next.']) assert.equal(verifyAnswer(invented, bundle).ok, false, invented);
  const annotated = verifyAnswer('[[Nf6?]] lets White play [[Qxf7#!]].', bundle);
  assert.deepEqual([annotated.ok, annotated.cited], [true, ['Nf6', 'Qxf7#']]);
});

test('a mate claim must match the side and distance of the engine evidence', () => {
  // Evidence: after Nf6 the engine reports mate in 1 for White, delivered by Qxf7#.
  const white = buildEvidence(fakeAnalysis({playedMove:'g8f6'}), {moves:BASE});
  for (const fine of ['After [[Nf6]], White has mate in 1 with [[Qxf7#]].', '[[Nf6]] walks into [[Qxf7#]], checkmate.', 'After [[Nf6]], Black is checkmated by [[Qxf7#]].', 'The engine reports mate in one for White.', '[[Nf6]] allows mate in 1.', 'Black, by playing [[Nf6]], cannot stop mate.']) assert.equal(verifyAnswer(fine, white).ok, true, fine);
  for (const contradiction of ['After [[Nf6]], it is mate in 1 for Black.', 'After [[Nf6]], Black has mate in 1.', 'After [[Nf6]], Black mates in one.', 'After [[Nf6]], White is checkmated.', 'White mates in two after [[Nf6]].', 'After [[Nf6]], Black has a mating attack.']) assert.equal(verifyAnswer(contradiction, white).ok, false, contradiction);
  // Evidence without any mate: mate wording cannot be verified.
  const quiet = buildEvidence(fakeAnalysis(), {moves:BASE});
  assert.equal(verifyAnswer('[[g6]] keeps the material level and avoids a stalemate trick.', quiet).ok, true);
  for (const unverified of ['[[g6]] stops checkmate on the f7 square.', '[[g6]] avoids a mating attack.']) assert.equal(verifyAnswer(unverified, quiet).ok, false, unverified);
  // Fool's mate: Black mates, so the direction flips.
  const fools = ['f2f3', 'e7e5', 'g2g4'], board = new Chess(); fools.forEach(m => board.move({from:m.slice(0, 2), to:m.slice(2, 4)}));
  const black = buildEvidence({engine:'Stockfish 18', fen:board.fen(), lines:[{move:'d8h4', moves:['d8h4'], score:{type:'mate', value:-1}, depth:12}], limits:{movetime:800, lines:3}, explanation:'Black to move. Qh4#.'}, {moves:fools});
  assert.deepEqual([[...black.mates.scores], [...black.mates.sides]], [['Black 1'], ['Black']]);
  for (const fine of ['[[Qh4#]] is mate in 1 for Black.', 'White is checkmated after [[Qh4#]].', 'Black mates with [[Qh4#]].']) assert.equal(verifyAnswer(fine, black).ok, true, fine);
  for (const contradiction of ['[[Qh4#]] is mate in 1 for White.', 'White mates in 1 instead.', 'Black is mated after [[Qh4#]].']) assert.equal(verifyAnswer(contradiction, black).ok, false, contradiction);
  // When the evidence holds mates for both sides, an unattributed mate claim is ambiguous.
  const both = {allowed:new Map(), mates:{scores:new Set(['White 2', 'Black 3']), sides:new Set(['White', 'Black'])}, numbers:{signed:new Set([2, 3]), unsigned:new Set([2, 3])}, captured:new Set()};
  assert.deepEqual(['White has mate in 2.', 'Black has mate in 3.', 'It is mate in 2.', 'Black has mate in 2.'].map(text => verifyAnswer(text, both).ok), [true, true, false, false]);
});

test('numbers and won or lost pieces must come from the evidence', () => {
  // Played Qe7: estimated loss 60 centipawns, score after +0.90, reply Nc3; best line g6 Qf3 Nf6 at +0.30, depth 18, 800 ms.
  const quiet = buildEvidence(fakeAnalysis({playedMove:'d8e7'}), {moves:BASE});
  for (const fine of ['[[Qe7]] loses about 60 centipawns at depth 18; the engine preferred [[g6]] at +0.30.', 'After [[Qe7]] the score is 0.90 for White in 800 ms of search.', 'Stockfish 18 rates [[Qe7]] an Inaccuracy: from 50 centipawns of loss, short of a Mistake at 150.', 'The f7 square stays covered and the material stays level.']) assert.equal(verifyAnswer(fine, quiet).ok, true, fine);
  for (const invented of ['[[Qe7]] loses 900 centipawns.', 'The score after [[Qe7]] is -0.90.', '[[Qe7]] wins a queen for Black.', 'After [[Qe7]] White trades queens.', '[[Qe7]] hangs the knight on c6.', 'Black is up a pawn after [[g6]].', 'Black wins material with [[Qe7]].', 'This loses 25% of the advantage.']) assert.equal(verifyAnswer(invented, quiet).ok, false, invented);
  // Nf6 allows Qxf7#, which captures a pawn: a claim about that pawn is evidenced, one about a queen is not.
  const mate = buildEvidence(fakeAnalysis({playedMove:'g8f6'}), {moves:BASE});
  assert.equal(verifyAnswer('[[Nf6]] hangs the f7 pawn to [[Qxf7#]].', mate).ok, true);
  assert.equal(verifyAnswer('[[Nf6]] loses the queen to [[Qxf7#]].', mate).ok, false);
});

test('a follow-up move is parsed and checked by the rules library, never by the model', () => {
  const board = new Chess(); BASE.forEach(m => board.move({from:m.slice(0, 2), to:m.slice(2, 4)}));
  assert.deepEqual(parseAskedMove(board, 'Why not Qe7?'), {uci:'d8e7', san:'Qe7'});
  assert.deepEqual(parseAskedMove(board, 'g7g6'), {uci:'g7g6', san:'g6'});
  for (const question of ['why not Ke2?', 'Nf3', 'castle', '', 'x'.repeat(61), 42]) assert.throws(() => parseAskedMove(board, question), {status:400}, String(question));
});

test('Claude explains supplied evidence with a cached static system prompt and no learner data', async () => {
  const client = fakeClient(() => answer('[[Nf6]] walks into [[Qxf7#]] in the engine\'s line. [[g6]] was the engine\'s choice at this depth.'));
  const f = await fixture({client});
  try {
    assert.equal((await f.request('/api/coach/explain', {body:{moves:BASE, playedMove:'g8f6'}})).status, 401, 'Sign-in required');
    const cookie = await f.register('coach_alice');
    const status = (await f.request('/api/status')).body.coachAi;
    assert.deepEqual(status, {enabled:true, model:DEFAULT_MODEL});
    const result = await f.request('/api/coach/explain', {cookie, body:{moves:BASE, playedMove:'g8f6'}});
    assert.equal(result.status, 200);
    assert.equal(result.body.source, 'claude');
    assert.equal(result.body.text, 'Nf6 walks into Qxf7# in the engine\'s line. g6 was the engine\'s choice at this depth.');
    assert.deepEqual(result.body.citedMoves, ['Nf6', 'Qxf7#', 'g6']);
    assert.equal(result.body.subject, 'Nf6');
    assert.equal(result.body.bestMove, 'g6');
    assert.deepEqual(result.body.receipt, {engine:'Stockfish 18', movetimeMs:800, depth:18, lines:2});
    const {body, options} = client.calls[0];
    assert.equal(body.model, DEFAULT_MODEL);
    assert.deepEqual(body.output_config, {effort:'low'});
    assert.equal(body.thinking, undefined, 'Opus 5.5 thinking stays adaptive');
    assert.equal(body.fallbacks, 'default');
    assert.deepEqual(body.betas, ['server-side-fallback-2026-07-01']);
    assert.deepEqual(body.system, [{type:'text', text:SYSTEM_PROMPT, cache_control:{type:'ephemeral'}}]);
    assert.ok(SYSTEM_PROMPT.length > 2600, 'Static prompt is long enough to reach the 512-token cache minimum');
    assert.equal(body.messages.length, 1);
    const content = body.messages[0].content;
    assert.match(content, /^<evidence>\n\{.*\}\n<\/evidence>\n\nTask: explain the played move \[\[Nf6\]\]/s);
    assert.ok(!content.includes('coach_alice') && !content.includes('chesslab_session'), 'No account data reaches the model');
    assert.ok(options.signal instanceof AbortSignal && options.timeout > 0 && options.maxRetries === 1);
    assert.equal(f.engineCalls.length, 1);
    assert.deepEqual(f.engineCalls[0], {moves:BASE, initialFen:null, variant:undefined, playedMove:'g8f6', movetime:800, lines:3});
  } finally { await f.close(); }
});

test('an answer citing a move outside the evidence falls back to the deterministic coach', async () => {
  const client = fakeClient(() => answer('[[Nf6]] is a blunder because [[Bxf7+]] wins the queen.'));
  const f = await fixture({client});
  try {
    const cookie = await f.register('coach_bob');
    const result = await f.request('/api/coach/explain', {cookie, body:{moves:BASE, playedMove:'g8f6'}});
    assert.equal(result.body.source, 'engine');
    assert.equal(result.body.fallbackReason, 'unverified_claims');
    assert.equal(result.body.text, fakeAnalysis({playedMove:'g8f6'}).played.explanation);
    assert.ok(!result.body.text.includes('Bxf7'));
    assert.deepEqual(f.logger.lines, ['Coach AI fallback: unverified_claims (2 unverified claims)']);
  } finally { await f.close(); }
});

test('without an API key the endpoint keeps the deterministic coach and never builds a client', async () => {
  const f = await fixture({config:testConfig({apiKey:''})});
  try {
    assert.deepEqual((await f.request('/api/status')).body.coachAi, {enabled:false});
    const cookie = await f.register('coach_carol');
    const analysis = await f.request('/api/analyze', {cookie, body:{moves:BASE, playedMove:'g8f6'}});
    assert.equal(analysis.body.evidenceId, undefined, 'No evidence is retained when Claude is off');
    const result = await f.request('/api/coach/explain', {cookie, body:{moves:BASE, playedMove:'g8f6'}});
    assert.deepEqual([result.body.source, result.body.fallbackReason], ['engine', 'not_configured']);
    assert.equal(result.body.text, fakeAnalysis({playedMove:'g8f6'}).played.explanation);
  } finally { await f.close(); }
  assert.equal(createCoach({config:testConfig({apiKey:''})}).status().enabled, false);
});

test('a slow Claude call is abandoned at the deadline and the learner gets the engine summary', async () => {
  const client = fakeClient((body, options) => new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), {name:'AbortError'})))));
  const f = await fixture({client, config:testConfig({timeoutMs:60})});
  try {
    const cookie = await f.register('coach_dana');
    const started = Date.now();
    const result = await f.request('/api/coach/explain', {cookie, body:{moves:BASE, playedMove:'g8f6'}});
    assert.ok(Date.now() - started < 2000);
    assert.deepEqual([result.body.source, result.body.fallbackReason], ['engine', 'timeout']);
  } finally { await f.close(); }
});

test('per-account Claude quota falls back without calling the API and other accounts keep theirs', async () => {
  const client = fakeClient(() => answer('[[g6]] keeps the position balanced at this depth.'));
  const f = await fixture({client, config:testConfig({maxPerHour:2})});
  try {
    const erin = await f.register('coach_erin'), finn = await f.register('coach_finn');
    const ask = cookie => f.request('/api/coach/explain', {cookie, body:{moves:BASE}});
    assert.equal((await ask(erin)).body.source, 'claude');
    assert.equal((await ask(erin)).body.source, 'claude');
    const limited = await ask(erin);
    assert.deepEqual([limited.body.source, limited.body.fallbackReason], ['engine', 'rate_limited']);
    assert.equal(limited.body.text, fakeAnalysis().explanation);
    assert.equal(client.calls.length, 2);
    assert.equal((await ask(finn)).body.source, 'claude');
  } finally { await f.close(); }
});

test('a busy fallback does not spend the learner\'s hourly quota', async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const client = fakeClient(async (body, options, count) => { if (count === 1) await gate; return answer('[[g6]] keeps the position balanced at this depth.'); });
  const coach = createCoach({client, config:testConfig({maxPerHour:1}), logger:silentLogger(), maxConcurrent:1});
  const ask = userId => coach.explain({userId, analysis:fakeAnalysis(), moves:BASE, serverKey:true});
  const first = ask('learner-a');
  const busy = await ask('learner-b');
  assert.deepEqual([busy.source, busy.fallbackReason], ['engine', 'busy']);
  release();
  assert.equal((await first).source, 'claude');
  const retry = await ask('learner-b');
  assert.deepEqual([retry.source, retry.fallbackReason], ['claude', null], 'The busy request did not use learner-b\'s only explanation this hour');
  assert.equal(client.calls.length, 2);
});

test('a hosted server spends its Claude key only on accounts created with a coach invite code', async () => {
  const client = fakeClient(() => answer('[[Nf6]] allows [[Qxf7#]] in the engine\'s line.'));
  const hosted = {APP_ORIGIN:'https://app.example.com', BETA_INVITE_CODES:'tester-cohort-1'};
  const f = await fixture({client, security:securityConfig({...hosted, COACH_AI_INVITE_CODES:'family-and-friends-1'})});
  try {
    const friend = await f.register('coach_friend', 'family-and-friends-1'), tester = await f.register('coach_tester', 'tester-cohort-1');
    assert.deepEqual([(await f.request('/api/me', {cookie:friend})).body.user.coachAi, (await f.request('/api/me', {cookie:tester})).body.user.coachAi], [true, false]);
    const testerAnalysis = await f.request('/api/analyze', {cookie:tester, body:{moves:BASE, playedMove:'g8f6'}});
    assert.equal(testerAnalysis.body.evidenceId, undefined, 'No evidence is kept for an account that cannot ask Claude');
    const refused = await f.request('/api/coach/explain', {cookie:tester, body:{moves:BASE, playedMove:'g8f6'}});
    assert.deepEqual([refused.body.source, refused.body.fallbackReason, client.calls.length], ['engine', 'not_covered', 0]);
    const analysis = await f.request('/api/analyze', {cookie:friend, body:{moves:BASE, playedMove:'g8f6'}});
    const covered = await f.request('/api/coach/explain', {cookie:friend, body:{moves:BASE, playedMove:'g8f6', evidenceId:analysis.body.evidenceId}});
    assert.deepEqual([covered.body.source, client.calls.length], ['claude', 1]);
    await f.restart(securityConfig(hosted));
    const revoked = await f.request('/api/coach/explain', {cookie:friend, body:{moves:BASE, playedMove:'g8f6', evidenceId:analysis.body.evidenceId}});
    assert.deepEqual([revoked.body.fallbackReason, client.calls.length], ['not_covered', 1], 'Removing the code stops paying for the accounts that used it');
    assert.equal((await f.request('/api/me', {cookie:friend})).body.user.coachAi, false);
  } finally { await f.close(); }
});

test('the daily cap counts each account per UTC day in the database, so a restart does not reset it', async () => {
  let clock = Date.UTC(2026, 9, 9, 10);
  const client = fakeClient(() => answer('[[g6]] keeps the position balanced at this depth.'));
  const f = await fixture({client, config:testConfig({maxPerDay:2}), nowMs:() => clock});
  try {
    const erin = await f.register('coach_erin'), finn = await f.register('coach_finn');
    const ask = async cookie => (await f.request('/api/coach/explain', {cookie, body:{moves:BASE}})).body;
    assert.deepEqual([(await ask(erin)).source, (await ask(erin)).source], ['claude', 'claude']);
    const capped = await ask(erin);
    assert.deepEqual([capped.source, capped.fallbackReason, capped.text], ['engine', 'daily_limit', fakeAnalysis().explanation]);
    assert.equal((await ask(finn)).source, 'claude', 'Other accounts keep their own allowance');
    await f.restart();
    assert.equal((await ask(erin)).fallbackReason, 'daily_limit', 'The count survives a restart');
    clock = Date.UTC(2026, 9, 10, 0, 1);
    assert.equal((await ask(erin)).source, 'claude', 'A new UTC day brings a new allowance');
    assert.equal(client.calls.length, 4);
  } finally { await f.close(); }
});

test('an hourly refusal does not spend one of the day\'s explanations', async () => {
  let clock = Date.UTC(2026, 9, 9, 1);
  const client = fakeClient(() => answer('[[g6]] keeps the position balanced at this depth.'));
  const coach = createCoach({client, config:testConfig({maxPerHour:1, maxPerDay:2}), logger:silentLogger(), nowMs:() => clock});
  const ask = async () => (await coach.explain({userId:'learner-a', analysis:fakeAnalysis(), moves:BASE, serverKey:true})).fallbackReason;
  assert.deepEqual([await ask(), await ask()], [null, 'rate_limited']);
  clock += 3600000;
  assert.equal(await ask(), null, 'The refused request left the second daily explanation unspent');
  clock += 3600000;
  assert.equal(await ask(), 'daily_limit');
  assert.equal((await coach.explain({userId:'learner-b', analysis:fakeAnalysis(), moves:BASE})).fallbackReason, 'not_covered', 'A caller that does not say the account is covered spends nothing');
  assert.equal(client.calls.length, 2);
});

test('a daily refusal hands back its hourly unit, so the first explanation after 00:00 UTC is answered', async () => {
  let clock = Date.UTC(2026, 9, 9, 23, 30);
  const client = fakeClient(() => answer('[[g6]] keeps the position balanced at this depth.'));
  const coach = createCoach({client, config:testConfig({maxPerHour:3, maxPerDay:1}), logger:silentLogger(), nowMs:() => clock});
  const ask = async () => (await coach.explain({userId:'learner-a', analysis:fakeAnalysis(), moves:BASE, serverKey:true})).fallbackReason;
  assert.deepEqual([await ask(), await ask(), await ask(), await ask()], [null, 'daily_limit', 'daily_limit', 'daily_limit']);
  clock = Date.UTC(2026, 9, 10, 0, 5);
  assert.equal(await ask(), null);
  assert.equal(client.calls.length, 2);
});

test('on a hosted server the daily cap counts per coach code, so a second account on one code shares it', async () => {
  const client = fakeClient(() => answer('[[g6]] keeps the position balanced at this depth.'));
  const security = securityConfig({APP_ORIGIN:'https://app.example.com', COACH_AI_INVITE_CODES:'family-asha-5c1e9a07,family-ravi-8f40b6e2'});
  const f = await fixture({client, config:testConfig({maxPerDay:2}), security});
  try {
    const asha = await f.register('coach_asha', 'family-asha-5c1e9a07'), spare = await f.register('coach_spare', 'family-asha-5c1e9a07');
    const ravi = await f.register('coach_ravi', 'family-ravi-8f40b6e2');
    const ask = async cookie => (await f.request('/api/coach/explain', {cookie, body:{moves:BASE}})).body;
    assert.deepEqual([(await ask(asha)).source, (await ask(spare)).source], ['claude', 'claude']);
    assert.deepEqual([(await ask(spare)).fallbackReason, (await ask(asha)).fallbackReason], ['daily_limit', 'daily_limit']);
    assert.equal((await ask(ravi)).source, 'claude', 'Another code keeps its own allowance');
    assert.equal(client.calls.length, 3);
  } finally { await f.close(); }
});

test('why-not questions compute the asked move with the engine before Claude explains it', async () => {
  const client = fakeClient(() => answer('[[Qe7]] is playable: the engine gives [[Nc3]] in reply and still prefers [[g6]] at this depth.'));
  const f = await fixture({client});
  try {
    const cookie = await f.register('coach_gwen');
    const illegal = await f.request('/api/coach/explain', {cookie, body:{moves:BASE, playedMove:'g8f6', question:'why not Ke2?'}});
    assert.equal(illegal.status, 400);
    assert.equal(f.engineCalls.length + client.calls.length, 0, 'Illegal questions never reach the engine or Claude');
    const result = await f.request('/api/coach/explain', {cookie, body:{moves:BASE, playedMove:'g8f6', question:'Why not Qe7?'}});
    assert.equal(result.status, 200);
    assert.deepEqual(f.engineCalls[0], {moves:BASE, initialFen:null, variant:undefined, playedMove:'d8e7', movetime:800, lines:3});
    assert.equal(result.body.question, 'Qe7');
    assert.equal(result.body.source, 'claude');
    const content = client.calls[0].body.messages[0].content;
    assert.match(content, /Task: the learner asks "why not \[\[Qe7\]\]\?"/);
    assert.ok(content.includes('"askedMove"') && !content.includes('"playedMove"') && !content.includes('Why not'), 'Only the engine-checked move reaches the model');
    const again = await f.request('/api/coach/explain', {cookie, body:{moves:BASE, question:'Qe7'}});
    assert.deepEqual([again.body.source, f.engineCalls.length], ['claude', 2], 'A question without a played move also gets its own search');
  } finally { await f.close(); }
});

test('server evidence is reused only for the same account and position', async () => {
  const client = fakeClient(() => answer('[[Nf6]] allows [[Qxf7#]] in the engine\'s line.'));
  const f = await fixture({client});
  try {
    const owner = await f.register('coach_hana'), other = await f.register('coach_ivan');
    const analysis = await f.request('/api/analyze', {cookie:owner, body:{moves:BASE, playedMove:'g8f6'}});
    assert.match(analysis.body.evidenceId, /^[0-9a-f-]{36}$/);
    assert.equal(f.engineCalls.length, 1);
    await f.request('/api/coach/explain', {cookie:owner, body:{moves:BASE, playedMove:'g8f6', evidenceId:analysis.body.evidenceId}});
    assert.equal(f.engineCalls.length, 1, 'The panel and the explanation share one search');
    assert.equal((await f.request('/api/coach/explain', {cookie:other, body:{moves:BASE, playedMove:'g8f6', evidenceId:analysis.body.evidenceId}})).status, 409, 'Another account cannot reuse the evidence');
    assert.equal((await f.request('/api/coach/explain', {cookie:owner, body:{moves:BASE, playedMove:'d8e7', evidenceId:analysis.body.evidenceId}})).status, 409, 'Evidence for another move is refused');
    assert.equal(f.engineCalls.length, 1, 'Neither is replaced by a different search');
    await f.request('/api/coach/explain', {cookie:owner, body:{moves:BASE, playedMove:'d8e7'}});
    assert.equal(f.engineCalls.length, 2, 'Without panel evidence, a move gets its own search');
    assert.equal((await f.request('/api/coach/explain', {cookie:owner, body:{moves:BASE, playedMove:'e2e4'}})).status, 400, 'Illegal played moves are rejected');
  } finally { await f.close(); }
});

test('panel evidence the server no longer holds is refused rather than replaced by another search', async () => {
  let now = Date.parse('2026-10-08T12:00:00Z');
  const client = fakeClient(() => answer('[[Nf6]] allows [[Qxf7#]] in the engine\'s line.'));
  const f = await fixture({client, nowMs:() => now});
  try {
    const cookie = await f.register('coach_mona');
    const analysis = await f.request('/api/analyze', {cookie, body:{moves:BASE, playedMove:'g8f6'}});
    now += 31 * 60000;
    const expired = await f.request('/api/coach/explain', {cookie, body:{moves:BASE, playedMove:'g8f6', evidenceId:analysis.body.evidenceId}});
    assert.equal(expired.status, 409);
    assert.match(expired.body.error, /Run the analysis again/);
    const restarted = await f.request('/api/coach/explain', {cookie, body:{moves:BASE, playedMove:'g8f6', evidenceId:randomUUID()}});
    assert.equal(restarted.status, 409, 'An id from before a restart is unknown');
    assert.deepEqual([f.engineCalls.length, client.calls.length], [1, 0], 'No substitute search and no model call');
  } finally { await f.close(); }
});

test('API errors, refusals and truncation fall back without logging the key or the prompt', async () => {
  const outcomes = [
    () => { throw Object.assign(new Error('overloaded'), {status:529}); },
    () => { throw Object.assign(new Error('rate limited'), {status:429}); },
    () => ({model:DEFAULT_MODEL, stop_reason:'refusal', content:[]}),
    () => ({model:DEFAULT_MODEL, stop_reason:'max_tokens', content:[{type:'text', text:'[[g6]] is'}]}),
    () => answer('   '),
    () => answer(`[[g6]] ${'keeps the position balanced at this depth. '.repeat(16)}`),
    () => answer('[[g6]] keeps the balance.\n\nThe engine prefers it.\n\nRemember the idea.'),
  ];
  const client = fakeClient((body, options, count) => outcomes[count - 1]());
  const f = await fixture({client});
  try {
    const cookie = await f.register('coach_jade');
    const reasons = [];
    for (let i = 0; i < outcomes.length; i++) reasons.push((await f.request('/api/coach/explain', {cookie, body:{moves:BASE}})).body.fallbackReason);
    assert.deepEqual(reasons, ['api_error', 'upstream_busy', 'refusal', 'incomplete', 'empty', 'too_long', 'too_long'], 'Over 110 words or two paragraphs is too long');
    const logged = f.logger.lines.join('\n');
    assert.ok(!logged.includes('sk-ant') && !logged.includes('evidence') && !logged.includes('g6'), logged);
  } finally { await f.close(); }
});

test('a saved whole-game review step is reused as evidence for its own move only', async () => {
  const client = fakeClient(() => answer('[[Nf6]] allows [[Qxf7#]] in the engine\'s line.'));
  const f = await fixture({client});
  try {
    const cookie = await f.register('coach_kira');
    const game = (await f.request('/api/import', {cookie, body:{pgn:'1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7# 1-0'}})).body.game;
    for (let after = 0; after < game.moves.length; after++) assert.equal((await f.request(`/api/games/${game.id}/review`, {cookie, body:{revision:game.revision, after, movetime:100, threads:1}})).status, 200);
    const reviewCalls = f.engineCalls.length;
    const result = await f.request('/api/coach/explain', {cookie, body:{gameId:game.id, moves:BASE, playedMove:'g8f6'}});
    assert.equal(result.body.source, 'claude');
    assert.equal(f.engineCalls.length, reviewCalls, 'The saved review step is the evidence');
    await f.request('/api/coach/explain', {cookie, body:{gameId:game.id, moves:BASE, playedMove:'d8e7'}});
    assert.equal(f.engineCalls.length, reviewCalls + 1, 'A move the game did not play is searched afresh');
    const stranger = await f.register('coach_lena');
    assert.equal((await f.request('/api/coach/explain', {cookie:stranger, body:{gameId:game.id, moves:BASE, playedMove:'g8f6'}})).status, 404);
  } finally { await f.close(); }
});

test('evidence builds from a real Stockfish search, including the reply to the played move', async t => {
  const {analyze, engineStatus, closeEngine} = await import('./engine.mjs');
  try {
    if (!(await engineStatus()).available) return t.skip('Stockfish is not installed on this machine.');
    const analysis = await analyze({moves:BASE, playedMove:'g8f6', movetime:200, lines:3});
    const bundle = buildEvidence(analysis, {moves:BASE});
    assert.equal(bundle.evidence.playedMove.san, 'Nf6');
    assert.deepEqual(bundle.evidence.playedMove.engineReplyLine[0], {san:'Qxf7#', side:'White', captures:'pawn', checkmate:true});
    assert.ok(bundle.mates.scores.has('White 1'));
    assert.ok(bundle.evidence.candidateLines.length >= 1 && bundle.best);
    assert.equal(verifyAnswer(`[[Nf6]] allows [[Qxf7#]]. The engine preferred [[${bundle.best}]].`, bundle).ok, true);
  } finally { closeEngine(); }
});

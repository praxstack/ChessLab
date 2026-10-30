import test from 'node:test';
import assert from 'node:assert/strict';
import {createTablebase, tablebaseLines, tablebaseCovers, withTablebase, TABLEBASE_URL} from './tablebase.js';

// King and pawn against king, White to move: Kd2 and Kf2 win (shapes copied from a real Lichess answer).
const KPK = '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1';
const kpkAnswer = {category: 'win', dtz: 9, dtm: 43, moves: [
  {uci: 'e1d2', san: 'Kd2', checkmate: false, stalemate: false, dtz: -8, dtm: -42, category: 'loss'},
  {uci: 'e1f2', san: 'Kf2', checkmate: false, stalemate: false, dtz: -8, dtm: -42, category: 'loss'},
  {uci: 'e2e3', san: 'e3', checkmate: false, stalemate: false, dtz: 0, dtm: 0, category: 'draw'},
]};
const reply = (body, status = 200) => ({ok: status >= 200 && status < 300, status, json: async () => body});

function fakeFetch(answer = () => reply(kpkAnswer)) {
  const calls = [];
  const fetch = async (url, init) => { calls.push({url, init}); return answer(url, init); };
  return {fetch, calls};
}

test('only positions of 7 or fewer pieces without castling rights go to the tablebase', () => {
  assert.equal(tablebaseCovers(KPK), true);
  assert.equal(tablebaseCovers('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'), false);
  assert.equal(tablebaseCovers('r3k3/8/8/8/8/8/4P3/4K3 b q - 0 1'), false);
  assert.equal(tablebaseCovers('r3k3/8/8/8/8/8/4P3/R3K3 b - - 0 1'), true);
});

test('Lichess move results become White-side scores for the player who moves', () => {
  const white = tablebaseLines(kpkAnswer, 'w', 3);
  assert.deepEqual(white.map(line => line.moves), [['e1d2'], ['e1f2'], ['e2e3']]);
  assert.deepEqual(white[0].score, {type: 'mate', value: 22});
  assert.deepEqual(white[2].score, {type: 'cp', value: 0});
  // Black to move and losing: the mate counts for White, so the score is positive.
  const black = tablebaseLines({moves: [{uci: 'e8d8', category: 'win', dtm: 41, dtz: 7}]}, 'b', 1);
  assert.deepEqual(black[0].score, {type: 'mate', value: 21});
  // Black wins with mate on the board; seven-piece wins without a mate distance use a large cp.
  assert.deepEqual(tablebaseLines({moves: [{uci: 'c2b2', checkmate: true, category: 'loss'}]}, 'b', 1)[0].score, {type: 'mate', value: -1});
  assert.deepEqual(tablebaseLines({moves: [{uci: 'a1a2', category: 'syzygy-loss', dtz: -12, dtm: null}]}, 'w', 1)[0].score, {type: 'cp', value: 19987});
  assert.deepEqual(tablebaseLines({moves: [{uci: 'a1a2', category: 'cursed-win', dtz: 101}]}, 'w', 1)[0].score, {type: 'cp', value: 0});
  // An unknown result anywhere in the shown lines hands the position back to the engine.
  assert.equal(tablebaseLines({moves: [{uci: 'a1a2', category: 'unknown'}]}, 'w', 1), null);
  assert.equal(tablebaseLines({moves: []}, 'w', 1), null);
  assert.equal(tablebaseLines({moves: [{uci: 'O-O', category: 'loss'}]}, 'w', 1), null);
});

test('analyze asks Lichess with the current FEN and returns engine-shaped lines', async () => {
  const {fetch, calls} = fakeFetch();
  const tablebase = createTablebase({fetch, online: () => true});
  const result = await tablebase.analyze({fen: '4k3/8/8/8/8/8/4P3/3K4 b - - 0 1', moves: ['e8d8', 'd1e1', 'd8e8'], lines: 2});
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `${TABLEBASE_URL}?fen=${encodeURIComponent(KPK.replace(' 0 1', ' 3 3'))}`);
  assert.equal(result.engine, 'Lichess tablebase');
  assert.equal(result.bestmove, 'e1d2');
  assert.equal(result.lines.length, 2);
  assert.equal(result.tablebaseHits, 1);
});

test('answers are cached per position', async () => {
  const {fetch, calls} = fakeFetch();
  const tablebase = createTablebase({fetch, online: () => true});
  await tablebase.analyze({fen: KPK, moves: [], lines: 1});
  await tablebase.analyze({fen: KPK, moves: [], lines: 3});
  assert.equal(calls.length, 1);
});

test('big positions, offline browsers and failed requests fall back without a fetch or an error', async () => {
  const {fetch, calls} = fakeFetch();
  assert.equal(await createTablebase({fetch, online: () => true}).analyze({fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', moves: []}), null);
  assert.equal(await createTablebase({fetch, online: () => false}).analyze({fen: KPK, moves: []}), null);
  assert.equal(calls.length, 0);
  for (const answer of [() => reply({}, 500), () => { throw new TypeError('Failed to fetch'); }, () => ({ok: true, status: 200, json: async () => { throw new SyntaxError('bad json'); }}), () => reply({moves: [{uci: 'e1d2', category: 'unknown'}]})]) {
    assert.equal(await createTablebase({fetch: fakeFetch(answer).fetch, online: () => true}).analyze({fen: KPK, moves: []}), null);
  }
});

test('a slow tablebase is abandoned after the timeout', async () => {
  const fetch = (url, {signal}) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))));
  const started = Date.now();
  assert.equal(await createTablebase({fetch, timeout: 30, online: () => true}).analyze({fen: KPK, moves: []}), null);
  assert.ok(Date.now() - started < 1000);
});

test('a rate limit pauses lookups for a minute', async () => {
  let clock = 0;
  const {fetch, calls} = fakeFetch(() => reply({}, 429));
  const tablebase = createTablebase({fetch, now: () => clock, online: () => true});
  assert.equal(await tablebase.analyze({fen: KPK, moves: []}), null);
  assert.equal(await tablebase.analyze({fen: '4k3/8/8/8/8/8/3P4/4K3 w - - 0 1', moves: []}), null);
  assert.equal(calls.length, 1);
  clock = 61000;
  await tablebase.analyze({fen: '4k3/8/8/8/8/8/3P4/4K3 w - - 0 1', moves: []});
  assert.equal(calls.length, 2);
});

test('a cancelled request rejects with 499 instead of falling back', async () => {
  const controller = new AbortController();
  const fetch = (url, {signal}) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))));
  const pending = createTablebase({fetch, online: () => true}).analyze({fen: KPK, moves: [], signal: controller.signal});
  controller.abort();
  await assert.rejects(pending, error => error.status === 499);
});

test('the app engine uses the tablebase for full-strength analysis only, and the engine otherwise', async () => {
  const calls = [];
  const engine = {
    status: async () => ({available: true, name: 'Stockfish'}),
    analyze: async input => { calls.push(input); return {engine: 'Stockfish', bestmove: 'e1d1', lines: [{moves: ['e1d1'], score: {type: 'cp', value: 0}}]}; },
    bestMove: async () => ({move: 'e1d1', engine: 'Stockfish'}),
    stop() {},
  };
  let fails = false;
  const app = withTablebase(engine, createTablebase({fetch: fakeFetch(() => fails ? reply({}, 503) : reply(kpkAnswer)).fetch, online: () => true}));
  assert.equal((await app.analyze({fen: KPK, moves: [], movetime: 500, lines: 1})).engine, 'Lichess tablebase');
  assert.deepEqual((await app.analyze({fen: KPK, moves: [], movetime: 500, lines: 1})).limits, {movetime: 500, lines: 1});
  assert.equal(calls.length, 0);
  assert.equal((await app.analyze({fen: KPK, moves: [], movetime: 500, lines: 1, skill: 4})).engine, 'Stockfish');
  fails = true;
  assert.equal((await app.analyze({fen: '4k3/8/8/8/8/8/3P4/4K3 w - - 0 1', moves: [], movetime: 500, lines: 1})).engine, 'Stockfish');
  assert.equal(calls.length, 2);
  assert.deepEqual(await app.bestMove({fen: KPK, moves: []}), {move: 'e1d1', engine: 'Stockfish'});
  assert.equal((await app.status()).available, true);
});

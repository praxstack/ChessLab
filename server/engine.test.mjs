import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { analyze, closeEngine, engineStatus, replay } from './engine.mjs';

after(closeEngine);

test('request validation rejects malformed notation, illegal history, FEN command injection and limit abuse', async () => {
  for (const input of [null, {}, { moves: 'e2e4' }, { moves: ['e4'] }, { moves: ['e2e5'] }, { moves: ['e2e4\nquit'] }, { moves: [], initialFen: 'startpos\nquit' }, { moves: [], initialFen: '8/8/8/8/8/8/4k3/4K3 w - - 0 1' }, { moves: [], movetime: 100000 }, { moves: [], movetime: NaN }, { moves: [], lines: 4 }, { moves: [], skill: -1 }, { moves: [], threads: 8 }, { moves: [], playedMove: 'e2e5' }]) {
    await assert.rejects(analyze(input), error => error.status === 400);
  }
  assert.throws(() => replay(new Array(1001).fill('e2e4')), /at most 1000/);
});

test('real Stockfish gives legal PVs, identity, limits and deterministic facts', async () => {
  const status = await engineStatus();
  assert.equal(status.available, true, 'Install native Stockfish or set STOCKFISH_PATH to run engine checks.');
  assert.match(status.name, /Stockfish/);
  const moves = ['e2e4', 'e7e5', 'g1f3'];
  const result = await analyze({ moves, movetime: 100, lines: 3, skill: 4 });
  assert.match(result.engine, /Stockfish/);
  assert.equal(result.turn, 'b');
  assert.equal(result.fen, replay(moves).fen());
  assert.deepEqual(result.limits, { movetime: 100, lines: 3 });
  assert.deepEqual(result.facts.material, { white: 39, black: 39 });
  assert.ok(result.bestmove);
  replay([...moves, result.bestmove]);
  assert.ok(result.lines.length >= 1 && result.lines.length <= 3);
  for (const line of result.lines) {
    replay([...moves, ...line.moves]);
    assert.equal(line.move, line.moves[0]);
    assert.equal(line.san.length, line.moves.length);
    assert.ok(Number.isInteger(line.score.value));
  }
  assert.match(result.explanation, /Sample line/);
});

test('advanced analysis uses actual Lite with five legal lines and preserves strict engine selection', async()=>{
  for(const engineId of ['torch4','/bin/sh', ['stockfish18'], '__proto__']) await assert.rejects(analyze({moves:[],engineId}),{status:400});
  const result=await analyze({moves:['e2e4'],engineId:'stockfish18-lite',movetime:200,lines:5,threads:2});
  assert.match(result.engine,/Stockfish 18 Lite/);
  assert.deepEqual(result.limits,{engineId:'stockfish18-lite',movetime:200,lines:5,threads:2});
  assert.equal(result.lines.length,5);
  assert.equal(new Set(result.lines.map(line=>line.move)).size,5);
  assert.equal(new Set(result.lines.map(line=>line.depth)).size,1);
  for(const line of result.lines) replay(['e2e4',...line.moves]);
});

test('full history distinguishes a repeated game from its identical FEN', async () => {
  const moves = ['g1f3', 'g8f6', 'f3g1', 'f6g8', 'g1f3', 'g8f6', 'f3g1', 'f6g8'];
  assert.equal(replay(moves).isThreefoldRepetition(), true);
  assert.equal(replay([], replay(moves).fen()).isThreefoldRepetition(), false);
  const result = await analyze({ moves, movetime: 50 });
  assert.equal(result.bestmove, null);
  assert.deepEqual(result.lines, []);
  assert.match(result.explanation, /threefold repetition/);
});

test('terminal checkmate returns no fabricated move', async () => {
  const result = await analyze({ moves: ['f2f3', 'e7e5', 'g2g4', 'd8h4'], movetime: 50 });
  assert.equal(result.bestmove, null);
  assert.deepEqual(result.lines, []);
  assert.equal(result.facts.inCheck, true);
  assert.match(result.explanation, /White is checkmated/);
});

test('scores retain White perspective when side to move changes', async () => {
  for (const turn of ['w', 'b']) {
    const result = await analyze({ moves: [], initialFen: `6k1/8/8/8/8/8/8/Q5K1 ${turn} - - 0 1`, movetime: 100, lines: 1 });
    assert.ok(result.lines[0].score.value > 0, `White has the queen; ${turn} to move must not invert its score.`);
  }
});

test('played capture and promotion explanations are replay-derived', async () => {
  const capture = await analyze({ moves: ['e2e4', 'd7d5'], playedMove: 'e4d5', movetime: 100, lines: 1 });
  assert.equal(capture.played.san, 'exd5');
  assert.match(capture.played.explanation, /captures a pawn/);
  assert.ok(capture.played.lossCp === null || capture.played.lossCp >= 0);
  const promotion = await analyze({ moves: [], initialFen: '7k/P7/8/8/8/8/8/7K w - - 0 1', playedMove: 'a7a8q', movetime: 50, lines: 1 });
  assert.match(promotion.played.explanation, /promotes to a queen/);
});

test('coach demonstrates the capture and material consequence of hanging a queen', async () => {
  const initialFen = '6k1/8/8/3q4/8/8/8/R5K1 b - - 0 1';
  const result = await analyze({ moves: [], initialFen, playedMove: 'd5a2', movetime: 150, lines: 1 });
  assert.match(result.explanation, /Sample line:/);
  assert.match(result.played.explanation, /White Rxa2 captures Black's queen on a2/);
  assert.match(result.played.explanation, /Material: White 5, Black 0 \(Black -9 points\)/);
  assert.match(result.played.explanation, /Sample line/);
  const reply = replay(['d5a2', 'a1a2'], initialFen);
  assert.equal(reply.get('a2').type, 'r');
  assert.equal(reply.board().flat().filter(piece => piece?.type === 'q').length, 0);
});

test('missing binary is explicit and never falls back to invented analysis', async () => {
  const previous = process.env.STOCKFISH_PATH;
  process.env.STOCKFISH_PATH = '/this/engine/does-not-exist';
  try {
    await assert.rejects(analyze({ moves: [], movetime: 50 }), error => error.status === 503 && /unavailable/.test(error.message));
    assert.equal((await engineStatus()).available, false);
  } finally {
    if (previous === undefined) delete process.env.STOCKFISH_PATH; else process.env.STOCKFISH_PATH = previous;
  }
});

test('engine admits two active requests and eight queued requests, then rejects overload', async () => {
  const results = await Promise.allSettled(Array.from({ length: 11 }, () => analyze({ moves: [], movetime: 50, lines: 1 })));
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 10);
  const errors = results.filter(result => result.status === 'rejected');
  assert.equal(errors.length, 1);
  assert.equal(errors[0].reason.status, 503);
  assert.match(errors[0].reason.message, /busy/);
});

test('unresponsive subprocess has a hard deadline', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'chesslab-engine-'));
  const binary = join(directory, 'stall');
  const previous = process.env.STOCKFISH_PATH;
  await writeFile(binary, `#!${process.execPath}\nprocess.stdin.resume();\n`, { mode: 0o700 });
  process.env.STOCKFISH_PATH = binary;
  const start = Date.now();
  try {
    await assert.rejects(analyze({ moves: [], movetime: 50 }), error => error.status === 503 && /timed out/.test(error.message));
    assert.ok(Date.now() - start < 5500);
  } finally {
    if (previous === undefined) delete process.env.STOCKFISH_PATH; else process.env.STOCKFISH_PATH = previous;
    await rm(directory, { recursive: true, force: true });
  }
});


test('legal castling and history-dependent en passant replay correctly', () => {
  const castled = replay(['e1g1'], 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  assert.equal(castled.get('g1').type, 'k');
  assert.equal(castled.get('f1').type, 'r');
  assert.equal(castled.get('h1'), undefined);
  const captured = replay(['e2e4','a7a6','e4e5','d7d5','e5d6']);
  assert.equal(captured.get('d6').color, 'w');
  assert.equal(captured.get('d5'), undefined);
  assert.ok(captured.history({verbose:true}).at(-1).flags.includes('e'));
});


test('canceling active and queued analyses frees slots for the next position', async()=>{
  const controllers=Array.from({length:3},()=>new AbortController());
  const results=Promise.allSettled(controllers.map(controller=>analyze({moves:[],engineId:'stockfish19',movetime:90000},{signal:controller.signal})));
  await new Promise(resolve=>setTimeout(resolve,100));
  controllers[2].abort();controllers[0].abort();controllers[1].abort();
  for(const result of await results){assert.equal(result.status,'rejected');assert.equal(result.reason.status,499);}
  const start=Date.now();
  const next=await analyze({moves:[],movetime:50,lines:1});
  assert.ok(next.bestmove);assert.ok(Date.now()-start<1500);
});

test('a final bestmove uses its own PV when a partial iteration changes the ranking',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'chesslab-ranking-')),binary=join(directory,'engine'),previous=process.env.STOCKFISH_PATH;
 await writeFile(binary,`#!${process.execPath}\nlet buffer='';process.stdin.on('data',chunk=>{buffer+=chunk;let end;while((end=buffer.indexOf('\\n'))>=0){const line=buffer.slice(0,end);buffer=buffer.slice(end+1);if(line==='uci')console.log('id name Stockfish Ranking Fixture\\nuciok');else if(line==='isready')console.log('readyok');else if(line.startsWith('go '))console.log('info depth 10 multipv 1 score cp 20 pv d2d4 d7d5\\ninfo depth 10 multipv 2 score cp 10 pv e2e4 e7e5\\ninfo depth 11 multipv 1 score cp 30 pv e2e4 e7e5\\nbestmove e2e4');}});\n`,{mode:0o700});
 process.env.STOCKFISH_PATH=binary;
 try{const result=await analyze({moves:[],movetime:50,lines:2});assert.equal(result.bestmove,'e2e4');assert.equal(result.lines[0].move,result.bestmove);assert.equal(result.lines[0].score.value,10);assert.equal(result.lines.length,2);assert.equal(new Set(result.lines.map(line=>line.depth)).size,1);assert.equal(new Set(result.lines.map(line=>line.move)).size,2);assert.match(result.explanation,/Sample line: e4 → e5/);}
 finally{if(previous===undefined)delete process.env.STOCKFISH_PATH;else process.env.STOCKFISH_PATH=previous;await rm(directory,{recursive:true,force:true});}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { replay } from './engine.mjs';
import { chooseOpponentMove, listOpponentEngines, closeOpponentEngines } from './opponent-engines.mjs';

test('opponent boundary rejects invalid engine, history, controls and completed games', async () => {
  for (const input of [
    null, { engineId: '/bin/sh', moves: [] },
    { engineId: 'maia3', moves: ['e2e5'] },
    { engineId: 'maia3', moves: [], rating: '1500\nquit' },
    { engineId: 'maia3', moves: [], movetime: 2001 },
    { engineId: 'maia3', moves: [], skill: -1 },
    { engineId: 'stockfish18', moves: [], rating: 249 },
    { engineId: 'stockfish18', moves: [], rating: 3201 },
    { engineId: 'stockfish18', moves: [], style: 'custom\nquit' },
    { engineId: 'maia3', moves: ['g1f3', 'g8f6', 'f3g1', 'f6g8', 'g1f3', 'g8f6', 'f3g1', 'f6g8'] },
  ]) await assert.rejects(chooseOpponentMove(input), { status: 400 });
});

test('UCI adapter sends complete history, checks readiness and refuses illegal engine moves', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'chesslab-uci-'));
  const transcript = join(temporary, 'commands.txt');
  const result = join(temporary, 'result.txt');
  await mkdir(join(temporary, 'stockfish18'));
  await writeFile(result, 'b8c6');
  await writeFile(join(temporary, 'stockfish18/stockfish'), `#!${process.execPath}
const fs = require('node:fs');
require('node:readline').createInterface({input:process.stdin}).on('line', line => {
  fs.appendFileSync(${JSON.stringify(transcript)}, line+'\\n');
  if(line==='uci') console.log('id name Stockfish 18\\nuciok');
  if(line==='isready') console.log('readyok');
  if(line.startsWith('go ')) { const move=fs.readFileSync(${JSON.stringify(result)},'utf8'); if(move!=='hold') console.log('bestmove '+move); }
});
`, { mode: 0o755 });
  const before = process.env.CHESSLAB_ENGINES_DIR;
  process.env.CHESSLAB_ENGINES_DIR = temporary;
  const isolated = await import(`./opponent-engines.mjs?test=${Date.now()}`);
  if (before === undefined) delete process.env.CHESSLAB_ENGINES_DIR; else process.env.CHESSLAB_ENGINES_DIR = before;
  try {
    const engines = await isolated.listOpponentEngines();
    assert.equal(engines.find(engine => engine.id === 'stockfish18').available, true);
    assert.equal(engines.find(engine => engine.id === 'maia3').available, false);
    const moves = ['e2e4', 'e7e5', 'g1f3'];
    const native = await isolated.chooseOpponentMove({ engineId: 'stockfish18', moves, movetime: 50, rating: 1100 });
    assert.equal(native.move, 'b8c6');
    assert.equal(native.baseMove, 'b8c6');
    assert.equal(native.policy.probability, 0);
    assert.equal(native.policy.applied, false);
    const novice = await isolated.chooseOpponentMove({ engineId: 'stockfish18', moves, movetime: 50, rating: 250, style: 'aggressive' });
    assert.equal(novice.baseMove, 'b8c6');
    assert.equal(novice.policy.probability, 0.85);
    assert.equal(novice.policy.style, 'aggressive');
    assert.doesNotThrow(() => replay([...moves, novice.move]));
    for(const rating of [100,125,150,175,200,225]) {
      const result=await isolated.chooseOpponentMove({engineId:'stockfish18',moves,movetime:50,rating,profileRating:rating});
      assert.doesNotThrow(()=>replay([...moves,result.move]));
    }
    await assert.rejects(isolated.chooseOpponentMove({engineId:'stockfish18',moves,rating:125}),{status:400});
    let commands = await readFile(transcript, 'utf8');
    assert.match(commands, /isready\n/);
    assert.match(commands, /position startpos moves e2e4 e7e5 g1f3\n/);
    const initialFen = replay(['e2e4']).fen();
    await isolated.chooseOpponentMove({ engineId: 'stockfish18', moves: ['e7e5', 'g1f3'], initialFen, movetime: 50 });
    commands = await readFile(transcript, 'utf8');
    assert.ok(commands.includes(`position fen ${initialFen} moves e7e5 g1f3\n`));
    await writeFile(result, 'a1a8');
    await assert.rejects(isolated.chooseOpponentMove({ engineId: 'stockfish18', moves }), { status: 503 });
    await writeFile(result, 'hold');
    const pending = Array.from({ length: 12 }, () => isolated.chooseOpponentMove({ engineId: 'stockfish18', moves }));
    const outcomes = Promise.allSettled(pending);
    isolated.closeOpponentEngines();
    const settled = await outcomes;
    assert.ok(settled.every(item => item.status === 'rejected' && item.reason.status === 503));
    assert.ok(settled.some(item => /busy/.test(item.reason.message)));
  } finally {
    isolated.closeOpponentEngines();
    await rm(temporary, { recursive: true, force: true });
  }
});

test('installed engines complete actual ready handshake and return a legal move with history', async t => {
  const engines = await listOpponentEngines();
  const data = process.env.CHESSLAB_ENGINES_DIR || fileURLToPath(new URL('../data/engines', import.meta.url));
  let manifest = {};
  try { manifest = JSON.parse(await readFile(join(data, 'manifest.json'), 'utf8')).engines || {}; } catch {}
  function installed(id) {
    if (manifest[id]) return true;
    if (id === 'stockfish19') return [process.env.STOCKFISH_PATH, '/opt/homebrew/bin/stockfish', '/usr/local/bin/stockfish', '/usr/games/stockfish', ...(process.env.PATH || '').split(':').map(path => join(path, 'stockfish'))].filter(Boolean).some(existsSync);
    const files = id.startsWith('maia3') ? ['python/bin/python', `maia3/${id === 'maia3' ? 'maia3-79m' : id}.pt`]
      : id.startsWith('maia2') ? ['python/bin/python', `maia2/${id === 'maia2' ? 'rapid' : 'blitz'}_model.pt`]
      : id === 'lc0' ? ['lc0/lc0', 'lc0/weights.pb.gz'] : [`${id}/stockfish`];
    return files.every(path => existsSync(join(data, path)));
  }
  const moves = ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5', 'a7a6'];
  try {
    for (const entry of engines) await t.test(entry.id, { skip: !entry.available && !installed(entry.id) ? 'Required runtime files are not installed.' : false }, async () => {
      assert.equal(entry.available, true, `${entry.id} is installed but readiness failed: ${entry.reason}`);
      const result = await chooseOpponentMove({ engineId: entry.id, moves, movetime: 100, rating: 1500 });
      assert.equal(result.engineId, entry.id);
      assert.doesNotThrow(() => replay([...moves, result.move]));
    });
  } finally { closeOpponentEngines(); }
});

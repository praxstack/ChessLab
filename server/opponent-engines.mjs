import { spawn } from 'node:child_process';
import { randomInt } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyze, engineStatus, replay } from './engine.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const data = resolve(process.env.CHESSLAB_ENGINES_DIR || resolve(root, 'data/engines'));
const python = resolve(data, 'python/bin/python');
const catalog = [
  { id: 'stockfish19', name: 'Stockfish 19', humanLike: false },
  { id: 'stockfish18', name: 'Stockfish 18', humanLike: false },
  { id: 'stockfish16', name: 'Stockfish 16', humanLike: false },
  { id: 'stockfish18-lite', name: 'Stockfish 18 Lite', humanLike: false },
  { id: 'maia3', name: 'Maia3 79M', humanLike: true, ratings: { min: 0, max: 5000, note: 'Accepted model conditioning range, not a calibrated opponent or validated training range.' } },
  { id: 'maia3-23m', name: 'Maia3 23M', humanLike: true, ratings: { min: 0, max: 5000, note: 'Accepted model conditioning range, not a calibrated opponent or validated training range.' } },
  { id: 'maia3-5m', name: 'Maia3 5M', humanLike: true, ratings: { min: 0, max: 5000, note: 'Accepted model conditioning range, not a calibrated opponent or validated training range.' } },
  { id: 'maia2', name: 'Maia2 rapid', humanLike: true, ratings: { min: 1100, max: 2000, note: '100-point bins; outer bins represent below 1100 and at least 2000.' } },
  { id: 'maia2-blitz', name: 'Maia2 blitz', humanLike: true, ratings: { min: 1100, max: 2000, note: '100-point bins; outer bins represent below 1100 and at least 2000.' } },
  { id: 'lc0', name: 'Leela Chess Zero', humanLike: false },
];
const children = new Set();
const waiting = [];
let active = 0;
let closed = false;
let availability;
let availabilityPending = false;
let availabilityAt = 0;
let availabilityTtl = 300000;

function failure(message, status = 400) { return Object.assign(new Error(message), { status }); }

function integer(value, fallback, min, max, name) {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || value < min || value > max) throw failure(`${name} must be an integer from ${min} to ${max}.`);
  return value;
}

async function withSlot(work) {
  if (closed) throw failure('Opponent engines are shutting down.', 503);
  // ponytail: one cold process limits model memory pressure; add a measured warm pool for throughput.
  if (active >= 1) {
    if (waiting.length >= 8) throw failure('Opponent engines are busy. Try again shortly.', 503);
    await new Promise((resolve, reject) => {
      const entry = { resolve, reject, timer: null };
      entry.timer = setTimeout(() => {
        const index = waiting.indexOf(entry);
        if (index !== -1) waiting.splice(index, 1);
        reject(failure('Opponent engine queue timed out.', 503));
      }, 30000);
      waiting.push(entry);
    });
  } else active++;
  try {
    if (closed) throw failure('Opponent engines are shutting down.', 503);
    return await work();
  } finally {
    const next = waiting.shift();
    if (next) { clearTimeout(next.timer); next.resolve(); } else active--;
  }
}

function command(id) {
  if (id === 'stockfish18-lite') return [process.execPath, [resolve(data, 'stockfish18-lite/stockfish-18-lite.js')]];
  if (id.startsWith('maia3')) {
    const model = id === 'maia3' ? 'maia3-79m' : id;
    return [python, ['-m', 'maia3.uci', '--model', model, '--checkpoint-path', resolve(data, `maia3/${model}.pt`), '--use-uci-history', '--device', 'cpu', '--no-use-amp']];
  }
  if (id.startsWith('maia2')) return [python, [resolve(root, 'scripts/install_engines.py'), '--maia2-uci', id === 'maia2' ? 'rapid' : 'blitz']];
  if (id === 'lc0') return [resolve(data, 'lc0/lc0'), ['--weights=' + resolve(data, 'lc0/weights.pb.gz'), '--backend=blas', '--minibatch-size=1', '--threads=1']];
  return [resolve(data, `${id}/stockfish`), []];
}

function stockfishPolicy(result, board, rating, skill, style) {
  const probability = Math.max(0, (1100 - rating) / 1000);
  const applied = probability > 0 && randomInt(1_000_000) < probability * 1_000_000;
  const baseMove = result.move;
  if (applied) {
    // ponytail: local move weighting is uncalibrated; replace only with measured human play evidence.
    const candidates = board.moves({ verbose: true }).map(move => ({
      move: move.from + move.to + (move.promotion || ''),
      weight: style === 'aggressive' && (move.captured || /[+#]/.test(move.san)) ? 4
        : style === 'solid' && !move.captured && ['n', 'b'].includes(move.piece) && ['1', '8'].includes(move.from[1]) ? 4 : 1,
    }));
    let pick = randomInt(1_000_000) / 1_000_000 * candidates.reduce((sum, item) => sum + item.weight, 0);
    result.move = candidates.find(item => (pick -= item.weight) < 0)?.move || candidates.at(-1).move;
  }
  return { ...result, baseMove, policy: { id: probability ? 'stockfish-local-novice' : 'stockfish-skill', applied, probability, skill, style, calibrated: false } };
}

function runUci(id, input) {
  // ponytail: fresh processes isolate games; retain a bounded warm pool if model startup dominates play.
  return new Promise((resolve, reject) => {
    const [path, args] = command(id);
    const child = spawn(path, args, { cwd: root, env: { ...process.env, CHESSLAB_ENGINES_DIR: data, OMP_NUM_THREADS: '1', MKL_NUM_THREADS: '1', HF_HUB_OFFLINE: '1' }, stdio: ['pipe', 'pipe', 'pipe'], shell: false });
    children.add(child);
    let settled = false, phase = 'uci', buffer = '', bytes = 0, name = '', chess960 = false;
    const timer = setTimeout(() => finish(failure(`${id} initialization or search timed out.`, 503)), 25000 + (input?.movetime || 0));
    function finish(error, result) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      children.delete(child);
      child.kill('SIGKILL');
      if (error) reject(error); else resolve(result);
    }
    function write(line) { if (!settled) child.stdin.write(line + '\n'); }
    function onLine(line) {
      if (/^option name UCI_Chess960 type check\b/.test(line)) chess960 = true;
      if (line.startsWith('id name ')) name = line.slice(8).trim().slice(0, 120);
      if (phase === 'uci' && line === 'uciok') {
        const expected = id.startsWith('stockfish') ? new RegExp(`^Stockfish ${id.slice(9).replace('-lite', '')}\\b`, 'i') : id === 'lc0' ? /^(lc0|leela)/i : new RegExp(id.split('-')[0], 'i');
        if (!expected.test(name)) return finish(failure(`${id} returned an unexpected engine identity.`, 503));
        if (input?.variant==='chess960'&&!chess960) return finish(failure(`${id} does not support Chess960.`, 503));
        phase = 'ready';
        if (input?.variant==='chess960') write('setoption name UCI_Chess960 value true');
        if (id.startsWith('stockfish')) {
          write('setoption name Threads value 1');
          write('setoption name Hash value 32');
          write(`setoption name Skill Level value ${input?.skill ?? 20}`);
        } else if (id.startsWith('maia')) {
          write(`setoption name Elo value ${input?.modelRating ?? 1500}`);
          if (id.startsWith('maia3')) { write('setoption name Temperature value 1'); write('setoption name TopP value 0.95'); }
        }
        write('ucinewgame');
        write('isready');
      } else if (phase === 'ready' && line === 'readyok') {
        if (!input) return finish(null, { engine: name, engineId: id, chess960 });
        phase = 'search';
        const start = input.initialFen == null ? 'startpos' : `fen ${replay([], input.initialFen, input.variant).fen()}`;
        write(`position ${start}${input.moves.length ? ` moves ${input.moves.join(' ')}` : ''}`);
        write(`go movetime ${input.movetime}${input.nodes ? ` nodes ${input.nodes}` : ''}`);
      } else if (phase === 'search' && line.startsWith('bestmove ')) {
        const move = line.split(/\s+/)[1];
        try { replay([...input.moves, move], input.initialFen, input.variant); }
        catch { return finish(failure(`${id} returned an illegal move.`, 503)); }
        finish(null, { move, engine: name, engineId: id });
      }
    }
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > 2_000_000) return finish(failure(`${id} exceeded its output limit.`, 503));
      buffer += chunk;
      let end;
      while (!settled && (end = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, end).trim();
        buffer = buffer.slice(end + 1);
        try { onLine(line); } catch { finish(failure(`${id} returned malformed output.`, 503)); }
      }
    });
    child.stderr.on('data', chunk => { bytes += chunk.length; if (bytes > 2_000_000) finish(failure(`${id} exceeded its output limit.`, 503)); });
    child.stdin.on('error', () => finish(failure(`${id} communication failed.`, 503)));
    child.on('error', () => finish(failure(`${id} is not installed. Run python3 scripts/install_engines.py on the server.`, 503)));
    child.on('exit', () => finish(failure(`${id} stopped before becoming ready or completing its move.`, 503)));
    write('uci');
  });
}

export async function listOpponentEngines() {
  // Cache actual ready handshakes; searches still fail explicitly if an engine subsequently breaks.
  if (!availability || (!availabilityPending && Date.now() - availabilityAt > availabilityTtl)) {
    availabilityPending = true;
    availabilityAt = Date.now();
    availability = (async () => {
      let manifest = {};
      try { manifest = JSON.parse(await readFile(resolve(data, 'manifest.json'), 'utf8')).engines || {}; } catch {}
      const entries = [];
      for (const entry of catalog) {
        try {
          const result = entry.id === 'stockfish19' ? await engineStatus() : await withSlot(() => runUci(entry.id));
          if (entry.id === 'stockfish19' && (!result.available || !/^Stockfish 19\b/i.test(result.name))) throw failure('Stockfish 19 is not configured on this server.', 503);
          entries.push({ ...entry, available: true, chess960:!!result.chess960&&!entry.humanLike, version: manifest[entry.id]?.version || result.engine || result.name });
        } catch (error) { entries.push({ ...entry, available: false, reason: error.message }); }
      }
      availabilityAt = Date.now();
      availabilityTtl = entries.every(entry => entry.available) ? 300000 : 30000;
      return entries;
    })().finally(() => { availabilityPending = false; });
  }
  return availability;
}

export async function chooseOpponentMove(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw failure('Provide an opponent move request object.');
  const entry = catalog.find(item => item.id === input.engineId);
  if (!entry) throw failure('Unknown opponent engine.');
  const moves = Array.isArray(input.moves) ? [...input.moves] : input.moves;
  const initialFen = input.initialFen ?? null;
  const variant=input.variant;
  const board = replay(moves, initialFen, variant);
  if(variant==='chess960'&&entry.humanLike)throw failure('Choose a Chess960-capable engine. Maia models are Standard only.');
  if (board.isGameOver()) throw failure('The game is over.');
  const movetime = integer(input.movetime, 350, 50, 2000, 'movetime');
  const skill = integer(input.skill, 20, 0, 20, 'skill');
  if(input.profileRating!==undefined&&(!Number.isInteger(input.profileRating)||input.profileRating<100||input.profileRating>=250||input.rating!==input.profileRating)) throw failure('Invalid new-player profile rating.');
  const rating = integer(input.rating, 1500, input.profileRating?100:250, 3200, 'rating');
  const style = input.style ?? 'balanced';
  if (!['balanced', 'aggressive', 'solid'].includes(style)) throw failure('Choose balanced, aggressive or solid style.');
  const modelRating = entry.id.startsWith('maia2') ? (rating < 1100 ? 1099 : Math.min(2000, rating)) : entry.ratings ? Math.max(entry.ratings.min, Math.min(entry.ratings.max, rating)) : undefined;
  if (entry.id === 'stockfish19') {
    if (closed) throw failure('Opponent engines are shutting down.', 503);
    const result = await analyze({ moves, initialFen, variant, movetime, skill, lines: 1 });
    if (!/^Stockfish 19\b/i.test(result.engine)) throw failure('Stockfish 19 is not configured on this server.', 503);
    return stockfishPolicy({ move: result.bestmove, engine: result.engine, engineId: entry.id }, board, rating, skill, style);
  }
  const nodes = entry.id === 'lc0' ? Math.round(2 ** ((rating - 250) / 300)) : undefined;
  const result = await withSlot(() => runUci(entry.id, { moves, initialFen, variant, movetime, skill, modelRating, nodes }));
  if (entry.id.startsWith('stockfish')) return stockfishPolicy(result, board, rating, skill, style);
  return { ...result, ...(entry.humanLike ? { requestedRating: rating, modelRating, policy: { id: 'maia-model', calibrated: false } } : { policy: { id: 'lc0-search-budget', nodes, movetime, calibrated: false } }) };
}

export function closeOpponentEngines() {
  closed = true;
  availability = null;
  for (const entry of waiting.splice(0)) { clearTimeout(entry.timer); entry.reject(failure('Opponent engines are shutting down.', 503)); }
  for (const child of children) child.kill('SIGKILL');
}

// Stockfish 19 (lite, single-threaded) in the learner's own browser.
// The 1.8 MB engine file downloads once, in the background, while the board
// already works; it's kept in the browser's file store (Cache Storage) for 30
// days, so later visits start it straight from the device. The engine never
// speaks on its own: the page asks it only when the learner taps "Check my move".
//
// Stockfish is free software under the GNU GPL v3; see /assets/engine/COPYING.txt.

const BASE = '/assets/engine/stockfish-19-lite-single';
export const WASM_URL = `${BASE}.wasm`;
export const WASM_BYTES = 1845971;
const STORE = 'pz-engine-v1';
const KEEP_MS = 30 * 24 * 60 * 60 * 1000;
const SAVED_AT = 'x-pz-saved-at';

/** From a UCI score to centipawns for the side to move; a mate is worth far more than any material. */
export function toCp(score) {
  if (!score) return 0;
  if (score.mate !== undefined) {
    if (score.mate > 0) return 100000 - score.mate * 100;
    return -100000 - score.mate * 100; // mate 0 (already mated) and mate -n are losses
  }
  return score.cp;
}

/**
 * How good a move was, from the engine's two looks: the best line in the
 * position before it, and the position after it (seen from the other side).
 * Returns 'best' | 'good' | 'ok' | 'miss'.
 */
export function grade({ bestCp, afterCp, playedBest }) {
  if (playedBest) return 'best';
  const mine = -afterCp;
  if (bestCp >= 50000 && mine >= 50000) return mine >= bestCp - 300 ? 'best' : 'good'; // still mating, a move or more slower
  const loss = bestCp - mine;
  if (loss <= 25) return 'best';
  if (loss <= 90) return 'good';
  if (loss <= 220) return 'ok';
  return 'miss';
}

/** Parse one "info" line from the engine. */
export function parseInfo(line) {
  const depth = /\bdepth (\d+)/.exec(line);
  const cp = /\bscore cp (-?\d+)/.exec(line);
  const mate = /\bscore mate (-?\d+)/.exec(line);
  const pv = /\bpv (.+)$/.exec(line);
  if (!depth || (!cp && !mate) || /\b(lowerbound|upperbound)\b/.test(line)) return null;
  return {
    depth: Number(depth[1]),
    score: mate ? { mate: Number(mate[1]) } : { cp: Number(cp[1]) },
    pv: pv ? pv[1].trim().split(/\s+/) : [],
  };
}

async function fromDevice() {
  if (!('caches' in window)) return null;
  try {
    const store = await caches.open(STORE);
    const hit = await store.match(WASM_URL);
    if (!hit) return null;
    const at = Number(hit.headers.get(SAVED_AT)) || 0;
    if (Date.now() - at > KEEP_MS) {
      await store.delete(WASM_URL);
      return null;
    }
    return { blob: await hit.blob(), at };
  } catch {
    return null;
  }
}

async function download(onProgress) {
  const res = await fetch(WASM_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  // Cloudflare may compress the file on the way, and then there's no length to go by.
  const total = Number(res.headers.get('content-length')) || WASM_BYTES;
  let blob;
  if (res.body && res.body.getReader) {
    const reader = res.body.getReader();
    const parts = [];
    let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value);
      got += value.length;
      onProgress(Math.min(got, total), total);
    }
    blob = new Blob(parts, { type: 'application/wasm' });
  } else {
    blob = new Blob([await res.arrayBuffer()], { type: 'application/wasm' });
  }
  onProgress(blob.size, blob.size);
  try {
    if ('caches' in window) {
      const store = await caches.open(STORE);
      await store.put(WASM_URL, new Response(blob, { headers: { 'content-type': 'application/wasm', [SAVED_AT]: String(Date.now()) } }));
    }
  } catch {
    /* no room, or private mode: it just downloads again next visit */
  }
  return blob;
}

/**
 * The engine, started on demand.
 * onState({ phase, got, total, fromDevice, error }) reports progress:
 * phase is 'idle' | 'download' | 'start' | 'ready' | 'failed'.
 */
export function createEngine({ onState = () => {} } = {}) {
  let worker = null;
  let phase = 'idle';
  let starting = null;
  let listener = null;
  let queue = Promise.resolve();

  const set = (s) => {
    phase = s.phase;
    onState(s);
  };

  // A worker that crashed or hung is thrown away, so the next tap starts a fresh one.
  function reset(error) {
    if (worker) worker.terminate();
    worker = null;
    starting = null;
    listener = null;
    set({ phase: 'failed', error });
  }

  function send(cmd) {
    worker.postMessage(cmd);
  }

  function waitFor(word, ms = 20000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        listener = null;
        reject(new Error(`No ${word}`));
      }, ms);
      listener = (line) => {
        if (line.startsWith(word)) {
          clearTimeout(timer);
          listener = null;
          resolve(line);
        } else if (line === 'error') {
          clearTimeout(timer);
          listener = null;
          reject(new Error('The engine stopped'));
        }
      };
    });
  }

  async function start() {
    try {
      const saved = await fromDevice();
      let blob;
      if (saved) blob = saved.blob;
      else {
        set({ phase: 'download', got: 0, total: WASM_BYTES });
        blob = await download((got, total) => set({ phase: 'download', got, total }));
      }
      set({ phase: 'start', fromDevice: Boolean(saved) });
      const url = URL.createObjectURL(blob);
      // The engine script reads where its .wasm file is from the part after #.
      worker = new Worker(`${BASE}.js#${encodeURIComponent(url)}`);
      worker.addEventListener('message', (e) => {
        const line = typeof e.data === 'string' ? e.data : '';
        if (listener) listener(line);
      });
      worker.addEventListener('error', () => {
        if (listener) listener('error');
        if (phase === 'ready') reset('The engine stopped');
      });
      const ok = waitFor('uciok');
      send('uci');
      await ok;
      const ready = waitFor('readyok');
      send('isready');
      await ready;
      URL.revokeObjectURL(url);
      set({ phase: 'ready', fromDevice: Boolean(saved) });
    } catch (err) {
      reset(String(err && err.message ? err.message : err));
      throw err;
    }
  }

  function load() {
    if (!starting) starting = start();
    return starting;
  }

  /**
   * Look at one position, given as a start position and the moves played
   * from it (so the engine knows about repetitions): its best move and its
   * score for the side to move.
   */
  function look({ fen, moves = [] }, { depth = 16, ms = 1800 } = {}) {
    const job = queue.then(async () => {
      await load();
      let best = null;
      const done = new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reset('The engine took too long');
          reject(new Error('The engine took too long'));
        }, ms + 8000);
        listener = (line) => {
          if (line.startsWith('info')) {
            const info = parseInfo(line);
            if (info) best = info;
          } else if (line.startsWith('bestmove')) {
            clearTimeout(timer);
            listener = null;
            resolve(line.split(/\s+/)[1]);
          } else if (line === 'error') {
            clearTimeout(timer);
            listener = null;
            reject(new Error('The engine stopped')); // the worker's error handler resets it
          }
        };
      });
      send(`position fen ${fen}${moves.length ? ` moves ${moves.join(' ')}` : ''}`);
      send(`go depth ${depth} movetime ${ms}`);
      const move = await done;
      return { move: move && move !== '(none)' ? move : null, score: best ? best.score : { cp: 0 }, depth: best ? best.depth : 0 };
    });
    queue = job.catch(() => {});
    return job;
  }

  return {
    load,
    look,
    get phase() {
      return phase;
    },
  };
}

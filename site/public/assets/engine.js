// Stockfish in the learner's own browser. Stockfish 19 Lite (1.8 MB) is the
// default; the engine picker can swap in another ready engine from
// engine-catalog.js, such as the full Stockfish 19 (99 MB, shipped in parts).
// The engine file downloads once, in the background, while the board already
// works; it's kept in the browser's file store (Cache Storage) for 30 days,
// so later visits start it straight from the device. The engine never speaks
// on its own: the page asks it only when the learner taps "Check my move".
//
// Stockfish is free software under the GNU GPL v3; see /assets/engine/COPYING.txt.

import { DEFAULT_ENGINE, engineById, engineFiles } from './engine-catalog.js';
import { checkJoined, checkPart, createJoiner } from './engine-parts.js';

const LITE = engineById(DEFAULT_ENGINE);
export const WASM_URL = engineFiles(LITE).wasm.path;
export const WASM_BYTES = engineFiles(LITE).wasm.bytes;
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

async function fromDevice(url) {
  if (!('caches' in window)) return null;
  try {
    const store = await caches.open(STORE);
    const hit = await store.match(url);
    if (!hit) return null;
    const at = Number(hit.headers.get(SAVED_AT)) || 0;
    if (Date.now() - at > KEEP_MS) {
      await store.delete(url);
      return null;
    }
    // WebAssembly only compiles a blob typed application/wasm, whatever the stored copy says.
    return { blob: new Blob([await hit.arrayBuffer()], { type: 'application/wasm' }), at };
  } catch {
    return null;
  }
}

async function openStore() {
  try {
    return typeof window !== 'undefined' && 'caches' in window ? await caches.open(STORE) : null;
  } catch {
    return null;
  }
}

const fresh = (hit) => Boolean(hit) && Date.now() - (Number(hit.headers.get(SAVED_AT)) || 0) <= KEEP_MS;

/** The files engine.js downloads and keeps for an engine: its .wasm (or model) and its separate net, when it has them. */
const keptFiles = (spec) => {
  const { wasm, net } = engineFiles(spec);
  return [wasm, net].filter(Boolean);
};

/** Whether this engine (every part of it, for a split one) is already kept on this device, and young enough to use. */
export async function isSaved(spec) {
  const store = await openStore();
  if (!store) return false;
  try {
    const paths = keptFiles(spec).flatMap((f) => (f.parts ? f.parts.map((p) => p.path) : [f.path]));
    if (!paths.length) return false; // a script-only engine is never kept here; the browser's own cache has it
    for (const path of paths) if (!fresh(await store.match(path))) return false;
    return true;
  } catch {
    return false;
  }
}

async function keep(url, body, store, type = 'application/wasm') {
  try {
    store = store || (await openStore());
    if (store) await store.put(url, new Response(body, { headers: { 'content-type': type, [SAVED_AT]: String(Date.now()) } }));
  } catch {
    /* no room, or private mode: it just downloads again next visit */
  }
}

// Read a response body chunk by chunk, so the bar moves while it arrives.
async function readBody(res, onChunk) {
  if (res.body && res.body.getReader) {
    const reader = res.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      onChunk(value);
    }
  } else {
    onChunk(new Uint8Array(await res.arrayBuffer()));
  }
}

// One file, as it is on the server.
async function downloadWhole(wasm, signal, onProgress) {
  const res = await fetch(wasm.path, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  // Cloudflare may compress the file on the way, and then there's no length to go by.
  const total = Number(res.headers.get('content-length')) || wasm.bytes;
  const parts = [];
  let got = 0;
  await readBody(res, (chunk) => {
    parts.push(chunk);
    got += chunk.length;
    onProgress(Math.min(got, total), total);
  });
  const blob = new Blob(parts, { type: 'application/wasm' });
  onProgress(blob.size, blob.size);
  return blob;
}

// One part kept on this device, if it is there, young enough and intact.
async function partFromDevice(store, part) {
  if (!store) return null;
  try {
    const hit = await store.match(part.path);
    if (!hit) return null;
    if (!fresh(hit)) {
      await store.delete(part.path);
      return null;
    }
    const bytes = new Uint8Array(await hit.arrayBuffer());
    await checkPart(bytes, part);
    return bytes;
  } catch {
    try {
      await store.delete(part.path);
    } catch {
      /* gone already */
    }
    return null;
  }
}

// A file too big to host in one piece. Its parts come in the manifest's
// order, each from this device when it is kept there, otherwise downloaded,
// checked against its own SHA-256 and kept on its own, so a download that
// breaks picks up at the part that failed. Then the joined file's SHA-256 is
// checked before it may run.
async function loadParts(wasm, signal, onProgress, onCheck) {
  const store = await openStore();
  const joiner = createJoiner(wasm.bytes);
  let fetched = false;
  for (const part of wasm.parts) {
    if (signal && signal.aborted) throw cancelError();
    let bytes = await partFromDevice(store, part);
    if (!bytes) {
      fetched = true;
      const base = joiner.length;
      onProgress(base, wasm.bytes);
      const res = await fetch(part.path, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const one = createJoiner(part.bytes);
      await readBody(res, (chunk) => onProgress(base + one.write(chunk), wasm.bytes));
      bytes = one.done();
      await checkPart(bytes, part);
      await keep(part.path, bytes, store, 'application/octet-stream');
    }
    joiner.write(bytes);
    if (fetched) onProgress(joiner.length, wasm.bytes);
  }
  const bytes = joiner.done();
  onCheck(fetched);
  try {
    await checkJoined(bytes, wasm);
  } catch (err) {
    // Every part matched but the whole didn't: start clean next time.
    if (store) await Promise.all(wasm.parts.map((p) => store.delete(p.path).catch(() => {})));
    throw err;
  }
  return { blob: new Blob([bytes], { type: 'application/wasm' }), fromDevice: !fetched };
}

// A file the catalog gives a SHA-256 for (the neural models) must match it before it may run.
async function intact(blob, file) {
  if (!file.sha256) return true;
  try {
    return await checkJoined(new Uint8Array(await blob.arrayBuffer()), file);
  } catch {
    return false;
  }
}

async function loadWhole(wasm, signal, onProgress) {
  const saved = await fromDevice(wasm.path);
  if (saved && (await intact(saved.blob, wasm))) return { blob: saved.blob, fromDevice: true };
  onProgress(0, wasm.bytes);
  const blob = await downloadWhole(wasm, signal, onProgress);
  if (!(await intact(blob, wasm))) throw new Error('The engine download is damaged (its SHA-256 does not match)');
  await keep(wasm.path, blob);
  return { blob, fromDevice: false };
}

/** True for the error a cancelled download ends with. */
export const isCancel = (err) => Boolean(err) && (err.name === 'AbortError' || err.cancelled === true);

function cancelError() {
  const err = new Error('Download stopped');
  err.cancelled = true;
  return err;
}

/**
 * The engine, started on demand. `spec` is a ready entry from engine-catalog.js
 * (Stockfish 19 Lite when left out).
 * onState({ phase, got, total, fromDevice, checking, error, cancelled }) reports progress:
 * phase is 'idle' | 'download' | 'start' | 'ready' | 'failed'.
 */
export function createEngine({ spec = LITE, onState = () => {} } = {}) {
  const { worker: script, wasm, net } = engineFiles(spec);
  const total = keptFiles(spec).reduce((n, f) => n + f.bytes, 0);
  // A big engine takes longer to compile before it can answer "uci".
  const startMs = 20000 + Math.round(total / 1e6) * 400;
  let worker = null;
  let phase = 'idle';
  let starting = null;
  let listener = null;
  let queue = Promise.resolve();
  let aborter = null;
  let quit = false;

  const set = (s) => {
    phase = s.phase;
    if (!quit) onState({ ...s, spec });
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

  // One kept file (the .wasm, a model or a net), from this device or downloaded; `base` bytes came before it.
  function loadFile(file, base, signal) {
    const progress = (got) => set({ phase: 'download', got: base + got, total });
    return file.parts
      ? loadParts(file, signal, progress, (fetched) => fetched && set({ phase: 'start', checking: true }))
      : loadWhole(file, signal, progress);
  }

  async function start() {
    let url = null;
    let netUrl = null;
    aborter = typeof AbortController === 'function' ? new AbortController() : null;
    const signal = aborter ? aborter.signal : undefined;
    try {
      const saved = wasm ? await loadFile(wasm, 0, signal) : { blob: null, fromDevice: false };
      const savedNet = net ? await loadFile(net, wasm ? wasm.bytes : 0, signal) : null;
      if (quit || (signal && signal.aborted)) throw cancelError();
      aborter = null;
      const fromDevice = saved.fromDevice && (!savedNet || savedNet.fromDevice);
      set({ phase: 'start', fromDevice });
      // The engine script reads where its .wasm file (or model) is from the part after #.
      // Stockfish 11 reads it as it is; the newer scripts decode it. A script-only engine needs nothing.
      let hash = '';
      if (saved.blob) {
        url = URL.createObjectURL(saved.blob);
        hash = `#${spec.hash === 'raw' ? url : encodeURIComponent(url)}`;
      }
      worker = new Worker(`${script.path}${hash}`, spec.module ? { type: 'module' } : undefined);
      worker.addEventListener('message', (e) => {
        const line = typeof e.data === 'string' ? e.data : '';
        if (listener) listener(line);
      });
      worker.addEventListener('error', () => {
        if (listener) listener('error');
        if (phase === 'ready') reset('The engine stopped');
      });
      const ok = waitFor('uciok', startMs);
      send('uci');
      await ok;
      if (savedNet) {
        // An engine with its net in a separate file (Stockfish 16) reads it from a blob, through the usual
        // option. Stockfish 16's browser build starts on its classical eval and loads the net only once
        // Use NNUE is on, so that comes second; it says "Load eval file success: 1" (or 0 for a bad file).
        netUrl = URL.createObjectURL(savedNet.blob);
        const loaded = waitFor('Load eval file success', startMs);
        send(`setoption name EvalFile value ${netUrl}`);
        send('setoption name Use NNUE value true');
        if (!/:\s*1\s*$/.test(await loaded)) throw new Error('The engine couldn’t read its net');
      }
      const ready = waitFor('readyok', startMs);
      send('isready');
      await ready;
      for (const u of [url, netUrl]) if (u) URL.revokeObjectURL(u);
      url = null;
      netUrl = null;
      set({ phase: 'ready', fromDevice });
    } catch (err) {
      aborter = null;
      for (const u of [url, netUrl]) if (u) URL.revokeObjectURL(u); // don't keep a 99 MB blob alive after a failed start
      if (isCancel(err) || quit) {
        if (worker) worker.terminate();
        worker = null;
        starting = null;
        listener = null;
        set({ phase: 'idle', cancelled: true });
        throw cancelError();
      }
      reset(String(err && err.message ? err.message : err));
      throw err;
    }
  }

  function load() {
    if (!starting) starting = start();
    return starting;
  }

  /** Stop a download that is under way. load() then rejects with a cancel error (see isCancel). */
  function cancel() {
    if (aborter) aborter.abort();
  }

  /** Throw this engine away: stop any download, end the worker, report nothing more. */
  function stop() {
    cancel();
    quit = true;
    if (listener) listener('error'); // a look under way ends now, not at its timeout
    if (worker) worker.terminate();
    worker = null;
    listener = null;
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
        }, ms + (spec.module ? 30000 : 8000)); // neural models score every move on one thread: give slow phones time
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
    spec,
    load,
    look,
    cancel,
    stop,
    get phase() {
      return phase;
    },
  };
}

// DeepMind's searchless chess model behind the same few UCI words the page
// speaks to Stockfish (uci, isready, position, go), so engine.js drives it
// like any other engine. It runs once per position, with no search: one
// batch of every legal move through the network, then the move with the
// highest win probability.
//
// The model's file comes as a blob URL after # (engine.js downloads it in
// parts and checks its SHA-256 first). onnxruntime-web (MIT) runs it on the
// processor, single-threaded, from /assets/engine/ort/.
//
// Model: "Grandmaster-Level Chess Without Search", (c) 2024 DeepMind
// Technologies Limited, CC BY 4.0; ONNX conversion by cstr. See searchless.js.

import * as ort from './ort/ort.wasm.bundle.min.mjs';
import { Chess } from '../vendor/chess.js';
import { ROW_LENGTH, cleanFen, encodeRows, pickMove, winToCp } from '../searchless.js';

const modelUrl = decodeURIComponent(self.location.hash.slice(1));

ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;
// The bundle carries its own glue script; only the .wasm is fetched, from here.
ort.env.wasm.wasmPaths = { wasm: new URL('./ort/ort-wasm-simd-threaded.wasm', import.meta.url).href };

const say = (line) => postMessage(line);
let session = null;
let chess = new Chess();
let queue = Promise.resolve();

const ready = (async () => {
  const res = await fetch(modelUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  session = await ort.InferenceSession.create(bytes, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
})();
// A model that can't load stops the worker, so the page falls back to Lite.
ready.catch((err) => {
  setTimeout(() => {
    throw err;
  }, 0);
});

function setPosition(cmd) {
  const m = /^position\s+(?:fen\s+(.+?)|startpos)(?:\s+moves\s+(.+))?$/.exec(cmd);
  if (!m) return;
  chess = m[1] ? new Chess(m[1]) : new Chess();
  for (const uci of m[2] ? m[2].trim().split(/\s+/) : []) {
    chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
  }
}

async function go() {
  const legal = chess.moves({ verbose: true });
  if (!legal.length) {
    say(`info depth 0 score ${chess.isCheckmate() ? 'mate 0' : 'cp 0'}`);
    say('bestmove (none)');
    return;
  }
  const fen = cleanFen(chess.fen(), legal);
  const moves = legal.map((m) => m.from + m.to + (m.promotion || ''));
  // A move that lets the game be drawn by repetition is worth 0.5, as in the original engine.
  const draws = legal.map((m) => {
    chess.move(m);
    const draw = chess.isThreefoldRepetition();
    chess.undo();
    return draw;
  });
  const tokens = new ort.Tensor('int64', encodeRows(fen, moves), [moves.length, ROW_LENGTH]);
  const out = await session.run({ [session.inputNames[0]]: tokens });
  const best = pickMove(moves, out[session.outputNames[0]].data, draws);
  say(`info depth 1 seldepth 1 multipv 1 score cp ${winToCp(best.win)} nodes ${moves.length} pv ${best.move}`);
  say(`bestmove ${best.move}`);
}

onmessage = (e) => {
  const cmd = String(e.data || '').trim();
  queue = queue.then(async () => {
    if (cmd === 'uci') {
      await ready;
      say('id name DeepMind searchless chess');
      say('id author Google DeepMind (model, CC BY 4.0); ONNX by cstr');
      say('uciok');
    } else if (cmd === 'isready') {
      await ready;
      say('readyok');
    } else if (cmd.startsWith('position')) {
      setPosition(cmd);
    } else if (cmd.startsWith('go')) {
      await ready;
      await go();
    }
    // ucinewgame, setoption, stop and quit need nothing: each look is one pass.
  }).catch((err) => {
    // Shown to the page as the worker's error event, which ends this engine.
    setTimeout(() => {
      throw err;
    }, 0);
  });
};

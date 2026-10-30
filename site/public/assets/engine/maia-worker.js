// Maia-1 behind the same few UCI words the page speaks to Stockfish (uci,
// isready, position, go), so engine.js drives it like any other engine. Maia
// doesn't search: it plays the move its network thinks a human of its rating
// would most likely play, and its score is its own guess at the result.
//
// The network comes as a blob URL after # (engine.js downloads it and checks
// its SHA-256 first). onnxruntime-web (MIT) runs it on the processor,
// single-threaded, from /assets/engine/ort/.
//
// Maia (c) CSSLab, University of Toronto, GPL-3.0; https://github.com/CSSLab/maia-chess.
// The ONNX files are shermansiu's conversions (huggingface.co/shermansiu/maia-NNNN) of the published maia-NNNN.pb.gz. See lc0.js.

import * as ort from './ort/ort.wasm.bundle.min.mjs';
import { Chess } from '../vendor/chess.js';
import { PLANES, bestPolicyMove, encodePlanes, wdlProbabilities } from '../lc0.js';
import { winToCp } from '../searchless.js';

const modelUrl = decodeURIComponent(self.location.hash.slice(1));

ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;
// The bundle carries its own glue script; only the .wasm is fetched, from here.
ort.env.wasm.wasmPaths = { wasm: new URL('./ort/ort-wasm-simd-threaded.wasm', import.meta.url).href };

const say = (line) => postMessage(line);
let session = null;
let chess = new Chess();
let fens = [chess.fen()];
let queue = Promise.resolve();

const ready = (async () => {
  const res = await fetch(modelUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  session = await ort.InferenceSession.create(new Uint8Array(await res.arrayBuffer()), { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
})();
// A network that can't load stops the worker, so the page falls back to Lite.
ready.catch((err) => {
  setTimeout(() => {
    throw err;
  }, 0);
});

function setPosition(cmd) {
  const m = /^position\s+(?:fen\s+(.+?)|startpos)(?:\s+moves\s+(.+))?$/.exec(cmd);
  if (!m) return;
  chess = m[1] ? new Chess(m[1]) : new Chess();
  fens = [chess.fen()];
  for (const uci of m[2] ? m[2].trim().split(/\s+/) : []) {
    chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    fens.push(chess.fen());
  }
}

const output = (out, word) => out[session.outputNames.find((n) => n.includes(word)) || session.outputNames[0]].data;

async function go() {
  const legal = chess.moves({ verbose: true });
  if (!legal.length) {
    say(`info depth 0 score ${chess.isCheckmate() ? 'mate 0' : 'cp 0'}`);
    say('bestmove (none)');
    return;
  }
  const black = chess.turn() === 'b';
  const planes = new ort.Tensor('float32', encodePlanes(fens), [1, PLANES, 8, 8]);
  const out = await session.run({ [session.inputNames[0]]: planes });
  const best = bestPolicyMove(
    legal.map((m) => m.from + m.to + (m.promotion || '')),
    output(out, 'policy'),
    black,
  );
  const [w, d] = wdlProbabilities(output(out, 'wdl'));
  say(`info depth 1 seldepth 1 multipv 1 score cp ${winToCp(w + d / 2)} nodes 1 pv ${best.move}`);
  say(`bestmove ${best.move}`);
}

onmessage = (e) => {
  const cmd = String(e.data || '').trim();
  queue = queue
    .then(async () => {
      if (cmd === 'uci') {
        await ready;
        say('id name Maia-1');
        say('id author CSSLab, University of Toronto (GPL-3.0)');
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
    })
    .catch((err) => {
      // Shown to the page as the worker's error event, which ends this engine.
      setTimeout(() => {
        throw err;
      }, 0);
    });
};

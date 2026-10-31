// A Leela (Lc0) network behind the same few UCI words the page speaks to
// Stockfish (uci, isready, position, go), so engine.js drives it like any
// other engine. Unlike Maia it searches: lc0-search.js runs Lc0's PUCT tree
// search with the network for the time the page allows ("go ... movetime N").
//
// The network comes as a blob URL after # (engine.js downloads it and checks
// its SHA-256 first). onnxruntime-web (MIT) runs it on the processor,
// single-threaded, from /assets/engine/ort/.
//
// Lc0 networks (c) the LeelaChessZero authors, GPL-3.0; https://lczero.org.
// The ONNX files are lczerolens's conversions (Hugging Face), weights stored
// here as 16-bit floats and cast back to 32-bit when loaded.

import * as ort from './ort/ort.wasm.bundle.min.mjs';
import { Chess } from '../vendor/chess.js';
import { PLANES, encodePlanes, wdlProbabilities } from '../lc0.js';
import { search } from '../lc0-search.js';
import { winToCp } from '../searchless.js';

const modelUrl = decodeURIComponent(self.location.hash.slice(1));

ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;
ort.env.wasm.wasmPaths = { wasm: new URL('./ort/ort-wasm-simd-threaded.wasm', import.meta.url).href };

const say = (line) => postMessage(line);
let session = null;
let fens = [new Chess().fen()];
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
  const chess = m[1] ? new Chess(m[1]) : new Chess();
  fens = [chess.fen()];
  for (const uci of m[2] ? m[2].trim().split(/\s+/) : []) {
    chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    fens.push(chess.fen());
  }
}

const output = (out, word) => out[session.outputNames.find((n) => n.includes(word)) || session.outputNames[0]].data;

async function evaluate(game) {
  const out = await session.run({ [session.inputNames[0]]: new ort.Tensor('float32', encodePlanes(game), [1, PLANES, 8, 8]) });
  return { policy: output(out, 'policy'), wdl: wdlProbabilities(output(out, 'wdl')) };
}

async function go(cmd) {
  const ms = Number((/movetime\s+(\d+)/.exec(cmd) || [])[1]) || 1500;
  const nodes = Number((/nodes\s+(\d+)/.exec(cmd) || [])[1]) || Infinity;
  const until = performance.now() + ms;
  const r = await search(fens, evaluate, { stop: () => performance.now() >= until, maxNodes: nodes });
  if (!r.move) {
    say(`info depth 0 score ${r.end === 'mate' ? 'mate 0' : 'cp 0'}`);
    say('bestmove (none)');
    return;
  }
  say(`info depth ${Math.max(1, r.depth)} seldepth ${Math.max(1, r.depth)} multipv 1 score ${r.mate ? `mate ${r.mate}` : `cp ${winToCp(r.score)}`} nodes ${r.nodes} pv ${r.line.join(' ')}`);
  say(`bestmove ${r.move}`);
}

onmessage = (e) => {
  const cmd = String(e.data || '').trim();
  queue = queue
    .then(async () => {
      if (cmd === 'uci') {
        await ready;
        say('id name Lc0 (Leela) in the browser');
        say('id author The LeelaChessZero authors (GPL-3.0)');
        say('uciok');
      } else if (cmd === 'isready') {
        await ready;
        say('readyok');
      } else if (cmd.startsWith('position')) {
        setPosition(cmd);
      } else if (cmd.startsWith('go')) {
        await ready;
        await go(cmd);
      }
      // ucinewgame, setoption, stop and quit need nothing here.
    })
    .catch((err) => {
      setTimeout(() => {
        throw err;
      }, 0);
    });
};

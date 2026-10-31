// Maia-3 behind the same few UCI words the page speaks to Stockfish (uci,
// isready, setoption, position, go), so engine.js drives it like any other
// engine. Maia-3 doesn't search: it plays the move its network thinks a human
// of the chosen rating would most likely play ("setoption name Elo value
// 1500"), and its score is its own guess at the result.
//
// The network comes as a blob URL after # (engine.js downloads it and checks
// its SHA-256 first). onnxruntime-web (MIT) runs it on the processor,
// single-threaded, from /assets/engine/ort/.
//
// Maia-3 (c) CSSLab, University of Toronto, AGPL-3.0; https://github.com/CSSLab/maia3.
// This worker is AGPL-3.0 too (MAIA3-LICENSE.txt); how the models were made: site/tools/maia3-export/.
// The maia3-*.onnx files are the published checkpoints, exported to ONNX here
// with their weights stored as 16-bit floats (cast back to 32-bit when loaded).

import * as ort from './ort/ort.wasm.bundle.min.mjs';
import { Chess } from '../vendor/chess.js';
import { TOKEN, bestPolicyMove, encodeBoard, winChance } from '../maia3.js';
import { winToCp } from '../searchless.js';

const modelUrl = decodeURIComponent(self.location.hash.slice(1));

ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;
ort.env.wasm.wasmPaths = { wasm: new URL('./ort/ort-wasm-simd-threaded.wasm', import.meta.url).href };

const say = (line) => postMessage(line);
let session = null;
let chess = new Chess();
let elo = 1500;
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
  for (const uci of m[2] ? m[2].trim().split(/\s+/) : []) chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
}

async function go() {
  const legal = chess.moves({ verbose: true }).map((m) => m.from + m.to + (m.promotion || ''));
  if (!legal.length) {
    say(`info depth 0 score ${chess.isCheckmate() ? 'mate 0' : 'cp 0'}`);
    say('bestmove (none)');
    return;
  }
  const rating = new Float32Array([elo]);
  const out = await session.run({
    board: new ort.Tensor('float32', encodeBoard(chess.fen()), [1, 64, TOKEN]),
    elo_self: new ort.Tensor('float32', rating, [1]),
    elo_oppo: new ort.Tensor('float32', rating, [1]),
  });
  const best = bestPolicyMove(legal, out.policy.data, chess.turn() === 'b');
  say(`info depth 1 seldepth 1 multipv 1 score cp ${winToCp(winChance(out.value.data))} nodes 1 pv ${best}`);
  say(`bestmove ${best}`);
}

onmessage = (e) => {
  const cmd = String(e.data || '').trim();
  queue = queue
    .then(async () => {
      if (cmd === 'uci') {
        await ready;
        say('id name Maia-3');
        say('id author CSSLab, University of Toronto (AGPL-3.0)');
        say('option name Elo type spin default 1500 min 0 max 5000');
        say('uciok');
      } else if (cmd === 'isready') {
        await ready;
        say('readyok');
      } else if (cmd.startsWith('setoption')) {
        const m = /^setoption name Elo value (\d+)$/i.exec(cmd);
        if (m) elo = Math.min(5000, Number(m[1]));
      } else if (cmd.startsWith('position')) {
        setPosition(cmd);
      } else if (cmd.startsWith('go')) {
        await ready;
        await go();
      }
      // ucinewgame, stop and quit need nothing: each look is one pass.
    })
    .catch((err) => {
      setTimeout(() => {
        throw err;
      }, 0);
    });
};

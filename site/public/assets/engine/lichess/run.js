// Runs one of Lichess's browser Stockfish builds (@lichess-org/stockfish-web
// 0.5.0, files unchanged) behind the same UCI lines the page speaks to every
// engine (see engine.js). The build itself starts its extra threads, so the
// page must be cross-origin isolated (the catalog marks these `threads`).
//
// The net comes as a blob URL after # (engine.js downloads it in parts and
// checks its SHA-256 first); Fairy-Stockfish needs none for plain chess.
// Lines sent before the engine is up wait in a queue, so "uci" never gets lost.
//
// Builds by the Lichess team (github.com/lichess-org/stockfish-web),
// package licence AGPL-3.0-or-later, with Stockfish and Fairy-Stockfish under
// the GNU GPL v3; see LICENSE.txt beside this file.

export function run(factory) {
  const netUrl = decodeURIComponent(self.location.hash.slice(1));
  const waiting = [];
  let sf = null;

  onmessage = (e) => {
    const cmd = String(e.data || '').trim();
    if (!cmd) return;
    if (sf) sf.uci(cmd);
    else waiting.push(cmd);
  };

  const fail = (err) =>
    // Shown to the page as the worker's error event, which ends this engine.
    setTimeout(() => {
      throw err;
    }, 0);

  (async () => {
    const engine = await factory({
      listen: (line) => postMessage(line),
      onError: (line) => console.warn(line),
    });
    if (netUrl) {
      const res = await fetch(netUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      engine.setNnueBuffer(new Uint8Array(await res.arrayBuffer()), 0);
    }
    sf = engine;
    for (const cmd of waiting.splice(0)) sf.uci(cmd);
  })().catch(fail);
}

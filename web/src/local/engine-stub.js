// Stands in for the browser engine (design.md seam 5) until the Web Worker engine is wired in.
// It answers like the server does when Stockfish is not installed: status says unavailable and
// every search fails with 503, so screens show their "engine unavailable" states.
export const ENGINE_UNAVAILABLE = 'The chess engine is not available in this browser yet.';

export function createUnavailableEngine(reason = ENGINE_UNAVAILABLE) {
  const refuse = async () => { throw Object.assign(new Error(reason), {status: 503}); };
  return {
    status: async () => ({available: false, name: 'Stockfish', reason}),
    analyze: refuse,
    bestMove: refuse,
    stop() {},
  };
}

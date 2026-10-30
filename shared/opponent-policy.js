import {engineControls} from './strength-ladder.js';

// The Stockfish bot policy, shared by the server and the browser app so a bot rating plays the
// same way in both. Below 1100 a share of Stockfish's moves (engineControls().sampledShare) is
// replaced by a legal move sampled with style weights. randomInt(n) returns an integer in [0, n):
// node:crypto's randomInt on the server, crypto.getRandomValues in the browser.
export function stockfishPolicy(result, board, rating, skill, style, randomInt) {
  const probability = engineControls(rating).sampledShare;
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

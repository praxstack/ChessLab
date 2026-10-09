// Grades a played move from the engine's best score before it and the score after it.
// Scores use White's perspective; a mate score is positive when White mates.
// Both scores come from timed searches, so the text reports what the search found, never a forced outcome.
const side = turn => turn === 'w' ? 'White' : 'Black';

export function gradeMove({beforeScore, afterScore, turn, played, best, checkmate = false}) {
  const sign = turn === 'w' ? 1 : -1, opponent = turn === 'w' ? 'b' : 'w';
  const lossCp = beforeScore?.type === 'cp' && afterScore?.type === 'cp' ? Math.max(0, Math.round((beforeScore.value - afterScore.value) * sign)) : null;
  // Seen from the player who moved: above zero they mate, below zero they get mated.
  const mateFor = score => score?.type === 'mate' ? score.value * sign : null;
  const before = mateFor(beforeScore), after = mateFor(afterScore);
  // The explanation already says who is checkmated, so this only notes why no loss is given.
  if (checkmate) return {classification:'Checkmate', lossCp, lossText:'The game is over, so no loss is estimated.'};
  const lostMate = before > 0 && afterScore != null && !(after > 0), allowedMate = after < 0 && !(before < 0);
  let classification = lossCp != null ? (lossCp >= 300 ? 'Blunder' : lossCp >= 150 ? 'Mistake' : lossCp >= 50 ? 'Inaccuracy' : 'Good')
    : lostMate || allowedMate ? 'Blunder' : 'Good';
  // The engine's own move is Best even when its two searches disagree about a mate; the text below blames nothing.
  if (played === best) classification = 'Best';
  const lossText = lossCp != null ? `Estimated loss: ${lossCp} centipawns for ${side(turn)}.`
    : !beforeScore || !afterScore ? 'The engine gave no score to compare, so no loss is estimated.'
    : before > 0 && !(after > 0) ? `Before this move the search found mate in ${before} for ${side(turn)}; after it, ${after < 0 ? `mate in ${-after} for ${side(opponent)}` : 'none'}.`
    : after != null ? `After this move the search finds mate in ${Math.abs(after)} for ${side(after > 0 ? turn : opponent)}.`
    : `Before this move the search found mate in ${-before} for ${side(opponent)}; after it, none.`;
  return {classification, lossCp, lossText};
}

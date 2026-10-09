// Grades a played move from the engine's best score before it and the score after it.
// Scores use White's perspective; a mate score is positive when White mates.
const side = turn => turn === 'w' ? 'White' : 'Black';

export function gradeMove({beforeScore, afterScore, turn, played, best, checkmate = false}) {
  const sign = turn === 'w' ? 1 : -1, opponent = turn === 'w' ? 'b' : 'w';
  const lossCp = beforeScore?.type === 'cp' && afterScore?.type === 'cp' ? Math.max(0, Math.round((beforeScore.value - afterScore.value) * sign)) : null;
  // Seen from the player who moved: above zero they mate, below zero they get mated.
  const mateFor = score => score?.type === 'mate' ? score.value * sign : null;
  const before = mateFor(beforeScore), after = mateFor(afterScore);
  // The explanation already says who is checkmated, so this only notes why no loss is given.
  if (checkmate) return {classification:'Checkmate', lossCp, lossText:'The game is over, so no loss is estimated.'};
  let classification, lossText;
  if (lossCp != null) {
    classification = lossCp >= 300 ? 'Blunder' : lossCp >= 150 ? 'Mistake' : lossCp >= 50 ? 'Inaccuracy' : 'Good';
    lossText = `Estimated loss: ${lossCp} centipawns for ${side(turn)}.`;
  } else if (before > 0 && afterScore && !(after > 0)) {
    // A forced mate was on the board and the move gave it up.
    classification = 'Blunder';
    lossText = `${side(turn)} had a forced mate in ${before}, and this move gives it up.`;
  } else if (after < 0 && !(before < 0)) {
    classification = 'Blunder';
    lossText = `This move allows a forced mate in ${-after} for ${side(opponent)}.`;
  } else {
    // The mate was kept or found, the mate was coming either way, or the engine gave no score to compare.
    classification = 'Good';
    lossText = after > 0 ? `${side(turn)} ${before > 0 ? 'still has' : 'now has'} a forced mate in ${after}.`
      : after < 0 ? `${side(opponent)} still has a forced mate in ${-after}.`
      : beforeScore && afterScore ? 'Mate scores have no centipawn-loss estimate.'
      : 'The engine gave no score to compare, so no loss is estimated.';
  }
  if (played === best) classification = 'Best';
  return {classification, lossCp, lossText};
}

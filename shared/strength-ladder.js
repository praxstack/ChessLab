// The opponent strength ladder. Every level is defined by the controls the server applies to the
// selected engine, not by an outside rating table. Below 1100 a share of Stockfish's moves is
// replaced by a sampled legal move (server/opponent-engines.mjs); from 1150 each level adds one
// Stockfish skill step, and the top level keeps full skill with the longest think.
// Ratings are targets on this ladder, not calibrated human ratings.
export const firstMovesRating = 100;
export const strengthLadder = [250, 450, 650, 850, 1050, 1150, 1260, 1370, 1480, 1590, 1700, 1810, 1920, 2030, 2140, 2250, 2360, 2470, 2580, 2690, 2800, 3200];

export function engineControls(rating) {
  return {
    skill: Math.max(0, Math.min(20, Math.round((rating - 600) / 110))),
    movetime: Math.max(80, Math.min(1200, Math.round(rating / 3))),
    sampledShare: Math.max(0, (1100 - rating) / 1000),
  };
}

export function ladderLevel(rating) {
  if (rating === firstMovesRating) return 0;
  const index = strengthLadder.indexOf(rating);
  return index === -1 ? null : index + 1;
}

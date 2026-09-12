import { Chess } from 'chess.js';

export function replay(moves = [], initialFen = null) {
  const chess = initialFen ? new Chess(initialFen) : new Chess();
  for (const uci of moves) chess.move({from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4]});
  return chess;
}
export function uci(move) { return move.from + move.to + (move.promotion || ''); }
export function parseMove(chess, input) {
  const value = input.trim();
  const copy = new Chess(chess.fen());
  const move = /^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(value)
    ? copy.move({from:value.slice(0,2).toLowerCase(), to:value.slice(2,4).toLowerCase(), promotion:value[4]?.toLowerCase()})
    : copy.move(value);
  return uci(move);
}
export function moveRows(moves, initialFen) {
  const chess = initialFen ? new Chess(initialFen) : new Chess();
  return moves.map((value, index) => {
    const number = Number(chess.fen().split(' ')[5]);
    const move = chess.move({from:value.slice(0,2), to:value.slice(2,4), promotion:value[4]});
    return {...move, uci:value, ply:index+1, number};
  });
}
export function emptyStudy() { return {version:1, branches:[], selectedBranchId:null, anchorPly:0}; }
export function addBranch(study, history, ply, parentId = null, id = crypto.randomUUID()) {
  const branch = {id, parentId, anchorPly:ply, moves:history.slice(0,ply), question:''};
  return {...study, anchorPly:parentId ? study.anchorPly : ply, selectedBranchId:id, branches:[...study.branches, branch]};
}
export function scoreText(score) {
  if (!score) return '—';
  return score.type === 'mate' ? `M${score.value}` : `${score.value >= 0 ? '+' : ''}${(score.value/100).toFixed(2)}`;
}
export function branchDepth(branch, branches) {
  let depth = 0, current = branch, seen = new Set();
  while (current?.parentId && !seen.has(current.id)) {
    seen.add(current.id); depth++; current = branches.find(item => item.id === current.parentId);
  }
  return depth;
}

export function rootAnchor(branch, branches) {
  let current = branch;
  const seen = new Set();
  while (current?.parentId && !seen.has(current.id)) {
    seen.add(current.id);
    current = branches.find(item => item.id === current.parentId) || current;
  }
  return current.anchorPly;
}

export function studyLimitError(branches) {
  if (branches.length > 40) return 'A study can contain at most 40 variations. Your existing study is unchanged.';
  if (branches.some(branch => branch.moves.length > 1000)) return 'A variation can contain at most 1,000 moves from its starting position. Your existing study is unchanged.';
  if (branches.reduce((total, branch) => total + branch.moves.length, 0) > 5000) return 'A study can contain at most 5,000 stored moves, including each branch history. Your existing study is unchanged.';
  return null;
}

// Clock polling merges server game state without replacing the current study draft.
export function mergePolledGame(current, incoming) {
  if (!current || current.id !== incoming.id || incoming.revision < current.revision) return current;
  return {...incoming, study:current.study, studyRevision:current.studyRevision};
}
export function clockText(game, color, now = Date.now()) {
  if (!game?.timeControl?.initialSeconds) return '∞';
  const clock=game.clock;
  if (!clock) return '—';
  const startsBlack=game.initialFen?.trim().split(/\s+/)[1]==='b';
  const active=(game.moves.length+(startsBlack?1:0))%2===0?'w':'b';
  const elapsed=!game.result && active===color && clock.activeSince ? Math.max(0,now-clock.activeSince) : 0;
  const seconds=Math.ceil(Math.max(0,(color==='w'?clock.whiteMs:clock.blackMs)-elapsed)/1000);
  return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
}

export function rematchOptions(game, fallback) {
  if (game.legacyStrength || !game.engineId) return {color:game.color, level:game.level};
  return {botId:game.botId??null,engineId:game.engineId,rating:game.rating??fallback.rating,color:game.color,timeControl:game.timeControl??fallback.timeControl,assistance:game.assistance??fallback.assistance};
}

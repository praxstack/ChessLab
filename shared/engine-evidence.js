import {copyChess} from './chess.js';
import {replay, moveObject} from './replay.js';
import {gradeMove} from './move-grade.js';

// Deterministic text and facts around an engine search: material, captures, checks and sample
// lines come from replaying moves with the rules library, never from the engine or a model.
const VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const PIECES = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

export function facts(board) {
  const material = { white: 0, black: 0 };
  for (const row of board.board()) for (const piece of row) if (piece) material[piece.color === 'w' ? 'white' : 'black'] += VALUES[piece.type];
  return { inCheck: board.inCheck(), material, legalMoves: board.moves().length };
}

export function moveEvidence(board, uci) {
  const copy = copyChess(board);
  const move = copy.move(moveObject(uci));
  const details = [];
  if (move.captured) details.push(`captures a ${PIECES[move.captured]}${move.flags.includes('e') ? ' en passant' : ''}`);
  if (move.promotion) details.push(`promotes to a ${PIECES[move.promotion]}`);
  if (move.flags.includes('k') || move.flags.includes('q')) details.push('castles');
  if (copy.isCheckmate()) details.push('delivers checkmate');
  else if (copy.inCheck()) details.push('gives check');
  return { san: move.san, text: `${move.san}${details.length ? ` ${details.join(' and ')}` : ''}.` };
}

export function lineEvidence(board, moves = []) {
  if (!moves.length) return '';
  const history = board.history({ verbose: true });
  const copy = replay(history.map(move => move.from + move.to + (move.promotion || '')), history[0]?.before ?? board.fen(),board.variant);
  const before = facts(copy).material;
  const san = [];
  const captures = [];
  for (const uci of moves.slice(0, 6)) {
    const move = copy.move(moveObject(uci));
    san.push(move.san);
    if (move.captured) {
      const square = move.flags.includes('e') ? move.to[0] + move.from[1] : move.to;
      captures.push(`${move.color === 'w' ? 'White' : 'Black'} ${move.san} captures ${move.color === 'w' ? "Black's" : "White's"} ${PIECES[move.captured]} on ${square}${move.flags.includes('e') ? ' en passant' : ''}`);
    }
    if (copy.isGameOver()) break;
  }
  const after = facts(copy).material;
  const changes = ['white', 'black'].filter(color => after[color] !== before[color]).map(color => {
    const delta = after[color] - before[color];
    return `${color === 'white' ? 'White' : 'Black'} ${delta >= 0 ? '+' : ''}${delta}`;
  }).join(', ');
  const material = changes ? `Material: White ${after.white}, Black ${after.black} (${changes} points).` : 'No material changes in this line.';
  return `Sample line: ${san.join(' → ')}. ${captures.length ? `${captures.join('; ')}. ` : ''}${material}`;
}

export function terminalText(board) {
  if (board.isCheckmate()) return `${board.turn() === 'w' ? 'White' : 'Black'} is checkmated.`;
  if (board.isStalemate()) return 'Draw by stalemate.';
  if (board.isThreefoldRepetition()) return 'Draw by threefold repetition in this move history.';
  if (board.isInsufficientMaterial()) return 'Draw by insufficient material.';
  if (board.isDrawByFiftyMoves()) return 'Draw by the fifty-move rule.';
  return 'The game is over.';
}

export function scoreText(score) {
  if (score.type === 'mate') return `The search reports mate in ${Math.abs(score.value)} for ${score.value > 0 ? 'White' : 'Black'}.`;
  return `Estimate: ${(score.value / 100).toFixed(2)} pawns from White's perspective.`;
}

// The analysis object the app shows for one searched position. result is {name, bestmove, lines, tablebaseHits}.
export function searchSummary(board, result, limits) {
  const positionFacts = facts(board);
  const materialText = `Material: White ${positionFacts.material.white}, Black ${positionFacts.material.black}.`;
  const explanation = board.isGameOver() ? `${terminalText(board)} ${materialText}` : `${board.turn() === 'w' ? 'White' : 'Black'} to move${positionFacts.inCheck ? ', in check' : ''}. ${moveEvidence(board, result.bestmove).text} ${lineEvidence(board, result.lines[0].moves)} ${scoreText(result.lines[0].score)}`;
  return { engine: result.name, tablebaseHits:result.tablebaseHits||0, fen: board.fen(), turn: board.turn(), bestmove: result.bestmove, lines: result.lines, limits, facts: positionFacts, explanation };
}

// Grades a played move from the search before it (result) and the search after it (after).
export function playedSummary(board, afterBoard, playedMove, result, after) {
  const beforeScore = result.lines[0]?.score;
  const afterScore = after.lines[0]?.score ?? (afterBoard.isGameOver() && !afterBoard.isCheckmate() ? { type: 'cp', value: 0 } : null);
  const {classification, lossCp, lossText} = gradeMove({beforeScore, afterScore, turn: board.turn(), played: playedMove, best: result.lines[0]?.move, checkmate: afterBoard.isCheckmate()});
  const evidence = moveEvidence(board, playedMove);
  const continuation = afterBoard.isGameOver() ? terminalText(afterBoard) : lineEvidence(afterBoard, after.lines[0]?.moves);
  const reply = after.lines[0];
  return { move: playedMove, san: evidence.san, classification, lossCp, afterScore, line: reply ? { moves: reply.moves, san: reply.san, score: reply.score, depth: reply.depth } : null, explanation: `${evidence.text} ${continuation} ${lossText}` };
}

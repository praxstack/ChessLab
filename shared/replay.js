import {createChess} from './chess.js';

// Rebuilds a board from a starting FEN and UCI moves. The rules library owns legality; every
// caller that trusts a move history replays it here first. Used by the server and the browser app.
const UCI_MOVE = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

function failure(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

export function moveObject(move) {
  if (typeof move !== 'string' || !UCI_MOVE.test(move)) throw failure('Moves must use UCI notation, for example e2e4 or a7a8q.');
  return { from: move.slice(0, 2), to: move.slice(2, 4), ...(move[4] ? { promotion: move[4] } : {}) };
}

export function replay(moves, initialFen = null, variant) {
  if (!Array.isArray(moves) || moves.length > 1000) throw failure('Provide an array of at most 1000 moves.');
  if (initialFen != null && (typeof initialFen !== 'string' || initialFen.length > 120 || /[\r\n\0]/.test(initialFen))) throw failure('Invalid starting FEN.');
  let board;
  try { board = createChess(initialFen,variant); }
  catch { throw failure('Invalid starting FEN.'); }
  const pieces = board.board().flat().filter(Boolean);
  for (const color of ['w', 'b']) {
    if (pieces.filter(piece => piece.color === color).length > 16 || pieces.filter(piece => piece.color === color && piece.type === 'p').length > 8) throw failure('Starting FEN has too many pieces.');
  }
  const previousKing = pieces.find(piece => piece.type === 'k' && piece.color !== board.turn());
  if (board.isAttacked(previousKing.square, board.turn())) throw failure('Invalid starting FEN: the side that just moved remains in check.');
  for (const [index, move] of moves.entries()) {
    const object = moveObject(move);
    try { board.move(object); }
    catch { throw failure(`Illegal move ${index + 1}: ${move}.`); }
  }
  return board;
}

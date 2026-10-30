import {gameVariant} from '../chess.js';
import {replay} from '../replay.js';
import {searchSummary, playedSummary} from '../engine-evidence.js';
import {buildEvidence, failure} from './evidence.js';

// The wire format for "Explain why" outside the app: board position, engine moves and scores only.
// No free text crosses it. The receiver replays every move with the rules library and rebuilds the
// summary, classification and evidence itself, so a client cannot put words into the prompt.
const UCI = /^[a-h][1-8][a-h][1-8][qrbn]?$/;
const ENGINE_NAME = /^[A-Za-z0-9 .+()-]{1,40}$/;
const MAX_LINES = 3, LINE_MOVES = 8, MAX_GAME_MOVES = 1000;

const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const bad = message => failure(400, message);

function fields(value, allowed, name) {
  if (!plain(value)) throw bad(`${name} must be an object.`);
  for (const key of Object.keys(value)) if (!allowed.includes(key)) throw bad(`${name} has an unknown field: ${key.slice(0, 20)}.`);
  return value;
}
function int(value, min, max, name) {
  if (!Number.isInteger(value) || value < min || value > max) throw bad(`${name} must be a whole number from ${min} to ${max}.`);
  return value;
}
function uciList(value, max, name) {
  if (!Array.isArray(value) || value.length > max || !value.every(move => typeof move === 'string' && UCI.test(move))) throw bad(`${name} must be a list of at most ${max} UCI moves.`);
  return [...value];
}
function score(value, name) {
  fields(value, ['type', 'value'], name);
  if (value.type === 'cp') return {type: 'cp', value: int(value.value, -100000, 100000, `${name}.value`)};
  if (value.type === 'mate') return {type: 'mate', value: int(value.value, -500, 500, `${name}.value`)};
  throw bad(`${name}.type must be cp or mate.`);
}
function line(value, name) {
  fields(value, ['moves', 'score', 'depth'], name);
  const moves = uciList(value.moves, LINE_MOVES, `${name}.moves`);
  if (!moves.length) throw bad(`${name}.moves must not be empty.`);
  return {moves, score: score(value.score, `${name}.score`), depth: value.depth == null ? null : int(value.depth, 0, 250, `${name}.depth`)};
}

// Browser side: the payload for one analysed position. analysis is the object the local router's
// analysis returns (or a saved review step); only moves and scores are copied out of it.
export function toPayload({analysis, moves = [], initialFen = null, variant}) {
  if (!plain(analysis)) throw failure(503, 'No engine evidence is available for this position.');
  const pick = item => ({moves: (item.moves || []).slice(0, LINE_MOVES), score: item.score && {type: item.score.type, value: item.score.value}, depth: item.depth ?? null});
  const name = String(analysis.engine || 'Chess engine').replace(/[^A-Za-z0-9 .+()-]/g, '').slice(0, 40) || 'Chess engine';
  return {
    position: {moves: [...moves], initialFen: initialFen ?? null, variant: variant || 'standard'},
    engine: {name, movetime: analysis.limits?.movetime ?? 1, lines: analysis.limits?.lines ?? 1},
    lines: (Array.isArray(analysis.lines) ? analysis.lines : []).filter(item => item?.moves?.length && item.score).slice(0, MAX_LINES).map(pick),
    ...(analysis.played?.move ? {played: {move: analysis.played.move, line: analysis.played.line?.moves?.length && analysis.played.line.score ? pick(analysis.played.line) : null}} : {}),
  };
}

// Receiving side: checks the payload field by field and rebuilds the analysis from it.
export function analysisFromPayload(payload) {
  fields(payload, ['position', 'engine', 'lines', 'played'], 'evidence');
  const position = fields(payload.position, ['moves', 'initialFen', 'variant'], 'evidence.position');
  const moves = uciList(position.moves, MAX_GAME_MOVES, 'evidence.position.moves');
  const initialFen = position.initialFen ?? null;
  if (initialFen !== null && typeof initialFen !== 'string') throw bad('evidence.position.initialFen must be a FEN or null.');
  let variant;
  try { variant = gameVariant(position.variant ?? 'standard'); } catch (error) { throw bad(error.message); }
  const engine = fields(payload.engine, ['name', 'movetime', 'lines'], 'evidence.engine');
  if (typeof engine.name !== 'string' || !ENGINE_NAME.test(engine.name)) throw bad('evidence.engine.name is not an engine name.');
  const limits = {movetime: int(engine.movetime, 1, 600000, 'evidence.engine.movetime'), lines: int(engine.lines, 1, 5, 'evidence.engine.lines')};
  if (!Array.isArray(payload.lines) || payload.lines.length > MAX_LINES) throw bad(`evidence.lines must be a list of at most ${MAX_LINES} lines.`);
  const lines = payload.lines.map((item, index) => line(item, `evidence.lines[${index}]`));
  const board = replay(moves, initialFen, variant);
  if (!board.isGameOver() && !lines.length) throw bad('evidence.lines must hold at least one engine line.');
  // Every engine move must be legal from this position; replay throws on the first one that is not.
  for (const item of lines) replay([...moves, ...item.moves], initialFen, variant);
  const result = {name: engine.name, bestmove: lines[0]?.moves[0] ?? null, lines, tablebaseHits: 0};
  const analysis = searchSummary(board, result, limits);
  if (payload.played !== undefined) {
    const played = fields(payload.played, ['move', 'line'], 'evidence.played');
    const [move] = uciList([played.move], 1, 'evidence.played.move');
    if (board.isGameOver()) throw bad('The game is over in this position.');
    const afterBoard = replay([...moves, move], initialFen, variant);
    const reply = played.line == null ? null : line(played.line, 'evidence.played.line');
    if (reply) replay([...moves, move, ...reply.moves], initialFen, variant);
    if (!afterBoard.isGameOver() && !reply) throw bad('evidence.played.line is needed after this move.');
    if (!lines.length) throw bad('evidence.lines must hold at least one engine line.');
    analysis.played = playedSummary(board, afterBoard, move, result, {lines: reply && !afterBoard.isGameOver() ? [reply] : []});
  }
  return {analysis, moves, initialFen, variant};
}

// Payload to the evidence bundle Claude sees and the vocabulary its answer may use.
export function bundleFromPayload(payload, asked = false) {
  const {analysis, moves, initialFen, variant} = analysisFromPayload(payload);
  if (asked && !analysis.played) throw bad('A question needs the asked move in evidence.played.');
  return buildEvidence(analysis, {moves, initialFen, variant, asked: Boolean(asked)});
}

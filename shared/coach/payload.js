import {failure, bundleFor} from './evidence.js';

// The wire format between the browser and the coach Worker: the evidence object buildEvidence makes,
// minus its two text fields. The browser builds it with the rules library (no CPU limit there). The
// Worker does no chess work, which keeps it far inside the free plan's 10 ms CPU per request: it
// checks every field against a closed schema (SAN tokens, fixed words, bounded numbers), rebuilds each
// object in a fixed shape, names the engine with a fixed label and writes the summary from the checked
// fields. No client text reaches the prompt, and the answer still has to pass verifyAnswer.
export const ENGINE_LABEL = 'Stockfish';
const MAX_LINES = 3, LINE_MOVES = 8;
const SAN = /^(?:O-O(?:-O)?|[KQRBN][a-h]?[1-8]?x?[a-h][1-8]|[a-h](?:x[a-h])?[1-8](?:=[QRBN])?)[+#]?$/;
const PAWNS = /^[+-]\d{1,4}\.\d{2}$/;
const SIDES = ['White', 'Black'];
const CAPTURES = ['pawn', 'knight', 'bishop', 'rook', 'queen'];
const PROMOTIONS = ['knight', 'bishop', 'rook', 'queen'];
const CLASSES = ['Best', 'Good', 'Inaccuracy', 'Mistake', 'Blunder', 'Checkmate', 'Mate sequence'];
const MOVE_FIELDS = ['san', 'side', 'captures', 'promotesTo', 'castles', 'checkmate', 'check'];
const PLAYED_FIELDS = [...MOVE_FIELDS, 'classification', 'estimatedLossCentipawns', 'scoreAfter', 'engineReplyLine', 'materialAfterReplyLine'];

const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const bad = message => failure(400, message);

function fields(value, allowed, name, required = allowed) {
  if (!plain(value)) throw bad(`${name} must be an object.`);
  for (const key of Object.keys(value)) if (!allowed.includes(key)) throw bad(`${name} has an unknown field: ${key.slice(0, 20)}.`);
  for (const key of required) if (!(key in value)) throw bad(`${name}.${key} is missing.`);
  return value;
}
function int(value, min, max, name, nullable = false) {
  if (nullable && value === null) return null;
  if (!Number.isInteger(value) || value < min || value > max) throw bad(`${name} must be a whole number from ${min} to ${max}.`);
  return value;
}
function oneOf(value, options, name) {
  if (!options.includes(value)) throw bad(`${name} must be one of: ${options.join(', ')}.`);
  return value;
}
const yes = (value, name) => { if (value !== true) throw bad(`${name} can only be true.`); return true; };
const material = (value, name) => { fields(value, ['white', 'black'], name); return {white: int(value.white, 0, 200, `${name}.white`), black: int(value.black, 0, 200, `${name}.black`)}; };

function score(value, name) {
  if (value === null) return null;
  if (value?.type === 'mate') { fields(value, ['type', 'movesToMate', 'for'], name); return {type: 'mate', movesToMate: int(value.movesToMate, 0, 500, `${name}.movesToMate`), for: oneOf(value.for, SIDES, `${name}.for`)}; }
  fields(value, ['type', 'pawns', 'perspective'], name);
  oneOf(value.type, ['estimate'], `${name}.type`); oneOf(value.perspective, ['White'], `${name}.perspective`);
  if (typeof value.pawns !== 'string' || !PAWNS.test(value.pawns)) throw bad(`${name}.pawns must look like +0.30.`);
  return {type: 'estimate', pawns: value.pawns, perspective: 'White'};
}

// One move with its facts, rebuilt in the key order buildEvidence uses.
function move(value, name, allowed = MOVE_FIELDS) {
  fields(value, allowed, name, ['san', 'side']);
  if (typeof value.san !== 'string' || !SAN.test(value.san)) throw bad(`${name}.san must be a move in SAN.`);
  if (value.check !== undefined && value.checkmate !== undefined) throw bad(`${name} cannot be both check and checkmate.`);
  return {
    san: value.san, side: oneOf(value.side, SIDES, `${name}.side`),
    ...(value.captures !== undefined ? {captures: oneOf(value.captures, CAPTURES, `${name}.captures`)} : {}),
    ...(value.promotesTo !== undefined ? {promotesTo: oneOf(value.promotesTo, PROMOTIONS, `${name}.promotesTo`)} : {}),
    ...(value.castles !== undefined ? {castles: yes(value.castles, `${name}.castles`)} : {}),
    ...(value.checkmate !== undefined ? {checkmate: yes(value.checkmate, `${name}.checkmate`)} : {}),
    ...(value.check !== undefined ? {check: yes(value.check, `${name}.check`)} : {}),
  };
}
function moves(value, name) {
  if (!Array.isArray(value) || !value.length || value.length > LINE_MOVES) throw bad(`${name} must hold 1 to ${LINE_MOVES} moves.`);
  return value.map((item, index) => move(item, `${name}[${index}]`));
}

function played(value, name) {
  const base = move(value, name, PLAYED_FIELDS);
  fields(value, PLAYED_FIELDS, name, ['san', 'side', 'classification', 'estimatedLossCentipawns', 'scoreAfter']);
  if ((value.engineReplyLine === undefined) !== (value.materialAfterReplyLine === undefined)) throw bad(`${name} needs both the reply line and its material.`);
  // Same facts and order as buildEvidence's moveEvidence.
  return {
    san: base.san, side: base.side,
    ...(base.captures ? {captures: base.captures} : {}),
    ...(base.checkmate ? {checkmate: true} : base.check ? {check: true} : {}),
    classification: oneOf(value.classification, CLASSES, `${name}.classification`),
    estimatedLossCentipawns: int(value.estimatedLossCentipawns, 0, 100000, `${name}.estimatedLossCentipawns`, true),
    scoreAfter: score(value.scoreAfter, `${name}.scoreAfter`),
    ...(value.engineReplyLine !== undefined ? {engineReplyLine: moves(value.engineReplyLine, `${name}.engineReplyLine`), materialAfterReplyLine: material(value.materialAfterReplyLine, `${name}.materialAfterReplyLine`)} : {}),
  };
}

const scoreText = value => value?.type === 'mate' ? `mate in ${value.movesToMate} for ${value.for}` : value ? `${value.pawns} pawns from White's perspective` : null;

// A plain summary written only from checked fields, standing in for the app's own summary text.
function summary(evidence, playedMove) {
  const {position, candidateLines: [first]} = evidence;
  const parts = [`${position.sideToMove} to move${position.inCheck ? ', in check' : ''}.`];
  if (first) parts.push(`Engine line: ${first.moves.map(item => item.san).join(' ')}${first.score ? ` (${scoreText(first.score)})` : ''}.`);
  if (playedMove) parts.push(`${playedMove.san} is graded ${playedMove.classification}${playedMove.estimatedLossCentipawns !== null ? `, an estimated loss of ${playedMove.estimatedLossCentipawns} centipawns` : ''}.`);
  return parts.join(' ');
}

// Browser side: what goes to the Worker, from the evidence buildEvidence made with the rules library.
export function toWire(evidence) {
  const {engine: {name, ...limits}, verifiedSummary, ...rest} = evidence;
  return {...rest, engine: limits};
}

// Worker side: checks the wire evidence and returns the bundle Claude sees, with its vocabulary.
export function bundleFromWire(value, asked = false) {
  const key = asked ? 'askedMove' : 'playedMove';
  fields(value, ['position', 'engine', 'candidateLines', key], 'evidence', ['position', 'engine', 'candidateLines']);
  const position = fields(value.position, ['sideToMove', 'inCheck', 'legalMoveCount', 'material'], 'evidence.position');
  if (typeof position.inCheck !== 'boolean') throw bad('evidence.position.inCheck must be true or false.');
  const engine = fields(value.engine, ['movetimeMs', 'candidateLines', 'depth'], 'evidence.engine');
  if (!Array.isArray(value.candidateLines) || value.candidateLines.length > MAX_LINES) throw bad(`evidence.candidateLines must hold at most ${MAX_LINES} lines.`);
  const evidence = {
    position: {sideToMove: oneOf(position.sideToMove, SIDES, 'evidence.position.sideToMove'), inCheck: position.inCheck, legalMoveCount: int(position.legalMoveCount, 0, 300, 'evidence.position.legalMoveCount'), material: material(position.material, 'evidence.position.material')},
    engine: {name: ENGINE_LABEL, movetimeMs: int(engine.movetimeMs, 1, 600000, 'evidence.engine.movetimeMs', true), candidateLines: int(engine.candidateLines, 0, 5, 'evidence.engine.candidateLines'), depth: int(engine.depth, 0, 250, 'evidence.engine.depth', true)},
    candidateLines: value.candidateLines.map((line, index) => {
      const name = `evidence.candidateLines[${index}]`;
      fields(line, ['rank', 'score', 'depth', 'moves', 'materialAfter'], name);
      if (line.rank !== index + 1) throw bad(`${name}.rank must be ${index + 1}.`);
      return {rank: index + 1, score: score(line.score, `${name}.score`), depth: int(line.depth, 0, 250, `${name}.depth`, true), moves: moves(line.moves, `${name}.moves`), materialAfter: material(line.materialAfter, `${name}.materialAfter`)};
    }),
  };
  const playedMove = value[key] === undefined ? null : played(value[key], `evidence.${key}`);
  if (asked && !playedMove) throw bad('A question needs the asked move in evidence.askedMove.');
  if (playedMove) evidence[key] = playedMove;
  evidence.verifiedSummary = summary(evidence, playedMove);
  return bundleFor(evidence, {asked: Boolean(asked)});
}

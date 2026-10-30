import {copyChess} from '../chess.js';
import {replay} from '../replay.js';

// Evidence for the coach and the checks on its answer, moved unchanged from server/coach-explain.mjs.
// Every fact comes from the rules library; a model answer is shown only when verifyAnswer passes.
const LINE_PLIES = 8;
const PIECES = {p:'pawn', n:'knight', b:'bishop', r:'rook', q:'queen', k:'king'};
const VALUES = {p:1, n:3, b:3, r:5, q:9, k:0};

export const failure = (status, message) => Object.assign(new Error(message), {status});
const sideName = color => color === 'w' ? 'White' : 'Black';
const uciOf = move => move.from + move.to + (move.promotion || '');

// Check and mate markers are facts about the board, so they must match the evidence; ! and ? are only annotations.
export function normalizeSan(value) {
  return String(value).trim().replace(/^0-0-0/, 'O-O-O').replace(/^0-0/, 'O-O').replace(/[!?]+$/, '').replace(/(?:e\.p\.)$/, '');
}

function material(board) {
  const total = {white:0, black:0};
  for (const row of board.board()) for (const piece of row) if (piece) total[piece.color === 'w' ? 'white' : 'black'] += VALUES[piece.type];
  return total;
}

function scoreEvidence(score) {
  if (!score || !Number.isFinite(score.value)) return null;
  if (score.type === 'mate') return {type:'mate', movesToMate:Math.abs(score.value), for:score.value > 0 ? 'White' : 'Black'};
  if (score.type === 'cp') return {type:'estimate', pawns:`${score.value >= 0 ? '+' : ''}${(score.value / 100).toFixed(2)}`, perspective:'White'};
  return null;
}

// Replays an engine line on a copy of the board so every reported fact comes from the rules library.
function lineEvidence(board, uciMoves = []) {
  const copy = copyChess(board), moves = [];
  for (const uci of uciMoves.slice(0, LINE_PLIES)) {
    let move;
    try { move = copy.move({from:uci.slice(0, 2), to:uci.slice(2, 4), ...(uci[4] ? {promotion:uci[4]} : {})}); }
    catch { throw failure(503, 'The engine line did not replay legally. Try the explanation again.'); }
    const fact = {san:move.san, side:sideName(move.color)};
    if (move.captured) fact.captures = PIECES[move.captured];
    if (move.promotion) fact.promotesTo = PIECES[move.promotion];
    if (move.flags.includes('k') || move.flags.includes('q') || move.castle) fact.castles = true;
    if (copy.isCheckmate()) fact.checkmate = true;
    else if (copy.inCheck()) fact.check = true;
    moves.push(fact);
    if (copy.isGameOver()) break;
  }
  return {moves, materialAfter:material(copy)};
}

function moveEvidence(board, played) {
  const after = copyChess(board);
  let move;
  try { move = after.move({from:played.move.slice(0, 2), to:played.move.slice(2, 4), ...(played.move[4] ? {promotion:played.move[4]} : {})}); }
  catch { throw failure(503, 'The reviewed move does not match this position.'); }
  const reply = played.line?.moves?.length && !after.isGameOver() ? lineEvidence(after, played.line.moves) : null;
  return {
    san:move.san, side:sideName(move.color),
    ...(move.captured ? {captures:PIECES[move.captured]} : {}),
    ...(after.isCheckmate() ? {checkmate:true} : after.inCheck() ? {check:true} : {}),
    classification:played.classification,
    estimatedLossCentipawns:Number.isFinite(played.lossCp) ? played.lossCp : null,
    scoreAfter:scoreEvidence(played.afterScore),
    ...(reply ? {engineReplyLine:reply.moves, materialAfterReplyLine:reply.materialAfter} : {}),
  };
}

// Structured evidence for Claude plus the vocabulary its answer may use.
export function buildEvidence(analysis, {moves = [], initialFen = null, variant, asked = false} = {}) {
  if (!analysis || typeof analysis !== 'object') throw failure(503, 'No engine evidence is available for this position.');
  const board = replay(moves, initialFen, variant);
  if (analysis.fen && analysis.fen !== board.fen()) throw failure(503, 'The engine evidence does not match this position. Reload the review.');
  const lines = Array.isArray(analysis.lines) ? analysis.lines.slice(0, 3) : [];
  const candidateLines = lines.map((line, index) => ({rank:index + 1, score:scoreEvidence(line.score), depth:line.depth ?? null, ...lineEvidence(board, line.moves)}));
  const played = analysis.played?.move ? moveEvidence(board, analysis.played) : null;
  const evidence = {
    position:{sideToMove:sideName(board.turn()), inCheck:board.inCheck(), legalMoveCount:board.moves().length, material:material(board)},
    engine:{name:analysis.engine || 'Chess engine', movetimeMs:analysis.limits?.movetime ?? null, candidateLines:analysis.limits?.lines ?? candidateLines.length, depth:lines[0]?.depth ?? null},
    candidateLines,
    ...(played ? {[asked ? 'askedMove' : 'playedMove']:played} : {}),
    verifiedSummary:analysis.played?.explanation || analysis.explanation || '',
  };
  return bundleFor(evidence, {asked});
}

// The vocabulary an answer may use, worked out from the evidence object alone, with no chess rules:
// its moves, the mates its scores and moves show, its numbers and the piece types its moves capture.
// The coach Worker calls this directly on checked evidence, which keeps its CPU use tiny.
export function bundleFor(evidence, {asked = false} = {}) {
  const {candidateLines} = evidence;
  const played = evidence.askedMove ?? evidence.playedMove ?? null;
  const allowed = new Map();
  const allow = san => allowed.set(normalizeSan(san), san);
  for (const line of candidateLines) line.moves.forEach(move => allow(move.san));
  if (played) { allow(played.san); played.engineReplyLine?.forEach(move => allow(move.san)); }
  // Which side the evidence shows mating, and in how many moves when the engine gave a mate score.
  const mates = {scores:new Set(), sides:new Set()};
  for (const score of [...candidateLines.map(line => line.score), played?.scoreAfter]) {
    if (score?.type !== 'mate' || !Number.isFinite(score.movesToMate)) continue;
    mates.scores.add(`${score.for} ${score.movesToMate}`); mates.sides.add(score.for);
  }
  for (const move of [...candidateLines.flatMap(line => line.moves), ...(played ? [played, ...(played.engineReplyLine ?? [])] : [])]) if (move.checkmate) mates.sides.add(move.side);
  // Every number the evidence states, and every piece type its moves capture.
  const numbers = {signed:new Set(), unsigned:new Set(PROMPT_NUMBERS)};
  (function collect(value) {
    if (typeof value === 'number' && Number.isFinite(value)) { numbers.signed.add(value); numbers.unsigned.add(Math.abs(value)); }
    else if (typeof value === 'string') numerals(value).forEach(numeral => collect(numeral.value));
    else if (value && typeof value === 'object') Object.values(value).forEach(collect);
  })(evidence);
  const captured = new Set([...candidateLines.flatMap(line => line.moves), ...(played ? [played, ...(played.engineReplyLine ?? [])] : [])].map(move => move.captures).filter(Boolean));
  const best = candidateLines[0]?.moves[0]?.san ?? null;
  let deterministic = evidence.verifiedSummary;
  if (asked && played && best) deterministic = `${deterministic} The engine preferred ${best} at these limits${candidateLines[0].score?.pawns ? ` (${candidateLines[0].score.pawns})` : ''}.`.trim();
  return {evidence, allowed, mates, numbers, captured, deterministic, best, subject:played?.san ?? best, explainable:Boolean(best || played)};
}

export const BRACKETED = /\[\[([^[\]\n]{1,16})\]\]/g;
// Numerals outside squares and words: "60", "+0.30", "-1.20". The prompt itself supplies piece values and thresholds.
const NUMERAL = /(?<![\w.])([+\-\u2212]?)(\d+(?:\.\d+)?)(?!\w)/g;
const PROMPT_NUMBERS = [1, 3, 5, 9, 50, 150, 300];
const numerals = text => [...String(text).matchAll(NUMERAL)].map(match => ({signed:Boolean(match[1]), value:(match[1] && match[1] !== '+' ? -1 : 1) * Number(match[2]), text:match[0]}));
// Winning, losing, capturing or trading a piece: "wins a queen", "hangs the f7 pawn", "trades queens", "up a pawn".
const GAIN_OR_LOSS = 'win|wins|won|winning|lose|loses|lost|losing|drop|drops|dropped|dropping|hang|hangs|hung|hanging|capture|captures|captured|capturing|take|takes|took|taken|taking|grab|grabs|grabbed|grabbing|gain|gains|gained|gaining|sacrifice|sacrifices|sacrificed|sacrificing|trade|trades|traded|trading|exchange|exchanges|exchanged|exchanging|give\\s+up|gives\\s+up|gave\\s+up|giving\\s+up|extra|(?:up|down)\\s+(?:a|an|one|two|three)';
const PIECE_CLAIM = new RegExp(`\\b(?:${GAIN_OR_LOSS})\\s+((?:[\\w'-]+\\s+){0,3}?)(queen|rook|bishop|knight|pawn)s?\\b`, 'gi');
const MATERIAL_CLAIM = new RegExp(`\\b(?:${GAIN_OR_LOSS}|ahead|behind|up|down)\\s+(?:[\\w'-]+\\s+){0,2}?material\\b`, 'gi');
// Unambiguous SAN outside brackets. Bare squares such as "e4" read as squares and stay unchecked.
const SAN_LIKE = /(?<![A-Za-z0-9])(?:O-O-O|O-O|0-0-0|0-0|[KQRBN][a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?|[a-h]x[a-h][1-8](?:=[QRBN])?[+#]?|[a-h][18]=[QRBN][+#]?|[a-h][1-8][+#])(?![A-Za-z0-9])/g;

const NUMBER_WORDS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const MATE_WORD = /\b(?:check)?mat(?:e|es|ed|ing)\b/gi;
const MATE_COUNT = new RegExp(`^[\\s-]+in[\\s-]+(\\d+|${NUMBER_WORDS.join('|')})\\b`, 'i');
// "mate in 2 for White", "checkmate delivered by Black", "mate against Black".
const NAMED_AFTER = /^(?:\s+[\w'-]+){0,4}?\s+(for|by|against)\s+(white|black)\b/i;
// Words between a side and a mate word that make that side the one being mated: "Black allows mate".
const MATED_CUE = /\b(?:allow(?:s|ed|ing)?|permit(?:s|ted|ting)?|fac(?:e|es|ed|ing)|suffer(?:s|ed|ing)?|avoid(?:s|ed|ing)?|prevent(?:s|ed|ing)?|stop(?:s|ped|ping)?|block(?:s|ed|ing)?|escap(?:e|es|ed|ing)|defen(?:d|ds|ded|ding|ce|se)|los(?:e|es|ing)\s+to|threatened\s+with|into|against)\b/i;
const sideOf = name => /^w/i.test(name) ? 'White' : 'Black';
const opponent = side => side === 'White' ? 'Black' : 'White';

// The side a mate word credits with mating, or null when the sentence does not say.
function matingSide(sentence, match) {
  const word = match[0], after = sentence.slice(match.index + word.length), before = sentence.slice(0, match.index);
  const named = NAMED_AFTER.exec(after);
  if (named) return named[1].toLowerCase() === 'against' ? opponent(sideOf(named[2])) : sideOf(named[2]);
  const last = [...before.matchAll(/\b(white|black)\b/gi)].at(-1);
  if (!last) return null;
  const gap = before.slice(last.index + last[0].length);
  // A side named several words earlier usually belongs to another clause.
  if ((gap.match(/[a-z]+/gi)?.length ?? 0) > 4) return null;
  const mated = /ed$/i.test(word) ? !/\b(?:has|have|had)\s*$/i.test(gap) : MATED_CUE.test(gap);
  return mated ? opponent(sideOf(last[1])) : sideOf(last[1]);
}

// Every mention of mate must agree with the evidence. The side it credits, or else the only side the
// evidence shows mating, needs mate evidence, and "mate in N" needs that side's engine mate score of N.
// Mate wording that fits neither side is withheld; a misread harmless phrase only costs a fallback.
function mateProblems(plain, mates) {
  const problems = [];
  for (const sentence of plain.split(/[.;:!?\n]+/)) {
    for (const match of sentence.matchAll(MATE_WORD)) {
      const count = MATE_COUNT.exec(sentence.slice(match.index + match[0].length))?.[1].toLowerCase();
      const moves = count === undefined ? null : /^\d+$/.test(count) ? Number(count) : NUMBER_WORDS.indexOf(count) + 1;
      const side = matingSide(sentence, match), candidates = side ? [side] : [...mates.sides];
      const verified = candidates.length === 1 && mates.sides.has(candidates[0]) && (moves === null || mates.scores.has(`${candidates[0]} ${moves}`));
      if (!verified) problems.push(`${match[0]}${moves === null ? '' : ` in ${moves}`}${side ? ` for ${side}` : ''}`);
    }
  }
  return problems;
}

// Numbers must appear in the evidence (with their sign when one is written). A claim that a piece is won, lost,
// captured or traded must name a piece type that an evidence move captures; who gains it is not checked.
function claimProblems(plain, {numbers, captured}) {
  const problems = [];
  for (const numeral of numerals(plain)) if (!(numeral.signed ? numbers.signed.has(numeral.value) : numbers.unsigned.has(numeral.value))) problems.push(numeral.text);
  for (const match of plain.matchAll(PIECE_CLAIM)) if (!/\b(?:with|by|using)\b/i.test(match[1]) && !captured.has(match[2].toLowerCase())) problems.push(match[0]);
  for (const match of plain.matchAll(MATERIAL_CLAIM)) if (!captured.size) problems.push(match[0]);
  return problems;
}

export function verifyAnswer(text, {allowed, mates, numbers, captured}) {
  const problems = [], cited = [];
  for (const match of text.matchAll(BRACKETED)) {
    const key = normalizeSan(match[1]);
    if (!allowed.has(key)) problems.push(match[1]);
    else if (!cited.includes(allowed.get(key))) cited.push(allowed.get(key));
  }
  const plain = text.replace(BRACKETED, ' ');
  if (/\[\[|\]\]/.test(plain)) problems.push('unbalanced move brackets');
  for (const match of plain.matchAll(SAN_LIKE)) if (!allowed.has(normalizeSan(match[0]))) problems.push(match[0]);
  problems.push(...mateProblems(plain, mates), ...claimProblems(plain, {numbers, captured}));
  return {ok:problems.length === 0, problems, cited, text:text.replace(BRACKETED, '$1').trim()};
}

// Accepts "Nf3", "g1f3", "why not Nf3?" and similar; legality comes from the rules library only.
export function parseAskedMove(board, question) {
  if (typeof question !== 'string' || !question.trim() || question.length > 60) throw failure(400, 'Ask about one move, for example: why not Nf3?');
  const cleaned = question.trim().replace(/^(?:why\s+not|what\s+about|how\s+about|and|but)\s+/i, '').replace(/[?!.,;:\s]+$/, '').trim();
  const copy = copyChess(board);
  try {
    const move = /^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(cleaned)
      ? copy.move({from:cleaned.slice(0, 2).toLowerCase(), to:cleaned.slice(2, 4).toLowerCase(), ...(cleaned[4] ? {promotion:cleaned[4].toLowerCase()} : {})})
      : copy.move(cleaned.replace(/^0-0-0$/, 'O-O-O').replace(/^0-0$/, 'O-O'));
    if (!move) throw new Error('illegal');
    return {uci:uciOf(move), san:move.san};
  } catch {
    throw failure(400, `${cleaned.slice(0, 12) || 'That'} is not a legal move for ${sideName(board.turn())} here. Ask about a legal move, for example: why not ${board.moves()[0] ?? 'a different move'}?`);
  }
}


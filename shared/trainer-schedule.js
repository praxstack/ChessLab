// Spaced repetition for course lines. One card per line. Two modes, both pure functions:
//
//   ladder    Chessable's familiar fixed ladder (4 h, 1 d, 3 d, 1 w, 2 w, 1 mo, 3 mo, 6 mo). A pass
//             climbs one step, a hinted pass stays, a miss drops ONE step (Chessable drops to the
//             bottom, which is the complaint we fix). Two misses in a row do go back to step 1.
//   adaptive  FSRS-style: each card keeps a stability (days until you'd likely forget) and a
//             difficulty (1 easy to 10 hard). Easy lines stretch out fast, hard ones stay close.
//             It is FSRS-shaped, not the published FSRS parameters.
//
// Results come from drill.js: 'pass' (no hint, no miss), 'hinted' (a hint, no miss), 'miss'.
// Times are milliseconds since the epoch; callers pass now so tests stay deterministic.

export const HOUR = 60 * 60 * 1000, DAY = 24 * HOUR;
export const LADDER = [4 * HOUR, DAY, 3 * DAY, 7 * DAY, 14 * DAY, 30 * DAY, 90 * DAY, 180 * DAY];
export const MODES = ['ladder', 'adaptive'];
export const RESULTS = ['pass', 'hinted', 'miss'];
export const MIN_INTERVAL = 4 * HOUR, MAX_INTERVAL = 365 * DAY;
// A card counts as learning until it has climbed this far, then as known.
export const KNOWN_STEP = 4;

const fail = (message, status = 400) => { throw Object.assign(new Error(message), {status}); };

// id is unique in the store (`${courseId}:${lineId}`); lineId names the line inside its course.
export function createCard({id, courseId, lineId = id, now}) {
  if (typeof id !== 'string' || !id) throw new TypeError('A card needs an id.');
  // A new line is due right away, so the first drill is the learner's first look at it.
  return {id, courseId, lineId, step: 0, due: now, reps: 0, lapses: 0, missRun: 0, lastResult: null, lastReviewed: null, stability: 0, difficulty: 5};
}

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const checkResult = result => { if (!RESULTS.includes(result)) fail(`A review result must be ${RESULTS.join(', ')}.`); };

function ladderStep(card, result) {
  // A line seen for the first time starts at the bottom rung (4 hours), as Chessable does.
  if (card.reps === 0) return 0;
  if (result === 'pass') return Math.min(LADDER.length - 1, card.step + 1);
  if (result === 'hinted') return card.step;
  return card.missRun >= 1 ? 0 : Math.max(0, card.step - 1);
}

// Stability in days after this review, from the card's difficulty and the result.
function adaptiveStability(card, result) {
  if (card.reps === 0 || card.stability <= 0) return {pass: 3, hinted: 1, miss: 0.2}[result];
  if (result === 'miss') return Math.max(0.2, card.stability * 0.3);
  const ease = (11 - card.difficulty) / 5;           // 2.0 for the easiest line, 0.2 for the hardest
  const growth = 1 + ease * (result === 'pass' ? 1 : 0.5);
  return card.stability * growth;
}

function adaptiveDifficulty(card, result) {
  const change = {pass: -0.3, hinted: 0.5, miss: 1}[result];
  return clamp(Math.round((card.difficulty + change) * 10) / 10, 1, 10);
}

// Returns the card after one drill, with its next due time.
export function review(card, result, now, mode = 'ladder') {
  checkResult(result);
  if (!MODES.includes(mode)) fail(`A schedule mode must be ${MODES.join(' or ')}.`);
  const next = {...card, reps: card.reps + 1, lastResult: result, lastReviewed: now};
  next.lapses = card.lapses + (result === 'miss' ? 1 : 0);
  next.missRun = result === 'miss' ? card.missRun + 1 : 0;
  next.step = ladderStep(card, result);
  next.difficulty = adaptiveDifficulty(card, result);
  // Stability never exceeds the scheduling horizon, so a miss after a long run of passes still
  // brings the line back within months, not years.
  next.stability = Math.min(MAX_INTERVAL / DAY, Math.round(adaptiveStability(card, result) * 1000) / 1000);
  const interval = mode === 'ladder' ? LADDER[next.step] : next.stability * DAY;
  next.due = now + clamp(interval, MIN_INTERVAL, MAX_INTERVAL);
  return next;
}

export const isDue = (card, now) => card.due <= now;

// Due cards first by how overdue they are, then new cards, so a learner always sees reviews before new lines.
export function dueCards(cards, now, limit = Infinity) {
  return cards.filter(card => isDue(card, now)).sort((a, b) => (a.reps === 0) - (b.reps === 0) || a.due - b.due).slice(0, limit);
}

export function scheduleSummary(cards, now) {
  const summary = {total: cards.length, due: 0, fresh: 0, learning: 0, known: 0, nextDue: null};
  for (const card of cards) {
    if (isDue(card, now)) summary.due += 1;
    if (card.reps === 0) summary.fresh += 1; else if (interval(card) < LADDER[KNOWN_STEP]) summary.learning += 1; else summary.known += 1;
    if (!isDue(card, now) && (summary.nextDue === null || card.due < summary.nextDue)) summary.nextDue = card.due;
  }
  return summary;
}

// The gap the last review set, in either mode. Ladder and adaptive cards both read from it.
const interval = card => card.due - (card.lastReviewed ?? card.due);

// What a learner reads on the card: the plain words for the gap until the next review.
export function stepLabel(card) {
  if (card.reps === 0) return 'new';
  const hours = Math.round(interval(card) / HOUR), days = Math.round(interval(card) / DAY);
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  if (hours < 24) return plural(hours, 'hour');
  if (days < 7) return plural(days, 'day');
  if (days < 30) return plural(Math.round(days / 7), 'week');
  if (days < 365) return plural(Math.round(days / 30), 'month');
  return '1 year';
}

// Tutor loop rules: one flagged move from a reviewed game, then session-counted
// recall of the idea behind it. Pure functions over plain objects. No engine,
// database or network calls happen here; callers pass in the engine's verdict.
//
// Ported from the Kai Mori learner loop (praxstack/kai-mori-fanout-sh,
// public/learn/src/engine/loop.js and recall.js) and adapted to chess.
//
// One attempt walks these steps:
//   try      the learner plays a move on the board
//   why      the learner picks why the right move works, from three answers
//   explain  optional: the learner types the reason and Claude grades it
//   done
//
//   try --right move---------> why   (unaided, or hinted if any hint was used)
//   try --miss 1-------------> try   (next hint: the piece's square, then the move)
//   try --miss 2-------------> why   (taught: the app shows and explains the move)
//   try --show answer--------> why   (answer-now)
//   try --skip---------------> done  (skipped, never scheduled)

export const MAX_MISSES = 2;
// Same ladder as Review Practice: 1 shows the piece's square, 2 shows the move.
export const HINT_LEVELS = 2;
export const SAY_WHY_CHOICES = 3;
export const EXPLAIN_GRADES = ['clear', 'partial', 'missed'];
// The four starter mistake tags. Each tag is one recall topic.
export const MISTAKE_TAGS = ['missed-capture', 'missed-check', 'missed-mate', 'undefended-piece'];

export const SESSION_GAP_MS = 4 * 60 * 60 * 1000;
// Next session, then 3 sessions later, then 6 sessions later.
export const INTERVALS = [1, 3, 6];

export function createAttempt({id, tag = null}) {
  if (typeof id !== 'string' || !id) throw new TypeError('An attempt needs a position id.');
  return {item: id, tag, step: 'try', misses: 0, hints: 0, outcome: null, why: null, explained: null, tries: []};
}

// verdict comes from the engine check the caller ran: {move, correct, diagnosis}.
// diagnosis is the mistake tag's short reason, when the tagger found one.
export function tryMove(state, {move, correct, diagnosis = null}) {
  if (state.step !== 'try') return {state, result: null};
  const next = {...state, tries: [...state.tries, {move, correct: Boolean(correct)}]};
  if (correct) {
    next.step = 'why';
    next.outcome = next.hints === 0 ? 'unaided' : 'hinted';
    return {state: next, result: {correct: true}};
  }
  next.misses += 1;
  if (next.misses >= MAX_MISSES) {
    next.step = 'why';
    next.outcome = 'taught';
    return {state: next, result: {correct: false, diagnosis, taught: true}};
  }
  // A miss moves one rung up the hint ladder from wherever the learner is, so
  // a hint they already asked for is never shown twice.
  const before = next.hints;
  next.hints = Math.min(next.hints + 1, HINT_LEVELS);
  return {state: next, result: {correct: false, diagnosis, hint: next.hints > before ? next.hints : null}};
}

// A hint asked for before any miss still counts: the solve becomes "hinted".
export function askHint(state) {
  if (state.step !== 'try' || state.hints >= HINT_LEVELS) return {state, hint: null};
  const next = {...state, hints: state.hints + 1};
  return {state: next, hint: next.hints};
}

export function showAnswer(state) {
  if (state.step !== 'try') return state;
  return {...state, step: 'why', outcome: 'answer-now'};
}

export function skip(state) {
  if (state.step !== 'try') return state;
  return {...state, step: 'done', outcome: 'skipped'};
}

// The three answers are built from engine facts elsewhere; the caller says
// whether the pick was the true one. One pick only, then the answer is shown.
export function answerWhy(state, {choice, correct}) {
  if (state.step !== 'why') return {state, result: null};
  if (!Number.isInteger(choice) || choice < 0 || choice >= SAY_WHY_CHOICES) throw new RangeError('Choose one of the three answers.');
  const next = {...state, step: 'explain', why: {choice, correct: Boolean(correct)}};
  return {state: next, result: {correct: Boolean(correct)}};
}

// Claude's grade of the typed reason is coach feedback only. It never changes
// recall credit, so a wrong grade from Claude can't cost the learner anything.
export function explainWhy(state, {grade}) {
  if (state.step !== 'explain') return state;
  if (!EXPLAIN_GRADES.includes(grade)) throw new RangeError('Unknown explanation grade.');
  return {...state, step: 'done', explained: grade};
}

// The learner moves on without typing a reason.
export function finish(state) {
  if (state.step !== 'explain') return state;
  return {...state, step: 'done'};
}

// Help used so far, for recording before the attempt ends, so a reload in the
// middle can't turn a helped attempt into an unaided one.
// After the try step this is the outcome so far: taught, answer-now, or
// hinted for a right move with a wrong reason.
export function pendingOutcome(state) {
  if (state.step === 'try') return state.misses > 0 || state.hints > 0 ? 'hinted' : null;
  if (state.step !== 'why' && state.step !== 'explain') return null;
  if (state.outcome !== 'unaided') return state.outcome;
  return state.why && !state.why.correct ? 'hinted' : null;
}

// The outcome recall sees. Finding the move but picking the wrong reason gets
// a refresher next session, like a hinted solve.
export function creditFor(state) {
  if (state.step !== 'done' || state.outcome === 'skipped') return null;
  if (state.outcome === 'unaided' && !state.why?.correct) return 'hinted';
  return state.outcome;
}

// Recall. Topics are mistake tags and items are position or puzzle ids.
// Roles: "main" is the flagged move from the learner's own game, "variation"
// is a new puzzle on the same idea in the same sitting, and "recall" is a
// fresh puzzle on that idea in a later session. Spacing counts sessions, not
// calendar days, so a missed week is just a missed week.

export function emptyRecord() {
  return {version: 1, session: {count: 0, lastAt: null}, topics: {}};
}

const OUTCOMES = new Set(['unaided', 'hinted', 'taught', 'answer-now']);
const ROLES = new Set(['main', 'recall', 'variation']);
const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const isCount = v => Number.isInteger(v) && v >= 0;

function normalizeRow(row) {
  if (!isObject(row) || typeof row.item !== 'string' || !OUTCOMES.has(row.outcome) || !ROLES.has(row.role) || !isCount(row.session)) return null;
  return {
    session: row.session,
    item: row.item,
    outcome: row.outcome,
    hintLevel: isCount(row.hintLevel) ? row.hintLevel : 0,
    role: row.role,
    at: typeof row.at === 'number' ? row.at : null,
    ...(row.repeat === true ? {repeat: true} : {}),
    ...(row.pending === true ? {pending: true, attempt: typeof row.attempt === 'string' ? row.attempt : null} : {}),
  };
}

function normalizeEntry(entry) {
  if (!isObject(entry) || !Array.isArray(entry.log)) return null;
  const log = entry.log.map(normalizeRow).filter(Boolean);
  // The first exposure can't be later than the earliest surviving row.
  const earliest = log.length ? Math.min(...log.map(row => row.session)) : null;
  const stored = isCount(entry.firstSession) ? entry.firstSession : null;
  return {
    log,
    stage: isCount(entry.stage) && entry.stage < INTERVALS.length ? entry.stage : 0,
    due: isCount(entry.due) ? entry.due : null,
    firstSession: earliest === null ? stored : stored !== null && stored <= earliest ? stored : earliest,
  };
}

// Saved progress may come from an older build or a bad write. Keep what is
// well formed and drop the rest, so a damaged record never breaks a page.
export function normalize(record) {
  if (!isObject(record) || record.version !== 1 || !isObject(record.session)) return emptyRecord();
  const topics = {};
  if (isObject(record.topics)) {
    for (const [id, entry] of Object.entries(record.topics)) {
      const clean = normalizeEntry(entry);
      if (clean) topics[id] = clean;
    }
  }
  // The session count can't be behind the latest surviving row.
  const latest = Math.max(0, ...Object.values(topics).flatMap(entry => entry.log.map(row => row.session)));
  return {
    version: 1,
    session: {
      count: Math.max(isCount(record.session.count) ? record.session.count : 0, latest),
      lastAt: Number.isFinite(record.session.lastAt) ? record.session.lastAt : null,
    },
    topics,
  };
}

// A visit opens a new session when at least SESSION_GAP_MS has passed.
export function touchSession(record, now) {
  const next = structuredClone(record);
  const last = next.session.lastAt;
  if (last === null || now - last >= SESSION_GAP_MS) next.session.count += 1;
  next.session.lastAt = now;
  return next;
}

function topicEntry(record, topicId) {
  return record.topics[topicId] ?? {log: [], stage: 0, due: null, firstSession: null};
}

export function hasSeen(record, topicId, itemId) {
  return Boolean(record.topics[topicId]?.log.some(row => row.item === itemId));
}

// "main" and "recall" move the schedule. "variation" is logged as evidence
// only, and so is any repeat of an item already in the log, because
// recognising an answer seen before is not recall.
//
// pending: true records help as it is used. Only the finished outcome of the
// same attempt id replaces that row. An abandoned pending row stays, so after
// a reload the position counts as seen and anything more on it is a repeat.
const HELP = {unaided: 0, hinted: 1, taught: 2, 'answer-now': 2};

export function recordOutcome(record, topicId, {item, outcome, hintLevel = 0, role = 'main', pending = false, attempt = null}, now) {
  if (!OUTCOMES.has(outcome) || !ROLES.has(role)) throw new RangeError('Unknown outcome or role.');
  const next = structuredClone(record);
  const session = next.session.count;
  const entry = topicEntry(next, topicId);
  const last = entry.log.at(-1);
  if (attempt && last?.pending && last.attempt === attempt && last.item === item) {
    // The finished outcome never claims less help than was already recorded.
    const held = entry.log.pop();
    if (HELP[held.outcome] > HELP[outcome]) outcome = held.outcome;
    hintLevel = Math.max(hintLevel, held.hintLevel);
  }
  const repeat = entry.log.some(row => row.item === item);
  entry.log.push({
    session, item, outcome, hintLevel, role, at: now,
    ...(repeat ? {repeat: true} : {}),
    ...(pending ? {pending: true, attempt} : {}),
  });
  if (entry.firstSession === null) entry.firstSession = session;

  if (role !== 'variation' && !repeat) {
    // Only a recall puzzle can advance the interval. A flagged move from
    // another game on the same tag is new evidence, not the recall check.
    const isDueRecall = role === 'recall' && entry.due !== null && session >= entry.due && session > entry.firstSession;
    let due;
    if (outcome === 'unaided') {
      entry.stage = isDueRecall ? Math.min(entry.stage + 1, INTERVALS.length - 1) : entry.stage;
      due = session + INTERVALS[entry.stage];
    } else if (outcome === 'hinted') {
      due = session + 1;
    } else {
      // taught or answer-now: a small refresher next session, interval reset
      entry.stage = 0;
      due = session + 1;
    }
    // A new flagged move never pushes a scheduled recall later.
    entry.due = role === 'main' && entry.due !== null ? Math.min(entry.due, due) : due;
  } else if (role === 'recall' && repeat) {
    // The puzzle pool for this tag ran out, so a seen puzzle came back. It
    // can't advance the stage or count as learned, but it still moves the
    // next due session so the tag doesn't stay due forever.
    if (outcome === 'taught' || outcome === 'answer-now') entry.stage = 0;
    entry.due = session + (outcome === 'unaided' ? INTERVALS[entry.stage] : 1);
  }
  next.topics[topicId] = entry;
  return next;
}

// Learned means an unaided recall, in a session after the first exposure, of
// a puzzle seen for the first time. A first attempt, a same-sitting
// variation, a repeat or a hinted solve never counts.
export function isLearned(record, topicId) {
  const entry = record.topics[topicId];
  if (!entry) return false;
  const seen = new Set();
  return entry.log.some(row => {
    const fresh = !seen.has(row.item);
    seen.add(row.item);
    return fresh && !row.repeat && row.role === 'recall' && row.outcome === 'unaided' && row.session > entry.firstSession;
  });
}

export function topicStatus(record, topicId) {
  const entry = record.topics[topicId];
  const session = record.session.count;
  if (!entry || entry.log.length === 0) return {state: 'new', label: 'New'};
  const learned = isLearned(record, topicId);
  if (entry.due !== null && session >= entry.due) return {state: 'due', label: 'Due today', learned};
  const left = entry.due === null ? null : entry.due - session;
  return {
    state: learned ? 'learned' : 'scheduled',
    label: left === null ? 'Seen' : `Back in ${left} session${left === 1 ? '' : 's'}`,
    learned,
  };
}

// Tags due now, most overdue first, for the "due today" card on Home.
export function dueTopics(record) {
  const session = record.session.count;
  return Object.entries(record.topics)
    .filter(([, entry]) => entry.log.length && entry.due !== null && session >= entry.due)
    .sort(([a, x], [b, y]) => x.due - y.due || a.localeCompare(b))
    .map(([id]) => id);
}

export function lastOutcome(record, topicId) {
  const entry = record.topics[topicId];
  return entry && entry.log.length ? entry.log.at(-1) : null;
}

// Recall uses a puzzle this learner has never answered, in any role, so it
// tests recall and not recognition. Once every puzzle has been seen, the one
// seen longest ago comes back.
const itemId = it => (typeof it === 'string' ? it : it.id);

export function pickRecallItem(record, topicId, recallItems) {
  if (!recallItems.length) return null;
  const log = record.topics[topicId]?.log ?? [];
  const fresh = recallItems.find(it => !log.some(row => row.item === itemId(it)));
  if (fresh) return fresh;
  const lastSeen = it => log.findLastIndex(row => row.item === itemId(it));
  return recallItems.reduce((a, b) => (lastSeen(b) < lastSeen(a) ? b : a));
}

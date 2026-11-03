// When Chess.com's next daily puzzle reaches this page.
// There are two clocks. The Chess.com app changes the puzzle at midnight on
// the player's own phone. Chess.com's public feed, the only thing this page
// can read, changes at midnight US Pacific time: 12:30 PM in India while the
// US is on summer time (March to November), 1:30 PM in winter. So between
// midnight and then, the app already has a newer puzzle than this page.

const PACIFIC = 'America/Los_Angeles';
const DAY = 24 * 60 * 60 * 1000;

function partsIn(ms, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(ms));
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  return { y: get('year'), m: get('month'), d: get('day'), h: get('hour') };
}

/** The moment (ms) the puzzle after the one dated `iso` (YYYY-MM-DD) comes out: the next Pacific midnight. */
export function nextPuzzleAt(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  try {
    // Midnight in Los Angeles is 07:00 UTC in summer and 08:00 UTC in winter.
    for (const off of [7, 8]) {
      const at = Date.UTC(y, m - 1, d + 1, off);
      const p = partsIn(at, PACIFIC);
      if (p.h === 0 && p.d === new Date(Date.UTC(y, m - 1, d + 1)).getUTCDate()) return at;
    }
  } catch {
    /* a browser without time zones: summer time is the better guess for most of the year */
  }
  return Date.UTC(y, m - 1, d + 1, 7);
}

/**
 * The time of `at` as the learner reads it: "today 12:30 pm", "tomorrow 1:30 pm",
 * or "any minute now" once it's due. `timeZone` is only for tests; the page uses the device's own.
 */
export function whenText(at, { now = Date.now(), timeZone } = {}) {
  if (at <= now) return 'any minute now';
  const time = new Date(at)
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone })
    .toLowerCase()
    .replace(/\s+/g, ' ');
  const a = partsIn(at, timeZone);
  const n = partsIn(now, timeZone);
  const days = Math.round((Date.UTC(a.y, a.m - 1, a.d) - Date.UTC(n.y, n.m - 1, n.d)) / DAY);
  if (days === 0) return `today ${time}`;
  if (days === 1) return `tomorrow ${time}`;
  const day = new Date(at).toLocaleDateString('en-GB', { weekday: 'short', timeZone });
  return `${day} ${time}`;
}

/** The device's own date (YYYY-MM-DD) at `now`. `timeZone` is only for tests. */
export function localIso(now = Date.now(), timeZone) {
  const p = partsIn(now, timeZone);
  return `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
}

/**
 * True when the Chess.com app (which goes by the phone's date) already has a
 * newer puzzle than the one this page loaded, dated `iso`. It goes by the
 * loaded date only, so a late or failed feed refresh keeps the note up.
 */
export function appAhead(iso, { now = Date.now(), timeZone } = {}) {
  return Boolean(iso) && localIso(now, timeZone) > iso;
}

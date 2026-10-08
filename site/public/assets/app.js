// AskTheMove landing page behaviour: the waitlist form, the coach's ink, and
// the lesson walkthrough. Everything here enhances markup that already works
// without JavaScript: every mark and note is in the HTML the build writes, and
// this script only hides a mark just before the coach draws it.
import { DEMO } from './demo-data.js';
import { badgesHTML, boardLabel, inkMarks, lastHTML, parsePlacement, pieceHTML, squareXY } from './board.js';

const html = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const moving = () => !reduceMotion.matches;
const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

/* -------------------------------------------------------------- The pen
 * A Timeline lays out one passage of drawing and writing. Each stroke and
 * each word is a Web Animation with a delay and fill: backwards, so it stays
 * hidden until the pen reaches it, and nothing is left behind when it ends.
 * Timings are in DESIGN.md (Motion language).
 */

const EASE_STROKE = 'cubic-bezier(0.65, 0, 0.35, 1)';
const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
const EASE_WRITE = 'cubic-bezier(0.4, 0, 0.6, 1)';
const CLIP_FROM = 'inset(-0.3em 100% -0.45em 0)';
const CLIP_TO = 'inset(-0.3em -0.3em -0.45em -0.3em)';
const CHAR_MS = 34;
const STOP_MS = 90;
const COMMA_MS = 45;
const SENTENCE_END = /[.?!][’”)]?$/;

/** A stroke's length on screen, in CSS pixels. */
function screenLength(path) {
  const m = path.getScreenCTM();
  const scale = m ? Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) : 1;
  return path.getTotalLength() * scale;
}

function strokeMs(path, speed) {
  const px = screenLength(path);
  const ms = px < 28 ? 140 : Math.min(1100, Math.max(260, px * 1.1));
  return Math.round(ms / speed);
}

const toneOf = (el) => (/tone--(red|blue|graphite)/.exec(el.getAttribute('class') || '') || [])[1] || 'red';

/** Wrap each word of a [data-write] element in span.w so it can be written. */
function splitWords(el) {
  if (!el.hasAttribute('data-split')) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const texts = [];
    while (walker.nextNode()) texts.push(walker.currentNode);
    for (const node of texts) {
      if (!node.data.trim()) continue;
      const frag = document.createDocumentFragment();
      for (const part of node.data.split(/(\s+)/)) {
        if (!part) continue;
        if (/^\s+$/.test(part)) {
          frag.append(part);
        } else {
          const w = document.createElement('span');
          w.className = 'w';
          w.textContent = part;
          frag.append(w);
        }
      }
      node.replaceWith(frag);
    }
    el.setAttribute('data-split', '');
  }
  return [...el.querySelectorAll('.w, img')];
}

/** Put the plain text back once it has been written. */
function unsplitWords(el) {
  for (const w of el.querySelectorAll('.w')) w.replaceWith(w.textContent);
  el.normalize();
  el.removeAttribute('data-split');
}

class Timeline {
  constructor({ speed = 1 } = {}) {
    this.t = 0;
    this.speed = speed;
    this.anims = [];
    this.strokes = [];
  }

  wait(ms) {
    this.t += ms;
  }

  /** The pen lifts and moves to the next mark. */
  lift() {
    this.t += Math.round((160 + Math.random() * 100) / this.speed);
  }

  stroke(path, { duration, easing = EASE_STROKE, tone } = {}) {
    const d = duration || strokeMs(path, this.speed);
    const anim = path.animate([{ strokeDashoffset: 1.01 }, { strokeDashoffset: 0 }], {
      duration: d,
      delay: this.t,
      easing,
      fill: 'backwards',
    });
    this.anims.push(anim);
    this.strokes.push({ path, anim, start: this.t, end: this.t + d, tone });
    this.t += d;
  }

  /** Every stroke of one mark, with a short pen lift between them. */
  mark(el) {
    const swipe = Boolean(el.closest('.ink--highlight'));
    const tone = toneOf(el);
    el.querySelectorAll('.stroke').forEach((path, i) => {
      if (i) this.wait(Math.round(70 / this.speed));
      this.stroke(path, swipe ? { duration: 520, easing: EASE_OUT } : { tone });
    });
  }

  /** A [data-draw] element: one mark, or a board overlay of several. */
  draw(el) {
    const groups = el.querySelectorAll(':scope > .mk');
    if (!groups.length) return this.mark(el);
    groups.forEach((g, i) => {
      if (i) this.lift();
      this.mark(g);
    });
  }

  /** Write words left to right, pausing a little after commas and full stops. */
  words(units, charMs = CHAR_MS / this.speed) {
    for (const unit of units) {
      const text = unit.textContent || '';
      const d = Math.max(80, Math.round(Math.max(2, text.length) * charMs));
      this.anims.push(
        unit.animate([{ clipPath: CLIP_FROM }, { clipPath: CLIP_TO }], {
          duration: d,
          delay: this.t,
          easing: EASE_WRITE,
          fill: 'backwards',
        }),
      );
      this.t += d + Math.round(charMs * 0.8);
      if (SENTENCE_END.test(text)) this.t += STOP_MS;
      else if (/[,;:]$/.test(text)) this.t += COMMA_MS;
    }
  }

  /** A whole [data-write] element. Long passages are written faster, so no note takes more than about 2.5s. */
  write(el) {
    const units = splitWords(el);
    const chars = units.reduce((n, u) => n + (u.textContent || '').length, 0);
    this.words(units, Math.min(CHAR_MS, 2400 / Math.max(chars, 1)) / this.speed);
  }

  /** A left-to-right swipe, for the highlighter on the board. */
  swipe(el, duration = 280) {
    this.anims.push(
      el.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], {
        duration,
        delay: this.t,
        easing: EASE_OUT,
        fill: 'backwards',
      }),
    );
    this.t += duration;
  }

  done() {
    return Promise.all(this.anims.map((a) => a.finished.catch(() => {})));
  }

  cancel() {
    for (const a of this.anims) a.cancel();
  }

  finish() {
    for (const a of this.anims) {
      try {
        a.finish();
      } catch {
        /* already cancelled */
      }
    }
  }
}

/* ------------------------------------------------- The coach's marks
 * Each [data-ink-group] is drawn once, by one pen, in document order, when it
 * scrolls into view. An item further down waits until it is on screen too, so
 * nothing is drawn where nobody is looking. "load" groups draw straight away.
 */

function whenReachable(el) {
  return new Promise((resolve) => {
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.88) return resolve();
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          resolve();
        }
      },
      { rootMargin: '0px 0px -12% 0px' },
    );
    io.observe(el);
  });
}

async function drawItems(items) {
  for (const el of items) {
    await whenReachable(el);
    if (!moving()) {
      el.classList.remove('is-pending');
      continue;
    }
    const tl = new Timeline();
    const writing = el.hasAttribute('data-write');
    if (writing) tl.write(el);
    else tl.draw(el);
    el.classList.remove('is-pending');
    await tl.done();
    if (writing) unsplitWords(el);
    await sleep(160 + Math.random() * 100);
  }
}

function initInk() {
  if (!moving()) {
    html.classList.add('ink-ready');
    return;
  }
  const groups = [...document.querySelectorAll('[data-ink-group]')];
  const queues = new Map();
  for (const group of groups) {
    const items = [...group.querySelectorAll('[data-draw], [data-write]')].filter(
      (el) =>
        el.closest('[data-ink-group]') === group &&
        !el.closest('.demo, [hidden]') &&
        !el.parentElement.closest('[data-draw], [data-write]'),
    );
    for (const el of items) el.classList.add('is-pending');
    queues.set(group, items);
  }
  const demo = document.getElementById('demo');
  if (demo) demo.classList.add('is-pending');
  html.classList.add('ink-ready');

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        io.unobserve(entry.target);
        drawItems(queues.get(entry.target));
      }
    },
    { rootMargin: '0px 0px -18% 0px' },
  );
  const fontsReady = Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), sleep(700)]);
  for (const group of groups) {
    if (group.dataset.inkGroup === 'load') fontsReady.then(() => sleep(250)).then(() => drawItems(queues.get(group)));
    else io.observe(group);
  }

  // If the visitor turns motion off part-way, show every drawing finished.
  reduceMotion.addEventListener('change', () => {
    if (!reduceMotion.matches) return;
    for (const el of document.querySelectorAll('.is-pending')) el.classList.remove('is-pending');
    for (const a of document.getAnimations()) {
      try {
        a.finish();
      } catch {
        /* infinite or idle */
      }
    }
  });
}

/* ---------------------------------------------------------------- Waitlist */

const ERROR_MESSAGES = {
  email: "That doesn't look like a complete email address. Check it and try again.",
  consent: 'Tick the box so we can email you about the beta.',
  rating: 'Choose a rating from the list, or leave it blank.',
  'rate-limited': 'Too many attempts from your connection. Please wait ten minutes and try again.',
  turnstile: 'Please complete the human check and try again.',
  server: 'Something went wrong on our side. Please try again in a minute.',
};

function initWaitlist() {
  const form = document.getElementById('join-form');
  if (!form) return;
  const join = document.getElementById('join');
  const email = form.elements.namedItem('email');
  const consent = form.elements.namedItem('consent');
  const status = document.getElementById('join-status');
  const button = form.querySelector('.join__submit');
  const label = button.querySelector('.btn__label');
  const done = document.getElementById('join-done');
  const doneTitle = document.getElementById('join-done-title');
  const doneBody = document.getElementById('join-done-body');

  form.noValidate = true;

  // Where the visitor came from: campaign tags and referrer, both optional.
  const params = new URLSearchParams(window.location.search);
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign']) {
    const value = params.get(key);
    if (value) form.elements.namedItem(key).value = value.slice(0, 200);
  }
  if (document.referrer) {
    try {
      const ref = new URL(document.referrer);
      if (ref.host !== window.location.host) form.elements.namedItem('referrer').value = ref.origin + ref.pathname;
    } catch {
      /* ignore malformed referrers */
    }
  }

  const setError = (message, field) => {
    status.textContent = message;
    status.classList.add('is-error');
    for (const el of [email, consent]) el.removeAttribute('aria-invalid');
    if (field) {
      field.setAttribute('aria-invalid', 'true');
      field.focus();
    }
  };

  const clearError = () => {
    status.textContent = '';
    status.classList.remove('is-error');
  };

  const showDone = (already, address) => {
    form.hidden = true;
    done.hidden = false;
    doneTitle.textContent = already ? 'You’re already on the list.' : 'You’re on the list.';
    doneBody.textContent = address
      ? `We’ll email ${address} when your beta invite is ready.`
      : 'We’ll email you when your beta invite is ready.';
    doneTitle.focus();
    // The coach ticks it off.
    const tick = done.querySelector('[data-draw]');
    if (tick && moving()) new Timeline().draw(tick);
  };

  // After a plain (no-fetch) form post, the server redirects back here.
  if (params.get('joined') === '1') {
    showDone(false, '');
    history.replaceState(null, '', window.location.pathname + '#join');
  } else if (params.get('error')) {
    const code = params.get('error');
    setError(ERROR_MESSAGES[code] || ERROR_MESSAGES.server);
    history.replaceState(null, '', window.location.pathname + '#join');
  }

  email.addEventListener('input', () => {
    if (email.getAttribute('aria-invalid')) {
      email.removeAttribute('aria-invalid');
      clearError();
    }
  });
  consent.addEventListener('change', () => {
    if (consent.checked && consent.getAttribute('aria-invalid')) {
      consent.removeAttribute('aria-invalid');
      clearError();
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearError();
    const value = email.value.trim();
    if (!value) return setError('Enter your email address.', email);
    if (!email.checkValidity() || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      return setError(ERROR_MESSAGES.email, email);
    }
    if (!consent.checked) return setError(ERROR_MESSAGES.consent, consent);

    const data = Object.fromEntries(new FormData(form));
    data.consent = true;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    label.textContent = 'Joining…';
    status.textContent = '';
    try {
      const res = await fetch(form.action, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(data),
        credentials: 'same-origin',
      });
      let body = {};
      try {
        body = await res.json();
      } catch {
        /* non-JSON error page */
      }
      if (res.ok && body.ok) {
        showDone(Boolean(body.already), value.toLowerCase());
        return;
      }
      const message = body.error || ERROR_MESSAGES.server;
      setError(message, res.status === 400 && /email/i.test(message) ? email : null);
      if (window.turnstile && typeof window.turnstile.reset === 'function') window.turnstile.reset();
    } catch {
      setError('We couldn’t reach the server. Check your connection and try again.');
    } finally {
      button.disabled = false;
      button.removeAttribute('aria-busy');
      label.textContent = 'Join the waitlist';
    }
  });

  // "Join the waitlist" links elsewhere on the page move focus to the email field.
  for (const link of document.querySelectorAll('[data-focus-join], a[href="/#join"], a[href="#join"]')) {
    link.addEventListener('click', () => {
      window.setTimeout(() => {
        if (!form.hidden) email.focus({ preventScroll: true });
        else join.focus({ preventScroll: true });
      }, moving() ? 450 : 0);
    });
  }
}

/* ------------------------------------------------------------- The lesson
 * One step: the pieces move, the highlighter marks the move, the coach writes
 * the title, then draws each mark just before the sentence that explains it,
 * and finally ticks the evidence line. Autoplay runs once, holds each step
 * for about three seconds, and pauses on hover, focus or a hidden tab.
 */

// Which marks go with which sentence of each note. Numbers index inkMarks()
// for the step (arrows first, then circled or crossed squares); "badge" is
// the ?? or # written on the board. Marks not listed are drawn at the end.
const CUES = {
  position: [[0, 1], []],
  blunder: [['badge'], [], []],
  why: [[0, 1, 2], []],
  check: [[1], [], [0]],
  mate: [[1, 0, 'badge'], [2, 3, 4, 5], []],
  branch: [],
};

const HOLD_MS = 3000;
const FRAME_GAP = 560;

function initDemo() {
  const demo = document.getElementById('demo');
  if (!demo) return;
  const o = DEMO.orientation;
  const board = demo.querySelector('.board');
  const hlLayer = demo.querySelector('.board__hl');
  const pieceLayer = demo.querySelector('.board__pieces');
  const ink = demo.querySelector('.board__ink');
  const pencil = ink.querySelector('.pencil');
  const badgeLayer = demo.querySelector('.board__badges');
  const note = demo.querySelector('.note');
  const stack = demo.querySelector('.note__stack');
  const pages = new Map([...demo.querySelectorAll('.note__page')].map((el) => [el.dataset.key, el]));
  const sheetMoves = [...demo.querySelectorAll('.ss__btn')];
  const varRow = demo.querySelector('.ss__var');
  const prevBtn = demo.querySelector('[data-act="prev"]');
  const nextBtn = demo.querySelector('[data-act="next"]');
  const nextText = nextBtn.querySelector('.ctl__text');
  const branchBtn = demo.querySelector('[data-act="branch"]');
  const branchText = branchBtn.querySelector('.ctl__text');

  const state = {
    line: 'main',
    index: 0,
    returnTo: 0,
    placement: DEMO.main[0].fen,
    started: false,
    autoplay: false,
    paused: false,
    hold: 0,
    holdStart: 0,
    holdLeft: 0,
    token: 0,
    tl: null,
    seen: new Set(),
  };

  const pieceEls = new Map();
  for (const el of pieceLayer.querySelectorAll('.pc')) pieceEls.set(el.dataset.sq, el);

  const keyOf = (line, index) => `${line}-${index}`;
  const stepAt = (line, index) => (line === 'main' ? DEMO.main[index] : DEMO.branch.steps[index]);
  const current = () => stepAt(state.line, state.index);
  const same = (a, b) => JSON.stringify(a || null) === JSON.stringify(b || null);

  /* Pieces */

  function setXY(el, sq) {
    const [x, y] = squareXY(sq, o);
    el.dataset.x = String(x);
    el.dataset.y = String(y);
    el.dataset.sq = sq;
  }

  // Same-type pieces glide to their new squares, captured pieces fade out,
  // new pieces fade in.
  function syncPieces(fromPlacement, toPlacement) {
    const before = parsePlacement(fromPlacement);
    const after = parsePlacement(toPlacement);
    const gone = [];
    const appear = [];
    for (const sq of new Set([...Object.keys(before), ...Object.keys(after)])) {
      if (before[sq] === after[sq]) continue;
      if (before[sq]) gone.push(sq);
      if (after[sq]) appear.push(sq);
    }
    const moves = [];
    const unmatched = [];
    for (const to of appear) {
      let best = -1;
      let bestDist = Infinity;
      gone.forEach((from, i) => {
        if (from === null || before[from] !== after[to]) return;
        const d = Math.abs(from.charCodeAt(0) - to.charCodeAt(0)) + Math.abs(Number(from[1]) - Number(to[1]));
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      });
      if (best >= 0) {
        moves.push([gone[best], to]);
        gone[best] = null;
      } else {
        unmatched.push(to);
      }
    }
    const leaving = gone.filter(Boolean).map((sq) => pieceEls.get(sq)).filter(Boolean);
    const sliding = moves.map(([from, to]) => [pieceEls.get(from), to]);
    for (const sq of gone.filter(Boolean)) pieceEls.delete(sq);
    for (const [from] of moves) pieceEls.delete(from);

    for (const el of leaving) {
      el.classList.add('is-out');
      window.setTimeout(() => el.remove(), moving() ? 260 : 0);
    }
    for (const [el, to] of sliding) {
      if (!el) continue;
      el.classList.add('is-moving');
      setXY(el, to);
      pieceEls.set(to, el);
      window.setTimeout(() => el.classList.remove('is-moving'), 460);
    }
    for (const sq of unmatched) {
      const tpl = document.createElement('template');
      tpl.innerHTML = pieceHTML(sq, after[sq], o);
      const el = tpl.content.firstElementChild;
      if (moving()) el.classList.add('is-in');
      pieceLayer.append(el);
      pieceEls.set(sq, el);
      if (moving()) requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('is-in')));
    }
  }

  /* Ink on the board */

  function fadeOut(nodes) {
    if (!nodes.length) return Promise.resolve();
    if (!moving() || demo.classList.contains('is-pending')) {
      for (const n of nodes) n.remove();
      return Promise.resolve();
    }
    const anims = nodes.map((n) => n.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: EASE_OUT, fill: 'forwards' }));
    return Promise.all(anims.map((a) => a.finished.catch(() => {}))).then(() => {
      for (const n of nodes) n.remove();
    });
  }

  function putMarks(step) {
    for (const g of ink.querySelectorAll('.mk')) g.remove();
    pencil.insertAdjacentHTML('beforebegin', inkMarks(step, o).map((m) => m.svg).join(''));
    return [...ink.querySelectorAll('.mk')];
  }

  function showStatic(step) {
    hlLayer.innerHTML = lastHTML(step, o);
    putMarks(step);
    badgeLayer.innerHTML = badgesHTML(step, o);
    board.classList.remove('is-drawing');
  }

  // The red-blue pencil follows whichever stroke is being drawn, and travels
  // between strokes that follow each other closely. It lifts away otherwise.
  function followPencil(tl, token) {
    // Only strokes on the board: the tick beside the evidence line is in the
    // note, in another drawing's coordinates.
    const strokes = tl.strokes.filter((s) => ink.contains(s.path));
    if (!strokes.length) return;
    // The last stroke's animation is the clock: its time runs from the start of
    // the timeline to the end of the last stroke (a finished animation's time
    // stops at its own end, so an earlier one would stop the pencil).
    const clock = strokes[strokes.length - 1].anim;
    const lengths = strokes.map((s) => s.path.getTotalLength());
    const at = (i, f) => strokes[i].path.getPointAtLength(lengths[i] * f);
    const frame = () => {
      const now = clock.currentTime;
      // The clock stops at the end of the last stroke, so stop there too.
      if (token !== state.token || now === null || clock.playState === 'finished') {
        board.classList.remove('is-drawing');
        return;
      }
      let point = null;
      let tone = null;
      for (let i = 0; i < strokes.length; i += 1) {
        const s = strokes[i];
        if (now < s.start) {
          const prev = strokes[i - 1];
          if (prev && s.start - prev.end <= 320) {
            const k = (now - prev.end) / (s.start - prev.end);
            const a = at(i - 1, 1);
            const b = at(i, 0);
            point = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
            tone = s.tone;
          }
          break;
        }
        if (now <= s.end) {
          const offset = parseFloat(getComputedStyle(s.path).strokeDashoffset) || 0;
          point = at(i, Math.min(1, Math.max(0, 1 - offset)));
          tone = s.tone;
          break;
        }
      }
      if (point) {
        pencil.setAttribute('transform', `translate(${point.x.toFixed(2)} ${point.y.toFixed(2)})`);
        pencil.setAttribute('class', `pencil tone--${tone || 'red'}`);
        board.classList.add('is-drawing');
      } else {
        board.classList.remove('is-drawing');
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  /* Score sheet, note and controls */

  function updateChrome(step) {
    const key = keyOf(state.line, state.index);
    for (const [k, el] of pages) {
      const on = k === key;
      el.classList.toggle('is-current', on);
      if (on) el.removeAttribute('aria-hidden');
      else el.setAttribute('aria-hidden', 'true');
    }
    board.setAttribute('aria-label', boardLabel(step));
    const inBranch = state.line === 'branch';
    note.classList.toggle('is-branch', inBranch);

    for (const btn of sheetMoves) {
      if (!inBranch && Number(btn.dataset.strip) === step.strip) btn.setAttribute('aria-current', 'step');
      else btn.removeAttribute('aria-current');
    }
    const wasHidden = varRow.hidden;
    varRow.hidden = !inBranch;
    if (inBranch && wasHidden && moving()) {
      const ring = varRow.querySelector('.stroke');
      if (ring) ring.animate([{ strokeDashoffset: 1.01 }, { strokeDashoffset: 0 }], { duration: 520, easing: EASE_STROKE });
    }

    const last = !inBranch && state.index === DEMO.main.length - 1;
    prevBtn.disabled = !inBranch && state.index === 0;
    nextBtn.disabled = inBranch;
    nextText.textContent = last ? 'Replay' : 'Next';
    branchBtn.classList.toggle('is-active', inBranch);
    branchText.textContent = inBranch ? 'Back to your game' : 'Try another line';
    // Don't strand keyboard focus on a button that just turned off.
    if (document.activeElement === prevBtn && prevBtn.disabled) nextBtn.focus();
    if (document.activeElement === nextBtn && nextBtn.disabled) branchBtn.focus();
  }

  // Lay out the drawing for one step on a fresh timeline.
  function buildStep(tl, step, prevStep, page, fresh) {
    if (fresh || !same(step.last, prevStep.last)) {
      hlLayer.innerHTML = lastHTML(step, o);
      for (const hl of hlLayer.children) tl.swipe(hl);
      tl.wait(140);
    }
    const groups = putMarks(step);
    const marks = inkMarks(step, o);
    const newBadge = fresh || !same(step.badge, prevStep.badge);
    if (newBadge) badgeLayer.innerHTML = badgesHTML(step, o);
    const used = new Set();

    const drawCue = (cue) => {
      if (used.has(cue)) return;
      used.add(cue);
      if (cue === 'badge') {
        const badge = badgeLayer.querySelector('[data-write]');
        if (!badge || !newBadge) return;
        tl.lift();
        tl.words(splitWords(badge), 110 / tl.speed);
        return;
      }
      const g = groups[cue];
      if (!g) return;
      tl.lift();
      tl.mark(g);
    };

    tl.write(page.querySelector('.note__title'));
    const cues = CUES[step.id] || [];
    if (newBadge && !cues.flat().includes('badge')) drawCue('badge');
    tl.wait(220);

    const units = splitWords(page.querySelector('.note__body'));
    const sentences = [[]];
    units.forEach((u, i) => {
      sentences[sentences.length - 1].push(u);
      if (SENTENCE_END.test(u.textContent || '') && i < units.length - 1) sentences.push([]);
    });
    sentences.forEach((words, i) => {
      for (const cue of cues[i] || []) drawCue(cue);
      if (i && (cues[i] || []).length) tl.wait(120);
      tl.words(words);
    });
    marks.forEach((_, i) => drawCue(i));

    // The coach checks the evidence line, last.
    tl.wait(240);
    const tick = page.querySelector('.note__tick');
    if (tick) tl.mark(tick);
  }

  async function go(line, index, { fromUser = false, instant = false } = {}) {
    const token = ++state.token;
    state.started = true;
    if (fromUser) stopAutoplay(true);
    window.clearTimeout(state.hold);
    state.holdLeft = 0;
    if (state.tl) {
      state.tl.cancel();
      state.tl = null;
    }
    board.classList.remove('is-drawing');

    const prev = { line: state.line, index: state.index };
    const prevStep = current();
    state.line = line;
    state.index = index;
    const step = current();
    const key = keyOf(line, index);
    const forwardOne = prev.line === line && index === prev.index + 1;
    const intoBranch = line === 'branch' && prev.line === 'main';
    // Keyboard steps are never drawn: they repeat quickly and should feel instant.
    const draw = moving() && !instant && (forwardOne || intoBranch || !state.seen.has(key));
    const fresh = demo.classList.contains('is-pending');
    state.seen.add(key);

    const page = pages.get(key);
    if (draw) page.classList.add('is-pending');
    updateChrome(step);

    if (!draw) {
      syncPieces(state.placement, step.fen);
      state.placement = step.fen;
      showStatic(step);
      page.classList.remove('is-pending');
      demo.classList.remove('is-pending');
      return;
    }

    // Take the old marks off the board, then make the move.
    const old = [...ink.querySelectorAll('.mk')];
    if (!same(step.last, prevStep.last)) old.push(...hlLayer.children);
    if (!same(step.badge, prevStep.badge)) old.push(...badgeLayer.children);
    await fadeOut(old);
    if (token !== state.token) return;

    let frames = [];
    if (forwardOne) frames = step.frames || [];
    if (intoBranch) {
      const base = DEMO.main[DEMO.branch.from].fen;
      frames = [...(state.placement !== base ? [base] : []), ...(step.frames || [])];
    }
    for (const frame of frames) {
      syncPieces(state.placement, frame);
      state.placement = frame;
      await sleep(FRAME_GAP);
      if (token !== state.token) return;
    }
    if (state.placement !== step.fen) {
      syncPieces(state.placement, step.fen);
      state.placement = step.fen;
      await sleep(460);
      if (token !== state.token) return;
    }

    // The coach writes faster when you are the one turning the pages.
    const tl = new Timeline({ speed: state.autoplay ? 1 : 1.4 });
    state.tl = tl;
    buildStep(tl, step, prevStep, page, fresh);
    page.classList.remove('is-pending');
    demo.classList.remove('is-pending');
    followPencil(tl, token);
    await tl.done();
    if (token !== state.token) return;
    state.tl = null;
    if (state.autoplay) scheduleNext();
  }

  /* Autoplay */

  function startHold() {
    window.clearTimeout(state.hold);
    state.holdStart = performance.now();
    state.hold = window.setTimeout(() => {
      state.holdLeft = 0;
      go('main', state.index + 1);
    }, state.holdLeft);
  }

  function scheduleNext() {
    if (state.line !== 'main' || state.index >= DEMO.main.length - 1) {
      stopAutoplay(false);
      return;
    }
    state.holdLeft = HOLD_MS;
    if (!state.paused) startHold();
  }

  function pause() {
    if (!state.autoplay || state.paused) return;
    state.paused = true;
    if (state.holdLeft > 0) {
      window.clearTimeout(state.hold);
      state.holdLeft = Math.max(0, state.holdLeft - (performance.now() - state.holdStart));
    }
  }

  function resume() {
    if (!state.autoplay || !state.paused) return;
    state.paused = false;
    if (state.holdLeft > 0) startHold();
  }

  function stopAutoplay(byUser) {
    window.clearTimeout(state.hold);
    state.holdLeft = 0;
    state.autoplay = false;
    state.paused = false;
    // Announce the notes once the visitor is driving.
    if (byUser) stack.setAttribute('aria-live', 'polite');
  }

  function start() {
    if (state.started) return;
    state.autoplay = moving();
    go('main', 0);
  }

  /* Controls */

  prevBtn.addEventListener('click', () => {
    if (state.line === 'branch') go('main', state.returnTo, { fromUser: true });
    else if (state.index > 0) go('main', state.index - 1, { fromUser: true });
  });

  nextBtn.addEventListener('click', () => {
    if (state.line !== 'main') return;
    if (state.index === DEMO.main.length - 1) {
      // Replay: the coach marks the whole trap up again.
      stopAutoplay(true);
      state.seen.clear();
      state.autoplay = moving();
      go('main', 0);
      return;
    }
    go('main', state.index + 1, { fromUser: true });
  });

  branchBtn.addEventListener('click', () => {
    if (state.line === 'branch') {
      go('main', state.returnTo, { fromUser: true });
    } else {
      state.returnTo = state.index;
      go('branch', 0, { fromUser: true });
    }
  });

  for (const btn of sheetMoves) {
    btn.addEventListener('click', () => go('main', Number(btn.dataset.goto), { fromUser: true }));
  }

  demo.addEventListener('keydown', (event) => {
    if (event.target.closest('input, select, textarea')) return;
    const opts = { fromUser: true, instant: true };
    if (event.key === 'ArrowRight' && state.line === 'main' && state.index < DEMO.main.length - 1) {
      event.preventDefault();
      go('main', state.index + 1, opts);
    } else if (event.key === 'ArrowLeft' && !prevBtn.disabled) {
      event.preventDefault();
      if (state.line === 'branch') go('main', state.returnTo, opts);
      else go('main', state.index - 1, opts);
    }
  });

  demo.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'mouse') pause();
  });
  demo.addEventListener('pointerleave', (event) => {
    if (event.pointerType === 'mouse') resume();
  });
  demo.addEventListener('focusin', pause);
  demo.addEventListener('focusout', (event) => {
    if (!demo.contains(event.relatedTarget)) resume();
  });
  document.addEventListener('visibilitychange', () => (document.hidden ? pause() : resume()));

  reduceMotion.addEventListener('change', () => {
    if (!reduceMotion.matches) return;
    stopAutoplay(false);
    if (state.tl) state.tl.finish();
    board.classList.remove('is-drawing');
    demo.classList.remove('is-pending');
    for (const page of pages.values()) page.classList.remove('is-pending');
  });

  for (const el of [prevBtn, nextBtn, branchBtn, ...sheetMoves]) el.disabled = false;
  updateChrome(current());

  if (!moving() || !('IntersectionObserver' in window)) {
    state.started = true;
    state.seen.add(keyOf('main', 0));
    demo.classList.remove('is-pending');
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      window.setTimeout(start, 350);
    },
    { threshold: 0.5 },
  );
  io.observe(board);
}

initInk();
initWaitlist();
initDemo();

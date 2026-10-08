// AskTheMove landing page behaviour: the waitlist form and the hero walkthrough.
// Both enhance markup that already works without JavaScript.
import { DEMO } from './demo-data.js';
import { arrowsSVG, boardLabel, overlaysHTML, parsePlacement, pieceHTML, squareXY } from './board.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

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
      }, reduceMotion.matches ? 0 : 450);
    });
  }
}

/* ------------------------------------------------------------ Walkthrough */

const STEP_DELAYS = [3200, 4200, 5600, 5200]; // time on each main step while autoplaying
const FRAME_GAP = 520;

function initDemo() {
  const root = document.getElementById('demo');
  if (!root) return;
  const o = DEMO.orientation;
  const board = root.querySelector('.board');
  const hlLayer = root.querySelector('.board__hl');
  const pieceLayer = root.querySelector('.board__pieces');
  const arrowLayer = root.querySelector('.board__arrows');
  const badgeLayer = root.querySelector('.board__badges');
  const note = root.querySelector('.note');
  const pages = new Map([...root.querySelectorAll('.note__page')].map((el) => [el.dataset.key, el]));
  const pips = [...root.querySelectorAll('.pip')];
  const stripMoves = [...root.querySelectorAll('.strip:not(.strip--branch) .strip__move')];
  const branchStrip = root.querySelector('.strip--branch');
  const branchMoves = [...branchStrip.querySelectorAll('.strip__move')];
  const prevBtn = root.querySelector('[data-act="prev"]');
  const nextBtn = root.querySelector('[data-act="next"]');
  const nextText = nextBtn.querySelector('.ctl__text');
  const branchBtn = root.querySelector('[data-act="branch"]');
  const branchText = branchBtn.querySelector('.ctl__text');

  const state = {
    line: 'main',
    index: 0,
    returnTo: 0,
    placement: DEMO.main[0].fen,
    autoplay: false,
    timer: 0,
    timerStart: 0,
    timerLeft: 0,
    paused: false,
    token: 0,
  };

  const pieceEls = new Map();
  for (const el of pieceLayer.querySelectorAll('.pc')) pieceEls.set(el.dataset.sq, el);

  const current = () => (state.line === 'main' ? DEMO.main[state.index] : DEMO.branch.steps[state.index]);
  const animate = () => !reduceMotion.matches;
  const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

  function setXY(el, sq) {
    const [x, y] = squareXY(sq, o);
    el.dataset.x = String(x);
    el.dataset.y = String(y);
    el.dataset.sq = sq;
  }

  // Move the DOM pieces from one placement to another: same-type pieces glide,
  // captured pieces fade out, new pieces fade in.
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
      const code = after[to];
      let best = -1;
      let bestDist = Infinity;
      gone.forEach((from, i) => {
        if (from === null || before[from] !== code) return;
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
    const moving = moves.map(([from, to]) => [pieceEls.get(from), to]);
    for (const sq of gone.filter(Boolean)) pieceEls.delete(sq);
    for (const [from] of moves) pieceEls.delete(from);

    for (const el of leaving) {
      el.classList.add('is-out');
      window.setTimeout(() => el.remove(), animate() ? 320 : 0);
    }
    for (const [el, to] of moving) {
      if (!el) continue;
      el.classList.add('is-moving');
      setXY(el, to);
      pieceEls.set(to, el);
      window.setTimeout(() => el.classList.remove('is-moving'), 450);
    }
    for (const sq of unmatched) {
      const tpl = document.createElement('template');
      tpl.innerHTML = pieceHTML(sq, after[sq], o);
      const el = tpl.content.firstElementChild;
      if (animate()) el.classList.add('is-in');
      pieceLayer.append(el);
      pieceEls.set(sq, el);
      if (animate()) requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('is-in')));
    }
  }

  function drawAnnotations(step) {
    hlLayer.innerHTML = overlaysHTML({ ...step, badge: null }, o);
    badgeLayer.innerHTML = overlaysHTML({ badge: step.badge }, o);
    arrowLayer.innerHTML = arrowsSVG(step.arrows, o);
    if (animate()) {
      arrowLayer.querySelectorAll('.arrow').forEach((g, i) => {
        g.querySelector('path').style.animationDelay = `${i * 0.16}s`;
        g.querySelector('polygon').style.animationDelay = `${0.38 + i * 0.16}s`;
        g.classList.add('is-drawing');
      });
    }
  }

  function clearAnnotations() {
    arrowLayer.innerHTML = '';
    badgeLayer.innerHTML = '';
    hlLayer.innerHTML = '';
  }

  function updateChrome(step) {
    const key = `${state.line}-${state.index}`;
    for (const [k, el] of pages) {
      const on = k === key;
      el.classList.toggle('is-current', on);
      if (on) el.removeAttribute('aria-hidden');
      else el.setAttribute('aria-hidden', 'true');
    }
    board.setAttribute('aria-label', boardLabel(step));
    const inBranch = state.line === 'branch';
    note.classList.toggle('is-branch', inBranch);

    stripMoves.forEach((btn, i) => {
      if (!inBranch && step.strip === i) btn.setAttribute('aria-current', 'step');
      else btn.removeAttribute('aria-current');
    });
    branchStrip.hidden = !inBranch;
    branchMoves.forEach((el) => el.classList.toggle('is-current', inBranch));

    pips.forEach((pip, i) => {
      pip.classList.toggle('is-done', !inBranch && i < state.index);
      pip.classList.toggle('is-current', !inBranch && i === state.index);
      pip.classList.remove('is-timing');
    });

    const last = state.line === 'main' && state.index === DEMO.main.length - 1;
    prevBtn.disabled = state.line === 'main' && state.index === 0;
    nextBtn.disabled = inBranch;
    nextText.textContent = last ? 'Replay' : 'Next';
    branchBtn.classList.toggle('is-active', inBranch);
    branchText.textContent = inBranch ? 'Back to your game' : 'Try another line';
  }

  async function go(line, index, { fromUser = false } = {}) {
    const token = ++state.token;
    if (fromUser) stopAutoplay(true);
    const prev = { line: state.line, index: state.index };
    state.line = line;
    state.index = index;
    const step = current();
    updateChrome(step);

    const forwardOne = prev.line === line && index === prev.index + 1;
    const frames = forwardOne && step.frames && animate() ? step.frames : [];
    if (step.fen !== state.placement || frames.length) {
      clearAnnotations();
      for (const frame of frames) {
        syncPieces(state.placement, frame);
        state.placement = frame;
        await wait(FRAME_GAP);
        if (token !== state.token) return;
      }
      syncPieces(state.placement, step.fen);
      state.placement = step.fen;
      if (animate()) await wait(380);
      if (token !== state.token) return;
    }
    drawAnnotations(step);
    if (state.autoplay) scheduleNext();
  }

  /* Autoplay: runs through the main line once, the first time the board is in view. */

  function scheduleNext() {
    window.clearTimeout(state.timer);
    if (state.line !== 'main' || state.index >= DEMO.main.length - 1) {
      stopAutoplay(false);
      return;
    }
    const delay = STEP_DELAYS[state.index];
    const pip = pips[state.index + 1];
    if (pip) {
      pip.style.setProperty('--dur', `${delay}ms`);
      pip.classList.remove('is-current');
      pip.classList.add('is-timing');
    }
    state.timerLeft = delay;
    startTimer();
  }

  function startTimer() {
    window.clearTimeout(state.timer);
    state.timerStart = performance.now();
    state.timer = window.setTimeout(() => {
      state.timerLeft = 0;
      go('main', state.index + 1);
    }, state.timerLeft);
  }

  function pause() {
    if (!state.autoplay || state.paused) return;
    state.paused = true;
    note.classList.add('is-paused');
    window.clearTimeout(state.timer);
    state.timerLeft = Math.max(0, state.timerLeft - (performance.now() - state.timerStart));
  }

  function resume() {
    if (!state.autoplay || !state.paused) return;
    state.paused = false;
    note.classList.remove('is-paused');
    if (state.timerLeft > 0) startTimer();
  }

  function stopAutoplay(byUser) {
    window.clearTimeout(state.timer);
    state.autoplay = false;
    state.paused = false;
    note.classList.remove('is-paused');
    for (const pip of pips) pip.classList.remove('is-timing');
    if (byUser) {
      // Announce captions once the visitor is driving.
      root.querySelector('.note__stack').setAttribute('aria-live', 'polite');
    }
  }

  function startAutoplay() {
    if (reduceMotion.matches || state.autoplay) return;
    state.autoplay = true;
    scheduleNext();
  }

  /* Controls */

  prevBtn.addEventListener('click', () => {
    if (state.line === 'branch') go('main', state.returnTo, { fromUser: true });
    else if (state.index > 0) go('main', state.index - 1, { fromUser: true });
  });

  nextBtn.addEventListener('click', () => {
    if (state.line !== 'main') return;
    const last = state.index === DEMO.main.length - 1;
    go('main', last ? 0 : state.index + 1, { fromUser: true });
  });

  branchBtn.addEventListener('click', () => {
    if (state.line === 'branch') {
      go('main', state.returnTo, { fromUser: true });
    } else {
      state.returnTo = state.index;
      go('branch', 0, { fromUser: true });
    }
  });

  stripMoves.forEach((btn) => {
    btn.addEventListener('click', () => go('main', Number(btn.dataset.goto), { fromUser: true }));
  });

  root.addEventListener('keydown', (event) => {
    if (event.target.closest('input, select, textarea')) return;
    if (event.key === 'ArrowRight' && !nextBtn.disabled && nextText.textContent === 'Next') {
      event.preventDefault();
      nextBtn.click();
    } else if (event.key === 'ArrowLeft' && !prevBtn.disabled) {
      event.preventDefault();
      prevBtn.click();
    }
  });

  root.addEventListener('pointerenter', pause);
  root.addEventListener('pointerleave', resume);
  root.addEventListener('focusin', pause);
  root.addEventListener('focusout', (event) => {
    if (!root.contains(event.relatedTarget)) resume();
  });
  document.addEventListener('visibilitychange', () => (document.hidden ? pause() : resume()));

  for (const el of [prevBtn, nextBtn, branchBtn, ...stripMoves]) el.disabled = false;
  updateChrome(current());
  drawAnnotations(current());

  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          window.setTimeout(startAutoplay, 600);
        }
      },
      { threshold: 0.55 },
    );
    io.observe(board);
  }
}

initWaitlist();
initDemo();

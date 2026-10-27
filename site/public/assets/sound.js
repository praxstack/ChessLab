// The desk board's sounds, made in the browser with Web Audio: no sound files.
// They're tuned to the page: a wooden piece set down on a printed board on a
// desk (a soft "tock" with a little paper under it), and the teacher's pencil
// tapping the board twice for check. Nothing beeps or buzzes.

let ctx = null;
let out = null;
let noise = null;
let muted = false;

try {
  muted = window.localStorage.getItem('pz.sound') === 'off';
} catch {
  muted = false;
}

export const isMuted = () => muted;

export function setMuted(on) {
  muted = on;
  try {
    window.localStorage.setItem('pz.sound', on ? 'off' : 'on');
  } catch {
    /* private mode: the switch still works for this visit */
  }
}

/** Browsers only let a page make sound after a tap, so this runs on the first one. */
export function wake() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  try {
    ctx = new AC();
  } catch {
    ctx = null;
    return;
  }
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.ratio.value = 3;
  out = ctx.createGain();
  out.gain.value = 0.7;
  out.connect(comp).connect(ctx.destination);
  // A second of soft noise, reused for every click and rustle.
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i += 1) d[i] = Math.random() * 2 - 1;
}

const vary = (x, spread = 0.05) => x * (1 + (Math.random() * 2 - 1) * spread);

// A short decaying tone: the body of a wooden piece, or a marimba bar.
function body(t, { freq, drop = 0.62, len = 0.11, gain = 0.5, type = 'sine' }) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(freq * drop, t + len * 0.6);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + len + 0.02);
}

// Filtered noise: the click of contact, or paper under the piece.
function hiss(t, { freq, q = 1, len = 0.02, gain = 0.25, kind = 'bandpass' }) {
  const s = ctx.createBufferSource();
  s.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = kind;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  s.connect(f).connect(g).connect(out);
  s.start(t, Math.random() * 0.8);
  s.stop(t + len + 0.02);
}

function tock(t, { pitch = 1, loud = 1 } = {}) {
  body(t, { freq: vary(185 * pitch), len: 0.1, gain: 0.55 * loud });
  body(t, { freq: vary(520 * pitch), drop: 0.8, len: 0.035, gain: 0.12 * loud, type: 'triangle' });
  hiss(t, { freq: vary(2100 * pitch), q: 1.4, len: 0.012, gain: 0.32 * loud });
  hiss(t + 0.004, { freq: 900, kind: 'lowpass', len: 0.05, gain: 0.08 * loud });
}

function marimba(t, freq, gain = 0.28) {
  body(t, { freq, drop: 0.995, len: 0.42, gain });
  body(t, { freq: freq * 4, drop: 0.995, len: 0.09, gain: gain * 0.25 });
}

const SOUNDS = {
  // Lifting a piece: the lightest touch of paper.
  pick(t) {
    hiss(t, { freq: 1500, q: 0.8, len: 0.025, gain: 0.07 });
  },
  move(t) {
    tock(t);
  },
  // Taking: the piece knocks the other one off, then lands.
  capture(t) {
    tock(t, { pitch: 1.35, loud: 0.7 });
    tock(t + 0.045, { pitch: 0.92, loud: 1.05 });
  },
  castle(t) {
    tock(t);
    tock(t + 0.09, { pitch: 1.12, loud: 0.8 });
  },
  // Check: the piece lands, then the pencil taps the board twice.
  check(t) {
    tock(t);
    hiss(t + 0.13, { freq: 3600, q: 3, len: 0.01, gain: 0.22 });
    hiss(t + 0.22, { freq: 3900, q: 3, len: 0.01, gain: 0.2 });
  },
  // Not allowed: a soft, muffled slide back. No buzzer.
  nope(t) {
    body(t, { freq: 120, drop: 0.7, len: 0.08, gain: 0.3 });
    hiss(t, { freq: 500, kind: 'lowpass', len: 0.09, gain: 0.12 });
  },
  promote(t) {
    tock(t);
    marimba(t + 0.08, 659.25, 0.18);
    marimba(t + 0.16, 987.77, 0.16);
  },
  // The end of a game: three warm wooden notes.
  end(t) {
    tock(t);
    marimba(t + 0.12, 523.25);
    marimba(t + 0.26, 659.25);
    marimba(t + 0.4, 783.99);
  },
  good(t) {
    marimba(t, 587.33, 0.2);
    marimba(t + 0.11, 880, 0.2);
  },
  hmm(t) {
    marimba(t, 392, 0.18);
    marimba(t + 0.13, 349.23, 0.16);
  },
};

export function play(name) {
  if (muted || !ctx || !SOUNDS[name]) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  try {
    SOUNDS[name](ctx.currentTime + 0.005);
  } catch {
    /* an audio hiccup never stops a move */
  }
}

/** A tiny tap on Android phones. iPhones and iPads don't allow this from a web page. */
export function buzz(ms = 8) {
  if (muted) return;
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* not supported */
  }
}

// Browser check for the app's move sounds and pens (web/src/sensory), like site/scripts/check-pens.mjs.
// Build the browser app first (npm run build:app), serve web/dist-app on PORT, then:
//   node scripts/check-app-sensory.cjs http://127.0.0.1:PORT [screenshot-dir]
// Sound is checked with a stub AudioContext that records what the synth makes; drawing with
// real mouse, touch and pen input through the Chrome DevTools protocol.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
let chromium;
try { ({chromium} = require('/opt/node22/lib/node_modules/playwright')); } catch { ({chromium} = require('playwright')); }

const base = process.argv[2] || 'http://127.0.0.1:4173';
const shots = process.argv[3] || '/tmp/claude-0/sensory-shots';
fs.mkdirSync(shots, {recursive: true});

// Each sound.js voice starts an oscillator (a wooden "tock" body near 185 Hz, a capture's first
// knock near 250 Hz) or a noise burst; the stub keeps them in window.__audio.
const audioStub = () => {
  window.__audio = [];
  const param = () => ({value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {}});
  const node = extra => ({connect: target => target || node(), disconnect() {}, start() {}, stop() {}, ...extra});
  class FakeAudioContext {
    constructor() { this.state = 'running'; this.sampleRate = 8000; this.destination = node(); window.__audio.push({kind: 'context', t: performance.now()}); }
    get currentTime() { return performance.now() / 1000; }
    resume() { return Promise.resolve(); }
    createDynamicsCompressor() { return node({threshold: param(), ratio: param()}); }
    createGain() { return node({gain: param()}); }
    createBuffer(channels, length) { return {getChannelData: () => new Float32Array(length)}; }
    createBiquadFilter() { return node({frequency: param(), Q: param(), type: 'lowpass'}); }
    createBufferSource() { window.__audio.push({kind: 'noise', t: performance.now()}); return node({buffer: null}); }
    createOscillator() {
      const frequency = param();
      frequency.setValueAtTime = f => window.__audio.push({kind: 'osc', f, t: performance.now()});
      return node({frequency, type: 'sine'});
    }
  }
  window.AudioContext = FakeAudioContext;
  window.webkitAudioContext = FakeAudioContext;
};

(async () => {
  const browser = await chromium.launch();
  const problems = [];
  try {
    const context = await browser.newContext({viewport: {width: 1280, height: 900}, hasTouch: true});
    await context.addInitScript(audioStub);
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    page.on('console', m => { if (m.type() === 'error') problems.push(`console error: ${m.text()}`); });
    page.on('pageerror', e => problems.push(`page error: ${e.message}`));
    const cdp = await context.newCDPSession(page);
    await page.goto(base);
    await page.getByText('Your games stay on this device').waitFor();

    const board = page.locator('.board').first();
    const ink = page.locator('.sn-ink .desk__drawn');
    const strokes = () => ink.locator('g.dr').count();
    const drawToggle = page.getByRole('button', {name: 'Draw', exact: true});
    const sq = name => board.locator(`.square[aria-label^="${name},"]`);
    const centre = async (square, dx = 0, dy = 0) => { const b = await sq(square).boundingBox(); return [b.x + b.width / 2 + dx, b.y + b.height / 2 + dy]; };
    const sounds = () => page.evaluate(() => window.__audio);
    const route = async (from, to) => { const [x0, y0] = await centre(from); const [x1, y1] = await centre(to); return [[x0, y0], [(x0 + x1) / 2 + 9, (y0 + y1) / 2 - 7], [x1, y1]]; };

    async function mouseStroke(from, to, button = 'left') {
      const pts = await route(from, to);
      await page.mouse.move(...pts[0]);
      await page.mouse.down({button});
      for (const p of pts.slice(1)) await page.mouse.move(...p, {steps: 6});
      await page.mouse.up({button});
    }
    async function penStroke(from, to) {
      const pts = await route(from, to);
      const send = (type, [x, y], buttons) => cdp.send('Input.dispatchMouseEvent', {type, x, y, button: type === 'mouseMoved' ? 'none' : 'left', buttons, clickCount: 1, pointerType: 'pen', force: 0.6});
      await send('mousePressed', pts[0], 1);
      for (const p of pts.slice(1)) await send('mouseMoved', p, 1);
      await send('mouseReleased', pts.at(-1), 0);
    }
    async function touchStroke(from, to) {
      const pts = await route(from, to);
      const touch = ([x, y]) => [{x, y, id: 3, radiusX: 4, radiusY: 4, force: 0.5}];
      await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: touch(pts[0])});
      for (const p of pts.slice(1)) {
        const [a, b] = [pts[pts.indexOf(p) - 1], p];
        for (let i = 1; i <= 4; i += 1) await cdp.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: touch([a[0] + (b[0] - a[0]) * i / 4, a[1] + (b[1] - a[1]) * i / 4])});
      }
      await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
    }
    const wait = ms => page.waitForTimeout(ms);

    // 1. A saved position study: the right mouse button still makes the study's saved marks.
    const fen = '4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1';
    await page.getByRole('button', {name: 'Set up position', exact: true}).click();
    const editor = page.getByRole('dialog', {name: 'Set up position', exact: true});
    await editor.getByLabel('Load FEN', {exact: true}).fill(fen);
    await editor.getByRole('button', {name: 'Load position', exact: true}).click();
    await editor.getByLabel('Study title', {exact: true}).fill('Pens study');
    await editor.getByRole('button', {name: 'Save & analyze position', exact: true}).click();
    await editor.waitFor({state: 'detached'});
    await page.getByRole('button', {name: 'Practice this position', exact: true}).waitFor();
    await mouseStroke('e1', 'e3', 'right');
    await page.locator('.study-arrows path[data-from="e1"][data-to="e3"]').waitFor({state: 'attached'});
    assert.equal(await strokes(), 0, 'In a study, a right-drag is a saved study arrow, not a pen arrow');
    // ...and Draw mode's left button draws pens on the same board alongside them.
    await drawToggle.click();
    assert.equal(await drawToggle.getAttribute('aria-pressed'), 'true');
    await mouseStroke('b2', 'c6');
    assert.equal(await strokes(), 1, 'Draw mode: a left-drag draws a pen line in a study');
    await page.screenshot({path: path.join(shots, '01-study-marks-and-pens.png')});
    await drawToggle.click();

    // 2. Practice it against a bot: a live game, White to move.
    await page.getByRole('button', {name: 'Practice this position', exact: true}).click();
    const setup = page.getByRole('dialog', {name: 'Practice this position', exact: true});
    await setup.getByRole('button', {name: 'Start position practice', exact: true}).click();
    await setup.waitFor({state: 'detached'});
    await sq('e4').and(page.locator('[aria-label="e4, white pawn"]')).waitFor();
    await wait(300);
    assert.equal(await strokes(), 0, 'A new position starts with no drawings');

    // Pens on a live game: mouse in Draw mode, touch in Draw mode, and a pen with Draw mode off.
    await drawToggle.click();
    assert.equal(await drawToggle.getAttribute('aria-pressed'), 'true');
    assert.ok(await board.evaluate(el => el.classList.contains('is-drawing')), 'The board shows Draw mode');
    await mouseStroke('a2', 'c5');
    assert.equal(await strokes(), 1, 'mouse stroke');
    assert.ok(await ink.locator('g.dr--free path').first().getAttribute('d'), 'the stroke is an SVG path');
    await page.getByRole('button', {name: /^Idea/}).click();
    await touchStroke('f2', 'g6');
    assert.equal(await strokes(), 2, 'touch stroke in Draw mode');
    assert.equal(await ink.locator('g.dr.tone--blue').count(), 1, 'the Idea ink is blue');
    // With Draw mode on, clicking squares does not move a piece.
    await sq('e4').click(); await sq('d5').click(); await wait(300);
    assert.equal(await page.locator('[aria-label="e4, white pawn"]').count(), 1, 'Draw mode: a click-click does not move');
    assert.equal(await strokes(), 4, 'Draw mode: each click leaves a dot of ink instead');
    await page.getByRole('button', {name: /^Theirs/}).click();
    await page.getByRole('button', {name: 'Arrow from one square to another'}).click();
    await mouseStroke('d5', 'e4');
    assert.equal(await ink.locator('g.dr--arrow.tone--red').count(), 1, 'a red Theirs arrow');
    await page.getByRole('button', {name: 'Pen: smooth ink, freehand'}).click();
    await page.getByRole('button', {name: /^Mine/}).click();
    await page.screenshot({path: path.join(shots, '02-draw-mode-desktop.png')});
    await drawToggle.click();
    assert.equal(await drawToggle.getAttribute('aria-pressed'), 'false');
    await penStroke('h2', 'h6');
    assert.equal(await strokes(), 6, 'a stylus draws even with Draw mode off');
    assert.equal(await ink.locator('g.dr--free.dr--fill.tone--green').count(), 1, 'a stylus line follows pressure (a filled outline)');
    await wait(450); // the palm-rejection window after the stylus lifts

    // Undo, show/hide, and flipping the board flips the drawing.
    await page.getByRole('button', {name: 'Undo the last drawing'}).click();
    assert.equal(await strokes(), 5, 'undo');
    const show = page.getByRole('button', {name: 'Show drawings'});
    await show.click();
    assert.ok(await page.locator('.sn-ink').evaluate(el => el.classList.contains('is-hidden')), 'hide');
    await show.click();
    const firstBox = () => ink.locator('g.dr--free path').first().evaluate(p => { const b = p.getBBox(); return [b.x, b.y, b.width, b.height]; });
    const before = await firstBox();
    await page.getByRole('button', {name: 'Flip board', exact: true}).click();
    await page.locator('.board .square').first().and(page.locator('[aria-label^="h1"]')).waitFor();
    const flipped = await firstBox();
    assert.ok(Math.abs(flipped[0] - (80 - before[0] - before[2])) < 0.6 && Math.abs(flipped[1] - (80 - before[1] - before[3])) < 0.6, `flip mirrors the drawing: ${before} -> ${flipped}`);
    await page.screenshot({path: path.join(shots, '03-flipped.png')});
    await page.getByRole('button', {name: 'Flip board', exact: true}).click();
    await page.getByRole('button', {name: 'Clear all drawings'}).click();
    assert.equal(await strokes(), 0, 'clear');
    assert.ok(await page.getByRole('button', {name: 'Clear all drawings'}).isDisabled(), 'nothing left to clear');
    await page.getByRole('button', {name: 'Undo the last drawing'}).click();
    assert.equal(await strokes(), 5, 'a clear can be undone');

    // 3. Draw mode off: a click-click capture plays, with sound; the position change clears the pens.
    const mark = (await sounds()).length;
    await sq('e4').click();
    await wait(80);
    const picked = (await sounds()).slice(mark);
    assert.ok(picked.some(s => s.kind === 'noise') && !picked.some(s => s.kind === 'osc'), `pick-up sound: ${JSON.stringify(picked)}`);
    await sq('d5').click();
    await page.locator('[aria-label="d5, white pawn"]').waitFor();
    await wait(150);
    const capture = (await sounds()).slice(mark).filter(s => s.kind === 'osc').map(s => Math.round(s.f));
    assert.ok(capture.some(f => f >= 230 && f <= 270), `capture sound (first knock ~250 Hz): ${capture}`);
    assert.equal(await strokes(), 0, 'a new position clears the pens');
    // The bot's reply: a king move sounds as a plain move.
    await page.waitForFunction(() => !document.querySelector('[aria-label="e8, black king"]'), null, {timeout: 30000});
    await wait(150);
    const after = (await sounds()).slice(mark).filter(s => s.kind === 'osc');
    const knock = after.find(s => s.f >= 230 && s.f <= 270);
    const reply = after.filter(s => s.t > knock.t + 20).map(s => Math.round(s.f));
    assert.ok(reply.some(f => f >= 170 && f <= 200), `bot move sound (~185 Hz tock): ${reply}`);
    // An illegal try makes the soft "nope" (a 120 Hz thud).
    const beforeNope = (await sounds()).length;
    await sq('d5').click(); await sq('a8').click(); await wait(100);
    const nope = (await sounds()).slice(beforeNope).filter(s => s.kind === 'osc').map(s => Math.round(s.f));
    assert.ok(nope.includes(120), `illegal move sound: ${nope}`);

    // 4. Sound off in Settings silences the board.
    await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('chesslab-settings') || '{}'); s.sound = false; localStorage.setItem('chesslab-settings', JSON.stringify(s)); });
    await page.reload();
    await page.getByText('Your games stay on this device').waitFor();
    await page.locator('.board').first().click({position: {x: 2, y: 2}});
    const quiet = (await sounds()).length;
    const king = await page.locator('.board .square[aria-label$="white king"]').getAttribute('aria-label');
    await sq(king.slice(0, 2)).click(); await wait(100);
    assert.equal((await sounds()).slice(quiet).length, 0, 'Move sounds off: no pick-up sound');

    // 5. Phone width: the toolbar wraps, nothing scrolls sideways.
    await page.setViewportSize({width: 390, height: 844});
    await wait(200);
    await page.getByRole('button', {name: 'Draw', exact: true}).click();
    await touchStroke('c2', 'f5');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal scroll at phone width');
    await page.getByRole('button', {name: 'Draw', exact: true}).scrollIntoViewIfNeeded();
    await page.screenshot({path: path.join(shots, '04-phone.png'), fullPage: false});
    await page.locator('.board').first().scrollIntoViewIfNeeded();
    await page.screenshot({path: path.join(shots, '05-phone-board.png'), fullPage: false});

    assert.deepEqual(problems, [], 'console errors');
    console.log('App sensory check passed: sounds for pick-up, capture, bot move and illegal try; pens with mouse, touch and pen; undo, clear, show/hide, flip, study marks; moves with Draw mode off.');
  } finally {
    await browser.close();
  }
})().catch(err => { console.error(err); process.exit(1); });

// Browser check for the app's move sounds and pens (web/src/sensory), like site/scripts/check-pens.mjs.
// Build the browser app first (npm run build:app), serve web/dist-app on PORT, then:
//   node scripts/check-app-sensory.cjs http://127.0.0.1:PORT [screenshot-dir]
// The pens follow the puzzle page's Move / Faint / Draw switch: Move moves pieces and hides the
// drawings, Faint moves pieces and shows them faint, Draw draws and moves nothing.
// Sound is checked with a stub AudioContext that records what the synth makes; drawing with
// real mouse, touch and pen input through the Chrome DevTools protocol.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
let chromium;
try { ({chromium} = require('/opt/node22/lib/node_modules/playwright')); } catch { ({chromium} = require('playwright')); }

const base = process.argv[2] || 'http://127.0.0.1:4173';
const shots = process.argv[3] || '/tmp/claude-0/sensory-shots-v2';
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
    const context = await browser.newContext({viewport: {width: 1280, height: 860}, hasTouch: true});
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
    const modeButton = m => page.locator(`.sn-pens__modes [data-mode="${m}"]`);
    const modeIs = async m => (await modeButton(m).getAttribute('aria-checked')) === 'true';
    const setMode = async m => { await modeButton(m).click(); assert.ok(await modeIs(m), `${m} is picked`); await page.waitForTimeout(220); /* the switch's colour fade */ };
    const inkLook = () => ink.evaluate(g => ({display: g.getAttribute('display'), opacity: g.getAttribute('opacity')}));
    const sq = name => board.locator(`.square[aria-label^="${name},"]`);
    const centre = async (square, dx = 0, dy = 0) => { const b = await sq(square).boundingBox(); return [b.x + b.width / 2 + dx, b.y + b.height / 2 + dy]; };
    const sounds = () => page.evaluate(() => window.__audio);
    const route = async (from, to) => { const [x0, y0] = await centre(from); const [x1, y1] = await centre(to); return [[x0, y0], [(x0 + x1) / 2 + 9, (y0 + y1) / 2 - 7], [x1, y1]]; };
    const pieces = () => board.locator('.square').evaluateAll(list => list.map(b => b.getAttribute('aria-label')).filter(l => !l.includes('empty')).join('|'));

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
    // Every button in the pens shows its name as text you can see, not only in a tooltip.
    async function namesShow(where) {
      const buttons = await page.locator('.sn-pens button').evaluateAll(list => list.map(b => {
        const r = b.getBoundingClientRect(), text = b.innerText.trim(), seen = [...b.querySelectorAll('span, svg')].every(n => { const q = n.getBoundingClientRect(); return q.right <= r.right + 0.5 && q.left >= r.left - 0.5; });
        return {name: b.dataset.tool || b.dataset.size || b.dataset.color || b.dataset.mode || b.getAttribute('aria-label'), text, w: r.width, seen};
      }));
      for (const b of buttons) assert.ok(b.text && b.w > 0 && b.seen, `${where}: "${b.name}" shows its name (${JSON.stringify(b)})`);
      return buttons.length;
    }

    // 0. A fresh page opens in Move with the drawing kit put away.
    assert.ok(await modeIs('move'), 'a fresh page opens in Move');
    assert.equal(await page.locator('.sn-pens__kit').count(), 0, 'Move: the drawing kit is put away');
    assert.deepEqual(await page.locator('.sn-pens__modebtn').allInnerTexts(), ['Move', 'Faint', 'Draw']);

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
    // ...and Draw's left button draws pens on the same board alongside them.
    await setMode('draw');
    await mouseStroke('b2', 'c6');
    assert.equal(await strokes(), 1, 'Draw: a left-drag draws a pen line in a study');
    await wait(1500); // the first study mark is being saved; marks wait for it
    await mouseStroke('g1', 'g3', 'right');
    await page.locator('.study-arrows path[data-from="g1"][data-to="g3"]').waitFor({state: 'attached'});
    assert.equal(await strokes(), 1, 'Draw in a study: the right button still makes study marks');
    await page.screenshot({path: path.join(shots, '00-study-marks-and-pens.png')});
    await setMode('move');

    // 2. Practice it against a bot: a live game, White to move. A new game starts with no drawings.
    await page.getByRole('button', {name: 'Practice this position', exact: true}).click();
    const setup = page.getByRole('dialog', {name: 'Practice this position', exact: true});
    await setup.getByRole('button', {name: 'Start position practice', exact: true}).click();
    await setup.waitFor({state: 'detached'});
    await sq('e4').and(page.locator('[aria-label="e4, white pawn"]')).waitFor();
    await wait(300);
    assert.equal(await strokes(), 0, 'A new game starts with no drawings');
    assert.ok(await modeIs('move'), 'still in Move');

    // Move: nothing draws, not a stylus, not a right-drag, not a finger.
    await penStroke('h2', 'h6');
    await wait(450); // the palm-rejection window after a stylus lifts
    await mouseStroke('a2', 'c4', 'right');
    await touchStroke('f2', 'g5');
    await wait(200);
    assert.equal(await strokes(), 0, 'Move: a stylus, a right-drag and a finger draw nothing');
    assert.ok(!(await board.evaluate(el => el.classList.contains('is-drawing'))), 'Move: the board is not in drawing mode');

    // Draw: mouse, touch and stylus draw, and pieces don't move.
    await setMode('draw');
    assert.ok(await board.evaluate(el => el.classList.contains('is-drawing')), 'The board shows Draw');
    const named = await namesShow('Draw');
    assert.ok(named >= 3 + 5 + 3 + 3 + 2, `every mode, tool, size and ink button is there (${named})`);
    await mouseStroke('a2', 'c5');
    assert.equal(await strokes(), 1, 'mouse stroke');
    assert.ok(await ink.locator('g.dr--free path').first().getAttribute('d'), 'the stroke is an SVG path');
    await page.getByRole('button', {name: /^Idea/}).click();
    await touchStroke('f2', 'g6');
    assert.equal(await strokes(), 2, 'touch stroke in Draw');
    assert.equal(await ink.locator('g.dr.tone--blue').count(), 1, 'the Idea ink is blue');
    const beforeDraw = await pieces();
    await sq('e4').click(); await sq('d5').click(); await wait(300);
    assert.equal(await pieces(), beforeDraw, 'Draw: a click-click does not move a piece');
    assert.equal(await strokes(), 4, 'Draw: each click leaves a dot of ink instead');
    await page.getByRole('button', {name: /^Theirs/}).click();
    await page.getByRole('button', {name: 'Arrow from one square to another'}).click();
    await mouseStroke('d5', 'e4');
    assert.equal(await ink.locator('g.dr--arrow.tone--red').count(), 1, 'a red Theirs arrow');
    await page.getByRole('button', {name: 'Pen: smooth ink, freehand'}).click();
    await page.getByRole('button', {name: /^Mine/}).click();
    await penStroke('h2', 'h6');
    assert.equal(await strokes(), 6, 'a stylus draws in Draw');
    assert.equal(await ink.locator('g.dr--free.dr--fill.tone--green').count(), 1, 'a stylus line follows pressure (a filled outline)');
    await wait(450);
    assert.equal(await pieces(), beforeDraw, 'Draw: no stroke moved a piece');
    assert.deepEqual(await inkLook(), {display: null, opacity: null}, 'Draw: the drawings show in full');

    // Undo, clear, and flipping the board flips the drawing.
    await page.getByRole('button', {name: 'Undo the last drawing'}).click();
    assert.equal(await strokes(), 5, 'undo');
    const firstBox = () => ink.locator('g.dr--free path').first().evaluate(p => { const b = p.getBBox(); return [b.x, b.y, b.width, b.height]; });
    const before = await firstBox();
    await page.getByRole('button', {name: 'Flip board', exact: true}).click();
    await page.locator('.board .square').first().and(page.locator('[aria-label^="h1"]')).waitFor();
    const flipped = await firstBox();
    assert.ok(Math.abs(flipped[0] - (80 - before[0] - before[2])) < 0.6 && Math.abs(flipped[1] - (80 - before[1] - before[3])) < 0.6, `flip mirrors the drawing: ${before} -> ${flipped}`);
    await page.getByRole('button', {name: 'Flip board', exact: true}).click();
    await page.getByRole('button', {name: 'Clear all drawings'}).click();
    assert.equal(await strokes(), 0, 'clear');
    assert.ok(await page.getByRole('button', {name: 'Clear all drawings'}).isDisabled(), 'nothing left to clear');
    await page.getByRole('button', {name: 'Undo the last drawing'}).click();
    assert.equal(await strokes(), 5, 'a clear can be undone');
    await page.locator('.sn-pens').scrollIntoViewIfNeeded();
    await page.getByText('Study saved.').waitFor({state: 'detached', timeout: 15000}).catch(() => {}); // a toast would cover the toolbar
    await page.screenshot({path: path.join(shots, 'desktop-draw.png')});

    // Faint: the drawings stay, at 50%, and nothing new draws; pieces move, with sound.
    await setMode('faint');
    assert.deepEqual(await inkLook(), {display: null, opacity: '0.5'}, 'Faint shows the drawings at 50%');
    assert.equal(await page.locator('.sn-pens__kit').count(), 0, 'Faint: the drawing kit is put away');
    assert.equal(await page.locator('.sn-pens__fade-out').innerText(), '50%');
    await page.locator('.sn-pens__fade input').fill('30');
    assert.deepEqual(await inkLook(), {display: null, opacity: '0.3'}, 'How faint: 30%');
    await page.locator('.sn-pens__fade input').fill('50');
    await namesShow('Faint');
    await page.screenshot({path: path.join(shots, 'desktop-faint.png')});
    await penStroke('a2', 'a6'); await wait(450);
    await mouseStroke('b2', 'b6');
    await mouseStroke('b2', 'c6', 'right');
    assert.equal(await strokes(), 5, 'Faint: nothing new draws');
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
    assert.equal(await strokes(), 5, 'Faint: the drawings stay while the game goes on');
    assert.deepEqual(await inkLook(), {display: null, opacity: '0.5'}, 'Faint: still faint after the move');
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
    await sq('a8').click(); await wait(50); // put the selection away

    // Move: drawings hidden, a click-click moves a piece and leaves no ink.
    await setMode('move');
    assert.deepEqual(await inkLook(), {display: 'none', opacity: null}, 'Move hides the drawings');
    await namesShow('Move');
    await page.screenshot({path: path.join(shots, 'desktop-move.png')});
    await sq('d5').click(); await sq('d6').click();
    await page.locator('[aria-label="d6, white pawn"]').waitFor();
    assert.equal(await strokes(), 5, 'Move: a click-click moves the pawn and leaves no ink');

    // The mode switch is a radio group: arrow keys move along it and don't step through the game.
    await page.waitForFunction(() => document.querySelectorAll('.board .square[aria-label*="black king"]').length === 1);
    await wait(1200); // let the bot answer first
    const beforeKeys = await pieces();
    await modeButton('move').focus();
    await page.keyboard.press('ArrowRight');
    assert.ok(await modeIs('faint'), 'ArrowRight: Move -> Faint');
    assert.ok(await modeButton('faint').evaluate(b => b === document.activeElement), 'focus follows');
    await page.keyboard.press('ArrowLeft');
    assert.ok(await modeIs('move'), 'ArrowLeft: Faint -> Move');
    await wait(150);
    assert.equal(await pieces(), beforeKeys, 'arrow keys on the switch leave the moves alone');

    // Coming back: like the puzzle page, never in Draw; the last of Move/Faint and its level stay.
    await setMode('faint');
    await page.locator('.sn-pens__fade input').fill('70');
    await setMode('draw');
    await page.reload();
    await page.getByText('Your games stay on this device').waitFor();
    assert.ok(await modeIs('faint'), 'a reload never opens in Draw, and keeps the last other mode');
    assert.equal(await page.locator('.sn-pens__fade-out').innerText(), '70%', 'and its faint level');
    await page.locator('.sn-pens__fade input').fill('50');
    await setMode('move');
    await page.reload();
    await page.getByText('Your games stay on this device').waitFor();
    assert.ok(await modeIs('move'), 'Move after Move');

    // 3. Sound off in Settings silences the board.
    await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('chesslab-settings') || '{}'); s.sound = false; localStorage.setItem('chesslab-settings', JSON.stringify(s)); });
    await page.reload();
    await page.getByText('Your games stay on this device').waitFor();
    await page.locator('.board').first().click({position: {x: 2, y: 2}});
    const quiet = (await sounds()).length;
    const king = await page.locator('.board .square[aria-label$="white king"]').getAttribute('aria-label');
    await sq(king.slice(0, 2)).click(); await wait(100);
    assert.equal((await sounds()).slice(quiet).length, 0, 'Move sounds off: no pick-up sound');
    await sq(king.slice(0, 2)).click();

    // 4. Phone width: every mode fits with names showing, nothing scrolls sideways.
    await page.setViewportSize({width: 390, height: 844});
    await wait(200);
    const noSideScroll = async where => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${where}: no horizontal scroll at phone width`);
    const phoneShot = async name => {
      // Show the whole toolbar above the bottom navigation, with as much board as fits.
      await page.evaluate(() => { const r = document.querySelector('.sn-pens').getBoundingClientRect(); scrollBy(0, r.bottom - (innerHeight - 76)); });
      await wait(100);
      await page.screenshot({path: path.join(shots, name)});
    };
    await setMode('draw');
    await page.evaluate(() => { const b = document.querySelector('.board').getBoundingClientRect(); scrollBy(0, b.top - 8); });
    await touchStroke('c2', 'f5');
    await page.getByRole('button', {name: /^Theirs/}).click();
    await page.getByRole('button', {name: 'Arrow from one square to another'}).click();
    await touchStroke('e8', 'e5');
    await page.getByRole('button', {name: 'Pen: smooth ink, freehand'}).click();
    await page.getByRole('button', {name: /^Mine/}).click();
    assert.equal(await strokes(), 2, 'phone: a finger draws in Draw');
    await namesShow('phone Draw');
    await noSideScroll('Draw');
    await phoneShot('phone-draw.png');
    await setMode('faint');
    await namesShow('phone Faint');
    await noSideScroll('Faint');
    await phoneShot('phone-faint.png');
    await setMode('move');
    await namesShow('phone Move');
    await noSideScroll('Move');
    await phoneShot('phone-move.png');

    assert.deepEqual(problems, [], 'console errors');
    console.log('App sensory check passed: Move (pieces move, nothing draws, drawings hidden), Faint (drawings at the faint level, pieces move, nothing draws), Draw (mouse, touch and stylus draw, pieces stay); names on every button; arrow keys on the switch; reopening never in Draw; sounds for pick-up, capture, bot move and illegal try; undo, clear, flip, study marks; phone width.');
  } finally {
    await browser.close();
  }
})().catch(err => { console.error(err); process.exit(1); });

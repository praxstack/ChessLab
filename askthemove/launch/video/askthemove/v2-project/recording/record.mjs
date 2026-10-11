// Records fresh AskTheMove demo footage from ChessLab main (fe3d7c9) running on http://127.0.0.1:8802.
//   ./start-server.sh --fresh && node record.mjs [story|bots|tour|all]
// Same capture as the first demo kit: CDP screencast of a 1440x810 CSS page at 4/3 scale = native 1920x1080,
// a drawn cursor that follows the real mouse, moves made by clicking squares. Output: clips/NN-name.mp4.
import { chromium } from '/home/claude/chesslab-video/node_modules/playwright/index.mjs';
import { Chess } from '/home/claude/chesslab-video/node_modules/chess.js/dist/esm/chess.js';
import { Actor, Screencast, sleep, launchBrowser, newRecordingPage } from './lib/recorder.mjs';
import { topMoves } from './lib/engine.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const V = '/tmp/claude-0/-home-claude/b1b296ce-ac43-5e7c-9fa8-201429abfd6d/scratchpad/video/atm2';
const APP = 'http://127.0.0.1:8802/';
const USER = { username: 'maya', password: 'knight-fork-2026' };
const PGN = `[Event "Rapid game"]
[White "Opponent"]
[Black "maya"]
[Result "1-0"]

1. e4 e5 2. Nf3 d6 3. Bc4 Bg4 4. Nc3 g6 5. Nxe5 Bxd1 6. Bxf7+ Ke7 7. Nd5# 1-0
`;
const which = process.argv[2] || 'all';
const log = [];
const rand = (a, b) => a + Math.random() * (b - a);
mkdirSync(`${V}/clips`, { recursive: true });

async function clip(page, name, body) {
  const sc = new Screencast(page, `${V}/raw/${name}`);
  await sc.start();
  const t0 = Date.now(), marks = [];
  const mark = (what) => { marks.push({ what, t: +((Date.now() - t0) / 1000).toFixed(2) }); console.log(name, what, marks.at(-1).t); };
  try { await body(mark); }
  catch (error) { await page.screenshot({ path: `${V}/explore/fail-${name}.png` }); await sc.stop(); throw error; }
  await sc.stop();
  sc.encode(`${V}/clips/${name}.mp4`);
  log.push({ name, frames: sc.frames.length, seconds: +((Date.now() - t0) / 1000).toFixed(2), marks });
  writeFileSync(`${V}/clips/record-log.json`, JSON.stringify(log, null, 2));
  console.log('recorded', name, sc.frames.length, 'frames');
}

const square = (scope, sq) => scope.locator(`.board button[aria-label^="${sq},"]`);
async function settle(page) {
  await page.locator('.analysis-loading').waitFor({ state: 'detached', timeout: 30000 }).catch(() => {});
  await page.locator('.engine-receipt').first().waitFor({ timeout: 30000 }).catch(() => {});
  await sleep(350);
}
async function bringTo(a, page, loc, targetY, { from = [1250, 330], duration = 900 } = {}) {
  await loc.waitFor({ state: 'attached', timeout: 30000 });
  const box = await loc.boundingBox();
  const delta = Math.round(box.y - targetY);
  if (Math.abs(delta) < 8) return;
  await a.moveTo(from[0] + rand(-20, 20), from[1] + rand(-15, 15));
  await sleep(rand(120, 220));
  await a.scrollBy(delta, { duration });
  await sleep(250);
}
async function playMove(a, scope, uci, { think = [700, 1400] } = {}) {
  await sleep(rand(...think));
  await a.click(square(scope, uci.slice(0, 2)), { jitter: 0.12, settle: rand(120, 200) });
  await sleep(rand(320, 520));
  await a.click(square(scope, uci.slice(2, 4)), { jitter: 0.12, settle: rand(120, 200) });
}
async function movesPlayed(page) {
  return page.locator('.move-list button[aria-label^="Move "]').evaluateAll(els => els.map(e => e.getAttribute('aria-label').split(', ').at(-1)));
}
async function signedInPage(browser) {
  const { ctx, page } = await newRecordingPage(browser);
  page.on('pageerror', e => console.log('pageerror', e.message));
  await page.goto(APP, { waitUntil: 'networkidle' });
  let status = await page.evaluate(async u => (await fetch('/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(u) })).status, USER);
  if (status !== 200) status = await page.evaluate(async u => (await fetch('/api/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(u) })).status, USER);
  if (status !== 200 && status !== 201) throw new Error(`sign-in failed ${status}`);
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('.engine-status.ready').waitFor({ timeout: 30000 });
  await page.locator('.account-button', { hasText: USER.username }).waitFor();
  await sleep(800);
  return { ctx, page, a: new Actor(page) };
}

async function story(browser) {
  const { ctx, page, a } = await signedInPage(browser);
  await a.place(980, 560);

  // 01: paste a lost game (Légal's mate, maya has Black), import it, view it from Black, play it through.
  await clip(page, '01-import', async (mark) => {
    await sleep(1000);
    mark('click import');
    await a.click(page.locator('.import-invitation'));
    await page.locator('#pgn-input').waitFor();
    await sleep(800);
    await a.click(page.locator('#pgn-input'));
    await sleep(400);
    mark('paste');
    await page.keyboard.insertText(PGN);
    await sleep(1800);
    mark('import & review');
    await a.click(page.getByRole('button', { name: /Import & review/ }));
    await page.locator('.player-tag', { hasText: 'PGN' }).waitFor();
    mark('review page');
    await sleep(1300);
    mark('flip');
    await a.click(page.locator('.own-player button[aria-label="Flip board"]'));
    await settle(page);
    await sleep(1000);
    await bringTo(a, page, page.locator('.transport'), 728, { from: [1230, 420], duration: 1000 });
    await sleep(500);
    mark('play');
    await a.click(page.getByRole('button', { name: 'Play move history' }));
    await page.locator('.move-list button[aria-current=step][aria-label*="Nd5#"]').waitFor({ timeout: 40000 });
    mark('mate');
    await a.moveTo(1180, 700, { duration: 800 });
    await sleep(2200);
  });

  // 02: whole-game review, the report (opening, graph, grades, key moves), then the evidence for 5...Bxd1.
  await clip(page, '02-review', async (mark) => {
    await sleep(600);
    await bringTo(a, page, page.locator('.game-report'), 150, { from: [1240, 420], duration: 1000 });
    await sleep(400);
    mark('review whole game');
    await a.click(page.getByRole('button', { name: 'Review whole game' }));
    await sleep(1000);
    await a.moveTo(1205, 470, { duration: 900 });
    await page.getByRole('button', { name: 'Review complete' }).waitFor({ timeout: 120000 });
    mark('review complete');
    await sleep(2200);
    await bringTo(a, page, page.locator('.report-counts'), 140, { from: [1230, 360], duration: 1100 });
    mark('counts');
    await sleep(1800);
    mark('click bxd1');
    await a.click(page.locator('.key-moves button[aria-label*="Bxd1"]'));
    await sleep(500);
    await settle(page);
    await bringTo(a, page, page.locator('.coach-message'), 110, { from: [1230, 420], duration: 1000 });
    await page.locator('.engine-receipt').waitFor({ timeout: 30000 });
    mark('evidence');
    await sleep(700);
    await a.moveTo(1200, 560, { duration: 900 });
    await sleep(3400);
  });

  // 03: compare before the move (the engine's choice, 5...dxe5), then try that line: 5...dxe5 6.Qxg4.
  await clip(page, '03-variation', async (mark) => {
    await sleep(600);
    mark('compare');
    await a.click(page.getByRole('button', { name: 'Compare before move' }));
    await page.locator('.candidate-lines').waitFor({ timeout: 30000 });
    await page.locator('.engine-receipt').waitFor({ timeout: 30000 });
    mark('compared');
    await sleep(2800);
    mark('try variation');
    await a.click(page.getByRole('button', { name: /Try a variation/ }));
    await page.locator('#branch-question').waitFor();
    await sleep(900);
    mark('dxe5');
    await playMove(a, page, 'd6e5', { think: [400, 700] });
    await sleep(1100);
    mark('qxg4');
    await playMove(a, page, 'd1g4', { think: [600, 900] });
    await sleep(500);
    await settle(page);
    mark('variation lab');
    await a.moveTo(1180 + rand(-20, 20), 560 + rand(-20, 20), { duration: 700 });
    await sleep(3200);
  });

  writeFileSync(`${V}/clips/practice-text.txt`, await page.locator('.review-practice').innerText().catch(() => ''));
  await ctx.close();
}

// 04: practice the key moves from this game as Black, with the answer hidden until asked for. The positions come
// from the saved review (3...Bg4, 4...g6 and 5...Bxd1 in the recorded run); each is solved with the review's own
// recommendation, except 5...Bxd1, where maya first repeats the capture, reads why it fails, asks for a hint
// and then finds the move.
async function practice(browser) {
  const { ctx, page, a } = await signedInPage(browser);
  await a.place(980, 560);
  await page.locator('.navigation').getByText('My games', { exact: true }).click();
  await page.getByText('Opponent vs maya').first().click();
  await page.locator('.player-tag', { hasText: 'PGN' }).waitFor();
  await page.getByRole('button', { name: 'Practice key moves' }).waitFor({ timeout: 30000 });
  const gameId = await page.evaluate(async () => (await (await fetch('/api/games')).json()).games?.find(g => g.moves?.length === 13 && /Opponent/.test(JSON.stringify(g)))?.id ?? null).catch(() => null);
  const report = await page.evaluate(async (id) => (await (await fetch(`/api/games/${id}/review`)).json()), gameId);
  const best = Object.fromEntries((report.review || report.report || report).entries.map(e => [`${e.number}${e.color === 'w' ? '.' : '…'} ${e.san}`, e.analysis.bestmove]));
  console.log('best moves', JSON.stringify(best));
  await sleep(1500);
  await clip(page, '04-practice', async (mark) => {
    await sleep(700);
    mark('practice key moves');
    await a.click(page.getByRole('button', { name: 'Practice key moves' }));
    const rp = page.locator('.review-practice');
    await rp.locator('select[aria-label="Practice side"]').waitFor();
    await sleep(900);
    await page.locator('select[aria-label="Practice side"]').selectOption('b');
    await sleep(600);
    mark('start');
    await a.click(rp.getByRole('button', { name: /Start practice/ }));
    for (let n = 1; n <= 5; n++) {
      await rp.getByText(`POSITION ${n} OF`).waitFor({ timeout: 30000 });
      const orig = (await rp.locator('.practice-heading p').innerText()).replace(/^Original move: /, '').split(' · ')[0].replace('...', '…').trim();
      mark(`position ${n}: ${orig}`);
      await sleep(1500);
      if (/Bxd1/.test(orig)) {
        mark('retry the capture');
        await playMove(a, rp, 'g4d1', { think: [500, 800] });
        await rp.getByRole('button', { name: 'Try again' }).waitFor({ timeout: 30000 });
        mark('feedback');
        await a.moveTo(1300, 520, { duration: 700 });
        await sleep(4200);
        await a.click(rp.getByRole('button', { name: 'Try again' }));
        await sleep(900);
        mark('hint');
        await a.click(rp.getByRole('button', { name: 'Give me a hint' }));
        await rp.locator('.practice-hint').waitFor({ timeout: 30000 });
        mark('hinted');
        await sleep(2600);
      }
      const mv = best[orig];
      if (!mv) throw new Error('no saved recommendation for ' + orig);
      mark('play ' + mv);
      await playMove(a, rp, mv, { think: [500, 900] });
      await rp.getByText('FOUND IT').waitFor({ timeout: 30000 });
      mark('found');
      await a.moveTo(1500, 520, { duration: 700 });
      await sleep(2600);
      const next = rp.getByRole('button', { name: /Next practice position|See practice results/ });
      const last = /See practice results/.test(await next.innerText());
      mark(last ? 'results' : 'next');
      await a.click(next);
      if (last) { await sleep(3000); break; }
    }
  });
  writeFileSync(`${V}/clips/practice-text.txt`, await page.locator('.review-practice').innerText().catch(() => ''));
  await ctx.close();
}

async function bots(browser) {
  const { ctx, page, a } = await signedInPage(browser);
  await a.place(980, 560);
  await clip(page, '05-bots', async (mark) => {
    await sleep(900);
    const roster = page.locator('.bot-roster');
    const header = page.locator('button.bot-group-title', { hasText: 'Developing' });
    const rb = await roster.boundingBox();
    await a.moveTo(rb.x + rb.width * 0.55, rb.y + rb.height * 0.5);
    await sleep(300);
    mark('scroll roster');
    const hb = await header.boundingBox();
    await a.scrollBy(Math.round(hb.y - rb.y - 8), { duration: 1100 });
    await sleep(500);
    await a.click(header);
    await sleep(900);
    const card = page.locator('button.bot-card[aria-label^="Play Barnaby"]');
    const rb2 = await roster.boundingBox(), hb2 = await header.boundingBox();
    if (Math.abs(hb2.y - rb2.y - 4) > 6) { await a.scrollBy(Math.round(hb2.y - rb2.y - 4), { duration: 700 }); await sleep(500); }
    mark('barnaby');
    await a.click(card);
    await sleep(1800);
    mark('options');
    await a.click(page.locator('details.play-options > summary'));
    const slider = page.locator('.options-body input[type=range]');
    await slider.waitFor();
    await sleep(900);
    const sb = await slider.boundingBox();
    const value = Number(await slider.inputValue()); const min = Number(await slider.getAttribute('min')), max = Number(await slider.getAttribute('max'));
    const thumb = 16, xFor = v => sb.x + thumb / 2 + (v - min) / (max - min) * (sb.width - thumb);
    await a.moveTo(xFor(value) + rand(-3, 3), sb.y + sb.height / 2 + 14, { duration: 700 });
    await sleep(500);
    await a.moveTo(xFor(1200), sb.y + sb.height / 2, { duration: 450 });
    await sleep(200);
    await page.mouse.down(); await sleep(80); await page.mouse.up();
    await sleep(300);
    for (let i = 0; i < 6 && Number(await slider.inputValue()) !== 1200; i++) {
      await page.keyboard.press(Number(await slider.inputValue()) < 1200 ? 'ArrowRight' : 'ArrowLeft'); await sleep(90);
    }
    mark('strength 1200');
    await sleep(700);
    await a.click(page.locator('.time-controls button', { hasText: /^10 min$/ }));
    mark('10 min');
    await sleep(1100);
    await a.click(page.locator('details.play-options > summary'));
    await sleep(700);
    mark('play');
    await a.click(page.locator('.start-button'));
    await page.locator('.game-clock').first().waitFor();
    await sleep(1200);
    const plan = ['e2e4', 'g1f3', 'f1c4', 'b1c3', 'e1g1', 'd2d3', 'h2h3'];
    let mine = 0;
    while (mine < 5) {
      const sans = await movesPlayed(page);
      const board = new Chess(); for (const san of sans) board.move(san);
      if (board.isGameOver() || board.turn() !== 'w') break;
      const lines = await topMoves(board.fen());
      const best = lines[0];
      const planned = plan.find(m => board.moves({ verbose: true }).some(x => x.from + x.to === m));
      const ok = planned && lines.some(l => l.move.slice(0, 4) === planned && l.score >= best.score - 70);
      const choice = ok ? planned : best.move.slice(0, 4);
      if (ok) plan.splice(plan.indexOf(planned), 1);
      mark('move ' + choice);
      await playMove(a, page, choice, { think: mine === 0 ? [500, 800] : [800, 1300] });
      mine++;
      const expected = sans.length + 2;
      await a.moveTo(rand(560, 760), rand(520, 640), { duration: rand(600, 900) });
      const t0 = Date.now();
      while ((await movesPlayed(page)).length < expected && Date.now() - t0 < 30000) await sleep(120);
      if ((await movesPlayed(page)).length < expected) break;
      mark('reply');
    }
    await sleep(2500);
  });
  await ctx.close();
}

async function tour(browser) {
  const { ctx, page, a } = await signedInPage(browser);
  await a.place(980, 560);
  await clip(page, '06-tour', async (mark) => {
    await sleep(900);
    for (const p of ['Puzzles', 'Learn', 'Openings', 'Endgames', 'Vision']) {
      mark(p);
      await a.click(page.locator('.navigation').getByText(p, { exact: true }));
      await sleep(2600);
      await a.moveTo(1000 + rand(-200, 200), 500 + rand(-100, 100), { duration: 700 });
      await sleep(600);
    }
    mark('end');
    await sleep(800);
  });
  await ctx.close();
}

const browser = await launchBrowser(chromium);
try {
  if (which === 'all' || which === 'story') await story(browser);
  if (which === 'all' || which === 'practice') await practice(browser);
  if (which === 'all' || which === 'bots') await bots(browser);
  if (which === 'all' || which === 'tour') await tour(browser);
} finally {
  await browser.close();
}

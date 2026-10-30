// Browser check for the pens over the puzzle board: drives the real page in
// Chromium (and Firefox / WebKit when Playwright has them) and fails loudly
// when a pen stops working. Unit tests cover the geometry; this covers the
// wiring, the CSS, and what a learner actually sees.
//
//   npm run check:pens            (needs Playwright: `npm i -g playwright`)
//
// The page is served from public/ on a local port, every outside request is
// blocked, and the position comes from ?fen=, so the result never depends on
// today's puzzle or the network.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../public/', import.meta.url));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.wasm': 'application/wasm' };
// Italian Game, White to move: Nf3 and Bf1 to play with, Black's g8 knight to answer.
const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';

let playwright;
try {
  playwright = createRequire(import.meta.url)('playwright');
} catch {
  console.error('check:pens needs Playwright. Install it with `npm i -g playwright` (or run where it is preinstalled).');
  process.exit(2);
}

function serve() {
  const server = createServer(async (req, res) => {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    path = normalize(join(ROOT, path));
    if (!path.startsWith(ROOT)) return res.writeHead(403).end();
    try {
      if ((await stat(path)).isDirectory()) path = join(path, 'index.html');
      const body = await readFile(path);
      res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' }).end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

const failures = [];
function check(name, cond, detail = '') {
  if (cond) console.log(`  ✓ ${name}`);
  else {
    console.log(`  ✗ ${name}${detail ? ` (${detail})` : ''}`);
    failures.push(name);
  }
}

async function run(browserType, base) {
  let browser;
  try {
    browser = await browserType.launch();
  } catch {
    console.log(`- ${browserType.name()}: not installed here, skipped`);
    return;
  }
  console.log(`- ${browserType.name()}`);
  const page = await browser.newPage({ viewport: { width: 900, height: 2000 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/*', (route) => (route.request().url().startsWith(base) ? route.continue() : route.abort()));
  await page.goto(`${base}/puzzleanalyzr/?fen=${encodeURIComponent(FEN)}`, { waitUntil: 'load' });
  await page.waitForSelector('#desk-board img.pc');

  const box = await page.locator('#desk-board').boundingBox();
  const at = (sq) => [box.x + ('abcdefgh'.indexOf(sq[0]) + 0.5) * (box.width / 8), box.y + (8 - Number(sq[1]) + 0.5) * (box.height / 8)];
  const drag = async (a, b) => {
    await page.mouse.move(...at(a));
    await page.mouse.down();
    await page.mouse.move(...at(b), { steps: 6 });
    await page.mouse.up();
  };
  const tool = (name) => page.click(`#pens [data-tool="${name}"]`);
  const count = (sel) => page.locator(`#desk-draw .desk__drawn ${sel}`).count();
  const pieces = () => page.evaluate(() => [...document.querySelectorAll('#desk-board img.pc')].map((i) => `${i.dataset.piece}@${i.dataset.x},${i.dataset.y}`).sort().join());
  const hint = () => page.textContent('#draw-hint');
  const shown = (sel) => page.locator(sel).isVisible();
  const start = await pieces();

  check('the line box is hidden before there is a line', !(await shown('#draw-line')));
  if (await page.locator('#draw-sheet').count()) check('the sticker sheet is hidden until Sticker is picked', !(await shown('#draw-sheet')));

  await page.click('#draw-mode');
  check('Draw turns on', (await page.getAttribute('#draw-mode', 'aria-pressed')) === 'true');

  // Freehand nibs and sizes, including a dead-straight pencil line.
  for (const [nib, sz] of [['pen', 'thin'], ['pencil', 'medium'], ['marker', 'thick']]) {
    await tool(nib);
    await page.click(`#pens [data-size="${sz}"]`);
    await drag('a6', 'h6');
  }
  check('pen, pencil and marker each leave a line', (await count('.dr--free')) === 3);
  check('pencil and marker look different from the pen', (await count('.dr--pencil')) === 1 && (await count('.dr--marker')) === 1);
  const pencilBox = await page.locator('#desk-draw .desk__drawn .dr--pencil path').boundingBox();
  check('a straight pencil line is visible', Boolean(pencilBox && pencilBox.width > 20));
  await page.click('#draw-clear');
  check('Clear rubs everything out', (await count('g')) === 0);

  // Ghost move: the real position never changes.
  await tool('ghost');
  await drag('f3', 'g5');
  await drag('g5', 'f7');
  await drag('d5', 'd6'); // empty square: nothing
  check('ghost move: two ghosts, walked on from the first', (await count('.dr--ghost')) === 2);
  check('ghost move: the real pieces stay put', (await pieces()) === start);

  // Numbered line: legal steps only, Play it, Clear line.
  await tool('line');
  await drag('f1', 'c4');
  await drag('f3', 'g5');
  check('line: the same side twice is refused', /Black moves next/.test(await hint()));
  await drag('e5', 'e3');
  check('line: an impossible move says why', /can’t go to e3/.test(await hint()));
  await drag('g8', 'f6');
  check('line: legal moves are numbered and listed', (await page.textContent('#draw-line-text')) === '3. Bc4 Nf6' && (await count('.dr--step')) === 2);
  check('line: the box shows once there is a line', await shown('#draw-line'));
  await page.click('#draw-line-play');
  await page.waitForTimeout(500);
  check('Play it shows the line on the board', (await pieces()) !== start);
  await page.waitForFunction(() => document.querySelector('#draw-line-play').textContent === 'Play it', null, { timeout: 8000 });
  check('Play it puts the board back', (await pieces()) === start);
  // Editing the line while it plays stops the show and puts the board back.
  await page.click('#draw-line-play');
  await page.waitForTimeout(300);
  await drag('g8', 'f6'); // the last arrow again takes it back
  await page.waitForTimeout(100);
  check('editing the line stops Play it', (await page.textContent('#draw-line-play')) === 'Play it' && (await pieces()) === start);
  await drag('g8', 'f6');
  await page.click('#draw-line-clear');
  check('Clear line takes the line off and hides the box', (await count('.dr--step')) === 0 && !(await shown('#draw-line')));
  check('Clear line leaves the ghosts', (await count('.dr--ghost')) === 2);
  await page.click('#draw-undo');
  check('Undo brings the line back', (await count('.dr--step')) === 2);
  // A line from another position replaces this one; undo brings this one back, still playable.
  await page.click('#draw-mode');
  await drag('d2', 'd4'); // a real move on the board
  await page.click('#draw-mode');
  await drag('g8', 'f6');
  check('a line from a new position replaces the old one', (await page.textContent('#draw-line-text')) === '3… Nf6', `${await page.textContent('#draw-line-text')} / ${await hint()} / ${await page.textContent('#desk-turn')}`);
  await page.click('#draw-undo');
  check('undo brings the old line back with its own start', (await page.textContent('#draw-line-text')) === '3. Bc4 Nf6');
  // A real take-back during Play it ends the show; the pieces show the game.
  await page.click('#draw-line-play');
  await page.waitForTimeout(300);
  await page.click('#tool-undo'); // takes back 3. d4 on the real board
  await page.waitForTimeout(400);
  check('a real take-back stops Play it and shows the real game', (await page.textContent('#draw-line-play')) === 'Play it' && (await pieces()) === start);
  await page.click('#tool-redo');
  await page.waitForTimeout(300);

  // Stickers and tape, when this build has them.
  if (await page.locator('#pens [data-tool="sticker"]').count()) {
    await tool('sticker');
    check('the sticker sheet opens with Sticker', await shown('#draw-sheet'));
    await page.click('[data-sticker="!!"]');
    await drag('e4', 'e4');
    await page.click('[data-sticker="?"]');
    await drag('e4', 'e4');
    await page.click('[data-sticker="OUTPOST"]');
    await drag('d5', 'd5');
    check('stickers: one glyph per square, a word beside it', (await count('.dr-sticker')) === 1 && (await count('.dr-word')) === 1);
    await tool('tape');
    await drag('a1', 'g6');
    check('tape snaps to the diagonal', (await count('.dr--tape')) === 1);
  }

  // Inks have meanings, and Theirs arrows get a second head.
  if (await page.locator('#pens .pens__role').count()) {
    check('the inks read Mine, Theirs and Idea', (await page.locator('#pens .pens__role').allTextContents()).join(' ') === 'Mine Theirs Idea');
    await tool('arrow');
    await page.click('#pens [data-color="red"]');
    await drag('h2', 'h4');
    const heads = await page.locator('#desk-draw .desk__drawn .dr--arrow.tone--red path').count();
    check('a Theirs arrow has the double head', heads === 5, `${heads} strokes`);
    await page.click('#pens [data-color="green"]');
  }

  // Helpers answer one question on a tap and fade at the next touch; they never move a piece.
  if (await page.locator('#pens [data-help]').count()) {
    const aid = (sel) => page.locator(`#desk-draw .desk__aid ${sel}`).count();
    const before = await pieces();
    await page.click('#pens [data-help="reach"]');
    await drag('f3', 'f3');
    check('Reach: dots where the knight can go, a ring where it takes', (await aid('.aid-dot')) === 4 && (await aid('.aid-take')) === 1);
    check('Reach says it in words', /can go to 5 squares, taking on e5/.test(await hint()));
    // The board now has 3. d4 played (Black to move), from the line check above.
    await page.click('#pens [data-help="guard"]');
    await drag('e5', 'e5');
    check('Guard count: a red tally when short, and the sentence', (await aid('.aid-tally.is-short')) === 1 && /attacked twice, defended once, short of defenders/.test(await hint()), await hint());
    await page.click('#pens [data-help="loose"]');
    check('Loose: the side to move’s hanging pawn gets a tag', (await aid('.aid-loose')) === 1 && /Yours.*loose on e5/.test(await hint()), await hint());
    await page.click('#pens [data-help="loose"]');
    check('Loose again: the other side’s, here none', (await aid('.aid-loose')) === 0 && /Theirs: nothing loose/.test(await hint()), await hint());
    await page.click('#pens [data-help="loose"]');
    await page.click('#pens [data-help="loose"]');
    await drag('a3', 'a3');
    check('a helper fades at the next touch', (await aid('*')) === 0);
    check('helpers never move a piece', (await pieces()) === before);
    // Asking a helper during Play it ends the show, so the answer fits the board you see.
    if (await shown('#draw-line')) {
      await page.click('#draw-line-play');
      await page.waitForTimeout(1100);
      await page.click('#pens [data-help="loose"]');
      await page.waitForTimeout(100);
      check('a helper during Play it stops the show first', (await page.textContent('#draw-line-play')) === 'Play it' && (await pieces()) === before);
      await page.click('#pens [data-help="loose"]');
      await page.click('#pens [data-help="loose"]');
    }
  }

  // Flipping keeps every drawing.
  const before = await count('g');
  await page.click('#tool-flip');
  check('flipping the board keeps the drawings', (await count('g')) === before);
  await page.click('#tool-flip');

  // A phone: the pens wrap and the page never scrolls sideways.
  await page.setViewportSize({ width: 375, height: 900 });
  await page.waitForTimeout(100);
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('at phone width nothing pushes the page sideways', wide <= 0, `${wide}px too wide`);

  check('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
}

const server = await serve();
const base = `http://127.0.0.1:${server.address().port}`;
try {
  for (const type of [playwright.chromium, playwright.firefox, playwright.webkit]) await run(type, base);
} finally {
  server.close();
}
if (failures.length) {
  console.error(`\n${failures.length} pen check(s) failed.`);
  process.exit(1);
}
console.log('\nAll pen checks passed.');

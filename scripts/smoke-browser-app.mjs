// Browser smoke for the static app in web/dist-app (run `npm run smoke:app`, which builds it first).
// No app server: a tiny static server applies the generated _headers the way Cloudflare Pages does,
// so the real CSP is enforced. Fails on any CSP violation, console error, page error, failed or
// off-site request. Usage: node scripts/smoke-browser-app.mjs [--screenshot path.png]
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync, existsSync, statSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'web/dist-app');
const shotArg = process.argv.indexOf('--screenshot');
const screenshot = shotArg > 0 ? path.resolve(process.argv[shotArg + 1]) : null;

async function loadChromium() {
  try { return createRequire(import.meta.url)('/opt/node22/lib/node_modules/playwright').chromium; }
  catch { return (await import('playwright')).chromium; }
}

const TYPES = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.wasm': 'application/wasm', '.txt': 'text/plain; charset=utf-8', '.nnue': 'application/octet-stream'};

/** Reads a Pages _headers file: [{pattern, set: [[name, value]], detach: [name]}]. */
export function parseHeaders(text) {
  const rules = [];
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) { rules.push({pattern: line.trim(), set: [], detach: []}); continue; }
    const rule = rules.at(-1);
    assert.ok(rule, `_headers: header before any path: ${line}`);
    const body = line.trim();
    if (body.startsWith('!')) { rule.detach.push(body.slice(1).trim().toLowerCase()); continue; }
    const colon = body.indexOf(':');
    assert.ok(colon > 0, `_headers: not a header line: ${line}`);
    rule.set.push([body.slice(0, colon).trim().toLowerCase(), body.slice(colon + 1).trim()]);
  }
  return rules;
}

// Pages rules: * matches anything, :name matches one path segment; every matching rule applies,
// and a header set by two rules is joined with a comma (which would break a CSP, so the test sees it).
function matches(pattern, pathname) {
  const source = pattern.split('*').map(part => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/:\w+/g, '[^/]+')).join('.*');
  return new RegExp(`^${source}$`).test(pathname);
}
export function headersFor(rules, pathname) {
  const out = {};
  for (const rule of rules) {
    if (!matches(rule.pattern, pathname)) continue;
    for (const name of rule.detach) delete out[name];
    for (const [name, value] of rule.set) out[name] = out[name] ? `${out[name]}, ${value}` : value;
  }
  return out;
}

function serve(rules) {
  return createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = path.join(dist, pathname);
    if (!file.startsWith(dist)) { res.writeHead(400).end(); return; }
    if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, 'index.html');
    // With no 404.html, Pages serves index.html for unknown paths (single-page app mode).
    if (!existsSync(file) || path.basename(file) === '_headers') file = path.join(dist, 'index.html');
    res.writeHead(200, {'content-type': TYPES[path.extname(file)] || 'application/octet-stream', ...headersFor(rules, pathname)});
    res.end(readFileSync(file));
  });
}

async function main() {
  const headersFile = path.join(dist, '_headers');
  assert.ok(existsSync(path.join(dist, 'index.html')) && existsSync(headersFile), 'Build the browser app first: npm run build:app');
  const rules = parseHeaders(readFileSync(headersFile, 'utf8'));
  const csp = headersFor(rules, '/')['content-security-policy'];
  assert.ok(csp, '_headers sets no Content-Security-Policy for /');
  assert.ok(!csp.includes(', '), 'Two _headers rules both set a CSP for /');

  const server = serve(rules).listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const chromium = await loadChromium();
  const browser = await chromium.launch();
  const problems = [];
  try {
    const context = await browser.newContext({viewport: {width: 1280, height: 860}});
    await context.exposeFunction('__smokeCsp', report => problems.push(`CSP violation: ${report}`));
    await context.addInitScript(() => document.addEventListener('securitypolicyviolation', e => window.__smokeCsp(`${e.violatedDirective} blocked ${e.blockedURI || 'inline'} (${e.sourceFile || ''}:${e.lineNumber || ''})`)));
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('console', message => { if (message.type() === 'error') problems.push(`console error: ${message.text()}`); });
    page.on('pageerror', error => problems.push(`page error: ${error.message}`));
    page.on('requestfailed', request => problems.push(`request failed: ${request.url()} ${request.failure()?.errorText}`));
    page.on('response', response => { if (response.status() >= 400) problems.push(`${response.status()} ${response.url()}`); });
    // The app must run with no server: nothing leaves this origin in this flow.
    page.on('request', request => { const url = new URL(request.url()); if (url.protocol.startsWith('http') && url.origin !== base) problems.push(`off-site request: ${request.url()}`); });
    const check = step => assert.deepEqual(problems, [], `Problems after ${step}`);

    const first = await page.goto(base);
    assert.equal(first.headers()['content-security-policy'], csp, 'The page was not served with the generated CSP');
    await page.getByText('Your games stay on this device').waitFor();
    const manifest = await (await page.request.get(base + '/manifest.webmanifest')).json();
    assert.equal(manifest.name, 'AskTheMove');
    check('first load');

    // Every page once, so a CSP problem on any screen shows up.
    const nav = page.getByRole('navigation', {name: 'Main navigation'});
    for (const label of ['Puzzles', 'Learn', 'Openings', 'Endgames', 'Vision', 'Play bots', 'My games']) {
      await nav.getByRole('button', {name: label, exact: true}).click();
      await page.waitForTimeout(300);
    }
    check('visiting every page');

    // Import a short game, reload, and find it again in My games.
    const title = 'Smoke Learner';
    await page.getByRole('button', {name: 'Import a PGN', exact: true}).click();
    await page.getByLabel('PGN text', {exact: true}).fill(`[White "${title}"]\n[Black "Practice opponent"]\n\n1. f3 e5 2. g4 Qh4# 0-1`);
    await page.getByRole('button', {name: 'Import & review', exact: true}).click();
    await page.getByRole('dialog').waitFor({state: 'detached'});
    await page.getByText('Imported game').first().waitFor();
    check('import');

    await page.reload();
    await page.getByText('Your games stay on this device').waitFor();
    await nav.getByRole('button', {name: 'My games', exact: true}).click();
    const card = page.locator('.game-card').filter({hasText: title});
    await card.first().waitFor();
    assert.equal(await card.count(), 1, 'The imported game should be saved exactly once');
    await card.click();
    await page.getByText(title).first().waitFor();
    check('reload');

    // The engine Worker and its WebAssembly must start under the same CSP.
    const engineReady = await page.evaluate(() => new Promise(resolve => {
      const worker = new Worker('/engine/stockfish-19-lite-single.js');
      const timer = setTimeout(() => { worker.terminate(); resolve('timeout'); }, 30000);
      worker.onerror = event => { clearTimeout(timer); resolve(`error: ${event.message}`); };
      worker.onmessage = event => { if (String(event.data).includes('uciok')) { clearTimeout(timer); worker.terminate(); resolve('ok'); } };
      worker.postMessage('uci');
    }));
    assert.equal(engineReady, 'ok', 'Stockfish did not start under the CSP');
    check('engine start');

    // A bot game on the in-browser engine: play 1. e4, wait for the bot's reply, resign.
    await nav.getByRole('button', {name: 'Play bots', exact: true}).click();
    await page.getByRole('button', {name: 'New game', exact: true}).click();
    const setup = page.getByRole('dialog');
    const botName = (await setup.locator('.start-button').innerText()).replace(/^Play\s+/, '').replace(/[^\p{L}\p{N} ].*$/su, '').trim();
    await setup.locator('.start-button').click();
    await setup.waitFor({state: 'detached'});
    const board = page.getByRole('group', {name: /board/i}).first();
    await board.getByRole('button', {name: 'e2, white pawn'}).click();
    await board.getByRole('button', {name: /^e4, empty/}).click();
    await board.getByRole('button', {name: 'e4, white pawn'}).waitFor();
    // Every first move for Black lands on rank 5 or 6.
    await page.waitForFunction(() => [...document.querySelectorAll('.board .square')].some(el => /^[a-h][56], black /.test(el.getAttribute('aria-label') || '')), null, {timeout: 30000});
    await page.getByRole('button', {name: 'Resign', exact: true}).click();
    await page.getByRole('button', {name: 'Resign game', exact: true}).click();
    await page.getByRole('dialog').waitFor({state: 'detached'});
    check('bot game');

    // Review the whole game with Stockfish in the browser.
    await page.getByRole('button', {name: 'Review whole game', exact: true}).click();
    await page.getByRole('button', {name: 'Review complete', exact: true}).waitFor({timeout: 90000});
    await page.getByText(/Stockfish 19 Lite WASM/).first().waitFor();
    check('review');

    // Reload: the game and its review are still there.
    await page.reload();
    await page.getByText('Your games stay on this device').waitFor();
    await nav.getByRole('button', {name: 'My games', exact: true}).click();
    const botCard = page.locator('.game-card').filter({hasText: botName});
    await botCard.first().waitFor();
    assert.equal(await botCard.count(), 1, 'The bot game should be saved exactly once');
    await botCard.click();
    await page.getByRole('button', {name: 'Review complete', exact: true}).waitFor();
    check('reload after review');

    if (screenshot) await page.screenshot({path: screenshot, fullPage: true});
    console.log(`Browser app smoke passed under CSP: ${csp}`);
  } finally {
    await browser.close();
    server.close();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();

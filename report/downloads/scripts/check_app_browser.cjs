/* Run after `npm run build`; uses a fresh database and the real server engine. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { randomBytes } = require('node:crypto');
const { pathToFileURL } = require('node:url');
const express = require('express');
const root = path.resolve(__dirname, '..');
const packageRoot = process.env.CHESSLAB_PLAYWRIGHT_ROOT || path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { chromium } = require(packageRoot);

(async () => {
  const dist = path.join(root, 'web/dist');
  assert.ok(fs.existsSync(path.join(dist, 'index.html')), 'Build the application first with npm run build.');
  const { createApp } = await import(pathToFileURL(path.join(root, 'server/app.mjs')));
  const engine = await import(pathToFileURL(path.join(root, 'server/engine.mjs')));
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'chesslab-browser-'));
  let state, server, browser;
  try {
    state = createApp({ databasePath: path.join(temporary, 'chesslab.sqlite') });
    state.app.use(express.static(dist));
    server = state.app.listen(0, '127.0.0.1');
    await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
    const base = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    const pageErrors = [], badResponses = [], unexpectedRequests = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) badResponses.push(`${response.status()} ${new URL(response.url()).pathname}`); });
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.protocol.startsWith('http') && (url.origin !== base || /\.(wasm|nnue|onnx|pt|pb)(\.|$)/i.test(url.pathname))) unexpectedRequests.push(request.url());
    });
    const responseFor = (route, method = 'POST') => page.waitForResponse(response => new URL(response.url()).pathname === route && response.request().method() === method);
    async function actionResponse(route, action, status = 200) {
      const [response] = await Promise.all([responseFor(route), action()]);
      assert.equal(response.status(), status, route);
      return response.json();
    }
    const navigation = page.getByRole('navigation', { name: 'Main navigation' });
    const entry = page.getByLabel('Enter a move in SAN or UCI', { exact: true });
    async function enterMove(value) {
      await entry.fill(value);
      await page.getByRole('button', { name: 'Play entered move', exact: true }).click();
    }

    await page.goto(base);
    await page.getByText('Coach online', { exact: true }).waitFor();
    await page.waitForFunction(() => [...document.querySelectorAll('.board img.piece')].length === 32 && [...document.querySelectorAll('.board img.piece')].every(image => image.complete && image.naturalWidth === 150));
    assert.equal(new Set(await page.locator('.board img.piece').evaluateAll(images => images.map(image => new URL(image.src).pathname))).size, 12, 'All twelve piece images load on the starting board');
    await page.locator('.account-button').click();
    const dialog = page.getByRole('dialog', { name: 'Make this your workspace' });
    await dialog.getByLabel('Username', { exact: true }).fill('browser_smoke');
    await dialog.getByLabel('Password', { exact: true }).fill(randomBytes(24).toString('hex'));
    const account = await actionResponse('/api/register', () => dialog.getByRole('button', { name: 'Create account', exact: true }).click(), 201);
    assert.equal(account.user.username, 'browser_smoke');
    await dialog.waitFor({ state: 'hidden' });
    const cookie = (await context.cookies(base)).find(item => item.name === 'chesslab_session');
    assert.ok(cookie?.httpOnly && cookie.sameSite === 'Strict', 'Session must be HttpOnly and SameSite=Strict.');

    await page.getByRole('combobox', { name: 'BOT DIFFICULTY', exact: true }).selectOption('1');
    const created = await actionResponse('/api/games', () => page.locator('.welcome-panel').getByRole('button', { name: 'Play coach', exact: true }).click(), 201);
    const gameRoute = `/api/games/${created.game.id}`;
    const humanResponse = responseFor(`${gameRoute}/move`);
    const replied = await actionResponse(`${gameRoute}/bot`, () => enterMove('e4'));
    const human = await humanResponse;
    assert.equal(human.status(), 200);
    assert.deepEqual((await human.json()).game.moves, ['e2e4']);
    assert.equal(replied.game.moves.length, 2);
    assert.equal(replied.game.moves[0], 'e2e4');
    engine.replay(replied.game.moves, replied.game.initialFen);
    await page.getByRole('button', { name: /^Move 1, black,/ }).waitFor();
    await page.getByRole('button', { name: 'e4, white pawn', exact: true }).waitFor();

    const review = await actionResponse('/api/analyze', () => page.locator('.panel-tabs').getByRole('button', { name: /^Review/ }).click());
    assert.match(review.engine, /Stockfish/);
    assert.ok(review.played && review.lines.length);
    await page.locator('.coach-explanation').waitFor();
    assert.match(await page.locator('.engine-receipt').innerText(), /Stockfish/);
    assert.match(await page.locator('.coach-explanation').innerText(), /sample|estimate/i);

    const restoredResponse = responseFor(gameRoute, 'GET');
    await page.reload();
    const restored = await restoredResponse;
    assert.equal(restored.status(), 200);
    assert.deepEqual((await restored.json()).game.moves, replied.game.moves);
    await page.getByRole('button', { name: 'Move 1, white, e4', exact: true }).waitFor();
    await page.getByRole('button', { name: /^Move 1, black,/ }).waitFor();

    await navigation.getByRole('button', { name: 'Learn', exact: true }).click();
    await page.getByRole('button', { name: /Your king comes first/ }).click();
    const wrongLesson = await actionResponse('/api/lessons/safe-king/answer', () => page.getByRole('button', { name: /Stay on e1 and pass/ }).click());
    assert.equal(wrongLesson.correct, false);
    assert.deepEqual(wrongLesson.progress.lessons, []);
    await page.locator('.learning-feedback.incorrect').waitFor();
    const rightLesson = await actionResponse('/api/lessons/safe-king/answer', () => page.getByRole('button', { name: /Kxe2, capturing the rook/ }).click());
    assert.equal(rightLesson.correct, true);
    assert.deepEqual(rightLesson.progress.lessons, ['safe-king']);
    await page.locator('.learning-feedback.correct').waitFor();

    await navigation.getByRole('button', { name: 'Puzzles', exact: true }).click();
    await page.getByRole('button', { name: /A rook left loose/ }).click();
    const wrongPuzzle = await actionResponse('/api/puzzles/take-the-rook/answer', () => enterMove('e1d1'));
    assert.equal(wrongPuzzle.correct, false);
    assert.deepEqual(wrongPuzzle.progress.puzzles, []);
    await page.locator('.learning-feedback.incorrect').waitFor();
    const rightPuzzle = await actionResponse('/api/puzzles/take-the-rook/answer', () => enterMove('d3e4'));
    assert.equal(rightPuzzle.complete, true);
    assert.deepEqual(rightPuzzle.progress.puzzles, ['take-the-rook']);
    await page.locator('.learning-feedback.correct').waitFor();
    assert.match(await page.locator('.learning-feedback.correct').innerText(), /Puzzle complete/);

    const meResponse = responseFor('/api/me', 'GET');
    await page.reload();
    const me = await meResponse;
    assert.equal(me.status(), 200);
    assert.deepEqual((await me.json()).progress, { lessons: ['safe-king'], puzzles: ['take-the-rook'] });
    await page.getByRole('button', { name: 'Move 1, white, e4', exact: true }).waitFor();
    assert.deepEqual(pageErrors, [], 'Browser JavaScript errors');
    assert.deepEqual(badResponses, [], 'Unexpected failing HTTP responses');
    assert.deepEqual(unexpectedRequests, [], 'No external resources or browser engine/model downloads');
    console.log(JSON.stringify({ status: 'pass', checkedAt: new Date().toISOString(), engine: review.engine, checks: ['register and session cookie', 'typed e4 and real legal bot reply', 'engine review shown', 'saved game restored after reload', 'wrong/right lesson answers', 'wrong/right puzzle moves', 'progress restored after reload', 'no page errors or unexpected HTTP/model requests'], limitations: ['Uses isolated temporary SQLite, not the user database', 'Does not establish deployment or cross-browser support'] }, null, 2));
  } finally {
    try { await browser?.close(); }
    finally {
      engine.closeEngine();
      try {
        if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
      } finally {
        try { state?.close(); }
        finally { fs.rmSync(temporary, { recursive: true, force: true }); }
      }
    }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

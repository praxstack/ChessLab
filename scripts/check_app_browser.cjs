/* Run after `npm run build`; uses a fresh database and the real server engine. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { randomBytes } = require('node:crypto');
const { pathToFileURL } = require('node:url');
const express = require('express');
const root = path.resolve(__dirname, '..');
const packageRoot = process.env.CHESSLAB_PLAYWRIGHT_ROOT || 'playwright';
const { chromium } = require(packageRoot);
const evidence = process.env.CHESSLAB_EVIDENCE_DIR && path.resolve(process.env.CHESSLAB_EVIDENCE_DIR);
if (evidence) fs.mkdirSync(evidence, {recursive:true});

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
    browser = await chromium.launch({ headless: true, ...(evidence?{slowMo:120}:{}) });
    const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, reducedMotion: 'reduce', ...(evidence?{recordVideo:{dir:evidence,size:{width:1440,height:960}}}:{}) });
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

    const botsLoaded = responseFor('/api/bots', 'GET');
    await page.goto(base);
    assert.equal((await botsLoaded).status(),200);
    if(evidence) await page.screenshot({path:path.join(evidence,'01-bot-picker.png'),fullPage:true});
    if(process.env.CHESSLAB_BASELINE_ONLY==='1'){console.log('Baseline screenshot recorded');await context.close();return;}
    await page.waitForFunction(() => [...document.querySelectorAll('.board img.piece')].length === 32 && [...document.querySelectorAll('.board img.piece')].every(image => image.complete && image.naturalWidth === 150));
    assert.equal(new Set(await page.locator('.board img.piece').evaluateAll(images => images.map(image => new URL(image.src).pathname))).size, 12, 'All twelve piece images load on the starting board');
    await page.setViewportSize({width:1280,height:720});
    assert.ok(await page.locator('.move-entry').evaluate(element=>element.getBoundingClientRect().bottom<=innerHeight),'Laptop move entry stays above the fold');
    assert.ok(await page.locator('.start-button').evaluate(element=>element.getBoundingClientRect().bottom<=innerHeight),'Laptop start button stays above the fold');
    if(evidence) await page.screenshot({path:path.join(evidence,'00-laptop-picker.png'),fullPage:true});
    await page.setViewportSize({width:1440,height:960});
    const search = page.getByRole('searchbox', {name:'Search bots'});
    await search.fill('no_such_chess_opponent');
    await page.getByText('No opponents found', {exact:true}).waitFor();
    await page.getByRole('button', {name:'Clear search',exact:true}).click();
    await search.fill('Martin');
    assert.equal(await page.locator('.bot-card').count(),1,'Search finds the named opponent');
    assert.match(await page.locator('.bot-card').innerText(),/Martin/,'Bot name is visible');
    await page.locator('.account-button').click();
    const dialog = page.getByRole('dialog', { name: 'Make this your workspace' });
    await dialog.getByLabel('Username', { exact: true }).fill('browser_smoke');
    await dialog.getByLabel('Password', { exact: true }).fill(randomBytes(24).toString('hex'));
    const account = await actionResponse('/api/register', () => dialog.getByRole('button', { name: 'Create account', exact: true }).click(), 201);
    assert.equal(account.user.username, 'browser_smoke');
    await dialog.waitFor({ state: 'hidden' });
    const cookie = (await context.cookies(base)).find(item => item.name === 'chesslab_session');
    assert.ok(cookie?.httpOnly && cookie.sameSite === 'Strict', 'Session must be HttpOnly and SameSite=Strict.');

    await page.getByRole('searchbox', {name:'Search bots'}).fill('Martin');
    await page.getByRole('button', { name: 'Play Martin, 250', exact: true }).click();
    const created = await actionResponse('/api/games', () => page.locator('.welcome-panel').getByRole('button', { name: 'Play Martin', exact: true }).click(), 201);
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
    if(evidence) await page.screenshot({path:path.join(evidence,'02-local-game.png'),fullPage:true});
    const hint = await actionResponse(`${gameRoute}/hint`,()=>page.getByRole('button',{name:/^Hint /}).click());
    assert.ok(hint.move && hint.explanation, 'Hint contains real engine evidence');
    await page.locator('.hint-message').waitFor();

    const review = await actionResponse('/api/analyze', () => page.locator('.panel-tabs').getByRole('button', { name: /^Review/ }).click());
    assert.match(review.engine, /Stockfish/);
    assert.ok(review.played && review.lines.length);
    await page.locator('.coach-explanation').waitFor();
    assert.match(await page.locator('.engine-receipt').innerText(), /Stockfish/);
    assert.match(await page.locator('.coach-explanation').innerText(), /sample|estimate/i);

    if(evidence) await page.screenshot({path:path.join(evidence,'03-engine-review.png'),fullPage:true});
    await page.getByRole('button',{name:'Try a variation',exact:true}).click();
    await page.getByLabel('Your question at this branch').fill('What changes if I develop my knight?');
    const variationMove = engine.replay(replied.game.moves).moves()[0];
    await enterMove(variationMove);
    await page.getByRole('button',{name:'Branch here',exact:true}).click();
    await page.getByLabel('Your question at this branch').fill('A second branch, inside the first.');
    const study = await actionResponse(`${gameRoute}/study`,()=>page.getByRole('button',{name:'Save study',exact:true}).click());
    assert.equal(study.game.study.branches.length,2);
    assert.equal(study.game.study.branches[1].parentId,study.game.study.branches[0].id);
    assert.deepEqual(study.game.moves,replied.game.moves,'Exploration preserves the actual game');
    if(evidence) await page.screenshot({path:path.join(evidence,'04-nested-study.png'),fullPage:true});
    await page.getByRole('button',{name:/^Return to game/}).click();
    await actionResponse(`${gameRoute}/study`,()=>page.getByRole('button',{name:'Save study',exact:true}).click());
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

    if(evidence) await page.screenshot({path:path.join(evidence,'05-puzzle-complete.png'),fullPage:true});
    const meResponse = responseFor('/api/me', 'GET');
    await page.reload();
    const me = await meResponse;
    assert.equal(me.status(), 200);
    assert.deepEqual((await me.json()).progress, { lessons: ['safe-king'], puzzles: ['take-the-rook'] });
    await page.getByRole('button', { name: 'Move 1, white, e4', exact: true }).waitFor();
    await navigation.getByRole('button',{name:'My games',exact:true}).click();
    await page.locator('.game-card').waitFor();
    if(evidence) await page.screenshot({path:path.join(evidence,'06-saved-games.png'),fullPage:true});
    await page.getByRole('button',{name:'Open settings',exact:true}).click();
    const settingsDialog=page.getByRole('dialog',{name:'Settings',exact:true});
    await settingsDialog.getByLabel('Board',{exact:true}).selectOption('blue');
    await settingsDialog.getByRole('button',{name:'Close dialog',exact:true}).click();
    await page.reload();
    await page.getByText('Coach online',{exact:true}).waitFor();
    assert.equal(await page.locator('.app-shell').getAttribute('data-board-theme'),'blue','Board preference persists');
    await page.getByRole('button',{name:'Open settings',exact:true}).click();
    await page.getByRole('dialog',{name:'Settings',exact:true}).getByLabel('Board',{exact:true}).selectOption('green');
    await page.getByRole('button',{name:'Close dialog',exact:true}).click();
    await navigation.getByRole('button',{name:'My games',exact:true}).click();
    await page.getByRole('button',{name:'Import a PGN',exact:true}).click();
    await page.getByLabel('PGN text',{exact:true}).fill('[White "Learner"]\n[Black "Practice opponent"]\n\n1. f3 e5 2. g4 Qh4# 0-1');
    const imported=await actionResponse('/api/import',()=>page.getByRole('button',{name:'Import & review',exact:true}).click(),201);
    const reportRoute=`/api/games/${imported.game.id}/review`;
    assert.match(await page.locator('.own-player .player-copy > strong').innerText(),/Learner/);
    assert.match(await page.locator('.player-row').first().innerText(),/Practice opponent/);
    await page.getByRole('button',{name:'Review whole game',exact:true}).waitFor();
    const firstStep=await actionResponse(reportRoute,()=>page.getByRole('button',{name:'Review whole game',exact:true}).click());
    assert.equal(firstStep.review.entries.length,1);
    await page.getByRole('button',{name:'Pause review',exact:true}).click();
    await page.getByRole('button',{name:'Resume review',exact:true}).waitFor();
    const savedReview=responseFor(reportRoute,'GET');await page.reload();
    const partial=(await (await savedReview).json()).review;assert.ok(partial.entries.length>=1&&partial.entries.length<4,'Pause keeps partial progress');
    await page.getByRole('button',{name:'Resume review',exact:true}).click();
    await page.getByRole('button',{name:'Review complete',exact:true}).waitFor({timeout:30000});
    const report=(await (await context.request.get(base+reportRoute)).json()).review;
    assert.equal(report.complete,true);assert.equal(report.entries.length,4);assert.match(report.engine,/Stockfish/);assert.equal(report.entries.at(-1).evaluation.value,'0-1');
    for(const entry of report.entries){assert.equal(entry.analysis.played.move,imported.game.moves[entry.ply-1]);assert.equal(entry.analysis.fen,engine.replay(imported.game.moves.slice(0,entry.ply-1),imported.game.initialFen).fen());}
    if(evidence) await page.screenshot({path:path.join(evidence,'09-full-game-report.png'),fullPage:true});
    const graphPosition=page.getByRole('slider',{name:'Review position',exact:true});await graphPosition.focus();await graphPosition.press('Home');await graphPosition.press('ArrowRight');
    await page.getByRole('button',{name:'f3, white pawn',exact:true}).waitFor();
    assert.equal(await page.locator('.move-row button[aria-current=step]').getAttribute('aria-label'),'Move 1, white, f3');
    await page.getByLabel('Review as',{exact:true}).selectOption('w');
    assert.ok((await page.locator('.key-moves button').allTextContents()).every(text=>!text.includes('Qh4')),'White filter excludes Black key moves');
    await page.getByLabel('Review as',{exact:true}).selectOption('both');
    await page.getByRole('button',{name:'Review key move 2, black, Qh4#',exact:true}).click();
    await page.getByRole('button',{name:'h4, black queen',exact:true}).waitFor();
    assert.match(await page.locator('.classification').innerText(),/Checkmate/);
    await page.getByRole('button',{name:'Game report',exact:true}).click();
    if(evidence) await page.screenshot({path:path.join(evidence,'10-reviewed-key-move.png'),fullPage:true});
    let extraAnalysis=0;const countAnalysis=req=>{if(new URL(req.url()).pathname==='/api/analyze')extraAnalysis++;};page.on('request',countAnalysis);
    const restoredReport=responseFor(reportRoute,'GET');await page.reload();assert.equal((await (await restoredReport).json()).review.complete,true);
    await page.getByRole('button',{name:'Review complete',exact:true}).waitFor();
    await page.getByRole('button',{name:'Move 1, white, f3',exact:true}).click();
    await page.locator('.coach-message-heading > strong').filter({hasText:'1. f3'}).waitFor();
    await page.getByText(report.entries[0].analysis.played.explanation,{exact:true}).waitFor();
    await page.getByRole('button',{name:'Move 2, black, Qh4#',exact:true}).click();
    await page.getByRole('button',{name:'h4, black queen',exact:true}).waitFor();
    assert.equal(extraAnalysis,0,'Saved report navigation does not rerun the engine');page.off('request',countAnalysis);
    const unchanged=(await (await context.request.get(base+`/api/games/${imported.game.id}`)).json()).game;
    assert.deepEqual(unchanged.moves,imported.game.moves);assert.equal(unchanged.revision,imported.game.revision);
    await page.setViewportSize({width:390,height:844});
    await navigation.getByRole('button',{name:'Play bots',exact:true}).click();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No mobile horizontal overflow');
    assert.ok(await page.getByRole('button',{name:'Your account',exact:true}).isVisible(),'Mobile account access');
    if(evidence) await page.screenshot({path:path.join(evidence,'07-mobile-game.png'),fullPage:false});
    await page.getByRole('button',{name:'Game report',exact:true}).click();
    await page.getByLabel('Review as',{exact:true}).selectOption('b');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile report has no horizontal overflow');
    if(evidence) await page.screenshot({path:path.join(evidence,'11-mobile-report.png'),fullPage:true});
    await page.getByRole('button',{name:'Game report',exact:true}).click();
    await page.getByRole('button',{name:'Open settings',exact:true}).click();
    await page.getByRole('dialog',{name:'Settings',exact:true}).waitFor();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No mobile settings overflow');
    if(evidence) await page.screenshot({path:path.join(evidence,'08-mobile-settings.png'),fullPage:false});
    await page.getByRole('button',{name:'Close dialog',exact:true}).click();
    assert.deepEqual(pageErrors, [], 'Browser JavaScript errors');
    assert.deepEqual(badResponses, [], 'Unexpected failing HTTP responses');
    assert.deepEqual(unexpectedRequests, [], 'No external resources or browser engine/model downloads');
    const receipt = { status: 'pass', checkedAt: new Date().toISOString(), engine: review.engine, checks: ['register and session cookie', 'typed e4 and real legal bot reply', 'engine review shown', 'saved game restored after reload', 'wrong/right lesson answers', 'wrong/right puzzle moves', 'progress restored after reload', 'bot search and visible identity', 'hint with engine evidence', 'nested study preserves original moves', 'board preference persists', 'mobile layout and account/settings access', 'no page errors or unexpected HTTP/model requests', 'whole game review with pause and reload resume', 'native evidence for every move and terminal result', 'key move filtering and cached navigation'], limitations: ['Uses isolated temporary SQLite, not the user database', 'Does not establish deployment or cross-browser support'] };
    if(evidence) receipt.video='local-user-flow.webm';
    const video=page.video();
    await context.close();
    if(evidence){if(video)fs.renameSync(await video.path(),path.join(evidence,'local-user-flow.webm'));fs.writeFileSync(path.join(evidence,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');}
    console.log(JSON.stringify(receipt,null,2));
    if(evidence) console.log('Evidence saved to',evidence);
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

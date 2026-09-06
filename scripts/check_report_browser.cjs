/* Check the reading site with the already-installed Playwright runtime. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const root = path.resolve(__dirname, '..');
const packageRoot = process.env.CHESSLAB_PLAYWRIGHT_ROOT || path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { chromium } = require(packageRoot);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
  const errors = [];
  const requests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
  const base = 'file://' + path.join(root, 'report') + '/';
  const chapters = ['index','product','market','pricing','investor','architecture','delivery','discussion','library'];
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'report/manifest.json')));
  const htmlPages = Object.keys(manifest.output_hashes).filter(p => p.endsWith('.html') && !p.startsWith('downloads/'));
  try {
    for (const filename of htmlPages) {
      await page.goto(base + filename);
      assert.match(await page.title(), /ChessLab dossier$/);
      assert.equal(await page.locator('main').count(), 1);
      assert.ok(await page.locator('article').innerText());
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, filename + ' overflows desktop');
      assert.equal(await page.locator('[aria-current="page"]').count(), 1);
      const images = await page.locator('img').evaluateAll(nodes => nodes.filter(n => !n.getAttribute('alt')).length);
      assert.equal(images, 0, filename + ' has image without alt text');
    }
    await page.goto(base + 'index.html');
    await page.getByRole('button', {name: /Trade rook for bishop/}).click();
    assert.match(await page.locator('#exchange-result').innerText(), /5 − 3 = 2/);
    await page.getByRole('button', {name: /Lose the knight/}).click();
    assert.match(await page.locator('#exchange-result').innerText(), /3 points lost/);
    const squareSizes = await page.locator('.sq').evaluateAll(nodes => nodes.map(n => ({w:n.offsetWidth,h:n.offsetHeight})));
    assert.ok(squareSizes.every(s => Math.abs(s.w-s.h) <= 1), 'Board cells must be square');
    await page.goto(base + 'product.html');
    await page.getByRole('button', {name:'Explore',exact:true}).click();
    assert.equal(await page.locator('#concept-title').innerText(), 'Explore a different reply');
    await page.getByRole('button', {name:'Return',exact:true}).click();
    assert.equal(await page.locator('#concept-title').innerText(), 'Return to the actual game');
    await page.goto(base + 'pricing.html');
    assert.equal(await page.locator('#contribution').innerText(), '$7,730.00');
    await page.locator('#payers').fill('0');
    assert.equal(await page.locator('#revenue').innerText(), '$0.00');
    await page.locator('#payers').fill('100');
    await page.locator('#price').fill('10');
    await page.locator('#sessions').fill('10');
    await page.locator('#unit-cost').fill('1');
    await page.locator('#fee').fill('5');
    assert.equal(await page.locator('#contribution').innerText(), '-$50.00');
    await page.locator('#fee').fill('101');
    assert.equal(await page.locator('#revenue').innerText(), '—');
    assert.match(await page.locator('#calc-error').innerText(), /0–100%/);
    await page.locator('#fee').fill('5');
    await page.locator('#currency').selectOption('INR');
    assert.match(await page.locator('#revenue').innerText(), /₹1,000/);
    await page.goto(base + 'library.html');
    await page.locator('#document-search').fill('startup research');
    assert.equal(await page.locator('.document-card:visible').count(), 2);
    await page.locator('#document-search').fill('no-such-document-123');
    assert.equal(await page.locator('.document-card:visible').count(), 0);
    assert.equal(await page.locator('#no-documents').isVisible(), true);
    await page.locator('#document-search').fill('');
    await page.locator('#document-category').selectOption('OpenSpec');
    assert.equal(await page.locator('.document-card:visible').count(), 6);
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      for (const chapter of chapters) {
        await page.goto(base + chapter + '.html');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, chapter + ' overflows ' + width);
      }
    }
    await page.goto(base + 'index.html');
    await page.getByRole('button',{name:/Chapters/}).click();
    assert.equal(await page.locator('#chapter-nav').isVisible(), true);
    await page.getByRole('link',{name:'Investor memo',exact:true}).click();
    assert.match(page.url(), /investor.html$/);
    await page.emulateMedia({ reducedMotion:'reduce', media:'print' });
    assert.equal(await page.locator('.sidebar').isVisible(), false);
    await page.emulateMedia({ media:'screen' });
    await page.goto(base+'index.html');
    await page.setViewportSize({width:390,height:844});
    await page.screenshot({path:path.join(root,'report-mobile.png'),fullPage:false});
    await page.setViewportSize({width:1440,height:1050});
    await page.screenshot({path:path.join(root,'report-desktop.png'),fullPage:false});
    assert.deepEqual(errors, []);
    assert.deepEqual(requests, [], 'Local site should not request external runtime resources');
    const result = {status:'pass',checked_at:new Date().toISOString(),html_pages_opened:htmlPages.length,chapter_mobile_widths:[390,320],checks:['file:// operation','desktop overflow','navigation','document search and filter','exchange arithmetic','product concept controls','pricing defaults, zero, negative margin and invalid input','currency display','mobile navigation','print layout','no JavaScript page errors','no HTTP(S) runtime requests'],limitations:['No chess engine or product functionality tested','Not a full accessibility audit','External source links were not crawled as part of browser tests','Full behavioral skill benchmarks were not run']};
    result.manifest_sha256 = require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root,'report/manifest.json'))).digest('hex');
    fs.writeFileSync(path.join(root,'report/verification.json'),JSON.stringify(result,null,2)+'\n');
    console.log('PASS: '+htmlPages.length+' document/chapter pages; offline interactions, desktop/mobile, print and no external runtime requests');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });

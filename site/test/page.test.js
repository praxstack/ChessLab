// Page hygiene for the built site in public/: one h1 per page, alt text and
// sizes on every image, nothing inline that the CSP would block, a labelled
// waitlist form that posts without JavaScript, and hand-drawn marks that are
// in the HTML (so the page is complete before any script runs) and hidden
// from assistive technology.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGES = ['index.html', 'privacy/index.html', 'terms/index.html', '404.html'];
const read = (rel) => readFileSync(join(root, 'public', rel), 'utf8');
const tags = (html, name) => html.match(new RegExp(`<${name}\\b[^>]*>`, 'g')) || [];
const attr = (tag, name) => {
  const m = new RegExp(`\\s${name}(?:="([^"]*)")?(?=[\\s>/])`).exec(tag);
  return m ? (m[1] ?? '') : null;
};

for (const rel of PAGES) {
  const html = read(rel);

  test(`${rel}: exactly one h1`, () => {
    assert.equal(tags(html, 'h1').length, 1);
  });

  test(`${rel}: every image has alt text, width and height`, () => {
    for (const img of tags(html, 'img')) {
      assert.notEqual(attr(img, 'alt'), null, `missing alt: ${img}`);
      assert.match(attr(img, 'width') || '', /^\d+$/, `missing width: ${img}`);
      assert.match(attr(img, 'height') || '', /^\d+$/, `missing height: ${img}`);
    }
  });

  test(`${rel}: no inline scripts, styles or event handlers`, () => {
    for (const script of tags(html, 'script')) {
      assert.notEqual(attr(script, 'src'), null, `inline script: ${script}`);
    }
    assert.doesNotMatch(html, /<style\b/i);
    assert.doesNotMatch(html, /\sstyle="/i);
    assert.doesNotMatch(html, /\son[a-z]+="/i);
  });

  test(`${rel}: hand-drawn marks are decorative and already drawn in the HTML`, () => {
    for (const svg of tags(html, 'svg')) {
      if (/class="(brand__mark)"/.test(svg)) continue;
      assert.equal(attr(svg, 'aria-hidden'), 'true', `svg not hidden from assistive technology: ${svg}`);
    }
    for (const el of tags(html, '[a-z0-9]+').filter((t) => /\sdata-draw[\s>]/.test(t))) {
      assert.doesNotMatch(el, /data-mark=/, `mark left unrendered: ${el}`);
    }
    // Every data-draw element carries at least one stroke.
    const draws = html.split(/\sdata-draw(?=[\s>])/).length - 1;
    const strokes = (html.match(/<path class="stroke" pathLength="1" d="M[^"]+"/g) || []).length;
    assert.ok(strokes >= draws, `${draws} marks but only ${strokes} strokes`);
    // Text the coach writes is in the page, not added by script.
    for (const m of html.matchAll(/<([a-z0-9]+)\b[^>]*\sdata-write\b[^>]*>([\s\S]*?)<\/\1>/g)) {
      assert.ok(m[2].replace(/<[^>]+>/g, '').trim().length > 0, `empty handwritten note: ${m[0].slice(0, 80)}`);
    }
  });
}

test('index.html: the waitlist form works without JavaScript and every field is labelled', () => {
  const html = read('index.html');
  const form = /<form\b[^>]*id="join-form"[^>]*>/.exec(html);
  assert.ok(form, 'waitlist form missing');
  assert.equal(attr(form[0], 'action'), '/api/waitlist');
  assert.equal(attr(form[0], 'method'), 'post');
  const body = html.slice(form.index, html.indexOf('</form>', form.index));
  const controls = [...tags(body, 'input'), ...tags(body, 'select')].filter((t) => attr(t, 'type') !== 'hidden');
  assert.ok(controls.length >= 4);
  for (const control of controls) {
    const id = attr(control, 'id');
    assert.ok(id, `control without id: ${control}`);
    assert.match(body, new RegExp(`<label for="${id}"`), `no label for #${id}`);
  }
  const email = controls.find((t) => attr(t, 'id') === 'join-email');
  assert.equal(attr(email, 'type'), 'email');
  assert.notEqual(attr(email, 'required'), null);
  assert.notEqual(attr(tags(body, 'input').find((t) => attr(t, 'id') === 'join-consent'), 'required'), null);
  assert.match(body, /<div class="hp" aria-hidden="true">/);
  assert.match(body, /<button class="[^"]*\bjoin__submit\b[^"]*" type="submit">/);
});

test('index.html: the walkthrough is pre-rendered with a board, a note and the score sheet', () => {
  const html = read('index.html');
  assert.match(html, /<div class="board" role="img" aria-label="Chessboard, viewed from Black's side\./);
  assert.equal((html.match(/class="note__page[ "]/g) || []).length, 6);
  assert.match(html, /<table class="ss" aria-label="Score sheet/);
  assert.equal((html.match(/class="ss__mv ss__btn"/g) || []).length, 5);
});

test('styles: every font and image the stylesheet uses exists, and the fonts are credited', () => {
  const css = readFileSync(join(root, 'public/assets/app.css'), 'utf8');
  const urls = [...css.matchAll(/url\('([^']+)'\)/g)].map((m) => m[1]);
  assert.ok(urls.length > 0);
  for (const url of urls) {
    assert.ok(url.startsWith('/'), `remote or relative url in CSS: ${url}`);
    assert.ok(existsSync(join(root, 'public', url)), `missing file for ${url}`);
  }
  const ofl = readFileSync(join(root, 'public/assets/fonts/OFL.txt'), 'utf8');
  for (const family of new Set([...css.matchAll(/font-family: '([^']+)';\n\s+src:/g)].map((m) => m[1]))) {
    assert.ok(ofl.includes(family), `${family} is not credited in OFL.txt`);
  }
});

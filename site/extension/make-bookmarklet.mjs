// Builds the "Send to my board" bookmark from reader.js, so the bookmark and
// the extension read the board the same way. Writes bookmarklet.txt and the
// copy box on the puzzle page (between the BOOKMARKLET markers).
//   node extension/make-bookmarklet.mjs           write
//   node extension/make-bookmarklet.mjs --check   exit 1 if out of date
import { readFile, writeFile } from 'node:fs/promises';

const here = new URL('./', import.meta.url);
const reader = await readFile(new URL('reader.js', here), 'utf8');
const body = reader
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .filter((l) => !/^\s*\/\//.test(l))
  .map((l) => l.trim())
  .filter(Boolean)
  .join(' ');
const run =
  "var R=globalThis.AskTheMoveReader,g=R.readPage(document);if(g.error){alert(g.error)}else{location.href=R.boardUrl(g.fen,'bookmark')}";
export const bookmarklet = `javascript:(function(){${body}${run}})()`;

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const page = new URL('../pages/puzzleanalyzr.html', here);
const html = await readFile(page, 'utf8');
const next = html.replace(/(<!-- BOOKMARKLET -->)[\s\S]*?(<!-- \/BOOKMARKLET -->)/, `$1${esc(bookmarklet)}$2`);
const txt = new URL('bookmarklet.txt', here);
let old = '';
try {
  old = await readFile(txt, 'utf8');
} catch {}
if (process.argv.includes('--check')) {
  if (old !== `${bookmarklet}\n` || next !== html) {
    console.error('Bookmark is out of date: run node extension/make-bookmarklet.mjs');
    process.exit(1);
  }
} else {
  await writeFile(txt, `${bookmarklet}\n`);
  await writeFile(page, next);
  console.log(`bookmark: ${bookmarklet.length} characters`);
}

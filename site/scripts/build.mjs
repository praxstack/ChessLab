#!/usr/bin/env node
// Renders pages/*.html into public/ and writes the files that depend on the
// site config (robots.txt, sitemap.xml, _headers, _redirects, site.webmanifest).
//
//   node scripts/build.mjs          write public/
//   node scripts/build.mjs --check  exit 1 if public/ is out of date
//
// Change the domain, contact address or Turnstile site key in site.config.json,
// then run `npm run build`. public/ is committed so it can be deployed as-is.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEMO } from '../public/assets/demo-data.js';
import {
  arrowsSVG,
  boardLabel,
  coordsHTML,
  overlaysHTML,
  piecesHTML,
  sanHTML,
} from '../public/assets/board.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(readFileSync(join(root, 'site.config.json'), 'utf8'));
const check = process.argv.includes('--check');

const siteUrl = config.siteUrl.replace(/\/+$/, '');
if (!/^https:\/\/[a-z0-9.-]+$/i.test(siteUrl)) throw new Error(`siteUrl must look like https://example.com, got ${siteUrl}`);
if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(config.contactEmail)) throw new Error('contactEmail looks wrong');

const turnstileKey = (config.turnstileSiteKey || '').trim();
const TURNSTILE_HOST = 'https://challenges.cloudflare.com';

const PAGES = [
  {
    src: 'index.html',
    out: 'index.html',
    path: '/',
    title: 'AskTheMove: the chess coach that explains why',
    description:
      'AskTheMove shows adult chess improvers why a move was a mistake, using evidence from Stockfish and the rules of chess, then lets you try your own idea. Join the free public beta waitlist.',
  },
  {
    src: 'privacy.html',
    out: 'privacy/index.html',
    path: '/privacy/',
    title: 'Privacy notice · AskTheMove',
    description: 'What the AskTheMove beta waitlist collects, why, where it is stored and how to delete it.',
  },
  {
    src: 'terms.html',
    out: 'terms/index.html',
    path: '/terms/',
    title: 'Beta terms · AskTheMove',
    description: 'Short terms for the AskTheMove waitlist and public beta.',
  },
  {
    src: '404.html',
    out: '404.html',
    path: '/404',
    title: 'Page not found · AskTheMove',
    description: 'This page does not exist.',
    robots: 'noindex',
  },
];

const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function demoHTML() {
  const step = DEMO.main[0];
  const o = DEMO.orientation;
  const total = DEMO.main.length;
  const stripMap = [0, 1, 3, 3, 4]; // strip move -> main step
  const strip = DEMO.strip
    .map((m, i) => {
      const current = step.strip === i ? ' aria-current="step"' : '';
      const note = m.note ? `<span class="strip__note">${m.note}</span>` : '';
      return `<li><button type="button" class="strip__move" data-goto="${stripMap[i]}"${current} disabled><span class="strip__n">${m.n}</span>${sanHTML(m.san)}${note}</button></li>`;
    })
    .join('');
  const branch = DEMO.branchStrip
    .map((m) => `<li><span class="strip__move strip__move--static"><span class="strip__n">${m.n}</span>${sanHTML(m.san)}</span></li>`)
    .join('');
  const notePage = (st, key, count, current) => `<div class="note__page${current ? ' is-current' : ''}" data-key="${key}"${current ? '' : ' aria-hidden="true"'}>
      <p class="note__label"><span class="note__count">${count}</span> <span class="note__label-text">${st.label}</span></p>
      <p class="note__title">${st.title}</p>
      <p class="note__body">${st.body}</p>
      <p class="note__evidence"><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>${st.evidence}</span></p>
    </div>`;
  const pages = [
    ...DEMO.main.map((st, i) => notePage(st, `main-${i}`, `${i + 1} / ${total}`, i === 0)),
    ...DEMO.branch.steps.map((st, i) => notePage(st, `branch-${i}`, 'Branch', false)),
  ].join('');
  const pips = DEMO.main.map((_, i) => `<span class="pip${i === 0 ? ' is-current' : ''}"><i></i></span>`).join('');
  return `<figure class="demo" id="demo" aria-labelledby="demo-title">
  <figcaption class="demo__head">
    <span class="demo__kicker">Try it</span>
    <span class="demo__title" id="demo-title">A classic trap, move by move</span>
    <span class="demo__side">You are Black</span>
  </figcaption>
  <div class="board" role="img" aria-label="${escAttr(boardLabel(step))}">
    <div class="board__layer board__hl">${overlaysHTML({ ...step, badge: null }, o)}</div>
    <div class="board__layer board__coords" aria-hidden="true">${coordsHTML(o)}</div>
    <div class="board__layer board__pieces">${piecesHTML(step.fen, o)}</div>
    <svg class="board__arrows" viewBox="0 0 8 8" aria-hidden="true" focusable="false">${arrowsSVG(step.arrows, o)}</svg>
    <div class="board__layer board__badges">${overlaysHTML({ badge: step.badge }, o)}</div>
  </div>
  <div class="note" id="demo-note">
    <div class="note__pips" aria-hidden="true">${pips}</div>
    <div class="strip-wrap">
      <ol class="strip" aria-label="Moves in the game">${strip}</ol>
      <ol class="strip strip--branch" aria-label="Your branch" hidden><li class="strip__fork" aria-hidden="true"><svg viewBox="0 0 16 16" width="14" height="14"><path d="M4 2v12M4 9c0-3 8-2 8-6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></li>${branch}</ol>
    </div>
    <div class="note__stack">${pages}</div>
  </div>
  <div class="demo__controls">
    <button type="button" class="ctl" data-act="prev" disabled><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Back</button>
    <button type="button" class="ctl ctl--next" data-act="next" disabled><span class="ctl__text">Next</span><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    <button type="button" class="ctl ctl--branch" data-act="branch" disabled><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M4 2v12M4 9c0-3 8-2 8-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><span class="ctl__text">Try another line</span></button>
  </div>
  <p class="demo__fine">A scripted walkthrough of the idea, not the live tutor. Every move and claim in it was checked with a chess rules library and Stockfish 19.</p>
</figure>`;
}

// Small static boards and move lists for the "How it works" panels. They reuse the
// verified walkthrough data, so test/demo-chess.test.js covers them too.
function stepById(id) {
  const step = [...DEMO.main, ...DEMO.branch.steps].find((s) => s.id === id);
  if (!step) throw new Error(`Unknown demo step ${id}`);
  return step;
}

function miniBoardHTML(id) {
  const step = stepById(id);
  const o = DEMO.orientation;
  return `<div class="board board--mini" role="img" aria-label="${escAttr(boardLabel(step))}">
  <div class="board__layer board__hl">${overlaysHTML({ ...step, badge: null }, o)}</div>
  <div class="board__layer board__pieces">${piecesHTML(step.fen, o)}</div>
  <svg class="board__arrows" viewBox="0 0 8 8" aria-hidden="true" focusable="false">${arrowsSVG(step.arrows, o)}</svg>
  <div class="board__layer board__badges">${overlaysHTML({ badge: step.badge }, o)}</div>
</div>`;
}

function gameMoves() {
  const plies = [...DEMO.opening, ...DEMO.main.flatMap((s) => s.play)];
  return plies.map((san, i) => {
    const n = Math.floor(i / 2) + 1;
    const black = i % 2 === 1;
    return { n: black ? `${n}…` : `${n}.`, san, color: black ? 'b' : 'w', note: i === DEMO.opening.length ? '??' : '' };
  });
}

const MOVE_LISTS = {
  main: () => DEMO.strip,
  mate: () => DEMO.strip.slice(2),
  branch: () => DEMO.branchStrip,
  game: gameMoves,
};

function movesHTML(name) {
  if (!MOVE_LISTS[name]) throw new Error(`Unknown move list ${name}`);
  return MOVE_LISTS[name]()
    .map((m, i) => {
      const num = m.color === 'w' || i === 0 ? `<span class="mv__n">${m.n}</span>` : '';
      const note = m.note ? `<span class="mock__flag">${m.note}</span>` : '';
      return `<span class="mv${m.note ? ' mv--key' : ''}">${num}${sanHTML(m.san)}${note}</span>`;
    })
    .join(' ');
}

function renderHome(html) {
  return html
    .replace('<!-- @demo -->', demoHTML())
    .replace(/<!-- @board ([a-z]+) -->/g, (_, id) => miniBoardHTML(id))
    .replace(/<!-- @moves ([a-z]+) -->/g, (_, name) => movesHTML(name))
    .replace(/<!-- @san ([A-Za-z0-9+#=]+) -->/g, (_, san) => sanHTML(san));
}

function render(template, vars, depth = 0) {
  if (depth > 5) throw new Error('include depth exceeded');
  let out = template.replace(/<!-- @include ([a-z0-9-]+) -->/g, (_, name) =>
    render(readFileSync(join(root, 'pages/partials', `${name}.html`), 'utf8').trimEnd(), vars, depth + 1),
  );
  out = out.replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => {
    if (!(key in vars)) throw new Error(`Unknown template variable {{${key}}}`);
    return vars[key];
  });
  return out;
}

function csp() {
  const script = ["'self'"];
  const frame = ["'none'"];
  if (turnstileKey) {
    script.push(TURNSTILE_HOST);
    frame.splice(0, 1, TURNSTILE_HOST);
  }
  return [
    "default-src 'self'",
    `script-src ${script.join(' ')}`,
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    `frame-src ${frame.join(' ')}`,
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "manifest-src 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}

function outputs() {
  const files = new Map();
  const shared = {
    SITE_URL: siteUrl,
    SITE_NAME: config.siteName,
    CONTACT_EMAIL: config.contactEmail,
    YEAR: String(config.copyrightYear),
    UPDATED: config.legalUpdated,
    TURNSTILE_WIDGET: turnstileKey
      ? `<div class="cf-turnstile" data-sitekey="${escAttr(turnstileKey)}" data-theme="dark" data-size="flexible"></div>`
      : '',
    TURNSTILE_SCRIPT: turnstileKey ? `<script src="${TURNSTILE_HOST}/turnstile/v0/api.js" async defer></script>` : '',
  };
  for (const page of PAGES) {
    const template = readFileSync(join(root, 'pages', page.src), 'utf8');
    let html = render(template, {
      ...shared,
      PAGE_TITLE: page.title,
      PAGE_DESCRIPTION: page.description,
      PAGE_PATH: page.path,
      ROBOTS: page.robots || 'index, follow',
    });
    if (page.src === 'index.html') html = renderHome(html);
    // Empty optional slots (such as the Turnstile widget) leave blank, indented lines.
    html = html.replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n');
    files.set(page.out, html);
  }

  files.set('robots.txt', `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${siteUrl}/sitemap.xml\n`);
  const urls = PAGES.filter((p) => !p.robots)
    .map((p) => `  <url><loc>${siteUrl}${p.path}</loc></url>`)
    .join('\n');
  files.set(
    'sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
  );
  files.set(
    '_headers',
    [
      '# Generated by scripts/build.mjs. Edit there, not here.',
      '/*',
      `  Content-Security-Policy: ${csp()}`,
      '  X-Content-Type-Options: nosniff',
      '  Referrer-Policy: strict-origin-when-cross-origin',
      '  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
      '  X-Frame-Options: DENY',
      '  Cross-Origin-Opener-Policy: same-origin',
      '',
      '/assets/fonts/*',
      '  Cache-Control: public, max-age=31536000, immutable',
      '',
      '/assets/pieces/*',
      '  Cache-Control: public, max-age=604800',
      '',
    ].join('\n'),
  );
  // Short links that are easy to say out loud or put in a post.
  files.set('_redirects', ['# Generated by scripts/build.mjs. Edit there, not here.', '/join /#join 302', '/beta /#join 302', ''].join('\n'));
  files.set(
    'site.webmanifest',
    `${JSON.stringify(
      {
        name: config.siteName,
        short_name: config.siteName,
        description: 'The chess coach that explains why.',
        start_url: '/',
        display: 'browser',
        background_color: '#141824',
        theme_color: '#141824',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      null,
      2,
    )}\n`,
  );
  return files;
}

const files = outputs();
const stale = [];
for (const [rel, content] of files) {
  const target = join(root, 'public', rel);
  const current = existsSync(target) ? readFileSync(target, 'utf8') : null;
  if (current === content) continue;
  if (check) {
    stale.push(rel);
  } else {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
    console.log(`wrote public/${rel}`);
  }
}
if (check) {
  if (stale.length) {
    console.error(`public/ is out of date (run npm run build): ${stale.join(', ')}`);
    process.exit(1);
  }
  console.log('public/ is up to date');
}

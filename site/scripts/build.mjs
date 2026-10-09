#!/usr/bin/env node
// Renders pages/*.html into public/ and writes the files that depend on the
// site config (robots.txt, sitemap.xml, _headers, _redirects, site.webmanifest).
//
//   node scripts/build.mjs          write public/
//   node scripts/build.mjs --check  exit 1 if public/ is out of date
//
// Change the domain, contact address or Turnstile site key in site.config.json,
// then run `npm run build`. public/ is committed so it can be deployed as-is.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync } from 'node:fs';
import { dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEMO } from '../public/assets/demo-data.js';
import {
  PENCIL_SVG,
  badgesHTML,
  boardLabel,
  filesHTML,
  inkSVG,
  lastHTML,
  piecesHTML,
  ranksHTML,
  sanHTML,
} from '../public/assets/board.js';
import { markSVG, seedFrom } from '../public/assets/ink.js';
import { PULSE } from '../src/lib/config.js';

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
  {
    // The template for the manage page. It is served at /manage/ by a Pages
    // Function that fills in a person's choices, so the built file lives under
    // assets/ where it is never mistaken for the page itself.
    src: 'manage.html',
    out: 'assets/manage.html',
    path: '/manage/',
    title: 'Your sign-up · AskTheMove',
    description: 'Change which emails you get from AskTheMove, or delete your sign-up.',
    robots: 'noindex',
  },
];

// The market-pulse questions, drawn from the same config the API validates
// against, so a question can never be shown that the server would refuse.
function pulseHTML(prefix) {
  const questions = Object.entries(PULSE.questions)
    .map(([key, question]) => {
      const options = Object.entries(question.options)
        .map(
          ([value, label]) =>
            `<div class="radio"><input id="pulse-${prefix}-${key}-${value}" name="${key}" type="radio" value="${value}"><label for="pulse-${prefix}-${key}-${value}">${label}</label></div>`,
        )
        .join('\n      ');
      return `<fieldset class="pulse__q">
      <legend>${question.label}</legend>
      ${options}
    </fieldset>`;
    })
    .join('\n    ');
  const ft = PULSE.freeText;
  return `<div class="pulse">
    ${questions}
    <div class="field field--wish">
      <label for="pulse-${prefix}-${ft.key}">${ft.label} <span class="optional">Optional</span></label>
      <textarea id="pulse-${prefix}-${ft.key}" name="${ft.key}" rows="2" maxlength="${ft.max}"></textarea>
    </div>
  </div>`;
}

const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// The board as a book diagram: rank numbers down the left, file letters along
// the bottom, the crisp board, and the coach's marks drawn over it.
function diagramHTML(step, { mini = false, pencil = false, label } = {}) {
  const o = DEMO.orientation;
  const coords = !mini;
  return `<div class="diagram${mini ? ' diagram--mini' : ''}">
${coords ? `  <div class="diagram__ranks" aria-hidden="true">${ranksHTML(o)}</div>\n` : ''}  <div class="board${mini ? ' board--mini' : ''}" role="img" aria-label="${escAttr(label || boardLabel(step))}">
    <div class="board__layer board__hl">${lastHTML(step, o)}</div>
    <div class="board__layer board__pieces">${piecesHTML(step.fen, o)}</div>
    <svg class="board__ink" viewBox="0 0 80 80" aria-hidden="true" focusable="false"${mini ? ' data-draw' : ''}>${inkSVG(step, o)}${pencil ? PENCIL_SVG : ''}</svg>
    <div class="board__layer board__badges">${badgesHTML(step, o)}</div>
  </div>
${coords ? `  <div class="diagram__files" aria-hidden="true">${filesHTML(o)}</div>\n` : ''}</div>`;
}

// The whole game as a paper score sheet: numbered rows, White and Black
// columns. The moves the walkthrough covers are buttons that jump to a step.
function scoreSheetHTML() {
  const plies = [...DEMO.opening, ...DEMO.main.flatMap((s) => s.play)];
  const stepOfPly = new Map();
  const stripMap = [0, 1, 3, 3, 4]; // strip move -> main step
  DEMO.strip.forEach((_, i) => stepOfPly.set(DEMO.opening.length - 1 + i, stripMap[i]));
  const firstStep = DEMO.main[0];
  const cell = (san, ply) => {
    if (san === undefined) return '<td></td>';
    if (!stepOfPly.has(ply)) return `<td><span class="ss__mv">${san}</span></td>`;
    const goto = stepOfPly.get(ply);
    const stripIndex = ply - (DEMO.opening.length - 1);
    const note = DEMO.strip[stripIndex].note ? `<span class="ss__ann">${DEMO.strip[stripIndex].note}</span>` : '';
    const current = firstStep.strip === stripIndex ? ' aria-current="step"' : '';
    const ring = markSVG('circle', 160, 100, seedFrom(`ss:${san}`), 'ss__ring');
    return `<td><button type="button" class="ss__mv ss__btn" data-goto="${goto}" data-strip="${stripIndex}"${current} disabled><span class="ss__san">${san}</span>${note}${ring}</button></td>`;
  };
  let rows = '';
  for (let i = 0; i < plies.length; i += 2) {
    const n = i / 2 + 1;
    rows += `<tr><th scope="row">${n}</th>${cell(plies[i], i)}${cell(plies[i + 1], i + 1)}</tr>`;
    if (n === 5) {
      const line = DEMO.branchStrip.map((m) => `${m.n}${m.san}`).join(' ');
      const ring = markSVG('circle', 300, 100, seedFrom('ss:branch'), 'ss__ring');
      rows += `<tr class="ss__var" hidden><td colspan="3"><span class="ss__var-line" aria-current="step">(${line})${ring}</span></td></tr>`;
    }
  }
  return `<div class="demo__sheet">
    <table class="ss" aria-label="Score sheet: the moves of the game">
      <caption class="ss__cap">Score sheet</caption>
      <thead><tr><th scope="col">No.</th><th scope="col">White</th><th scope="col">Black</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="ss__result"><span class="ss__result-label">Result</span> 1–0</p>
  </div>`;
}

function notePageHTML(st, key, count, current) {
  return `<div class="note__page${current ? ' is-current' : ''}" data-key="${key}"${current ? '' : ' aria-hidden="true"'}>
      <p class="note__label">${count ? `<span class="note__count">${count}</span> ` : ''}<span class="note__label-text">${st.label}</span></p>
      <p class="note__title" data-write>${st.title}</p>
      <p class="note__body" data-write>${st.body}</p>
      <p class="note__evidence">${markSVG('tick', 110, 100, seedFrom(`ev:${key}`), 'note__tick')}<span>${st.evidence}</span></p>
    </div>`;
}

function demoHTML() {
  const step = DEMO.main[0];
  const total = DEMO.main.length;
  const pages = [
    ...DEMO.main.map((st, i) => notePageHTML(st, `main-${i}`, `${i + 1} / ${total}`, i === 0)),
    ...DEMO.branch.steps.map((st, i) => notePageHTML(st, `branch-${i}`, '', false)),
  ].join('\n    ');
  const chevron = (dir) =>
    `<svg class="ctl__icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="${dir === 'l' ? 'M10.5 2.8 4.8 8.2l5.9 5' : 'M5.6 2.8l5.8 5.3-5.9 5'}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  return `<div class="demo" id="demo">
  ${scoreSheetHTML()}
  <figure class="demo__board" aria-labelledby="lesson-title">
${diagramHTML(step, { pencil: true })}
  </figure>
  <div class="note" id="demo-note">
    <div class="note__stack">
    ${pages}
    </div>
  </div>
  <div class="demo__controls">
    <button type="button" class="ctl" data-act="prev" disabled>${chevron('l')}Back</button>
    <button type="button" class="ctl ctl--next" data-act="next" disabled><span class="ctl__text">Next</span>${chevron('r')}</button>
    <button type="button" class="ctl ctl--branch" data-act="branch" disabled><svg class="ctl__icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="M4.5 1.8v12.4M4.5 9.2c0-3.2 7.4-2.2 7.4-6.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><span class="ctl__text">Try another line</span></button>
  </div>
</div>`;
}

// Small diagrams for the "How it works" figures. They reuse the verified
// walkthrough data, so test/demo-chess.test.js covers them too.
function stepById(id) {
  const step = [...DEMO.main, ...DEMO.branch.steps].find((s) => s.id === id);
  if (!step) throw new Error(`Unknown demo step ${id}`);
  return step;
}

function miniBoardHTML(id) {
  return diagramHTML(stepById(id), { mini: true });
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
      const note = m.note ? `<span class="printout__flag">${m.note}</span>` : '';
      return `<span class="mv${m.note ? ' mv--key' : ''}">${num}${sanHTML(m.san)}${note}</span>`;
    })
    .join(' ');
}

// Hand-drawn marks. In the templates, an element with data-mark="kind [aspect]"
// gets an inline SVG of that mark, drawn once at build time with a seeded hand,
// so every mark is in the HTML before any script runs. app.js only animates it.
const GLYPH_ASPECT = { tick: 1.1, cross: 1, plus: 1, circle: 1.15, arrow: 1.7, hook: 1.5, swoop: 1.7, return: 1.5, fork: 0.8 };
const TEXT_BOX = {
  // Approximate box the CSS gives each mark around its text, in em: [extra width, height].
  circle: [0.52, 1.55],
  highlight: [0.24, 1.05],
  underline: [0.1, 0.5],
  double: [0.1, 0.6],
};

function visibleLength(html) {
  return html
    .replace(/<[^>]+>/g, 'x')
    .replace(/&[a-z]+;/g, 'x').length;
}

function renderMarks(html) {
  return html.replace(
    /<(span|i) class="([^"]*)" data-mark="([a-z]+)(?: ([0-9.]+))?">([\s\S]*?)<\/\1>/g,
    (_, tag, cls, kind, aspectArg, inner) => {
      let aspect = Number(aspectArg) || 0;
      if (!aspect) {
        if (tag === 'i') aspect = GLYPH_ASPECT[kind] || 1;
        else {
          const [extra, height] = TEXT_BOX[kind] || [0.2, 1.1];
          aspect = (visibleLength(inner) * 0.52 + extra) / height;
        }
      }
      const h = 100;
      const w = Math.round(h * aspect);
      const seed = seedFrom(`${kind}:${inner}:${cls}`);
      const svg = markSVG(kind, w, h, seed, 'ink__svg');
      const content = tag === 'i' ? svg : `${inner}${svg}`;
      return `<${tag} class="${cls}" data-draw>${content}</${tag}>`;
    },
  );
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
      ? `<div class="cf-turnstile" data-sitekey="${escAttr(turnstileKey)}" data-theme="light" data-size="flexible"></div>`
      : '',
    TURNSTILE_SCRIPT: turnstileKey ? `<script src="${TURNSTILE_HOST}/turnstile/v0/api.js" async defer></script>` : '',
    // Turnstile's check runs in the browser, so with it on, a visitor without
    // JavaScript is pointed to the contact address instead.
    NOSCRIPT_NOTE: turnstileKey
      ? `The spam check on this form needs JavaScript. If you can’t turn it on, email ${config.contactEmail} and we’ll add you.`
      : 'Without JavaScript the form still works: you’ll come back to this page with the result.',
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
    html = html.replace(/<!-- @pulse ([a-z]+) -->/g, (_, prefix) => pulseHTML(prefix));
    html = renderMarks(html);
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
      '/assets/manage.html',
      '  X-Robots-Tag: noindex',
      '  Cache-Control: no-store',
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
        background_color: '#fbfaf4',
        theme_color: '#fbfaf4',
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
// public/ is what gets deployed, so a page dropped from PAGES must not stay there.
const generatedPages = new Set([...files.keys()].filter((rel) => rel.endsWith('.html')));
const builtPages = readdirSync(join(root, 'public'), { recursive: true })
  .map((rel) => String(rel).split(sep).join('/'))
  .filter((rel) => rel.endsWith('.html') && !rel.startsWith('assets/'));
for (const rel of builtPages) {
  if (generatedPages.has(rel)) continue;
  if (check) {
    stale.push(`${rel} (no longer generated)`);
  } else {
    unlinkSync(join(root, 'public', rel));
    console.log(`removed public/${rel}`);
  }
}
if (check) {
  if (stale.length) {
    console.error(`public/ is out of date (run npm run build): ${stale.join(', ')}`);
    process.exit(1);
  }
  console.log('public/ is up to date');
}

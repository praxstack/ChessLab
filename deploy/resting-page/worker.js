// Sits in front of app.askthemove.online. Every request goes to the app on the host Mac as usual.
// When the Mac's tunnel is down (Cloudflare 1033, status 530) or the app isn't answering (502),
// visitors see a "board is resting" page in the main site's notebook style, with a link to the
// Puzzle Launcher, instead of Cloudflare's error page.

const OFFLINE = new Set([502, 530]);
const SITE = 'https://askthemove.online';
// Files this page borrows from the main site, served from the same origin so its CSP holds.
const ASSETS = new Map([
  ['/__resting/fonts/vollkorn-var.woff2', '/assets/fonts/vollkorn-var.woff2'],
  ['/__resting/fonts/kalam-700.woff2', '/assets/fonts/kalam-700.woff2'],
  ['/__resting/fonts/courier-prime-400.woff2', '/assets/fonts/courier-prime-400.woff2'],
  ['/__resting/pieces/wK.svg', '/assets/pieces/wK.svg'],
]);

export async function handle(request, env, fetchOrigin = fetch) {
  const url = new URL(request.url);
  const asset = ASSETS.get(url.pathname);
  if (asset) return borrow(asset, fetchOrigin);

  // Until launch, ALWAYS_REST=true keeps the app closed: every visit gets the page, even when the Mac is up.
  const always = String(env?.ALWAYS_REST ?? '').toLowerCase() === 'true';
  if (!always) {
    let response = null;
    try { response = await fetchOrigin(request); } catch { response = null; }
    if (response && !OFFLINE.has(response.status)) return response;
  }

  const launcher = safeLink(env?.LAUNCHER_URL);
  const wantsPage = (request.method === 'GET' || request.method === 'HEAD')
    && (request.headers.get('accept') || '').includes('text/html');
  const headers = always ? { 'cache-control': 'no-store' } : { 'cache-control': 'no-store', 'retry-after': '60' };
  if (!wantsPage) {
    const error = always ? 'AskTheMove is being rebuilt and is closed until launch.' : 'AskTheMove is offline right now. Try again in a few minutes.';
    return new Response(JSON.stringify({ error }),
      { status: 503, headers: { ...headers, 'content-type': 'application/json; charset=utf-8' } });
  }
  return new Response(request.method === 'HEAD' ? null : page(launcher, always), {
    status: 503,
    headers: {
      ...headers,
      'content-type': 'text/html; charset=utf-8',
      'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; font-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin',
    },
  });
}

async function borrow(path, fetchOrigin) {
  try {
    const res = await fetchOrigin(new Request(SITE + path));
    if (!res.ok) return new Response('Not found', { status: 404 });
    return new Response(res.body, {
      status: 200,
      headers: {
        'content-type': res.headers.get('content-type') || (path.endsWith('.svg') ? 'image/svg+xml' : 'font/woff2'),
        'cache-control': 'public, max-age=86400',
        'x-content-type-options': 'nosniff',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}

function safeLink(value) {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:') return url.href;
  } catch {}
  return SITE + '/puzzleanalyzr';
}

const escape = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

export function page(launcher, always = false) {
  const href = escape(launcher);
  const refresh = always ? '' : '\n<meta http-equiv="refresh" content="60">';
  const lede = always
    ? "We're rebuilding the AskTheMove beta: a smarter coach, a better-feeling board and a stronger engine. It opens again at launch. Your games and progress are safe."
    : "The AskTheMove beta runs on one small computer, and it's switched off right now. Your games and progress are safe. This page checks again every minute and turns back into the app by itself.";
  const status = always ? 'status: rebuilding · opens at launch' : 'status: offline · retry: every 60 s';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">${refresh}
<meta name="robots" content="noindex">
<title>The board is resting · AskTheMove</title>
<style>
@font-face { font-family: 'Vollkorn'; src: url('/__resting/fonts/vollkorn-var.woff2') format('woff2'); font-weight: 400 900; font-display: swap; }
@font-face { font-family: 'Kalam'; src: url('/__resting/fonts/kalam-700.woff2') format('woff2'); font-weight: 700; font-display: swap; }
@font-face { font-family: 'Courier Prime'; src: url('/__resting/fonts/courier-prime-400.woff2') format('woff2'); font-display: swap; }
:root {
  --paper: oklch(98.4% 0.008 95); --paper-2: oklch(96.5% 0.014 88); --grid: oklch(89% 0.035 235);
  --margin: oklch(70% 0.12 15); --ink: oklch(23% 0.025 265); --ink-2: oklch(40% 0.02 265);
  --graphite: oklch(46% 0.006 270); --red: oklch(54% 0.2 27); --blue: oklch(44% 0.17 264);
  --highlight: oklch(91% 0.15 102);
}
* { box-sizing: border-box; }
html { background: var(--paper); }
body {
  margin: 0; min-height: 100vh; color: var(--ink);
  font: 400 1.125rem/1.6 'Vollkorn', Georgia, 'Times New Roman', serif;
  background-color: var(--paper);
  background-image:
    linear-gradient(to right, transparent 94px, var(--margin) 94px, var(--margin) 95px, transparent 95px, transparent 98px, var(--margin) 98px, var(--margin) 99px, transparent 99px),
    linear-gradient(color-mix(in oklch, var(--grid) 55%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in oklch, var(--grid) 55%, transparent) 1px, transparent 1px);
  background-size: 100% 100%, 24px 24px, 24px 24px;
}
main { max-width: 44rem; padding: 4.5rem 1.5rem 4rem 132px; }
.brand { font-weight: 800; letter-spacing: -0.01em; color: var(--ink); text-decoration: none; font-size: 1.25rem; }
.brand span { color: var(--blue); }
.rule { border: 0; border-top: 3px double var(--ink); margin: 0.75rem 0 2.75rem; }
.king { display: block; width: 88px; height: 88px; transform: rotate(-78deg); margin: 0 0 0.5rem -6px; filter: drop-shadow(0 2px 0 var(--paper-2)); }
h1 { font-size: clamp(2.2rem, 6vw, 3.25rem); line-height: 1.08; font-weight: 800; margin: 0 0 1rem; letter-spacing: -0.015em; }
h1 em { font-style: normal; background: linear-gradient(transparent 58%, var(--highlight) 58%, var(--highlight) 92%, transparent 92%); }
.lede { color: var(--ink-2); margin: 0 0 2rem; max-width: 34rem; }
.note {
  font-family: 'Kalam', 'Comic Sans MS', cursive; font-weight: 700; color: var(--blue);
  font-size: 1.3rem; line-height: 1.35; margin: 0 0 1.25rem; max-width: 30rem; transform: rotate(-1.2deg);
}
.note b { color: var(--red); font-weight: 700; }
.actions { display: flex; flex-wrap: wrap; gap: 0.75rem 1.25rem; align-items: center; margin: 0 0 2.5rem; }
.btn {
  display: inline-block; padding: 0.8rem 1.35rem; border: 2px solid var(--blue); border-radius: 4px 9px 5px 8px;
  background: var(--blue); color: #fff; font-weight: 700; text-decoration: none;
  box-shadow: 3px 3px 0 var(--ink); transition: transform .12s ease, box-shadow .12s ease;
}
.btn:hover { transform: translate(-1px, -1px); box-shadow: 4px 4px 0 var(--ink); }
.btn:active { transform: translate(2px, 2px); box-shadow: 1px 1px 0 var(--ink); }
.btn:focus-visible, .plain:focus-visible { outline: 3px solid var(--red); outline-offset: 3px; }
.plain { color: var(--ink); text-decoration-color: var(--red); text-underline-offset: 4px; }
.printout {
  font-family: 'Courier Prime', 'Courier New', monospace; font-size: 0.9rem; color: var(--graphite);
  background: var(--paper-2); border-left: 3px solid var(--graphite); padding: 0.75rem 1rem; max-width: 30rem; margin: 0;
}
@media (max-width: 699px) {
  body { background-image:
    linear-gradient(to right, transparent 12px, var(--margin) 12px, var(--margin) 13px, transparent 13px),
    linear-gradient(color-mix(in oklch, var(--grid) 55%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in oklch, var(--grid) 55%, transparent) 1px, transparent 1px); }
  main { padding: 2.5rem 16px 3rem 28px; }
  .king { width: 68px; height: 68px; }
}
@media (prefers-reduced-motion: reduce) { .btn { transition: none; } }
</style>
</head>
<body>
<main>
  <a class="brand" href="https://askthemove.online/">Ask<span>TheMove</span></a>
  <hr class="rule">
  <img class="king" src="/__resting/pieces/wK.svg" alt="" width="88" height="88">
  <h1>The board is <em>resting</em>.</h1>
  <p class="lede">${lede}</p>
  <p class="note">While you wait: try today's puzzle in the <b>Puzzle Launcher</b> first, then solve it for real on Chess.com.</p>
  <p class="actions">
    <a class="btn" href="${href}">Open the Puzzle Launcher</a>
    <a class="plain" href="https://askthemove.online/">Back to askthemove.online</a>
  </p>
  <p class="printout">${status}</p>
</main>
</body>
</html>`;
}

export default {
  fetch(request, env) { return handle(request, env); },
};

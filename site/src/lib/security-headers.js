// The site's security headers, in one place. scripts/build.mjs writes them into
// public/_headers for static files; Cloudflare does not apply that file to
// responses a Pages Function generates, so the manage page sets them itself.

/** The content-security policy. Turnstile, when on, needs its script and frame.
 *  `connect` adds origins the page may fetch from (the puzzle page reads public chess APIs).
 *  `wasm` lets the page run WebAssembly (the puzzle page's Stockfish). */
export function csp({ turnstileHost = '', connect = [], wasm = false } = {}) {
  const script = ["'self'"];
  if (wasm) script.push("'wasm-unsafe-eval'");
  const frame = ["'none'"];
  if (turnstileHost) {
    script.push(turnstileHost);
    frame.splice(0, 1, turnstileHost);
  }
  return [
    "default-src 'self'",
    `script-src ${script.join(' ')}`,
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src ${["'self'", ...connect].join(' ')}`,
    `frame-src ${frame.join(' ')}`,
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "manifest-src 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}

/** Headers every HTML page carries, static or generated. Keys are lower case. */
export function pageHeaders({ turnstileHost = '', connect = [] } = {}) {
  return {
    'content-security-policy': csp({ turnstileHost, connect }),
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
    'x-frame-options': 'DENY',
    'cross-origin-opener-policy': 'same-origin',
  };
}

/** Where the puzzle page (/puzzleanalyzr/) fetches puzzles, games and the saved-puzzle list from.
 *  blob: is the engine file the page hands to Stockfish from the browser's cache. */
export const PUZZLE_CONNECT = ['https://api.chess.com', 'https://lichess.org', 'https://raw.githubusercontent.com', 'blob:'];

/** The policy for Stockfish's own files: its worker script only compiles the engine and reads it from a blob. */
export const ENGINE_CSP = "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self' blob:";

// The site's security headers, in one place. scripts/build.mjs writes them into
// public/_headers for static files; Cloudflare does not apply that file to
// responses a Pages Function generates, so the manage page sets them itself.

/** The content-security policy. Turnstile, when on, needs its script and frame. */
export function csp({ turnstileHost = '' } = {}) {
  const script = ["'self'"];
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

/** Headers every HTML page carries, static or generated. Keys are lower case. */
export function pageHeaders({ turnstileHost = '' } = {}) {
  return {
    'content-security-policy': csp({ turnstileHost }),
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
    'x-frame-options': 'DENY',
    'cross-origin-opener-policy': 'same-origin',
  };
}

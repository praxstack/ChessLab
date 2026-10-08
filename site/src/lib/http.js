// Response helpers shared by the Pages Functions.

const BASE_HEADERS = {
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
};

export function json(status, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...BASE_HEADERS, 'content-type': 'application/json; charset=utf-8', ...headers },
  });
}

export function redirect(location, status = 303) {
  return new Response(null, { status, headers: { ...BASE_HEADERS, location } });
}

export function methodNotAllowed(allow) {
  return json(405, { ok: false, error: 'That method is not allowed here.' }, { allow });
}

export function text(status, body, headers = {}) {
  return new Response(body, { status, headers: { ...BASE_HEADERS, ...headers } });
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Same-origin check. Browsers send Origin on POST; when it is present it must
 * match the host the request was made to. During local development any
 * localhost origin is accepted when the request itself is to localhost.
 */
export function isAllowedOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  let originUrl;
  let requestUrl;
  try {
    originUrl = new URL(origin);
    requestUrl = new URL(request.url);
  } catch {
    return false;
  }
  if (originUrl.host === requestUrl.host) return true;
  return LOCAL_HOSTS.has(requestUrl.hostname) && LOCAL_HOSTS.has(originUrl.hostname);
}

/** True when the caller wants JSON back (our fetch() calls), false for a plain HTML form post. */
export function wantsJson(request) {
  const type = (request.headers.get('content-type') || '').toLowerCase();
  const accept = (request.headers.get('accept') || '').toLowerCase();
  return type.includes('application/json') || accept.includes('application/json');
}

export function clientIp(request) {
  return request.headers.get('cf-connecting-ip') || '';
}

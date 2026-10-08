import { LIMITS, PRODUCT, REDIRECTS } from './config.js';
import { BodyError, readBody } from './body.js';
import { hashIp, timingSafeEqualText } from './hash.js';
import { clientIp, isAllowedOrigin, json, redirect, text, wantsJson } from './http.js';
import { countSubmission, retryAfterSeconds } from './ratelimit.js';
import { toCsv } from './csv.js';
import { verifyTurnstile } from './turnstile.js';
import {
  MESSAGES,
  cleanOptional,
  isHoneypotFilled,
  parseConsent,
  parseRating,
  validateEmail,
} from './validate.js';

const ERRORS = Object.freeze({
  origin: 'This form only accepts sign-ups from the AskTheMove site.',
  tooLarge: 'That request was too large.',
  unreadable: "We couldn't read that form. Please try again.",
  rateLimited: 'Too many attempts from your connection. Please wait ten minutes and try again.',
  turnstile: 'Please complete the human check and try again.',
  server: 'Something went wrong on our side. Please try again in a minute.',
});

/**
 * POST /api/waitlist
 * Returns JSON for fetch() callers, or a 303 redirect for plain HTML form posts.
 */
export async function handleWaitlistPost(request, env, { now = Date.now(), fetchImpl } = {}) {
  const asJson = wantsJson(request);
  const fail = (status, error, code, headers) =>
    asJson ? json(status, { ok: false, error }, headers) : redirect(REDIRECTS.error(code));
  const succeed = () => (asJson ? json(200, { ok: true }) : redirect(REDIRECTS.joined));

  try {
    if (!isAllowedOrigin(request)) return fail(403, ERRORS.origin, 'origin');

    let body;
    try {
      body = await readBody(request, LIMITS.bodyMaxBytes);
    } catch (error) {
      if (error instanceof BodyError && error.message === 'too-large') {
        return fail(413, ERRORS.tooLarge, 'too-large');
      }
      if (error instanceof BodyError) return fail(400, ERRORS.unreadable, 'unreadable');
      throw error;
    }

    // Bots fill the hidden "website" field. Pretend it worked and store nothing.
    if (isHoneypotFilled(body.website)) return succeed();

    // Without the secret salt the stored hashes could be reversed, so store nothing.
    if (!env.IP_HASH_SALT) {
      console.error('IP_HASH_SALT is not set; refusing sign-ups until it is.');
      return fail(503, ERRORS.server, 'server');
    }
    const ip = clientIp(request);
    const ipHash = await hashIp(ip, env.IP_HASH_SALT);
    const attempts = await countSubmission(env.DB, ipHash, now);
    if (attempts > LIMITS.rateLimitMax) {
      return fail(429, ERRORS.rateLimited, 'rate-limited', {
        'retry-after': String(retryAfterSeconds()),
      });
    }

    const email = validateEmail(body.email);
    if (!email.ok) return fail(400, email.error, 'email');
    if (!parseConsent(body.consent)) return fail(400, MESSAGES.consentMissing, 'consent');
    const rating = parseRating(body.rating);
    if (!rating.ok) return fail(400, rating.error, 'rating');

    if (env.TURNSTILE_SECRET) {
      const passed = await verifyTurnstile({
        secret: env.TURNSTILE_SECRET,
        token: body['cf-turnstile-response'],
        ip,
        fetchImpl: fetchImpl || fetch,
      });
      if (!passed) return fail(400, ERRORS.turnstile, 'turnstile');
    }

    const fields = rating.rating ? { rating: rating.rating } : {};
    const utm = {};
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'referrer']) {
      const value = cleanOptional(body[key]);
      if (value) utm[key] = value;
    }
    const stamp = new Date(now).toISOString();

    await env.DB.prepare(
      'INSERT INTO waitlist (email, product, fields, source, utm, consent_at, created_at, ip_hash) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (email) DO NOTHING',
    )
      .bind(
        email.email,
        PRODUCT,
        JSON.stringify(fields),
        cleanOptional(body.source) || null,
        JSON.stringify(utm),
        stamp,
        stamp,
        ipHash,
      )
      .run();

    // A new and an existing address get the same answer, so the form can't be
    // used to find out who has signed up.
    return succeed();
  } catch (error) {
    console.error('waitlist signup failed', error);
    return fail(500, ERRORS.server, 'server');
  }
}

export const EXPORT_COLUMNS = ['email', 'created_at', 'fields', 'source', 'utm'];

/** GET /api/waitlist/export — admin CSV download, Bearer ADMIN_TOKEN required. */
export async function handleExportGet(request, env, { now = Date.now() } = {}) {
  const header = request.headers.get('authorization') || '';
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  const authorized = Boolean(env.ADMIN_TOKEN && match) &&
    (await timingSafeEqualText(match[1].trim(), env.ADMIN_TOKEN));
  if (!authorized) {
    return json(401, { ok: false, error: 'A valid admin token is required.' }, {
      'www-authenticate': 'Bearer',
    });
  }
  try {
    const { results } = await env.DB.prepare(
      'SELECT email, created_at, fields, source, utm FROM waitlist ORDER BY id',
    ).all();
    const day = new Date(now).toISOString().slice(0, 10);
    return text(200, toCsv(EXPORT_COLUMNS, results || []), {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${PRODUCT}-waitlist-${day}.csv"`,
    });
  } catch (error) {
    console.error('waitlist export failed', error);
    return json(500, { ok: false, error: ERRORS.server });
  }
}

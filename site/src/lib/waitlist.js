import { LIMITS, LISTS, PRODUCT, PULSE, RATING_BANDS, REDIRECTS, managePath } from './config.js';
import { BodyError, readBody } from './body.js';
import { hashIp, randomToken, timingSafeEqualText } from './hash.js';
import { clientIp, isAllowedOrigin, json, redirect, text, wantsJson } from './http.js';
import { countSubmission, retryAfterSeconds } from './ratelimit.js';
import { toCsv } from './csv.js';
import { verifyTurnstile } from './turnstile.js';
import {
  MESSAGES,
  cleanOptional,
  isHoneypotFilled,
  parseConsent,
  parseLists,
  parsePulse,
  parseRating,
  parseToken,
  validateEmail,
} from './validate.js';

const ERRORS = Object.freeze({
  origin: 'This form only accepts sign-ups from the AskTheMove site.',
  tooLarge: 'That request was too large.',
  unreadable: "We couldn't read that form. Please try again.",
  rateLimited: 'Too many attempts from your connection. Please wait ten minutes and try again.',
  turnstile: 'Please complete the human check and try again.',
  server: 'Something went wrong on our side. Please try again in a minute.',
  link: 'This link isn’t valid. It may have been used to delete a sign-up.',
});

export const LIST_KEYS = Object.freeze(Object.keys(LISTS));

function emptyLists() {
  const out = {};
  for (const key of LIST_KEYS) out[key] = null;
  return out;
}

/** The stored lists JSON as { key: ISO timestamp | null }, tolerant of missing or odd data. */
export function parseStoredLists(value) {
  const out = emptyLists();
  let parsed;
  try {
    parsed = JSON.parse(value || '{}');
  } catch {
    return out;
  }
  if (!parsed || typeof parsed !== 'object') return out;
  for (const key of LIST_KEYS) if (typeof parsed[key] === 'string') out[key] = parsed[key];
  return out;
}

function listsOn(lists) {
  const out = {};
  for (const key of LIST_KEYS) out[key] = Boolean(lists[key]);
  return out;
}

function parseStoredAnswers(value) {
  try {
    const parsed = JSON.parse(value || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * POST /api/waitlist
 * Returns JSON for fetch() callers, or a 303 redirect for plain HTML form posts.
 */
export async function handleWaitlistPost(request, env, { now = Date.now(), fetchImpl } = {}) {
  const asJson = wantsJson(request);
  const fail = (status, error, code, headers) =>
    asJson ? json(status, { ok: false, error }, headers) : redirect(REDIRECTS.error(code));
  // A new sign-up gets its manage link back. An address that is already on the
  // list gets the same "ok" without one: the form must never hand out someone
  // else's link just because their address was typed in.
  const succeed = (token) =>
    asJson ? json(200, token ? { ok: true, manage: managePath(token) } : { ok: true }) : redirect(REDIRECTS.joined);

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
    const token = randomToken();
    const lists = { ...emptyLists(), beta: stamp };

    const result = await env.DB.prepare(
      'INSERT INTO waitlist (email, product, fields, source, utm, consent_at, created_at, lists, lists_updated_at, manage_token) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (email) DO NOTHING',
    )
      .bind(
        email.email,
        PRODUCT,
        JSON.stringify(fields),
        cleanOptional(body.source) || null,
        JSON.stringify(utm),
        stamp,
        stamp,
        JSON.stringify(lists),
        stamp,
        token,
      )
      .run();
    const inserted = Boolean(result && result.meta && result.meta.changes === 1);

    if (!inserted) {
      // Already on the list. Someone who left every list and signs up again has
      // consented afresh, so beta email goes back on. Nothing else changes.
      await env.DB.prepare(
        "UPDATE waitlist SET lists = json_set(COALESCE(lists, '{}'), '$.beta', ?), lists_updated_at = ?, consent_at = ? " +
          "WHERE email = ? AND json_extract(COALESCE(lists, '{}'), '$.beta') IS NULL",
      )
        .bind(stamp, stamp, stamp, email.email)
        .run();
      return succeed();
    }
    return succeed(token);
  } catch (error) {
    console.error('waitlist signup failed', error);
    return fail(500, ERRORS.server, 'server');
  }
}

/* ------------------------------------------------------------ Manage links */

/**
 * Shared start of every request that carries a manage-link token: origin
 * check, body, token (from the body or the query), a separate rate limit,
 * and the row. Returns { response } when the request must stop, otherwise
 * { token, row, body, asJson, lists, answers, fail }.
 */
async function tokenRequest(request, env, now) {
  const asJson = wantsJson(request);
  let token = '';
  const fail = (status, error, code, headers) => {
    if (asJson) return json(status, { ok: false, error }, headers);
    if (code === 'link') return redirect(REDIRECTS.manageInvalid);
    return redirect(token ? REDIRECTS.manage(token, 'error') : REDIRECTS.manageInvalid);
  };

  if (!isAllowedOrigin(request)) return { response: fail(403, ERRORS.origin, 'origin') };

  let body = {};
  if (request.method !== 'GET') {
    try {
      body = await readBody(request, LIMITS.bodyMaxBytes);
    } catch (error) {
      if (error instanceof BodyError && error.message === 'too-large') {
        return { response: fail(413, ERRORS.tooLarge, 'too-large') };
      }
      if (error instanceof BodyError) return { response: fail(400, ERRORS.unreadable, 'unreadable') };
      throw error;
    }
  }
  token = parseToken(body.t) || parseToken(new URL(request.url).searchParams.get('t'));
  if (!token) return { response: fail(404, ERRORS.link, 'link') };

  if (!env.IP_HASH_SALT) {
    console.error('IP_HASH_SALT is not set; refusing manage requests until it is.');
    return { response: fail(503, ERRORS.server, 'server') };
  }
  const ipHash = await hashIp(clientIp(request), env.IP_HASH_SALT, 'manage');
  const attempts = await countSubmission(env.DB, ipHash, now);
  if (attempts > LIMITS.manageRateLimitMax) {
    return {
      response: fail(429, ERRORS.rateLimited, 'rate-limited', { 'retry-after': String(retryAfterSeconds()) }),
    };
  }

  const row = await env.DB.prepare('SELECT id, email, lists, answers FROM waitlist WHERE manage_token = ?')
    .bind(token)
    .first();
  if (!row) return { response: fail(404, ERRORS.link, 'link') };

  return {
    token,
    row,
    body,
    asJson,
    fail,
    lists: parseStoredLists(row.lists),
    answers: parseStoredAnswers(row.answers),
  };
}

async function saveLists(env, id, lists, stamp) {
  await env.DB.prepare('UPDATE waitlist SET lists = ?, lists_updated_at = ? WHERE id = ?')
    .bind(JSON.stringify(lists), stamp, id)
    .run();
}

/** POST /api/waitlist/preferences — tick or untick each list. */
export async function handlePreferencesPost(request, env, { now = Date.now() } = {}) {
  try {
    const ctx = await tokenRequest(request, env, now);
    if (ctx.response) return ctx.response;
    const wanted = parseLists(ctx.body);
    const stamp = new Date(now).toISOString();
    const lists = emptyLists();
    for (const key of LIST_KEYS) lists[key] = wanted[key] ? ctx.lists[key] || stamp : null;
    await saveLists(env, ctx.row.id, lists, stamp);
    return ctx.asJson ? json(200, { ok: true, lists: listsOn(lists) }) : redirect(REDIRECTS.manage(ctx.token, 'saved'));
  } catch (error) {
    console.error('preferences update failed', error);
    return wantsJson(request) ? json(500, { ok: false, error: ERRORS.server }) : redirect(REDIRECTS.manageInvalid);
  }
}

/**
 * POST /api/waitlist/unsubscribe — leave every list. Also the RFC 8058 one-click
 * target: mail providers post "List-Unsubscribe=One-Click" with the token in the
 * query, from a server with no Origin header, and expect a 2xx back.
 */
export async function handleUnsubscribePost(request, env, { now = Date.now() } = {}) {
  try {
    const ctx = await tokenRequest(request, env, now);
    if (ctx.response) return ctx.response;
    const stamp = new Date(now).toISOString();
    await saveLists(env, ctx.row.id, emptyLists(), stamp);
    if (ctx.asJson) return json(200, { ok: true, lists: listsOn(emptyLists()) });
    if (String(ctx.body['List-Unsubscribe'] || '').toLowerCase() === 'one-click') {
      return text(200, 'Unsubscribed.\n', { 'content-type': 'text/plain; charset=utf-8' });
    }
    return redirect(REDIRECTS.manage(ctx.token, 'left'));
  } catch (error) {
    console.error('unsubscribe failed', error);
    return wantsJson(request) ? json(500, { ok: false, error: ERRORS.server }) : redirect(REDIRECTS.manageInvalid);
  }
}

/** POST /api/waitlist/delete — remove the sign-up, its choices and its answers. */
export async function handleDeletePost(request, env, { now = Date.now() } = {}) {
  try {
    const ctx = await tokenRequest(request, env, now);
    if (ctx.response) return ctx.response;
    await env.DB.prepare('DELETE FROM waitlist WHERE id = ?').bind(ctx.row.id).run();
    return ctx.asJson ? json(200, { ok: true }) : redirect(REDIRECTS.deleted);
  } catch (error) {
    console.error('delete failed', error);
    return wantsJson(request) ? json(500, { ok: false, error: ERRORS.server }) : redirect(REDIRECTS.manageInvalid);
  }
}

/**
 * POST /api/waitlist/pulse — the market-pulse answers, plus optional opt-ins to
 * the letter and research lists. Answers merge over earlier ones; opt-ins only
 * ever turn a list on here (unticked means "not now", never "remove me").
 */
export async function handlePulsePost(request, env, { now = Date.now() } = {}) {
  try {
    const ctx = await tokenRequest(request, env, now);
    if (ctx.response) return ctx.response;
    const parsed = parsePulse(ctx.body);
    if (!parsed.ok) return ctx.fail(400, parsed.error, 'pulse');
    const stamp = new Date(now).toISOString();
    const answers = { ...ctx.answers, ...parsed.answers, v: PULSE.version, at: stamp };
    const lists = { ...ctx.lists };
    let listsChanged = false;
    for (const key of ['letter', 'research']) {
      if (parseConsent(ctx.body[key]) && !lists[key]) {
        lists[key] = stamp;
        listsChanged = true;
      }
    }
    const statements = [
      env.DB.prepare('UPDATE waitlist SET answers = ? WHERE id = ?').bind(JSON.stringify(answers), ctx.row.id),
    ];
    if (listsChanged) {
      statements.push(
        env.DB.prepare('UPDATE waitlist SET lists = ?, lists_updated_at = ? WHERE id = ?')
          .bind(JSON.stringify(lists), stamp, ctx.row.id),
      );
    }
    await env.DB.batch(statements);
    return ctx.asJson
      ? json(200, { ok: true, lists: listsOn(lists), answered: Object.keys(parsed.answers).length })
      : redirect(REDIRECTS.manage(ctx.token, 'saved'));
  } catch (error) {
    console.error('pulse save failed', error);
    return wantsJson(request) ? json(500, { ok: false, error: ERRORS.server }) : redirect(REDIRECTS.manageInvalid);
  }
}

/* ------------------------------------------------------------- Manage page */

const escapeHtml = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** Unhides the element carrying `attr="value"` by dropping its `hidden` attribute. */
function show(html, attr, value) {
  return html.replace(new RegExp(`(<[a-z]+\\b[^>]*\\s${attr}="${value}"[^>]*?)\\s+hidden(?=[\\s>])`), '$1');
}

/** Adds `hidden` to the element carrying `attr="value"` unless it already has it. */
function hide(html, attr, value) {
  return html.replace(new RegExp(`<([a-z]+)\\b([^>]*\\s${attr}="${value}"[^>]*)>`), (tag, name, rest) =>
    /\shidden(?=[\s>]|$)/.test(rest) ? tag : `<${name}${rest} hidden>`,
  );
}

function check(html, id) {
  return html.replace(new RegExp(`(<input\\b[^>]*\\sid="${id}"[^>]*?)(\\s*/?>)`), (tag, before, close) =>
    /\schecked(?=[\s>/]|$)/.test(before) ? tag : `${before} checked${close}`,
  );
}

/**
 * Renders the manage page from its built template with a person's current
 * choices filled in, so it works with no JavaScript at all. Without a valid
 * token it shows the "link not valid" state; after a delete, the "deleted" state.
 */
export function renderManagePage(template, { state, email = '', lists = emptyLists(), answers = {}, token = '', notes = [] }) {
  let html = template;
  for (const name of ['invalid', 'deleted', 'form']) html = name === state ? show(html, 'data-state', name) : hide(html, 'data-state', name);
  for (const note of notes) html = show(html, 'data-note', note);
  if (state !== 'form') return html;
  html = html.replace(/<span data-email><\/span>/g, `<span data-email>${escapeHtml(email)}</span>`);
  html = html.replace(/(<input type="hidden" name="t") value=""/g, `$1 value="${escapeHtml(token)}"`);
  for (const key of LIST_KEYS) if (lists[key]) html = check(html, `list-${key}`);
  for (const key of Object.keys(PULSE.questions)) {
    const value = answers[key];
    if (value && Object.hasOwn(PULSE.questions[key].options, value)) html = check(html, `pulse-manage-${key}-${value}`);
  }
  const wish = answers[PULSE.freeText.key];
  if (wish) {
    html = html.replace(/(<textarea\b[^>]*\sid="pulse-manage-wish"[^>]*>)<\/textarea>/, `$1${escapeHtml(wish)}</textarea>`);
  }
  return html;
}

const NOTE_KEYS = ['saved', 'left', 'error'];

/** GET /manage/?t=… — the server-rendered manage page. */
export async function handleManageGet(request, env, { now = Date.now() } = {}) {
  const url = new URL(request.url);
  const headers = {
    'content-type': 'text/html; charset=utf-8',
    'x-robots-tag': 'noindex',
  };
  const page = async (status, state, extra = {}) => {
    const template = await (await env.ASSETS.fetch(new Request(new URL('/assets/manage.html', url)))).text();
    return text(status, renderManagePage(template, { state, ...extra }), headers);
  };
  try {
    const token = parseToken(url.searchParams.get('t'));
    if (!token) return page(url.searchParams.get('deleted') === '1' ? 200 : 404, url.searchParams.get('deleted') === '1' ? 'deleted' : 'invalid');
    const ctx = await tokenRequest(request, env, now);
    if (ctx.response) {
      // Rate limited or no such token: the page explains, with no detail that would help guessing.
      return page(ctx.response.status === 429 ? 429 : 404, 'invalid');
    }
    const notes = NOTE_KEYS.filter((key) => url.searchParams.get(key) === '1');
    return page(200, 'form', { email: ctx.row.email, lists: ctx.lists, answers: ctx.answers, token, notes });
  } catch (error) {
    console.error('manage page failed', error);
    return page(500, 'invalid');
  }
}

/* ------------------------------------------------------------------- Admin */

async function isAdmin(request, env) {
  const header = request.headers.get('authorization') || '';
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return Boolean(env.ADMIN_TOKEN && match) && (await timingSafeEqualText(match[1].trim(), env.ADMIN_TOKEN));
}

const unauthorized = () =>
  json(401, { ok: false, error: 'A valid admin token is required.' }, { 'www-authenticate': 'Bearer' });

export const EXPORT_COLUMNS = ['email', 'created_at', 'fields', 'source', 'utm', 'lists', 'answers', 'manage_url'];

/** GET /api/waitlist/export — admin CSV download, Bearer ADMIN_TOKEN required. */
export async function handleExportGet(request, env, { now = Date.now() } = {}) {
  if (!(await isAdmin(request, env))) return unauthorized();
  try {
    const { results } = await env.DB.prepare(
      'SELECT email, created_at, fields, source, utm, lists, answers, manage_token FROM waitlist ORDER BY id',
    ).all();
    const origin = new URL(request.url).origin;
    const rows = (results || []).map((row) => ({
      ...row,
      manage_url: row.manage_token ? `${origin}${managePath(row.manage_token)}` : '',
    }));
    const day = new Date(now).toISOString().slice(0, 10);
    return text(200, toCsv(EXPORT_COLUMNS, rows), {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${PRODUCT}-waitlist-${day}.csv"`,
    });
  } catch (error) {
    console.error('waitlist export failed', error);
    return json(500, { ok: false, error: ERRORS.server });
  }
}

const count = (map, key) => {
  map[key] = (map[key] || 0) + 1;
};

/** The numbers behind the waitlist, from the rows given. Shared with the tests. */
export function summarize(rows, { now = Date.now(), days = 30 } = {}) {
  const lists = {};
  for (const key of LIST_KEYS) lists[key] = 0;
  const ratings = {};
  for (const key of Object.keys(RATING_BANDS)) ratings[key] = 0;
  ratings.unanswered = 0;
  const sources = {};
  const utmSources = {};
  const pulse = { answered: 0 };
  for (const key of Object.keys(PULSE.questions)) {
    pulse[key] = {};
    for (const option of Object.keys(PULSE.questions[key].options)) pulse[key][option] = 0;
  }
  const wishes = [];
  const perDay = new Map();
  const dayMs = 24 * 60 * 60 * 1000;
  const today = new Date(now).toISOString().slice(0, 10);
  for (let i = days - 1; i >= 0; i -= 1) perDay.set(new Date(now - i * dayMs).toISOString().slice(0, 10), 0);

  for (const row of rows) {
    const on = parseStoredLists(row.lists);
    for (const key of LIST_KEYS) if (on[key]) lists[key] += 1;
    let fields = {};
    try {
      fields = JSON.parse(row.fields || '{}') || {};
    } catch {
      /* count as unanswered */
    }
    if (fields.rating && Object.hasOwn(ratings, fields.rating)) ratings[fields.rating] += 1;
    else ratings.unanswered += 1;
    count(sources, row.source || 'unknown');
    let utm = {};
    try {
      utm = JSON.parse(row.utm || '{}') || {};
    } catch {
      /* no tags */
    }
    count(utmSources, utm.utm_source || 'direct');
    const answers = parseStoredAnswers(row.answers);
    let answered = false;
    for (const key of Object.keys(PULSE.questions)) {
      const value = answers[key];
      if (value && Object.hasOwn(pulse[key], value)) {
        pulse[key][value] += 1;
        answered = true;
      }
    }
    const wish = answers[PULSE.freeText.key];
    if (typeof wish === 'string' && wish) {
      wishes.push({ at: answers.at || null, text: wish });
      answered = true;
    }
    if (answered) pulse.answered += 1;
    const day = String(row.created_at || '').slice(0, 10);
    if (perDay.has(day)) perDay.set(day, perDay.get(day) + 1);
  }
  wishes.sort((a, b) => String(b.at).localeCompare(String(a.at)));
  return {
    generatedAt: new Date(now).toISOString(),
    today,
    total: rows.length,
    lists,
    ratings,
    sources,
    utmSources,
    pulse: { ...pulse, wishes: wishes.slice(0, 20) },
    perDay: [...perDay].map(([day, n]) => ({ day, count: n })),
  };
}

/** GET /api/waitlist/stats — the market pulse and list sizes as JSON, Bearer ADMIN_TOKEN required. */
export async function handleStatsGet(request, env, { now = Date.now() } = {}) {
  if (!(await isAdmin(request, env))) return unauthorized();
  try {
    const { results } = await env.DB.prepare(
      'SELECT created_at, fields, source, utm, lists, answers FROM waitlist ORDER BY id LIMIT ?',
    )
      .bind(LIMITS.statsRowCap + 1)
      .all();
    const rows = results || [];
    const truncated = rows.length > LIMITS.statsRowCap;
    const summary = summarize(truncated ? rows.slice(0, LIMITS.statsRowCap) : rows, { now });
    return json(200, { ok: true, truncated, ...summary });
  } catch (error) {
    console.error('waitlist stats failed', error);
    return json(500, { ok: false, error: ERRORS.server });
  }
}

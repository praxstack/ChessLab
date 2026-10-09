import { LIMITS, LISTS, PRODUCT, PULSE, RATING_BANDS, REDIRECTS, managePath } from './config.js';
import { BodyError, readBody } from './body.js';
import { hashIp, randomToken, sha256Hex, timingSafeEqualText } from './hash.js';
import { clientIp, isAllowedOrigin, json, redirect, text, wantsJson } from './http.js';
import { countSubmission, retryAfterSeconds } from './ratelimit.js';
import { toCsv } from './csv.js';
import { pageHeaders } from './security-headers.js';
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

/**
 * The stored lists JSON as { key: ISO timestamp | null }, tolerant of missing
 * or odd data. A row with no lists at all is one the pre-lists code wrote (a
 * sign-up that landed between the migration and the deploy): the person
 * consented to beta email, so they count as on that list since then.
 */
export function parseStoredLists(value, consentAt = null) {
  const out = emptyLists();
  if (value == null) {
    if (typeof consentAt === 'string' && consentAt) out.beta = consentAt;
    return out;
  }
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

const anyListOn = (lists) => LIST_KEYS.some((key) => Boolean(lists[key]));

function parseStoredAnswers(value) {
  try {
    const parsed = JSON.parse(value || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * The pulse code a sign-up gets back. With a client key (`k`, random, made by
 * the page once per visit) it is derived from the key and the secret salt, so
 * a retry of the same sign-up after a lost response gets the same code and
 * can still save the pulse, while anyone else's key yields a code that
 * matches nothing. Without a key it is simply random.
 */
async function pulseCodeFor(key, salt) {
  if (!key || !salt) return randomToken();
  return (await sha256Hex(`${salt}:pulse:${key}`)).slice(0, 32);
}

/**
 * POST /api/waitlist
 * Returns JSON for fetch() callers, or a 303 redirect for plain HTML form posts.
 *
 * The response is the same whether the address was new or already on the
 * list: { ok: true, pulse } either way. For a new row the code is stored and
 * lets the page submit the market pulse; for an existing row it is stored
 * nowhere and the pulse is accepted and discarded. So nothing the caller sees
 * says whether an address is on the list. The private manage link is never
 * returned here; it travels only in email.
 */
export async function handleWaitlistPost(request, env, { now = Date.now(), fetchImpl } = {}) {
  const asJson = wantsJson(request);
  const fail = (status, error, code, headers) =>
    asJson ? json(status, { ok: false, error }, headers) : redirect(REDIRECTS.error(code));
  const succeed = (pulse) => (asJson ? json(200, { ok: true, pulse }) : redirect(REDIRECTS.joined));

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
    const key = parseToken(body.k);

    // Bots fill the hidden "website" field. Pretend it worked and store nothing.
    if (isHoneypotFilled(body.website)) return succeed(await pulseCodeFor(key, env.IP_HASH_SALT));

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
    const lists = { ...emptyLists(), beta: stamp };
    const pulse = await pulseCodeFor(key, env.IP_HASH_SALT);

    // An address that is already on the list is left exactly as it is, even
    // when it has unsubscribed from everything: a tick on a public form does
    // not prove the submitter owns the address. Rejoining goes through the
    // person's own manage link.
    await env.DB.prepare(
      'INSERT INTO waitlist (email, product, fields, source, utm, consent_at, created_at, lists, lists_updated_at, manage_token, pulse_token) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (email) DO NOTHING',
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
        randomToken(),
        pulse,
      )
      .run();
    return succeed(pulse);
  } catch (error) {
    console.error('waitlist signup failed', error);
    return fail(500, ERRORS.server, 'server');
  }
}

/* ------------------------------------------------------------ Manage links */

/**
 * Shared start of every request that carries a manage-link code: origin
 * check, body, the code (from the body or the query), the manage rate limit,
 * and the row. Returns { response } when the request must stop, otherwise
 * { token, row, body, asJson, lists, answers, fail }.
 *
 * With `pulse: true` the request may instead carry the pulse code a sign-up
 * returned (`p`). A pulse code that matches no row is not an error: the
 * caller gets { discard: true } and answers with the same "ok" it would give
 * for a real one, so the pulse endpoint says nothing about who is on the list.
 *
 * With `count: false` the request is not charged against the rate limit,
 * which keeps page views from using up a person's form posts. `count` may
 * also be a function of the parsed body, for callers that decide late.
 *
 * A mail provider's RFC 8058 one-click post (body "List-Unsubscribe=One-Click")
 * is answered in plain text, never with a redirect, because the provider
 * needs a bare status code.
 */
const isOneClick = (body) => String((body && body['List-Unsubscribe']) || '').toLowerCase() === 'one-click';

async function tokenRequest(request, env, now, { pulse = false, count = true } = {}) {
  const asJson = wantsJson(request);
  let token = '';
  let oneClick = false;
  const fail = (status, error, code, headers) => {
    if (asJson) return json(status, { ok: false, error }, headers);
    if (oneClick) return text(status, `${error}\n`, { 'content-type': 'text/plain; charset=utf-8', ...headers });
    if (code === 'link') return redirect(REDIRECTS.manageInvalid);
    return redirect(token ? REDIRECTS.manage(token, 'error') : REDIRECTS.manageInvalid);
  };
  // What stopped the request, kept beside the response so a page can choose
  // its wording by the reason rather than by a redirect's status code.
  const stop = (status, error, code, headers) => ({ response: fail(status, error, code, headers), code, status });

  if (!isAllowedOrigin(request)) return stop(403, ERRORS.origin, 'origin');

  let body = {};
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      body = await readBody(request, LIMITS.bodyMaxBytes);
    } catch (error) {
      if (error instanceof BodyError && error.message === 'too-large') return stop(413, ERRORS.tooLarge, 'too-large');
      if (error instanceof BodyError) return stop(400, ERRORS.unreadable, 'unreadable');
      throw error;
    }
  }
  oneClick = isOneClick(body);
  const query = new URL(request.url).searchParams;
  token = parseToken(body.t) || parseToken(query.get('t'));
  const pulseToken = !token && pulse ? parseToken(body.p) || parseToken(query.get('p')) : '';
  if (!token && !pulseToken) return stop(404, ERRORS.link, 'link');

  let row;
  try {
    if (typeof count === 'function' ? count(body) : count) {
      // The salt is needed only to count: a request that is not counted, such
      // as a provider's one-click unsubscribe, must keep working without it.
      if (!env.IP_HASH_SALT) {
        console.error('IP_HASH_SALT is not set; refusing counted manage requests until it is.');
        return stop(503, ERRORS.server, 'server');
      }
      const ipHash = await hashIp(clientIp(request), env.IP_HASH_SALT, 'manage');
      const attempts = await countSubmission(env.DB, ipHash, now);
      if (attempts > LIMITS.manageRateLimitMax) {
        return stop(429, ERRORS.rateLimited, 'rate-limited', { 'retry-after': String(retryAfterSeconds()) });
      }
    }
    row = await env.DB.prepare(
      `SELECT id, email, lists, lists_updated_at, answers, consent_at FROM waitlist WHERE ${token ? 'manage_token' : 'pulse_token'} = ?`,
    )
      .bind(token || pulseToken)
      .first();
  } catch (error) {
    // A database problem is answered in the caller's own shape (JSON, plain
    // text for a mail provider, or a redirect), never as "link not valid".
    console.error('manage lookup failed', error);
    return stop(500, ERRORS.server, 'server');
  }
  if (!row) {
    if (pulseToken) return { discard: true, pulseToken, asJson, body };
    return stop(404, ERRORS.link, 'link');
  }

  return {
    token,
    pulseToken,
    byPulse: Boolean(pulseToken),
    oneClick,
    row,
    body,
    asJson,
    fail,
    lists: parseStoredLists(row.lists, row.consent_at),
    answers: parseStoredAnswers(row.answers),
  };
}

/**
 * Writes a person's lists. When every list is off, everything else about them
 * goes too: the rating, how they found us, the answers, the timestamps and
 * the pulse code. What stays is the address, the choice, and the manage code,
 * so the link still works to delete the row or to come back.
 *
 * With `expect`, the write applies only if the lists were last changed at
 * that time, and the result says whether it did: a form filled in from a
 * page opened before a later change must not put that change back.
 */
async function saveLists(env, id, lists, stamp, { expect } = {}) {
  const guard = expect === undefined ? '' : " AND COALESCE(lists_updated_at, '') = ?";
  const guardArgs = expect === undefined ? [] : [expect || ''];
  const sql = anyListOn(lists)
    ? 'UPDATE waitlist SET lists = ?, lists_updated_at = ? WHERE id = ?'
    : "UPDATE waitlist SET lists = ?, lists_updated_at = ?, fields = '{}', source = NULL, utm = '{}', " +
      'answers = NULL, consent_at = NULL, created_at = NULL, pulse_token = NULL WHERE id = ?';
  const result = await env.DB.prepare(sql + guard).bind(JSON.stringify(lists), stamp, id, ...guardArgs).run();
  return expect === undefined ? true : Boolean(result && result.meta && result.meta.changes === 1);
}

const CHANGED = 'Your choices were changed somewhere else after this page was opened. This is the current state; check it and save again.';

/** POST /api/waitlist/preferences — tick or untick each list. */
export async function handlePreferencesPost(request, env, { now = Date.now() } = {}) {
  try {
    const ctx = await tokenRequest(request, env, now);
    if (ctx.response) return ctx.response;
    const wanted = parseLists(ctx.body);
    const stamp = new Date(now).toISOString();
    const lists = emptyLists();
    for (const key of LIST_KEYS) lists[key] = wanted[key] ? ctx.lists[key] || stamp : null;
    let applied;
    try {
      applied = await saveLists(env, ctx.row.id, lists, stamp, { expect: ctx.row.lists_updated_at });
    } catch (error) {
      console.error('preferences update failed', error);
      return ctx.fail(500, ERRORS.server, 'server');
    }
    if (!applied) {
      // Something changed the lists between this page's render and its save,
      // such as a one-click unsubscribe: the stale form must not undo it.
      if (!ctx.asJson) return redirect(REDIRECTS.manage(ctx.token, 'changed'));
      const fresh = await env.DB.prepare('SELECT lists, consent_at FROM waitlist WHERE id = ?').bind(ctx.row.id).first();
      return json(409, { ok: false, error: CHANGED, lists: listsOn(parseStoredLists(fresh ? fresh.lists : null, fresh ? fresh.consent_at : null)) });
    }
    return ctx.asJson ? json(200, { ok: true, lists: listsOn(lists) }) : redirect(REDIRECTS.manage(ctx.token, 'saved'));
  } catch (error) {
    console.error('preferences request failed', error);
    return wantsJson(request) ? json(500, { ok: false, error: ERRORS.server }) : redirect(REDIRECTS.manageInvalid);
  }
}

/**
 * POST /api/waitlist/unsubscribe — leave every list. Also the RFC 8058 one-click
 * target: mail providers post "List-Unsubscribe=One-Click" to this URL with
 * the code in the query, from a server with no Origin header, and expect 2xx.
 * Those posts come from a provider's few shared addresses on behalf of
 * everyone, so they are not counted against the per-address limit: a valid
 * code is still required and the action is harmless to repeat.
 */
export async function handleUnsubscribePost(request, env, { now = Date.now() } = {}) {
  try {
    const ctx = await tokenRequest(request, env, now, { count: (body) => !isOneClick(body) });
    if (ctx.response) return ctx.response;
    const stamp = new Date(now).toISOString();
    try {
      await saveLists(env, ctx.row.id, emptyLists(), stamp);
    } catch (error) {
      // A mail provider must see a bare 5xx here so it can retry, never a redirect.
      console.error('unsubscribe failed', error);
      return ctx.fail(500, ERRORS.server, 'server');
    }
    if (ctx.asJson) return json(200, { ok: true, lists: listsOn(emptyLists()) });
    if (ctx.oneClick) return text(200, 'Unsubscribed.\n', { 'content-type': 'text/plain; charset=utf-8' });
    return redirect(REDIRECTS.manage(ctx.token, 'left'));
  } catch (error) {
    console.error('unsubscribe request failed', error);
    if (wantsJson(request)) return json(500, { ok: false, error: ERRORS.server });
    return redirect(REDIRECTS.manageInvalid);
  }
}

/** POST /api/waitlist/delete — remove the sign-up, its choices and its answers. */
export async function handleDeletePost(request, env, { now = Date.now() } = {}) {
  try {
    const ctx = await tokenRequest(request, env, now);
    if (ctx.response) return ctx.response;
    try {
      await env.DB.prepare('DELETE FROM waitlist WHERE id = ?').bind(ctx.row.id).run();
    } catch (error) {
      console.error('delete failed', error);
      return ctx.fail(500, ERRORS.server, 'server');
    }
    return ctx.asJson ? json(200, { ok: true }) : redirect(REDIRECTS.deleted);
  } catch (error) {
    console.error('delete request failed', error);
    return wantsJson(request) ? json(500, { ok: false, error: ERRORS.server }) : redirect(REDIRECTS.manageInvalid);
  }
}

/**
 * POST /api/waitlist/pulse — the market-pulse answers, plus optional opt-ins to
 * the letter and research lists. Reached with the manage code (`t`, from the
 * manage page) or the pulse code (`p`, from the sign-up panel). Answers merge
 * over earlier ones from the same questionnaire version and replace answers
 * from an older one. Opt-ins only ever turn a list on here: unticked means
 * "not now", never "remove me".
 *
 * With a pulse code the answer is always a bare { ok: true }, stored or not,
 * so the endpoint can't be used to tell who is on the list.
 */
export async function handlePulsePost(request, env, { now = Date.now() } = {}) {
  try {
    const ctx = await tokenRequest(request, env, now, { pulse: true });
    if (ctx.response) return ctx.response;
    const parsed = parsePulse(ctx.body);
    // By pulse code, the reply depends only on the input, never on whether the
    // code matched a row, so a bad answer gets the same status either way.
    const byCode = ctx.discard || ctx.byPulse;
    if (byCode && !parsed.ok) {
      return ctx.asJson ? json(400, { ok: false, error: parsed.error }) : redirect(REDIRECTS.error('pulse'));
    }
    const byCodeOk = () => (ctx.asJson ? json(200, { ok: true }) : redirect(REDIRECTS.joined));
    if (!parsed.ok && !byCode) return ctx.fail(400, parsed.error, 'pulse');
    const stamp = new Date(now).toISOString();

    // Both writes are done inside SQL against the row's current value, not a
    // snapshot read earlier, so a preferences change or an unsubscribe that
    // lands in between is never undone. By pulse code, the writes are keyed by
    // the code alone: leaving every list clears it, so a late pulse brings
    // nothing back, and a code that matches nothing writes nothing. Either
    // way the same statements run, so a storage failure answers the same.
    const where = byCode ? 'pulse_token = ?' : 'id = ?';
    const whereArg = byCode ? ctx.pulseToken : ctx.row.id;
    // Answers: a JSON merge patch. A null (a wish sent empty) removes the key.
    // Answers to an older questionnaire are replaced rather than merged.
    const patch = JSON.stringify({ ...parsed.answers, v: PULSE.version, at: stamp });
    const statements = [
      env.DB.prepare(
        "UPDATE waitlist SET answers = CASE WHEN json_extract(COALESCE(answers, '{}'), '$.v') = ? " +
          `THEN json_patch(COALESCE(answers, '{}'), ?) ELSE json_patch('{}', ?) END WHERE ${where}`,
      ).bind(PULSE.version, patch, patch, whereArg),
    ];
    // Opt-ins only ever turn a list on, keeping the time it was first turned on.
    const optIns = ['letter', 'research'].filter((key) => parseConsent(ctx.body[key]));
    if (optIns.length) {
      const sets = optIns
        .map((key) => `'$.${key}', COALESCE(json_extract(COALESCE(lists, '{}'), '$.${key}'), ?)`)
        .join(', ');
      statements.push(
        env.DB.prepare(`UPDATE waitlist SET lists = json_set(COALESCE(lists, '{}'), ${sets}), lists_updated_at = ? WHERE ${where}`)
          .bind(...optIns.map(() => stamp), stamp, whereArg),
      );
    }
    try {
      await env.DB.batch(statements);
    } catch (error) {
      console.error('pulse save failed', error);
      if (byCode) return ctx.asJson ? json(500, { ok: false, error: ERRORS.server }) : redirect(REDIRECTS.error('server'));
      return ctx.fail(500, ERRORS.server, 'server');
    }
    if (byCode) return byCodeOk();
    const answered = Object.values(parsed.answers).filter((value) => value !== null).length;
    if (!ctx.asJson) return redirect(REDIRECTS.manage(ctx.token, 'saved'));
    const fresh = await env.DB.prepare('SELECT lists, consent_at FROM waitlist WHERE id = ?').bind(ctx.row.id).first();
    return json(200, { ok: true, lists: listsOn(parseStoredLists(fresh ? fresh.lists : null, fresh ? fresh.consent_at : null)), answered });
  } catch (error) {
    console.error('pulse request failed', error);
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

export const MANAGE_STATES = Object.freeze(['invalid', 'deleted', 'later', 'form']);

/**
 * Renders the manage page from its built template with a person's current
 * choices filled in, so it works with no JavaScript at all. Without a valid
 * code it shows the "link not valid" state; after a delete, "deleted"; when
 * the service can't answer right now, "later".
 */
export function renderManagePage(template, { state, email = '', lists = emptyLists(), answers = {}, token = '', notes = [] }) {
  let html = template;
  for (const name of MANAGE_STATES) html = name === state ? show(html, 'data-state', name) : hide(html, 'data-state', name);
  for (const note of notes) html = show(html, 'data-note', note);
  if (state !== 'form') return html;
  // Replacer functions, never replacement strings: a "$" in an address or a
  // wish must land on the page as text, not as a replacement pattern.
  const emailHtml = escapeHtml(email);
  html = html.replace(/<span data-email><\/span>/g, () => `<span data-email>${emailHtml}</span>`);
  const tokenHtml = escapeHtml(token);
  html = html.replace(/(<input type="hidden" name="t") value=""/g, (_, start) => `${start} value="${tokenHtml}"`);
  for (const key of LIST_KEYS) if (lists[key]) html = check(html, `list-${key}`);
  for (const key of Object.keys(PULSE.questions)) {
    const value = answers[key];
    if (value && Object.hasOwn(PULSE.questions[key].options, value)) html = check(html, `pulse-manage-${key}-${value}`);
  }
  const wish = answers[PULSE.freeText.key];
  if (typeof wish === 'string' && wish) {
    const wishHtml = escapeHtml(wish);
    html = html.replace(/(<textarea\b[^>]*\sid="pulse-manage-wish"[^>]*>)<\/textarea>/, (_, open) => `${open}${wishHtml}</textarea>`);
  }
  return html;
}

const NOTE_KEYS = ['saved', 'left', 'changed', 'error'];

/** Where the built manage template is served: its pretty path, without the extension. */
export const MANAGE_TEMPLATE_PATH = '/assets/manage';

/** GET /manage/?t=… — the server-rendered manage page. */
export async function handleManageGet(request, env, { now = Date.now() } = {}) {
  const url = new URL(request.url);
  const headers = {
    // Cloudflare does not apply public/_headers to a Function's response, so
    // this page carries the site's security headers itself.
    ...pageHeaders(),
    'content-type': 'text/html; charset=utf-8',
    'x-robots-tag': 'noindex',
    // The code is in this page's URL, so nothing it links to or loads may learn it.
    'referrer-policy': 'no-referrer',
  };
  const page = async (status, state, extra = {}) => {
    const asset = await env.ASSETS.fetch(new Request(new URL(MANAGE_TEMPLATE_PATH, url)));
    if (!asset.ok) throw new Error(`manage template not served: ${asset.status}`);
    const template = await asset.text();
    const body = renderManagePage(template, { state, ...extra });
    return text(status, request.method === 'HEAD' ? null : body, headers);
  };
  try {
    if (url.searchParams.get('deleted') === '1' && !url.searchParams.get('t')) return page(200, 'deleted');
    // A page view is not charged against the manage rate limit: the code has
    // 128 random bits, and a view must never use up a person's form posts.
    const ctx = await tokenRequest(request, env, now, { count: false });
    if (ctx.response) {
      if (ctx.code === 'link' || ctx.code === 'origin') return page(404, 'invalid');
      // Rate limited or a server problem: say so, instead of calling the link invalid.
      return page(ctx.status || 500, 'later');
    }
    const notes = NOTE_KEYS.filter((key) => url.searchParams.get(key) === '1');
    return page(200, 'form', { email: ctx.row.email, lists: ctx.lists, answers: ctx.answers, token: ctx.token, notes });
  } catch (error) {
    console.error('manage page failed', error);
    try {
      return await page(500, 'later');
    } catch {
      return text(500, 'Not right now. Please try again in a few minutes.\n', {
        ...headers,
        'content-type': 'text/plain; charset=utf-8',
      });
    }
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
      'SELECT email, created_at, fields, source, utm, lists, answers, manage_token, consent_at FROM waitlist ORDER BY id',
    ).all();
    const origin = new URL(request.url).origin;
    const rows = (results || []).map((row) => ({
      ...row,
      // A row from before the lists existed reads as beta-on since consent.
      lists: row.lists == null ? JSON.stringify(parseStoredLists(null, row.consent_at)) : row.lists,
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

// Labels like the form name and utm_source come from visitors, so they are
// tallied in Maps: a key such as "__proto__" or "constructor" stays a label.
const count = (map, key) => map.set(key, (map.get(key) || 0) + 1);

/** True when a stored answers object holds any answer at all, whatever questions existed when it was saved. */
const holdsAnswers = (answers) =>
  Object.entries(answers).some(([key, value]) => key !== 'v' && key !== 'at' && value !== null && value !== undefined && value !== '');

/**
 * An accumulator for the numbers behind the waitlist: feed it rows one page
 * at a time with `add`, read `result` at the end. Pulse answers are counted
 * only when they were given to the current version of the questionnaire;
 * `pulse.older` says how many people still hold answers to an earlier one.
 */
export function createSummary({ now = Date.now(), days = 30 } = {}) {
  const lists = {};
  for (const key of LIST_KEYS) lists[key] = 0;
  const ratings = {};
  for (const key of Object.keys(RATING_BANDS)) ratings[key] = 0;
  ratings.unanswered = 0;
  const sources = new Map();
  const utmSources = new Map();
  const pulse = { version: PULSE.version, answered: 0, older: 0 };
  for (const key of Object.keys(PULSE.questions)) {
    pulse[key] = {};
    for (const option of Object.keys(PULSE.questions[key].options)) pulse[key][option] = 0;
  }
  const wishes = [];
  const perDay = new Map();
  const dayMs = 24 * 60 * 60 * 1000;
  const today = new Date(now).toISOString().slice(0, 10);
  for (let i = days - 1; i >= 0; i -= 1) perDay.set(new Date(now - i * dayMs).toISOString().slice(0, 10), 0);
  let total = 0;

  return {
    add(row) {
      total += 1;
      const on = parseStoredLists(row.lists, row.consent_at);
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
      count(utmSources, typeof utm.utm_source === 'string' && utm.utm_source ? utm.utm_source : 'direct');
      const answers = parseStoredAnswers(row.answers);
      if (holdsAnswers(answers) && answers.v !== PULSE.version) {
        pulse.older += 1;
      } else {
        let answered = false;
        for (const key of Object.keys(PULSE.questions)) {
          const value = answers[key];
          if (typeof value === 'string' && Object.hasOwn(pulse[key], value)) {
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
      }
      const day = String(row.created_at || '').slice(0, 10);
      if (perDay.has(day)) perDay.set(day, perDay.get(day) + 1);
    },
    result() {
      wishes.sort((a, b) => String(b.at).localeCompare(String(a.at)));
      return {
        generatedAt: new Date(now).toISOString(),
        today,
        total,
        lists,
        ratings,
        sources: Object.fromEntries(sources),
        utmSources: Object.fromEntries(utmSources),
        pulse: { ...pulse, wishes: wishes.slice(0, 20) },
        perDay: [...perDay].map(([day, n]) => ({ day, count: n })),
      };
    },
  };
}

/** The numbers behind the waitlist, from the rows given. Shared with the tests. */
export function summarize(rows, options = {}) {
  const summary = createSummary(options);
  for (const row of rows) summary.add(row);
  return summary.result();
}

/**
 * GET /api/waitlist/stats — the market pulse and list sizes as JSON, Bearer
 * ADMIN_TOKEN required. Reads every row, a page at a time by id, so the
 * totals are totals; `truncated` turns true only past the absolute cap.
 */
export async function handleStatsGet(request, env, { now = Date.now(), pageSize = LIMITS.statsPageSize } = {}) {
  if (!(await isAdmin(request, env))) return unauthorized();
  try {
    const summary = createSummary({ now });
    let after = 0;
    let seen = 0;
    let truncated = false;
    for (;;) {
      const { results } = await env.DB.prepare(
        'SELECT id, created_at, fields, source, utm, lists, answers, consent_at FROM waitlist WHERE id > ? ORDER BY id LIMIT ?',
      )
        .bind(after, pageSize)
        .all();
      const rows = results || [];
      for (const row of rows) {
        if (seen >= LIMITS.statsRowCap) {
          truncated = true;
          break;
        }
        summary.add(row);
        seen += 1;
        after = row.id;
      }
      if (truncated || rows.length < pageSize) break;
    }
    return json(200, { ok: true, truncated, ...summary.result() });
  } catch (error) {
    console.error('waitlist stats failed', error);
    return json(500, { ok: false, error: ERRORS.server });
  }
}

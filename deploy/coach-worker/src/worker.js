import {bundleFromWire, askClaude, engineAnswer, claudeAnswer, DEFAULT_MODEL} from '../../../shared/coach/index.js';

// The AskTheMove coach Worker: "Explain why" on the owner's Claude key for learners with an invite code.
// It takes chess evidence only (SAN moves, fixed words and numbers, checked against a closed schema;
// see shared/coach/payload.js), sends the fixed coach prompt and checks the answer. It does no chess
// work, so a request stays far inside the free plan's 10 ms of CPU. It is not a general Claude proxy: no free text,
// no caller-chosen prompt, model or max_tokens. Each invite code has a daily cap kept in D1.
export const MAX_BODY_BYTES = 32 * 1024;

const DEFAULT_MAX_PER_DAY = 50;

const list = value => String(value || '').split(/[\s,]+/).map(item => item.trim()).filter(Boolean);
const hex = buffer => [...new Uint8Array(buffer)].map(byte => byte.toString(16).padStart(2, '0')).join('');
export const inviteDigest = async code => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code.trim())));

function maxPerDay(env) {
  const value = Number(env.COACH_MAX_PER_DAY);
  return Number.isInteger(value) && value >= 1 && value <= 5000 ? value : DEFAULT_MAX_PER_DAY;
}

// Takes one explanation from this code's allowance for the UTC day, in one atomic statement.
// No row comes back when the count has already reached the cap.
export async function takeDaily(db, budget, day, max) {
  const row = await db.prepare('INSERT INTO coach_daily (budget, day, count) VALUES (?1, ?2, 1) ON CONFLICT (budget, day) DO UPDATE SET count = count + 1 WHERE count < ?3 RETURNING count')
    .bind(budget, day, max).first();
  return Boolean(row);
}

function corsHeaders(origin) {
  return {'access-control-allow-origin': origin, 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400', vary: 'Origin'};
}
const json = (status, body, origin) => new Response(JSON.stringify(body), {status, headers: {'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...(origin ? corsHeaders(origin) : {})}});

async function readBody(request) {
  const declared = Number(request.headers.get('content-length'));
  if (declared > MAX_BODY_BYTES) return {error: [413, 'The request is too large.']};
  if (!/^application\/json\b/i.test(request.headers.get('content-type') || '')) return {error: [415, 'Send JSON.']};
  // Read the stream piece by piece and stop at the limit, so a body without Content-Length
  // never gets buffered in full.
  const chunks = [];
  let size = 0;
  if (request.body) {
    const reader = request.body.getReader();
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel().catch(() => {});
        return {error: [413, 'The request is too large.']};
      }
      chunks.push(value);
    }
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return {body: JSON.parse(new TextDecoder().decode(bytes))}; }
  catch { return {error: [400, 'The request is not valid JSON.']}; }
}

export async function handle(request, env, {fetch = globalThis.fetch, now = Date.now, logger = console} = {}) {
  const url = new URL(request.url);
  const origin = request.headers.get('origin');
  const allowed = origin && list(env.APP_ORIGINS).includes(origin) ? origin : null;
  if (url.pathname !== '/explain') return json(404, {reason: 'not_found', message: 'Not found.'}, allowed);
  // Browsers cannot read this answer (no CORS headers); the reason is for other callers and logs.
  if (!allowed) return json(403, {reason: 'origin_not_allowed', message: 'This site may not use the coach.'});
  if (request.method === 'OPTIONS') return new Response(null, {status: 204, headers: corsHeaders(allowed)});
  if (request.method !== 'POST') return json(405, {reason: 'bad_request', message: 'Use POST.'}, allowed);

  const {body, error} = await readBody(request);
  if (error) return json(error[0], {reason: error[0] === 413 ? 'too_large' : 'bad_request', message: error[1]}, allowed);
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json(400, {reason: 'bad_request', message: 'Send an object.'}, allowed);
  const unknown = Object.keys(body).find(key => !['inviteCode', 'evidence', 'asked'].includes(key));
  if (unknown) return json(400, {reason: 'bad_request', message: 'The request has fields the coach does not accept.'}, allowed);
  if (typeof body.inviteCode !== 'string' || !body.inviteCode.trim() || body.inviteCode.length > 100) return json(403, {reason: 'invite_rejected', message: 'Enter a valid invite code.'}, allowed);
  if (body.asked !== undefined && typeof body.asked !== 'boolean') return json(400, {reason: 'bad_request', message: 'asked must be true or false.'}, allowed);
  const digest = await inviteDigest(body.inviteCode);
  if (!list(env.COACH_INVITE_DIGESTS).map(item => item.toLowerCase()).includes(digest)) return json(403, {reason: 'invite_rejected', message: 'This invite code is not valid.'}, allowed);

  const asked = Boolean(body.asked);
  let bundle;
  try { bundle = bundleFromWire(body.evidence, asked); }
  catch (failure) { return json(400, {reason: 'bad_request', message: failure.message || 'The chess evidence is not valid.'}, allowed); }
  if (!bundle.explainable) return json(200, engineAnswer(bundle, asked, 'no_evidence'), allowed);
  if (!env.ANTHROPIC_API_KEY) return json(200, engineAnswer(bundle, asked, 'not_configured'), allowed);
  if (!await takeDaily(env.DB, digest, new Date(now()).toISOString().slice(0, 10), maxPerDay(env))) return json(200, engineAnswer(bundle, asked, 'daily_limit'), allowed);

  const model = env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  const reply = await askClaude(bundle, {asked, model, apiKey: env.ANTHROPIC_API_KEY, fetch, signal: request.signal});
  if (reply.reason) {
    // Only the reason and HTTP status: never the key, the code, the evidence or the answer.
    if (reply.reason !== 'canceled') logger.warn?.(`Coach fallback: ${reply.reason}${reply.status ? ` (HTTP ${reply.status})` : ''}`);
    return json(200, engineAnswer(bundle, asked, reply.reason === 'unverified_claims' ? 'unverified' : reply.reason), allowed);
  }
  return json(200, claudeAnswer(bundle, asked, reply), allowed);
}

export default {fetch: (request, env) => handle(request, env)};

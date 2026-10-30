import {SYSTEM_PROMPT, MAX_WORDS, MAX_PARAGRAPHS} from './prompt.js';
import {BRACKETED, verifyAnswer} from './evidence.js';

// One Claude Messages request for one explanation, built only from verified evidence, and the checks
// on its reply. The browser (learner's own key) and the coach Worker (invite code) both use these, so
// they send the same fixed prompt and apply the same verification. No SDK: plain fetch bodies.
export const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
export const ANTHROPIC_VERSION = '2023-06-01';
export const DEFAULT_MODEL = 'claude-opus-5-5';
// The reply is about 150 tokens. Claude Opus 5.5 always thinks a little and that counts toward
// max_tokens, so the cap leaves room for low-effort thinking while keeping each call cheap.
export const MAX_TOKENS = 1024;
export const EFFORT = 'low';
// Models that accept the server-side refusal fallback, as on the server.
const FALLBACK_MODELS = new Set(['claude-opus-5-5', 'claude-opus-5', 'claude-fable-5-1', 'claude-sonnet-5-5']);
const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

// The fixed task sentence. Moves in it come from the rules library, never from the learner.
export function taskFor(bundle, asked) {
  if (asked) return `Task: the learner asks "why not [[${bundle.subject}]]?" Answer from the evidence, comparing it with the engine's first candidate line.`;
  if (bundle.evidence.playedMove) return `Task: explain the played move [[${bundle.evidence.playedMove.san}]] to the learner, comparing it with the engine's first candidate line.`;
  return `Task: explain the engine's first candidate move [[${bundle.best}]] in this position to the learner.`;
}

// Headers and body for POST ANTHROPIC_URL. The caller adds the key header (x-api-key).
export function messagesRequest(bundle, {asked = false, model = DEFAULT_MODEL} = {}) {
  const fallback = FALLBACK_MODELS.has(model);
  return {
    headers: {'content-type': 'application/json', 'anthropic-version': ANTHROPIC_VERSION, ...(fallback ? {'anthropic-beta': FALLBACK_BETA} : {})},
    body: {
      model,
      max_tokens: MAX_TOKENS,
      output_config: {effort: EFFORT},
      ...(fallback ? {fallbacks: 'default'} : {}),
      system: [{type: 'text', text: SYSTEM_PROMPT, cache_control: {type: 'ephemeral'}}],
      messages: [{role: 'user', content: `<evidence>\n${JSON.stringify(bundle.evidence)}\n</evidence>\n\n${taskFor(bundle, asked)}`}],
    },
  };
}

// Reads a Messages API reply. Returns {text, cited, model} when it passes every check, else {reason}.
export function readReply(response, bundle, model = DEFAULT_MODEL) {
  if (!response || typeof response !== 'object') return {reason: 'api_error'};
  if (response.stop_reason === 'refusal') return {reason: 'refusal'};
  if (response.stop_reason === 'max_tokens') return {reason: 'incomplete'};
  const text = (Array.isArray(response.content) ? response.content : []).filter(block => block?.type === 'text').map(block => String(block.text)).join('').trim();
  if (!text) return {reason: 'empty'};
  const words = text.replace(BRACKETED, '$1').split(/\s+/).filter(Boolean).length;
  const paragraphs = text.split(/\n\s*\n/).filter(part => part.trim()).length;
  if (text.length > 1600 || words > MAX_WORDS || paragraphs > MAX_PARAGRAPHS) return {reason: 'too_long'};
  const verdict = verifyAnswer(text, bundle);
  if (!verdict.ok) return {reason: 'unverified_claims', problems: verdict.problems.length};
  return {text: verdict.text, cited: verdict.cited, model: typeof response.model === 'string' ? response.model : model};
}

// HTTP status from api.anthropic.com to a short fallback reason.
export function reasonForStatus(status) {
  if (status === 429 || status === 529) return 'upstream_busy';
  if (status === 401 || status === 403) return 'not_authorized';
  return 'api_error';
}

// The answer fields the app shows, shared by Claude answers and engine-only fallbacks.
export function answerBase(bundle, asked) {
  const receipt = {engine: bundle.evidence.engine.name, movetimeMs: bundle.evidence.engine.movetimeMs, depth: bundle.evidence.engine.depth, lines: bundle.evidence.candidateLines.length};
  return {question: asked ? bundle.subject : null, bestMove: bundle.best, subject: bundle.subject, receipt};
}

export const engineAnswer = (bundle, asked, reason) => ({...answerBase(bundle, asked), source: 'engine', text: bundle.deterministic, citedMoves: [], fallbackReason: bundle.explainable ? reason : 'no_evidence'});
export const claudeAnswer = (bundle, asked, reply) => ({...answerBase(bundle, asked), source: 'claude', model: reply.model, text: reply.text, citedMoves: reply.cited, fallbackReason: null});

// Sends one explanation request to api.anthropic.com and reads the reply. Never throws: every
// failure becomes {reason}. Never logs the key, the prompt or the answer.
export async function askClaude(bundle, {asked = false, model = DEFAULT_MODEL, apiKey, fetch: send = globalThis.fetch, extraHeaders = {}, signal, timeoutMs = 20000} = {}) {
  const {headers, body} = messagesRequest(bundle, {asked, model});
  const controller = new AbortController();
  let deadlineHit = false;
  const timer = setTimeout(() => { deadlineHit = true; controller.abort(); }, timeoutMs);
  const forward = () => controller.abort();
  signal?.addEventListener('abort', forward, {once: true});
  try {
    const response = await send(ANTHROPIC_URL, {method: 'POST', headers: {...headers, ...extraHeaders, 'x-api-key': apiKey}, body: JSON.stringify(body), signal: controller.signal});
    if (!response.ok) return {reason: reasonForStatus(response.status), status: response.status};
    return readReply(await response.json(), bundle, model);
  } catch {
    return {reason: deadlineHit ? 'timeout' : signal?.aborted ? 'canceled' : 'unreachable'};
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', forward);
  }
}

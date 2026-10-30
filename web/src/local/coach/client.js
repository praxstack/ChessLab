import {gameVariant} from '../../../../shared/chess.js';
import {randomUUID} from '../../../../shared/random.js';
import {askClaude, DEFAULT_MODEL} from '../../../../shared/coach/messages.js';
import {toWire} from '../../../../shared/coach/payload.js';
import {buildEvidence, parseAskedMove} from '../../../../shared/coach/evidence.js';
import {engineAnswer} from '../coach-fallback.js';
import {createCredentials, coachEndpoint} from './credentials.js';

// The browser coach. Path A: the learner's own Claude key calls api.anthropic.com directly with the
// same prompt and checks as the server. Path B: an invite code goes to the coach Worker with chess
// evidence only. With neither, or on any failure, the answer is the engine summary and a short reason.
const failure = (status, message) => Object.assign(new Error(message), {status});
const WORKER_TIMEOUT_MS = 25000;

export function createBrowserCoach({credentials = createCredentials(), coachUrl = null, fetch = (...args) => globalThis.fetch(...args), now = Date.now, model = DEFAULT_MODEL} = {}) {
  const endpoint = coachEndpoint(coachUrl);
  const evidence = new Map();
  // 'key' (path A), 'invite' (path B) or null. A key wins if both were somehow saved.
  const mode = () => credentials.key() ? 'key' : endpoint && credentials.invite() ? 'invite' : null;
  const requestKey = ({moves = [], initialFen = null, variant, playedMove = null}) => JSON.stringify([moves, initialFen ?? null, variant || 'standard', playedMove ?? null]);

  async function viaWorker(payload, asked, signal) {
    const controller = new AbortController();
    let deadlineHit = false;
    const timer = setTimeout(() => { deadlineHit = true; controller.abort(); }, WORKER_TIMEOUT_MS);
    const forward = () => controller.abort();
    signal?.addEventListener('abort', forward, {once: true});
    try {
      const response = await fetch(endpoint, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({inviteCode: credentials.invite(), evidence: payload, asked}), signal: controller.signal});
      if (!response.ok) {
        // The Worker names why it refused: a wrong invite code, or a site it does not serve.
        const refusal = await response.json().catch(() => null);
        if (response.status === 403 && ['invite_rejected', 'origin_not_allowed'].includes(refusal?.reason)) return {reason: refusal.reason};
        return {reason: response.status === 429 || response.status >= 500 ? 'upstream_busy' : 'api_error'};
      }
      const answer = await response.json();
      if (answer?.source === 'claude' && typeof answer.text === 'string' && Array.isArray(answer.citedMoves)) return {answer};
      return {reason: typeof answer?.fallbackReason === 'string' ? answer.fallbackReason : 'api_error'};
    } catch {
      return {reason: deadlineHit ? 'timeout' : signal?.aborted ? 'canceled' : 'unreachable'};
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', forward);
    }
  }

  return {
    status: () => {
      const current = mode();
      return {enabled: Boolean(current), ...(current ? {via: current} : {}), ...(current === 'key' ? {model} : {})};
    },
    covered: () => Boolean(mode()),
    engineMovetime: 800,
    parseAskedMove,
    remember(userId, request, analysis) {
      if (!mode() || !analysis?.fen) return undefined;
      const id = randomUUID();
      evidence.set(id, {userId, key: requestKey(request), analysis, until: now() + 1800000});
      while (evidence.size > 200) evidence.delete(evidence.keys().next().value);
      return id;
    },
    recall(userId, id, request) {
      const entry = typeof id === 'string' ? evidence.get(id) : null;
      if (!entry || entry.userId !== userId || entry.until <= now() || entry.key !== requestKey(request)) return null;
      return entry.analysis;
    },
    async explain(input) {
      try { gameVariant(input.variant); } catch (error) { throw failure(400, error.message); }
      const current = mode();
      // Checks the evidence against the position, as the server does, and is the fallback answer.
      const base = engineAnswer(input, 'not_covered');
      const fallback = reason => ({...base, fallbackReason: reason});
      if (base.fallbackReason === 'no_evidence') return base;
      if (!current) return base;
      const asked = Boolean(input.asked);
      // The evidence is built here with the rules library, as the server builds it.
      let bundle;
      try { bundle = buildEvidence(input.analysis, {moves: input.moves, initialFen: input.initialFen, variant: input.variant, asked}); }
      catch { return fallback('no_evidence'); }
      if (!bundle.explainable) return fallback('no_evidence');
      if (current === 'invite') {
        const result = await viaWorker(toWire(bundle.evidence), asked, input.signal);
        // The receipt names the engine that searched here; the Worker only knows a fixed label.
        return result.answer ? {...base, ...result.answer, question: base.question, receipt: base.receipt, fallbackReason: null} : fallback(result.reason);
      }
      const reply = await askClaude(bundle, {asked, model, apiKey: credentials.key(), fetch, signal: input.signal, extraHeaders: {'anthropic-dangerous-direct-browser-access': 'true'}});
      if (reply.reason) return fallback(reply.reason);
      return {...base, source: 'claude', model: reply.model, text: reply.text, citedMoves: reply.cited, fallbackReason: null};
    },
  };
}

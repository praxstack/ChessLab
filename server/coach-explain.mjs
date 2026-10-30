import Anthropic from '@anthropic-ai/sdk';
import {randomUUID} from 'node:crypto';
import {gameVariant} from '../shared/chess.js';
import {DEFAULT_MODEL, readReply} from '../shared/coach/messages.js';
import {SYSTEM_PROMPT} from '../shared/coach/prompt.js';
import {buildEvidence, failure} from '../shared/coach/evidence.js';

// Claude explains evidence that the server already verified. It never decides legality,
// material, defenders or continuations; the answer is checked before the learner sees it.
// The prompt, evidence and checks live in shared/coach/ so the browser app and the coach Worker use them too.
export {SYSTEM_PROMPT} from '../shared/coach/prompt.js';
export {buildEvidence, verifyAnswer, normalizeSan, parseAskedMove} from '../shared/coach/evidence.js';
export {DEFAULT_MODEL} from '../shared/coach/messages.js';
const SERVER_FALLBACK_MODELS = new Set(['claude-opus-5-5', 'claude-opus-5', 'claude-fable-5-1', 'claude-sonnet-5-5']);
const EFFORTS = new Set(['low', 'medium', 'high']);

function boundedInteger(value, fallback, min, max) {
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max ? number : fallback;
}

export function coachConfig(env = process.env) {
  return {
    apiKey:env.ANTHROPIC_API_KEY || '',
    model:env.ANTHROPIC_MODEL || DEFAULT_MODEL,
    effort:EFFORTS.has(env.COACH_AI_EFFORT) ? env.COACH_AI_EFFORT : 'low',
    timeoutMs:boundedInteger(env.COACH_AI_TIMEOUT_MS, 15000, 2000, 60000),
    maxPerHour:boundedInteger(env.COACH_AI_MAX_PER_HOUR, 30, 1, 1000),
    maxPerDay:boundedInteger(env.COACH_AI_MAX_PER_DAY, 50, 1, 5000),
    engineMovetime:boundedInteger(env.COACH_ENGINE_MOVETIME_MS, 800, 100, 2000),
  };
}

// Explanations on the server's key per budget and UTC day. The app passes a SQLite store so a restart keeps the count.
export function memoryDailyUsage() {
  const counts = new Map();
  return {
    take(budget, day, max) {
      const key = `${day} ${budget}`, used = counts.get(key) ?? 0;
      if (used >= max) return false;
      if (counts.size > 10000) for (const id of counts.keys()) if (!id.startsWith(`${day} `)) counts.delete(id);
      counts.set(key, used + 1);
      return true;
    },
  };
}

function classify(error, deadlineHit) {
  if (deadlineHit || error instanceof Anthropic.APIConnectionTimeoutError) return 'timeout';
  if (error instanceof Anthropic.APIUserAbortError || error?.name === 'AbortError') return 'canceled';
  if (error instanceof Anthropic.RateLimitError || error?.status === 429) return 'upstream_busy';
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError || error?.status === 401 || error?.status === 403) return 'not_authorized';
  if (error instanceof Anthropic.APIConnectionError) return 'unreachable';
  return 'api_error';
}

export function createCoach({client, config = coachConfig(), nowMs = Date.now, logger = console, maxConcurrent = 4} = {}) {
  const claude = client ?? (config.apiKey ? new Anthropic({apiKey:config.apiKey, maxRetries:1, timeout:config.timeoutMs}) : null);
  const quotas = new Map(), evidence = new Map(), dailyUsage = memoryDailyUsage();
  let inFlight = 0;

  function takeQuota(userId) {
    const stamp = nowMs(), bucket = quotas.get(userId);
    if (!bucket || bucket.until <= stamp) {
      if (quotas.size > 10000) for (const [id, item] of quotas) if (item.until <= stamp) quotas.delete(id);
      quotas.set(userId, {count:1, until:stamp + 3600000});
      return true;
    }
    if (bucket.count >= config.maxPerHour) return false;
    bucket.count++;
    return true;
  }

  function returnQuota(userId) {
    const bucket = quotas.get(userId);
    if (bucket?.count > 0) bucket.count--;
  }

  const requestKey = ({moves = [], initialFen = null, variant, playedMove = null}) => JSON.stringify([moves, initialFen ?? null, variant || 'standard', playedMove ?? null]);

  async function askClaude(evidenceBundle, task, signal) {
    const controller = new AbortController();
    let deadlineHit = false;
    const timer = setTimeout(() => { deadlineHit = true; controller.abort(); }, config.timeoutMs);
    const forward = () => controller.abort();
    signal?.addEventListener('abort', forward, {once:true});
    try {
      const response = await claude.beta.messages.create({
        model:config.model,
        // Adaptive thinking counts toward max_tokens; the reply itself is about 150 tokens.
        max_tokens:8000,
        output_config:{effort:config.effort},
        ...(SERVER_FALLBACK_MODELS.has(config.model) ? {betas:['server-side-fallback-2026-07-01'], fallbacks:'default'} : {}),
        system:[{type:'text', text:SYSTEM_PROMPT, cache_control:{type:'ephemeral'}}],
        messages:[{role:'user', content:`<evidence>\n${JSON.stringify(evidenceBundle.evidence)}\n</evidence>\n\n${task}`}],
      }, {signal:controller.signal, timeout:config.timeoutMs, maxRetries:1});
      return readReply(response, evidenceBundle, config.model);
    } catch (error) {
      return {reason:signal?.aborted && !deadlineHit ? 'canceled' : classify(error, deadlineHit), status:error?.status};
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', forward);
    }
  }

  return {
    status:() => ({enabled:Boolean(claude), ...(claude ? {model:config.model} : {})}),
    engineMovetime:config.engineMovetime,
    remember(userId, request, analysis) {
      if (!claude || !analysis?.fen) return undefined;
      const id = randomUUID();
      evidence.set(id, {userId, key:requestKey(request), analysis, until:nowMs() + 1800000});
      while (evidence.size > 1000) evidence.delete(evidence.keys().next().value);
      return id;
    },
    recall(userId, id, request) {
      const entry = typeof id === 'string' ? evidence.get(id) : null;
      if (!entry || entry.userId !== userId || entry.until <= nowMs() || entry.key !== requestKey(request)) return null;
      return entry.analysis;
    },
    // serverKey says whether this account may spend the server's key, so a caller that leaves it out spends nothing.
    // budget names what the daily cap counts against: the account, or on a hosted server the invite code it used.
    async explain({userId, analysis, moves = [], initialFen = null, variant, asked = null, serverKey = false, budget = userId, usage = dailyUsage, signal}) {
      try { gameVariant(variant); } catch (error) { throw failure(400, error.message); }
      const bundle = buildEvidence(analysis, {moves, initialFen, variant, asked:Boolean(asked)});
      const receipt = {engine:bundle.evidence.engine.name, movetimeMs:bundle.evidence.engine.movetimeMs, depth:bundle.evidence.engine.depth, lines:bundle.evidence.candidateLines.length};
      const base = {question:asked?.san ?? null, bestMove:bundle.best, subject:bundle.subject, receipt};
      const engineAnswer = reason => ({...base, source:'engine', text:bundle.deterministic, citedMoves:[], fallbackReason:reason});
      if (!bundle.explainable) return engineAnswer('no_evidence');
      if (!claude) return engineAnswer('not_configured');
      if (!serverKey) return engineAnswer('not_covered');
      // Check capacity before quota so a busy fallback costs the learner nothing. Nothing awaits between
      // this check and inFlight++, so concurrent requests cannot both pass it. The hourly quota comes before
      // the stored daily count, so an hourly refusal never spends one of the day's explanations, and a daily
      // refusal hands its hourly unit back.
      if (inFlight >= maxConcurrent) return engineAnswer('busy');
      if (!takeQuota(userId)) return engineAnswer('rate_limited');
      if (!usage.take(budget, new Date(nowMs()).toISOString().slice(0, 10), config.maxPerDay)) {
        returnQuota(userId);
        return engineAnswer('daily_limit');
      }
      const task = asked ? `Task: the learner asks "why not [[${asked.san}]]?" Answer from the evidence, comparing it with the engine's first candidate line.`
        : bundle.evidence.playedMove ? `Task: explain the played move [[${bundle.evidence.playedMove.san}]] to the learner, comparing it with the engine's first candidate line.`
        : `Task: explain the engine's first candidate move [[${bundle.best}]] in this position to the learner.`;
      inFlight++;
      let result;
      try { result = await askClaude(bundle, task, signal); }
      finally { inFlight--; }
      if (result.reason) {
        // Never log prompts, answers or credentials; the reason and HTTP status are enough to operate.
        if (result.reason !== 'canceled') logger.warn?.(`Coach AI fallback: ${result.reason}${result.status ? ` (HTTP ${result.status})` : ''}${result.problems ? ` (${result.problems} unverified claims)` : ''}`);
        return engineAnswer(result.reason);
      }
      return {...base, source:'claude', model:result.model, text:result.text, citedMoves:result.cited, fallbackReason:null};
    },
  };
}

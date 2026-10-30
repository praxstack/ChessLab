// The coach's shared core: no Node, SDK or browser-only imports, so the server, the browser app and
// the coach Worker run the same prompt, evidence and verification.
export {SYSTEM_PROMPT, MAX_WORDS, MAX_PARAGRAPHS} from './prompt.js';
export {buildEvidence, bundleFor, verifyAnswer, normalizeSan, parseAskedMove, failure} from './evidence.js';
export {ANTHROPIC_URL, DEFAULT_MODEL, MAX_TOKENS, taskFor, messagesRequest, readReply, reasonForStatus, askClaude, engineAnswer, claudeAnswer} from './messages.js';
export {toWire, bundleFromWire, ENGINE_LABEL} from './payload.js';

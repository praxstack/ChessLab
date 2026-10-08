import { LIMITS, RATING_BANDS } from './config.js';

// Messages are shown on the page as-is, so they are plain sentences.
export const MESSAGES = Object.freeze({
  emailMissing: 'Enter your email address.',
  emailTooLong: 'That email address is too long.',
  emailInvalid: "That doesn't look like a complete email address. Check it and try again.",
  emailDisposable:
    "Please use an address you'll still have when the beta opens, not a temporary inbox.",
  consentMissing: 'Tick the box so we can email you about the beta.',
  ratingInvalid: 'Choose a rating from the list, or leave it blank.',
});

// A short list of well-known throwaway inbox services. Not exhaustive on purpose.
export const DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com',
  'dispostable.com',
  'emailondeck.com',
  'fakeinbox.com',
  'getairmail.com',
  'getnada.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamailblock.com',
  'grr.la',
  'maildrop.cc',
  'mailinator.com',
  'mailnesia.com',
  'mintemail.com',
  'mohmal.com',
  'sharklasers.com',
  'spamgourmet.com',
  'temp-mail.org',
  'tempail.com',
  'tempmail.com',
  'tempmailo.com',
  'throwawaymail.com',
  'trashmail.com',
  'yopmail.com',
]);

// Reserved names that can never receive mail (RFC 2606 / RFC 6761).
const RESERVED_DOMAINS = new Set(['example.com', 'example.net', 'example.org']);
const RESERVED_TLDS = new Set(['example', 'invalid', 'localhost', 'local', 'test']);

const LOCAL_PART = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;
const DOMAIN_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const TLD = /^(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/;

export function normalizeEmail(value) {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

/**
 * Sensible email check, not a full RFC 5322 parser.
 * Returns { ok: true, email } or { ok: false, error }.
 */
export function validateEmail(value) {
  const email = normalizeEmail(value);
  if (!email) return { ok: false, error: MESSAGES.emailMissing };
  if (email.length > LIMITS.emailMax) return { ok: false, error: MESSAGES.emailTooLong };

  const at = email.lastIndexOf('@');
  if (at < 1 || at !== email.indexOf('@')) return { ok: false, error: MESSAGES.emailInvalid };
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);

  if (local.length > 64 || !LOCAL_PART.test(local)) {
    return { ok: false, error: MESSAGES.emailInvalid };
  }
  const labels = domain.split('.');
  if (labels.length < 2 || !labels.every((label) => DOMAIN_LABEL.test(label))) {
    return { ok: false, error: MESSAGES.emailInvalid };
  }
  const tld = labels[labels.length - 1];
  if (!TLD.test(tld) || RESERVED_TLDS.has(tld) || RESERVED_DOMAINS.has(domain)) {
    return { ok: false, error: MESSAGES.emailInvalid };
  }
  if (isDisposableDomain(domain)) return { ok: false, error: MESSAGES.emailDisposable };
  return { ok: true, email };
}

export function isDisposableDomain(domain) {
  const labels = domain.split('.');
  // Match the domain itself and any parent, so "x.mailinator.com" is caught too.
  for (let i = 0; i < labels.length - 1; i += 1) {
    if (DISPOSABLE_DOMAINS.has(labels.slice(i).join('.'))) return true;
  }
  return false;
}

/** The consent checkbox posts "on"; JSON clients send true. */
export function parseConsent(value) {
  if (value === true) return true;
  if (typeof value !== 'string') return false;
  return ['on', 'true', '1', 'yes'].includes(value.trim().toLowerCase());
}

/** Optional free-text fields: strings only, control characters removed, trimmed, capped. */
export function cleanOptional(value, max = LIMITS.optionalMax) {
  if (typeof value !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
  return cleaned.slice(0, max);
}

/** Returns { ok: true, rating } where rating may be '' (not answered), or { ok: false, error }. */
export function parseRating(value) {
  const rating = cleanOptional(value, 40).toLowerCase();
  if (!rating) return { ok: true, rating: '' };
  if (!Object.hasOwn(RATING_BANDS, rating)) return { ok: false, error: MESSAGES.ratingInvalid };
  return { ok: true, rating };
}

/** The honeypot is a visually hidden "website" field that people never fill in. */
export function isHoneypotFilled(value) {
  return typeof value === 'string' ? value.trim() !== '' : value != null && value !== false;
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MESSAGES,
  cleanOptional,
  isHoneypotFilled,
  normalizeEmail,
  parseConsent,
  parseRating,
  validateEmail,
} from '../src/lib/validate.js';

test('normalizes email: trims and lower-cases', () => {
  assert.equal(normalizeEmail('  Prax.Test@Example.CO.in \n'), 'prax.test@example.co.in');
  assert.equal(normalizeEmail(42), '');
});

test('accepts ordinary addresses', () => {
  for (const email of ['a@b.co', 'first.last+chess@gmail.com', 'x_y-z@mail.example.in', 'o\'neil@club.chess']) {
    assert.deepEqual(validateEmail(email), { ok: true, email: email.toLowerCase() }, email);
  }
  assert.deepEqual(validateEmail('  Player@Gmail.com '), { ok: true, email: 'player@gmail.com' });
});

test('rejects missing, malformed and TLD-less addresses', () => {
  assert.equal(validateEmail('').error, MESSAGES.emailMissing);
  assert.equal(validateEmail(undefined).error, MESSAGES.emailMissing);
  for (const bad of [
    'plainaddress', '@gmail.com', 'user@', 'user@localhost', 'user@gmail', 'a@@b.com',
    'a@b@c.com', 'user@.com', 'user@gmail..com', '.user@gmail.com', 'user.@gmail.com',
    'us er@gmail.com', 'user@-gmail.com', 'user@gmail.c', 'user@gmail.123', 'user@example.com',
    'user@site.test', 'user@box.invalid',
  ]) {
    assert.equal(validateEmail(bad).ok, false, bad);
  }
});

test('rejects addresses over 254 characters', () => {
  const long = `${'a'.repeat(64)}@${'e'.repeat(60)}.${'b'.repeat(60)}.${'c'.repeat(60)}.${'d'.repeat(60)}.com`;
  assert.ok(long.length > 254);
  assert.equal(validateEmail(long).error, MESSAGES.emailTooLong);
});

test('rejects well-known disposable inboxes, including subdomains', () => {
  assert.equal(validateEmail('x@mailinator.com').error, MESSAGES.emailDisposable);
  assert.equal(validateEmail('x@eu.mailinator.com').error, MESSAGES.emailDisposable);
  assert.equal(validateEmail('x@yopmail.com').error, MESSAGES.emailDisposable);
  assert.equal(validateEmail('x@notmailinator.com').ok, true);
});

test('consent must be explicitly given', () => {
  for (const yes of [true, 'on', 'true', '1', 'yes', ' ON ']) assert.equal(parseConsent(yes), true, String(yes));
  for (const no of [false, undefined, null, '', 'off', 'no', 0, 1, {}]) assert.equal(parseConsent(no), false, String(no));
});

test('rating is optional but must be a known band', () => {
  assert.deepEqual(parseRating(undefined), { ok: true, rating: '' });
  assert.deepEqual(parseRating(''), { ok: true, rating: '' });
  assert.deepEqual(parseRating('800-1200'), { ok: true, rating: '800-1200' });
  assert.deepEqual(parseRating('NOT-SURE'), { ok: true, rating: 'not-sure' });
  assert.equal(parseRating('2800').ok, false);
});

test('optional fields are trimmed, stripped of control characters and capped at 200', () => {
  assert.equal(cleanOptional('  hero \n'), 'hero');
  assert.equal(cleanOptional('a\u0000b'), 'a b');
  assert.equal(cleanOptional('x'.repeat(500)).length, 200);
  assert.equal(cleanOptional({ evil: true }), '');
});

test('honeypot counts any non-empty value', () => {
  assert.equal(isHoneypotFilled(''), false);
  assert.equal(isHoneypotFilled('   '), false);
  assert.equal(isHoneypotFilled(undefined), false);
  assert.equal(isHoneypotFilled('https://spam.example'), true);
});

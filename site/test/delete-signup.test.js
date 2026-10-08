import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { deleteSql } from '../scripts/delete-signup.mjs';
import { FakeD1 } from './helpers/d1.js';

test('the delete command removes exactly the address given, whatever it contains', async () => {
  const db = new FakeD1();
  // Stored lower case, as the sign-up handler stores them.
  const addresses = ["o'connor@example.co", '`touch${ifs}/tmp/pwn`@example.co', 'keep@example.co'];
  for (const email of addresses) {
    await db.prepare('INSERT INTO waitlist (email) VALUES (?)').bind(email).run();
  }
  await db.prepare(deleteSql("  O'Connor@Example.co ")).run();
  await db.prepare(deleteSql('`touch${IFS}/tmp/pwn`@example.co')).run();
  assert.deepEqual(db.rows('waitlist').map((r) => r.email), ['keep@example.co']);
});

test('the delete command refuses input that is not an address', () => {
  for (const bad of ['', '   ', 'no-at-sign', 'a@b.co\nDROP TABLE waitlist', 42]) {
    assert.throws(() => deleteSql(bad), /not an email address/);
  }
});

test('the delete script never runs Wrangler through a shell', () => {
  const source = readFileSync(new URL('../scripts/delete-signup.mjs', import.meta.url), 'utf8');
  assert.match(source, /spawnSync\(process\.execPath, args, \{[^}]*shell: false/);
  assert.doesNotMatch(source, /\bexec(Sync)?\(/);
});

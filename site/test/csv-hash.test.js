import { test } from 'node:test';
import assert from 'node:assert/strict';
import { csvCell, toCsv } from '../src/lib/csv.js';
import { hashIp, sha256Hex, timingSafeEqualText } from '../src/lib/hash.js';

test('CSV quotes commas, quotes and newlines', () => {
  assert.equal(csvCell('plain'), 'plain');
  assert.equal(csvCell('a,b'), '"a,b"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell('line1\nline2'), '"line1\nline2"');
  assert.equal(csvCell(null), '');
  assert.equal(csvCell(undefined), '');
  assert.equal(csvCell(' padded '), '" padded "');
});

test('CSV guards against spreadsheet formula injection', () => {
  assert.equal(csvCell('=HYPERLINK("http://x")'), '"\'=HYPERLINK(""http://x"")"');
  assert.equal(csvCell('+1+1'), "'+1+1");
  assert.equal(csvCell('-2+3'), "'-2+3");
  assert.equal(csvCell('@SUM(A1)'), "'@SUM(A1)");
  assert.equal(csvCell('\tcmd'), "'\tcmd");
  assert.equal(csvCell('a=b'), 'a=b');
});

test('toCsv writes a header row and CRLF line endings', () => {
  const csv = toCsv(['email', 'note'], [{ email: 'a@b.co', note: '=1' }, { email: 'c@d.co' }]);
  assert.equal(csv, "email,note\r\na@b.co,'=1\r\nc@d.co,\r\n");
});

test('IP hashing is salted, stable and never returns the raw IP', async () => {
  const a = await hashIp('198.51.100.4', 'salt-one');
  assert.equal(a, await hashIp('198.51.100.4', 'salt-one'));
  assert.notEqual(a, await hashIp('198.51.100.4', 'salt-two'));
  assert.notEqual(a, await sha256Hex('198.51.100.4'));
  assert.match(a, /^[0-9a-f]{64}$/);
  assert.ok(!a.includes('198.51'));
});

test('IP hashing refuses to run without a salt', async () => {
  await assert.rejects(() => hashIp('198.51.100.4', ''), /IP_HASH_SALT/);
  await assert.rejects(() => hashIp('198.51.100.4', undefined), /IP_HASH_SALT/);
});

test('timing-safe compare', async () => {
  assert.equal(await timingSafeEqualText('secret-token', 'secret-token'), true);
  assert.equal(await timingSafeEqualText('secret-token', 'secret-tokeN'), false);
  assert.equal(await timingSafeEqualText('short', 'a-much-longer-value'), false);
  assert.equal(await timingSafeEqualText('', ''), false);
  assert.equal(await timingSafeEqualText(undefined, 'x'), false);
});

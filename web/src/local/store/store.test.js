import test from 'node:test';
import assert from 'node:assert/strict';
import {createMemoryStore} from './memory-store.js';
import {createIdbStore, wrapRecord, unwrapRecords} from './idb-store.js';
import {readBackup} from './schema.js';
import {storeContract} from './store-contract.js';

test('memory store passes the storage contract', async () => {
  await storeContract(createMemoryStore(), assert);
});

test('IndexedDB store passes the storage contract', {skip: globalThis.indexedDB ? false : 'Node has no IndexedDB; the browser smoke test covers it, and its pure record helpers are tested below.'}, async () => {
  const store = await createIdbStore({name: `askthemove-test-${Date.now()}`});
  try { await storeContract(store, assert); } finally { store.close(); }
});

test('IndexedDB records keep first-put order through updates', () => {
  const first = wrapRecord('games', {id: 'b'}, null, 1), second = wrapRecord('games', {id: 'a'}, null, 2);
  const updated = wrapRecord('games', {id: 'b', title: 'new'}, first, 99);
  assert.deepEqual(updated, {k: 'b', s: 1, v: {id: 'b', title: 'new'}});
  assert.deepEqual(unwrapRecords([second, updated]).map(value => value.id), ['b', 'a']);
  assert.throws(() => wrapRecord('games', {}, null, 3), /needs a string id/);
});

test('backups from a newer app skip unknown collections and reject damaged lists', () => {
  const read = readBackup({format: 'askthemove-backup', version: 1, collections: {games: [{id: 'g'}], coach_keys: [{secret: 'x'}]}});
  assert.deepEqual(Object.keys(read), ['games']);
  assert.throws(() => readBackup({format: 'askthemove-backup', version: 2, collections: {}}), /version 2/);
  assert.throws(() => readBackup({format: 'askthemove-backup', version: 1, collections: {games: {}}}), /damaged/);
});

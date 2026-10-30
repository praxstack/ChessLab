import test from 'node:test';
import assert from 'node:assert/strict';
import {createMemoryStore} from './memory-store.js';
import {createIdbStore, openDatabase, wrapRecord, unwrapRecords} from './idb-store.js';
import {readBackup, collectionNames} from './schema.js';
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
  const empty = Object.fromEntries(collectionNames.map(name => [name, []]));
  const read = readBackup({format: 'askthemove-backup', version: 1, collections: {...empty, games: [{id: 'g', moves: [], revision: 0}], coach_keys: [{secret: 'x'}]}});
  assert.deepEqual(Object.keys(read), collectionNames);
  assert.equal(read.games.length, 1);
  assert.throws(() => readBackup({format: 'askthemove-backup', version: 2, collections: {}}), /version 2/);
  assert.throws(() => readBackup({format: 'askthemove-backup', version: 1, collections: {...empty, games: {}}}), /damaged/);
});

test('a database held by another tab is reported as blocked, and a late open is closed', async () => {
  let request, closed = false;
  const indexedDB = {open() { request = {}; return request; }};
  const opening = openDatabase(indexedDB, 'blocked-test');
  request.onblocked();
  await assert.rejects(opening, error => error.code === 'blocked' && /Close other AskTheMove tabs/.test(error.message));
  request.result = {close() { closed = true; }};
  request.onsuccess();
  assert.equal(closed, true, 'the connection that opens after giving up does not stay open');
});

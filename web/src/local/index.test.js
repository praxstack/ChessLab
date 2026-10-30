import test from 'node:test';
import assert from 'node:assert/strict';
import {openStore} from './index.js';
import {databaseBlocked} from './store/idb-store.js';

test('without IndexedDB the app runs on a memory store that says so', async () => {
  const warnings = [];
  const store = await openStore({openIdb: async () => { throw new Error('IndexedDB is unavailable'); }, warn: (...args) => warnings.push(args)});
  assert.equal(store.kind, 'memory');
  assert.equal(warnings.length, 1);
});

test('a database blocked by another tab is not replaced by an empty memory store', async () => {
  await assert.rejects(openStore({openIdb: async () => { throw databaseBlocked(); }, warn: () => assert.fail('no fallback')}), /Close other AskTheMove tabs/);
});

test('a working IndexedDB store is used as it is', async () => {
  const store = {kind: 'indexeddb'};
  assert.equal(await openStore({openIdb: async () => store}), store);
});

import {collectionNames} from './schema.js';

// Takes an assert object with equal, deepEqual, ok and rejects (node:assert/strict in tests, a small
// stand-in in the browser smoke test), so the IndexedDB store runs the same contract in a real browser.
// Every storage implementation must pass this contract.
export async function storeContract(store, assert) {
  assert.equal(await store.get('games', 'missing'), null);
  await store.put('games', {id: 'b', title: 'Second key, first saved', moves: []});
  await store.put('games', {id: 'a', title: 'First key, second saved', moves: ['e2e4']});
  assert.deepEqual((await store.list('games')).map(game => game.id), ['b', 'a'], 'list keeps first-put order, not key order');
  await store.put('games', {id: 'b', title: 'Updated', moves: []});
  assert.deepEqual((await store.list('games')).map(game => game.title), ['Updated', 'First key, second saved'], 'an update keeps its place');
  const read = await store.get('games', 'a');
  read.moves.push('e7e5');
  assert.deepEqual((await store.get('games', 'a')).moves, ['e2e4'], 'values are copies, never shared objects');

  await store.put('collection_games', {key: 'c1:a', collectionId: 'c1', gameId: 'a'});
  await store.put('collection_games', {key: 'c2:a', collectionId: 'c2', gameId: 'a'});
  await store.put('collection_games', {key: 'c1:b', collectionId: 'c1', gameId: 'b'});
  assert.deepEqual((await store.list('collection_games', {index: 'collectionId', value: 'c1'})).map(row => row.gameId), ['a', 'b']);
  assert.deepEqual((await store.list('puzzle_attempts', {index: 'state', value: 'active'})), []);

  assert.equal(await store.delete('games', 'b'), true);
  assert.equal(await store.delete('games', 'b'), false);
  assert.equal(await store.get('games', 'b'), null);

  await assert.rejects(store.put('games', {title: 'no id'}), /needs a string id/);
  await assert.rejects(store.get('users', 'x'), /Unknown collection/);

  const backup = await store.exportAll();
  assert.equal(backup.format, 'askthemove-backup');
  assert.equal(backup.version, 1);
  assert.deepEqual(Object.keys(backup.collections).sort(), [...collectionNames].sort());
  assert.deepEqual(backup.collections.games.map(game => game.id), ['a']);

  await store.put('games', {id: 'z', moves: []});
  await store.put('progress', {key: 'lesson:center', kind: 'lesson', itemId: 'center'});
  await assert.rejects(store.importAll({format: 'other'}), /not an AskTheMove backup/);
  assert.ok(await store.get('games', 'z'), 'a rejected backup leaves data untouched');
  await store.importAll(JSON.stringify(backup));
  assert.equal(await store.get('games', 'z'), null, 'restore replaces, it does not merge');
  assert.deepEqual(await store.list('progress'), []);
  assert.deepEqual((await store.list('collection_games', {index: 'collectionId', value: 'c1'})).map(row => row.key), ['c1:a', 'c1:b']);
  await store.put('games', {id: 'after-restore', moves: []});
  assert.deepEqual((await store.list('games')).map(game => game.id), ['a', 'after-restore'], 'new values go after restored ones');
}


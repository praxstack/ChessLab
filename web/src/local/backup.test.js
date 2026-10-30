import test from 'node:test';
import assert from 'node:assert/strict';
import {createBackup, restoreBackup, inspectBackup, hasSavedData, backupSettings, backupFilename, requestPersistentStorage} from './backup.js';
import {settingDefaults} from '../settings-state.js';
import {fixture} from './testing/fixture.js';
import {createMemoryStore} from './store/memory-store.js';
import {collectionNames} from './store/schema.js';

test('a backup restores games, lesson progress and settings in a fresh browser', async () => {
  const f = fixture();
  const game = (await f.post('/api/import', {pgn: '1. e4 e5 *'})).body.game;
  await f.post('/api/lessons/center/answer', {choice: 1});
  const settings = {...settingDefaults, boardTheme: 'walnut', sound: false};
  const backup = await createBackup(f.store, settings);
  assert.equal(backup.format, 'askthemove-backup'); assert.equal(backup.version, 1);
  assert.deepEqual(backup.settings, settings);
  const fresh = fixture({store: createMemoryStore()});
  const restored = await restoreBackup(fresh.store, JSON.stringify(backup));
  assert.deepEqual(restored, settings);
  assert.deepEqual((await fresh.get(`/api/games/${game.id}`)).body.game, game);
  assert.deepEqual((await fresh.get('/api/me')).body.progress.lessons, ['center']);
});

test('a backup never carries a key, token or invite code, even if settings hold one', async () => {
  const settings = {...settingDefaults, claudeKey: 'sk-ant-secret', apiKey: 'sk-ant-secret', inviteCode: 'friends', coachToken: 'x'};
  const backup = await createBackup(createMemoryStore(), settings);
  assert.doesNotMatch(JSON.stringify(backup), /sk-ant|friends|coachToken|inviteCode/);
  assert.deepEqual(Object.keys(backupSettings(settings)).sort(), Object.keys(settingDefaults).sort());
  const store = createMemoryStore();
  const restored = await restoreBackup(store, {...backup, settings: {...backup.settings, claudeKey: 'sk-ant-planted'}});
  assert.equal(restored.claudeKey, undefined, 'a planted key in a backup file is not restored');
});

test('a damaged or foreign file is refused before anything is replaced', async () => {
  const f = fixture();
  await f.post('/api/import', {pgn: '1. d4 *'});
  await assert.rejects(restoreBackup(f.store, '{not json'), /not valid JSON/);
  await assert.rejects(restoreBackup(f.store, JSON.stringify({format: 'chesslab-study', version: 1})), /not an AskTheMove backup/);
  assert.equal((await f.get('/api/games')).body.games.length, 1);
  assert.match(backupFilename(new Date('2026-10-30T12:00:00Z')), /^askthemove-backup-2026-10-30\.json$/);
});

test('persistent storage is requested once and failures are harmless', async () => {
  const calls = [];
  assert.equal(await requestPersistentStorage({persisted: async () => false, persist: async () => { calls.push('persist'); return true; }}), true);
  assert.equal(await requestPersistentStorage({persisted: async () => true, persist: async () => { calls.push('again'); return true; }}), true);
  assert.deepEqual(calls, ['persist'], 'an already persistent site is not asked again');
  assert.equal(await requestPersistentStorage({persist: async () => { throw new Error('denied'); }}), null);
  assert.equal(await requestPersistentStorage(undefined), null);
});

const emptyCollections = () => Object.fromEntries(collectionNames.map(name => [name, []]));
const backupWith = (collections, extra = {}) => ({format: 'askthemove-backup', version: 1, exportedAt: '2026-10-30T00:00:00.000Z', collections: {...emptyCollections(), ...collections}, ...extra});

test('a backup missing any collection is refused, so "collections": {} cannot wipe everything', async () => {
  const f = fixture();
  await f.post('/api/import', {pgn: '1. e4 e5 *'});
  await f.post('/api/lessons/center/answer', {choice: 1});
  await assert.rejects(restoreBackup(f.store, JSON.stringify({format: 'askthemove-backup', version: 1, collections: {}}), {currentSaved: true}), /incomplete/);
  const {progress, ...partial} = emptyCollections();
  await assert.rejects(restoreBackup(f.store, {format: 'askthemove-backup', version: 1, collections: partial}, {currentSaved: true}), /no progress list/);
  assert.equal((await f.get('/api/games')).body.games.length, 1);
  assert.deepEqual((await f.get('/api/me')).body.progress.lessons, ['center']);
  assert.throws(() => inspectBackup('{"format":"askthemove-backup","version":1,"collections":{}}'), /incomplete/, 'the file is checked before the learner is asked anything');
});

test('a backup with a malformed game is refused whole', async () => {
  const f = fixture();
  const kept = (await f.post('/api/import', {pgn: '1. d4 *'})).body.game;
  const good = {id: 'good', moves: ['e2e4'], revision: 0};
  for (const bad of [{moves: [], revision: 0}, {id: 7, moves: [], revision: 0}, {id: 'x', moves: 'e2e4', revision: 0}, {id: 'x', moves: ['e2e4', 5], revision: 0}, {id: 'x', moves: []}, {id: 'x', moves: [], revision: 1.5}, {id: 'x', moves: [], revision: '0'}, 'not a game']) {
    await assert.rejects(restoreBackup(f.store, backupWith({games: [good, bad]}), {currentSaved: true}), error => error.status === 400, JSON.stringify(bad));
  }
  assert.deepEqual((await f.get('/api/games')).body.games.map(game => game.id), [kept.id]);
  assert.equal(inspectBackup(JSON.stringify(backupWith({games: [good]}))).games, 1);
});

test('settings are left alone when the backup has none', async () => {
  const store = createMemoryStore();
  assert.equal(await restoreBackup(store, backupWith({games: [{id: 'g', moves: [], revision: 0}]})), null);
  assert.equal((await store.get('games', 'g')).id, 'g');
  assert.equal(inspectBackup(backupWith({})).hasSettings, false);
  const withSettings = backupWith({}, {settings: {...settingDefaults, sound: false}});
  assert.equal(inspectBackup(withSettings).hasSettings, true);
  assert.equal((await restoreBackup(createMemoryStore(), withSettings)).sound, false);
});

test('restoring over saved data needs the current data saved first', async () => {
  const f = fixture();
  const kept = (await f.post('/api/import', {pgn: '1. c4 *'})).body.game;
  const incoming = backupWith({games: [{id: 'incoming', moves: [], revision: 0}]});
  await assert.rejects(restoreBackup(f.store, incoming), error => error.status === 409 && /Save a backup/.test(error.message));
  assert.ok(await f.store.get('games', kept.id), 'nothing was replaced');
  await restoreBackup(f.store, incoming, {currentSaved: true});
  assert.deepEqual((await f.get('/api/games')).body.games.map(game => game.id), ['incoming']);
  assert.equal(await hasSavedData(createMemoryStore()), false, 'an empty browser has nothing to lose, so no copy is asked for');
});

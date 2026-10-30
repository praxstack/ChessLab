import test from 'node:test';
import assert from 'node:assert/strict';
import {createBackup, restoreBackup, backupSettings, backupFilename, requestPersistentStorage} from './backup.js';
import {settingDefaults} from '../settings-state.js';
import {fixture} from './testing/fixture.js';
import {createMemoryStore} from './store/memory-store.js';

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

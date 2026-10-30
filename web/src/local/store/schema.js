// Collections replace the server's SQLite tables one to one (design.md seam 4). users, sessions and
// coach_daily are not needed: the browser holds one local profile and the coach keeps its own limits.
// key names the field each value is stored under; indexes name fields that list() can filter by quickly.
export const DATABASE_NAME = 'askthemove';
export const DATABASE_VERSION = 1;
export const BACKUP_FORMAT = 'askthemove-backup';
export const BACKUP_VERSION = 1;

export const collections = {
  games: {key: 'id'},
  game_reviews: {key: 'gameId'},
  bot_results: {key: 'botId'},
  progress: {key: 'key', indexes: ['kind']},
  lesson_sessions: {key: 'lessonId'},
  puzzle_attempts: {key: 'id', indexes: ['state']},
  puzzle_profiles: {key: 'id'},
  puzzle_runs: {key: 'id', indexes: ['state']},
  daily_puzzles: {key: 'date'},
  review_practice: {key: 'gameId'},
  vision_runs: {key: 'id'},
  game_collections: {key: 'id'},
  collection_games: {key: 'key', indexes: ['collectionId', 'gameId']},
};

export const collectionNames = Object.keys(collections);

export function keyOf(collection, value) {
  const spec = collections[collection];
  if (!spec) throw new Error(`Unknown collection: ${collection}`);
  const key = value?.[spec.key];
  if (typeof key !== 'string' || !key) throw new Error(`A ${collection} value needs a string ${spec.key}.`);
  return key;
}

export function checkCollection(collection) {
  if (!Object.hasOwn(collections, collection)) throw new Error(`Unknown collection: ${collection}`);
}

const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);

// Validates a backup before anything is replaced, so a bad file leaves the current data untouched.
export function readBackup(json) {
  const data = typeof json === 'string' ? JSON.parse(json) : json;
  if (!plain(data) || data.format !== BACKUP_FORMAT) throw Object.assign(new Error('This file is not an AskTheMove backup.'), {status: 400});
  if (data.version !== BACKUP_VERSION) throw Object.assign(new Error(`This backup is version ${data.version}; this app reads version ${BACKUP_VERSION}.`), {status: 400});
  if (!plain(data.collections)) throw Object.assign(new Error('This backup has no saved data.'), {status: 400});
  const result = {};
  for (const [name, values] of Object.entries(data.collections)) {
    if (!Object.hasOwn(collections, name)) continue; // Collections from a newer app are skipped, not guessed at.
    if (!Array.isArray(values)) throw Object.assign(new Error(`The backup's ${name} list is damaged.`), {status: 400});
    for (const value of values) keyOf(name, value);
    result[name] = values;
  }
  return result;
}

export function backupDocument(collectionsData, exportedAt = new Date().toISOString()) {
  return {format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt, collections: collectionsData};
}

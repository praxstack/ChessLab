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

const refuse = message => { throw Object.assign(new Error(message), {status: 400}); };

// The least a saved game needs for the app to open it. A file failing this is refused whole, so a
// restore never leaves games behind that crash the board or can never be saved again.
function checkGame(game) {
  if (!plain(game) || typeof game.id !== 'string' || !game.id) refuse('A game in this backup has no id.');
  if (!Array.isArray(game.moves) || !game.moves.every(move => typeof move === 'string')) refuse(`The backup's game ${game.id} has damaged moves.`);
  if (!Number.isInteger(game.revision) || game.revision < 0) refuse(`The backup's game ${game.id} has no valid revision.`);
}

// Validates a backup before anything is replaced, so a bad file leaves the current data untouched.
// Every collection this app knows must be present as a list, even an empty one: a file that leaves
// one out (for example "collections": {}) is damaged or hand-made, and restoring it would wipe that
// data. A new collection therefore needs a new BACKUP_VERSION.
export function readBackup(json) {
  const data = typeof json === 'string' ? JSON.parse(json) : json;
  if (!plain(data) || data.format !== BACKUP_FORMAT) refuse('This file is not an AskTheMove backup.');
  if (data.version !== BACKUP_VERSION) refuse(`This backup is version ${data.version}; this app reads version ${BACKUP_VERSION}.`);
  if (!plain(data.collections)) refuse('This backup has no saved data.');
  const result = {};
  for (const name of collectionNames) {
    const values = data.collections[name];
    if (values === undefined) refuse(`This backup has no ${name} list, so it is incomplete.`);
    if (!Array.isArray(values)) refuse(`The backup's ${name} list is damaged.`);
    for (const value of values) {
      if (!plain(value)) refuse(`The backup's ${name} list is damaged.`);
      try { keyOf(name, value); } catch (error) { refuse(error.message); }
      if (name === 'games') checkGame(value);
    }
    result[name] = values;
  }
  // Collections from a newer app are skipped, not guessed at.
  return result;
}

export function backupDocument(collectionsData, exportedAt = new Date().toISOString()) {
  return {format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt, collections: collectionsData};
}

import {DATABASE_NAME, DATABASE_VERSION, collections, collectionNames, keyOf, checkCollection, readBackup, backupDocument} from './schema.js';

// IndexedDB storage: one database, one object store per collection, plain IndexedDB with no library.
// Each value is saved as {k: key, s: order, v: value}; s keeps list() in first-put order like the
// server's rowid, and survives updates. The meta store holds the next order number.
const META = 'meta';

export const wrapRecord = (collection, value, existing, order) => ({k: keyOf(collection, value), s: existing ? existing.s : order, v: value});
export const unwrapRecords = records => [...records].sort((a, b) => a.s - b.s).map(record => record.v);

export function upgradeDatabase(db) {
  for (const name of collectionNames) {
    if (db.objectStoreNames.contains(name)) continue;
    const store = db.createObjectStore(name, {keyPath: 'k'});
    store.createIndex('order', 's');
    for (const field of collections[name].indexes || []) store.createIndex(field, `v.${field}`);
  }
  if (!db.objectStoreNames.contains(META)) db.createObjectStore(META);
}

const done = request => new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
const finished = transaction => new Promise((resolve, reject) => {
  transaction.oncomplete = () => resolve();
  transaction.onerror = event => reject(event.target?.error || transaction.error || new Error('The browser stopped saving. Your last change may not be saved.'));
  transaction.onabort = () => reject(transaction.error || new Error('The browser stopped saving. Your last change may not be saved.'));
});

export const BLOCKED_MESSAGE = 'Another AskTheMove tab is keeping your saved games locked. Close other AskTheMove tabs, then refresh this page.';
export const databaseBlocked = () => Object.assign(new Error(BLOCKED_MESSAGE), {status: 503, code: 'blocked'});

export function openDatabase(indexedDB = globalThis.indexedDB, name = DATABASE_NAME) {
  if (!indexedDB) return Promise.reject(new Error('This browser cannot save data (IndexedDB is unavailable).'));
  return new Promise((resolve, reject) => {
    let blocked = false;
    const request = indexedDB.open(name, DATABASE_VERSION);
    request.onupgradeneeded = () => upgradeDatabase(request.result);
    request.onsuccess = () => {
      const db = request.result;
      // Opened after this tab already gave up: close it so the next attempt starts clean.
      if (blocked) { db.close(); return; }
      // Another tab upgrading the database closes this connection instead of blocking it.
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => reject(request.error);
    // An older tab still holds the database open. The data is fine, so this is not a reason to run
    // without saving: the learner closes the other tab and tries again.
    request.onblocked = () => { blocked = true; reject(databaseBlocked()); };
  });
}

export async function createIdbStore({indexedDB = globalThis.indexedDB, name = DATABASE_NAME} = {}) {
  const db = await openDatabase(indexedDB, name);
  async function nextOrder(meta) {
    const current = (await done(meta.get('order'))) ?? 0;
    meta.put(current + 1, 'order');
    return current + 1;
  }
  return {
    kind: 'indexeddb',
    async get(collection, id) {
      checkCollection(collection);
      const record = await done(db.transaction(collection).objectStore(collection).get(id));
      return record ? record.v : null;
    },
    async put(collection, value) {
      checkCollection(collection);
      const transaction = db.transaction([collection, META], 'readwrite'), store = transaction.objectStore(collection);
      const existing = await done(store.get(keyOf(collection, value)));
      const order = existing ? existing.s : await nextOrder(transaction.objectStore(META));
      store.put(wrapRecord(collection, value, existing, order));
      await finished(transaction);
      return value;
    },
    async list(collection, {index, value} = {}) {
      checkCollection(collection);
      const store = db.transaction(collection).objectStore(collection);
      if (index === undefined) return unwrapRecords(await done(store.getAll()));
      if (store.indexNames.contains(index) && value !== undefined && value !== null && typeof value !== 'boolean') return unwrapRecords(await done(store.index(index).getAll(value)));
      return unwrapRecords(await done(store.getAll())).filter(item => item[index] === value);
    },
    async delete(collection, id) {
      checkCollection(collection);
      const transaction = db.transaction(collection, 'readwrite'), store = transaction.objectStore(collection);
      const existing = await done(store.getKey(id));
      store.delete(id);
      await finished(transaction);
      return existing !== undefined;
    },
    async exportAll() {
      const transaction = db.transaction(collectionNames);
      const entries = await Promise.all(collectionNames.map(async name => [name, unwrapRecords(await done(transaction.objectStore(name).getAll()))]));
      return backupDocument(Object.fromEntries(entries));
    },
    async importAll(json) {
      const incoming = readBackup(json);
      const transaction = db.transaction([...collectionNames, META], 'readwrite');
      let order = 0;
      for (const name of collectionNames) {
        const store = transaction.objectStore(name);
        store.clear();
        for (const value of incoming[name] || []) store.put(wrapRecord(name, value, null, ++order));
      }
      transaction.objectStore(META).put(order, 'order');
      await finished(transaction);
    },
    close() { db.close(); },
  };
}

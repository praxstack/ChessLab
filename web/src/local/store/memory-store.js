import {collectionNames, keyOf, checkCollection, readBackup, backupDocument} from './schema.js';

// In-memory storage for tests and for browsers without IndexedDB. Values are copied in and out,
// so callers never share objects with the store. list() returns values in first-put order.
export function createMemoryStore() {
  const data = new Map(collectionNames.map(name => [name, new Map()]));
  const copy = value => value === undefined ? undefined : structuredClone(value);
  return {
    kind: 'memory',
    async get(collection, id) { checkCollection(collection); return copy(data.get(collection).get(id)) ?? null; },
    async put(collection, value) { const key = keyOf(collection, value); data.get(collection).set(key, copy(value)); return copy(value); },
    async list(collection, {index, value} = {}) {
      checkCollection(collection);
      const values = [...data.get(collection).values()];
      return (index === undefined ? values : values.filter(item => item[index] === value)).map(copy);
    },
    async delete(collection, id) { checkCollection(collection); return data.get(collection).delete(id); },
    async exportAll() { return backupDocument(Object.fromEntries(collectionNames.map(name => [name, [...data.get(name).values()].map(copy)]))); },
    async importAll(json) {
      const incoming = readBackup(json);
      for (const name of collectionNames) {
        const next = new Map();
        for (const value of incoming[name] || []) next.set(keyOf(name, value), copy(value));
        data.set(name, next);
      }
    },
    close() {},
  };
}

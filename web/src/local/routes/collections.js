import {randomUUID} from '../../../../shared/random.js';
import {collectionDetails, checkCollectionRevision, collectionSelection, MAX_COLLECTIONS} from '../../../../shared/game-collections.js';
import {fail, respond} from '../context.js';

// Named collections of saved games. Membership rows are {key, collectionId, gameId}.
export default function collectionRoutes(ctx) {
  const {store, atomic, iso} = ctx;
  async function read(id) {
    const c = typeof id === 'string' ? await store.get('game_collections', id) : null;
    if (!c) fail(404, 'This collection was not found.');
    return {...c, gameIds: (await store.list('collection_games', {index: 'collectionId', value: id})).map(row => row.gameId)};
  }
  async function current(id, body) { const c = await read(id); checkCollectionRevision(c, body); return c; }
  async function uniqueName(name, except) {
    if ((await store.list('game_collections')).some(c => c.id !== except && c.name.toLowerCase() === name.toLowerCase())) fail(409, 'You already have a collection with that name.');
  }
  const touch = async c => { const saved = await store.get('game_collections', c.id); await store.put('game_collections', {...saved, revision: saved.revision + 1, updatedAt: iso()}); };
  return [
    ['GET', '/api/collections', async () => {
      const all = (await store.list('game_collections')).reverse().sort((a, b) => a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0);
      return {collections: await Promise.all(all.map(c => read(c.id)))};
    }],
    ['POST', '/api/collections', async ({body}) => {
      const value = collectionDetails(body), id = randomUUID();
      await atomic(async () => {
        if ((await store.list('game_collections')).length >= MAX_COLLECTIONS) fail(409, 'This account has reached the 100-collection limit.');
        await uniqueName(value.name);
        await store.put('game_collections', {id, name: value.name, description: value.description, revision: 0, updatedAt: iso()});
      });
      return respond(201, {collection: await read(id)});
    }],
    ['POST', '/api/collections/:id', async ({params, body}) => {
      await atomic(async () => {
        const c = await current(params.id, body), value = collectionDetails(body);
        await uniqueName(value.name, c.id);
        const saved = await store.get('game_collections', c.id);
        await store.put('game_collections', {...saved, name: value.name, description: value.description});
        await touch(c);
      });
      return {collection: await read(params.id)};
    }],
    ['POST', '/api/collections/:id/games', async ({params, body}) => {
      await atomic(async () => {
        const c = await current(params.id, body), {ids, present} = collectionSelection(body);
        for (const id of ids) if (!await store.get('games', id)) fail(404, 'A selected saved game was not found.');
        for (const id of ids) {
          const key = `${c.id}:${id}`;
          if (!present) await store.delete('collection_games', key);
          else if (!await store.get('collection_games', key)) await store.put('collection_games', {key, collectionId: c.id, gameId: id});
        }
        await touch(c);
      });
      return {collection: await read(params.id)};
    }],
    ['POST', '/api/collections/:id/delete', async ({params, body}) => {
      await atomic(async () => {
        const c = await current(params.id, body);
        for (const row of await store.list('collection_games', {index: 'collectionId', value: c.id})) await store.delete('collection_games', row.key);
        await store.delete('game_collections', c.id);
      });
      return {deleted: true};
    }],
  ];
}

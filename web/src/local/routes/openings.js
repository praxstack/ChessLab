import {portableStudy} from '../../../../shared/study-format.js';
import {explorerKey, indexPersonalGame, explorable, explorerSource, explorerBoard, personalRows, personalMetadata, explorerResponse, explorerGame} from '../../../../shared/opening-explorer.js';
import {fail, respond, LOCAL_USER} from '../context.js';

// Opening library, recognition and the explorer. The master-game corpus is not in the browser, so
// the explorer's default source answers like a server without its catalogue; "My games" works.
// The opening catalogue (over 1 MB) loads on first use, so the app's first screen does not wait for it.
const catalogue = () => import('../../../../shared/openings.js');
export default function openingRoutes(ctx) {
  let cache = null;
  async function personal() {
    const games = (await ctx.store.list('games')).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0).filter(explorable);
    const signature = JSON.stringify(games.map(game => [game.id, game.revision, game.result]));
    if (cache?.signature === signature) return cache.games;
    const indexed = games.map(game => indexPersonalGame({...game, headers: portableStudy(game, LOCAL_USER.username).game.headers})).filter(Boolean);
    cache = {signature, games: indexed};
    return indexed;
  }
  return [
    ['GET', '/api/openings', async ({query}) => (await catalogue()).searchOpenings(query)],
    ['GET', '/api/openings/:id', async ({params}) => { const {openingById, openingSource} = await catalogue(), opening = openingById(params.id); if (!opening) fail(404, 'Opening not found.'); return {opening, source: openingSource}; }],
    ['POST', '/api/openings/recognize', async ({body}) => {
      const {recognizeOpening, openingSource} = await catalogue(), opening = recognizeOpening(body.moves, body.initialFen, body.variant);
      if (body.gameId !== undefined) await ctx.markReviewAccess(body.gameId);
      return {opening, source: openingSource};
    }],
    ['POST', '/api/openings/:id/study', async ({params}) => {
      const opening = (await catalogue()).openingById(params.id); if (!opening) fail(404, 'Opening not found.');
      return respond(201, {game: await ctx.insertGame({title: opening.name, source: 'import', moves: [...opening.moves], opening: {id: opening.id, name: opening.name, eco: opening.eco}, headers: {White: 'White', Black: 'Black'}})});
    }],
    ['GET', '/api/explorer', async ({query}) => {
      const source = explorerSource(query.source), board = explorerBoard(query.fen);
      if (source !== 'mine') return {available: false, moves: [], games: [], total: 0, source: null, fen: board.fen()};
      const games = await personal(), {rows, examples} = personalRows(games, explorerKey(board.fen()));
      return explorerResponse(board, rows, personalMetadata(games.length), examples);
    }],
    ['GET', '/api/explorer/games/:id', async ({params, query}) => {
      const source = explorerSource(query.source);
      const found = source === 'mine' ? (await personal()).find(game => game.id === params.id) : null;
      if (!found) fail(404, 'This example game was not found.');
      return {game: explorerGame(found)};
    }],
  ];
}

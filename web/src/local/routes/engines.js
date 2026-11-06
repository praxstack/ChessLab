import {fail} from '../context.js';
import {SITE_APP_URL, SITE_CATALOG} from '../engine/catalog.js';

// The engine picker's door (Settings > Engine): the engines this build can offer, which one is in
// use, the download under way, and the switch itself. An engine without the switching seam (the
// stub when workers are missing) lists nothing and refuses a switch.
export default function engineRoutes(ctx) {
  const switchable = () => (typeof ctx.engine.use === 'function' ? ctx.engine : fail(503, 'The chess engine is not available in this browser.'));
  const answer = engine => ({engines: engine.engines(), ...engine.state(), siteCatalog: SITE_CATALOG, siteUrl: SITE_APP_URL});
  return [
    ['GET', '/api/engines', async () => (typeof ctx.engine.use === 'function' ? answer(ctx.engine) : {engines: [], current: null, switching: null, failed: null, remembered: '', siteCatalog: SITE_CATALOG, siteUrl: SITE_APP_URL})],
    ['POST', '/api/engines/use', async ({body}) => {
      const engine = switchable();
      if (typeof body.id !== 'string' || !body.id) fail(400, 'Choose an engine from the list.');
      await engine.use(body.id);
      return answer(engine);
    }],
    ['POST', '/api/engines/stop', async () => { const engine = switchable(); engine.cancel(); return answer(engine); }],
  ];
}

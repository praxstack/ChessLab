import {ENGINES, DEFAULT_ENGINE, cantRun, needsWarning, formatBytes, roughTimes} from '../../../../site/public/assets/engine-catalog.js';

// The engines the browser app can offer, read from the puzzle board's catalog (site/public/assets/
// engine-catalog.js). Stockfish 19 Lite ships with the app; every other engine's files live on
// askthemove.online under /assets/engine/, so they can only be fetched by the app served from
// there (askthemove.online/betapp/), where the build sets VITE_ENGINE_CATALOG=site. The app at
// pages.dev offers the bundled engine alone and says where the rest are.
export const BUNDLED_ID = DEFAULT_ENGINE;
export const SITE_APP_URL = 'https://askthemove.online/betapp/';
export const SITE_CATALOG = import.meta.env?.VITE_ENGINE_CATALOG === 'site';
export const NOT_HERE = `Available in the app at ${SITE_APP_URL}`;

// A several-cores engine needs the page to be cross-origin isolated (COOP + COEP headers), which the app
// is not yet; the catalog says so in its own words.
export function appEngines({siteCatalog = SITE_CATALOG, isolated = globalThis.crossOriginIsolated === true} = {}) {
  return ENGINES.filter(e => e.status === 'ready').map(e => ({
    id: e.id,
    name: e.name,
    family: e.family,
    about: e.about,
    device: e.device,
    bytes: e.bytes,
    size: formatBytes(e.bytes),
    memory: e.memory || null,
    license: e.license,
    licenseUrl: e.licenseUrl,
    source: e.source,
    bundled: e.id === BUNDLED_ID,
    neural: Boolean(e.module),
    heavy: needsWarning(e),
    cantRun: e.id === BUNDLED_ID ? '' : !siteCatalog ? NOT_HERE : cantRun(e, {isolated}),
  }));
}

// The lines of the warning a heavy engine shows before it downloads, as the puzzle board words them.
export function warningLines(entry, {downlink = 0, cellular = false} = {}) {
  const lines = [['Size', `${entry.size} to download once; kept on this device for 30 days.`]];
  lines.push(['Rough time', `${roughTimes(entry.bytes, downlink).map(t => `${t.text} ${t.label}`).join('; ')}.`]);
  if (cellular) lines.push(['Data', 'You seem to be on mobile data or Data Saver. All of it counts against your data.']);
  lines.push(['Memory', `It needs a lot of memory: ${entry.memory || 'more than most phones can spare'}.`]);
  lines.push(['Risk', 'The tab may freeze for a while, or crash. If it crashes, reload: the app goes back to Stockfish 19 Lite by itself.']);
  lines.push(['Devices', 'Fine on a recent computer or iPad. Older phones and tablets may close the tab.']);
  lines.push(['Stopping', 'You can stop the download at any time; Stockfish 19 Lite keeps working meanwhile.']);
  return lines;
}

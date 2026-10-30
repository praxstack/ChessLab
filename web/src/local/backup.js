import {settingDefaults, normalizeSettings} from '../settings-state.js';

// Back up and Restore: everything the app saved in this browser, as one versioned JSON file.
// Settings are copied by an allow-list of known preference names, and anything that looks like a
// credential is dropped as well, so a backup never carries a Claude key or invite code.
const SECRET = /key|token|secret|password|invite|credential|anthropic|claude/i;

export function backupSettings(settings) {
  const value = normalizeSettings(settings);
  return Object.fromEntries(Object.keys(settingDefaults).filter(name => !SECRET.test(name)).map(name => [name, value[name]]));
}

export async function createBackup(store, settings) {
  const backup = await store.exportAll();
  return {...backup, settings: backupSettings(settings)};
}

export const backupFilename = (date = new Date()) => `askthemove-backup-${date.toISOString().slice(0, 10)}.json`;

// Replaces this browser's data with the backup. Returns the settings to apply.
export async function restoreBackup(store, text) {
  let data;
  try { data = typeof text === 'string' ? JSON.parse(text) : text; }
  catch { throw Object.assign(new Error('This file is not valid JSON. Nothing was changed.'), {status: 400}); }
  await store.importAll(data);
  return backupSettings(data?.settings);
}

// Asks the browser not to clear this site's data under storage pressure. Safe to call more than once;
// it returns whether storage is persistent, or null when the browser cannot say.
export async function requestPersistentStorage(storage = globalThis.navigator?.storage) {
  if (!storage?.persist) return null;
  try { return (await storage.persisted?.()) || await storage.persist(); }
  catch { return null; }
}

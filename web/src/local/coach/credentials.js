// The learner's coach access in this browser: their own Claude key (path A) or an invite code for the
// coach Worker (path B). Each lives in its own localStorage entry, outside the settings object, so
// Back up never writes it and Restore never overwrites it. Saving one removes the other.
export const KEY_ENTRY = 'chesslab-coach-key';
export const INVITE_ENTRY = 'chesslab-coach-invite';

const browserStorage = () => { try { return globalThis.localStorage ?? null; } catch { return null; } };
const read = (storage, name) => { try { return storage?.getItem(name) || ''; } catch { return ''; } };
const write = (storage, name, value) => { try { value ? storage?.setItem(name, value) : storage?.removeItem(name); } catch {} };

// Anthropic keys start with sk-ant-. This only catches pasting the wrong thing.
export const looksLikeKey = value => /^sk-ant-[A-Za-z0-9_-]{16,}$/.test(String(value).trim());
export const looksLikeInvite = value => { const code = String(value).trim(); return code.length >= 4 && code.length <= 100 && !/\s/.test(code); };

// The Worker address from the build (VITE_COACH_URL), as the /explain endpoint, or null when unset.
export function coachEndpoint(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') return null;
    url.pathname = `${url.pathname.replace(/\/+$/, '').replace(/\/explain$/, '')}/explain`;
    url.search = ''; url.hash = '';
    return url.href;
  } catch { return null; }
}

export function createCredentials(storage = browserStorage()) {
  return {
    key: () => read(storage, KEY_ENTRY),
    invite: () => read(storage, INVITE_ENTRY),
    saveKey(value) {
      const key = String(value).trim();
      if (!looksLikeKey(key)) throw Object.assign(new Error('That does not look like a Claude key. It starts with sk-ant-.'), {status: 400});
      write(storage, KEY_ENTRY, key); write(storage, INVITE_ENTRY, '');
    },
    saveInvite(value) {
      const code = String(value).trim();
      if (!looksLikeInvite(code)) throw Object.assign(new Error('Enter the invite code exactly as you received it.'), {status: 400});
      write(storage, INVITE_ENTRY, code); write(storage, KEY_ENTRY, '');
    },
    clear() { write(storage, KEY_ENTRY, ''); write(storage, INVITE_ENTRY, ''); },
  };
}

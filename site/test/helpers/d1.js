// In-memory D1 stand-in backed by node:sqlite, with the real migration applied.
// Mirrors the parts of the D1 API the functions use: prepare().bind().run()/first()/all() and batch().
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

// Every migration, in order, exactly as Wrangler would apply them.
const MIGRATIONS_DIR = new URL('../../migrations/', import.meta.url);
const MIGRATIONS = readdirSync(MIGRATIONS_DIR)
  .filter((name) => name.endsWith('.sql'))
  .sort()
  .map((name) => new URL(name, MIGRATIONS_DIR));

class Statement {
  constructor(db, sql, params = []) {
    this.db = db;
    this.sql = sql;
    this.params = params;
  }
  bind(...params) {
    return new Statement(this.db, this.sql, params);
  }
  _stmt() {
    return this.db.prepare(this.sql);
  }
  async run() {
    const info = this._stmt().run(...this.params);
    return { success: true, results: [], meta: { changes: Number(info.changes), last_row_id: Number(info.lastInsertRowid) } };
  }
  async first(column) {
    const row = this._stmt().get(...this.params);
    if (!row) return null;
    return column ? row[column] : { ...row };
  }
  async all() {
    const rows = this._stmt().all(...this.params).map((row) => ({ ...row }));
    return { success: true, results: rows, meta: {} };
  }
  _execForBatch() {
    const stmt = this._stmt();
    if (/^\s*(select|with)\b/i.test(this.sql) || /\breturning\b/i.test(this.sql)) {
      return { success: true, results: stmt.all(...this.params).map((r) => ({ ...r })), meta: {} };
    }
    const info = stmt.run(...this.params);
    return { success: true, results: [], meta: { changes: Number(info.changes) } };
  }
}

export class FakeD1 {
  constructor() {
    this.db = new DatabaseSync(':memory:');
    for (const migration of MIGRATIONS) this.db.exec(readFileSync(migration, 'utf8'));
    this.failNext = false;
  }
  prepare(sql) {
    if (this.failNext) {
      this.failNext = false;
      throw new Error('simulated D1 failure');
    }
    return new Statement(this.db, sql);
  }
  async batch(statements) {
    this.db.exec('BEGIN');
    try {
      const out = statements.map((s) => s._execForBatch());
      this.db.exec('COMMIT');
      return out;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
  rows(table) {
    return this.db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all().map((r) => ({ ...r }));
  }
}

const ORIGIN = 'https://askthemove.pages.dev';

// Stands in for the Pages static-asset binding: serves files from public/.
const PUBLIC_DIR = new URL('../../public/', import.meta.url);
export const fakeAssets = {
  async fetch(input) {
    const url = new URL(typeof input === 'string' ? input : input.url);
    const rel = url.pathname.replace(/^\/+/, '');
    try {
      return new Response(readFileSync(new URL(rel, PUBLIC_DIR), 'utf8'), {
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    } catch {
      return new Response('not found', { status: 404 });
    }
  },
};

export function makeEnv(overrides = {}) {
  return {
    DB: new FakeD1(),
    ASSETS: fakeAssets,
    IP_HASH_SALT: 'test-salt',
    ADMIN_TOKEN: 'test-admin-token',
    ...overrides,
  };
}

/** A request to any site path, for the manage page and the token endpoints. */
export function request(path, { method = 'GET', body, json = false, ip = '203.0.113.7', origin = ORIGIN, headers = {} } = {}) {
  const init = { method, headers: { 'cf-connecting-ip': ip, ...headers } };
  if (method !== 'GET') {
    if (origin) init.headers.origin = origin;
    if (json) {
      init.headers['content-type'] = 'application/json';
      init.headers.accept = 'application/json';
      init.body = JSON.stringify(body || {});
    } else {
      init.headers['content-type'] = 'application/x-www-form-urlencoded';
      init.headers.accept = 'text/html';
      init.body = new URLSearchParams(body || {}).toString();
    }
  }
  return new Request(`${ORIGIN}${path}`, init);
}

export function postJson(body, { ip = '203.0.113.7', origin = ORIGIN, headers = {}, raw } = {}) {
  return new Request(`${ORIGIN}/api/waitlist`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      'cf-connecting-ip': ip,
      ...(origin ? { origin } : {}),
      ...headers,
    },
    body: raw ?? JSON.stringify(body),
  });
}

export function postForm(fields, { ip = '203.0.113.7', origin = ORIGIN } = {}) {
  return new Request(`${ORIGIN}/api/waitlist`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      accept: 'text/html',
      'cf-connecting-ip': ip,
      ...(origin ? { origin } : {}),
    },
    body: new URLSearchParams(fields).toString(),
  });
}

-- AskTheMove beta waitlist.
-- Apply locally:   npm run db:migrate:local
-- Apply remotely:  npm run db:migrate:remote

CREATE TABLE IF NOT EXISTS waitlist (
  id INTEGER PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  product TEXT,
  fields TEXT,          -- JSON: optional answers, e.g. {"rating":"800-1200"}
  source TEXT,          -- which form on the site, e.g. "hero"
  utm TEXT,             -- JSON: utm_source, utm_medium, utm_campaign, referrer
  consent_at TEXT,      -- ISO timestamp when the consent box was ticked
  created_at TEXT,      -- ISO timestamp
  ip_hash TEXT          -- salted SHA-256 of the IP, never the raw IP
);

-- One row per hashed IP per one-minute bucket. Rows older than a day are deleted.
CREATE TABLE IF NOT EXISTS rate_limits (
  ip_hash TEXT NOT NULL,
  window_start INTEGER NOT NULL,  -- bucket start, milliseconds since epoch
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ip_hash, window_start)
);

CREATE INDEX IF NOT EXISTS rate_limits_window ON rate_limits (window_start);

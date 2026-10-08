import { LIMITS } from './config.js';

/**
 * Counts this submission and returns how many submissions the hashed IP has
 * made in the last 10 minutes (including this one). Counted in one-minute
 * buckets so the window rolls instead of resetting all at once.
 */
export async function countSubmission(db, ipHash, now = Date.now()) {
  const bucket = Math.floor(now / LIMITS.rateLimitBucketMs) * LIMITS.rateLimitBucketMs;
  // Count every bucket that overlaps the last 10 minutes, including the one that
  // starts just before it, so no attempt inside the window is missed.
  const since = now - LIMITS.rateLimitWindowMs - LIMITS.rateLimitBucketMs;
  const results = await db.batch([
    db
      .prepare(
        'INSERT INTO rate_limits (ip_hash, window_start, count) VALUES (?, ?, 1) ' +
          'ON CONFLICT (ip_hash, window_start) DO UPDATE SET count = count + 1',
      )
      .bind(ipHash, bucket),
    db
      .prepare(
        'SELECT COALESCE(SUM(count), 0) AS total FROM rate_limits WHERE ip_hash = ? AND window_start > ?',
      )
      .bind(ipHash, since),
    db.prepare('DELETE FROM rate_limits WHERE window_start < ?').bind(now - LIMITS.rateLimitRetentionMs),
  ]);
  const row = results[1] && results[1].results && results[1].results[0];
  return Number(row ? row.total : 0);
}

/** Seconds until every bucket counted now has left the window. */
export function retryAfterSeconds() {
  return Math.ceil((LIMITS.rateLimitWindowMs + LIMITS.rateLimitBucketMs) / 1000);
}

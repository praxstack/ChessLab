// Constants shared by the Pages Functions and the tests.

export const PRODUCT = 'askthemove';

// Product-specific optional question: "Roughly what's your rating?"
export const RATING_BANDS = Object.freeze({
  'under-800': 'Under 800',
  '800-1200': '800–1200',
  '1200-1600': '1200–1600',
  '1600-plus': '1600+',
  'not-sure': 'Not sure',
});

export const LIMITS = Object.freeze({
  emailMax: 254,
  optionalMax: 200,
  bodyMaxBytes: 16 * 1024,
  rateLimitMax: 5, // submissions per IP...
  rateLimitWindowMs: 10 * 60 * 1000, // ...per 10 minutes
  rateLimitBucketMs: 60 * 1000, // counted in one-minute buckets
  rateLimitRetentionMs: 24 * 60 * 60 * 1000,
});

// Where a plain (no-JavaScript) form post lands afterwards.
export const REDIRECTS = Object.freeze({
  joined: '/?joined=1#join',
  error: (code) => `/?error=${encodeURIComponent(code)}#join`,
});

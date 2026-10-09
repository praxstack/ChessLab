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

// The emails a person can choose. "beta" is what the sign-up consent box
// covers; the other two are opt-ins offered after joining and on the manage page.
export const LISTS = Object.freeze({
  beta: 'Beta invites and beta news',
  letter: 'The AskTheMove letter, about once a month',
  research: 'Occasional questions about how you study. Replying is always optional.',
});

// The market pulse: three multiple-choice questions and one free-text line,
// offered after joining and on the manage page. Keys are stored, labels shown.
// Bump `version` when a question or an option changes meaning.
export const PULSE = Object.freeze({
  version: 1,
  questions: Object.freeze({
    review: Object.freeze({
      label: 'How do you review your games today?',
      options: Object.freeze({
        chesscom: 'Chess.com game review',
        lichess: 'Lichess analysis',
        engine: 'An engine on my own',
        coach: 'A human coach',
        none: 'I don’t review them',
      }),
    }),
    hardest: Object.freeze({
      label: 'What’s the hardest part of improving?',
      options: Object.freeze({
        why: 'Knowing why a move was bad',
        next: 'Knowing what to study next',
        time: 'Finding the time',
        motivation: 'Staying motivated',
        openings: 'Openings',
        endgames: 'Endgames',
        other: 'Something else',
      }),
    }),
    pay: Object.freeze({
      label: 'If AskTheMove does what it says, what would you pay a month?',
      options: Object.freeze({
        free: 'Only if it’s free',
        under5: 'Under $5',
        '5to10': '$5 to $10',
        over10: 'More than $10',
        unsure: 'Not sure yet',
      }),
    }),
  }),
  freeText: Object.freeze({ key: 'wish', label: 'One thing you wish a coach would explain', max: 200 }),
});

export const LIMITS = Object.freeze({
  emailMax: 254,
  optionalMax: 200,
  bodyMaxBytes: 16 * 1024,
  rateLimitMax: 5, // submissions per IP...
  rateLimitWindowMs: 10 * 60 * 1000, // ...per 10 minutes
  rateLimitBucketMs: 60 * 1000, // counted in one-minute buckets
  rateLimitRetentionMs: 24 * 60 * 60 * 1000,
  manageRateLimitMax: 30, // manage-link requests per IP per 10 minutes
  statsRowCap: 5000, // the stats endpoint reads at most this many rows
});

// Where a plain (no-JavaScript) form post lands afterwards. The fragment targets
// a result note the page shows with CSS alone; the query is for app.js.
export const REDIRECTS = Object.freeze({
  joined: '/?joined=1#joined',
  error: (code) => `/?error=${encodeURIComponent(code)}#join-error`,
  manage: (token, note) => `${managePath(token)}${note ? `&${note}=1` : ''}#manage`,
  manageInvalid: '/manage/?invalid=1#manage',
  deleted: '/manage/?deleted=1#manage',
});

/** The path of a person's private manage link. The full URL adds the site origin. */
export function managePath(token) {
  return `/manage/?t=${encodeURIComponent(token)}`;
}

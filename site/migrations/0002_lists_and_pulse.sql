-- Subscriptions, the private manage link, the pulse code, and the market-pulse answers.
-- Apply locally:   npm run db:migrate:local
-- Apply remotely:  npm run db:migrate:remote

-- Which emails a person has chosen, as JSON with an ISO timestamp per list or
-- null when off: {"beta": "...", "letter": null, "research": null}.
ALTER TABLE waitlist ADD COLUMN lists TEXT;
ALTER TABLE waitlist ADD COLUMN lists_updated_at TEXT;

-- The private code in a person's manage link. 128 random bits, hex. It only
-- ever travels in email and in the admin export, never in a page response.
ALTER TABLE waitlist ADD COLUMN manage_token TEXT;

-- The code a sign-up returns to the page so it can submit the market pulse.
-- It can do nothing else, and it is cleared when a person leaves every list.
ALTER TABLE waitlist ADD COLUMN pulse_token TEXT;

-- Optional market-pulse answers, as JSON: {"v": 1, "review": "...", "hardest": "...", "pay": "...", "wish": "...", "at": "..."}.
ALTER TABLE waitlist ADD COLUMN answers TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS waitlist_manage_token ON waitlist (manage_token);
CREATE UNIQUE INDEX IF NOT EXISTS waitlist_pulse_token ON waitlist (pulse_token);

-- Everyone already on the list consented to beta email, so they start on that
-- list, and each gets a manage link code so the first email can carry it.
UPDATE waitlist
   SET lists = json_object('beta', consent_at, 'letter', NULL, 'research', NULL),
       lists_updated_at = consent_at
 WHERE lists IS NULL;
UPDATE waitlist SET manage_token = lower(hex(randomblob(16))) WHERE manage_token IS NULL;

-- Sign-ups per day, as an anonymous tally of its own. It is never cleared when
-- a person leaves every list or deletes their row, so the chart stays true.
CREATE TABLE IF NOT EXISTS signup_days (
  day TEXT PRIMARY KEY,           -- YYYY-MM-DD, UTC
  count INTEGER NOT NULL DEFAULT 0
);
INSERT INTO signup_days (day, count)
  SELECT substr(created_at, 1, 10), count(*) FROM waitlist WHERE created_at IS NOT NULL GROUP BY 1
  ON CONFLICT (day) DO UPDATE SET count = excluded.count;

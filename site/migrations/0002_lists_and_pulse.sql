-- Subscriptions, the private manage link, and the market-pulse answers.
-- Apply locally:   npm run db:migrate:local
-- Apply remotely:  npm run db:migrate:remote

-- Which emails a person has chosen, as JSON with an ISO timestamp per list or
-- null when off: {"beta": "...", "letter": null, "research": null}.
ALTER TABLE waitlist ADD COLUMN lists TEXT;
ALTER TABLE waitlist ADD COLUMN lists_updated_at TEXT;

-- The private code in a person's manage link. 128 random bits, hex.
ALTER TABLE waitlist ADD COLUMN manage_token TEXT;

-- Optional market-pulse answers, as JSON: {"v": 1, "review": "...", "hardest": "...", "pay": "...", "wish": "...", "at": "..."}.
ALTER TABLE waitlist ADD COLUMN answers TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS waitlist_manage_token ON waitlist (manage_token);

-- Everyone already on the list consented to beta email, so they start on that
-- list, and each gets a manage link code so the first email can carry it.
UPDATE waitlist
   SET lists = json_object('beta', consent_at, 'letter', NULL, 'research', NULL),
       lists_updated_at = consent_at
 WHERE lists IS NULL;
UPDATE waitlist SET manage_token = lower(hex(randomblob(16))) WHERE manage_token IS NULL;

-- Explanations used per invite code (budget = SHA-256 of the code) per UTC day.
CREATE TABLE IF NOT EXISTS coach_daily (
  budget TEXT NOT NULL,
  day TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (budget, day)
);

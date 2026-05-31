-- Migration v3: Add per-type registration limits
ALTER TABLE tournaments ADD COLUMN competitor_limit INTEGER;
ALTER TABLE tournaments ADD COLUMN attendee_limit INTEGER;

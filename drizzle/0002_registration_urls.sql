-- Migration v2: Add registration URL columns
ALTER TABLE tournaments ADD COLUMN competitor_url TEXT;
ALTER TABLE tournaments ADD COLUMN attendee_url TEXT;

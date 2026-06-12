-- Recreate registrations table without the CHECK constraint on type
CREATE TABLE registrations_new (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL REFERENCES tournaments(id),
  type TEXT NOT NULL,
  email TEXT NOT NULL,
  data_json TEXT NOT NULL,
  qr_code_token TEXT NOT NULL UNIQUE,
  checked_in INTEGER DEFAULT 0,
  checked_in_at INTEGER,
  checked_in_by TEXT,
  submitted_at INTEGER NOT NULL
);

INSERT INTO registrations_new SELECT id, tournament_id, type, email, data_json, qr_code_token, checked_in, checked_in_at, checked_in_by, submitted_at FROM registrations;

DROP TABLE registrations;

ALTER TABLE registrations_new RENAME TO registrations;

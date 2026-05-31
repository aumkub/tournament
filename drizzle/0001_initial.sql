-- Migration v1: Create tournaments and registrations tables
CREATE TABLE IF NOT EXISTS tournaments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  photo_url TEXT,
  registration_limit INTEGER,
  registration_open_at INTEGER NOT NULL,
  registration_close_at INTEGER NOT NULL,
  checkin_open_at INTEGER NOT NULL,
  checkin_close_at INTEGER NOT NULL,
  email_template_html TEXT,
  passwords_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS registrations (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL REFERENCES tournaments(id),
  type TEXT NOT NULL CHECK(type IN ('competitor', 'attendee')),
  email TEXT NOT NULL,
  data_json TEXT NOT NULL,
  qr_code_token TEXT NOT NULL UNIQUE,
  checked_in INTEGER DEFAULT 0,
  checked_in_at INTEGER,
  checked_in_by TEXT,
  submitted_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_registrations_tournament_id ON registrations(tournament_id);
CREATE INDEX IF NOT EXISTS idx_registrations_email ON registrations(email);
CREATE INDEX IF NOT EXISTS idx_registrations_checked_in ON registrations(checked_in);
CREATE INDEX IF NOT EXISTS idx_registrations_qr_token ON registrations(qr_code_token);

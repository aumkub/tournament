-- Add form_urls_json to tournaments for configuring dynamic form URL slugs
-- format: { "spectator": "watch", "youth_general": "youth", "youth_beat_pro": "youth-beat-pro" }
ALTER TABLE tournaments ADD COLUMN form_urls_json TEXT NOT NULL DEFAULT '{}';

-- Add default_form_id for tournament homepage default registration type
ALTER TABLE tournaments ADD COLUMN default_form_id TEXT;

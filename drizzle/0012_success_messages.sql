-- Per-type custom success messages shown on success page and in confirmation email
ALTER TABLE tournaments ADD COLUMN success_messages_json TEXT;

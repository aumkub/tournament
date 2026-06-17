-- Soft delete support for tournaments
ALTER TABLE tournaments ADD COLUMN deleted_at INTEGER;

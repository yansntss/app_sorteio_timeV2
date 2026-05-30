-- Adds expires_at to sessions for voting TTL (24h from creation)
ALTER TABLE sessions ADD COLUMN expires_at INTEGER;

-- Migration 001: Google OAuth + user accounts + player profiles
-- Run against existing D1 database with: wrangler d1 execute racha --file=migrations/001_auth.sql --remote

ALTER TABLE sessions ADD COLUMN owner_id TEXT;
ALTER TABLE sessions ADD COLUMN rating_applied_at INTEGER;

-- Create vote_submissions if it doesn't exist, then add user_id column
CREATE TABLE IF NOT EXISTS vote_submissions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id  TEXT NOT NULL,
  voter_token TEXT,
  created_at  INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);
ALTER TABLE vote_submissions ADD COLUMN user_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_vote_sub_user ON vote_submissions(session_id, user_id) WHERE user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,
  google_id  TEXT NOT NULL UNIQUE,
  email      TEXT NOT NULL,
  name       TEXT NOT NULL,
  picture    TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id   TEXT PRIMARY KEY,
  num_teams INTEGER NOT NULL DEFAULT 2,
  pp_team   INTEGER NOT NULL DEFAULT 5,
  sort_mode TEXT NOT NULL DEFAULT 'random',
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS player_profiles (
  id         TEXT PRIMARY KEY,
  owner_id   TEXT NOT NULL,
  name       TEXT NOT NULL,
  avg_rating REAL NOT NULL DEFAULT 3.0,
  vote_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(owner_id, name),
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_player_profiles_owner ON player_profiles(owner_id);

CREATE TABLE IF NOT EXISTS sorteio_history (
  id         TEXT PRIMARY KEY,
  owner_id   TEXT NOT NULL,
  mode       TEXT NOT NULL,
  config     TEXT NOT NULL,
  teams      TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_sorteio_history_owner ON sorteio_history(owner_id);

ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS games (
  id          TEXT PRIMARY KEY,
  owner_id    TEXT NOT NULL,
  title       TEXT NOT NULL,
  game_date   TEXT NOT NULL,
  game_time   TEXT NOT NULL DEFAULT '21:00',
  location    TEXT,
  max_players INTEGER NOT NULL DEFAULT 24,
  status      TEXT NOT NULL DEFAULT 'open',
  created_at  INTEGER NOT NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS game_confirmations (
  id           TEXT PRIMARY KEY,
  game_id      TEXT NOT NULL,
  user_id      TEXT,
  guest_name   TEXT,
  confirmed_at INTEGER NOT NULL,
  added_by     TEXT,
  FOREIGN KEY (game_id) REFERENCES games(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_game_confirm_user
  ON game_confirmations(game_id, user_id) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_game_confirm_game ON game_confirmations(game_id);

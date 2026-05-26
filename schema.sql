CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,
  created_at  INTEGER NOT NULL,
  players     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS votes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id  TEXT NOT NULL,
  player_id   TEXT NOT NULL,
  score       INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
  created_at  INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE INDEX IF NOT EXISTS idx_votes_session ON votes(session_id);
CREATE INDEX IF NOT EXISTS idx_votes_session_player ON votes(session_id, player_id);

CREATE TABLE IF NOT EXISTS vote_submissions (
  session_id   TEXT    NOT NULL,
  voter_token  TEXT    NOT NULL,
  created_at   INTEGER NOT NULL,
  PRIMARY KEY (session_id, voter_token),
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

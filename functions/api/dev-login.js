import { signJWT } from "../_utils.js";

// GET /api/dev-login — local dev only, requires DEV_LOGIN=true in .dev.vars
export async function onRequestGet({ env }) {
  if (!env.DEV_LOGIN) {
    return new Response("Not found", { status: 404 });
  }

  await bootstrapDevDB(env);

  const payload = {
    sub:      "dev-admin-001",
    email:    "yan@altovalorfc.dev",
    name:     "Yan Santos",
    picture:  null,
    is_admin: 1,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400 * 30,
  };

  const token = await signJWT(payload, env.JWT_SECRET);

  return new Response(null, {
    status: 302,
    headers: {
      Location:     "/",
      "Set-Cookie": `avfc_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000`,
    },
  });
}

async function bootstrapDevDB(env) {
  const stmts = [
    `CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY, created_at INTEGER NOT NULL, players TEXT NOT NULL,
      owner_id TEXT, rating_applied_at INTEGER, expires_at INTEGER
    )`,
    `CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL,
      player_id TEXT NOT NULL, score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
      created_at INTEGER NOT NULL, FOREIGN KEY (session_id) REFERENCES sessions(id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_votes_session ON votes(session_id)`,
    `CREATE TABLE IF NOT EXISTS vote_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL,
      voter_token TEXT, user_id TEXT, created_at INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_vote_sub_user
      ON vote_submissions(session_id, user_id) WHERE user_id IS NOT NULL`,
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, google_id TEXT NOT NULL UNIQUE, email TEXT NOT NULL,
      name TEXT NOT NULL, picture TEXT, is_admin INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY, num_teams INTEGER NOT NULL DEFAULT 2,
      pp_team INTEGER NOT NULL DEFAULT 5, sort_mode TEXT NOT NULL DEFAULT 'random',
      updated_at INTEGER NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS player_profiles (
      id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, name TEXT NOT NULL,
      avg_rating REAL NOT NULL DEFAULT 3.0, vote_count INTEGER NOT NULL DEFAULT 0,
      total_goals INTEGER NOT NULL DEFAULT 0, total_assists INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
      UNIQUE(owner_id, name), FOREIGN KEY (owner_id) REFERENCES users(id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_player_profiles_owner ON player_profiles(owner_id)`,
    `CREATE TABLE IF NOT EXISTS sorteio_history (
      id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, mode TEXT NOT NULL,
      config TEXT NOT NULL, teams TEXT NOT NULL, created_at INTEGER NOT NULL,
      FOREIGN KEY (owner_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, title TEXT NOT NULL,
      game_date TEXT NOT NULL, game_time TEXT NOT NULL DEFAULT '21:00',
      location TEXT, max_players INTEGER NOT NULL DEFAULT 24,
      status TEXT NOT NULL DEFAULT 'open', created_at INTEGER NOT NULL,
      rating_applied_at INTEGER DEFAULT NULL,
      FOREIGN KEY (owner_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS game_confirmations (
      id TEXT PRIMARY KEY, game_id TEXT NOT NULL, user_id TEXT, guest_name TEXT,
      confirmed_at INTEGER NOT NULL, added_by TEXT, stars INTEGER DEFAULT NULL,
      goals INTEGER DEFAULT NULL, assists INTEGER DEFAULT NULL,
      FOREIGN KEY (game_id) REFERENCES games(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_game_confirm_user
      ON game_confirmations(game_id, user_id) WHERE user_id IS NOT NULL`,
    `CREATE INDEX IF NOT EXISTS idx_game_confirm_game ON game_confirmations(game_id)`,
  ];

  await env.DB.batch(stmts.map(sql => env.DB.prepare(sql)));

  await env.DB.prepare(`
    INSERT OR IGNORE INTO users (id, google_id, email, name, picture, is_admin, created_at)
    VALUES ('dev-admin-001', 'dev-google-001', 'yan@altovalorfc.dev', 'Yan Santos', NULL, 1, ?)
  `).bind(Date.now()).run();
}

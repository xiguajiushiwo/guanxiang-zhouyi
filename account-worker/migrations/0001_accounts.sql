CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  preferred_language TEXT NOT NULL DEFAULT 'zh-CN',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE readings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payload_json TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'zh-CN',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX readings_user_updated ON readings(user_id, updated_at DESC);
CREATE INDEX sessions_expiry ON sessions(expires_at);

-- 0001_init.sql — initial schema for klaude-comments-db

CREATE TABLE IF NOT EXISTS comments (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  post_slug       TEXT    NOT NULL,
  author_name     TEXT    NOT NULL,
  body            TEXT    NOT NULL,
  status          TEXT    NOT NULL DEFAULT 'hold' CHECK (status IN ('hold','approved','rejected')),
  ai_flag_phi     INTEGER NOT NULL DEFAULT 0,
  ai_flag_reason  TEXT,
  ip_hash         TEXT,
  created_at      INTEGER NOT NULL,
  moderated_at    INTEGER,
  delete_token    TEXT
);

CREATE INDEX IF NOT EXISTS idx_comments_slug_status_created
  ON comments(post_slug, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comments_status_created
  ON comments(status, created_at DESC);

CREATE TABLE IF NOT EXISTS admin_session (
  token       TEXT PRIMARY KEY,
  email       TEXT    NOT NULL,
  expires_at  INTEGER NOT NULL,
  created_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_session_expires
  ON admin_session(expires_at);

CREATE TABLE IF NOT EXISTS magic_link (
  token       TEXT PRIMARY KEY,
  email       TEXT    NOT NULL,
  expires_at  INTEGER NOT NULL,
  used_at     INTEGER,
  created_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_magic_link_email_expires
  ON magic_link(email, expires_at);

/**
 * Magic-link issue + verify.
 *
 * Token = random 32 bytes hex. Stored in `magic_link` table with
 * email + expires_at. Single-use (used_at populated on verify).
 *
 * Session token = random 32 bytes hex; stored in `admin_session`
 * with email + expires_at; cookie-bound HttpOnly + SameSite=Lax.
 */
import type { Env } from '../types';

export function randomToken(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function issueMagicLink(
  env: Env,
  email: string,
): Promise<{ token: string; expiresAt: number }> {
  const token = randomToken(32);
  const ttlMs = parseInt(env.MAGIC_LINK_TTL_MIN, 10) * 60 * 1000;
  const now = Date.now();
  const expiresAt = now + ttlMs;

  await env.DB.prepare(
    `INSERT INTO magic_link (token, email, expires_at, created_at)
     VALUES (?1, ?2, ?3, ?4)`,
  )
    .bind(token, email.toLowerCase(), expiresAt, now)
    .run();

  return { token, expiresAt };
}

export async function consumeMagicLink(
  env: Env,
  token: string,
): Promise<{ email: string } | null> {
  const row = await env.DB.prepare(
    `SELECT email, expires_at, used_at FROM magic_link WHERE token = ?1`,
  )
    .bind(token)
    .first<{ email: string; expires_at: number; used_at: number | null }>();

  if (!row) return null;
  if (row.used_at !== null) return null;
  if (row.expires_at < Date.now()) return null;

  // Mark used (best-effort; if this races, both attempts return same email
  // → still single user, acceptable for v2)
  await env.DB.prepare(
    `UPDATE magic_link SET used_at = ?1 WHERE token = ?2 AND used_at IS NULL`,
  )
    .bind(Date.now(), token)
    .run();

  return { email: row.email };
}

export async function createSession(
  env: Env,
  email: string,
): Promise<{ token: string; expiresAt: number }> {
  const token = randomToken(32);
  const ttlDays = parseInt(env.SESSION_TTL_DAYS, 10);
  const ttlMs = ttlDays * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const expiresAt = now + ttlMs;

  await env.DB.prepare(
    `INSERT INTO admin_session (token, email, expires_at, created_at)
     VALUES (?1, ?2, ?3, ?4)`,
  )
    .bind(token, email.toLowerCase(), expiresAt, now)
    .run();

  return { token, expiresAt };
}

export async function destroySession(env: Env, token: string): Promise<void> {
  await env.DB.prepare(`DELETE FROM admin_session WHERE token = ?1`)
    .bind(token)
    .run();
}

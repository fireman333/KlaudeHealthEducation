/**
 * Admin session middleware.
 *
 * Reads `klaude_admin_session` cookie, looks up token in `admin_session`
 * table. If valid + not expired, sets `c.var.adminEmail`. Otherwise
 * returns 401 (for /api/*) or redirects to /admin/login (for HTML).
 */
import type { Context, MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import type { Env, SessionRow } from '../types';

export const SESSION_COOKIE = 'klaude_admin_session';

interface AuthVars {
  adminEmail: string;
}

type AuthContext = Context<{ Bindings: Env; Variables: AuthVars }>;

export const requireAdmin: MiddlewareHandler<{
  Bindings: Env;
  Variables: AuthVars;
}> = async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) return unauthorized(c);

  const row = await c.env.DB.prepare(
    `SELECT token, email, expires_at, created_at FROM admin_session WHERE token = ?1`,
  )
    .bind(token)
    .first<SessionRow>();

  if (!row) return unauthorized(c);
  if (row.expires_at < Date.now()) {
    await c.env.DB.prepare(`DELETE FROM admin_session WHERE token = ?1`)
      .bind(token)
      .run();
    return unauthorized(c);
  }

  c.set('adminEmail', row.email);
  await next();
};

function unauthorized(c: AuthContext) {
  const accept = c.req.header('accept') ?? '';
  if (accept.includes('text/html')) {
    return c.redirect('/admin/login');
  }
  return c.json({ error: 'unauthorized' }, 401);
}

export function isAdminEmail(env: Env, email: string): boolean {
  const list = env.ADMIN_EMAILS.split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

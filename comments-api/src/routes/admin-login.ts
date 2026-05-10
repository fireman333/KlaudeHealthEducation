import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';
import type { Env } from '../types';
import { isAdminEmail, SESSION_COOKIE } from '../lib/auth';
import {
  consumeMagicLink,
  createSession,
  issueMagicLink,
} from '../lib/magic-link';
import { sendMagicLinkEmail } from '../lib/mail';

export const adminLoginRoute = new Hono<{ Bindings: Env }>();

interface LoginBody {
  email?: string;
}

/**
 * POST /api/admin/login  body { email }
 * Issues a magic link if email is in ADMIN_EMAILS allowlist. Always
 * returns 200 (don't leak which emails are admin).
 */
adminLoginRoute.post('/', async (c) => {
  let payload: LoginBody;
  try {
    payload = await c.req.json<LoginBody>();
  } catch {
    return c.json({ error: 'invalid_json' }, 400);
  }

  const email = (payload.email ?? '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return c.json({ error: 'invalid_email' }, 400);
  }

  if (!isAdminEmail(c.env, email)) {
    // Don't reveal admin email allowlist
    return c.json({ ok: true });
  }

  const { token } = await issueMagicLink(c.env, email);
  const ttl = parseInt(c.env.MAGIC_LINK_TTL_MIN, 10);
  const link = `${c.env.ADMIN_BASE_URL}/api/admin/login/verify?token=${token}`;

  c.executionCtx.waitUntil(
    sendMagicLinkEmail(c.env, email, link, ttl).catch((err) =>
      console.error('Magic link email failed', err),
    ),
  );

  return c.json({ ok: true });
});

/**
 * GET /api/admin/login/verify?token=...
 * Consumes a magic link, creates a session cookie, redirects to /admin/.
 */
adminLoginRoute.get('/verify', async (c) => {
  const token = c.req.query('token') ?? '';
  if (!token) return c.text('Missing token', 400);

  const result = await consumeMagicLink(c.env, token);
  if (!result) return c.text('Invalid or expired link', 400);

  const session = await createSession(c.env, result.email);
  const ttlSeconds = parseInt(c.env.SESSION_TTL_DAYS, 10) * 24 * 60 * 60;

  setCookie(c, SESSION_COOKIE, session.token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: ttlSeconds,
  });

  return c.redirect('/admin/');
});

/**
 * POST /api/admin/login/logout
 * Clears the session cookie + deletes server-side row.
 */
adminLoginRoute.post('/logout', async (c) => {
  const cookie = c.req.header('cookie') ?? '';
  const match = cookie.match(/klaude_admin_session=([a-f0-9]+)/);
  if (match && match[1]) {
    await c.env.DB.prepare(`DELETE FROM admin_session WHERE token = ?1`)
      .bind(match[1])
      .run();
  }
  setCookie(c, SESSION_COOKIE, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: 0,
  });
  return c.json({ ok: true });
});

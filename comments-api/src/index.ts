import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import { commentsRoute } from './routes/comments';
import { adminLoginRoute } from './routes/admin-login';
import { adminCommentsRoute } from './routes/admin-comments';
import { adminExportRoute } from './routes/admin-export';
import { adminPage } from './pages/admin';
import { rotateIpHashSalt } from './lib/cron';

const app = new Hono<{ Bindings: Env }>();

// CORS — allow listed origins (GH Pages + local dev) for /api/comments.
// Admin endpoints are same-origin (served by this Worker) so no CORS needed.
app.use('/api/comments/*', async (c, next) => {
  const allowed = c.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim());
  const middleware = cors({
    origin: (origin) => (allowed.includes(origin) ? origin : null),
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
    maxAge: 86400,
  });
  return middleware(c, next);
});

// Health check
app.get('/health', (c) => c.json({ ok: true, ts: Date.now() }));

// Public comments API
app.route('/api/comments', commentsRoute);

// Admin auth + management
app.route('/api/admin/login', adminLoginRoute);
app.route('/api/admin/comments', adminCommentsRoute);
app.route('/api/admin/export', adminExportRoute);

// Admin UI page (HTML)
app.get('/admin', (c) => c.redirect('/admin/'));
app.get('/admin/', adminPage);
app.get('/admin/login', adminPage);

// Default 404
app.notFound((c) => c.json({ error: 'not_found' }, 404));

// Global error handler
app.onError((err, c) => {
  console.error('Unhandled error', err);
  return c.json({ error: 'internal_error', message: err.message }, 500);
});

// Worker entry — handles fetch + scheduled (cron) events.
export default {
  fetch: app.fetch,
  scheduled: rotateIpHashSalt,
};

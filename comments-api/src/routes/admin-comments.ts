import { Hono } from 'hono';
import type { Env, CommentRow, CommentStatus } from '../types';
import { requireAdmin } from '../lib/auth';

export const adminCommentsRoute = new Hono<{
  Bindings: Env;
  Variables: { adminEmail: string };
}>();

adminCommentsRoute.use('*', requireAdmin);

/**
 * GET /api/admin/comments?status=hold|approved|rejected (default: hold)
 * Returns full row data including AI flag.
 */
adminCommentsRoute.get('/', async (c) => {
  const status = (c.req.query('status') ?? 'hold') as CommentStatus;
  if (!['hold', 'approved', 'rejected'].includes(status)) {
    return c.json({ error: 'invalid_status' }, 400);
  }

  const rows = await c.env.DB.prepare(
    `SELECT * FROM comments WHERE status = ?1 ORDER BY created_at DESC LIMIT 200`,
  )
    .bind(status)
    .all<CommentRow>();

  return c.json({ comments: rows.results });
});

/**
 * POST /api/admin/comments/:id/moderate  body { action: 'approve' | 'reject' }
 */
adminCommentsRoute.post('/:id/moderate', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (!Number.isFinite(id) || id <= 0) {
    return c.json({ error: 'invalid_id' }, 400);
  }

  let payload: { action?: string };
  try {
    payload = await c.req.json();
  } catch {
    return c.json({ error: 'invalid_json' }, 400);
  }

  const action = payload.action;
  let nextStatus: CommentStatus;
  if (action === 'approve') nextStatus = 'approved';
  else if (action === 'reject') nextStatus = 'rejected';
  else return c.json({ error: 'invalid_action' }, 400);

  const result = await c.env.DB.prepare(
    `UPDATE comments
        SET status = ?1, moderated_at = ?2
      WHERE id = ?3 AND status = 'hold'`,
  )
    .bind(nextStatus, Date.now(), id)
    .run();

  if (result.meta.changes === 0) {
    return c.json({ error: 'not_found_or_already_moderated' }, 404);
  }

  return c.json({ ok: true, id, status: nextStatus });
});

/**
 * POST /api/admin/comments/:id/delete — hard delete
 */
adminCommentsRoute.post('/:id/delete', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (!Number.isFinite(id) || id <= 0) {
    return c.json({ error: 'invalid_id' }, 400);
  }
  const result = await c.env.DB.prepare(`DELETE FROM comments WHERE id = ?1`)
    .bind(id)
    .run();
  return c.json({ ok: true, deleted: result.meta.changes });
});

import { Hono } from 'hono';
import type { Env, CommentRow } from '../types';
import { requireAdmin } from '../lib/auth';

export const adminExportRoute = new Hono<{
  Bindings: Env;
  Variables: { adminEmail: string };
}>();

adminExportRoute.use('*', requireAdmin);

/**
 * GET /api/admin/export?format=json|csv
 * Dumps every comment row.
 */
adminExportRoute.get('/', async (c) => {
  const format = c.req.query('format') ?? 'json';
  const rows = await c.env.DB.prepare(
    `SELECT * FROM comments ORDER BY created_at ASC`,
  ).all<CommentRow>();

  const stamp = new Date().toISOString().slice(0, 10);

  if (format === 'csv') {
    const csv = toCsv(rows.results);
    return new Response(csv, {
      status: 200,
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="comments-${stamp}.csv"`,
      },
    });
  }

  return new Response(JSON.stringify(rows.results, null, 2), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="comments-${stamp}.json"`,
    },
  });
});

function toCsv(rows: CommentRow[]): string {
  const headers = [
    'id',
    'post_slug',
    'author_name',
    'body',
    'status',
    'ai_flag_phi',
    'ai_flag_reason',
    'ip_hash',
    'created_at',
    'moderated_at',
  ];
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push(
      [
        r.id,
        csvCell(r.post_slug),
        csvCell(r.author_name),
        csvCell(r.body),
        r.status,
        r.ai_flag_phi,
        csvCell(r.ai_flag_reason ?? ''),
        csvCell(r.ip_hash ?? ''),
        r.created_at,
        r.moderated_at ?? '',
      ].join(','),
    );
  }
  return lines.join('\n');
}

function csvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

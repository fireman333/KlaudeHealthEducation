import { Hono } from 'hono';
import type { Env, PublicComment } from '../types';
import { verifyTurnstile } from '../lib/turnstile';
import { aiFlagPhi } from '../lib/ai-flag';
import { hashIp } from '../lib/ip-hash';
import { sendNewCommentEmail } from '../lib/mail';

const POST_SLUG_RE = /^[a-z0-9-]{1,80}$/i;
const MAX_AUTHOR_LEN = 30;
const MAX_BODY_LEN = 2000;

export const commentsRoute = new Hono<{ Bindings: Env }>();

/**
 * GET /api/comments?slug=<post-slug>
 * Returns approved comments for a post, oldest first.
 */
commentsRoute.get('/', async (c) => {
  const slug = c.req.query('slug') ?? '';
  if (!POST_SLUG_RE.test(slug)) {
    return c.json({ error: 'invalid_slug' }, 400);
  }

  const stmt = c.env.DB.prepare(
    `SELECT id, author_name, body, created_at
       FROM comments
      WHERE post_slug = ?1 AND status = 'approved'
      ORDER BY created_at ASC
      LIMIT 500`,
  );
  const result = await stmt.bind(slug).all<PublicComment>();
  return c.json({ comments: result.results });
});

interface PostBody {
  post_slug?: string;
  author_name?: string;
  body?: string;
  turnstile_token?: string;
}

/**
 * POST /api/comments
 * Body: { post_slug, author_name, body, turnstile_token }
 * Creates a comment in `hold` status, runs AI PHI flag, emails admin.
 */
commentsRoute.post('/', async (c) => {
  let payload: PostBody;
  try {
    payload = await c.req.json<PostBody>();
  } catch {
    return c.json({ error: 'invalid_json' }, 400);
  }

  const slug = (payload.post_slug ?? '').trim();
  const authorName = (payload.author_name ?? '').trim();
  const body = (payload.body ?? '').trim();
  const turnstileToken = (payload.turnstile_token ?? '').trim();

  if (!POST_SLUG_RE.test(slug)) return c.json({ error: 'invalid_slug' }, 400);
  if (!authorName || authorName.length > MAX_AUTHOR_LEN)
    return c.json({ error: 'invalid_author' }, 400);
  if (!body || body.length > MAX_BODY_LEN)
    return c.json({ error: 'invalid_body' }, 400);
  if (!turnstileToken) return c.json({ error: 'missing_turnstile' }, 400);

  // Verify Turnstile
  const ip =
    c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? '';
  const ok = await verifyTurnstile(c.env.TURNSTILE_SECRET_KEY, turnstileToken, ip);
  if (!ok) return c.json({ error: 'turnstile_failed' }, 403);

  // AI PHI flag — best-effort; never blocks submission
  let aiFlagged: 0 | 1 = 0;
  let aiReason: string | null = null;
  try {
    const flag = await aiFlagPhi(c.env.AI, body);
    aiFlagged = flag.phi ? 1 : 0;
    aiReason = flag.reason;
  } catch (err) {
    console.error('AI flag error', err);
  }

  const ipHash = ip ? await hashIp(ip, c.env.IP_HASH_SALT) : null;
  const createdAt = Date.now();

  const insert = await c.env.DB.prepare(
    `INSERT INTO comments
       (post_slug, author_name, body, status, ai_flag_phi, ai_flag_reason, ip_hash, created_at)
     VALUES (?1, ?2, ?3, 'hold', ?4, ?5, ?6, ?7)`,
  )
    .bind(slug, authorName, body, aiFlagged, aiReason, ipHash, createdAt)
    .run();

  const newId = insert.meta.last_row_id;

  // Notify admin (best-effort)
  c.executionCtx.waitUntil(
    sendNewCommentEmail(c.env, {
      id: newId,
      slug,
      authorName,
      body,
      aiFlagged: !!aiFlagged,
      aiReason: aiReason ?? '',
    }).catch((err) => console.error('Email send failed', err)),
  );

  return c.json({ ok: true, id: newId, status: 'hold' });
});

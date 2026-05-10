/**
 * Worker bindings & env vars (mirrors wrangler.toml).
 *
 * Hono uses this via `Hono<{ Bindings: Env }>` so route handlers get
 * typed access to `c.env.DB`, `c.env.AI`, etc.
 */
export interface Env {
  // D1 + AI bindings
  DB: D1Database;
  AI: Ai;

  // Public vars (wrangler.toml [vars])
  ADMIN_EMAILS: string;
  ALLOWED_ORIGINS: string;
  SITE_URL: string;
  ADMIN_BASE_URL: string;
  SESSION_TTL_DAYS: string;
  MAGIC_LINK_TTL_MIN: string;

  // Secrets (wrangler secret put)
  TURNSTILE_SECRET_KEY: string;
  MAGIC_LINK_HMAC_SECRET: string;
  IP_HASH_SALT: string;
  RESEND_API_KEY: string;
}

export type CommentStatus = 'hold' | 'approved' | 'rejected';

export interface CommentRow {
  id: number;
  post_slug: string;
  author_name: string;
  body: string;
  status: CommentStatus;
  ai_flag_phi: 0 | 1;
  ai_flag_reason: string | null;
  ip_hash: string | null;
  created_at: number;
  moderated_at: number | null;
  delete_token: string | null;
}

export interface PublicComment {
  id: number;
  author_name: string;
  body: string;
  created_at: number;
}

export interface AdminCommentView extends CommentRow {
  // Same as CommentRow; type exists for clarity at the API boundary.
}

export interface SessionRow {
  token: string;
  email: string;
  expires_at: number;
  created_at: number;
}

export interface MagicLinkRow {
  token: string;
  email: string;
  expires_at: number;
  used_at: number | null;
  created_at: number;
}

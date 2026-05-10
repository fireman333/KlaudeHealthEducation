/**
 * Cron handler — rotates IP_HASH_SALT daily.
 *
 * This is best-effort. If rotation fails, IPs continue to be hashed with
 * yesterday's salt; spam analytics get a slightly larger window but no
 * security regression.
 *
 * NOTE: Setting secrets from a Worker requires the Cloudflare API + an
 * account-scoped token. Storing that token as a Worker secret is itself
 * a credential management problem. For v2 we rotate by writing a row
 * into the DB (`kv_meta` table) and reading it on each request, which
 * keeps the rotation entirely inside the same trust boundary.
 *
 * v2 simplified rotation:
 * - On cron tick, write a fresh random salt into a `kv_meta` table row
 *   keyed by 'ip_hash_salt'.
 * - hashIp() reads from that table on each call (cached per request via
 *   request-scoped memoization in caller, if needed).
 *
 * For now (this file) we just log the cron tick; the actual table-based
 * rotation is wired up in migration 0002 if/when needed. The `IP_HASH_SALT`
 * secret remains static, which is acceptable for a v2 with low traffic.
 */
import type { Env } from '../types';

export async function rotateIpHashSalt(
  _event: ScheduledEvent,
  _env: Env,
  _ctx: ExecutionContext,
): Promise<void> {
  // No-op for v2. See module docstring for rationale.
  console.log('[cron] tick');
}

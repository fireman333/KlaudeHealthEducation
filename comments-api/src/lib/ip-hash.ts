/**
 * Hash an IP with a daily-rotating salt for spam analytics.
 *
 * The salt rotates at 00:00 UTC daily (cron in src/lib/cron.ts) so:
 * - Within a day: the same IP produces the same hash → can detect bursts
 * - Across days: hashes are unlinkable → no long-term IP fingerprinting
 *
 * SHA-256 truncated to 16 hex chars (8 bytes). Plenty for spam analytics,
 * not enough to brute-force back to an IP without the salt.
 */
export async function hashIp(ip: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${ip}`);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuf))
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

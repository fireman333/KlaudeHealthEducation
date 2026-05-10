/**
 * Resend — transactional email send for Cloudflare Workers.
 * https://resend.com/docs/api-reference/emails/send-email
 *
 * Two helpers:
 *   sendNewCommentEmail — admin notification when a new comment lands
 *   sendMagicLinkEmail  — admin login flow
 *
 * Both are best-effort — never throw to caller; log + return false instead.
 *
 * Free-tier constraints (no domain verification):
 *   - `from` must be at @resend.dev (we use the canonical onboarding@resend.dev)
 *   - `to` must be the verified Resend account email (i.e. ADMIN_EMAILS entries)
 *
 * Migrated from MailChannels on 2026-05-10 after MailChannels began
 * 401-rejecting unauthenticated workers.dev senders (June 2024 policy).
 */
import type { Env } from '../types';

const RESEND_FROM = '康勞德醫普 <onboarding@resend.dev>';
const RESEND_ENDPOINT = 'https://api.resend.com/emails';

interface SendOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

async function send(env: Env, opts: SendOptions): Promise<boolean> {
  const body: Record<string, unknown> = {
    from: RESEND_FROM,
    to: [opts.to],
    subject: opts.subject,
    text: opts.text,
  };
  if (opts.html) body.html = opts.html;

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('Resend send failed', res.status, text);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Resend exception', err);
    return false;
  }
}

interface NewCommentParams {
  id: number;
  slug: string;
  authorName: string;
  body: string;
  aiFlagged: boolean;
  aiReason: string;
}

export async function sendNewCommentEmail(
  env: Env,
  params: NewCommentParams,
): Promise<boolean> {
  const adminEmails = env.ADMIN_EMAILS.split(',').map((s) => s.trim()).filter(Boolean);
  if (adminEmails.length === 0) return false;

  const adminUrl = `${env.ADMIN_BASE_URL}/admin/`;
  const flagBadge = params.aiFlagged
    ? `⚠️ AI 標記：可能含 PHI（${params.aiReason || '無理由'}）\n`
    : '';

  const text = [
    `新留言待審 — 康勞德醫普`,
    ``,
    flagBadge,
    `文章：${params.slug}`,
    `作者：${params.authorName}`,
    `內文：`,
    params.body,
    ``,
    `→ 進管理介面審核：${adminUrl}`,
  ].join('\n');

  let allOk = true;
  for (const to of adminEmails) {
    const ok = await send(env, {
      to,
      subject: `[康勞德醫普] 新留言待審 #${params.id}${
        params.aiFlagged ? ' ⚠️ PHI' : ''
      }`,
      text,
    });
    if (!ok) allOk = false;
  }
  return allOk;
}

export async function sendMagicLinkEmail(
  env: Env,
  toEmail: string,
  link: string,
  ttlMinutes: number,
): Promise<boolean> {
  const text = [
    `康勞德醫普 admin 登入連結`,
    ``,
    `${ttlMinutes} 分鐘內點擊以登入：`,
    link,
    ``,
    `如果不是你本人請求登入，忽略此信即可。連結僅可使用一次。`,
  ].join('\n');

  return send(env, {
    to: toEmail,
    subject: '[康勞德醫普] 管理介面登入連結',
    text,
  });
}

/**
 * MailChannels — free email send for Cloudflare Workers.
 * https://api.mailchannels.net/tx/v1/documentation
 *
 * Two helpers:
 *   sendNewCommentEmail — admin notification when a new comment lands
 *   sendMagicLinkEmail  — admin login flow
 *
 * Both are best-effort — never throw to caller; log + return false instead.
 * For better Gmail deliverability, configure SPF / DKIM on the Worker
 * domain (out of code's hands).
 */
import type { Env } from '../types';

const FROM_EMAIL = 'no-reply@klaude-health.workers.dev';
const FROM_NAME = '康勞德醫普';

interface SendOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

async function send(env: Env, opts: SendOptions): Promise<boolean> {
  const body = {
    personalizations: [{ to: [{ email: opts.to }] }],
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject: opts.subject,
    content: [
      { type: 'text/plain', value: opts.text },
      ...(opts.html ? [{ type: 'text/html', value: opts.html }] : []),
    ],
  };

  // DKIM signing (optional) for Gmail trust.
  if (env.MAILCHANNELS_DKIM_PRIVATE_KEY) {
    Object.assign(body.personalizations[0]!, {
      dkim_domain: 'klaude-health.workers.dev',
      dkim_selector: 'mailchannels',
      dkim_private_key: env.MAILCHANNELS_DKIM_PRIVATE_KEY,
    });
  }

  try {
    const res = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('MailChannels send failed', res.status, text);
      return false;
    }
    return true;
  } catch (err) {
    console.error('MailChannels exception', err);
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

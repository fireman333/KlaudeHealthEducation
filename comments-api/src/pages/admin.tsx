/** @jsxImportSource hono/jsx */
import type { Context } from 'hono';
import type { Env } from '../types';
import { getCookie } from 'hono/cookie';
import { SESSION_COOKIE } from '../lib/auth';

/**
 * Admin UI — single-page HTML, vanilla JS, server-rendered shell.
 *
 * Flow:
 * - Not logged in → /admin/login → email form → magic link
 * - Logged in → /admin/ → list of `hold` comments + approve/reject buttons
 *               + tabs for approved / rejected + export links
 */

const STYLE = `
  :root {
    --color-bg: #fbf8f3;
    --color-surface: #ffffff;
    --color-surface-muted: #f3efe7;
    --color-text: #2a2520;
    --color-text-muted: #6b6055;
    --color-text-subtle: #94897d;
    --color-sage-50: #eef3ed;
    --color-sage-200: #c2d4bd;
    --color-sage-500: #6b8a64;
    --color-sage-700: #4a6644;
    --color-terra-100: #f7e8dc;
    --color-terra-500: #c97b4f;
    --color-terra-700: #9b5a36;
    --color-border: #e6dfd3;
    --color-border-strong: #c2b9a8;
    --font-sans: 'Noto Sans TC', 'PingFang TC', -apple-system, BlinkMacSystemFont, sans-serif;
    --font-serif: 'Noto Serif TC', 'PingFang TC', Georgia, serif;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    background: var(--color-bg);
    color: var(--color-text);
    font-family: var(--font-sans);
    font-size: 15px;
    line-height: 1.6;
  }
  header {
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    padding: 16px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  header h1 { margin: 0; font-size: 18px; font-weight: 700; }
  header .who { color: var(--color-text-muted); font-size: 13px; }
  main { max-width: 920px; margin: 0 auto; padding: 24px; }
  .tabs { display: flex; gap: 8px; margin-bottom: 24px; border-bottom: 1px solid var(--color-border); }
  .tab {
    padding: 10px 16px;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--color-text-muted);
    cursor: pointer;
    font-family: inherit;
    font-size: 14px;
    font-weight: 500;
  }
  .tab.active { color: var(--color-sage-700); border-bottom-color: var(--color-sage-500); }
  .comment {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 16px 20px;
    margin-bottom: 12px;
  }
  .comment.flagged {
    border-color: var(--color-terra-500);
    border-left-width: 3px;
    background: var(--color-terra-100);
  }
  .comment .meta {
    display: flex;
    gap: 12px;
    align-items: center;
    font-size: 13px;
    color: var(--color-text-muted);
    margin-bottom: 8px;
  }
  .comment .meta .author { font-weight: 600; color: var(--color-text); }
  .comment .body { font-family: var(--font-serif); font-size: 15px; line-height: 1.7; white-space: pre-wrap; }
  .comment .flag-warn {
    margin-top: 8px;
    padding: 8px 12px;
    background: var(--color-terra-500);
    color: #fff;
    border-radius: 4px;
    font-size: 13px;
  }
  .comment .actions { margin-top: 12px; display: flex; gap: 8px; }
  button.primary {
    padding: 8px 16px;
    background: var(--color-sage-700);
    color: #fff;
    border: none;
    border-radius: 4px;
    font-family: inherit;
    font-weight: 500;
    cursor: pointer;
  }
  button.primary:hover { background: var(--color-sage-500); }
  button.secondary {
    padding: 8px 16px;
    background: transparent;
    color: var(--color-terra-700);
    border: 1px solid var(--color-border-strong);
    border-radius: 4px;
    font-family: inherit;
    font-weight: 500;
    cursor: pointer;
  }
  button.secondary:hover { background: var(--color-terra-100); }
  button.danger {
    padding: 6px 12px;
    background: transparent;
    color: var(--color-terra-700);
    border: 1px solid var(--color-terra-500);
    border-radius: 4px;
    font-family: inherit;
    font-size: 13px;
    cursor: pointer;
  }
  .empty { text-align: center; padding: 48px 24px; color: var(--color-text-muted); }
  .login-card {
    max-width: 380px;
    margin: 80px auto;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 32px;
  }
  .login-card h1 { margin: 0 0 8px; font-size: 22px; }
  .login-card p { margin: 0 0 20px; color: var(--color-text-muted); }
  .login-card input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--color-border-strong);
    border-radius: 4px;
    font-family: inherit;
    font-size: 15px;
    margin-bottom: 12px;
  }
  .login-card button { width: 100%; }
  .login-card .msg { margin-top: 12px; padding: 10px; background: var(--color-sage-50); color: var(--color-sage-700); border-radius: 4px; font-size: 14px; }
  .actions-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 24px 0 16px;
    flex-wrap: wrap;
    gap: 12px;
  }
  .actions-bar a { color: var(--color-sage-700); text-decoration: none; font-size: 13px; }
  .actions-bar a + a { margin-left: 12px; }
`;

export async function adminPage(c: Context<{ Bindings: Env }>): Promise<Response> {
  const path = new URL(c.req.url).pathname;
  const isLoginPage = path === '/admin/login';
  const sessionToken = getCookie(c, SESSION_COOKIE);
  const isLoggedIn = !!sessionToken && (await sessionExists(c.env, sessionToken));

  if (!isLoggedIn || isLoginPage) {
    return c.html(loginHtml());
  }
  return c.html(adminHtml());
}

async function sessionExists(env: Env, token: string): Promise<boolean> {
  const row = await env.DB.prepare(
    `SELECT 1 AS x FROM admin_session WHERE token = ?1 AND expires_at > ?2`,
  )
    .bind(token, Date.now())
    .first<{ x: number }>();
  return !!row;
}

function loginHtml(): string {
  return `<!doctype html>
<html lang="zh-Hant-TW">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Admin 登入｜康勞德醫普</title>
<style>${STYLE}</style>
</head>
<body>
<div class="login-card">
  <h1>Admin 登入</h1>
  <p>輸入 admin email，會收到一次性 magic link（10 分鐘有效）。</p>
  <form id="login-form">
    <input type="email" name="email" placeholder="you@example.com" required />
    <button type="submit" class="primary">寄出登入連結</button>
  </form>
  <div id="msg" class="msg" style="display:none;"></div>
</div>
<script>
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = e.target.email.value.trim();
  const r = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const msg = document.getElementById('msg');
  msg.style.display = 'block';
  if (r.ok) {
    msg.textContent = '若該 email 在 admin 名單，登入連結已寄出。請查信箱（含 spam）。';
  } else {
    msg.textContent = '請求失敗，請稍候再試。';
  }
});
</script>
</body>
</html>`;
}

function adminHtml(): string {
  return `<!doctype html>
<html lang="zh-Hant-TW">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>留言審核｜康勞德醫普 Admin</title>
<style>${STYLE}</style>
</head>
<body>
<header>
  <h1>留言審核</h1>
  <span class="who">康勞德醫普 Admin</span>
</header>
<main>
  <div class="tabs">
    <button class="tab active" data-status="hold">待審 <span id="count-hold"></span></button>
    <button class="tab" data-status="approved">已核可 <span id="count-approved"></span></button>
    <button class="tab" data-status="rejected">已拒絕 <span id="count-rejected"></span></button>
  </div>
  <div class="actions-bar">
    <div></div>
    <div>
      <a href="/api/admin/export?format=json" target="_blank">⬇ Export JSON</a>
      <a href="/api/admin/export?format=csv" target="_blank">⬇ Export CSV</a>
      <a href="#" id="logout">登出</a>
    </div>
  </div>
  <div id="list"></div>
</main>
<script>
let currentStatus = 'hold';

async function loadList(status) {
  currentStatus = status;
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.status === status);
  });
  const r = await fetch('/api/admin/comments?status=' + encodeURIComponent(status));
  if (r.status === 401) { location.href = '/admin/login'; return; }
  const data = await r.json();
  renderList(data.comments || []);
}

function renderList(items) {
  const list = document.getElementById('list');
  if (items.length === 0) {
    list.innerHTML = '<div class="empty">沒有 ' + statusLabel(currentStatus) + ' 留言。</div>';
    return;
  }
  list.innerHTML = items.map(renderItem).join('');
  list.querySelectorAll('button[data-action]').forEach(btn => {
    btn.addEventListener('click', () => moderate(btn.dataset.id, btn.dataset.action));
  });
}

function renderItem(c) {
  const flagged = c.ai_flag_phi === 1;
  const date = new Date(c.created_at).toLocaleString('zh-TW', { hour12: false });
  const flagWarn = flagged
    ? '<div class="flag-warn">⚠️ AI 標記：可能含 PHI — ' + escapeHtml(c.ai_flag_reason || '') + '</div>'
    : '';
  let actions = '';
  if (c.status === 'hold') {
    actions =
      '<button class="primary" data-id="' + c.id + '" data-action="approve">核可</button>' +
      '<button class="secondary" data-id="' + c.id + '" data-action="reject">拒絕</button>';
  } else {
    actions = '<button class="danger" data-id="' + c.id + '" data-action="delete">永久刪除</button>';
  }
  return (
    '<div class="comment ' + (flagged ? 'flagged' : '') + '">' +
    '<div class="meta">' +
      '<span class="author">' + escapeHtml(c.author_name) + '</span>' +
      '<span>📍 ' + escapeHtml(c.post_slug) + '</span>' +
      '<span>🕓 ' + date + '</span>' +
      '<span>#' + c.id + '</span>' +
    '</div>' +
    '<div class="body">' + escapeHtml(c.body) + '</div>' +
    flagWarn +
    '<div class="actions">' + actions + '</div>' +
    '</div>'
  );
}

async function moderate(id, action) {
  if (action === 'delete' && !confirm('永久刪除這筆留言？無法復原。')) return;

  const url = action === 'delete'
    ? '/api/admin/comments/' + id + '/delete'
    : '/api/admin/comments/' + id + '/moderate';
  const body = action === 'delete' ? '{}' : JSON.stringify({ action });
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  });
  if (!r.ok) {
    alert('操作失敗：' + r.status);
    return;
  }
  loadList(currentStatus);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function statusLabel(s) {
  return ({ hold: '待審', approved: '已核可', rejected: '已拒絕' })[s] || s;
}

document.querySelectorAll('.tab').forEach(t => {
  t.addEventListener('click', () => loadList(t.dataset.status));
});
document.getElementById('logout').addEventListener('click', async (e) => {
  e.preventDefault();
  await fetch('/api/admin/login/logout', { method: 'POST' });
  location.href = '/admin/login';
});

loadList('hold');
</script>
</body>
</html>`;
}

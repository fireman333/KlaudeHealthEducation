# `comments-api/` — 康勞德醫普 v2 留言板 backend

Cloudflare Workers + D1 + Workers AI + MailChannels + Turnstile，全部跑在 free tier。

## Stack

- **Runtime**：Cloudflare Workers（V8 isolate，非 Node）
- **Router**：[Hono](https://hono.dev)
- **DB**：[Cloudflare D1](https://developers.cloudflare.com/d1/)（SQLite-on-edge，free 5 GB / 5M reads per day）
- **AI**：[Workers AI](https://developers.cloudflare.com/workers-ai/) — `@cf/meta/llama-3.1-8b-instruct`（free 10k req/day）做 PHI 檢查
- **Email**：[MailChannels](https://api.mailchannels.net/tx/v1/documentation)（CF Workers 免費 native send）
- **Spam 防禦**：[Turnstile](https://developers.cloudflare.com/turnstile/)（免費）
- **Admin auth**：Magic link（email-only，無密碼）

## 目錄結構

```
comments-api/
├── package.json
├── wrangler.toml          # CF Workers config（含 D1 / AI bindings、cron、CORS allowlist）
├── tsconfig.json
├── .dev.vars.example      # 本機 dev secrets 範本
├── .gitignore
├── migrations/
│   └── 0001_init.sql      # D1 schema (comments / admin_session / magic_link)
└── src/
    ├── index.ts           # Hono app + cron entry
    ├── types.ts           # Env 與 row types
    ├── routes/
    │   ├── comments.ts          # 公開 GET / POST
    │   ├── admin-login.ts       # magic link issue + verify + logout
    │   ├── admin-comments.ts    # list / approve / reject / delete
    │   └── admin-export.ts      # JSON / CSV
    ├── lib/
    │   ├── auth.ts              # session middleware
    │   ├── magic-link.ts        # token issue / verify / session
    │   ├── turnstile.ts         # siteverify
    │   ├── ai-flag.ts           # Workers AI PHI flag
    │   ├── ip-hash.ts           # daily-rotating IP hash
    │   ├── mail.ts              # MailChannels send
    │   └── cron.ts              # daily salt rotation hook
    └── pages/
        └── admin.tsx            # admin UI (server-rendered HTML + vanilla JS)
```

---

## 一次性部署流程（首次設定）

從 cwd `~/coding-scratch/KlaudeHealthEducation/comments-api/` 開始。

### 0. 安裝依賴

```bash
pnpm install
```

### 1. Cloudflare 帳號 + 登入

如果你還沒有 CF 帳號，到 [dash.cloudflare.com](https://dash.cloudflare.com) 註冊（free tier）。

```bash
pnpm exec wrangler login
```

會開瀏覽器走 OAuth。完成後：

```bash
pnpm exec wrangler whoami
# 應顯示 email + account list
```

### 2. 建 D1 資料庫

```bash
pnpm exec wrangler d1 create klaude-comments-db
```

輸出會給一段：

```
[[d1_databases]]
binding = "DB"
database_name = "klaude-comments-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

把 `database_id` 抄到 `wrangler.toml` 對應 `REPLACE_AFTER_CREATE` 的位置。

### 3. 跑 migrations（remote + local）

```bash
pnpm db:migrate:remote   # 寫到 production D1
pnpm db:migrate:local    # 寫到本機 .wrangler/state/v3/d1/...（給 wrangler dev 用）
```

驗證：

```bash
pnpm db:console:remote 'SELECT name FROM sqlite_master WHERE type="table"'
# 應看到 comments / admin_session / magic_link
```

### 4. 設 secrets（共 3 個）

#### 4a. Turnstile

到 [dash.cloudflare.com/turnstile](https://dash.cloudflare.com/?to=/:account/turnstile) → Add site：
- Domain：`fireman333.github.io`、`localhost`、`127.0.0.1`
- Widget mode：**Managed**
- 抄出 **Site Key**（公開）+ **Secret Key**（密）

設 secret：

```bash
pnpm exec wrangler secret put TURNSTILE_SECRET_KEY
# 貼上 secret key（不會回顯）
```

Site Key 之後設 GitHub Actions Variable（見 step 7）。

#### 4b. Magic link HMAC secret + IP hash salt

```bash
pnpm exec wrangler secret put MAGIC_LINK_HMAC_SECRET
# 貼 `openssl rand -hex 32` 結果

pnpm exec wrangler secret put IP_HASH_SALT
# 貼 `openssl rand -hex 16` 結果
```

#### 4c. （選用）MailChannels DKIM

第一次部署可以跳過。如果 Gmail 開始把 admin email 標 spam，再回來設：見 [Cloudflare blog: sending email from workers](https://blog.cloudflare.com/sending-email-from-workers-with-mailchannels/)。

### 5. 確認 wrangler.toml `[vars]` 區段

```toml
[vars]
ADMIN_EMAILS = "tony85314@gmail.com"      # ★ 改成你的 admin email（多個用逗號分隔）
ALLOWED_ORIGINS = "https://fireman333.github.io,http://localhost:4321,http://127.0.0.1:4321"
SITE_URL = "https://fireman333.github.io/KlaudeHealthEducation"
ADMIN_BASE_URL = "https://klaude-comments.example.workers.dev"  # ★ deploy 後改成真 worker URL
SESSION_TTL_DAYS = "7"
MAGIC_LINK_TTL_MIN = "10"
```

### 6. Deploy

```bash
pnpm deploy
```

輸出會給一個 worker URL，例：

```
Published klaude-comments
  https://klaude-comments.<account-subdomain>.workers.dev
```

回頭把 `wrangler.toml` 的 `ADMIN_BASE_URL` 改成這個真 URL，再 deploy 一次：

```bash
pnpm deploy
```

### 7. 設 GitHub Actions Variables（讓 v1 frontend build 知道 API 在哪）

到 GitHub repo → Settings → Secrets and variables → Actions → **Variables** tab → New repository variable：

| Name | Value |
|---|---|
| `PUBLIC_COMMENTS_API` | `https://klaude-comments.<account-subdomain>.workers.dev` |
| `PUBLIC_TURNSTILE_SITE_KEY` | Turnstile site key（4a） |

設完之後在 main 跑一次 deploy（push 一個空 commit，或到 Actions 頁面手動 dispatch `Deploy Astro to GitHub Pages`），才會把這兩個變數 bake 進 Astro build 的 client JS。

### 8. 驗證 production

```bash
URL=https://klaude-comments.<account-subdomain>.workers.dev
SITE=https://fireman333.github.io/KlaudeHealthEducation/posts/2026-05-10-lung-adenocarcinoma-targeted-therapy/

# 1. 健康檢查
curl -s "$URL/health" | jq

# 2. 公開 GET（空陣列 = 還沒留言）
curl -s "$URL/api/comments?slug=2026-05-10-lung-adenocarcinoma-targeted-therapy" | jq

# 3. Frontend 看到 widget
curl -s "$SITE" | grep -oE 'astro-island[^>]+component-export="CommentBox"'

# 4. Admin login
# - 開 https://<URL>/admin/login
# - 輸入你的 admin email
# - 收信、點 magic link
# - 應 redirect /admin/ + 看到「待審 0」
```

### 9. End-to-end smoke test

1. 開文章頁，捲到底，看到 CommentBox
2. 留一個普通測試留言（例「測試」）→ submit → 看到「審核中」訊息
3. 收 admin email 通知 → 點 link 進 /admin/ → 待審 1
4. 按「核可」→ 重整文章頁 → 留言出現
5. 留一個含 PHI 的測試（例「我媽 67 歲肺腺癌」）→ submit
6. 前端應顯示 PHI 警告（regex hint），admin email 標 ⚠️ PHI flag

---

## 日常 ops

### 看待審留言

訪 `https://<worker>.workers.dev/admin/`，magic link 登入，按審核。

### 改 admin email 名單

改 `wrangler.toml` `ADMIN_EMAILS`，`pnpm deploy`。

### 加新 migration

```bash
# 在 migrations/ 開新檔 0002_xxx.sql
pnpm db:migrate:local
pnpm db:migrate:remote
```

**Never alter existing migrations** — 新檔遞增 number。

### Export 留言

`https://<worker>.workers.dev/api/admin/export?format=json` 或 `?format=csv`，admin login 後下載。

### 看 Worker logs

```bash
pnpm exec wrangler tail
```

### Rollback worker

```bash
pnpm exec wrangler rollback
```

---

## 成本

純 free tier。流量起來後可能會超的限制：

| 資源 | Free tier 上限 | 估流量打到上限要多少留言 |
|---|---|---|
| Worker request | 100k / 日 | 每留言 ~5 req（GET + POST + Turnstile + AI + MailChannels）→ 20k 留言 / 日才滿 |
| D1 reads | 5M / 日 | 每讀 widget 載入 1 read，20k 文章瀏覽 / 日才滿 |
| D1 storage | 5 GB | 每留言 ~1 KB → 5M 留言才滿 |
| Workers AI | 10k requests / 日 | 每留言 1 call → 10k 留言 / 日 |
| MailChannels | 無明確上限（rate limited） | 每留言 1 admin email |
| Turnstile | 無上限 | — |

實際 v2 預期 < 100 留言 / 日，距離 free tier 上限超遠。

---

## 已知限制（v2 不解決）

- Cron rotation of `IP_HASH_SALT`：v2 cron handler 是 no-op（見 `src/lib/cron.ts` 註解）。salt 靜態維持，spam 分析跨日仍可關聯同 IP。流量小可接受。
- emoji reactions / inline 段落留言：v3 才做
- 讀者「忘記我」自助：人工 ticket（admin /export → grep → /api/admin/comments/:id/delete）
- threaded reply：暫無
- multi-language：只繁中

---

## Rollback（v2 整套）

`wrangler delete` 刪 worker；前端 CommentBox 拿掉（或 `PUBLIC_COMMENTS_API` 設成空）→ 文章站完全恢復 v1 純讀狀態。

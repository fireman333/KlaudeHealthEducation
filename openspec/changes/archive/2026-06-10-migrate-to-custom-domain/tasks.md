## 1. 前置：備份與憑證

- [x] 1.1 `wrangler d1 export klaude-comments-db --remote --output=backup/klaude-comments-db-<date>.sql` 匯出 D1，確認檔案非空、含 schema + 留言/session 資料（rollback 安全網，必先於任何後端改動）— 完成：`backup/klaude-comments-db-20260610.sql`（4 表 schema + admin_session/magic_link 資料；comments 目前 0 筆）。`backup/` + `*.sql` 已加 `.gitignore`（含 PII 不可 commit）
- [x] 1.2 在 Cloudflare dashboard 建 API token（Account ＞ Cloudflare Pages ＞ Edit），存成 GitHub repo secret `CLOUDFLARE_API_TOKEN`（已確認 secret 存在）+ 本機 `~/.cf-khe-token`（scoped token，搭 `CLOUDFLARE_ACCOUNT_ID` 使用）— 使用者完成
- [x] 1.3 `curl -I https://med-study-rpg.com/klaudehealthedu/` 複驗目前確實落在根 SPA（200，無 `x-served-by`），並再查一次 zone worker routes 確認除 `/2nd/*` 外無其他會撞 `/klaudehealthedu/*` 的 route/Page Rule — 完成：確認落根 SPA、zone 僅 `/2nd/*` route、無 Page Rules

## 2. Build config 改動

- [x] 2.1 `astro.config.mjs`：`site` → `https://med-study-rpg.com`、`base` → `/klaudehealthedu`
- [x] 2.2 `package.json` `lighthouse:prep` script：`.lh-serve/` 中介目錄從 `KlaudeHealthEducation/` 改 `klaudehealthedu/`
- [x] 2.3 `lighthouserc.json`：`url` 內 base prefix `/KlaudeHealthEducation` → `/klaudehealthedu`
- [x] 2.4 本機 `pnpm build` 通過（astro check + build 無錯，33 頁），抽查 `dist/` 內 asset 連結為 `/klaudehealthedu/...`、og:url + sitemap 為 `med-study-rpg.com/klaudehealthedu/`（唯一殘留 = about 頁的 GitHub repo 連結，正當保留）
- [x] 2.5 （apply 發現的漏網）`src/config.ts` `SITE.url`/`SITE.base`（canonical/OG 的 fallback 真實來源）同步改 `https://med-study-rpg.com` / `/klaudehealthedu`；`src/layouts/BaseLayout.astro` 註解內 `/KlaudeHealthEducation` 改 `/klaudehealthedu`

## 3. Router Worker（照 /2nd pattern）

- [x] 3.1 建 `klaudehealthedu-router/`：`src/index.js`（2nd-router 翻版，`ORIGIN='https://klaudehealthedu.pages.dev'`，match `/klaudehealthedu` 與 `/klaudehealthedu/*`，回 `x-served-by: edge-router-khe`，處理含/不含尾斜線）+ `wrangler.toml`（name、main、compatibility_date、**兩條** route `med-study-rpg.com/klaudehealthedu` + `/klaudehealthedu/*` on zone `8e0fc34ffe7b3a01f3755c15dedfc0e1`）
- [x] 3.2 `wrangler deploy` 部署 Worker（在 Phase 4 Pages 上線並驗證**後**才掛 route，遵守順序鐵律）；兩條 route `med-study-rpg.com/klaudehealthedu` + `/klaudehealthedu/*` 已掛上（Version 231b46d1）

## 4. 首次 Pages 部署

- [x] 4.1 `wrangler pages project create klaudehealthedu` + `wrangler pages deploy .cf-deploy`（首次**不會**自動建 project，要先 create；scoped token 要帶 `CLOUDFLARE_ACCOUNT_ID`）🚀 **上線動作** — ⚠️ **apply 發現（D6）**：dist 必須包進 `.cf-deploy/klaudehealthedu/` 子目錄再傳（`pnpm pages:prep`），否則 `pages.dev/klaudehealthedu/` 全 404；CI deploy.yml 已加 prep step
- [x] 4.2 `curl -I https://klaudehealthedu.pages.dev/klaudehealthedu/` 確認 Pages origin 直接可服務（200）— 完成：`/klaudehealthedu/`、文章、favicon 皆 200，`<title>`=康勞德醫普
- [x] 4.3 `curl -I https://med-study-rpg.com/klaudehealthedu/` 確認經 Worker 落到 KHE（200 + `x-served-by: edge-router-khe`、title=康勞德醫普）；回歸測試 root 仍 RPG SPA、`/2nd/` 仍 `edge-router-2nd`，皆未破壞

## 5. Comments backend origin 過渡

- [x] 5.1 `comments-api/wrangler.toml`：`ALLOWED_ORIGINS` 改雙 origin（保留舊 gh.io + 加 `https://med-study-rpg.com`）；`SITE_URL` → `https://med-study-rpg.com/klaudehealthedu`
- [x] 5.2 `cd comments-api && pnpm install && pnpm exec wrangler deploy` 部署（前提：Task 1.1 備份已完成 ✓）🚀 **上線動作（動到 live 留言後端）** — 完成：D1 binding 完好、雙 origin 生效。CORS 實測：新 origin preflight 204 + ACAO 反射、舊 origin 仍允許、evil origin 被拒
- [ ] 5.3 Cloudflare Turnstile widget 設定加入新 host `med-study-rpg.com` ⚠️ **使用者手動動作（留言 captcha 要這個才會在新域名過）**
- [x] 5.4 （apply 發現）**手動 build 必須帶正式 `PUBLIC_*` env var**：本機 `pnpm build` 沒帶會 fallback `localhost:8787` + 測試 Turnstile key 並 bake 進站。已用 `PUBLIC_COMMENTS_API` + `PUBLIC_TURNSTILE_SITE_KEY`（值取自 GH repo variables）重 build + redeploy；live 站確認 bake 正式 API/key。CI deploy.yml 本來就注入這些 var、不受影響

## 6. CI 切換到 wrangler

- [x] 6.1 `.github/workflows/deploy.yml`：deploy job 從 `actions/upload-pages-artifact` + `actions/deploy-pages` 換成 `cloudflare/wrangler-action` 跑 `pages deploy dist --project-name=klaudehealthedu`，用 `CLOUDFLARE_API_TOKEN`（account id 內嵌）；build job 與 PUBLIC_* env 不變
- [ ] 6.2 確認 `quality-gates.yml` 在新 base 下能跑（push/PR 觸發後 lighthouse + size-limit 不因 base 改動 404 fail）

## 7. 新站端到端驗證

- [ ] 7.1 瀏覽器走 `med-study-rpg.com/klaudehealthedu/`：首頁載入、文章內 nav、直接貼文章 URL、F5 reload 三件套皆正常（SPA/靜態路由 + base 正確）
- [ ] 7.2 sidebar nav（desktop-sidebar capability）在新 base 下連結正確（靠 `import.meta.env.BASE_URL`，應自動跟著）
- [ ] 7.3 實測一篇文留言 POST 成功（無 CORS reject）、收到 magic-link email 且連結指向新域名

## 8. 舊 URL redirect

- [x] 8.1 產生舊站全站 redirect：`scripts/gen-ghpages-redirect.mjs` 從 dist 生 32 個 per-page redirect（200 + meta-refresh + canonical + og:url + JS `location.replace`）+ `404.html` 泛用 catch-all（strip `/KlaudeHealthEducation` → 新 base）；推成 `gh-pages` 分支（含 `.nojekyll`）；GH Pages source 由 workflow 切到 gh-pages 分支（`build_type: legacy`）並手動 trigger build
- [x] 8.2 驗證舊 URL：root + 一篇文皆 200 + canonical/refresh 指向新域名對應路徑；不存在路徑走 404.html catch-all JS 導向。（社群 unfurl 實測待 5.3 之後可順手做，非阻塞）

## 9. 收尾

- [x] 9.1 `openspec validate migrate-to-custom-domain` 通過（change is valid）
- [x] 9.2 更新 `README.md`（線上 URL、deploy 機制、發文流程、本地 dev URL、「自訂網域（未來）」段改成實際 Cloudflare subpath 部署架構）與 `openspec/project.md`（Stack Deploy 行 + Deploy & Distribution 讀者取得段）
- [x] 9.3 follow-up 已記錄：新站穩定後從 `ALLOWED_ORIGINS` 移除舊 gh.io origin（記在 `comments-api/wrangler.toml` 註解 + 本檔）；另：舊站 redirect 穩定一段時間後可考慮 sunset gh-pages 分支（非本 change 必做）

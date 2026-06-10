## Why

站點目前掛在 `https://fireman333.github.io/KlaudeHealthEducation/`，使用者想搬到自有的 Cloudflare 域名 subpath `https://med-study-rpg.com/klaudehealthedu`，與同域名下既有的 app（`/`、`/2nd`）並存，建立統一的個人品牌入口並擺脫第三方 `github.io` 子網域。`desktop-sidebar` 已上線、`quality-gates-ci` CI baseline 已在 gh.io 建立 — sidebar-before-migration 的排序前提（grill 2026-06-10）已滿足，現在是搬遷的時機。

## What Changes

- **新增 subpath 路由**：照 `med-study-rpg.com/2nd/*` 的既有 precedent，新增一個 reverse-proxy Worker `klaudehealthedu-router`（route `med-study-rpg.com/klaudehealthedu/*`）把流量轉發到獨立 Cloudflare Pages project `klaudehealthedu`。Worker route 對 path 的優先權高於根域名的 Pages custom domain，能在不動 root SPA 的前提下攔截 subpath。
- **BREAKING — 部署方式改變**：CI 從 GitHub Actions `actions/deploy-pages` 換成 `wrangler pages deploy dist --project-name=klaudehealthedu`。發布不再是純 `git push` 觸發 GH Pages，而是 push 後由 workflow 跑 wrangler 上傳到 Cloudflare Pages（需新增 `CLOUDFLARE_API_TOKEN` repo secret）。
- **BREAKING — public URL 改變**：Astro `site` → `https://med-study-rpg.com`、`base` → `/klaudehealthedu`（從 `/KlaudeHealthEducation`）。所有內部連結、sitemap、canonical、OG tag 隨之改變。
- **舊 URL 近似 301 redirect**：舊 GH Pages 站改成全站 redirect 頁（meta-refresh + `rel=canonical` + JS `location.replace`），把每條舊路徑導到新域名對應路徑（GH Pages 無法做伺服器層真 301）。
- **comments-api origin/URL 更新**：`comments-api/wrangler.toml` 的 `ALLOWED_ORIGINS` 加入新域名、`SITE_URL` 改新 URL；CORS 採「提早雙 origin」過渡以避免切換瞬間 reject。
- **D1 cutover 前備份**：搬遷前 `wrangler d1 export klaude-comments-db` 匯出一次，作為 rollback 安全網（留言 / magic-link session 資料不可丟）。
- **Turnstile 設定**：在 Cloudflare Turnstile widget 設定加入新域名為合法 host。
- **quality-gates base path 同步**：`lighthouserc.json`、`package.json` 的 `lighthouse:prep` script、`.lh-serve/` 中介路徑三處的 base prefix 從 `/KlaudeHealthEducation` 改 `/klaudehealthedu`（沿用 quality-gates apply decision D5 的三點同步清單），確保 CI gate 在新 base 下仍可跑。

## Capabilities

### New Capabilities

- `subpath-deployment`: 把 Astro 靜態站經由 Cloudflare Pages + reverse-proxy Worker 部署到共享域名的 subpath（`med-study-rpg.com/klaudehealthedu`），涵蓋 router Worker 行為、Pages 專案部署、舊 URL redirect、cutover 前 D1 備份、CORS/origin 過渡等 requirement。

### Modified Capabilities

<!-- 無。既有 desktop-sidebar / quality-gates-ci 的 spec requirement 皆 URL-agnostic（sidebar 靠 import.meta.env.BASE_URL、quality-gates 的測試 URL 在 lighthouserc.json 不在 spec），base/site 改動屬實作層，不改任何既有 requirement 語意。 -->

## Impact

- **Build config**: `astro.config.mjs`（`site` + `base`）。
- **CI/CD**: `.github/workflows/deploy.yml`（deploy job 改 wrangler）；新增 `CLOUDFLARE_API_TOKEN` secret；`.github/workflows/quality-gates.yml` 連帶（透過 lighthouserc base 改動）。
- **Quality gates**: `lighthouserc.json`、`package.json` `lighthouse:prep`、`.lh-serve/` 路徑。
- **新增檔案**: router Worker 子專案（`klaudehealthedu-router/` 的 `src/index.js` + `wrangler.toml`）；舊站 redirect 模板。
- **Comments backend**: `comments-api/wrangler.toml`（`ALLOWED_ORIGINS`、`SITE_URL`）。
- **Cloudflare infra（手動 + wrangler）**: 新 Pages project `klaudehealthedu`、Worker route on zone `8e0fc34ffe7b3a01f3755c15dedfc0e1`、Turnstile host、D1 export。
- **SEO / 分享**: sitemap、canonical、OG tag URL；舊 URL 的搜尋引擎權重透過近似 301 轉移。
- **不影響**: DESIGN.md 視覺、文章內容、留言功能邏輯本身、root `med-study-rpg` SPA 與 `/2nd` app。

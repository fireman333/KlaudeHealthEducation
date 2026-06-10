## Context

### 現狀

- 站點：Astro 5 靜態站，部署於 GitHub Pages `https://fireman333.github.io/KlaudeHealthEducation/`，CI 走 `.github/workflows/deploy.yml`（`actions/deploy-pages@v4`）。
- `astro.config.mjs`：`site: 'https://fireman333.github.io'`、`base: '/KlaudeHealthEducation'`、`trailingSlash: 'always'`。
- 留言後端：Cloudflare Worker `klaude-comments`（D1 `klaude-comments-db`，id `9bd069a4-91fb-4443-904a-71b7d9553629`），`comments-api/wrangler.toml` 的 `ALLOWED_ORIGINS` / `SITE_URL` 目前指向 gh.io。
- quality-gates：`lighthouserc.json` + `package.json` `lighthouse:prep` 在 `.lh-serve/KlaudeHealthEducation/` 中介路徑下服務（apply decision D5）。

### 目標域名 topology（Facet 5 discovery，2026-06-10 經 wrangler + Cloudflare API 查清）

`med-study-rpg.com`（zone `8e0fc34ffe7b3a01f3755c15dedfc0e1`）是 multi-app subpath host：

| 路徑 | 機制 | 後端 |
|---|---|---|
| `/*`（根） | Pages custom domain（`med-study-rpg` project active） | 「醫師國考養成 RPG」SPA，對未匹配路徑 catch-all 回 index.html 200 |
| `/2nd`、`/2nd/*` | Worker route → script `med-study-rpg-2nd-router` | reverse-proxy 到獨立 Pages project `med-study-rpg-2nd.pages.dev` |

帳號下 Pages：`med-study-rpg`、`med-study-rpg-2nd`、`blue-osce-2026`。Workers：`klaude-comments`、`med-study-rpg-2nd-router`、`study-rpg-sync-worker`。

**關鍵約束**：root `med-study-rpg.com` 已被 `med-study-rpg` Pages project 以 custom domain 整域綁定，且該 SPA 對所有路徑回 200。Cloudflare Pages custom domain 是 **hostname 級**綁定、無法只綁某個 path，所以 subpath 路由**必須**靠 Worker route（path 級、優先權高於 Pages custom domain）攔截，否則 `/klaudehealthedu` 會被根 SPA 的 catch-all 吞掉。

### 既有 blueprint：`med-study-rpg-2nd-router`

```js
var ORIGIN = "https://med-study-rpg-2nd.pages.dev";
export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname !== "/2nd" && !url.pathname.startsWith("/2nd/")) {
      return new Response("Not found", { status: 404 });
    }
    const upstream = await fetch(ORIGIN + url.pathname + url.search, request);
    const resp = new Response(upstream.body, upstream);
    resp.headers.delete("content-encoding");
    resp.headers.delete("content-length");
    resp.headers.set("x-served-by", "edge-router-2nd");
    return resp;
  }
};
```

`pathname` 原封不動轉發 → 後端 Pages app 自己用 `base='/2nd'` build，asset 路徑 `/2nd/_astro/...` 天然對齊，**不需 HTMLRewriter**。

## Goals / Non-Goals

**Goals:**

- 把 KHE 以 `https://med-study-rpg.com/klaudehealthedu` 對外服務，與 root / `/2nd` 並存、零干擾。
- 沿用已驗證的 `/2nd` pattern（獨立 Pages project + thin router Worker），降低新概念與 moving parts。
- 舊 gh.io URL 近似 301 導流，保住搜尋引擎權重與既有分享連結。
- 搬遷前備份 D1，rollback 路徑明確。

**Non-Goals:**

- 不搶 root、不動 `med-study-rpg` SPA 與 `/2nd` app。
- 不引入 staging / blue-green / cache 預熱（rollback SLO 寬鬆，一天內修好可接受）。
- 不改視覺（DESIGN.md）、文章內容、留言功能邏輯。
- 不在 Worker 內做 HTMLRewriter 改寫（base 對齊後不需要）。
- 不改字型 / React island 效能（屬 `improve-mobile-performance` follow-up）。

## Decisions

### D1: Routing — 獨立 Pages project + reverse-proxy Worker（照 /2nd pattern）

**選擇**：KHE build 出的 `dist/` 部署成新 Pages project `klaudehealthedu`（→ `klaudehealthedu.pages.dev`），新增 Worker `klaudehealthedu-router`（`ORIGIN = "https://klaudehealthedu.pages.dev"`，match `/klaudehealthedu` 與 `/klaudehealthedu/*`），掛 Worker route `med-study-rpg.com/klaudehealthedu/*`。Astro `base='/klaudehealthedu'`，asset 路徑與對外 path 對齊，免改寫。

**Alternatives considered:**

- **保留 GH Pages 當後端，Worker 反向代理到 `fireman333.github.io/KlaudeHealthEducation/`**：CI 不動，但後端 base `/KlaudeHealthEducation` 與對外 `/klaudehealthedu` 不一致 → Worker 須用 HTMLRewriter 改寫所有 asset 連結，否則 `/KlaudeHealthEducation/_astro/...` 請求會 fall through 到根 SPA 而 404。多一層脆弱度、且與 `/2nd` pattern 不一致。**否決**。
- **把 KHE 內容併進 root `med-study-rpg` Pages project**：兩個獨立 app 強耦合、互相污染 build，違反 separation。**否決**。
- **多 Pages project + Cloudflare Page Rules / 純 DNS**：Page Rules 無法做 path 級反代到不同 origin；此 zone 既有 pattern 也不是這套。**否決**。

理由：`/2nd` 已證明此 pattern 在本 zone 可行，使用者已有心智模型；asset 對齊省掉 HTMLRewriter，是淨更少 moving parts。

### D2: 部署 — CI 改 `wrangler pages deploy`（BREAKING）

**選擇**：`deploy.yml` 的 deploy job 從 `actions/upload-pages-artifact` + `actions/deploy-pages` 換成 `cloudflare/wrangler-action` 跑 `pages deploy dist --project-name=klaudehealthedu`，用新增的 `CLOUDFLARE_API_TOKEN` repo secret 認證。build job（pnpm install + `pnpm build`）不變。

**Alternatives:** Cloudflare Pages Git integration（連 GitHub repo 自動 build）— 但現有 3 個 Pages project 都是 `Git Provider: No`（direct upload），保持一致用 wrangler direct upload；且 Git integration 會把 build 移出 GH Actions、與 quality-gates workflow 脫節。**否決**。

**Token scope 注意**：目前 wrangler OAuth token 列出的 scope 未含 pages write（有 workers / d1）。CI 用的 `CLOUDFLARE_API_TOKEN` 須在 Cloudflare dashboard 另建、含 **Account → Cloudflare Pages → Edit** 權限（apply 時若 `wrangler pages deploy` 因權限失敗即為此因，見 Open Questions）。

### D3: 舊 URL 近似 301

**選擇**：搬遷穩定後，把舊 repo 的 GH Pages 輸出換成全站 redirect。每頁 emit `<meta http-equiv="refresh" content="0; url=...">` + `<link rel="canonical" href="新URL">` + `<script>location.replace(...)</script>`，path 一對一映射（`/KlaudeHealthEducation/posts/x/` → `https://med-study-rpg.com/klaudehealthedu/posts/x/`）。

**實作選項（apply 時定）**：(a) 改 `deploy.yml` build 階段 emit redirect 頁；或 (b) 關掉 gh.io 的 Actions deploy、push 一個 redirect-only 的 `gh-pages` 分支。傾向 (b)（新 CI 已轉 Cloudflare，gh.io 只剩 redirect 任務，靜態一次性產出較單純）。OG/分享圖的舊 URL 也要在 redirect 頁保留 meta，避免 Threads/FB 卡在 redirect 頁。

### D4: CORS 過渡 — 提早雙 origin

**選擇**：`ALLOWED_ORIGINS` 改成同時含舊 gh.io 與新 `med-study-rpg.com`（雙 origin 並列），先 `wrangler deploy` comments-api，再切前端域名。避免「前端已切、後端只認舊 origin」的瞬間 CORS reject。新站穩定後可再移除舊 origin（非本 change 必做，留 follow-up）。`SITE_URL`（magic-link email 內的連結 base）直接改新 URL。

### D5: quality-gates base 同步（沿用 apply decision D5）

base 改 `/klaudehealthedu` 時，三處必須同步：(1) `astro.config.mjs` site/base；(2) `package.json` `lighthouse:prep` 的 `.lh-serve/<base>/` mkdir/cp 目標；(3) `lighthouserc.json` `url` 內的 base prefix。否則 lighthouse CI 在錯 base 下服務會全 404。

### D6: Pages deploy 要把 dist 包進 `klaudehealthedu/` 子目錄（apply 實測發現）

**現象**：Astro 把檔案實體輸出在 `dist/` 根（`dist/index.html`、`dist/posts/.../index.html`），但 HTML 內連結指向 `/klaudehealthedu/*`（base prefix）。Cloudflare Pages 把上傳目錄服務在 project 根，所以 `wrangler pages deploy dist` 會讓 `klaudehealthedu.pages.dev/` 出首頁但 asset 全 404、`klaudehealthedu.pages.dev/klaudehealthedu/` 直接 404 —— router 轉發 `/klaudehealthedu/X` 接不到。

**驗證**：實測 2nd app `med-study-rpg-2nd.pages.dev/` → 404、`/2nd/` → 200，證實它也是把內容包在 `2nd/` 子目錄下部署。

**修法**：部署前把 `dist/` 包進 `.cf-deploy/klaudehealthedu/`（`pnpm pages:prep`），`wrangler pages deploy .cf-deploy`。與 D5 的 `.lh-serve` 中介同手法。CI（`deploy.yml`）加 `Prepare Pages deploy directory` step。`.cf-deploy/` 已 gitignore。

**未來改 base 時要同步的點再加一處**：`pages:prep` 的 `.cf-deploy/<base>/` 目標（連同 D5 三處共四處）。

## Risks / Trade-offs

- **Worker route 沒蓋過根 SPA catch-all** → 部署後立即用 `curl -I med-study-rpg.com/klaudehealthedu/` 驗 `x-served-by` header（router Worker 應加自訂 header 標記，如 `x-served-by: edge-router-khe`），確認流量走 Worker 不是根 SPA。
- **CLOUDFLARE_API_TOKEN 權限不足致 CI deploy 失敗** → apply 前先在 dashboard 建好含 Pages Edit 的 token、本機 `wrangler pages deploy --dry-run` 或先手動跑一次 deploy 驗證。
- **CORS 切換時序錯 → 留言區壞** → 採 D4 雙 origin 提早部署；切換後用瀏覽器實測一篇文留言 POST。
- **D1 資料遺失** → cutover 前強制 `wrangler d1 export klaude-comments-db > backup.sql`；此步未完成不得進 CORS/origin 改動。
- **舊 URL redirect 不被搜尋引擎當 301** → meta-refresh + canonical 是業界近似手段，接受其非完美；4 篇文、無 confirmed 讀者，SEO 損失可忽略。
- **base 三處漏改一處 → lighthouse CI 全 404 假性 fail** → 用 D5 清單逐項勾。
- **trailingSlash='always' 與 Worker 轉發** → 確認 router 對 `/klaudehealthedu`（無尾斜線）與 `/klaudehealthedu/`（有）都正確（2nd-router 已處理 `!== "/2nd" && !startsWith("/2nd/")`，照抄即可）。

## Migration Plan

1. **備份**：`wrangler d1 export klaude-comments-db`（安全網，先行）。
2. **準備 Cloudflare token**：dashboard 建 `CLOUDFLARE_API_TOKEN`（Pages Edit），加進 GitHub repo secrets。
3. **改 build config**：`astro.config.mjs` site/base；D5 三處 base 同步。
4. **首次部署 Pages（必須先於 route）**：本機或 CI `wrangler pages deploy dist --project-name=klaudehealthedu`（首次會自動建 project），驗 `klaudehealthedu.pages.dev` 直接可服務。
5. **掛 router Worker（Pages 上線並驗證後才做）**：deploy `klaudehealthedu-router`（src + wrangler.toml 含兩條 route）。**順序鐵律**：route 一旦掛上就把 `/klaudehealthedu` 流量導向 Pages origin；若 origin 還不存在（步驟 4 未完成），該路徑會從「目前顯示根 SPA」變成 proxy error。故 Pages 必先於 route。
6. **改 comments-api**：`ALLOWED_ORIGINS` 雙 origin + `SITE_URL` 新 URL，`wrangler deploy`；Turnstile 加新 host。
7. **改 CI**：`deploy.yml` deploy job 換 wrangler pages deploy。
8. **驗證新站**：`curl -I` 查 `x-served-by`；瀏覽器走首頁→文章→留言 POST→sidebar nav→F5 直接 URL。
9. **舊站 redirect**：gh.io 換 redirect-only 輸出。
10. **驗證 redirect**：舊 URL 各路徑導到新對應路徑。

**Rollback**：任一步壞且一天內難修 → 還原 `astro.config.mjs`、comments-api wrangler.toml，redeploy GH Pages（舊 CI），移除/停用 router Worker route。D1 用步驟 1 備份還原。SLO：一天內，無 page。

## Open Questions

- `CLOUDFLARE_API_TOKEN` 的最小權限組合是否只需 Pages Edit，或 wrangler pages deploy 還要 Account read？apply 第一步用 `--dry-run` 確認。
- 舊站 redirect 走 D3 的 (a) 改 build emit 還是 (b) redirect-only 分支？apply 時依 gh.io repo 結構定（傾向 b）。
- 新站穩定後何時移除 `ALLOWED_ORIGINS` 的舊 gh.io origin？留 follow-up，不阻塞本 change。
- `med-study-rpg.com` zone 上是否有 catch-all Page Rule / Worker route 會與 `/klaudehealthedu/*` 衝突？目前查到的 routes 只有 `/2nd/*`，apply 前再 `curl` 複驗一次。

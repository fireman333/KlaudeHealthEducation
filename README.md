# 康勞德醫普 — Klaude Health Education

繁體中文醫學科普文集，由台大醫學生 WLK 撰寫，以 Claude Code + OpenEvidence + NCCN guideline 等實證為基礎。

🌐 線上閱讀：https://fireman333.github.io/KlaudeHealthEducation/

## 技術堆疊

- **Astro 5** — static site generator with Content Collections + zod schema 驗證
- **React 18** — island framework（v2 reader interaction 用）
- **pnpm 9** — package manager
- **GitHub Actions → GitHub Pages** — push 到 `main` 自動 build + deploy

## 結構

```
.
├── astro.config.mjs            # site / base / integrations
├── package.json                # 依賴 + scripts
├── tsconfig.json
├── public/
│   ├── favicon.svg
│   ├── og-default.png          # 通用 OG 卡片
│   └── robots.txt
├── src/
│   ├── config.ts               # SITE / NAV 常數
│   ├── content/
│   │   ├── config.ts           # zod schema (Content Collections)
│   │   └── posts/              # 所有文章 (YYYY-MM-DD-slug.md)
│   ├── layouts/
│   │   ├── BaseLayout.astro    # <head> + header / footer
│   │   └── PostLayout.astro    # 單篇文章框架（含作者 byline / disclaimer / sources）
│   ├── pages/
│   │   ├── index.astro         # 首頁
│   │   ├── about.md            # 關於本站
│   │   ├── 404.astro
│   │   ├── feed.xml.js         # RSS
│   │   ├── posts/[...slug].astro
│   │   └── categories/         # 主題索引 + 主題單頁
│   ├── styles/
│   │   └── global.css          # 設計 token (DESIGN.md → CSS variables)
│   └── env.d.ts
├── .github/workflows/deploy.yml # CI/CD
├── DESIGN.md                    # 設計規範（populist health-edu, light only）
├── TEMPLATE.md                  # 新文章模板 + checklist
└── README.md
```

## 新增文章

詳見 [TEMPLATE.md](./TEMPLATE.md)。簡版：

1. 複製 TEMPLATE.md 內的 markdown 區塊
2. 存為 `src/content/posts/YYYY-MM-DD-slug.md`（檔名 date 必須與 frontmatter 一致）
3. （建議）`pnpm build` 本機驗證 zod schema 過得了
4. `git commit && git push`
5. GitHub Actions 約 2-3 分鐘 build + deploy

URL 1:1 從檔名推 — `2026-05-10-foo.md` → `/posts/2026-05-10-foo/`。

## 本地預覽

```bash
pnpm install   # 第一次安裝
pnpm dev       # http://localhost:4321/KlaudeHealthEducation/
```

熱更新：存檔後瀏覽器自動 refresh。

## 本地 build 驗證

```bash
pnpm build     # = astro check && astro build
```

跑 zod schema 驗證 + TypeScript check + 靜態頁面生成（輸出到 `dist/`）。

## 寫作風格

- 繁體中文 + 台灣用語
- 短句為主（15–25 字）
- 開場用 hook（個人場景 / 設問 / 反直覺事實），禁用「淺談 X」「初探 X」
- 至少 1 個生活化類比
- 醫學專業詞首次出現用「中文（English）」格式
- 通篇 emoji ≤ 2
- 每篇必標明資料來源（OE / NCCN / landmark trial）

完整風格規範參考 Claude Code skill `wlk-public-writing-style`（私有，未公開）。

## 自訂網域（未來）

若要綁定自訂網域：

1. 在 `public/` 放一個 `CNAME` 檔案，內容是你的網域
2. 在網域 DNS 加 CNAME 紀錄指向 `fireman333.github.io`
3. 在 GitHub repo Settings → Pages 啟用 HTTPS
4. 改 `astro.config.mjs` 的 `site` 與 `base`

## 授權

- **內容**（`src/content/posts/`、`src/pages/about.md`）：[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-Hant)
- **程式碼**（`src/layouts/`、`src/styles/`、`astro.config.mjs` 等）：MIT

## Quality gates

`main` 上線靠 GitHub Actions 兩道閘。任何 PR / push 觸碰 Astro build 都會跑 [`.github/workflows/quality-gates.yml`](.github/workflows/quality-gates.yml)：

### Gate 1 — Bundle size

工具：[`size-limit`](https://github.com/ai/size-limit)（config 在 [`.size-limit.cjs`](./.size-limit.cjs)）。

| 閾值 | 對象 | 觸發條件 |
|---|---|---|
| **5 KB gzipped** | per chunk `dist/_astro/Sidebar*.js` | 任何一個 Sidebar client island 超過即 fail |
| **55 KB gzipped** | 所有 `dist/_astro/*.js` 加總 | 整體 client JS 漂移超過即 fail |

當前 baseline ≈ 49 KB gzipped（CommentBox React island + Astro hydration runtime + Astro internal index）。55 KB 留 ~6 KB headroom 吸收 Astro patch bump。

Sidebar per-chunk rule 是 **conditional**：MVP 沒 `Sidebar*.js` 時自動 skip，未來新增 island 時自動啟用。

本機驗證：

```bash
pnpm size
```

### Gate 2 — Lighthouse

工具：[`treosh/lighthouse-ci-action@v12`](https://github.com/treosh/lighthouse-ci-action)（config 在 [`lighthouserc.json`](./lighthouserc.json)）。

對象：代表性 post URL `/posts/2026-05-11-daraxonrasib-pancreatic-cancer-ras-on/`（最新文、Pinned + Timeline 兩 section 都長）。

跑 mobile profile（slow-4G + 4× CPU throttle）3 次取 median。閾值：

| 類別 | minScore | 目前 median |
|---|---|---|
| Accessibility | 0.95 | 0.96 |
| SEO | 0.95 | 1.00 |
| Performance | **0.70** | 0.72 |

> Performance 70 是 **mobile baseline floor**，不是目標。原 desktop-sidebar Req 11 設 95 是 aspirational、從未實測；apply phase 量出來 mobile 71 主因是 LCP 7.4 s + FCP 2.9 s（中文字型載入 + React island block render）。70 確保不能再爛下去；後續 `improve-mobile-performance` change 會把 floor 往上拉。

Best Practices 不收（第三方資源誤判率高）。PWA category 不適用。

本機驗證：

```bash
pnpm lighthouse:local
```

### 調整閾值

任何閾值**不可在 PR 裡 silently 改數字**。要調整 → 開新 OpenSpec change 改 `openspec/specs/quality-gates-ci/spec.md`（或 `openspec/specs/desktop-sidebar/spec.md` 若動到 Req 11），proposal 寫清楚理由，apply 後再改 config 數字。Normative source = OpenSpec spec，不是 README 表格、不是 `.size-limit.cjs` const、不是 `lighthouserc.json` 數字。

### Branch protection（maintainer 必設）

GitHub repo Settings → Branches → `main` branch protection rule，加 required status check：

- `Quality gates / Bundle size`
- `Quality gates / Lighthouse`

設定 URL：https://github.com/fireman333/KlaudeHealthEducation/settings/branches

沒設 = 即使 quality-gates 紅燈也能 merge，等於 gate 失效。

## 重要聲明

⚠ 本站文章為衛教科普目的，**不構成個別醫療建議**。實際治療決策請與您的主治醫師討論。

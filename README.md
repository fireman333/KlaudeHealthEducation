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

## 重要聲明

⚠ 本站文章為衛教科普目的，**不構成個別醫療建議**。實際治療決策請與您的主治醫師討論。

## Why

桌機讀者目前在文章頁面無法快速跳轉其他文章或看到整站時間軸 — 4 篇文章規模還行，但走向數十篇後缺乏導覽會傷 retention。需要在 ≥1024px 加上 sidebar 提供（1）作者釘選文章、（2）時間軸索引、（3）後續 Phase 2 解鎖的熱門文章區。同時嚴守 DESIGN.md「magazine 風格 / 無 dark mode / 無動畫 / 1px hairline / 無 shadow」設計語言，不破壞行動裝置長文閱讀體驗（仍是首要 NFR）。

## What Changes

- **新增**：desktop-only sidebar（≥1024px breakpoint），三區塊垂直 stack：Pinned/Featured → Timeline →（Phase 2）Popular
- **新增**：post frontmatter `pinned: boolean` 欄位（zod schema delta），預設 `false`，hard cap 3 篇（按 `date` desc 取前 3）
- **新增**：mobile（<1024px）採 CSS-only `<details>/<summary>` push-down toggle，零 JS / 零 animation / 不 overlay；不破壞現有單欄 reading flow
- **新增**：Lighthouse A11y/SEO/Performance ≥ 95 為 CI hard acceptance gate；sidebar 相關 JS bundle ≤ 30 KB gzipped
- **新增**：Pinned 區塊 0 pin 時顯佔位「還沒釘選任何文章」（作者 curation prompt）；Popular 區塊 0 留言時整塊隱藏（讀者被動產生 → 沒就不空相）
- **明示排除（MVP）**：sidebar 內 search input（走獨立 Pagefind 整合，不放 sidebar）
- **Phase 2 unlock trigger**：≥ 15 篇文章 + ≥ 5 篇有 ≥ 3 留言才上 Popular 區塊；當前 4 篇遠未達標，MVP 不出 Popular

## Capabilities

### New Capabilities

- `desktop-sidebar`: Desktop-only sidebar 系統，包含 layout 結構（三區塊垂直 stack）、breakpoint 行為（≥1024px desktop / <1024px CSS-only details push-down）、frontmatter 欄位（`pinned`）、效能 cap（JS ≤ 30 KB gzipped / Lighthouse ≥ 95）、區塊 fallback 規則（Pinned 0 顯佔位 / Popular 0 隱藏）、Phase 2 unlock 條件

### Modified Capabilities

<!-- 無 — 目前 openspec/specs/ 是空的（fresh init），所有 requirement 都進新 capability -->

## Impact

- **Code**：
  - `src/content/config.ts` — zod schema 加 `pinned: z.boolean().default(false)`
  - `src/layouts/PostLayout.astro` — 加 sidebar 區塊 + responsive grid（≥1024px 兩欄、<1024px 單欄 + `<details>` toggle）
  - 新檔 `src/components/Sidebar.astro` — sidebar 元件（Pinned/Timeline/Popular sections）
  - `src/styles/global.css` — sidebar chrome tokens（typography sans-serif、border 1px hairline、無 shadow、無 animation 例外允許 CSS-only details）
  - DESIGN.md — 加 §sidebar chrome rules 段落（不改既有規則，只擴充）
- **Build pipeline**：
  - `pnpm build` baseline 量測現有 JS bundle，據以調整 30 KB cap 是否合理（Open Uncertainty 5）
  - CI 加 `lighthouse-ci` + bundle-size check（rollup-plugin-visualizer / source-map-explorer）
- **Data / API**：
  - Popular 區塊需 comments-api 留言數，**但 clarifications 假設 build-time 讀 static JSON 與實際 D1-backed Worker 不符** — Phase 2 上線時要重新 spec comments integration 策略（runtime island fetch / build-time API call / snapshot file，三選一）
  - MVP 不碰 comments-api（Popular Phase 2 才上），所以本 change 對 comments-api 無 impact
- **Content**：
  - 4 篇 existing posts 不動 frontmatter（zod default `false` 自動處理）
  - 未來新文章作者自行決定 `pinned: true/false`
- **不影響**：mobile 閱讀體驗（核心 NFR，硬保證）、dark mode（永遠 out of scope）、其他 design rules

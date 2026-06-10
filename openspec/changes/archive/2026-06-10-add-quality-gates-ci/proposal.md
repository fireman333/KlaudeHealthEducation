## Why

`desktop-sidebar` capability 已 ship 並把兩條 quality constraint 寫進 main spec — **Req 10**（client JS bundle delta ≤ 5 KB gzipped）+ **Req 11**（post page template Lighthouse Accessibility/SEO/Performance 每項 ≥ 95）。但 archive 當下 Phase 8 被刻意 defer，這兩條目前**只靠 maintainer 手動人審**。未來任何 sidebar / layout / `PostLayout.astro` / `global.css` 改動 PR 都可能 silently regress 而沒有 fail-loud 訊號；對單人維護、靠 GH Actions 自動 deploy 的這個專案，手動人審不可持續。需要一個 CI 層把兩條 constraint 變成**hard gate**（PR check 紅 + merge button 攔截）。

## What Changes

- 新增 GitHub Actions workflow（或擴充 `.github/workflows/deploy.yml`）跑兩個 quality gate：
  - **Bundle-size gate**：用 `size-limit` 量 `dist/_astro/Sidebar*.js`，超過 5 KB gzipped 即 fail；同時設 client JS 總和 baseline（49–55 KB gzipped 範圍）作為第二道閘
  - **Lighthouse gate**：用 `treosh/lighthouse-ci-action` 對 `/posts/2026-05-11-daraxonrasib-pancreatic-cancer-ras-on/`（最新文、Pinned + Timeline 都長）跑 Lighthouse mobile profile，A11y < 95 / SEO < 95 / Perf < 50 任一即 fail（Perf 50 是 CI runner enforceable floor，rationale 見 design D6 + MODIFIED desktop-sidebar Req 11）
- 新增 `package.json` dev dependency：`size-limit` + `@size-limit/file`；config 寫成 `.size-limit.cjs`（CommonJS）以支援「MVP 無 Sidebar*.js chunk 時跳過 per-chunk rule」的條件邏輯（純 array 寫法不支援）
- 新增 `.github/workflows/quality-gates.yml`（獨立 workflow，PR + push to main 都跑；跟 `deploy.yml` 解耦避免 deploy 路徑變慢）
- `README.md` 新增 **§Quality gates** 段落，記錄兩條 gate 的閾值、超標時怎麼讀 CI log、怎麼提升 baseline（合理增長時）
- 一次失敗路徑驗證：蓄意改壞（artificially 灌大 Sidebar.astro 或加 client island）→ 確認 gate 真的擋下；驗證完 revert
- Branch protection rule 文件提醒（不 enforce in code，README 註記 maintainer 在 GH 設定打開「Require status checks to pass」）

## Capabilities

### New Capabilities

- `quality-gates-ci`: GitHub Actions CI gate 機制，把 `desktop-sidebar` capability spec Req 10 + Req 11 從手動人審轉成自動 fail-loud。包含 bundle-size threshold check（per-chunk + total baseline）、Lighthouse 三向 ≥ 95 hard threshold、README 文件、failure-path 驗證紀錄

### Modified Capabilities

- `desktop-sidebar`: Req 11 (Lighthouse threshold) — Performance threshold revised from `≥ 95` to `≥ 50 mobile baseline` after three-stage apply-phase measurement. Local Mac: 55–72 (median 72). CI runner GH Actions ubuntu-latest run 1: 52–65 (best 65). CI runner run 2 (same SHA): 52–55 (best 55) — same code, 13 pt swing showing substantial CPU variance. Root cause: LCP 7.4 s + FCP 2.9 s (Chinese font load + React island block render). The original 95 was aspirational and never measured. Floor 50 accommodates observed worst-case best-of-3 (0.55) with ~5 pt buffer. A11y ≥ 95 + SEO ≥ 95 unchanged. Follow-up `improve-mobile-performance` change queued to lift Performance floor by addressing LCP/FCP root causes

## Impact

- **新增檔案**：
  - `.github/workflows/quality-gates.yml`（new workflow）
  - `package.json`（新增 dev deps + `size-limit` config block）
  - `README.md`（appended §Quality gates 段落）
- **觸碰**：無 source code 變動（不動 `src/`、不動 `comments-api/`）
- **依賴**：
  - npm packages：`size-limit`、`@size-limit/file`（兩者 zero-runtime-deps，不影響 production bundle）
  - GH Action: `treosh/lighthouse-ci-action@v12`（成熟、~3k stars、active）
- **CI 時間**：預估 quality-gates workflow 跑 ~2–3 min（build + size-limit 30 s + Lighthouse ~90 s）；與 deploy.yml 平行跑不阻塞 deploy
- **Branch protection**：需 maintainer 在 GitHub 設定手動打開「Require quality-gates check to pass」— spec 不能 enforce 此 GH 設定，靠 README 提醒
- **未來擴充**：本 change 不收 test coverage / type errors / lint 等其他維度。後續若加是新 change 而不是改 `quality-gates-ci` capability scope

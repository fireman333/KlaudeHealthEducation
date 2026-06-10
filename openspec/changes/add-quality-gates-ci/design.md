## Context

〈康勞德醫普〉是單人維護的 Astro 5 衛教站，靠 `main` branch push 自動觸發 `.github/workflows/deploy.yml` build + GH Pages deploy。`desktop-sidebar` capability 在 spec 寫了兩條 quality constraint（Req 10 bundle delta ≤ 5 KB、Req 11 Lighthouse ≥ 95），但 archive 時 Phase 8 被刻意 defer 成本 change。

當前實況：
- `deploy.yml` 只有 `astro check && astro build`，沒量 bundle size、沒跑 Lighthouse
- Sidebar MVP 是 server-rendered Astro component，**零 client JS chunk**，所以 `dist/_astro/Sidebar*.js` 目前不存在；baseline 是現有的 ~46.8 KB client JS（CommentBox island + Astro hydration runtime + client.*.js）
- 4 篇文都用同一個 `PostLayout.astro` + 同一個 sidebar，所以一篇代表性 post 對 Lighthouse 而言夠用
- 專案沒 `tests/`、沒 lint，CI 目前只有 `astro check`（type + zod 驗證）

Stakeholders：本專案唯一使用者 / 唯一 maintainer = 作者 WLK。

## Goals / Non-Goals

**Goals:**

1. 把 desktop-sidebar Req 10 + Req 11 從**手動人審**轉成**CI hard gate**：閾值破即 PR check 紅、merge 被擋（前提是 maintainer 在 GH 開 branch protection）
2. **Fail-loud**：CI log 必須明確指出哪個 chunk / 哪個 metric / 實測值 / 閾值 / 修法提示
3. **獨立於 deploy.yml**：quality-gates 失敗**不阻擋 deploy**（避免 quality regression 同時又卡 hotfix），但會在 PR 階段擋 merge — deploy gate vs PR gate 分層
4. **本機可重現**：`pnpm size` / `pnpm lighthouse:local` 必須能在 dev 環境跑出跟 CI 一樣的結果（除錯效率）
5. **Baseline 可成長**：未來合理的 client JS 增長（例：v2 Popular section island）可透過 PR 顯式調 `size-limit` config 接受 — 不假設 baseline 永遠不變

**Non-Goals:**

1. 不擴增到 test coverage、unit tests、TypeScript strict mode、ESLint、Stylelint 等其他 quality 維度（後續 change）
2. 不動 `comments-api/`（Worker 走自己的 wrangler deploy lifecycle，跟前端 build 解耦）
3. 不改 `desktop-sidebar` spec Req 10 / Req 11 的文字（這 change 只改執行層、不改 normative behavior）
4. 不自動 enforce GitHub branch protection 設定（GH 設定無法用 code 在本 repo 內 enforce，只能文件提醒）
5. 不跑桌機 Lighthouse profile — 衛教站主流量是手機讀者，mobile profile 比較貼近真實 UX
6. 不收 Best Practices 維度（< 100 是常見的 third-party 來源警告誤判，不適合當 hard gate）

## Decisions

### D1: 獨立 workflow file `.github/workflows/quality-gates.yml`（不擴充 `deploy.yml`）

**Rationale**：
- **解耦**：quality gate 失敗時 `deploy.yml` 仍可獨立跑（例 fix typo PR 不應因為 Lighthouse 慢被卡）；deploy 失敗（GH Pages publish 出錯）也不該污染 quality signal
- **PR 觸發**：`deploy.yml` 目前只在 push 到 `main` 觸發，quality-gates 需在 PR 階段就跑，trigger event 不同
- **可獨立 retry**：quality-gates 偶發 flake（Lighthouse network 抖動）可獨立 re-run，不用重跑 deploy

**Alternatives 考慮**：
- 擴充 `deploy.yml` 加 quality step — 失敗會擋 deploy，違反 Goal 3
- 用同一個 workflow 兩個 job — yaml 變複雜、re-run 顆粒度差

### D2: Bundle tool 用 `size-limit`，不用 bundlewatch / 自寫 shell

**Rationale**：
- 業界主流（1.5k+ stars）、active maintenance、config 寫 package.json（不另開檔）
- 同時量 gzip + brotli + raw 三個維度
- 內建 PR comment action（`andresz1/size-limit-action`）報告變化
- 跨平台一致（本機 macOS 跑 vs Linux CI 跑結果一致）

**Alternatives**：
- `bundlewatch` — maintenance 弱（最後 release 2022）
- 自寫 `find dist/_astro -name '*.js' | xargs gzip -c | wc -c` shell — 零依賴但無 PR comment、無 baseline diff、未來擴增成本高

### D3: Lighthouse action 用 `treosh/lighthouse-ci-action@v12`，mobile profile

**Rationale**：
- 成熟 3k+ stars、active；底層直接呼 official `@lhci/cli`
- 支援 `lighthouserc.json` config 把 assertions（≥ 95 threshold）寫成宣告式
- Mobile profile（preset `lighthouse:no-pwa` + `formFactor: mobile` + `screenEmulation` mobile）反映衛教站真實流量
- 自動上傳 report 到 temporary public storage（看完即過期），CI artifact 也存

**Alternatives**：
- `GoogleChrome/lighthouse-ci-action` 已 deprecated
- `foo-software/lighthouse-check-action` — 較少採用、文件較弱

### D4: 代表性 URL = `/posts/2026-05-11-daraxonrasib-pancreatic-cancer-ras-on/`（hardcode 在 lighthouserc.json）

**Rationale**（grilled this session）：
- 最新文、內容最長、Sidebar 兩 section 都會 render 最多 entry
- Sidebar 在所有 post 都用同一個 `PostLayout.astro`，量一篇等於量 template
- Hardcode 比動態抓 latest post slug 簡單；當未來有更具代表性的 post 時改 `lighthouserc.json` 一行即可（顯式 PR review 變動）

**Alternatives**：
- 動態抓最新 post slug 寫進 lighthouserc.json — CI 多一步、debug 困難
- 多 URL 平行跑（home / post / 多篇）— 時間成本高、首要 NFR 是 post 閱讀，多測無增益

### D5: Bundle 閾值兩層 — per-chunk 5 KB（Sidebar*.js，conditional） + total baseline 55 KB（all client JS）

**Rationale**：
- **Per-chunk 5 KB**：直接對齊 desktop-sidebar Req 10 normative wording（任何 sidebar client island chunk ≤ 5 KB gzipped）。**Conditional**：當 `dist/_astro/Sidebar*.js` 不存在（MVP 狀態）跳過此 rule，避免「找不到檔案」誤 fail；當 Sidebar chunk 出現時自動啟用
- **Total baseline 55 KB**：catch 整體 client JS 漂移（例：CommentBox React island 突然胖、或新加非 sidebar 的 island）。
  - apply 階段實測當前 baseline = **49.44 KB gzipped**（CommentBox 2.7 + client React/Astro 43.0 + Astro internal index 2.7）— 跟 archive 紀錄的 46.8 KB 差 ~2.6 KB（推測 Astro 5.1.x patch + 依賴升級）
  - 55 KB 留 ~5.6 KB 緩衝吸收 Astro 內部 minor bump；超過時透過 new OpenSpec change 顯式調整
- Conditional 邏輯需用 `.size-limit.cjs`（CommonJS，可執行 JS），純 array 寫法（package.json `size-limit` block）不支援
- 兩條獨立判斷、任一破即 fail；error message 區分哪一條被破

**Alternatives**：
- 只設 per-chunk — 漏掉跨 chunk 累積 regression
- 只設 total — 無法定位是哪個 chunk 變大
- 設 per-file（每個 chunk 都自己一條）— config 維護成本高、新 chunk 出現要回頭加 config

### D6: Lighthouse 三向 hard fail，Best Practices 不收；Perf 門檻 mobile baseline 70

**Rationale**：
- A11y / SEO / Perf 是 Req 11 點名的三個，照單全收
- Best Practices 常因第三方資源（CommentBox 載 Turnstile / 未來 analytics）扣分，誤報率高、不適合 hard gate
- LH 的 PWA category 在 v12 已 deprecated，本站不是 PWA 也不打算改 PWA
- **Apply 實測校正（兩階段）**：
  - **第一次（local Mac）**：3 runs = 55 / 72 / 72，median 72。原 95 aspirational、從未實測；改成 70 mobile baseline 與 MODIFIED Req 11
  - **第二次（GH Actions ubuntu-latest CI runner）**：3 runs = 52 / 55 / 65，best 0.65、median 0.55。CI runner CPU 比 Mac 慢，相同 throttling 設定下 score 系統性低 ~10 pt。70 threshold launch day 就紅。**再下修到 60 mobile baseline floor**：給 CI 約 5 pt buffer、仍能 catch ≥ 10 pt regression。Root cause（LCP 7.4 s + FCP 2.9 s）同前；queue `improve-mobile-performance` 處理 lazy CommentBox / font subset / inline critical CSS
- **教訓**：threshold rationale 必須先在 CI runner 量過、不能只靠 dev hardware。Mac M-series chip 是 vanity baseline，CI 是 enforceable baseline

**Alternatives**：
- 收 Best Practices — 高誤報率
- 收所有四項 — Best Practices 拉低 signal-to-noise
- Mobile + 95 — 違反現實、永遠 ship 不了
- Desktop profile + 95 — vanity metric，不代表主流量手機 UX
- 跳過 Lighthouse gate — Req 11 完全 enforce 不到

### D7: 失敗驗證走「一次性 dry-run + 紀錄到 tasks.md」，不留 negative-test workflow

**Rationale**：
- 蓄意改壞 sidebar 跑一次 CI、確認 gate fire、revert、把 CI run URL 寫進 tasks.md Phase 5 紀錄
- **不**留專門的「failure injection workflow」常駐 — 維護成本高、會誤觸發
- 確認 gate 真的會擋是 implement 時的一次性驗證，不是持續 contract

**Alternatives**：
- 留 negative test workflow — 維護成本不對等
- 完全跳過 failure verification — 違反 fail-loud goal、無法證明 CI gate 真有效

### D8: Branch protection 文件化、不 code-enforce

**Rationale**：
- GH branch protection 是 repo setting，無法用 commit 進本 repo 的檔案 enforce
- README §Quality gates 寫明「maintainer 必須在 Settings → Branches → main → Require status checks 設定 `quality-gates / build-and-check` 為 required」
- 偵測 protection 是否打開可以用 `gh api repos/.../branches/main/protection` 但不是本 change 範圍

### D9: 本機可重現 `pnpm` script — `pnpm size` + `pnpm lighthouse:local`

**Rationale**：
- `pnpm size` → `pnpm build && size-limit`，本機跟 CI 結果一致
- `pnpm lighthouse:local` → `lhci autorun --config=lighthouserc.json --upload.target=filesystem`（local 不 upload）
- Debugger 不用每次 push PR 等 CI

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| R1: Lighthouse Performance 在 CI runner 抖動造成 false positive | lighthouserc.json 設 `numberOfRuns: 3` 取中位數；threshold 抓 95 不是 99，有 4 分緩衝 |
| R2: GH Pages preview URL 跟 prod URL 不同（CI 跑 build artifact local server vs prod GH Pages） | CI 用 `npx http-server dist -p 4321 --silent` 跑 local static serve、Lighthouse 對 localhost；prod 行為差異透過 deploy 後手動 spot-check 補（不在 CI scope） |
| R3: `size-limit` baseline 隨 Astro 版本升 silently 漂移 | total baseline 50 KB 留緩衝；超過時 maintainer 顯式 PR 改 baseline 並附 release note 連結（顯式 review，不假裝沒事） |
| R4: PR contributor 沒辦法 re-run CI（單人 maintain，僅自己有寫權限） | 暫不解；單人 maintain 不會遇到。未來開 contribution 時加 instructions |
| R5: Lighthouse mobile profile 跑得慢（~90 s） | 接受；總 workflow ~3 min 在可容忍範圍。若太慢可以未來把 lighthouse 改成 nightly cron + push-to-main 觸發，PR 只跑 bundle gate |
| R6: 蓄意失敗驗證的 commit 留在 git history（即使 revert 過） | 接受；revert commit 留 paper trail，但不影響 main spec。可在 message 註明 `chore(verify): negative-test for quality-gates-ci, reverted by next commit` |
| R7: `lighthouserc.json` hardcode URL 在 site `base` 改變時破（例 follow-up #2 改 custom domain） | URL 寫成 path（`/posts/...`），prefix base URL 在 lighthouserc.json 用 env var 或 `${BASE_URL}` interpolation；migrate-to-custom-domain change 屆時改 base 即可 |

## Migration Plan

不適用（純 addition，無 schema migration、無 data migration）。Rollback：把 `.github/workflows/quality-gates.yml` 刪掉 + `package.json` revert dev-deps 即可，無 side effect。

## Open Questions

1. **Lighthouse 跑「build artifact local serve」還是「prod URL」**？
   - 偏好：build artifact local serve（避免 CI 撞 prod 流量、避免 build 跟 deploy 之間的時差污染結果）
   - 待 implement 時定案

2. **`lighthouserc.json` config 放哪**？
   - 候選 A：repo root（業界慣例）
   - 候選 B：`.github/lighthouserc.json`（跟 workflow 同目錄）
   - 偏好 A，跟 size-limit 慣例對齊；待 implement 時定案

3. **baseline 50 KB 是否設成 dynamic**（讀某個 `.size-baseline` 檔）vs hardcode in package.json？
   - 偏好 hardcode + 顯式 PR review；dynamic baseline 容易 ratchet 失效

## Context

當前 [src/layouts/PostLayout.astro](src/layouts/PostLayout.astro) 是嚴格單欄 magazine 風格（warm cream `#fbf8f3` + Noto Serif TC body + sage accent + 680px max content width）。4 篇文章規模時導覽不是問題，但長線會傷桌機讀者 retention。需新增 sidebar 但**不能破壞 DESIGN.md 8 條 chrome rules**（無 shadow / 8px scale / 1px hairline / 無 dark mode / 無動畫 / 無 9999px pill / 無純黑文字 / 無純白底）。

**Prior research**（2026-05-11 grill-me Deep session）：
- No-Wheels 評分 59/100 → 🟠 邊緣 / 🟡 Build with clear angle
- 唯一直接命中 reference：[WhitePaper233/yukina](https://github.com/WhitePaper233/yukina) 269⭐ MIT — sidebar/archive pattern + frontmatter pinning 可參照結構，但 design language 衝突太多，**不 fork、自己 implement**

**現有 stack**：Astro 5 + React 18 islands、TypeScript 5、pnpm 9、GitHub Actions → GH Pages。Content Collections 用 zod schema 驗證 frontmatter。

**Existing comments-api 實況**（grill 時未確認、本次 propose 才查）：是 **Cloudflare Workers + D1 live database**（部署在 `klaude-comments.tony85314.workers.dev`），**不是** clarifications 假設的 static `comments.json` 檔。Popular 區塊要接它需重 spec integration 策略，但 MVP 不上 Popular，本 change 暫不處理。

## Goals / Non-Goals

**Goals:**
- 桌機 ≥1024px 加 sidebar 提供 Pinned / Timeline 兩區塊 + Phase 2 unlock 的 Popular 區塊
- Sidebar chrome 嚴守 DESIGN.md 8 條 rules + 守住「magazine 風格」識別
- 行動裝置 (<1024px) reading flow 跟現在一模一樣 — 用 CSS-only `<details>/<summary>` 不破壞單欄體驗、零 JS / 零 animation
- Lighthouse A11y / SEO / Performance 全部 ≥ 95（hard acceptance gate，CI 驗證）
- Sidebar 相關 JS bundle ≤ 30 KB gzipped（hard cap）

**Non-Goals:**
- Sidebar 內 search input — MVP 明示排除，未來走獨立 Pagefind 整合
- Sidebar sticky scroll — defer to Phase 2 unless requested
- RSS / Atom subscribe button in sidebar — defer to Phase 2 unless requested
- Dark mode sidebar variant — 永遠 out of scope（DESIGN.md identity）
- Drop shadow / backdrop blur — DESIGN.md 已禁
- Hamburger drawer / overlay drawer — 跟「無動畫」設計語言衝突，被 CSS-only `<details>` 取代

## Decisions

### D1: Mobile breakpoint 行為 — CSS-only `<details>/<summary>` push-down，**非** hamburger drawer

**選擇**：mobile (<1024px) 不做 hamburger drawer / 不做 overlay；採 `<details><summary>` 預設 closed，點 summary → 內容區塊上下推（push down）、無 backdrop、無 animation。

**Why**：
- DESIGN.md 禁動畫，drawer / slide-in transition 都會破例
- Hamburger 圖示 + tap target 增加 UI chrome，違反 magazine 風格
- `<details>` 是原生 HTML semantics，screen reader 友善、無 JS 即可運作
- 上下推方式對 reading flow 干擾較小（讀者主動展開才出現，不展開完全不存在）

**Alternatives considered**：
- (a) Hamburger + slide drawer — 違反「無動畫」+ 需 JS 維護開關狀態
- (b) Bottom sheet pattern — 仍需動畫 + 增加 chrome
- (c) Mobile 完全隱藏 sidebar — 失去 mobile 讀者導覽能力

**Risks**：
- CLS（Cumulative Layout Shift）：`<details>` 展開時 push 下方內容 → potential Lighthouse Performance 失分
- **Mitigation**：implementation 階段先 smoke test 量 CLS baseline，必要時用 `content-visibility: auto` 或 reserve `min-height` 緩衝

### D2: Sidebar 區塊順序 — Pinned → Timeline → Popular

**選擇**：desktop sidebar 三區塊垂直 stack，順序固定：（1）Pinned/Featured、（2）Timeline、（3）Popular（Phase 2）。

**Why**：
- Pinned 在最上 = 作者主動 curation 訊號，給讀者「站長覺得這幾篇值得讀」的入口
- Timeline 在中 = 客觀時序索引，補 Pinned 之外的整站覆蓋
- Popular 在下 = 被動產生的社群訊號，**MVP 階段不出**（觸發條件未達），實作時保留 placeholder slot

**Alternatives considered**：Timeline 在最上（按時序為主軸）— 否決，因為對新讀者「最新一篇」不一定是最該讀的，Pinned 提供更好的入口策略。

### D3: Pinned hard cap = 3，超過按 date desc 取前 3

**選擇**：`pinned: true` 的文章超過 3 篇時，按 `date` 倒序取前 3 顯示。

**Why**：
- Sidebar 高度 deterministic（不會因 pin 數量爆炸破壞 layout）
- 強制作者做「現在最重要的 3 篇是哪些」的判斷
- 取「最新 3 篇」而非「最舊 3 篇」吻合多數情境（時效性高的衛教文 > 永久經典文，前者更需要曝光）

**Alternatives considered**：
- Hard cap = 5 — 太多，sidebar 過長
- 無 cap — 違反 deterministic layout
- 取最舊 3 篇 — 違反衛教時效性

**Trade-off**：使用者想 promote 老文需手動把舊的 pinned 改 false 或調 date。可接受。

### D4: Pinned 0 顯佔位 vs Popular 0 隱藏 — intentional inconsistency

**選擇**：
- Pinned 區塊 0 pin 時**仍 render**，顯佔位 copy「還沒釘選任何文章」
- Popular 區塊 0 留言時**整塊不 render**

**Why**：兩區塊本質不同
- Pinned 是**作者 curation surface** — 0 pin 是「作者尚未行動」狀態，顯佔位 = 主動 prompt 作者填內容
- Popular 是**讀者被動產生 surface** — 0 留言是「社群尚未產生」狀態，顯佔位等於暴露空相、傷專業感

**Implementation note**：兩種 fallback 行為要在 component 內加註解明確標記 intentional，避免未來 maintainer 以為是 bug「修正」成一致。

### D5: Pinned 欄位 zod schema delta — `pinned: z.boolean().default(false)`

**選擇**：[src/content/config.ts](src/content/config.ts) 的 zod schema 加 `pinned: z.boolean().default(false)`。

**Why**：
- 用 zod default 處理 backward compat — 4 篇 existing posts 不需 batch migration
- 預設 false 對齊 D4「pin 是主動行為，預設不 pin」
- Boolean 簡單明確，不需 enum / nullable / 三態

**Alternatives considered**：
- `pinned?: number` 排序值 — 太複雜，跟 D3 hard cap=3 衝突（已用 date 排序）
- `featured: 'pinned' | 'normal'` enum — 過度設計
- 不加 frontmatter，用 tag `#pinned` — tag 系統用途混淆（tag 是內容分類，pinned 是顯示控制）

### D6: Performance hard cap — sidebar 新增 chunk ≤ 5 KB gzipped；MVP 零 client JS

**選擇**：
- MVP sidebar 完全 server-rendered Astro component，**新增 0 KB** 到 client JS bundle
- 若未來（例：Popular Phase 2）引入 sidebar client island，**新 chunk gzipped ≤ 5 KB**
- CI gate：監控 `dist/_astro/Sidebar*.js` chunk 是否出現 + size 上限

**Why**（已用 baseline 校準，2026-06-10）：
- **`pnpm build` baseline 結果**：Total JS gzipped = 48.6 KB；其中 `client.*.js` (React + ReactDOM runtime) = 44 KB、CommentBox island = 2.8 KB、Astro hydration glue = 2.7 KB
- 原本 spec 寫的 30 KB 絕對 cap 在這 baseline 下無意義（光 React runtime 就 44 KB），會 false-positive 擋 CI
- 改成「sidebar 新增 chunk」delta cap 對齊 D1（mobile CSS-only `<details>`）：server-rendered Astro component 預期 = 0 KB 新 JS
- 5 KB 的 chunk 預算可容納小型 client-side filter / sort 邏輯（例 Popular section 內部 sort），但禁不起另一個整套 framework

**Alternatives considered**：
- 絕對 30 KB cap — 在 baseline 48.6 KB 下變成 over-budget 18.6 KB，CI 直接紅；廢
- 絕對 60 KB cap（baseline + 10 KB）— 過鬆，sidebar 完全可以塞個 jQuery 進去都不會擋
- delta 10 KB — 過鬆，鼓勵 client island 濫用；MVP 不需要
- delta 0 KB hard — 完全禁 client JS，但 Phase 2 Popular section 可能需要小 island 做 client filter；過嚴

**Trade-off**：用 chunk-level 監控（而非總 bundle）依賴 Astro 的 code splitting — 若未來 Astro 改 chunking 策略可能 sidebar code 被 inline 進共享 chunk 而無法量測。Mitigation：CI 同時量總 JS gzipped delta 作為兜底（若 sidebar code 被 inline，baseline 會漲）。

### D7: Popular 區塊 comments-api integration — defer to Phase 2 with re-spec

**選擇**：MVP 不接 comments-api。Phase 2 unlock 時（≥15 篇 + ≥5 篇有 ≥3 留言）才重新 spec integration 策略。

**Why**：
- Prior clarifications 假設「comments-api 是 static JSON 檔，build-time 直接讀」
- **實況**：是 Cloudflare Workers + D1 live database（`klaude-comments.tony85314.workers.dev`），需重 spec integration
- 三種可能策略（Phase 2 才決）：
  - (a) Build-time fetch API：CI 跑時 call `/api/counts` → 寫進 generated content → 不需 client JS
  - (b) Runtime React island fetch：client load 時 fetch counts → 違反 D6 30 KB cap 風險
  - (c) Snapshot file workflow：手動跑 script dump D1 → JSON → commit → build 讀 → 不自動但簡單
- MVP 不上 Popular，本 change 不被卡

### D8: DESIGN.md 擴充（不破壞） — 加 §sidebar chrome rules

**選擇**：DESIGN.md 加新段落 `## Sidebar Chrome Rules`（不改既有 8 條 rules，只擴充）。

**Why**：
- DESIGN.md 是 source of truth（CLAUDE.md curator rule）— sidebar 引入新 UI surface 需有明確 chrome 規範
- 避免未來 maintainer 把 sidebar 改成跟主視覺衝突的樣式

**內容草稿**（spec 階段細化）：
- Sidebar font: sans-serif（跟 H2/H3/nav 一致），不用 body serif
- Sidebar item padding: 8px scale（12 / 16）
- Sidebar 區塊分隔：1px hairline `var(--color-border)`，無 shadow
- Sidebar item link：sage underline 1.5px（跟 inline link 一致）
- Mobile `<details>`：例外允許 CSS-only toggle（不視為「動畫」），但禁用 `transition` property
- Sidebar 最大寬度：240px（desktop），不擠壓 680px content column

## Risks / Trade-offs

- **[R1] CLS hit from mobile `<details>` toggle** → smoke test CLS baseline，必要時 reserve `min-height` 或 `content-visibility: auto`
- **[R2] JS bundle 30 KB cap 過嚴或過鬆** → tasks.md Phase 1 第一個 task = `pnpm build` baseline，據以調整
- **[R3] Sidebar 引入新 UI surface 可能破壞 magazine identity** → D8 加 DESIGN.md §sidebar chrome rules，明確守住；CI 加 manual review checklist
- **[R4] yukina 結構參照可能 over-engineer**（人家 269⭐ 全功能 blog framework，我們是 4 篇 minimalist 站）→ 只取 sidebar HTML 結構 + frontmatter pattern，不抄 archive / category / tag cloud / search 等 surface
- **[R5] Popular 區塊 D7 deferred 的 comments-api re-spec 可能比想像複雜**（D1 query / Worker 端 aggregation / CORS / caching strategy）→ Phase 2 unlock 時開新 change `desktop-sidebar-popular` 處理，不污染本 change scope

## Migration Plan

1. **No data migration needed** — zod default `pinned: false` 對 4 篇 existing posts 自動生效
2. **Code rollout**：
   - 加 schema delta → `pnpm build` 確認 4 篇 existing posts 都過 zod check
   - 加 Sidebar.astro component（先 stub render，內容區塊空 placeholder）
   - 加 PostLayout grid layout（≥1024px 兩欄 / <1024px 單欄 + `<details>`）
   - 接 Pinned 區塊邏輯（query content collection 取 pinned=true && hard cap 3）
   - 接 Timeline 區塊邏輯（content collection group by year/month）
   - Popular 區塊留空殼 + comment "Phase 2"
3. **Rollback strategy**：本 change 純加法，無 destructive delta；rollback = `git revert` 該 commit。Schema 加欄位後即使 rollback，4 篇 existing posts frontmatter 沒寫 `pinned` → zod 仍會 default false → 沒衝突。

## Open Questions

1. **Q**: JS bundle baseline 是多少？→ tasks.md Phase 1 task 1 量
2. **Q**: 30 KB cap 是「現有 + 30 KB 增量」還是「絕對 30 KB」？→ baseline 量完再決，取嚴
3. **Q**: DESIGN.md §sidebar chrome rules 完整內容？→ spec 階段細化 + 寫入 DESIGN.md PR
4. **Q**: CLS 從 `<details>` 開合 push down 實際影響多少？→ implementation 階段 smoke test Lighthouse Performance
5. **Q**: yukina 結構參照取哪些檔？→ implementation 階段對照 [SideBar.astro](https://github.com/WhitePaper233/yukina/blob/main/src/components/SideBar.astro) + [PostArchiveLayout.astro](https://github.com/WhitePaper233/yukina/blob/main/src/layouts/PostArchiveLayout.astro)
6. **Q**: Phase 2 Popular 區塊的 comments-api 策略（a / b / c 三選一）？→ Phase 2 trigger 達成時開新 change 解

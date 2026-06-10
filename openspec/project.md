# Klaude Health Education — Project Context

> 由 `/spec init` 產生（2026-05-11）。OpenSpec `config.yaml` 會 reference 進去作為所有 artifact 生成時的 AI context。**手動維護**，不要讓 OpenSpec 自動覆寫。內容預填自 README.md + DESIGN.md，請逐節確認。

## Purpose

繁體中文醫學科普部落格〈康勞德醫普 / Klaude Health Education〉。以實證醫學（OpenEvidence、NCCN guideline、landmark RCT）為基礎，由台大醫學生 WLK 撰寫、Claude Code 輔助產製、給一般大眾閱讀的健康衛教內容。長期目標：在台灣中文醫普市場做出「不像衛福部官網、也不像 SEO 內容農場」的編輯品質。

## Target Users

- **主**：台灣中文讀者（病人、家屬、一般民眾） — 想了解醫學概念但對內容農場品質不滿
- **次**：醫療同行 — 拿來當衛教溝通範本參考
- **作者自用**：WLK 本人整理臨床知識的副產出
- 規模預期：上線初期數百到數千讀者；長線無激進成長目標

## Stack & Constraints

- **Frontend**: Astro 5 + React 18 islands、TypeScript 5、pnpm 9
- **Content**: Markdown with zod-validated frontmatter（`src/content/posts/<YYYY-MM-DD-slug>.md`）
- **Comments API**: Cloudflare Workers + D1（獨立 sub-project `comments-api/`，含 wrangler.toml + migrations/）
- **Deploy**: push to `main` → GitHub Actions → `wrangler pages deploy` → Cloudflare Pages，經 router Worker 服務於 `https://med-study-rpg.com/klaudehealthedu/`（subpath 共享 `med-study-rpg.com`，root 與 `/2nd` 是其他 app）
- **Build**: `astro check && astro build`（zod schema + TypeScript check + 靜態頁生成）
- **Design system**: 嚴守 `DESIGN.md` — light theme only、serif body / sans UI、sage accent、680px max content width、Chinese line-height ≥ 1.85
- **License**: 內容 CC BY-NC-SA 4.0、程式碼 MIT
- **Brand**: 〈康勞德醫普〉(prefix in Threads chain posts)
- **Voice**: Claude Code skill `wlk-public-writing-style`（私有未公開）

## Non-Functional Requirements

- 行動裝置長文中文閱讀體驗為**首要 NFR**（DESIGN.md §2 reading-width rule）
- Accessibility：contrast ≥ AA、touch target ≥ 44×44px、respect `prefers-reduced-motion`
- 無 dark mode（見 Out of Scope）
- GH Actions build < 5 min（隨文章篇數線性 scale，盡量不破）
- 文章規模成長到 ~500 篇仍要維持 build 速度與分類頁可用性

## Failure Modes & Constraints

- **Zod schema fail → build fail**（GH Actions 會 fail PR），預期行為，不 silent swallow
- **Comments API down**：文章本身必須**仍可讀**（degrade gracefully，留言區顯示降級訊息）
- **醫學內容錯誤**：每篇必標明 sources（OE / NCCN / RCT）+ 顯示 disclaimer banner（DESIGN.md §4），明示「不取代個別醫療建議」
- **PHI 零容忍**：寫文章絕不引用可識別病例（姓名 / 病歷號 / DOB / 住址 / 電話）
- **抄襲風險**：所有引用走 inline source list，不複製原文段落

## Out of Scope

- **Dark mode**（DESIGN.md 明確排除 — light only is identity）
- **User authentication / login**（純閱讀；留言走 anonymous + email 驗證或類似輕量機制）
- **個人化推薦 / SEO-driven 內容**
- **Multi-tenant / paywall / newsletter（v1/v2）**
- **9999px pill radius / 純黑文字 / 純白底**（DESIGN.md §6 反例）

## Roadmap

- **v1（已上線）**：核心文章閱讀、RSS、分類索引頁、Cloudflare Workers 留言 API、disclaimer / sources 區塊
- **v2 nice-to-have**：reader interaction（React island） — 文末 quiz / mini-poll / 共讀人數計數
- **後續可能**：自訂網域、文章搜尋、相關文章推薦（基於 tag，不基於演算法）
- **Future**：newsletter（會破現有 deploy 模型，需重新評估）

## Deploy & Distribution

- **讀者取得**：直接讀 `https://med-study-rpg.com/klaudehealthedu/`（Cloudflare subpath 部署架構見 README §部署架構；舊 `https://fireman333.github.io/KlaudeHealthEducation/` 近似 301 導向新網址）
- **作者更新流程**：
  1. 用 `klaude-healthedu` skill 產文 + 圖
  2. 存到 `src/content/posts/YYYY-MM-DD-slug.md`
  3. `pnpm build` 本機驗證
  4. `git commit && git push` → GH Actions 2–3 min auto deploy
- **Comments API 部署**：`comments-api/` 走 `wrangler deploy`（獨立 lifecycle）

## Key People & Sources

- **Owner / Author**: WLK（康瑋麟，台大醫學系大六）
- **Editorial assistance**: Claude Code + OpenEvidence MCP + NCCN guideline skills
- **Visual identity**: DESIGN.md（自製）— Mayo Clinic / NYT Well / 報導者 health features 為參照
- **Brand**: 〈康勞德醫普〉

## Conventions

- **Post 檔名**：`YYYY-MM-DD-slug.md`（檔名 date 必須與 frontmatter `date` 一致 — zod 驗證會擋）
- **URL 規則**：`/posts/<filename-without-md>/`（1:1 從檔名推）
- **Capability slug**（OpenSpec）：kebab-case（例 `post-publishing`、`comments-api`、`design-system`）
- **Commit prefix**：`feat:` / `fix:` / `fix(post):` / `chore:` / `spec:` / `docs:`
- **醫學名詞**：首次出現用「中文（English）」格式
- **資料來源**：每篇文章末段「參考資料」H3 + numbered list（Sans 14–15px per DESIGN.md §4）
- **Threads chain prefix**：所有 cross-post Threads 串文以〈康勞德醫普〉開頭

## Related Projects / References

- **Skill**: `klaude-healthedu`（`~/.claude/skills/klaude-healthedu/`） — 端到端衛教文章 + Threads cross-post pipeline
- **Skill**: `wlk-public-writing-style`（`~/.claude/skills/wlk-public-writing-style/`） — 大眾寫作 voice 規範
- **Skill**: `controversy-scout` — 從 Threads 抓爭議醫學貼文當衛教題目來源
- **`DESIGN.md`**：視覺規範完整版（單一真實來源）
- **`TEMPLATE.md`**：新文章 markdown 模板 + checklist

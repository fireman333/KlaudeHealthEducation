# Decisions — 2026-06-10

Session arc: full OpenSpec lifecycle for `desktop-sidebar` capability (init → propose → apply → archive). 4 commits on worktree branch `claude/exciting-albattani-cb298f`. Captured here so next session's `/spec resume` picks up the queued follow-ups + open architectural questions without rebuilding context from conversation.

## Three follow-up changes (named, not yet opened)

Listed in priority order. Each has enough scaffolding (problem framed + scope hint) to drop straight into `/opsx:propose <slug>`.

### 1. `add-quality-gates-ci` (P2 頂級)

**Why**: `desktop-sidebar` spec Requirements 10 (JS bundle ≤ 5 KB chunk delta) + 11 (Lighthouse A11y/SEO/Perf ≥ 95) ship as **manual-enforcement** constraints. Until CI catches violations, future sidebar-touching PRs can silently regress.

**Scope** (per archived [tasks.md Phase 8](../changes/archive/2026-06-10-desktop-sidebar/tasks.md)):
- `lighthouse-ci` action in `.github/workflows/deploy.yml` against a representative post URL, fail at < 95 on any of A11y/SEO/Perf
- bundle-size check (e.g. `size-limit` / `bundlewatch`) failing if `dist/_astro/Sidebar*.js` exceeds 5 KB gzipped
- `README.md` 新增 §Quality gates 段
- One failure-path cycle test (deliberately break → confirm gate fires)

**Capability**: new `quality-gates-ci` (cross-cutting, not specific to sidebar)

**Won't block sidebar going live** — Phase 8 was deferred precisely so sidebar can ship today; CI hardening is its own change.

### 2. `migrate-to-custom-domain` (P3 人上人)

**Why**: site currently at `https://fireman333.github.io/KlaudeHealthEducation/`; target = `https://med-study-rpg.com/klaudehealthedu` (subpath under user's Cloudflare-owned domain). Grilled 2026-06-10 — sequencing confirmed: **sidebar first → migration second** (now ready).

**Critical open**: Facet 5 from grill — "med-study-rpg.com 現有 subpath app 的部署 pattern 不記得" → Phase 1 task #1 must run `wrangler pages project list` + Cloudflare dashboard巡 routes 才能決 Facet 3 routing 策略（Pages with base / Worker reverse-proxy / Pages + Page Rules 三選一）。

**Default routing preference**: lean toward Cloudflare Worker reverse-proxy（保留 GH Pages、CI 不動、最少 moving parts）— overridable after Facet 5 查清。

**Other tasks** (full grill in `~/.claude/scratch/grilled-klaudehealthedu-migrate-cf-subpath-2026-06-10.md`):
- `wrangler d1 export klaude-comments-db` 備份 D1（D1 資料不能丟，是 launch day rollback 安全網的關鍵）
- 改 `astro.config.mjs` `site` + `base`、`comments-api/wrangler.toml` `ALLOWED_ORIGINS` + `SITE_URL`、Turnstile site config 加新 domain
- GH Pages 設 meta-refresh + canonical + JS redirect 模擬 301（GH Pages 不支援真 HTTP 301）
- Rollback SLO 寬：一天內修好 OK（4 篇文 / 0 confirmed 讀者）

**Capability**: new `subpath-deployment` 或 `custom-domain`（slug TBD when opened）

### 3. `fix-openspec-config-schema` (P4 NPC)

**Why**: `openspec/config.yaml` 兩條長期 schema warnings — `Invalid 'context' field (must be string)` + `Invalid 'rules' field (must be object)`。每跑一次 `openspec` CLI 就噴一遍 stderr，不阻塞但累。

**Source**: 模板從 `~/.claude/skills/spec/templates/config.yaml.tmpl` 來的、但 openspec v1.3.0 的 schema 期望不同（template 落後 CLI）。

**Scope** (small, possibly trivial enough not to need full propose):
- 把 `context: { project_md: openspec/project.md }` 改成 `context: openspec/project.md`（string）
- 把 `rules: [- {id: x, rule: y}]` 改成 object map: `rules: { x: y, ... }`
- Verify warnings gone via `openspec validate --all`
- 可順手 PR 給 spec skill 自己更新 template

**Capability**: 無 — 純 config maintenance（也許走 trivial edit + commit，不需 OpenSpec propose）

## Workspace state at handoff

- **Branch**: `claude/exciting-albattani-cb298f` (worktree at `.claude/worktrees/exciting-albattani-cb298f/`)
- **Commits this session**: 4 (10e21d1 / 0ed916c / 66f1c09 / c0a0130)
- **Working tree**: clean after archive commit
- **Dev server**: was running on port 4321, **stopped at handoff** (next session need `preview_start astro-dev` again if want to preview)
- **Main spec live**: `openspec/specs/desktop-sidebar/spec.md` (12 requirements)

## Two browser-tool quirks worth remembering（不必每次重新踩）

捕捉在此因為下次 vibe-coding session 可能再遇到，archived `tasks.md` Phase 4 已紀錄但放在 decisions 較容易被 `/spec resume` 撈到：

1. **`mcp__Claude_Preview__preview_click` 對 `<summary>` 用 synthetic event dispatch — 不觸發 Chromium 的 `<details>` UA toggle**。Real-user trusted click 沒問題。debug 時改用 `preview_eval` 跑 `element.click()` 驗。
2. **`<summary>` 套 `display: flex` 會破 Chromium native toggle**（known quirk）。要置中內容用 `padding` + `min-height` + `line-height`，不要 flex。

## When `/spec resume` runs next

Expected `/spec resume` output 三句話：

1. **Project**: 〈康勞德醫普 / Klaude Health Education〉 Astro 5 衛教站
2. **Last known state**: `desktop-sidebar` capability archived 2026-06-10（main spec live, 12 requirements）; no active changes; 3 follow-ups queued in this file
3. **Suggested next**: 從 3 個 follow-up 挑一個開 propose — 建議順序 `add-quality-gates-ci` > `migrate-to-custom-domain` > `fix-openspec-config-schema`（或視當下需求重排）

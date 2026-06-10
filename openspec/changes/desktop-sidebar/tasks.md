## 1. Phase 1 — Baselines & uncertainty resolution

- [ ] 1.1 Run `pnpm build` against current `main` (no sidebar) and record JS bundle gzipped size — establishes baseline for the 30 KB cap decision
- [ ] 1.2 Read `comments-api/README.md` + `comments-api/src/index.ts` + `comments-api/migrations/` to document the actual D1 schema + Worker HTTP surface — closes Open Uncertainty #1 from grill clarifications
- [ ] 1.3 Decide whether the 30 KB cap is absolute or relative to baseline + write the decision into `design.md` Decisions section (update D6)
- [ ] 1.4 Smoke-test mobile `<details>` CLS impact in a throwaway branch — measure Lighthouse Performance delta on a representative post (closes Risk R1)

## 2. Phase 2 — Schema delta + content compatibility

- [ ] 2.1 Add `pinned: z.boolean().default(false)` to the `posts` collection in `src/content/config.ts`
- [ ] 2.2 Run `pnpm build` to confirm all 4 existing posts pass zod validation without frontmatter changes (Requirement: Post frontmatter SHALL accept a `pinned` boolean field, scenario 1)
- [ ] 2.3 Add a temporary test post with `pinned: true` in a throwaway commit; verify `pnpm build` succeeds; revert
- [ ] 2.4 Add a temporary test post with `pinned: "yes"` (string); verify `pnpm build` fails with a clear error pointing at the file; revert

## 3. Phase 3 — DESIGN.md §Sidebar Chrome Rules

- [ ] 3.1 Draft DESIGN.md §Sidebar Chrome Rules section content covering: sans-serif font (no body serif inside sidebar), 8 px spacing scale, 1 px hairline dividers, 240 px max width, sage underline for links, native `<details>` allowance, forbidden `transition` / `animation` properties
- [ ] 3.2 Append the new section to `DESIGN.md` between §6 (Do / Don't) and §7 (Accessibility checks) — keep existing section numbers stable, insert as §6.5 or §7
- [ ] 3.3 Verify the addition does not contradict any of the existing 8 rules

## 4. Phase 4 — Sidebar component skeleton + responsive layout

- [ ] 4.1 Create `src/components/Sidebar.astro` with three `<section>` slots (Pinned / Timeline / Popular) and no content yet — pure structural shell
- [ ] 4.2 Update `src/layouts/PostLayout.astro` to wrap content + sidebar in CSS Grid; desktop ≥1024 px = two columns (content 680 px + sidebar 240 px), mobile = single column with sidebar wrapped in `<details><summary>` toggle
- [ ] 4.3 Confirm desktop layout: viewport 1024 px renders side-by-side, 1023 px renders mobile fallback (Requirement: Sidebar SHALL appear on desktop viewports at or above 1024 px, scenarios)
- [ ] 4.4 Confirm `<details>` default closed state, no JS, no `transition` / `animation` CSS (Requirement: Mobile viewport SHALL collapse..., all scenarios)
- [ ] 4.5 Apply DESIGN.md §Sidebar Chrome Rules tokens to `src/styles/global.css` and the component

## 5. Phase 5 — Pinned section

- [ ] 5.1 In `Sidebar.astro`, query the content collection for posts where `pinned === true && draft !== true`
- [ ] 5.2 Sort by `date` descending and take the first 3 items
- [ ] 5.3 Render each item as a linked title + date using sans-serif typography per DESIGN.md §Sidebar Chrome Rules
- [ ] 5.4 When the filtered list is empty, render placeholder copy「還沒釘選任何文章」inside the section instead of hiding it (Requirement: Pinned section SHALL display..., scenario 1)
- [ ] 5.5 Manually test by setting `pinned: true` on 5 of the 4 existing posts (creating temporary 5th if needed) — verify only the newest 3 appear and the 2 oldest are excluded; revert after

## 6. Phase 6 — Timeline section

- [ ] 6.1 In `Sidebar.astro`, query the content collection for all posts with `draft !== true`
- [ ] 6.2 Group by year-month, sort groups by year-month descending, sort posts within each group by `date` descending
- [ ] 6.3 Render each year-month group with a sans-serif heading, followed by post title + date entries
- [ ] 6.4 Confirm draft posts are excluded (Requirement: Timeline section SHALL group..., scenario 2)
- [ ] 6.5 Confirm with current 4 posts: timeline shows a single group or two groups depending on dates; entries are in date desc order

## 7. Phase 7 — Popular placeholder slot

- [ ] 7.1 In `Sidebar.astro`, render the Popular `<section>` as an empty container with `display: none` style or omit children entirely
- [ ] 7.2 Add an inline comment marking this as「Phase 2 unlock — see openspec/specs/desktop-sidebar/spec.md Requirement: Phase 2 Popular unlock trigger」
- [ ] 7.3 Verify no comments-api network request fires during build OR runtime (Requirement: Popular section SHALL render as an MVP placeholder slot only, scenario 1)

## 8. Phase 8 — CI guardrails

- [ ] 8.1 Add `lighthouse-ci` (or equivalent action) to `.github/workflows/deploy.yml` so it runs against a representative post URL after build
- [ ] 8.2 Configure thresholds Accessibility ≥ 95, SEO ≥ 95, Performance ≥ 95 — CI fails if any below
- [ ] 8.3 Add a bundle-size check (rollup-plugin-visualizer / source-map-explorer / `size-limit`) that fails CI if sidebar-related gzipped JS exceeds the cap decided in 1.3
- [ ] 8.4 Document both CI gates in `README.md` under a new「Quality gates」section
- [ ] 8.5 Run one CI cycle locally (or via a draft PR) to confirm gates fire correctly when intentionally broken

## 9. Phase 9 — `/opsx:verify` + manual review

- [ ] 9.1 Run `/opsx:verify` to check completeness, correctness, coherence of the change artifacts
- [ ] 9.2 Run `/simplify` against the changed files (Sidebar.astro, PostLayout.astro, config.ts, global.css)
- [ ] 9.3 Run `/verify` (end-to-end Chrome MCP) — visit a post page on dev server, confirm desktop sidebar renders, click mobile `<summary>` to confirm push-down behavior, check no JS errors in console
- [ ] 9.4 Manual DESIGN.md compliance walkthrough — open a post page at 1280 px wide, confirm zero shadows, zero rounded pills, sage links, sans-serif sidebar text, no animations on `<details>` toggle
- [ ] 9.5 Update `design.md` Open Questions section: cross out resolved items, leave Phase 2 items open
- [ ] 9.6 Stage `/opsx:archive desktop-sidebar` (do NOT auto-archive — user confirms)

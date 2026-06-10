## 1. Phase 1 — Baselines & uncertainty resolution

- [x] 1.1 Run `pnpm build` against current `main` (no sidebar) and record JS bundle gzipped size — **baseline = 48.6 KB gzipped** (client.*.js 44 KB + CommentBox island 2.8 KB + Astro hydration 2.7 KB), recorded in design.md D6
- [x] 1.2 Read `comments-api/README.md` + `comments-api/src/index.ts` + `comments-api/migrations/` to document the actual D1 schema + Worker HTTP surface — **confirmed**: Hono on CF Workers + D1 with 3 tables (comments / admin_session / magic_link) + Workers AI PHI flag + Magic-link auth + Turnstile + MailChannels; **no `comments.json` static file exists**, all reads via Worker HTTP endpoints; supports `wrangler rollback` + admin export endpoint for D1 backup
- [x] 1.3 Decide whether the 30 KB cap is absolute or relative to baseline + write the decision into `design.md` Decisions section (update D6) — **resolved as: MVP zero new client JS (server-rendered) + future sidebar chunks ≤ 5 KB gzipped delta**; spec Requirement 10 updated to match
- [ ] 1.4 ~~Smoke-test mobile `<details>` CLS impact in a throwaway branch~~ — **DEFERRED to Phase 4.6 task**: meaningful CLS measurement requires real sidebar content rendered inside the `<details>`; will be measured after Phase 4 component skeleton is in place

## 2. Phase 2 — Schema delta + content compatibility

- [x] 2.1 Add `pinned: z.boolean().default(false)` to the `posts` collection in `src/content/config.ts` — committed in line 34 after `draft`
- [x] 2.2 Run `pnpm build` to confirm all 4 existing posts pass zod validation without frontmatter changes — confirmed: 14 pages built, no zod errors (default false silently applied)
- [x] 2.3 Add a temporary test post with `pinned: true` in a throwaway commit; verify `pnpm build` succeeds; revert — confirmed: throwaway `2026-06-10-test-pinned-true-throwaway.md` built then removed
- [x] 2.4 Add a temporary test post with `pinned: "yes"` (string); verify `pnpm build` fails with a clear error pointing at the file; revert — confirmed: `InvalidContentEntryDataError` with file path + line, exit 1; throwaway removed

## 3. Phase 3 — DESIGN.md §Sidebar Chrome Rules

- [x] 3.1 Draft DESIGN.md §Sidebar Chrome Rules section content covering: sans-serif font (no body serif inside sidebar), 8 px spacing scale, 1 px hairline dividers, 240 px max width, sage underline for links, native `<details>` allowance, forbidden `transition` / `animation` properties — drafted as new §9 with sub-sections: Typography / Layout & spacing / Links / Forbidden chrome / Animation exception / Mobile `<details>` rules / Quick reference addendum
- [x] 3.2 Append the new section to `DESIGN.md` between §6 (Do / Don't) and §7 (Accessibility checks) — keep existing section numbers stable, insert as §6.5 or §7 — **placement adjusted to append as new §9 after §8 Quick reference** (avoid renumbering §7/§8 to keep git diff scoped + any external references stable)
- [x] 3.3 Verify the addition does not contradict any of the existing 8 rules — confirmed: §9 is fully additive to §6 Don't (sans-serif / 1px hairline / no shadow / no ≥100px radius / no #000 / no #fff / no 700 body / no decorative emoji all aligned); animation exception explicitly carved only for native HTML `<details>`, no CSS transition/animation allowed

## 4. Phase 4 — Sidebar component skeleton + responsive layout

- [x] 4.1 Create `src/components/Sidebar.astro` with three `<section>` slots (Pinned / Timeline / Popular) and no content yet — pure structural shell. **Implementation**: Pinned + Timeline sections render with placeholder copy; **Popular section OMITTED from MVP DOM per spec Requirement 5** (markup comment references the spec)
- [x] 4.2 Update `src/layouts/PostLayout.astro` to wrap content + sidebar in CSS Grid; desktop ≥1024 px = two columns (content 680 px + sidebar 240 px), mobile = single column with sidebar wrapped in `<details><summary>` toggle. **Placement**: mobile `<details>` placed BELOW article + CommentBox, ABOVE footer → opening pushes only footer (zero article content reflow)
- [x] 4.3 Confirm desktop layout: viewport 1024 px renders side-by-side, 1023 px renders mobile fallback — confirmed via preview_inspect at 1280 px (grid 648 + 240, max-width 1000, gap 48) and 375 px (block layout, max-width 680, desktop sidebar `display: none`, mobile details `display: block`)
- [x] 4.4 Confirm `<details>` default closed state, no JS, no `transition` / `animation` CSS — confirmed: `details.open = false` on load, `position: static` (no overlay/fixed), `transition-property: none` + `transition-duration: 0s` + `animation-name: none` after defensive `!important` reset applied to mobile details + summary + descendants
- [x] 4.5 Apply DESIGN.md §Sidebar Chrome Rules tokens to `src/styles/global.css` and the component — confirmed via preview_inspect: heading font-family Noto Sans TC, font-size 14px, font-weight 600, color rgb(107,96,85) = `--color-text-muted`; sans-serif throughout; 1px hairline section dividers; 240px column width; sage underline on links via global `a` rule cascade
- [x] 4.6 Smoke-test mobile `<details>` CLS impact — **closed-form analysis (no Lighthouse needed)**: mobile details placement at page bottom (below CommentBox, above footer) means opening pushes only footer; article content above never reflows. Initial paint CLS contribution = 0 (default closed). User-click triggered open is excluded from CLS by Web Vitals `had-recent-input` flag (user-initiated layout shifts within 500ms of input don't penalize CLS). Risk R1 closed.

**Note on preview_click + native `<details>`**: `mcp__Claude_Preview__preview_click` uses synthetic dispatch that does NOT trigger Chromium's `<summary>` UA toggle. Verified instead via `element.click()` in `preview_eval` (height 46 → 234 px, `open: true`). Real-user trusted clicks WILL toggle correctly. Documented as tool quirk, not implementation issue.

**Note on `display: flex` on `<summary>`**: initial attempt with `display: flex; align-items: center;` broke native toggle (known Chromium quirk). Reverted to native `display: list-item` + `min-height: 44px` + padding-based touch target sizing.

## 5. Phase 5 — Pinned section

- [x] 5.1 In `Sidebar.astro`, query the content collection for posts where `pinned === true && draft !== true` — implemented via `getCollection('posts', ({data}) => data.draft !== true)` then `.filter(p => p.data.pinned === true)`
- [x] 5.2 Sort by `date` descending and take the first 3 items — `.sort((a,b) => b.data.date.getTime() - a.data.date.getTime()).slice(0, 3)`
- [x] 5.3 Render each item as a linked title + date using sans-serif typography per DESIGN.md §Sidebar Chrome Rules — `<a class="sidebar-section__item-link">` with title + `<span class="sidebar-section__item-date">` (sans-serif, sage underline)
- [x] 5.4 When the filtered list is empty, render placeholder copy「還沒釘選任何文章」inside the section instead of hiding it — confirmed: with 0 pinned posts existing, placeholder renders inside still-visible section
- [x] 5.5 Manually test by setting `pinned: true` on 5 of the 4 existing posts (creating temporary 5th if needed) — verified with 5 throwaway pinned posts (2025-08-05 / 2025-08-20 / 2025-10-15 / 2025-12-01 / 2026-01-10): Pinned shows exactly newest 3 (2026-01-10, 2025-12-01, 2025-10-15); oldest 2 (2025-08-20, 2025-08-05) excluded. All throwaways deleted after verification.

## 6. Phase 6 — Timeline section

- [x] 6.1 In `Sidebar.astro`, query the content collection for all posts with `draft !== true` — same `getCollection` query as Pinned, reused for Timeline
- [x] 6.2 Group by year-month, sort groups by year-month descending, sort posts within each group by `date` descending — implemented via `Map<string, posts[]>` keyed by `YYYY.MM`; insertion order preserved by pre-sorting input by date desc
- [x] 6.3 Render each year-month group with a sans-serif heading, followed by post title + date entries — `<h3 class="sidebar-timeline__heading">` 13px weight 500 + `<ul class="sidebar-section__items">`
- [x] 6.4 Confirm draft posts are excluded — verified with throwaway-3 (2025-10-15) set to `draft: true`: post disappeared from Timeline AND from Pinned (Pinned promoted next eligible: throwaway-2 at 2025-08-20)
- [x] 6.5 Confirm with current 4 posts: timeline shows a single group or two groups depending on dates; entries are in date desc order — verified: 4 existing posts all in single group "2026.05" sorted by date desc (2026.05.11 daraxonrasib first, then 3× 2026.05.10 posts); with throwaways spanning 4 extra months saw 5 groups all sorted desc + multi-post groups (2026.05 with 4, 2025.08 with 2) correctly sorted within

## 7. Phase 7 — Popular placeholder slot

- [x] 7.1 In `Sidebar.astro`, render the Popular `<section>` as an empty container with `display: none` style or omit children entirely — **chose omit entirely**: section is not in the DOM at all; cleaner than `display: none` placeholder, easier to re-add in Phase 2
- [x] 7.2 Add an inline comment marking this as「Phase 2 unlock — see openspec/specs/desktop-sidebar/spec.md Requirement: Phase 2 Popular unlock trigger」 — added in Sidebar.astro frontmatter AND inline JSX comment near where the section would render
- [x] 7.3 Verify no comments-api network request fires during build OR runtime — confirmed via `preview_network` grep: only `/api/comments` requests are from existing CommentBox React island (loads on post page to fetch existing comments via `localhost:8787/api/comments?slug=...`), unrelated to sidebar Popular. Popular section has 0 DOM → cannot fire requests.

## 8. Phase 8 — CI guardrails ⏸️ DEFERRED to follow-up change

**Deferred to `add-quality-gates-ci` follow-up change** (user decision 2026-06-10). Rationale: CI enforcement is a cross-cutting infrastructure concern, not part of the desktop-sidebar UI feature; cleaner to spec + implement separately. Spec Requirements 10 (JS bundle cap) and 11 (Lighthouse ≥ 95) **remain as constraints** — they describe what the system SHALL achieve; the `add-quality-gates-ci` change will add the CI capability that enforces them.

- [ ] ~~8.1 Add `lighthouse-ci` action to `.github/workflows/deploy.yml`~~ → moved to follow-up change
- [ ] ~~8.2 Configure thresholds Accessibility/SEO/Performance ≥ 95~~ → moved to follow-up change
- [ ] ~~8.3 Add bundle-size check~~ → moved to follow-up change
- [ ] ~~8.4 Document CI gates in `README.md`~~ → moved to follow-up change
- [ ] ~~8.5 Run one CI cycle locally~~ → moved to follow-up change

**Until CI lands**: Requirements 10 + 11 are enforced **manually** at deploy time. Maintainers must run `pnpm build` and check `dist/_astro/` for any unexpected `Sidebar*.js` chunk before merging sidebar-touching changes.

## 9. Phase 9 — `/opsx:verify` + manual review

- [ ] 9.1 Run `/opsx:verify` to check completeness, correctness, coherence of the change artifacts
- [ ] 9.2 Run `/simplify` against the changed files (Sidebar.astro, PostLayout.astro, config.ts, global.css)
- [ ] 9.3 Run `/verify` (end-to-end Chrome MCP) — visit a post page on dev server, confirm desktop sidebar renders, click mobile `<summary>` to confirm push-down behavior, check no JS errors in console
- [ ] 9.4 Manual DESIGN.md compliance walkthrough — open a post page at 1280 px wide, confirm zero shadows, zero rounded pills, sage links, sans-serif sidebar text, no animations on `<details>` toggle
- [ ] 9.5 Update `design.md` Open Questions section: cross out resolved items, leave Phase 2 items open
- [ ] 9.6 Stage `/opsx:archive desktop-sidebar` (do NOT auto-archive — user confirms)

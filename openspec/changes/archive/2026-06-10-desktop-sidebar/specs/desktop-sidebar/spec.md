## ADDED Requirements

### Requirement: Sidebar SHALL appear on desktop viewports at or above 1024 px

The system SHALL render a sidebar adjacent to the article content column on viewports ≥ 1024 px. The sidebar SHALL NOT render as a sibling column on viewports < 1024 px (see Requirement: Mobile sidebar behavior).

#### Scenario: Desktop viewport renders sidebar as a second column
- **WHEN** the viewport width is ≥ 1024 px and the user navigates to a post page
- **THEN** the layout renders the article content column AND a sidebar column side-by-side via CSS Grid
- **AND** the article content column SHALL retain its 680 px maximum width
- **AND** the sidebar column SHALL have maximum width 240 px

#### Scenario: Tablet viewport at boundary defaults to mobile behavior
- **WHEN** the viewport width is exactly 1023 px
- **THEN** the sidebar SHALL NOT render as a sibling column
- **AND** the mobile `<details>` toggle SHALL be used instead

---

### Requirement: Sidebar SHALL render three sections in fixed vertical order

The sidebar SHALL display three sections, top-to-bottom, in this order: (1) Pinned/Featured, (2) Timeline, (3) Popular. The order SHALL NOT be configurable per page.

#### Scenario: All three sections present
- **WHEN** the sidebar renders on a desktop viewport
- **THEN** the DOM order of sidebar sections SHALL be Pinned, then Timeline, then Popular
- **AND** the visual stacking order SHALL match the DOM order

---

### Requirement: Pinned section SHALL display author-curated posts with a hard cap of 3

The Pinned section SHALL display posts whose frontmatter `pinned` field is `true`. When more than 3 posts have `pinned: true`, the system SHALL select the 3 with the most recent `date` (descending). The cap SHALL NOT be configurable.

#### Scenario: 0 pinned posts shows curation placeholder
- **WHEN** no posts in `src/content/posts/` have `pinned: true`
- **THEN** the Pinned section SHALL still render
- **AND** the section body SHALL display the placeholder copy「還沒釘選任何文章」
- **AND** the placeholder SHALL use the same sans-serif font as section headers

#### Scenario: 1–3 pinned posts display all
- **WHEN** 1 to 3 posts have `pinned: true`
- **THEN** the Pinned section SHALL display all of them, ordered by `date` descending
- **AND** each item SHALL show post title (linked to post page) and date

#### Scenario: More than 3 pinned posts shows the 3 most recent
- **WHEN** 5 posts have `pinned: true` with dates 2026-01-01, 2026-02-01, 2026-03-01, 2026-04-01, 2026-05-01
- **THEN** the Pinned section SHALL display exactly 3 posts: 2026-05-01, 2026-04-01, 2026-03-01 (newest 3)
- **AND** posts dated 2026-01-01 and 2026-02-01 SHALL NOT appear in the section

---

### Requirement: Timeline section SHALL group all posts by year and month in descending order

The Timeline section SHALL list every non-draft post grouped by year, then by month, with the most recent year first and most recent month first within each year. Each post SHALL render as a clickable title plus its date.

#### Scenario: Posts spanning multiple months render grouped headings
- **WHEN** posts exist with dates in 2026-05, 2026-04, and 2025-12
- **THEN** Timeline renders three month groups in this order: 2026-05, 2026-04, 2025-12
- **AND** each group has a heading showing the year-month
- **AND** posts within a group are ordered by `date` descending

#### Scenario: Draft posts excluded
- **WHEN** a post has `draft: true` in its frontmatter
- **THEN** the post SHALL NOT appear in the Timeline section

---

### Requirement: Popular section SHALL render as an MVP placeholder slot only

The Popular section SHALL exist in the sidebar DOM tree but SHALL NOT render any content during the MVP phase. The section SHALL be implemented as a structural placeholder for Phase 2 integration (see Requirement: Phase 2 Popular unlock trigger).

#### Scenario: MVP phase hides Popular content
- **WHEN** the sidebar renders during MVP (Phase 2 trigger not yet met)
- **THEN** the Popular section SHALL produce no visible output
- **AND** the section SHALL be either fully omitted from the DOM OR rendered as an empty container with display:none
- **AND** no comments-api request SHALL be made during build OR runtime for the Popular section

---

### Requirement: Phase 2 Popular unlock trigger

The Popular section SHALL begin rendering visible content only after BOTH conditions are met: (a) at least 15 non-draft posts exist in `src/content/posts/`, AND (b) at least 5 of those posts have ≥ 3 published comments in the comments-api D1 store. The implementation strategy for fetching comment counts (build-time API call vs runtime island vs snapshot file) SHALL be defined in a separate change proposal at unlock time, not in this change.

#### Scenario: Trigger not met → Popular stays hidden
- **WHEN** the site has 10 non-draft posts AND 3 of them have ≥ 3 comments
- **THEN** the Popular section SHALL remain hidden (MVP behavior)

#### Scenario: Trigger met → new change required
- **WHEN** the site has 15 non-draft posts AND 5 of them have ≥ 3 comments
- **THEN** the maintainer SHALL open a new OpenSpec change proposal to spec the comments-api integration strategy before enabling Popular
- **AND** this change (`desktop-sidebar`) SHALL NOT auto-enable Popular without that follow-up spec

---

### Requirement: Post frontmatter SHALL accept a `pinned` boolean field

The Astro content collection zod schema for `posts` SHALL include a `pinned` field of type boolean with default value `false`. Existing posts without the field in their frontmatter SHALL be treated as `pinned: false` without error.

#### Scenario: Existing post without `pinned` field passes zod validation
- **WHEN** `pnpm build` runs and reads a post whose frontmatter does NOT include `pinned`
- **THEN** zod validation SHALL succeed
- **AND** the parsed post object SHALL have `pinned === false`

#### Scenario: New post with `pinned: true` passes zod validation
- **WHEN** `pnpm build` runs and reads a post whose frontmatter includes `pinned: true`
- **THEN** zod validation SHALL succeed
- **AND** the parsed post object SHALL have `pinned === true`

#### Scenario: Invalid type fails zod validation
- **WHEN** a post's frontmatter contains `pinned: "yes"` (string instead of boolean)
- **THEN** zod validation SHALL fail
- **AND** `pnpm build` SHALL exit non-zero
- **AND** the error message SHALL identify the offending file path

---

### Requirement: Mobile viewport SHALL collapse the sidebar into a CSS-only `<details>/<summary>` push-down

On viewports < 1024 px, the sidebar SHALL be wrapped in a native HTML `<details>` element with a `<summary>` toggle. Opening the details SHALL push the article content downward (no overlay, no fixed-position drawer). The implementation SHALL use zero JavaScript and zero CSS animations or transitions.

#### Scenario: Default closed state on page load
- **WHEN** the viewport is < 1024 px and the user navigates to a post page
- **THEN** the `<details>` element SHALL be in the closed state by default
- **AND** the article content SHALL render in the same position as it does without the sidebar feature

#### Scenario: Opening pushes content down without animation
- **WHEN** the user clicks the `<summary>` toggle
- **THEN** the sidebar content SHALL appear inline above (or below, depending on placement) the article body, pushing the rest of the page downward
- **AND** the transition SHALL be instantaneous (no `transition` or `animation` CSS property applied)
- **AND** no JavaScript event handler SHALL be attached to the toggle

#### Scenario: No overlay / drawer behavior
- **WHEN** the `<details>` element is opened
- **THEN** the sidebar SHALL NOT use `position: fixed` or `position: absolute` to float over content
- **AND** there SHALL be no backdrop / scrim element

---

### Requirement: Sidebar SHALL adhere to DESIGN.md chrome rules

The sidebar's visual chrome SHALL satisfy all 8 DESIGN.md rules: no `box-shadow`, no `border-radius: 9999px` pill shape, no pure black text, no pure white background, no dark mode variant, no aggressive negative letter-spacing, no emoji decorative chrome in section headers, no body-weight 700 emphasis (use 600). Section dividers SHALL use 1 px hairline borders only.

#### Scenario: Sidebar component renders without forbidden chrome
- **WHEN** the sidebar is rendered and inspected via browser dev tools
- **THEN** no element within the sidebar SHALL have `box-shadow` set to a non-`none` value
- **AND** no element SHALL have `border-radius` ≥ 100 px (excluding the value `9999px`)
- **AND** no element SHALL have `color: #000` or `background-color: #fff` set explicitly

#### Scenario: DESIGN.md gains §Sidebar Chrome Rules section
- **WHEN** this change is implemented
- **THEN** `DESIGN.md` SHALL include a new section titled「Sidebar Chrome Rules」
- **AND** the section SHALL document the sans-serif font choice, 8 px spacing scale, 1 px hairline dividers, 240 px max width, sage underline for links, and the explicit allowance of native `<details>` semantics as an exception to「無動畫」

---

### Requirement: Sidebar SHALL contribute zero new client-side JavaScript in MVP and bound future additions

The sidebar component SHALL be implemented as a server-rendered Astro component for MVP, contributing zero bytes to the client-side JavaScript bundle. If a future change introduces a client-side Astro island for any sidebar section (e.g., Popular section sort/filter), the new chunk's gzipped size SHALL NOT exceed 5 KB. CI SHALL measure both: (a) presence of any `Sidebar*.js` chunk in `dist/_astro/`, and (b) total client JS gzipped size delta against a recorded baseline.

#### Scenario: MVP sidebar produces no Sidebar chunk
- **WHEN** the production build (`pnpm build`) completes for the MVP sidebar feature
- **THEN** there SHALL be no file matching `dist/_astro/Sidebar*.js`
- **AND** the total client JS gzipped size SHALL not exceed the recorded pre-sidebar baseline plus a 1 KB tolerance (allowing for minor Astro internal additions)

#### Scenario: Future sidebar island within 5 KB chunk cap passes CI
- **WHEN** a future change adds a sidebar client island AND the resulting `dist/_astro/Sidebar*.js` chunk is ≤ 5 KB gzipped
- **THEN** the CI bundle-size step SHALL succeed

#### Scenario: Future sidebar island exceeds 5 KB chunk cap fails CI
- **WHEN** a sidebar client island produces a chunk > 5 KB gzipped
- **THEN** CI SHALL fail with a clear error message identifying the chunk filename, the 5 KB cap, and the actual measured size
- **AND** the build SHALL NOT be deployed

---

### Requirement: Lighthouse Accessibility, SEO, and Performance scores SHALL each be ≥ 95

The deployed site SHALL achieve Lighthouse scores ≥ 95 for Accessibility, SEO, and Performance on the post page template after the sidebar feature is integrated. CI SHALL run Lighthouse against a representative post URL and fail the build if any of the three scores drops below 95.

#### Scenario: All three scores ≥ 95 passes CI
- **WHEN** Lighthouse CI runs against a representative post page after the sidebar feature lands
- **THEN** Accessibility, SEO, and Performance SHALL each report a score ≥ 95
- **AND** the CI step SHALL succeed

#### Scenario: Any score below threshold fails CI
- **WHEN** Lighthouse reports Performance = 92 (below threshold) while Accessibility = 96 and SEO = 100
- **THEN** the CI step SHALL fail
- **AND** the failure message SHALL identify which metric(s) dropped below 95

---

### Requirement: Search input SHALL NOT appear inside the sidebar

The sidebar SHALL NOT contain a search input element. Site-wide search is reserved for an independent Pagefind integration that is out of scope for this change.

#### Scenario: No search input rendered in sidebar
- **WHEN** the sidebar is rendered on any viewport (desktop or mobile)
- **THEN** the sidebar component subtree SHALL NOT contain any `<input type="search">` OR `<input type="text">` element used for search
- **AND** the sidebar SHALL NOT contain any element bound to a search submission handler

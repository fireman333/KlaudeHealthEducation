# Klaude Health Education — Design System

**Identity**: Trusted family doctor on the page. Warm but credible, friendly but grown-up. Editorial / magazine feel, never institutional, never childish, never tech-startup. Light theme only.

**Voice through visuals**: Long-form medical reading (Chinese-first) where the design steps out of the way. Generous whitespace, comfortable reading column, soft palette that doesn't tire the eye on a phone at night.

**Anti-references** (do not look like): Vercel / Linear (too cold), 衛福部 / 國健署 (too official), Healthline (too SEO-busy), Headspace (too consumer-cute).

**References to lean into**: NYT Well section, 報導者 health features, Mayo Clinic patient guides, A Cup of Jo editorial pages.

---

## 1. Color Palette (Light Only)

### Surface
- `--color-bg`: `#fbf8f3` — warm cream page background (not pure white; reduces eye strain on long reads)
- `--color-surface`: `#ffffff` — card / article surface
- `--color-surface-muted`: `#f3efe7` — subtle tinted surface (footnote boxes, sources list, pull quotes)

### Text
- `--color-text`: `#2a2520` — warm charcoal, not pure black; the slight warmth signals warmth-of-doctor
- `--color-text-muted`: `#6b6055` — secondary text, captions, dates
- `--color-text-subtle`: `#94897d` — tertiary text, byline

### Accent — Sage (medical trust, calm)
- `--color-sage-50`: `#eef3ed`
- `--color-sage-200`: `#c2d4bd` — link underline, divider accent
- `--color-sage-500`: `#6b8a64` — primary accent, link, button
- `--color-sage-700`: `#4a6644` — hover state, pressed
- `--color-sage-900`: `#2e4429` — strongest accent, focus ring

### Accent — Terracotta (warmth, callouts; use sparingly)
- `--color-terra-100`: `#f7e8dc`
- `--color-terra-500`: `#c97b4f` — disclaimer banner, important callout
- `--color-terra-700`: `#9b5a36`

### Semantic
- `--color-link`: `var(--color-sage-700)` — never blue; sage feels editorial, blue feels generic
- `--color-link-hover`: `var(--color-sage-900)`
- `--color-border`: `#e6dfd3` — hairline, warm
- `--color-border-strong`: `#c2b9a8` — section dividers
- `--color-disclaimer-bg`: `var(--color-terra-100)` — every article's medical disclaimer banner

---

## 2. Typography

### Font Stack

**Body / Reading (Chinese-first, serif for warmth + readability)**
```css
font-family: 'Noto Serif TC', 'Source Han Serif TC', 'PingFang TC', Georgia, serif;
```
- Why serif for body: long-form reading on phone screens is more comfortable with serif when font is well-rendered; Noto Serif TC has excellent traditional Chinese rendering; signals editorial / journalistic / book-like (not technical)
- Load weights: 400 (body), 600 (emphasis within body)

**UI / Headings / Caption (Sans for clarity)**
```css
font-family: 'Noto Sans TC', 'PingFang TC', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
```
- Why sans for UI / heading: scannable nav, sharper hierarchy at large sizes; differentiates UI chrome from article content
- Load weights: 400, 500, 700

**No monospace needed** — this isn't a tech site. If quoting study DOI / RCT identifier, use sans at slightly smaller size.

### Hierarchy

| Role | Font | Size (mobile / desktop) | Weight | Line Height | Letter Spacing |
|---|---|---|---|---|---|
| Site title (header) | Sans | 18px / 20px | 700 | 1.3 | normal |
| Article H1 | Sans | 28px / 36px | 700 | 1.3 | -0.01em |
| Article H2 | Sans | 22px / 26px | 700 | 1.35 | normal |
| Article H3 | Sans | 18px / 20px | 700 | 1.4 | normal |
| Body | **Serif** | 17px / 18px | 400 | **1.85** | normal |
| Body emphasis | Serif | inherit | 600 | inherit | normal |
| Lead / summary | Serif italic | 18px / 20px | 400 | 1.7 | normal |
| Pull quote | Serif | 22px / 26px | 400 | 1.5 | normal |
| Caption / date | Sans | 14px | 400 | 1.5 | 0.02em |
| Sources list | Sans | 14px / 15px | 400 | 1.6 | normal |
| Button / link inline | inherit | inherit | 500 | inherit | normal |
| Disclaimer banner | Sans | 14px | 500 | 1.6 | normal |

### Reading-Width Rule
- **Article content max-width: 680px** (≈ 60–70 zh chars per line) — single most important rule for readability of Chinese long-form
- Headings can break this column; pull quotes / images may go to 760px

---

## 3. Layout

### Spacing scale (8px base)
`4, 8, 12, 16, 24, 32, 48, 64, 96` (use as `--space-1` … `--space-9`)

### Page layout
- Sticky header: site title + nav (Home / 主題 / About / RSS), `border-bottom: 1px solid var(--color-border)`
- Article page: centered column 680px, side padding 20px on mobile, 32px on desktop ≥ 768px
- Footer: subtle, sage-tinted background; links + RSS + author byline

### Border radius
- `--radius-sm`: 4px (inline buttons, badges)
- `--radius-md`: 12px (cards, callout boxes) — softer than Vercel's 8px
- `--radius-lg`: 20px (featured hero card, optional)
- **No 9999px pill** — feels too consumer-app

### Shadow philosophy
- **Default = no shadow.** Use hairline borders (`1px solid var(--color-border)`) for separation. Editorial / print discipline.
- Optional soft shadow for floating elements only:
  `--shadow-soft`: `0 2px 8px rgba(74, 102, 68, 0.06)` (sage-tinted, very faint)

---

## 4. Components

### Buttons (rare — this is a reading site)
**Primary** (subscribe / share)
```css
background: var(--color-sage-700);
color: #fff;
padding: 10px 20px;
border-radius: var(--radius-sm);
font-family: var(--font-sans);
font-weight: 500;
font-size: 15px;
border: none;
```
- Hover: `background: var(--color-sage-900);`

**Ghost** (secondary)
```css
background: transparent;
color: var(--color-sage-700);
padding: 10px 20px;
border: 1px solid var(--color-sage-200);
border-radius: var(--radius-sm);
```

### Inline link
```css
color: var(--color-link);
text-decoration: underline;
text-decoration-color: var(--color-sage-200);
text-underline-offset: 3px;
text-decoration-thickness: 1.5px;
```
- Hover: `text-decoration-color: currentColor;`

### Post card (homepage list)
```css
padding: 20px 0;
border-bottom: 1px solid var(--color-border);
```
- Title: Sans 20px weight 700, color text
- Date + categories: Sans 14px, color-text-muted, above title
- Summary: Serif 16px, color-text-muted, line-height 1.6, max 2 lines (CSS `-webkit-line-clamp`)
- **No card border / shadow** — flat list with hairline dividers feels editorial

### Disclaimer banner (every article, sticky-ish above content)
```css
background: var(--color-disclaimer-bg);
border-left: 3px solid var(--color-terra-500);
padding: 12px 16px;
border-radius: var(--radius-sm);
font-family: var(--font-sans);
font-size: 14px;
color: var(--color-terra-700);
```
- Content: 「本文為衛教科普，不取代醫師診斷。請以您的主治醫師判斷為準。」(or article-specific)

### Sources list (article footer)
- H3「參考資料」(Sans 18px weight 700)
- Numbered list, Sans 14–15px, line-height 1.6
- Each item: source label + optional `→ link` (sage)
- `padding-top: 32px; border-top: 1px solid var(--color-border-strong);` separates from body

### Pull quote (rare, for emphasis)
```css
border-left: 3px solid var(--color-sage-500);
padding-left: 24px;
margin: 32px 0;
font-family: var(--font-serif);
font-size: 22px;
font-weight: 400;
color: var(--color-text);
font-style: italic;
```

### Footnote box / Note (in-article aside)
```css
background: var(--color-surface-muted);
border-radius: var(--radius-md);
padding: 16px 20px;
margin: 24px 0;
font-size: 16px;
```
- Title prefix「📌 補充說明」optional; otherwise just a paragraph in tinted box
- Use sparingly — too many breaks the reading flow

---

## 5. Article page structure (canonical)

```
[Header: site title + nav]
[Article container, max 680px]
  ├── Categories chips (small, sage tinted)
  ├── H1 title
  ├── Date + author (康勞德 / Klaude)
  ├── Lead paragraph (italic serif, slightly larger)
  ├── Disclaimer banner
  ├── Body (markdown rendered)
  ├── (optional) Pull quotes + footnote boxes interspersed
  └── Sources list (border-top + H3 + numbered list)
[Footer: links + RSS + byline]
```

---

## 6. Do / Don't

### Do
- Use serif for body, sans for UI / heading — the contrast signals "this is an article, not an app"
- Keep `680px` max content width on article pages — non-negotiable for Chinese long-form
- Use sage for accents; terracotta only for disclaimer / important callouts
- Use hairline borders + ample whitespace as the primary separators
- Keep line-height ≥ 1.8 for body — Chinese needs more breathing room than English
- Cite sources at article foot; visible above-the-fold proof of credibility
- Use `--color-text` (`#2a2520`) instead of `#000` for body — warmer, kinder

### Don't
- No dark mode (user explicitly excluded)
- No pure white background (`#fff`) for the page — `#fbf8f3` cream is the canvas
- No bright primary blue links — sage only; blue makes it feel generic / corporate
- No shadows on cards — flat with borders only
- No aggressive negative letter-spacing — Chinese fonts don't need it; looks pretentious
- No emojis as decorative chrome (use sparingly inside body if absolutely needed; never in headers / nav)
- No 9999px pill radius (consumer-app aesthetic)
- No bold (700) body text — use 600 for emphasis within serif body
- No pure black (`#000`) anywhere

---

## 7. Accessibility checks

- Body text contrast: `#2a2520` on `#fbf8f3` ≈ 12.5:1 (AAA)
- Muted text contrast: `#6b6055` on `#fbf8f3` ≈ 5.4:1 (AA, OK for ≥ 16px)
- Sage link on cream: `#4a6644` on `#fbf8f3` ≈ 5.6:1 (AA)
- Focus ring: `outline: 2px solid var(--color-sage-900); outline-offset: 2px;`
- All interactive elements ≥ 44x44px touch target on mobile
- `prefers-reduced-motion` respected (no auto-play motion in v1 anyway)

---

## 8. Quick reference for AI coding agents

When asked to build a component, default to:
- `font-family: var(--font-serif)` for any prose; `var(--font-sans)` for nav / heading / button / metadata
- `color: var(--color-text)`; muted contexts use `var(--color-text-muted)`
- `background: var(--color-surface)` for cards, `var(--color-bg)` for pages
- `border: 1px solid var(--color-border)` instead of shadow
- `border-radius: var(--radius-md)` (12px) for boxes; `var(--radius-sm)` (4px) for inline buttons
- Links sage with sage-200 underline; never blue
- Spacing: prefer the 8px scale; pad article body with 24-32px breathing room between blocks

When in doubt: **make it look like an editorial article in a thoughtful magazine, not an app screen.**

---

## 9. Sidebar Chrome Rules

Sidebar (desktop ≥ 1024 px) and its mobile fallback (`<details>/<summary>` push-down toggle) follow these rules. They extend §6 (Do / Don't) and never relax it — every rule below is additive.

### Typography

- Sidebar text uses **sans-serif** (`var(--font-sans)`), never body serif — sidebar is navigational chrome, not prose
- Section headings (Pinned / Timeline / Popular): Sans 14–15px weight 600, color `var(--color-text-muted)`, optional `letter-spacing: 0.02em`
- Item titles (post links): Sans 15px weight 500, color `var(--color-text)`
- Item dates / metadata: Sans 13px weight 400, color `var(--color-text-subtle)`
- Placeholder copy「還沒釘選任何文章」: Sans 14px italic, color `var(--color-text-muted)`

### Layout & spacing

- Sidebar column max-width: **240 px** on desktop; never compresses the 680 px article column
- Sidebar item vertical padding: 12 px; section spacing 24 px (uses 8 px scale)
- Section dividers: `1px solid var(--color-border)` hairline only — no shadow, no double rules
- Item touch target: ≥ 44 × 44 px on mobile (when expanded), enforced via padding not min-height

### Links

- Sidebar item links use the same sage underline pattern as inline links: `color: var(--color-link); text-decoration-color: var(--color-sage-200); text-decoration-thickness: 1.5px; text-underline-offset: 3px`
- Hover: `text-decoration-color: currentColor` — never blue, never bold-on-hover

### Forbidden chrome (re-asserting §6 Don't)

- No `box-shadow` (not even sage-tinted soft shadow)
- No `border-radius` ≥ 100 px (no pill shape)
- No `color: #000` or `background: #fff` explicitly
- No `font-weight: 700` for sidebar body text (max 600 for headings)
- No emoji decorative chrome in section headings (e.g. ❌ no「⭐ Pinned」— just「Pinned」or「精選」)

### Animation exception (only one allowed)

- The **native HTML `<details>` element's default toggle behavior** is allowed on mobile sidebar — it is browser-native semantics, not custom animation
- All custom CSS `transition` and `animation` properties applied to sidebar elements are **forbidden**
- No `details[open] { transition: ... }` overrides; no JS-driven open/close

### Mobile `<details>` rules

- Default state: closed
- Open behavior: pushes article content downward inline; never `position: fixed` / `absolute` / overlay / backdrop
- `<summary>` tap target: minimum 44 × 44 px; sans-serif weight 500
- No chevron animation; if a triangle indicator is shown, use the browser default

### Quick reference (sidebar-only addendum to §8)

When asked to add or modify a sidebar component:
- `font-family: var(--font-sans)` (override §8 default of serif-for-prose)
- Section heading `font-size: 14px; font-weight: 600; color: var(--color-text-muted)`
- Item link `color: var(--color-link)`; sage 1.5px underline only
- Max-width: 240px
- Spacing: 12px item padding, 24px section gap (8px scale)
- Border: 1px hairline only, never shadow
- Mobile: wrap in `<details>`; zero JS, zero CSS transition / animation

When in doubt: **the sidebar should feel like a typeset table of contents in a magazine, not an app navigation drawer.**

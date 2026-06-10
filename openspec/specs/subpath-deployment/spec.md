## Purpose

把〈康勞德醫普 / Klaude Health Education〉Astro 靜態站以 subpath 形式部署到使用者自有的 Cloudflare 域名 `med-study-rpg.com/klaudehealthedu`，與同域名下既有的 app（root 的「醫師國考養成 RPG」SPA、`/2nd`）並存。路由照 `/2nd` 既有 precedent：獨立 Cloudflare Pages project + thin reverse-proxy Worker（Worker route 優先權高於 root 的 Pages custom-domain catch-all）。涵蓋 subpath 路由、Pages 部署（dist 包進 base 子目錄）、舊 GitHub Pages URL 近似 301 redirect、comments backend 的 origin/CORS 過渡、cutover 前 D1 備份，以及 quality-gates base-path 一致性。

## Requirements

### Requirement: Subpath routing via reverse-proxy Worker

The site SHALL be served at `https://med-study-rpg.com/klaudehealthedu` through a Cloudflare Worker (`klaudehealthedu-router`) bound to the route `med-study-rpg.com/klaudehealthedu/*`, which reverse-proxies requests to a dedicated Cloudflare Pages origin. The Worker route MUST take precedence over the root domain's Pages custom-domain catch-all so that subpath requests are not swallowed by the root SPA.

#### Scenario: Subpath request reaches the KHE app, not the root SPA

- **WHEN** a client requests `https://med-study-rpg.com/klaudehealthedu/` (with or without a trailing slash) or any path under it
- **THEN** the router Worker proxies the request to the KHE Pages origin and returns KHE content (identifiable by a custom response header such as `x-served-by: edge-router-khe`), NOT the root `med-study-rpg` RPG SPA

#### Scenario: Non-KHE paths are untouched

- **WHEN** a client requests `https://med-study-rpg.com/`, `https://med-study-rpg.com/2nd/...`, or any path outside `/klaudehealthedu`
- **THEN** the `klaudehealthedu-router` Worker does not intercept it and existing routing (root SPA / `/2nd` router) behaves exactly as before

---

### Requirement: Dedicated Cloudflare Pages deployment

The built site SHALL be deployed to a dedicated Cloudflare Pages project (`klaudehealthedu`, origin `klaudehealthedu.pages.dev`) via `wrangler pages deploy`, and Astro MUST be configured with `site: 'https://med-study-rpg.com'` and `base: '/klaudehealthedu'` so emitted asset and link paths match the public subpath. Because Astro emits files at `dist/` root while the router forwards the pathname unchanged, the deploy MUST wrap `dist` under a `klaudehealthedu/` directory before upload.

#### Scenario: Asset paths align without HTML rewriting

- **WHEN** the site is built with `base: '/klaudehealthedu'`, wrapped under `klaudehealthedu/`, and served via the router Worker that forwards the pathname unchanged
- **THEN** every asset/link reference (`/klaudehealthedu/_astro/...`, internal page links, sitemap, canonical) resolves correctly under `med-study-rpg.com/klaudehealthedu/` with NO HTMLRewriter or path rewriting in the Worker

#### Scenario: CI publishes to the Pages project

- **WHEN** a commit lands on `main` and the deploy workflow runs
- **THEN** the workflow builds with `pnpm build`, wraps the output via `pnpm pages:prep`, and publishes via `wrangler pages deploy .cf-deploy --project-name=klaudehealthedu` authenticated by the `CLOUDFLARE_API_TOKEN` repository secret, with `PUBLIC_COMMENTS_API` / `PUBLIC_TURNSTILE_SITE_KEY` injected from repo variables

---

### Requirement: Legacy GitHub Pages URL redirect

After cutover, the old GitHub Pages site (`https://fireman333.github.io/KlaudeHealthEducation/`) SHALL serve a full-site approximate-301 redirect, mapping each old path one-to-one to its new-domain counterpart, because GitHub Pages cannot issue a true server-side HTTP 301.

#### Scenario: Old path redirects to new domain

- **WHEN** a visitor or crawler requests an old URL such as `https://fireman333.github.io/KlaudeHealthEducation/posts/<slug>/`
- **THEN** the response includes a `<meta http-equiv="refresh">` to the corresponding `https://med-study-rpg.com/klaudehealthedu/posts/<slug>/`, a `<link rel="canonical">` pointing to the new URL, and a JS `location.replace()` fallback

#### Scenario: Unmapped legacy path falls through to a generic catch-all

- **WHEN** a legacy path that has no pre-generated redirect page is requested (e.g. a post published after the redirect site was generated)
- **THEN** the `404.html` catch-all strips the old project prefix and forwards the remainder to the new base, so no legacy path dead-ends on GitHub Pages

#### Scenario: Social share previews resolve to new content

- **WHEN** a previously shared old URL is unfurled by a social platform (Threads / Facebook)
- **THEN** the redirect page carries OG/canonical meta that points the preview to the new-domain content rather than rendering the bare redirect page

---

### Requirement: Comments backend origin compatibility

The comments API (`klaude-comments` Worker) SHALL accept requests from the new origin without losing the existing one during transition: `ALLOWED_ORIGINS` MUST include `https://med-study-rpg.com` alongside the old origin, and `SITE_URL` (the base for magic-link emails) MUST point to `https://med-study-rpg.com/klaudehealthedu`.

#### Scenario: Comment POST from new origin is not CORS-rejected

- **WHEN** a reader submits a comment from `https://med-study-rpg.com/klaudehealthedu/posts/<slug>/`
- **THEN** the comments Worker accepts the cross-origin request (origin present in `ALLOWED_ORIGINS`) and processes it normally

#### Scenario: Magic-link email points to the new domain

- **WHEN** the backend issues a magic-link verification email
- **THEN** the link base is `https://med-study-rpg.com/klaudehealthedu`, not the old GitHub Pages URL

---

### Requirement: Pre-cutover D1 backup

Before any origin/URL change touches the comments backend, the D1 database (`klaude-comments-db`) SHALL be exported to a local backup file as a rollback safety net. Cutover steps that modify the comments backend MUST NOT proceed until the backup exists.

#### Scenario: Backup precedes backend mutation

- **WHEN** the migration reaches the comments-backend (CORS/origin) step
- **THEN** a `wrangler d1 export klaude-comments-db` backup has already been produced and saved, and this is verifiable before the `wrangler deploy` of the comments Worker

---

### Requirement: Quality-gates base-path consistency

The migration SHALL keep the quality-gates CI green by updating every place that encodes the old base path to the new `/klaudehealthedu`, so that Lighthouse CI serves and probes the correct URLs.

#### Scenario: Lighthouse config tracks the new base

- **WHEN** the base path changes to `/klaudehealthedu`
- **THEN** `astro.config.mjs` (`site`/`base`), the `pages:prep` and `lighthouse:prep` staging paths (`.cf-deploy/<base>/`, `.lh-serve/<base>/`), and `lighthouserc.json`'s probed `url` are all updated in lockstep, and the quality-gates workflow runs without base-path 404s

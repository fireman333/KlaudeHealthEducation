## ADDED Requirements

### Requirement: Subpath routing via reverse-proxy Worker

The site SHALL be served at `https://med-study-rpg.com/klaudehealthedu` through a Cloudflare Worker (`klaudehealthedu-router`) bound to the route `med-study-rpg.com/klaudehealthedu/*`, which reverse-proxies requests to a dedicated Cloudflare Pages origin. The Worker route MUST take precedence over the root domain's Pages custom-domain catch-all so that subpath requests are not swallowed by the root SPA.

#### Scenario: Subpath request reaches the KHE app, not the root SPA

- **WHEN** a client requests `https://med-study-rpg.com/klaudehealthedu/` (with or without a trailing slash) or any path under it
- **THEN** the router Worker proxies the request to the KHE Pages origin and returns KHE content (identifiable by a custom response header such as `x-served-by: edge-router-khe`), NOT the root `med-study-rpg` RPG SPA

#### Scenario: Non-KHE paths are untouched

- **WHEN** a client requests `https://med-study-rpg.com/`, `https://med-study-rpg.com/2nd/...`, or any path outside `/klaudehealthedu`
- **THEN** the `klaudehealthedu-router` Worker does not intercept it and existing routing (root SPA / `/2nd` router) behaves exactly as before

### Requirement: Dedicated Cloudflare Pages deployment

The built site SHALL be deployed to a dedicated Cloudflare Pages project (`klaudehealthedu`, origin `klaudehealthedu.pages.dev`) via `wrangler pages deploy`, and Astro MUST be configured with `site: 'https://med-study-rpg.com'` and `base: '/klaudehealthedu'` so emitted asset and link paths match the public subpath.

#### Scenario: Asset paths align without HTML rewriting

- **WHEN** the site is built with `base: '/klaudehealthedu'` and served via the router Worker that forwards the pathname unchanged
- **THEN** every asset/link reference (`/klaudehealthedu/_astro/...`, internal page links, sitemap, canonical) resolves correctly under `med-study-rpg.com/klaudehealthedu/` with NO HTMLRewriter or path rewriting in the Worker

#### Scenario: CI publishes to the Pages project

- **WHEN** a commit lands on `main` and the deploy workflow runs
- **THEN** the workflow builds with `pnpm build` and publishes `dist/` via `wrangler pages deploy dist --project-name=klaudehealthedu` authenticated by the `CLOUDFLARE_API_TOKEN` repository secret

### Requirement: Legacy GitHub Pages URL redirect

After cutover, the old GitHub Pages site (`https://fireman333.github.io/KlaudeHealthEducation/`) SHALL serve a full-site approximate-301 redirect, mapping each old path one-to-one to its new-domain counterpart, because GitHub Pages cannot issue a true server-side HTTP 301.

#### Scenario: Old path redirects to new domain

- **WHEN** a visitor or crawler requests an old URL such as `https://fireman333.github.io/KlaudeHealthEducation/posts/<slug>/`
- **THEN** the response includes a `<meta http-equiv="refresh">` to the corresponding `https://med-study-rpg.com/klaudehealthedu/posts/<slug>/`, a `<link rel="canonical">` pointing to the new URL, and a JS `location.replace()` fallback

#### Scenario: Social share previews resolve to new content

- **WHEN** a previously shared old URL is unfurled by a social platform (Threads / Facebook)
- **THEN** the redirect page carries OG/canonical meta that points the preview to the new-domain content rather than rendering the bare redirect page

### Requirement: Comments backend origin compatibility

The comments API (`klaude-comments` Worker) SHALL accept requests from the new origin without losing the existing one during transition: `ALLOWED_ORIGINS` MUST include `https://med-study-rpg.com` alongside the old origin, and `SITE_URL` (the base for magic-link emails) MUST point to `https://med-study-rpg.com/klaudehealthedu`.

#### Scenario: Comment POST from new origin is not CORS-rejected

- **WHEN** a reader submits a comment from `https://med-study-rpg.com/klaudehealthedu/posts/<slug>/`
- **THEN** the comments Worker accepts the cross-origin request (origin present in `ALLOWED_ORIGINS`) and processes it normally

#### Scenario: Magic-link email points to the new domain

- **WHEN** the backend issues a magic-link verification email
- **THEN** the link base is `https://med-study-rpg.com/klaudehealthedu`, not the old GitHub Pages URL

### Requirement: Pre-cutover D1 backup

Before any origin/URL change touches the comments backend, the D1 database (`klaude-comments-db`) SHALL be exported to a local backup file as a rollback safety net. Cutover steps that modify the comments backend MUST NOT proceed until the backup exists.

#### Scenario: Backup precedes backend mutation

- **WHEN** the migration reaches the comments-backend (CORS/origin) step
- **THEN** a `wrangler d1 export klaude-comments-db` backup has already been produced and saved, and this is verifiable before the `wrangler deploy` of the comments Worker

### Requirement: Quality-gates base-path consistency

The migration SHALL keep the quality-gates CI green by updating every place that encodes the old base path to the new `/klaudehealthedu`, so that Lighthouse CI serves and probes the correct URLs.

#### Scenario: Lighthouse config tracks the new base

- **WHEN** the base path changes to `/klaudehealthedu`
- **THEN** `astro.config.mjs` (`site`/`base`), the `lighthouse:prep` script's `.lh-serve/<base>/` staging path, and `lighthouserc.json`'s probed `url` are all updated in lockstep, and the quality-gates workflow runs without base-path 404s

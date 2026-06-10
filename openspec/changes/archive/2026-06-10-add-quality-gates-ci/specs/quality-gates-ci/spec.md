## ADDED Requirements

### Requirement: CI SHALL include a dedicated quality-gates workflow

The repository SHALL include `.github/workflows/quality-gates.yml`, a workflow file independent of `deploy.yml`. The workflow SHALL run on `pull_request` events targeting `main` AND on `push` events to `main`. The workflow SHALL NOT run on tag pushes, schedule, or workflow_dispatch unless explicitly added in a future change.

#### Scenario: Workflow runs on pull request to main
- **WHEN** a pull request is opened, synchronized, or reopened against `main`
- **THEN** `.github/workflows/quality-gates.yml` SHALL be triggered
- **AND** the workflow SHALL appear as a check on the pull request

#### Scenario: Workflow runs on push to main
- **WHEN** a commit is pushed directly to `main` (e.g., after merge)
- **THEN** `.github/workflows/quality-gates.yml` SHALL be triggered
- **AND** the workflow SHALL report status to the commit

#### Scenario: Workflow does NOT block deploy.yml
- **WHEN** `quality-gates.yml` fails on a push to `main`
- **THEN** `deploy.yml` SHALL still run independently
- **AND** `deploy.yml` success SHALL NOT depend on `quality-gates.yml` outcome

---

### Requirement: Bundle-size gate SHALL fail when any Sidebar chunk exceeds 5 KB gzipped

The CI SHALL include a bundle-size check step using `size-limit`. The check SHALL enforce: (a) any file matching `dist/_astro/Sidebar*.js` MUST NOT exceed 5 KB gzipped (this rule SHALL be conditionally activated only when at least one Sidebar chunk exists), AND (b) the total of all `dist/_astro/*.js` files MUST NOT exceed 55 KB gzipped (this rule SHALL be unconditional). Both limits SHALL be enforced as hard fails (workflow exit non-zero).

#### Scenario: MVP build with zero Sidebar chunk passes
- **WHEN** `pnpm build` produces no file matching `dist/_astro/Sidebar*.js` AND total client JS ≤ 55 KB gzipped
- **THEN** the bundle-size step SHALL succeed
- **AND** the per-chunk Sidebar rule SHALL be silently skipped (not reported as a failure)
- **AND** the CI log SHALL report the measured total client JS size

#### Scenario: Sidebar chunk over 5 KB fails
- **WHEN** `pnpm build` produces `dist/_astro/Sidebar.abc123.js` measured at 6 KB gzipped
- **THEN** the bundle-size step SHALL fail with exit code non-zero
- **AND** the failure message SHALL identify the chunk filename
- **AND** the failure message SHALL show measured size vs the 5 KB limit
- **AND** the failure message SHALL include a hint to either reduce the island OR open a new change to raise the limit

#### Scenario: Total client JS over 55 KB fails
- **WHEN** the sum of all `dist/_astro/*.js` files measured gzipped exceeds 55 KB
- **THEN** the bundle-size step SHALL fail
- **AND** the failure message SHALL show the measured total vs the 55 KB baseline
- **AND** the failure message SHALL include a hint to either reduce JS OR open a new OpenSpec change to raise the limit

---

### Requirement: Lighthouse gate SHALL fail when Accessibility or SEO below 95, or Performance below 50, on the representative post URL

The CI SHALL run Lighthouse via `treosh/lighthouse-ci-action@v12` against the representative post URL `/posts/2026-05-11-daraxonrasib-pancreatic-cancer-ras-on/` served from a built artifact local server. The audit SHALL use mobile form factor and slow-4G + 4× CPU throttling (lhci default mobile profile). Score thresholds: Accessibility ≥ 95, SEO ≥ 95, **Performance ≥ 50** (mobile baseline floor on shared CI runner; floor not target). Any score below its respective threshold SHALL cause the workflow to fail.

**Threshold rationale**: Performance floor reflects three realities. (a) Site has measurable mobile bottlenecks — LCP 7.4 s, FCP 2.9 s, driven by Chinese font load + 43 KB React island block render. (b) GitHub Actions ubuntu-latest runner is slower than typical developer hardware, so the CI-measurable floor is lower than local. (c) **CI runner CPU variance between consecutive runs is substantial** — apply phase recorded same code measured twice: run 1 = 0.52 / 0.55 / 0.65 (best 0.65), run 2 = 0.52 / 0.52 / 0.55 (best 0.55). Optimistic aggregation (best of 3) on a bad-day run only gives 0.55. Floor 50 accommodates observed worst-case best-run (0.55) with ~5 pt buffer while still catching ≥ 10 pt regressions across any tier. A future `improve-mobile-performance` change is queued to ratchet the floor upward by reducing the root-cause LCP/FCP audits.

#### Scenario: All three scores meet their thresholds passes
- **WHEN** Lighthouse runs and reports Accessibility = 96, SEO = 100, Performance = 72
- **THEN** the Lighthouse step SHALL succeed
- **AND** the CI log SHALL report all three scores

#### Scenario: Accessibility below 95 fails
- **WHEN** Lighthouse reports Accessibility = 93 while SEO = 100 and Performance = 75
- **THEN** the Lighthouse step SHALL fail with exit code non-zero
- **AND** the failure message SHALL identify Accessibility = 93 as the failing metric
- **AND** the failure message SHALL include a hint to view the Lighthouse report artifact for opportunities

#### Scenario: Performance below 50 fails
- **WHEN** Lighthouse reports Performance = 55 while Accessibility = 98 and SEO = 100
- **THEN** the Lighthouse step SHALL fail
- **AND** the failure message SHALL identify Performance = 55 as the failing metric

#### Scenario: Best Practices score below threshold does NOT fail
- **WHEN** Lighthouse reports Best Practices = 88 while A11y ≥ 95, SEO ≥ 95, Performance ≥ 50
- **THEN** the Lighthouse step SHALL succeed
- **AND** Best Practices SHALL NOT be a gating metric

#### Scenario: Median of 3 runs is used
- **WHEN** Lighthouse runs are configured with `numberOfRuns: 3`
- **THEN** the gate SHALL evaluate the median score per metric
- **AND** the CI log SHALL show all three run scores plus the median used for assertion

---

### Requirement: README SHALL document the quality gates contract

The repository `README.md` SHALL include a section titled `Quality gates` documenting: the two CI gates (bundle-size + Lighthouse), the exact thresholds, how to read failure messages in the CI log, how to raise a threshold (require a new OpenSpec change), and the requirement for the maintainer to enable branch protection on `main` requiring the `quality-gates` check to pass.

#### Scenario: README contains Quality gates section
- **WHEN** the change is implemented
- **THEN** `README.md` SHALL include an H2 or H3 heading containing the text `Quality gates`
- **AND** the section SHALL list the bundle-size thresholds (5 KB per Sidebar chunk, 55 KB total)
- **AND** the section SHALL state the Lighthouse thresholds (A11y/SEO/Perf ≥ 95)
- **AND** the section SHALL state that branch protection on `main` SHALL be configured to require the `quality-gates` workflow status check

#### Scenario: README points to lighthouserc and size-limit config
- **WHEN** a reader of the README wants to find the threshold config
- **THEN** the Quality gates section SHALL reference the file paths where thresholds are configured (e.g., `lighthouserc.json`, `package.json` `size-limit` block)

---

### Requirement: Local-reproducibility scripts SHALL exist for both gates

`package.json` SHALL define `pnpm size` and `pnpm lighthouse:local` scripts that reproduce the CI gates locally, producing pass/fail signals consistent with CI behaviour for the same build output.

#### Scenario: pnpm size runs bundle-size check locally
- **WHEN** a developer runs `pnpm size` after `pnpm build`
- **THEN** the same `size-limit` check used in CI SHALL execute against `dist/_astro/`
- **AND** the exit code SHALL be 0 if all limits pass, non-zero if any limit fails

#### Scenario: pnpm lighthouse:local runs Lighthouse locally
- **WHEN** a developer runs `pnpm lighthouse:local`
- **THEN** Lighthouse SHALL run against the same representative URL served from local build artifact
- **AND** the results SHALL be saved to a local directory (NOT uploaded to temporary public storage)
- **AND** the exit code SHALL match CI behaviour for the same threshold assertions

---

### Requirement: A documented failure-path verification SHALL confirm gates fire as designed

Before the change is archived, the implementer SHALL perform a one-shot failure injection: temporarily violate one threshold (e.g., add a dummy 10 KB import to make a Sidebar chunk fail size limit, OR add a `<img>` without `alt` to make A11y drop), push to a throwaway branch, observe the CI failure, then revert. The CI run URL of the failing run SHALL be recorded in `tasks.md` Phase 5.

#### Scenario: Failure-path verification recorded
- **WHEN** the change reaches archive readiness
- **THEN** `tasks.md` Phase 5 SHALL contain a CI run URL link to a deliberately failed CI run
- **AND** the linked run SHALL show the gate firing with the expected failure message

#### Scenario: Reverted before merge to main
- **WHEN** failure-path verification is complete
- **THEN** the deliberately broken commit SHALL be reverted on the verification branch
- **AND** `main` SHALL NEVER contain the deliberately broken commit

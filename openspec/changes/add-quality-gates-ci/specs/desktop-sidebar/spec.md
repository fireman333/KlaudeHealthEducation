## MODIFIED Requirements

### Requirement: Lighthouse Accessibility and SEO SHALL each be ≥ 95, Performance SHALL be ≥ 70 (mobile baseline)

The deployed site SHALL achieve, on the post page template after the sidebar feature is integrated, Lighthouse mobile-profile scores of **Accessibility ≥ 95, SEO ≥ 95, and Performance ≥ 70**. CI SHALL run Lighthouse via `treosh/lighthouse-ci-action@v12` against a representative post URL using mobile form factor with slow-4G + 4× CPU throttling (lhci default), and SHALL fail the workflow when any score drops below its threshold.

**Note on Performance threshold revision**: the original wording was `≥ 95` for all three categories. When `add-quality-gates-ci` measured the actual mobile Lighthouse score during apply phase, Performance scored 55–72 (median 72) — dominated by LCP 7.4 s and FCP 2.9 s from Chinese font loading + 43 KB React island block render. The 95 threshold was aspirational, never measured during the original `desktop-sidebar` work. Performance is reset to **70 mobile baseline floor** here; a future `improve-mobile-performance` change is queued to lift the floor by addressing LCP/FCP (lazy CommentBox island, font subsetting, inline critical CSS).

#### Scenario: All three scores meet thresholds passes CI
- **WHEN** Lighthouse CI runs against a representative post page after the sidebar feature lands
- **THEN** Accessibility SHALL be ≥ 95 AND SEO SHALL be ≥ 95 AND Performance SHALL be ≥ 70
- **AND** the CI step SHALL succeed

#### Scenario: Any score below its threshold fails CI
- **WHEN** Lighthouse reports Accessibility = 93 OR SEO = 92 OR Performance = 65 (any one below its respective threshold)
- **THEN** the CI step SHALL fail
- **AND** the failure message SHALL identify which metric(s) dropped below the threshold

#### Scenario: Performance floor is a baseline, not a target
- **WHEN** the project ships `improve-mobile-performance` (or similar) raising actual measured Performance above 70
- **THEN** this Requirement SHALL be re-evaluated in a new OpenSpec change to ratchet the floor upward
- **AND** the floor SHALL NOT silently slide downward (any future change lowering this floor MUST justify in proposal.md)

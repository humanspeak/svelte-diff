# Guard log — 001 diff granularity

## Checkpoint 1 — 2026-09-28 10:34 — DRIFTING

`17ccb55` · implementation snapshot after lint correction; first independent verification

- Snapshot commit went through the commit skill's upstream check and full hooks.
  Initial attempt failed on two useless-mustache fixture attributes; executor
  moved newline strings to constants. Retry passed formatting, lint, and source check.
- Independently reproduced: 112 unit/coverage tests pass; normal docs production
  build and favicon check pass; docs source check reports 0 errors/0 warnings
  using the documented ignored-worker-entry workaround. Stats restored unchanged.
- Root browser suite: 99/105 pass. All five projects expose persistent stale
  snippet DOM after changing single-line prose to multiline config
  (`tests/diff-modes.test.ts:45`). T3 browser independently confirms old deletion
  and insertion text persists alongside new lines. Existing Firefox diagnostic
  001 measured 151 ms against 100 ms during concurrent suites; rerun independently
  without changing thresholds before classifying as regression.
- Docs browser suite: 6/18 pass. SSR and generated-content checks pass. Failures:
  exact homepage label lookup misses the wrapping label's accumulated option text;
  Playwright `hasText` filtering excludes JSON-LD script text despite valid live
  BreadcrumbList; sequential viewport geometry reads race smooth page scrolling.
  Atomic live measurements confirm output bottom equals footer top with working
  internal PageDown scrolling (384 px client height, 2912 px scroll height).
- Plan correction: guide mirror is `/docs/guides-diff-modes.md`; installed
  `doc-mirrors.js:84` flattens slashes. Corrected factual URL only; route, HTTP200,
  source/content requirements and generated discovery checks remain intact.
  Executor correctly stopped and reported the mismatch instead of editing its plan.
- Toolchain: Node 24.15.0; external pnpm wrapper reports installed 12.6.0. No
  package pins/lockfile changed. No dependency install was necessary.
- Action: dispatched narrow executor fixes for rendering lifecycle, accessible
  selector label, deterministic browser checks, and README section placement.
  Guard has not authored source. No push, PR, or deployment. Plan remains open.

## Checkpoint 2 — 2026-09-28 10:48 — DRIFTING

`eddc4ac` · rendering correction and independent full verification

- Executor fixed hydrated stale snippets with a per-segment newline-shape key;
  same-shape DOM identity is covered. Added forward/reverse transitions and
  strengthened browser assertions instead of hiding extra nodes. T3 reproduction
  now shows only `count=10` removed and `count=20` inserted, with no stale prose.
- Independently reproduced 119/119 unit tests, 105/105 root browser cases across
  all five projects (one worker), root build/package/publint, normal docs build
  and favicon validation, root/docs source checks at 0 errors/0 warnings, and
  authoritative Trunk with no issues. Original performance ceilings unchanged.
- Replayed the executor's two red-first tests on an isolated archive of `57a9526`:
  both fail for the intended behavioral reasons (`t` vs `cat`; digit vs full line).
  Replay used installed Node 24 CLI entry points after the package-manager
  launcher failed in the temporary directory. Main checkout remained untouched.
- Docs rerun: 15/18 pass. Both example pages pass interaction, reset, source,
  keyboard scrolling, overflow, hydration, and no-JS SSR at desktop/mobile sizes.
  Homepage mobile passes, including every mode's footer and scrolling checks.
- Remaining test defects: JSON-LD omits unlinked intermediate `Guides` by design
  (`BreadcrumbJsonLd.svelte` filters `b.href || last`), while the visible breadcrumb
  correctly includes it. Desktop native select Home/ArrowDown differs by platform.
  Guard verified real keyboard `w`, Enter selects Word and updates the footer.
- Action: final narrow executor correction to docs tests only; retain exact
  linked-ancestor/leaf metadata checks and genuine keyboard input. No production
  source rebuild is needed for this test-only correction. Plan remains open.

## Checkpoint 3 — 2026-09-28 10:54 — DRIFTING

`b966133` · final docs test correction exposed a remaining responsive layout defect

- Exact JSON-LD hierarchy and genuine type-ahead keyboard checks now pass.
  Docs suite reached 17/18: desktop homepage fails the unchanged document-width
  assertion; all other metadata, interaction, SSR, scroll, and generated-content
  checks pass. This is a newly reached layout assertion, not a reason to loosen it.
- Existing large install-command footer has a `200px 1fr 200px` grid; the middle
  button's intrinsic text width pushes the right column outward. A constrained
  live layout probe showed only that footer's right-column descendants overflowing.
- Plan scope amended for the narrow existing-footer wrapping fix needed by its
  whole-page responsive criterion. No redesign, clipped content, or global
  overflow hiding. This routine correction remains within the authorized homepage
  work; the footer for compared text is unchanged.
- Action: executor changed only the footer middle track to `minmax(0, 1fr)` and
  its button to `min-width: 0; overflow-wrap: anywhere`. Guard will rebuild docs
  and rerun every docs case. Earlier library/root results remain applicable.

## Checkpoint 4 — 2026-09-28 11:01 — PASS

`a8dfad5` · final footer correction and complete close-out

- Rebuilt docs normally; favicon validation passed and build-refreshed stats were restored. Docs source checking reports 0 errors/0 warnings with the documented temporary ignored-worker procedure.
- Reproduced 18/18 docs browser cases in 36.9 seconds. The desktop whole-page width assertion now passes, as do all mode changes, long-text scrolling/footer checks, mobile layouts, metadata, SSR, source panels and generated-content requests.
- Earlier 119 unit and 105 root browser results remain applicable: subsequent changes are docs-only. All library/default/capture/performance guarantees pass at unchanged thresholds.
- Reviewed the final CSS-only diff and confirmed no dependency, lockfile, version or incidental stat changes. `git diff --check` is clean; snapshot commit hooks passed.
- Wrote the PASS report, marked all 13 criteria complete, updated the index to DONE and archived the batch. No push, PR or deployment. Normal hooks apply to the final artifact commit.

- Archive commit initially found two bare reference URLs in the pre-existing plan text, now subject to archived-plan Markdown linting. Guard formatted them as autolinks and retried normal hooks; source unchanged.

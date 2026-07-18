# Guard log — 001 compile expected patterns once

## Checkpoint 1 — 2026-07-17 18:53 — ON TRACK

`c1645fe` · final close-out after executor implementation

- Plan intent delivered: parsing now retains matches, cleaned text, line metadata,
  and regex objects once, while extraction reuses them
  (`src/lib/expectedPatterns.ts:286`, `src/lib/expectedPatterns.ts:336`,
  `src/lib/expectedPatterns.ts:393`).
- Deterministic and browser gates are substantive: regex identity is asserted at
  `src/lib/expectedPatterns.test.ts:80`, and Playwright enforces the visible
  status plus `elapsed <= ceiling` at `tests/component-performance.test.ts:18`.
- Independent verification passed: Trunk checked six files; Vitest passed 55/55;
  Svelte check reported 0 errors and 0 warnings; build/package/publint passed;
  Chromium diagnostic 001 passed three consecutive runs.
- Scope and conduct clean: `git diff --name-status origin/main...c1645fe`
  contains exactly the six in-scope paths; no STOP condition, plan edit, guard
  artifact edit, or out-of-scope source change occurred.
- Action: PASS reported to operator and
  [PR #168](https://github.com/humanspeak/svelte-diff/pull/168) opened; no
  correction needed.

## Checkpoint 2 — 2026-07-17 19:20 — ON TRACK

`4e78385` · final close-out after operator-requested eyeball-test revision

- The prior PASS was invalidated when manual review showed that reruns did not
  visibly paint RUNNING/disabled state and the actual component output was
  clipped to 1×1 pixels. The executor changed only the diagnostic page and its
  E2E test; no plan, guard, or out-of-scope file was touched.
- Reruns now paint two animation frames plus a 250 ms visibility hold before
  measurements (`src/routes/tests/component-performance/+page.svelte:82`),
  while sample timing still begins later at line 112.
- The page now explains and visibly renders the actual 750-group mounted
  component with current sample, boundary captures, and rendered values
  (`src/routes/tests/component-performance/+page.svelte:285`).
- Playwright now rejects clipped output and proves PASS → RUNNING/disabled →
  PASS plus highlighted boundary values (`tests/component-performance.test.ts:42`).
- Independent verification passed: Trunk checked both revision files; Vitest
  passed 55/55; Svelte check reported 0 errors and 0 warnings; build/package/
  publint passed; Chromium diagnostic 001 passed three consecutive runs.
- Guard captured and visually inspected completed and in-progress pages. The
  in-progress capture showed blue RUNNING banners and a disabled button; the
  completed capture showed the scrollable highlighted live component and
  boundary values 105000/105749.
- Action: restored PASS for [PR #168](https://github.com/humanspeak/svelte-diff/pull/168);
  no further correction needed.

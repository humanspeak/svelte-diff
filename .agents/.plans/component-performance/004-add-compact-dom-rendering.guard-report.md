# Guard report — 004 add compact DOM rendering

**Recommendation: PASS** — compact rendering is now the documented default,
`compact={false}` preserves the legacy equal-span DOM, and the 25 ms diagnostic
passes its repeated browser gates.
**Reviewed at** 9273bdb · 2026-07-19 07:31 EDT · **Plan planned at** a82afb4
**Integrated** — [PR #172](https://github.com/humanspeak/svelte-diff/pull/172)
is the review target for the approved snapshot.

## Done criteria

| Criterion                                                                             | Result | Evidence                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The compact DOM anchor passes on the default path.                                    | met    | The test omits `compact` and asserts exact text, zero spans, and 99 breaks; the targeted component/type suite passes 40/40.                                                                                                               |
| `compact` is typed and documented with default `true`; `false` restores legacy spans. | met    | Public type and component JSDoc, README, API, getting-started, performance, and migration guidance all describe the new default and opt-out. Generated docs mirrors and `llms-full.txt` match their sources.                              |
| Renderer, class, and line-break precedence remain intact.                             | met    | Existing explicit compact precedence coverage remains green, and the legacy compatibility case asserts an equal span with `compact=false`.                                                                                                |
| Diagnostic 004 makes the capability visible and enforces the fixed ceiling.           | met    | The page compares `compact=false: 3 equal spans` with `Default compact mode: 0 equal spans`, mounts the real 2,000-line default workload, and reports exact text, 1,999 breaks, zero equal spans, five samples, and a 25 ms ceiling.      |
| Package, docs, lint, and browser gates pass.                                          | met    | Library suite 78/78; root check 0 diagnostics; package build and publint pass; docs check 0 diagnostics and docs build passes; scoped Trunk check reports no issues; three isolated 004 runs and the combined 001–004 Chromium run pass.  |
| CodeRabbit findings are resolved.                                                     | met    | Source-only CLI review returned no findings. Docs findings about wrapper wording, copyable imports, and CSS-dependent visual equivalence were corrected and regenerated; the final docs-only CLI review covered 9 files with no findings. |
| Scope and planning artifacts match the decision.                                      | met    | Only public component/tests, diagnostic 004/E2E, named docs pages and generated text mirrors, and reviewer-owned plan artifacts changed. The batch index now records the 25 ms ceiling and the intentional 0.4.0 default boundary.        |

## Spirit

The revision gives ordinary consumers the DOM-weight reduction instead of
hiding it behind an opt-in, while retaining an explicit compatibility path for
applications whose selectors, styles, tests, or queries depend on equal spans.
The visible diagnostic proves both DOM shapes and couples timing to exact DOM
and text assertions, so a fast but incorrect render cannot pass.

## Scope & conduct

- In-scope only? Yes. No unrelated generated social cards, GitHub stats, or
  sitemap changes remain.
- STOP conditions respected? Yes. Insert/remove/expected rendering, snippet
  signatures, renderer precedence, computation behavior, and workload were not
  changed.
- Plan amendments: ceiling tightened from 300 ms to 25 ms; then the maintainer
  selected `compact=true` for 0.4.0 with `compact=false` as the migration escape
  hatch and requested direct implementation in this worktree.
- Executor independence: this final revision was implemented directly by the
  operator at maintainer request; no executor agent participated.

## Residual risk / follow-ups

- Consumers that depend on legacy equal wrappers must pass `compact={false}`
  while migrating; the PR carries `minor` and `breaking-change` labels to make
  that boundary explicit.
- Initial diff computation remains client-first. Plan 005 owns SSR rendering and
  must preserve both the compact default and legacy opt-out paths.
- The 25 ms browser ceiling is intentionally tight; exact DOM assertions ensure
  a timing pass cannot mask restored wrapper weight.

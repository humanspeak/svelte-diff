# Guard log — 002 add-tanstack-highlighted-code-diff

## Checkpoint 1 — 2026-10-02 13:46 — PLAN AMENDED

e73c2cb · exact-version release-age authorization, before dispatch

- Operator explicitly approved an exception only for @tanstack/highlight@1.0.0 after ERR_PNPM_NO_MATURE_MATCHING_VERSION was reproduced under the 2880-minute policy.
- Added pnpm-workspace.yaml to scope solely for that exact selector; dev/docs versions must remain pinned to 1.0.0. Existing policy/exclusions and transitive packages remain unchanged.
- A has not passed; B implementation, installation, and actual policy mutation have not started. Reconcile and re-baseline after A passes.
- Action: approval recorded in B and batch index; await A resumption and verified completion.

## Checkpoint 2 — 2026-10-02 14:05 — PLAN AMENDED

a4f19bc · A PASS and B pre-flight

- Literal helper and 186 units independently verified; required root/docs/browser gates pass. No conflicting B source drift.
- Re-baselined to reviewed A snapshot. Existing docs CI discovers every test; no workflow edit needed. Release infrastructure remains outside this initiative.
- Isolated pnpm 12.6 fixture accepted exact exclusion while retaining 2880-minute policy. No repository dependency or policy changes yet.
- Action: commit amendment, dispatch dependency setup, generate normal lock in temporary workspace for executor copy, frozen bootstrap, then full implementation.

## Checkpoint 3 — 2026-10-02 14:41 — PLAN AMENDED

6d242bf · operator continued after transient connection failures

- Two companion dispatches failed through five reconnects without changing any source. Cancelled stuck calls; no orphaned local executor or preview process remains in this resumed environment.
- Registry access now succeeds and confirms TanStack 1.0.0 with core/theme and selective language/theme exports. Exact-version exception remains approved.
- Corrected generated guide mirror path to the existing nested generator layout reproduced in A; no gate weakened. Baseline now includes A guard records, no B source drift.
- Action: commit amended contract, retry separate dependency executor, then frozen bootstrap and implementation.

## Checkpoint 4 — 2026-10-02 14:46 — ON TRACK

25e788f · dependency bootstrap snapshot

- Separate executors authored three manifests/policy and copied exact normal temporary-workspace lock. Snapshot passed normal format/Trunk/root check hooks.
- pnpm12.6 normal lock generation passed 724 supply-chain entries; only 12 lock lines added for root/docs TanStack 1.0.0. Frozen repository install succeeded, reused one package, no tracked mutations.
- Registry preflight and installed core/type/theme/language declarations match planned 1.0.0. Independently verified full-source token reconstruction for TS and unknown-language fallback, including regex braces, CRLF, tabs and emoji.
- Full scope review: only optional peer/dev/docs metadata, exact exclusion and lock addition; minimumReleaseAge 2880 retained, all existing exclusions unchanged. No workflow/helper/root source/export changes.
- Action: commit checkpoint record and dispatch remaining entry/component/model/tests/docs/packaging implementation. B remains IN PROGRESS.

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

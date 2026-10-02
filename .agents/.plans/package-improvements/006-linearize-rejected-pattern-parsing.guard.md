# Guard log — 006 linearize-rejected-pattern-parsing

## Checkpoint 1 — 2026-10-02 05:58 — PLAN AMENDED

42ff699 · pre-flight

- Source drift since main is reviewed 003 storage and 004 parse/clean validation plus added tests. Scanner function remains byte-identical and cited compatibility behavior remains present.
- Re-baseline Planned at/drift SHA and shifted test anchors; mandate completed rejection/storage policy. Fixed budget/scales/primitive workload/ceiling and all old diagnostics unchanged.
- Executor browser restriction requires two phases: Step 1 tests/fixture only, guard owns historical browser red before any production scanner changes, then Steps 2–3.
- Action: commit amendment before dispatch. Prerequisite 004 is DONE; 006 runnable after current batch 005 PASS.

# Guard log — 007 match-template-occurrences-in-order

## Checkpoint 1 — 2026-10-02 06:19 — PLAN AMENDED

88b1b41 · pre-flight

- Known source drift is reviewed003 own storage,004 literal rejection,006 bounded discovery/tests, plus002 component tests. Extraction still searches each d-only regex from zero, so anchor red remains applicable.
- Re-baseline Planned at/drift SHA and shifted excerpts to reviewed tip, retain all predecessor behaviors unconditionally. Whole-target dg search/cursor/reset policy and public shape/scope unchanged.
- Root baseline check0/0 and159 units pass;006 full40 diagnostics pass with unchanged old ceilings.
- Action: commit amendment before dispatch. Dependencies004/006 DONE;007 runnable.

## Checkpoint 2 — 2026-10-02 06:34 — ON TRACK / final PASS

1c8e197 · source snapshot

- Guard full four-file diff: dg compiled regexes, local whole-target cursor, immediate try/finally reset; source scanner/storage/validation/tagging and component implementation retained.
- Independent historical replay at f50eb23 reproduces named red: second Alpha instead of Beta. Current tests require resolved source and exact ranges 6–11/18–22, missing/reversed null, UTF-16 CRLF, anchors/lookbehind, shared zero boundary, success/failure/throw resets and identity.
- Guard Node 24 check 0/0; 171 units in four files; package/publint All good; trunk fmt/check and hygiene pass, no new findings (one existing issue).
- Exact expected-pattern browser suite: 35 pass across five projects; exact full performance suite: 40 pass, including 006 fixed-budget primitive fixture and original ceilings.
- Source equals snapshot after all gates; only conductor index dirty. All done criteria met; no STOP remains.
- Action: 007 DONE; prepare 008 against reviewed source, preserving completed 001 updater and 005 CI gates. Offline release execution only.

# Guard log — 004 handle-invalid-pattern-compilation

## Checkpoint 1 — 2026-10-02 05:35 — PLAN AMENDED

40c286c · pre-flight

- Scoped source drift is reviewed 002 callback/tests and 003 capture storage/tests only. Invalid compilation and duplicate-name behavior remains unchanged.
- Dated revision re-baselines drift check and Planned at, updates shifted anchors, and requires both completed predecessor fixes unconditionally; no scope or error policy change.
- Guard docs check under Node 24.15.0 using worker move/restore wrapper passes 0/0; worker restored and no backup remains.
- Action: commit amended plan before dispatch; 003 is DONE and 004 is runnable.

## Checkpoint 2 — 2026-10-02 05:50 — ON TRACK / final PASS

7068933 · source snapshot

- Guard read all eight changed paths and reproduced historical red at 15f6b9f in an isolated temporary checkout: 12 rejected-template rows fail on real SyntaxError/null/literal assertions; exact sentinel propagation passes. No live tracked source was changed for red replay.
- Node 24.15.0: root check 0 errors/0 warnings; 145 units in four files; expected-pattern browser suite 30 passes; completed performance suite 35 passes, all five configured projects and unchanged ceilings.
- Guard trunk fmt/check exit 0, no new findings (one existing issue); package/publint All good; diff hygiene and post-gate source equality pass.
- Docs source-check wrapper before and after normal docs build passes 0/0; worker restored and no backup. Build exits 0; generated guide mirror and llms-full contain global uniqueness, rejected literal source, valid unmatched placeholders, and trusted regex timeout distinction.
- Normal build refreshed tracked GitHub stats. Guard did not author a manual restoration: correction executor restored exact HEAD bytes/blob 6269e3d, independently verified empty diff. This is a known generated verification side effect, not unrelated implementation drift; no extra path enters snapshot.
- All done criteria met; index updated by conductor. Action: 004 DONE; prepare 005 without publishing/PR.

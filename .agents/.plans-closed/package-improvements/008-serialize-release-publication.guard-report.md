# Guard report — 008 serialize-release-publication

**Recommendation: PASS** — one prepared/tested SHA governs release eligibility; cleanup retains unknown, foreign, replaced or published artifacts.
**Reviewed at** eb3b994 · 2026-10-02 · **Plan planned at** 1c8e197.
**Integration**: local source snapshot committed through the ordinary hook; no push, PR or live release.

## Done criteria

| Criterion                                                                                                       | Result | Independent evidence                                                                                                                                                                             |
| --------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Both original actual-shell destructive-cleanup reproductions were red and now pass.                             | met    | Historical a0168dd replay failed both on observed gh release delete/git tag -d/git push --delete; current configured entry-point tests pass.                                                     |
| Fixed workflow-level group, cancel-in-progress false, default pending policy.                                   | met    | Full workflow read and native configuration assertions; original-event order/every-event execution are not assumed.                                                                              |
| Every downstream code checkout uses the same prepared SHA; sole read-only bootstrap exempted.                   | met    | All five checkouts enumerated by tests; debug/build/browser/publication refs and prepare dependencies checked. Predecessor 005 check remains blocking.                                           |
| Release-only advancement is structurally validated before tests; source/config/dependency advancement is stale. | met    | Native nested JSON/README/version/shim/ancestry/malformed-output cases with strict injected transports.                                                                                          |
| Post-test main advancement creates no artifacts; main push is explicit normal fast-forward.                     | met    | Stale initialization and rejected-push cases; no reset/rebase/force branch push and no tag push after main rejection.                                                                            |
| Original merged-PR provenance, labels, manual-main/skip and bump policy retained.                               | met    | Actual original lookup evaluated in VM; actual bump shell evaluated in safe fixtures; baseline cases.                                                                                            |
| Cleanup requires confirmed current run/attempt, numeric release ID, annotated tag OID/commit and exact lease.   | met    | Configured cleanup mock PATH plus foreign/malformed/local/tag-only/replacement-ID/OID/lease-race/repeated-cleanup cases.                                                                         |
| Canonical success and unknown upload retain metadata even if marker write or downstream steps fail.             | met    | Pure canonical step success guard, explicit marker-failure and unknown-registry behavioral cases; best-effort shims retained.                                                                    |
| Both offline suites run in build matrix and all local final gates pass.                                         | met    | Guard 56 tests each on Node 22.22.3/24.15.0, syntax, check 0/0, 171 units, build/package/publint, Trunk fmt/check and whitespace all exit 0. Trunk one unchanged existing issue/no new findings. |
| Cleanup warnings include useful safe identifiers.                                                               | met    | Validated caller run/attempt, version, release ID, tag/commit identities asserted; malformed/foreign/private content excluded, zero transport.                                                   |
| Only scoped files changed; updater, signing/OIDC/provenance/production and predecessor gates intact.            | met    | Exactly three source paths; workflow unchanged by correction; updater seven regression cases pass; full diff read.                                                                               |

## Spirit and scope

Tests reproduce actual configured cleanup side effects, not just a parallel policy. The implementation treats tested source, original trigger metadata and artifact ownership as independent facts; uncertain remote responses retain metadata. Confirmed tag creation requires new-ref porcelain output, not exit zero/up-to-date. Release creation records its response numeric ID; cleanup inspects that identity and protects replacement releases/tags. Main is not rolled back.

The operator explicitly authorized narrow Trunk ignores after the initial STOP. Exactly nine line-level eslint/camelcase directives cover required GitHub API fields in payloads/fixtures; no global lint/config change or GitHub key rename. Cleanup diagnostics were completed by the correction executor. Existing assertions and workflow gates were retained. Guard authored no source.

## Prior STOP and resolution

The initial source snapshot commit was refused by lint; the previous NO-PASS is preserved in the append-only guard log. Operator authorization resumed a surgical correction. Executor formatting hit its known sandbox denial on .git/info/exclude; guard ran the real formatting locally successfully. Ordinary source snapshot and every local final gate now pass. This report supersedes the earlier NO-PASS; the batch index marks 008 DONE.

## Residual limitations

Hosted workflow/release execution was not authorized or performed. Tests constrain every outbound transport with fixtures; no live GitHub mutation, registry request/publication or credentials were used. Default concurrency can supersede pending events; stale runs require a fresh qualifying main event or manual-main retry. Unknown publication or ownership intentionally leaves metadata for reconciliation.

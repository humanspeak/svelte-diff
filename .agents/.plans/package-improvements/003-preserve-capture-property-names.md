# Plan 003: Preserve every accepted capture name as an own enumerable property

> **Executor instructions**: Read this plan completely and follow each step in order. Run each verification command and confirm its expected result before continuing. On a STOP condition, report instead of improvising. The operator maintains `.agents/.plans/package-improvements/README.md`; report your completion to them rather than editing their index unless explicitly delegated.
>
> **Drift check (run first)**: `git diff --stat fa0cfc9..HEAD -- src/lib/expectedPatterns.ts src/lib/expectedPatterns.test.ts src/lib/SvelteDiff.test.ts`. Compare any changed in-scope files with the excerpts below. Reconcile explicitly listed prerequisite changes; stop on unrelated drift or assumptions that no longer hold. Also run `git status --short` to identify pre-existing local changes.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: `002-isolate-processing-callbacks.md` operationally, to serialize shared component tests; capture storage has no behavioral dependency on callback isolation
- **Category**: bug
- **Planned at**: commit `fa0cfc9`, 2026-10-02

## Why this matters

The parser accepts `__proto__`, but assigning that captured string into `{}` does not create an own property. Resolving the template then reads an inherited object and inserts `[object Object]`, while serialized callback captures omit the value. Preserve ordinary public record behavior while safely storing all accepted names; this is a correctness fix, not a claim of prototype pollution.

## Current state

- `src/lib/expectedPatterns.ts:135–153` accepts names matching `[a-zA-Z_][a-zA-Z0-9_]*`, including `__proto__` and `constructor`.
- `src/lib/expectedPatterns.ts:422–436` stores captures as follows:

```ts
const allCaptures: Record<string, string> = {}
// ...
allCaptures[group.name] = value
```

- `src/lib/expectedPatterns.ts:474–476` resolves using `captures[match.name] ?? ''`; `src/lib/index.ts:219–220` documents a public `Record<string, string>`.
- `src/lib/expectedPatterns.test.ts:156–177` is the helper regression exemplar: parse a template, extract, assert captures, resolved text, and absolute ranges. `src/lib/SvelteDiff.test.ts:291–303` checks the actual callback capture argument. Existing parser/extraction helpers are typed arrow functions with JSDoc; match their style rather than introducing a class or map-shaped public API.

The Svelte 5/TypeScript library deliberately defaults to character diffing. Word/line diffs remain lossless and skip cleanup. Preserve automatic expected-pattern interpretation for valid templates, compiled-pattern reuse on target-only edits, cached diff array identity on callback-only edits, forward expected-region tagging, compact DOM rendering, and meaningful SSR. Do not reopen the completed `.agents/.plans/component-performance/` initiative. Regex extraction remains outside the algorithm timeout by design.


## Commands you will need

Use the existing pnpm 12.6.0/Node toolchain. No install, dependency changes, builds, commits, pushes, or PRs are authorized by this planning task; the commands below are gates for a separately authorized executor. Run from the executor checkout root.

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Typecheck | `pnpm run check` | exit 0; 0 errors, 0 warnings |
| All library units | `pnpm exec vitest run src/lib/` | exit 0; all existing and new tests pass |
| Format | `trunk fmt` | exit 0; inspect changed files against scope |
| Lint | `trunk check` | exit 0; no new findings |
| Package | `pnpm run package` | exit 0; svelte-package and publint succeed |

`.trunk/trunk.yaml:25–87` enables the repository lint/format tools and ignores plan Markdown. Trunk is authoritative; do not substitute the legacy `pnpm run lint` command. The operator-reported audit baseline for the unchanged library contains 123 passing tests and `svelte-check` 0 errors/0 warnings; the fa0cfc9 refresh changes package/README versions only. This planning pass did not rerun those gates. Counts will increase as sibling plans land.

| Browser integration gate | Command | Expected on success |
| --- | --- | --- |
| Expected rendering | `pnpm exec playwright test --config=playwright.config.ts tests/expected-patterns.test.ts` | exit 0; all configured projects pass |

## Scope

**In scope**:

- `src/lib/expectedPatterns.ts` — capture storage only, plus a narrowly relevant explanatory comment.
- `src/lib/expectedPatterns.test.ts` — name/storage regression matrix.
- `src/lib/SvelteDiff.test.ts` — callback and renderer integration regression.

**Out of scope**:

- Name grammar, duplicate-name policy (plan 004), extraction search order (plan 007), parser scan (plan 006).
- Public types, component implementation, browser routes/configuration, docs app, dependencies, generated files, and completed performance plans.

## Git workflow

- Initiative branch: `chore/package-improvements`, created from fresh `origin/main` at `fa0cfc9`. The operator controls whether each executor uses this checkout or an isolated per-plan worktree; do not create, switch, or merge branches on your own.
- This plan authorizes a handoff, not execution. Once separately authorized, implement only this plan's scope. Do not install dependencies, commit, push, or open a PR unless the operator explicitly authorizes it.
- If commits are later authorized, use the repository's conventional style, for example `fix: isolate processing callback dependencies`; history exemplar: `c65e2e0 perf: speed up compact rendering and refresh project tooling (#215)`.
- The operator owns the batch README. Report completion and gate results to them; do not edit the index unless specifically delegated.

## Steps

### Step 1: Add a failing own-property regression

Add `it('preserves __proto__ as an own enumerable capture property', ...)` in `src/lib/expectedPatterns.test.ts`, patterned on the perfect-match test. Use template `Value: (?<__proto__>\w+)` and target `Value: Alpha` (escape the backslash in a TypeScript literal). Assert non-null extraction, `resolvedText === 'Value: Alpha'`, capture range `{name: '__proto__', start: 7, end: 12}`, `Object.hasOwn(captures, '__proto__')`, `captures['__proto__'] === 'Alpha'`, `Object.keys(captures)` equals `['__proto__']`, and `JSON.parse(JSON.stringify(captures))['__proto__'] === 'Alpha'`. Also assert `Object.getPrototypeOf(captures) === Object.prototype`; do not change prototype behavior to solve this.

**Verify**: `pnpm exec vitest run src/lib/expectedPatterns.test.ts -t 'preserves __proto__'` → FAIL: resolved text is `Value: [object Object]` instead of `Value: Alpha`, and an own property is absent. If baseline passes, STOP and investigate drift.

### Step 2: Store capture values as own data properties

Keep `allCaptures` an ordinary object. Replace the bracket assignment in `extractCaptures` with explicit own data-property creation using `Object.defineProperty(allCaptures, group.name, { value, enumerable: true, writable: true, configurable: true })`. This avoids inherited setters while preserving `Record` access, object prototype, enumeration, JSON serialization, and normal overwrite behavior until duplicate-name policy is applied by plan 004. Do not use a null-prototype record, change the public type to `Map`, reject otherwise valid names, or alter resolution/extraction order.

**Verify**: `pnpm exec vitest run src/lib/expectedPatterns.test.ts -t 'preserves __proto__'` → PASS; all named assertions hold.

### Step 3: Pin record compatibility and component delivery

In the same unit file add a table-driven test for `constructor`, `toString`, and `hasOwnProperty`, each with a distinct valid template and target, checking own enumerable string value, correct resolved text, ordinary prototype, `Object.entries` and JSON serialization. Use `Object.hasOwn`, never `captures.hasOwnProperty`, since a capture may validly shadow that method. Add a mixed template containing `__proto__` and `constructor` with distinct names; assert both own values survive without changing the prototype.

In `src/lib/SvelteDiff.test.ts`, add `it('renders and delivers own __proto__ capture values', ...)`, following lines 291–303. Assert the expected span titled `__proto__` contains `Alpha`, callback captures have an own enumerable `__proto__` value, and callback raw tuples reconstruct `Value: Alpha` on both sides. Construct expected objects with a computed key or own-property assertions, since a literal `{'__proto__': ...}` has special JavaScript semantics.

**Verify**: `pnpm exec vitest run src/lib/expectedPatterns.test.ts src/lib/SvelteDiff.test.ts` → PASS, including all name compatibility checks and existing normal-name tests.

### Step 4: Run all gates

Run separately: `pnpm run check`; `pnpm exec vitest run src/lib/`; `pnpm exec playwright test --config=playwright.config.ts tests/expected-patterns.test.ts`; `trunk fmt`; `trunk check`; `pnpm run package`. Inspect `git diff --name-only` and `git status --short`. Rerun affected tests/typecheck if formatting changes implementation. Report results to the operator.

**Verify**: every gate exits 0; typecheck reports 0 errors/0 warnings; diff includes only the scoped source/test paths.

## Test plan

- The Step 1 regression must fail before the storage change and pass afterward.
- Cover `__proto__`, `constructor`, `toString`, `hasOwnProperty`, mixed distinct names, JSON serialization, Object.keys/Object.entries, and ordinary prototype identity.
- Component test verifies values cross the real callback boundary and receive expected markup; existing normal-name captures and tagging tests stay green.
- No security exploitation demonstration or prototype pollution claim is warranted: the observed issue is loss of accepted string values.

## Done criteria

- [ ] The named own-property test exists, has demonstrated baseline failure, and passes.
- [ ] Every compatibility capture is an own enumerable string data property; ordinary object prototype remains intact.
- [ ] `pnpm run check` exits 0 with 0 errors/0 warnings.
- [ ] `pnpm exec vitest run src/lib/` exits 0.
- [ ] `pnpm exec playwright test --config=playwright.config.ts tests/expected-patterns.test.ts` exits 0.
- [ ] `trunk fmt`, `trunk check`, and `pnpm run package` exit 0.
- [ ] Source diff remains within scope; results are sent to the operator for status update.

## STOP conditions

Stop if the own-property regression passes before implementation, the proposed storage change requires altering public record/prototype behavior, scoped files have unrelated drift, the fix requires other files, or a gate fails twice after a reasonable attempt. Do not conflate duplicate-name policy with name storage.

## Maintenance notes

Future capture storage changes must preserve accepted property names, enumeration, serialization, and the public ordinary record contract. Review any spread/serialization code with computed `__proto__` expectations. Name validation and duplicate rejection belong to parsing, not storage.

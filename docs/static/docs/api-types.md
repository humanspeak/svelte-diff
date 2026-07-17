<!-- Source: https://diff.svelte.page/docs/api/types -->

# Types and Exports

> Public components, callbacks, renderer maps, tuples, and expected-pattern types exported by @humanspeak/svelte-diff.

**Source:** [https://diff.svelte.page/docs/api/types](https://diff.svelte.page/docs/api/types)

---

# Types & Exports

Everything public is exported from the package root.

```typescript
import SvelteDiff, {
    SvelteDiff as NamedSvelteDiff,
    type SvelteDiffProps,
    type SvelteDiffTiming,
    type SvelteDiffTuple,
    type Renderers,
    type RendererClasses,
    type CaptureRange,
    type DisplayDiff,
    type PatternMatchResult
} from '@humanspeak/svelte-diff'
```

## Components

| Export | Notes |
|---|---|
| `default` | The `SvelteDiff` component |
| `SvelteDiff` | Named export of the same component |
| `SvelteDiffMatchPatch` | Deprecated compatibility alias |

## `SvelteDiffTiming`

```typescript
type SvelteDiffTiming = {
    main: number
    cleanup: number
    total: number
}
```

All values are milliseconds. `main` measures the core algorithm, `cleanup` measures the selected cleanup pass, and `total` covers both.

## `SvelteDiffTuple`

An alias for `Diff` from `diff-match-patch-ts`. Each tuple is an operation and its text:

```typescript
type SvelteDiffTuple = [operation: -1 | 0 | 1, text: string]
```

- `-1` — removed
- `0` — equal
- `1` — inserted

## `Renderers`

```typescript
type Renderers = {
    remove?: Snippet<[string]>
    equal?: Snippet<[string]>
    insert?: Snippet<[string]>
    expected?: Snippet<[string, string]>
    lineBreak?: Snippet<[]>
}
```

The expected renderer receives both the matched text and its named capture-group name.

## `RendererClasses`

```typescript
type RendererClasses = {
    remove?: string
    equal?: string
    insert?: string
    expected?: string
}
```

Classes only affect built-in fallbacks. When you replace a segment with a snippet, that snippet owns its own classes.

## Expected-pattern types

`CaptureRange` describes a named match inside the modified string. `DisplayDiff` is an internal-rendering-shaped segment that may carry an `expected` group name. `PatternMatchResult` combines resolved template text, captured values, and capture ranges.

```typescript
interface PatternMatchResult {
    resolvedText: string
    captures: Record<string, string>
    captureRanges: CaptureRange[]
}
```

These are exported for integrations that want to share the component's expected-region concepts without duplicating type definitions.

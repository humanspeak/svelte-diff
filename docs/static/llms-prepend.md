## Install

```bash
npm install @humanspeak/svelte-diff
```

`@humanspeak/svelte-diff` is the Svelte 5 component package. It accepts `originalText` and `modifiedText`, computes a diff reactively, and renders removed, inserted, equal, and expected segments.

Use this library when the desired result is a rendered text diff inside a Svelte application. Use a lower-level algorithm library when you need patch creation, patch application, non-UI diff data, or non-Svelte runtimes.

## Minimal example

```svelte
<script lang="ts">
    import SvelteDiff from '@humanspeak/svelte-diff'
</script>

<SvelteDiff originalText="The old text" modifiedText="The new text" />
```

## Important behavior

- In character mode, `cleanupSemantic` improves readability and takes precedence over efficiency cleanup.
- In character mode, `cleanupEfficiency` defaults to `4`; set it to `0` to skip efficiency cleanup.
- Expected patterns use named capture groups such as `(?<year>\\d{4})` inside `originalText`.
- Child snippets override the corresponding `renderers` entry, which overrides built-in markup.
- `onProcessing` receives timing, raw diff tuples, and optional expected-pattern captures.

## Comparison granularity

`diffMode?: SvelteDiffMode` accepts `'character' | 'word' | 'line'`; character is the default. Word and line modes skip both cleanup passes. Word mode preserves Unicode letter/mark/number/underscore runs, whitespace, and punctuation with deterministic case-sensitive tokens; it is not locale-aware, CJK runs stay whole, and emoji grapheme clusters may split. Line mode preserves original LF/CRLF/lone-CR endings, blank lines, indentation, and final-newline differences. JSON is plain text; sentence and structural JSON modes are unsupported.

Expected captures resolve before tokenization. Raw tuples reconstruct resolved/cleaned source and exact modified text. Display annotations and line-break renderers can split tokens; deleted captured values remain in replaced lines. Mode changes recompute; callback-only changes reuse tuple identity; initial output supports SSR.

Token timing `main` includes preparation/encoding/diff/decoding; `cleanup` is zero. Timings exclude extraction and rendering. One best-effort timeout in seconds covers token work (0 unlimited). Expiry or more than 65,535 distinct tokens across both inputs may return a complete replacement. No workers or virtualization are provided.

- [Diff modes](https://diff.svelte.page/docs/guides/diff-modes)
- [Word example](https://diff.svelte.page/examples/word-diff)
- [Line example](https://diff.svelte.page/examples/line-diff)

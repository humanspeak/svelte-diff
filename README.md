# @humanspeak/svelte-diff

A powerful, customizable diff-match-patch component for Svelte with TypeScript support.

[![NPM version](https://img.shields.io/npm/v/@humanspeak/svelte-diff.svg)](https://www.npmjs.com/package/@humanspeak/svelte-diff)
[![Build Status](https://github.com/humanspeak/svelte-diff/actions/workflows/npm-publish.yml/badge.svg)](https://github.com/humanspeak/svelte-diff/actions/workflows/npm-publish.yml)
[![Coverage Status](https://coveralls.io/repos/github/humanspeak/svelte-diff/badge.svg?branch=main)](https://coveralls.io/github/humanspeak/svelte-diff?branch=main)
[![License](https://img.shields.io/npm/l/@humanspeak/svelte-diff.svg)](https://github.com/humanspeak/svelte-diff/blob/main/LICENSE)
[![Downloads](https://img.shields.io/npm/dm/@humanspeak/svelte-diff.svg)](https://www.npmjs.com/package/@humanspeak/svelte-diff)
[![CodeQL](https://github.com/humanspeak/svelte-diff/actions/workflows/codeql.yml/badge.svg)](https://github.com/humanspeak/svelte-diff/actions/workflows/codeql.yml)
[![Install size](https://packagephobia.com/badge?p=@humanspeak/svelte-diff)](https://packagephobia.com/result?p=@humanspeak/svelte-diff)
[![Code Style: Trunk](https://img.shields.io/badge/code%20style-trunk-blue.svg)](https://trunk.io)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![Types](https://img.shields.io/npm/types/@humanspeak/svelte-diff.svg)](https://www.npmjs.com/package/@humanspeak/svelte-diff)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/humanspeak/svelte-diff/graphs/commit-activity)

## Features

- 🚀 High-performance diff algorithm implementation
- 💪 Complete TypeScript support with strict typing
- 🎨 Customizable diff rendering with CSS classes OR svelte snippets
- 🔒 Safe and efficient text comparison
- 🎯 Character (default), word, and line diff modes; character-only semantic and efficiency cleanup
- 🧪 Comprehensive test coverage (vitest and playwright)
- 🔄 Svelte 5 runes compatibility
- ⚡ Configurable timeout for large text comparisons
- 📊 Detailed timing and diff statistics
- 🎨 Customizable diff highlighting styles
- 🔍 Real-time diff updates
- 🎯 Expected patterns — mark dynamic regions (dates, names) as "expected" instead of diffs

## Installation

```bash
npm i -S @humanspeak/svelte-diff
```

Or with your preferred package manager:

```bash
pnpm add @humanspeak/svelte-diff
yarn add @humanspeak/svelte-diff
```

## Basic Usage

```svelte
<script lang="ts">
    import SvelteDiff from '@humanspeak/svelte-diff'

    let originalText = $state(`I am the very model of a modern Major-General,
I've information vegetable, animal, and mineral,
I know the kings of England, and I quote the fights historical,
From Marathon to Waterloo, in order categorical.`)

    let modifiedText = $state(`I am the very model of a cartoon individual,
My animation's comical, unusual, and whimsical,
I'm quite adept at funny gags, comedic theory I have read,
From wicked puns and stupid jokes to anvils that drop on your head.`)

    const onProcessing = (timing, diffs) => {
        console.log('Diff timing:', timing)
        console.log('Diff result:', diffs)
    }
</script>

<SvelteDiff
    {originalText}
    {modifiedText}
    timeout={1}
    cleanupSemantic={false}
    cleanupEfficiency={4}
    {onProcessing}
    rendererClasses={{
        remove: 'diff-remove',
        insert: 'diff-insert',
        equal: 'diff-equal'
    }}
/>

<style>
    :global(.diff-remove) {
        background-color: #ffd7d5;
        text-decoration: line-through;
    }
    :global(.diff-insert) {
        background-color: #d4ffd4;
    }
</style>
```

## TypeScript Support

The package is written in TypeScript and includes full type definitions:

```typescript
import type {
    SvelteDiffMode,
    SvelteDiffTiming,
    SvelteDiffTuple,
    SvelteDiffProps
} from '@humanspeak/svelte-diff'
```

## Props

| Prop                | Type                        | Default       | Description                                                                           |
| ------------------- | --------------------------- | ------------- | ------------------------------------------------------------------------------------- |
| `originalText`      | `string`                    | _required_    | The original (before/source) text to compare                                          |
| `modifiedText`      | `string`                    | _required_    | The modified (after/target) text to compare                                           |
| `diffMode`          | `SvelteDiffMode`            | `'character'` | `'character'`, `'word'`, or `'line'`; word/line skip both cleanup passes              |
| `expectedPatterns`  | `boolean`                   | `true`        | Enable named capture templates; `false` compares exact literal source without parsing |
| `timeout`           | `number`                    | `1`           | Max diff computation time in seconds; `0` is unlimited                                |
| `cleanupSemantic`   | `boolean`                   | `false`       | Character only: optimize edit boundaries for human readability                        |
| `cleanupEfficiency` | `number`                    | `4`           | Character only: edit cost for efficiency cleanup; `0` disables it                     |
| `compact`           | `boolean`                   | `true`        | Render unstyled equal text without wrapper spans; `false` restores legacy equal spans |
| `onProcessing`      | `function`                  | —             | Receives `(timing, diffs, captures?)` after each computation                          |
| `rendererClasses`   | `RendererClasses`           | `{}`          | CSS classes for the built-in `remove`/`insert`/`equal`/`expected` spans               |
| `renderers`         | `Partial<Renderers>`        | `{}`          | Snippet map for individual segment types                                              |
| `remove`            | `Snippet<[string]>`         | —             | Child snippet for removed text (wins over `renderers.remove`)                         |
| `insert`            | `Snippet<[string]>`         | —             | Child snippet for inserted text (wins over `renderers.insert`)                        |
| `equal`             | `Snippet<[string]>`         | —             | Child snippet for unchanged text (wins over `renderers.equal`)                        |
| `expected`          | `Snippet<[string, string]>` | —             | Child snippet for expected values, receiving `(text, groupName)`                      |
| `lineBreak`         | `Snippet<[]>`               | —             | Child snippet rendered between lines                                                  |

## Word and line comparison

```svelte
<script lang="ts">
    import SvelteDiff from '@humanspeak/svelte-diff'
    const proseBefore = 'The cat sleeps.'
    const proseAfter = 'The car sleeps.'
    const configBefore = 'count=10\nkeep=true\n'
    const configAfter = 'count=20\nkeep=true\n'
</script>

<SvelteDiff originalText={proseBefore} modifiedText={proseAfter} diffMode="word" />
<SvelteDiff originalText={configBefore} modifiedText={configAfter} diffMode="line" />
```

Character remains the default. Word mode compares Unicode letter/mark/number/underscore
runs, whitespace runs, and separate punctuation; apostrophes/hyphens separate words.
It is case-sensitive and not locale-aware: continuous CJK runs are single tokens,
and emoji grapheme clusters are not guaranteed atomic. Line mode preserves whole
lines including LF, CRLF, lone CR, blank lines, and an unterminated final line.
Neither mode normalizes text or runs semantic/efficiency cleanup. JSON remains
plain text; sentence and structural JSON modes are unsupported.

Raw callback tuples contain original text, using resolved/cleaned source with expected
patterns. Capture annotations and newline renderers can split displayed tokens;
a replaced line retains its captured value in the deletion as well as annotating
it in the replacement. Changing mode recomputes; callback-only changes reuse tuples.
SSR computes the initial diff, with callback delivery on the client.

Token-mode `main` includes preparation, encoding, diffing, and decoding; `cleanup`
is zero. Timings exclude pattern extraction and DOM rendering. One best-effort
seconds-based deadline covers token work (`timeout={0}` is unlimited). Expiry or
more than 65,535 distinct tokens across the inputs can produce a full replacement,
never truncated text. Work is synchronous without virtualization or workers.

Read the [diff modes guide](https://diff.svelte.page/docs/guides/diff-modes),
[editable word example](https://diff.svelte.page/examples/word-diff), and
[editable line example](https://diff.svelte.page/examples/line-diff).

## Syntax-highlighted code diffs

`CodeDiff` is an optional Svelte entry. Install `@tanstack/highlight@1.0.0`
and register only your languages; ordinary root consumers need no TanStack.

```svelte
<script lang="ts">
    import CodeDiff from '@humanspeak/svelte-diff/code'
    import { createHighlighter } from '@tanstack/highlight/core'
    import { ts } from '@tanstack/highlight/languages/ts'
    import { createThemeCss } from '@tanstack/highlight/theme'
    import { githubLightTheme } from '@tanstack/highlight/themes/github-light'
    import { githubDarkTheme } from '@tanstack/highlight/themes/github-dark'

    const highlighter = createHighlighter({ languages: [ts] })
    const themeCss = createThemeCss({ light: githubLightTheme, dark: githubDarkTheme })
    const before = 'const count = 10;\n'
    const after = 'const count = 20;\n'
</script>

<svelte:head><svelte:element this={"style"}>{themeCss}</svelte:element></svelte:head>
<CodeDiff
    originalText={before}
    modifiedText={after}
    language="typescript"
    diffMode="line"
    {highlighter}
/>
```

These examples explicitly use line mode to keep removed and inserted code lines
together. The component default remains word; word and character modes are
available for inline comparisons.

Both complete sources are highlighted before diff composition, retaining comment
and string context. Regex capture groups are literal source; native Svelte text
escaping handles HTML safely. Word mode is the default, with character and line
available. Cleanup defaults to off; word/line skip it. The caller owns syntax
foreground CSS; change backgrounds use `--svelte-diff-remove-bg` and
`--svelte-diff-insert-bg` without default strike-through. Model offsets preserve
UTF-16 and exact whitespace; browser SSR parsing can normalize CR/CRLF.

Import `CodeDiffProps` from `@humanspeak/svelte-diff/code`. Required props are
`originalText`, `modifiedText`, and `highlighter: Pick<Highlighter, 'tokenize'>`.
Optional props are `language='plaintext'`, `diffMode='word'`, `timeout=1`,
`cleanupSemantic=false`, `cleanupEfficiency=0`, `class`,
`ariaLabel='Code differences'`, and `rendererClasses` with `remove`/`insert`.
There are no expected-pattern, callback, patch, gutter, or headless features.

Read the [guide](https://diff.svelte.page/docs/guides/code-diffs),
[API](https://diff.svelte.page/docs/api/code-diff), and
[editable example](https://diff.svelte.page/examples/code-diff).

## Custom Rendering with Snippets

You can customize how the diff is rendered using Svelte snippets. This gives you full control over the HTML structure and styling of each diff part.

```svelte
<script lang="ts">
    import SvelteDiff from '@humanspeak/svelte-diff'

    let originalText = $state(`I am the very model of a modern Major-General,
I've information vegetable, animal, and mineral,
I know the kings of England, and I quote the fights historical,
From Marathon to Waterloo, in order categorical.`)

    let modifiedText = $state(`I am the very model of a cartoon individual,
My animation's comical, unusual, and whimsical,
I'm quite adept at funny gags, comedic theory I have read,
From wicked puns and stupid jokes to anvils that drop on your head.`)
</script>

<SvelteDiff {originalText} {modifiedText}>
    {#snippet remove(text: string)}
        <span class="diff-snippet-remove">{text}</span>
    {/snippet}
    {#snippet insert(text: string)}
        <span class="diff-snippet-insert">{text}</span>
    {/snippet}
    {#snippet equal(text: string)}
        <span class="diff-snippet-equal">{text}</span>
    {/snippet}
    {#snippet lineBreak()}
        <br /><br />
    {/snippet}
</SvelteDiff>

<style>
    :global(.diff-snippet-remove) {
        background-color: #ffd7d5;
        text-decoration: line-through;
    }
    :global(.diff-snippet-insert) {
        background-color: #d4ffd4;
    }
</style>
```

### Available Snippets

| Snippet   | Parameters | Description                                  |
| --------- | ---------- | -------------------------------------------- |
| remove    | `text`     | Renders removed text (in originalText only)  |
| insert    | `text`     | Renders inserted text (in modifiedText only) |
| equal     | `text`     | Renders unchanged text (in both texts)       |
| lineBreak | -          | Renders line breaks between diff sections    |

You can use these snippets to:

- Customize the HTML structure of each diff part
- Apply custom styling to different types of changes
- Add additional elements or attributes
- Implement custom animations or transitions
- Add tooltips or other interactive elements

If you don't provide snippets, the component will use the default rendering with the `rendererClasses` prop.

## Literal source and synchronous computation

The component defaults to `expectedPatterns={true}`. For source code containing
named regex groups, set `expectedPatterns={false}` to bypass template parsing,
substitution, placeholders, and capture tagging. Raw tuples then reconstruct the
exact before and after strings in every diff mode.

```svelte
<script lang="ts">
    import SvelteDiff, { computeDiff } from '@humanspeak/svelte-diff'
    const before = 'const re = /(?<year>\\d{4})/;'
    const after = 'const re = /(?<year>\\d{2})/g;'
    const result = computeDiff(before, after, { diffMode: 'line' })
</script>

<SvelteDiff originalText={before} modifiedText={after} expectedPatterns={false} />
```

`computeDiff` is synchronous and defaults to `expectedPatterns: false`, unlike
the component. Set it to `true` to enable the same template pipeline. Other
helper defaults match the component: character mode, timeout 1 second, semantic
cleanup false, and efficiency edit cost 4. It returns `{ timing, diffs,
displayDiffs, captures }` and owns a fresh engine per call. Timing is in
milliseconds and excludes pattern preprocessing and rendering. Word and line
modes skip cleanup; semantic cleanup takes priority in character mode.

This helper is available through the existing Svelte-aware package root. Use it
within a Svelte toolchain without mounting the component; the entry still
requires Svelte-aware module resolution and compilation.

## Expected Patterns

Sometimes parts of your text are _supposed_ to differ — like the year and copyright holder in a license file. Expected patterns let you mark these dynamic regions with named regex capture groups so they render with distinct "expected" styling instead of showing up as noisy red/green diffs.

Use standard `(?<name>pattern)` syntax directly in your `originalText`:

```svelte
<SvelteDiff
    originalText={`Copyright (?<year>\\d{4}) (?<holder>.+)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:`}
    modifiedText={`MIT License

Copyright (c) 2024 Humanspeak, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:`}
    cleanupSemantic={true}
    rendererClasses={{
        remove: 'diff-remove',
        insert: 'diff-insert',
        equal: 'diff-equal',
        expected: 'diff-expected'
    }}
/>

<style>
    :global(.diff-expected) {
        background-color: #dbeafe;
        border-bottom: 1px dashed #3b82f6;
    }
</style>
```

In this example:

- `2024` renders with blue "expected" styling (matched `(?<year>\d{4})`)
- `Humanspeak, Inc.` renders as expected (matched `(?<holder>.+)`)
- `MIT License` and `(c)` show as normal green inserts — they're real differences
- Everything else is equal

The matching is flexible — extra content like headers or `(c)` symbols between the template anchor and the capture group won't break the match.

### Accessing Captured Values

The `onProcessing` callback receives captured values as its third argument:

```svelte
<script lang="ts">
    const onProcessing = (timing, diffs, captures) => {
        // captures?.year === "2024"
        // captures?.holder === "Humanspeak, Inc."
    }
</script>
```

### Available Snippets for Expected Regions

Built-in expected-region spans expose `data-capture-name` and `data-capture-value` alongside the hover `title`. Custom tooltip code can read `element.dataset.captureName` and `element.dataset.captureValue`. Each fragment of a multiline capture carries the full captured value. Custom snippets own their markup; the example below exposes their supplied text, while full capture values are available through `onProcessing`.

| Snippet  | Parameters          | Description                                     |
| -------- | ------------------- | ----------------------------------------------- |
| expected | `text`, `groupName` | Renders matched capture regions with group name |

```svelte
<SvelteDiff {originalText} {modifiedText}>
    {#snippet expected(text: string, groupName: string)}
        <span class="expected" data-capture-name={groupName} data-capture-value={text} title={groupName}>{text}</span>
    {/snippet}
</SvelteDiff>
```

Capture names must be globally unique across the entire template, including separate lines. Invalid recognized regex bodies or duplicate names cause ordinary literal comparison with `captures` undefined. If no supported named groups are present, the component also compares the original text literally.

A valid template that does not match its target still replaces named groups with readable `<name>` placeholders before computing the normal diff, with `captures` undefined:

```text
Rejected template: (?<bad>*)
Compared source:   (?<bad>*)

Valid template:    Copyright (?<year>\d{4}) MIT
Nonmatching target: different text
Compared source:   Copyright <year> MIT
```

## Programmatic API

The expected-pattern helpers are exported for use within a Svelte-aware toolchain. You can call them without mounting the component; the package entry still requires Svelte-aware module resolution and compilation.

```typescript
import {
    parseExpectedPatterns,
    extractCaptures,
    tagExpectedRegions,
    cleanTemplate
} from '@humanspeak/svelte-diff'
```

| Function                | Signature                                                            | Description                                                                                                                                                              |
| ----------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `parseExpectedPatterns` | `(text) => ParseResult \| null`                                      | Parse and compile `(?<name>pattern)` named groups from a template. Returns `null` for no supported groups, invalid recognized regex bodies, or globally duplicate names. |
| `extractCaptures`       | `(originalText, modifiedText, parseResult) => ExtractResult \| null` | Extract captured values and their positions from the modified text. Returns `null` when the template does not match.                                                     |
| `tagExpectedRegions`    | `(diffs, captureRanges) => DisplayDiff[]`                            | Split raw diff tuples so regions overlapping a capture range are tagged as `expected`.                                                                                   |
| `cleanTemplate`         | `(text) => string`                                                   | Replace accepted named groups with readable `<name>` placeholders; return unchanged literal input when parsing rejects it.                                               |

These are the same functions the component uses internally; see [`src/lib/expectedPatterns.ts`](src/lib/expectedPatterns.ts) for full JSDoc.

## Events

The component emits a `processing` event with timing and diff information:

```svelte
<script lang="ts">
    import type { SvelteDiffTiming, SvelteDiffTuple } from '@humanspeak/svelte-diff'

    const onProcessing = (timing: SvelteDiffTiming, diffs: SvelteDiffTuple[]) => {
        console.log('Diff main time:', timing.main)
        console.log('Cleanup time:', timing.cleanup)
        console.log('Diff segments:', diffs.length)
    }
</script>

<SvelteDiff {originalText} {modifiedText} {onProcessing} />
```

## Cleanup Algorithms

### Semantic Cleanup

In character mode, when `cleanupSemantic` is enabled, the diff algorithm will:

- Factor out commonalities that are likely to be coincidental
- Improve human readability of the diff
- May increase computation time for large texts

### Efficiency Cleanup

In character mode, the `cleanupEfficiency` edit cost (default `4`) controls how aggressively the algorithm:

- Factors out short commonalities
- Reduces computational overhead
- Higher values mean more aggressive cleanup

## Performance Considerations

- For large texts, consider increasing the `timeout` value
- In character mode, use `cleanupSemantic` for better readability in small to medium texts
- In character mode, use `cleanupEfficiency` for better performance in large texts
- Unstyled built-in equal text renders without wrapper spans by default. Set `compact={false}` only when you need the legacy equal-span DOM:

    ```svelte
    <SvelteDiff {originalText} {modifiedText} compact={false} />
    ```

    In 0.4.0, `compact` defaults to `true`. If selectors or styles depend on the previous
    unstyled equal `<span>` elements, pass `compact={false}` while migrating. Equal child
    snippets, `renderers.equal`, and `rendererClasses.equal` continue to keep their requested
    markup.

- Monitor the `onProcessing` callback for timing information

<!-- docs-kit:ecosystem start -->

## Svelte 5 ecosystem

Part of the [Humanspeak](https://humanspeak.com) family of runes-native Svelte 5 packages:

<!-- prettier-ignore-start -->
| Package | Description |
| --- | --- |
| [@humanspeak/svelte-markdown](https://markdown.svelte.page) | Runtime markdown renderer for Svelte |
| [@humanspeak/svelte-virtual-list](https://virtuallist.svelte.page) | Virtual scrolling for Svelte |
| [@humanspeak/svelte-motion](https://motion.svelte.page) | Framer Motion for Svelte 5 |
| [@humanspeak/svelte-headless-table](https://table.svelte.page) | Headless data tables for Svelte |
| [@humanspeak/svelte-virtual-chat](https://virtualchat.svelte.page) | Virtual chat viewport for Svelte 5 |
| **[@humanspeak/svelte-diff](https://diff.svelte.page)** — _this package_ | Diff comparison for Svelte |
| [@humanspeak/svelte-purify](https://purify.svelte.page) | HTML sanitisation for Svelte |
| [@humanspeak/memory-cache](https://memory.svelte.page) | In-memory cache for TypeScript |
| [@humanspeak/svelte-json-view-lite](https://jsonview.svelte.page) | JSON tree viewer for Svelte 5 |
| [@humanspeak/svelte-scoped-props](https://scoped.svelte.page) | Scoped class props for Svelte |
<!-- prettier-ignore-end -->

## License

MIT © [Humanspeak, Inc.](LICENSE)

## Credits

Made with ❤️ by [Humanspeak](https://humanspeak.com)

<!-- docs-kit:ecosystem end -->

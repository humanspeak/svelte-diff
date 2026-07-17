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
- 🎯 Configurable cleanup algorithms (semantic and efficiency)
- 🧪 Comprehensive test coverage (vitest and playwright)
- 🔄 Svelte 5 runes compatibility
- ⚡ Configurable timeout for large text comparisons
- 📊 Detailed timing and diff statistics
- 🎨 Customizable diff highlighting styles
- 🔍 Real-time diff updates
- 🎯 Expected patterns — mark dynamic regions (dates, names) as "expected" instead of diffs

## Recent Updates

### New Features

- Expected patterns — use named regex capture groups to mark dynamic regions as "expected" instead of diffs
- Added detailed timing information for diff operations
- Enhanced cleanup algorithms for better diff results
- Improved performance for large text comparisons
- Added TypeScript types for all component props and events
- Implemented proper state management with Svelte 5 runes

### Testing Improvements

- Enhanced Playwright E2E test coverage
- Added comprehensive tests for cleanup algorithms
- Improved test reliability with proper component mounting checks

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
    import SvelteDiffMatchPatch from '@humanspeak/svelte-diff'

    let originalText = $state(`I am the very model of a modern Major-General,
I've information vegetable, animal, and mineral,
I know the kings of England, and I quote the fights historical,
From Marathon to Waterloo, in order categorical.`)

    let modifiedText = $state(`I am the very model of a cartoon individual,
My animation's comical, unusual, and whimsical,
I'm quite adept at funny gags, comedic theory I have read,
From wicked puns and stupid jokes to anvils that drop on your head.`)

    const onProcessing = (timing, diff) => {
        console.log('Diff timing:', timing)
        console.log('Diff result:', diff)
    }
</script>

<SvelteDiffMatchPatch
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
    SvelteDiffMatchPatchTiming,
    SvelteDiffMatchPatchDiff,
    SvelteDiffMatchPatchProps
} from '@humanspeak/svelte-diff'
```

## Props

| Prop              | Type       | Default | Description                                    |
| ----------------- | ---------- | ------- | ---------------------------------------------- |
| originalText      | `string`   | -       | The original text to compare against           |
| modifiedText      | `string`   | -       | The modified text to compare with original     |
| timeout           | `number`   | 1       | Timeout in seconds for diff computation        |
| cleanupSemantic   | `boolean`  | false   | Enable semantic cleanup for better readability |
| cleanupEfficiency | `number`   | 4       | Efficiency cleanup level (0-4)                 |
| onProcessing      | `function` | -       | Callback for timing and diff information       |
| rendererClasses   | `object`   | -       | CSS classes for diff highlighting              |
| renderers         | `object`   | -       | Custom Svelte snippets for rendering           |

## Custom Rendering with Snippets

You can customize how the diff is rendered using Svelte snippets. This gives you full control over the HTML structure and styling of each diff part.

```svelte
<script lang="ts">
    import SvelteDiffMatchPatch from '@humanspeak/svelte-diff'

    let originalText = $state(`I am the very model of a modern Major-General,
I've information vegetable, animal, and mineral,
I know the kings of England, and I quote the fights historical,
From Marathon to Waterloo, in order categorical.`)

    let modifiedText = $state(`I am the very model of a cartoon individual,
My animation's comical, unusual, and whimsical,
I'm quite adept at funny gags, comedic theory I have read,
From wicked puns and stupid jokes to anvils that drop on your head.`)
</script>

<SvelteDiffMatchPatch {originalText} {modifiedText}>
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
</SvelteDiffMatchPatch>

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

## Expected Patterns

Sometimes parts of your text are _supposed_ to differ — like the year and copyright holder in a license file. Expected patterns let you mark these dynamic regions with named regex capture groups so they render with distinct "expected" styling instead of showing up as noisy red/green diffs.

Use standard `(?<name>pattern)` syntax directly in your `originalText`:

```svelte
<SvelteDiffMatchPatch
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

| Snippet  | Parameters          | Description                                     |
| -------- | ------------------- | ----------------------------------------------- |
| expected | `text`, `groupName` | Renders matched capture regions with group name |

```svelte
<SvelteDiffMatchPatch {originalText} {modifiedText}>
    {#snippet expected(text: string, groupName: string)}
        <span class="expected" title={groupName}>{text}</span>
    {/snippet}
</SvelteDiffMatchPatch>
```

If no capture groups are present in `originalText`, the component behaves exactly as before — no changes needed to existing code.

## Events

The component emits a `processing` event with timing and diff information:

```svelte
<script lang="ts">
    import type {
        SvelteDiffMatchPatchTiming,
        SvelteDiffMatchPatchDiff
    } from '@humanspeak/svelte-diff'

    const onProcessing = (timing: SvelteDiffMatchPatchTiming, diff: SvelteDiffMatchPatchDiff) => {
        console.log('Diff computation time:', timing.computeTime)
        console.log('Cleanup time:', timing.cleanupTime)
        console.log('Total changes:', diff.length)
    }
</script>

<SvelteDiffMatchPatch {originalText} {modifiedText} {onProcessing} />
```

## Cleanup Algorithms

### Semantic Cleanup

When `cleanupSemantic` is enabled, the diff algorithm will:

- Factor out commonalities that are likely to be coincidental
- Improve human readability of the diff
- May increase computation time for large texts

### Efficiency Cleanup

The `cleanupEfficiency` level (0-4) controls how aggressively the algorithm:

- Factors out short commonalities
- Reduces computational overhead
- Higher values mean more aggressive cleanup

## Performance Considerations

- For large texts, consider increasing the `timeout` value
- Use `cleanupSemantic` for better readability in small to medium texts
- Use `cleanupEfficiency` for better performance in large texts
- Monitor the `onProcessing` callback for timing information

<!-- docs-kit:ecosystem start -->

## Svelte 5 ecosystem

Part of the [Humanspeak](https://humanspeak.com) family of runes-native Svelte 5 packages:

| Package                                                                  | Description                          |
| ------------------------------------------------------------------------ | ------------------------------------ |
| [@humanspeak/svelte-markdown](https://markdown.svelte.page)              | Runtime markdown renderer for Svelte |
| [@humanspeak/svelte-virtual-list](https://virtuallist.svelte.page)       | Virtual scrolling for Svelte         |
| [@humanspeak/svelte-motion](https://motion.svelte.page)                  | Framer Motion for Svelte 5           |
| [@humanspeak/svelte-headless-table](https://table.svelte.page)           | Headless data tables for Svelte      |
| **[@humanspeak/svelte-diff](https://diff.svelte.page)** — _this package_ | Diff comparison for Svelte           |
| [@humanspeak/svelte-purify](https://purify.svelte.page)                  | HTML sanitisation for Svelte         |
| [@humanspeak/svelte-virtual-chat](https://virtualchat.svelte.page)       | Virtual chat viewport for Svelte 5   |
| [@humanspeak/memory-cache](https://memory.svelte.page)                   | In-memory cache for TypeScript       |
| [@humanspeak/svelte-json-view-lite](https://jsonview.svelte.page)        | JSON tree viewer for Svelte 5        |
| [@humanspeak/svelte-scoped-props](https://scoped.svelte.page)            | Scoped class props for Svelte        |

## License

MIT © [Humanspeak, Inc.](LICENSE)

## Credits

Made with ❤️ by [Humanspeak](https://humanspeak.com)

<!-- docs-kit:ecosystem end -->

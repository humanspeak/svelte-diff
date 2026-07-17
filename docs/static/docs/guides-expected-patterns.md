<!-- Source: https://diff.svelte.page/docs/guides/expected-patterns -->

# Expected Patterns

> Mark intentional dynamic text such as dates, names, IDs, and versions as expected instead of noisy changes.

**Source:** [https://diff.svelte.page/docs/guides/expected-patterns](https://diff.svelte.page/docs/guides/expected-patterns)

---

Snapshots, generated files, invoices, and release notes often contain values that are supposed to change. Expected patterns let you label those regions separately instead of showing them as ordinary red/green edits.

## Named capture syntax

Put JavaScript-style named capture groups directly in `originalText`:

```svelte
<SvelteDiff
    originalText={'Release (?<version>v\\d+\\.\\d+\\.\\d+) on (?<date>\\d{4}-\\d{2}-\\d{2})'}
    modifiedText="Release v2.4.1 on 2026-07-17"
/>
```

The version and date render as `expected`. Their names and values are also available to rendering and callback code.

## Access captured values

```svelte
<script lang="ts">
    let captures = $state<Record<string, string>>({})
</script>

<SvelteDiff
    {originalText}
    {modifiedText}
    onProcessing={(_timing, _diffs, nextCaptures) => {
        captures = nextCaptures ?? {}
    }}
/>

<pre>{JSON.stringify(captures, null, 2)}</pre>
```

## Custom expected markup

```svelte
<SvelteDiff {originalText} {modifiedText}>
    {#snippet expected(text: string, groupName: string)}
        <span class="expected" title={`Matched ${groupName}`}>
            {text}
        </span>
    {/snippet}
</SvelteDiff>
```

## Flexible context matching

Patterns are matched using literal text around each named group as context. Extra content between the context and capture is tolerated. This is useful when the actual text adds punctuation or labels that the template does not include.

```text
Template: Copyright (?<year>\d{4}) (?<holder>.+)
Actual:   Copyright (c) 2026 Humanspeak, Inc.
```

`2026` and `Humanspeak, Inc.` can still be identified as the expected values while `(c)` remains a real insertion.

## Failure behavior

If the capture groups do not match, SvelteDiff cleans the template before computing the normal diff. Instead of exposing regex syntax to readers, it replaces each named group with a readable placeholder such as `<version>`.

If `originalText` contains no named groups, the component follows the ordinary diff path with no extra matching work.

## Pattern safety

Named groups are discovered with an iterative parenthesis-counting parser rather than a backtracking regex. Escaped parentheses and nested non-named groups are supported. Nested named groups are rejected to keep group ownership unambiguous.

The pattern body is still compiled as JavaScript regular expression syntax. Treat patterns as trusted configuration, not untrusted user input.

## Good uses

- Timestamps in snapshots
- Generated IDs and build numbers
- Copyright years and holders
- Package versions in release output
- User names or environment-specific paths

Expected patterns are not a general ignore system: successful values stay visible, receive their own styling, and remain available through `captures`.

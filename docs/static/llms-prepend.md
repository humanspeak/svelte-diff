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

- `cleanupSemantic` improves readability and takes precedence over efficiency cleanup.
- `cleanupEfficiency` defaults to `4`; set it to `0` to skip efficiency cleanup.
- Expected patterns use named capture groups such as `(?<year>\\d{4})` inside `originalText`.
- Child snippets override the corresponding `renderers` entry, which overrides built-in markup.
- `onProcessing` receives timing, raw diff tuples, and optional expected-pattern captures.

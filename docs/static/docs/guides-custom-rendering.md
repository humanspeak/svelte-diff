<!-- Source: https://diff.svelte.page/docs/guides/custom-rendering -->

# Custom Rendering

> Style SvelteDiff with semantic classes or replace individual diff segments with Svelte 5 snippets.

**Source:** [https://diff.svelte.page/docs/guides/custom-rendering](https://diff.svelte.page/docs/guides/custom-rendering)

---

SvelteDiff offers two customization levels. `rendererClasses` preserves the built-in markup and changes its classes. Snippets replace the markup itself.

## Class-based styling

```svelte
<SvelteDiff
    {originalText}
    {modifiedText}
    rendererClasses={{
        remove: 'change change--removed',
        insert: 'change change--inserted',
        equal: 'change change--equal',
        expected: 'change change--expected'
    }}
/>
```

```css
:global(.change--removed) {
    background: #fee2e2;
    color: #991b1b;
    text-decoration: line-through;
}

:global(.change--inserted) {
    background: #dcfce7;
    color: #166534;
}

:global(.change--expected) {
    background: #dbeafe;
    border-bottom: 1px dashed #2563eb;
}
```

The classes are applied only to the built-in `<span>` for that segment. A missing class falls back to the component's inline default for removed, inserted, or expected text.

## Direct child snippets

Use snippets when semantic HTML or richer UI matters:

```svelte
<SvelteDiff {originalText} {modifiedText}>
    {#snippet remove(text: string)}
        <del aria-label="removed">{text}</del>
    {/snippet}

    {#snippet insert(text: string)}
        <ins aria-label="inserted">{text}</ins>
    {/snippet}

    {#snippet expected(text: string, groupName: string)}
        <mark title={`Expected ${groupName}`}>{text}</mark>
    {/snippet}

    {#snippet lineBreak()}
        <br />
    {/snippet}
</SvelteDiff>
```

## Renderer maps

Snippets can also be assembled into a `renderers` object. This is useful when a design system owns reusable diff renderers.

```svelte
{#snippet removed(text: string)}<del class="removed">{text}</del>{/snippet}
{#snippet inserted(text: string)}<ins class="inserted">{text}</ins>{/snippet}

<SvelteDiff
    {originalText}
    {modifiedText}
    renderers={{ remove: removed, insert: inserted }}
/>
```

## Mixing strategies

Resolution is per type. A direct `insert` snippet can coexist with `renderers.remove`; equal text can still use the built-in fallback.

```svelte
<SvelteDiff {originalText} {modifiedText} renderers={{ remove: sharedRemove }}>
    {#snippet insert(text: string)}
        <AnimatedInsertion>{text}</AnimatedInsertion>
    {/snippet}
</SvelteDiff>
```

The direct child snippet wins for `insert`. The renderer map is used for `remove`. Everything else falls back to built-in rendering.

## Line breaks

The component splits multiline segments and calls `lineBreak` between lines. Override it when your output needs block separation, line numbers, or accessible separators.

Keep `white-space: pre-wrap` on the surrounding output if preserving other whitespace matters.

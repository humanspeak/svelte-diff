<!--
@component

A Svelte 5 component that visually compares two strings using the diff-match-patch algorithm.

Supports character, word, and line diffing, semantic and efficiency cleanup, custom rendering via Svelte snippets, and flexible CSS-class styling.

### Expected Patterns

When `originalText` contains named capture groups like `(?<year>\\d{4})`, the component
extracts matching values from `modifiedText` and renders them with distinct "expected"
styling instead of normal insert/remove colors. This is useful for templates where
certain dynamic regions (dates, names, versions) are expected to differ.

Names must be unique across the entire template. Invalid recognized regex bodies or
duplicate names use the original literal source with undefined captures. A valid
template that does not match uses readable `<name>` placeholders instead.

@example Basic usage with CSS classes
```svelte
<SvelteDiff
  originalText={oldValue}
  modifiedText={newValue}
  cleanupSemantic={true}
  rendererClasses={{
    remove: 'bg-red-100 text-red-800',
    insert: 'bg-green-100 text-green-800',
    equal: 'text-gray-700'
  }}
/>
```

@example Custom snippet rendering
```svelte
<SvelteDiff originalText={a} modifiedText={b}>
  {#snippet remove(text)}<del class="diff-remove">{text}</del>{/snippet}
  {#snippet insert(text)}<ins class="diff-insert">{text}</ins>{/snippet}
  {#snippet equal(text)}<span>{text}</span>{/snippet}
  {#snippet expected(text, groupName)}<mark title={groupName}>{text}</mark>{/snippet}
  {#snippet lineBreak()}<br />{/snippet}
</SvelteDiff>
```

@example Expected patterns (named capture groups)
```svelte
<SvelteDiff
  originalText={'Copyright (?<year>\\d{4}) (?<holder>.+)'}
  modifiedText={'Copyright 2024 Jason Kummerl'}
/>
```

@property {string} originalText - The original (left-side) string to compare (the "before" or source text). May contain `(?<name>pattern)` capture groups for expected-pattern matching.
@property {string} modifiedText - The modified (right-side) string to compare (the "after" or target text)
@property {'character'|'word'|'line'} [diffMode='character'] - Comparison granularity; word/line skip both cleanup passes
@property {boolean} [expectedPatterns=true] - Enable named capture templates; false compares exact literal source without parsing
@property {number} [timeout=1] - Maximum time in seconds to spend computing the diff (0 for unlimited)
@property {boolean} [cleanupSemantic=false] - If true, applies character-mode semantic cleanup; ignored for word/line
@property {number} [cleanupEfficiency=4] - Character-mode efficiency edit cost; ignored for word/line
@property {boolean} [compact=true] - By default, built-in equal segments without an equal class render as text. Set to false to restore legacy equal spans. Custom equal snippets/renderers and `rendererClasses.equal` retain their requested markup, and line breaks continue through the `lineBreak` renderer.
@property {function} [onProcessing] - Callback invoked after diff computation, receiving `(timing, diffs, captures?)`. The `captures` argument is a `Record<string, string>` when expected patterns match.
@property {Snippet} [remove] - Child snippet rendering a removed segment. Takes precedence over `renderers.remove`.
@property {Snippet} [insert] - Child snippet rendering an inserted segment. Takes precedence over `renderers.insert`.
@property {Snippet} [equal] - Child snippet rendering an unchanged segment. Takes precedence over `renderers.equal`.
@property {Snippet} [expected] - Child snippet rendering an expected segment, receiving `(text, groupName)`. Takes precedence over `renderers.expected`.
@property {Snippet} [lineBreak] - Child snippet rendering a line break between diff lines. Takes precedence over `renderers.lineBreak`.
@property {Partial<Renderers>} [renderers] - Custom Svelte snippets for rendering diff segments: `remove`, `insert`, `equal`, `expected`, and `lineBreak`. Per segment type, a child snippet wins over the `renderers` entry, which wins over the built-in rendering.
@property {RendererClasses} [rendererClasses] - Custom CSS classes for each diff type: `remove`, `insert`, `equal`, `expected`. Only effective for segment types with no custom snippet.
-->

<script lang="ts">
    import { DiffMatchPatch } from 'diff-match-patch-ts'
    import { untrack } from 'svelte'
    import { computeDiffWithEngine } from './computeDiff.js'
    import type { SvelteDiffMode, SvelteDiffProps, SvelteDiffResult } from './index.js'
    import { parseExpectedPatterns } from './expectedPatterns.js'

    const {
        originalText,
        modifiedText,
        timeout = 1,
        diffMode = 'character',
        cleanupSemantic = false,
        cleanupEfficiency = 4,
        expectedPatterns = true,
        compact = true,
        onProcessing,
        remove,
        insert,
        equal,
        expected: expectedSnippet,
        lineBreak,
        renderers = {},
        rendererClasses = {}
    }: SvelteDiffProps = $props()

    interface ComputationInput {
        originalText: string
        modifiedText: string
        diffMode: SvelteDiffMode
        timeout: number
        cleanupSemantic: boolean
        cleanupEfficiency: number
        expectedPatterns: boolean
        compiledPattern: ReturnType<typeof parseExpectedPatterns>
    }

    interface ComputationCache {
        input: ComputationInput
        result: SvelteDiffResult
    }

    // Plain (non-reactive) scratch instance: only configured and called inside
    // computeDiffWithEngine, never read reactively, so it needs no $state wrapper.
    const dmp = new DiffMatchPatch()
    let computationCache: ComputationCache | undefined
    let parserCache:
        | {
              originalText: string
              result: ReturnType<typeof parseExpectedPatterns>
          }
        | undefined
    const parseResult = $derived.by(() => {
        if (!expectedPatterns) return null
        if (parserCache?.originalText === originalText) return parserCache.result
        const result = parseExpectedPatterns(originalText)
        parserCache = { originalText, result }
        return result
    })

    // Reactive props re-fire on rerender even when their values are unchanged,
    // so compare inputs by value and reuse the cached result to keep diff
    // identity stable when only non-computation props (e.g. onProcessing) change.
    const processingResult = $derived.by(() => {
        const input: ComputationInput = {
            originalText,
            modifiedText,
            timeout,
            diffMode,
            cleanupSemantic,
            cleanupEfficiency,
            expectedPatterns,
            compiledPattern: parseResult
        }
        if (
            computationCache?.input.originalText === input.originalText &&
            computationCache.input.modifiedText === input.modifiedText &&
            computationCache.input.timeout === input.timeout &&
            computationCache.input.diffMode === input.diffMode &&
            computationCache.input.cleanupSemantic === input.cleanupSemantic &&
            computationCache.input.cleanupEfficiency === input.cleanupEfficiency &&
            computationCache.input.expectedPatterns === input.expectedPatterns &&
            computationCache.input.compiledPattern === input.compiledPattern
        ) {
            return computationCache.result
        }

        const result = computeDiffWithEngine(
            dmp,
            input.originalText,
            input.modifiedText,
            input,
            input.compiledPattern
        )
        computationCache = { input, result }
        return result
    })

    $effect(() => {
        const result = processingResult
        const callback = onProcessing
        untrack(() => {
            callback?.(result.timing, result.diffs, result.captures)
        })
    })

    // Per segment type: child snippet > renderers entry > built-in fallback.
    // With no equal snippet/renderer/class, `compact` selects a wrapper-free
    // text fallback so unchanged runs render as plain text nodes, not spans.
    const displayRenderers = $derived({
        remove: remove ?? renderers.remove ?? removeFallback,
        insert: insert ?? renderers.insert ?? insertFallback,
        equal:
            equal ??
            renderers.equal ??
            (compact && !rendererClasses.equal ? equalTextFallback : equalFallback),
        expected: expectedSnippet ?? renderers.expected ?? expectedFallback,
        lineBreak: lineBreak ?? renderers.lineBreak ?? lineBreakFallback
    })
</script>

{#each processingResult.displayDiffs as diff, index (index)}
    {@const { operation, text, expected } = diff}
    <!-- Hydrated snippet ranges need a fresh owner when switching display shape.
         Same-shape text updates keep their existing renderer and DOM. -->
    {#key text.includes('\n')}
        {#if expected}
            {#if text.includes('\n')}
                {#each text.split('\n') as line, lineIndex (lineIndex)}
                    {#if lineIndex > 0}{@render displayRenderers.lineBreak()}{/if}{#if line.length > 0}{@render displayRenderers.expected(
                            line,
                            expected
                        )}{/if}
                {/each}
            {:else}
                {@render displayRenderers.expected(text, expected)}
            {/if}
        {:else}
            {@const renderer =
                operation === 0
                    ? displayRenderers.equal
                    : operation === -1
                      ? displayRenderers.remove
                      : displayRenderers.insert}
            {#if text.includes('\n') && renderer === equalTextFallback && displayRenderers.lineBreak === lineBreakFallback}
                <!-- Built-in compact lines need no dynamic snippet branches. -->
                {#each text.split('\n') as line, lineIndex (lineIndex)}
                    {#if lineIndex > 0}<br />{/if}{line}
                {/each}
            {:else if text.includes('\n')}
                {#each text.split('\n') as line, lineIndex (lineIndex)}
                    {#if lineIndex > 0}{@render displayRenderers.lineBreak()}{/if}{#if line.length > 0}{@render renderer(
                            line
                        )}{/if}
                {/each}
            {:else}
                {@render renderer(text)}
            {/if}
        {/if}
    {/key}
{/each}

{#snippet removeFallback(text: string)}
    <span
        class={rendererClasses.remove}
        style={rendererClasses.remove ? '' : 'background-color: red;text-decoration: line-through;'}
        >{text}</span
    >
{/snippet}

{#snippet insertFallback(text: string)}
    <span
        class={rendererClasses.insert}
        style={rendererClasses.insert ? '' : 'background-color: green;'}>{text}</span
    >
{/snippet}

{#snippet equalFallback(text: string)}
    <span class={rendererClasses.equal}>{text}</span>
{/snippet}

{#snippet equalTextFallback(text: string)}{text}{/snippet}

{#snippet expectedFallback(text: string, groupName: string)}
    <span
        class={rendererClasses.expected}
        style={rendererClasses.expected
            ? ''
            : 'background-color: #dbeafe; border-bottom: 1px dashed #3b82f6;'}
        data-capture-name={groupName}
        data-capture-value={processingResult.captures?.[groupName] ?? text}
        title={groupName}>{text}</span
    >
{/snippet}

{#snippet lineBreakFallback()}
    <br />
{/snippet}

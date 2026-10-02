<script lang="ts">
    import type { HighlightTokenResult } from '@tanstack/highlight/core'
    import { DiffOp } from 'diff-match-patch-ts'
    import type { CodeDiffProps } from './code.js'
    import { composeCodeDiff, type CodePiece } from './codeDiff.js'
    import { computeDiff } from './computeDiff.js'

    let {
        originalText,
        modifiedText,
        highlighter,
        language = 'plaintext',
        diffMode = 'word',
        timeout = 1,
        cleanupSemantic = false,
        cleanupEfficiency = 0,
        class: className = '',
        ariaLabel = 'Code differences',
        rendererClasses = {}
    }: CodeDiffProps = $props()

    // Each closure belongs to this component instance. Value keys also survive
    // Testing Library's replacement props objects without repeating source work.
    const tokenCache = () => {
        let previous:
            | {
                  text: string
                  language: string
                  highlighter: CodeDiffProps['highlighter']
                  result: HighlightTokenResult
              }
            | undefined
        return (text: string, language: string, highlighter: CodeDiffProps['highlighter']) => {
            if (
                previous?.text === text &&
                previous.language === language &&
                previous.highlighter === highlighter
            )
                return previous.result
            const result = highlighter.tokenize(text, { lang: language })
            previous = { text, language, highlighter, result }
            return result
        }
    }
    const originalCache = tokenCache()
    const modifiedCache = tokenCache()
    const diffCache = (() => {
        let previous: { key: string; result: ReturnType<typeof computeDiff> } | undefined
        return (
            before: string,
            after: string,
            mode: typeof diffMode,
            deadline: number,
            semantic: boolean,
            efficiency: number
        ) => {
            const key = JSON.stringify([before, after, mode, deadline, semantic, efficiency])
            if (previous?.key === key) return previous.result
            const result = computeDiff(before, after, {
                diffMode: mode,
                timeout: deadline,
                cleanupSemantic: semantic,
                cleanupEfficiency: efficiency,
                expectedPatterns: false
            })
            previous = { key, result }
            return result
        }
    })()
    const originalTokens = $derived(originalCache(originalText, language, highlighter))
    const modifiedTokens = $derived(modifiedCache(modifiedText, language, highlighter))
    const comparison = $derived(
        diffCache(originalText, modifiedText, diffMode, timeout, cleanupSemantic, cleanupEfficiency)
    )
    const runs = $derived(composeCodeDiff(comparison.diffs, originalTokens, modifiedTokens))
</script>

{#snippet syntax(
    pieces: CodePiece[]
)}{#each pieces as piece, index (index)}{#if piece.className}<span class={`th-${piece.className}`}
                >{piece.value}</span
            >{:else}{piece.value}{/if}{/each}{/snippet}

<!-- svelte-ignore a11y_no_noninteractive_tabindex (Named overflow region must support keyboard scrolling.) -->
<pre
    class={`th-code svelte-code-diff ${className}`}
    role="region"
    aria-label={ariaLabel}
    tabindex="0"><code
        >{#each runs as run, index (index)}{#if run.operation === DiffOp.Delete}<del
                    data-diff="remove"
                    aria-label="Removed"
                    class={rendererClasses.remove}>{@render syntax(run.pieces)}</del
                >{:else if run.operation === DiffOp.Insert}<ins
                    data-diff="insert"
                    aria-label="Inserted"
                    class={rendererClasses.insert}>{@render syntax(run.pieces)}</ins
                >{:else}<span data-diff="equal">{@render syntax(run.pieces)}</span
                >{/if}{/each}</code
    ></pre>

<style>
    .svelte-code-diff {
        white-space: pre;
        overflow: auto;
        max-width: 100%;
    }
    del {
        background: var(--svelte-diff-remove-bg, #ffd7d580);
        text-decoration: none;
    }
    ins {
        background: var(--svelte-diff-insert-bg, #d4ffd480);
        text-decoration: none;
    }
</style>

<script lang="ts">
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

    // Props re-fire with unchanged values on rerender; reuse the last result
    // when every argument is identical so tokenizing and diffing run only on change.
    const memoizeLast = <A extends unknown[], R>(compute: (...args: A) => R) => {
        let previous: { args: A; result: R } | undefined
        return (...args: A): R => {
            if (previous?.args.every((value, index) => Object.is(value, args[index])))
                return previous.result
            const result = compute(...args)
            previous = { args, result }
            return result
        }
    }
    const tokenize = (text: string, language: string, highlighter: CodeDiffProps['highlighter']) =>
        highlighter.tokenize(text, { lang: language })
    const originalCache = memoizeLast(tokenize)
    const modifiedCache = memoizeLast(tokenize)
    const diffCache = memoizeLast(
        (
            before: string,
            after: string,
            mode: NonNullable<CodeDiffProps['diffMode']>,
            deadline: number,
            semantic: boolean,
            efficiency: number
        ) =>
            computeDiff(before, after, {
                diffMode: mode,
                timeout: deadline,
                cleanupSemantic: semantic,
                cleanupEfficiency: efficiency,
                expectedPatterns: false
            })
    )
    const originalTokens = $derived(originalCache(originalText, language, highlighter))
    const modifiedTokens = $derived(modifiedCache(modifiedText, language, highlighter))
    const comparison = $derived(
        diffCache(originalText, modifiedText, diffMode, timeout, cleanupSemantic, cleanupEfficiency)
    )
    const runs = $derived(composeCodeDiff(comparison.diffs, originalTokens, modifiedTokens))

    // Keep keyboard overflow scrolling consistent across browsers.
    const handleKeydown = (event: KeyboardEvent & { currentTarget: HTMLPreElement }) => {
        if (
            event.defaultPrevented ||
            event.altKey ||
            event.ctrlKey ||
            event.metaKey ||
            event.shiftKey
        )
            return
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return

        const region = event.currentTarget
        const maxScrollLeft = region.scrollWidth - region.clientWidth
        if (maxScrollLeft <= 0) return
        if (
            (event.key === 'ArrowLeft' && region.scrollLeft <= 0) ||
            (event.key === 'ArrowRight' && region.scrollLeft >= maxScrollLeft)
        )
            return

        region.scrollLeft = Math.max(
            0,
            Math.min(maxScrollLeft, region.scrollLeft + (event.key === 'ArrowRight' ? 40 : -40))
        )
        event.preventDefault()
    }
</script>

{#snippet syntax(
    pieces: CodePiece[]
)}{#each pieces as piece, index (index)}{#if piece.className}<span class={`th-${piece.className}`}
                >{piece.value}</span
            >{:else}{piece.value}{/if}{/each}{/snippet}

<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions (Named overflow region must support keyboard scrolling.) -->
<pre
    class={`th-code svelte-code-diff ${className}`}
    role="region"
    aria-label={ariaLabel}
    onkeydown={handleKeydown}
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

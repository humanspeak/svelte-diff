import type { Highlighter } from '@tanstack/highlight/core'
import CodeDiff from './CodeDiff.svelte'
import type { RendererClasses, SvelteDiffMode } from './index.js'

export default CodeDiff
/** Syntax-highlighted literal source comparison in one combined code block. */
export { CodeDiff }

/** Props for the optional code entry; supply a selectively registered highlighter. */
export type CodeDiffProps = {
    /** Complete original source, preserved literally. */
    originalText: string
    /** Complete modified source, preserved literally. */
    modifiedText: string
    /** Caller-owned tokenizer; language registrations determine syntax support. */
    highlighter: Pick<Highlighter, 'tokenize'>
    /** Registered language or alias; defaults to plaintext. */
    language?: string
    /** Comparison granularity; defaults to word. */
    diffMode?: SvelteDiffMode
    /** Diff deadline in seconds; defaults to 1, with 0 unlimited. */
    timeout?: number
    /** Character-mode semantic cleanup; defaults to false. */
    cleanupSemantic?: boolean
    /** Character-mode efficiency edit cost; defaults to 0 (disabled). */
    cleanupEfficiency?: number
    /** Additional classes on the outer pre element. */
    class?: string
    /** Accessible overflow-region name; defaults to Code differences. */
    ariaLabel?: string
    /** Additional operation classes; syntax foreground remains theme-owned. */
    rendererClasses?: Pick<RendererClasses, 'remove' | 'insert'>
}

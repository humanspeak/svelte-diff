import type { Diff } from 'diff-match-patch-ts'
import type { Snippet } from 'svelte'
import SvelteDiff from './SvelteDiff.svelte'

export default SvelteDiff
/** The diff component, also available as a named export alongside the default. */
export { SvelteDiff }
/**
 * @deprecated Use {@link SvelteDiff} instead. `SvelteDiffMatchPatch` is a
 * backward-compatible alias kept from before the component was renamed, and may
 * be removed in a future major version.
 */
export const SvelteDiffMatchPatch = SvelteDiff
export type { CaptureRange, DisplayDiff, PatternMatchResult } from './expectedPatterns.js'
/**
 * Custom Svelte 5 snippets for rendering each diff segment type.
 *
 * When provided via the `renderers` prop, these snippets replace the
 * component's default `<span>` rendering entirely — you control the
 * markup and styling for every segment.
 *
 * @example
 * ```svelte
 * <SvelteDiff originalText={a} modifiedText={b}>
 *   {#snippet remove(text)}<del>{text}</del>{/snippet}
 *   {#snippet insert(text)}<ins>{text}</ins>{/snippet}
 *   {#snippet equal(text)}<span>{text}</span>{/snippet}
 *   {#snippet expected(text, groupName)}<mark title={groupName}>{text}</mark>{/snippet}
 *   {#snippet lineBreak()}<br />{/snippet}
 * </SvelteDiff>
 * ```
 */
export type Renderers = {
    /** Renders a **removed** (deleted) text segment. Receives the removed text. */
    remove?: Snippet<[string]>
    /** Renders an **equal** (unchanged) text segment. Receives the unchanged text. */
    equal?: Snippet<[string]>
    /** Renders an **inserted** (added) text segment. Receives the inserted text. */
    insert?: Snippet<[string]>
    /** Renders an **expected** text segment (matched a named capture group). Receives `(text, groupName)`. */
    expected?: Snippet<[string, string]>
    /** Renders a line break between diff lines. Receives no arguments. */
    lineBreak?: Snippet<[]>
}

/**
 * CSS class overrides for each diff segment type.
 *
 * A simpler alternative to full `renderers` — the component still renders
 * its default `<span>` elements but applies your class strings instead of
 * inline styles. Only effective when `renderers` is **not** provided.
 *
 * @example
 * ```svelte
 * <SvelteDiff
 *   originalText={a}
 *   modifiedText={b}
 *   rendererClasses={{
 *     remove: 'bg-red-100 line-through',
 *     insert: 'bg-green-100',
 *     equal: 'text-gray-700',
 *     expected: 'bg-blue-100 border-b border-dashed border-blue-500'
 *   }}
 * />
 * ```
 */
export type RendererClasses = {
    /** CSS class for **removed** (deleted) text segments. */
    remove?: string
    /** CSS class for **equal** (unchanged) text segments. */
    equal?: string
    /** CSS class for **inserted** (added) text segments. */
    insert?: string
    /** CSS class for **expected** text segments (matched named capture groups). */
    expected?: string
}

/**
 * Timing information from a diff computation, in milliseconds.
 *
 * Passed as the first argument to the {@link SvelteDiffProps.onProcessing | onProcessing} callback.
 */
export type SvelteDiffTiming = {
    /** Time spent in the core `diff_main` algorithm (ms). */
    main: number
    /** Time spent in semantic or efficiency cleanup (ms). */
    cleanup: number
    /** Total wall-clock time for the entire diff operation (ms). */
    total: number
}
/**
 * @deprecated Use {@link SvelteDiffTiming} instead. Backward-compatible alias
 * kept from before the component was renamed.
 */
export type SvelteDiffMatchPatchTiming = SvelteDiffTiming

/**
 * A single diff tuple from the diff-match-patch algorithm.
 *
 * Re-exported from `diff-match-patch-ts` for convenience.
 * Each tuple is `[operation, text]` where operation is `-1` (remove), `0` (equal), or `1` (insert).
 */
export type SvelteDiffTuple = Diff
/**
 * @deprecated Use {@link SvelteDiffTuple} instead. Backward-compatible alias
 * kept from before the component was renamed.
 */
export type SvelteDiffMatchPatchDiff = SvelteDiffTuple
export interface SvelteDiffProps {
    /**
     * The original (left-side) string to compare.
     *
     * This is typically the **"before"** or **"source"** text in a diff operation.
     *
     * ## Example
     * ```svelte
     * <SvelteDiff originalText={oldValue} ... />
     * ```
     */
    originalText: string
    /**
     * The modified (right-side) string to compare.
     *
     * This is typically the **"after"** or **"target"** text in a diff operation.
     *
     * ## Example
     * ```svelte
     * <SvelteDiff modifiedText={newValue} ... />
     * ```
     */
    modifiedText: string
    /**
     * Maximum time in seconds to spend computing the diff.
     *
     * Set to `0` for unlimited computation time. Default: `1`.
     *
     * Useful for very large texts or when you want to limit processing time for performance reasons.
     *
     * ## Example
     * ```svelte
     * <SvelteDiff timeout={2} ... />
     * ```
     */
    timeout?: number
    /**
     * If `true`, applies semantic cleanup to the diff for human readability.
     *
     * This makes the diff output easier to read by factoring out commonalities that are likely to be coincidental.
     * Default: `false`.
     *
     * ## Example
     * ```svelte
     * <SvelteDiff cleanupSemantic={true} ... />
     * ```
     */
    cleanupSemantic?: boolean
    /**
     * Edit cost for efficiency cleanup.
     *
     * Higher values make the diff more aggressive in factoring out trivial commonalities.
     * Default: `4`.
     *
     * ## Example
     * ```svelte
     * <SvelteDiff cleanupEfficiency={8} ... />
     * ```
     */
    cleanupEfficiency?: number
    /**
     * If `true`, built-in equal segments without an equal class render as text.
     *
     * Custom equal child snippets and `renderers.equal` retain their requested
     * markup, as does the built-in renderer when `rendererClasses.equal` is
     * nonempty. Line breaks continue through the configured or built-in
     * `lineBreak` renderer. Default: `false`.
     *
     * ## Example
     * ```svelte
     * <SvelteDiff originalText={a} modifiedText={b} compact={true} />
     * ```
     */
    compact?: boolean
    /**
     * Callback invoked after diff computation with timing, diffs, and optional captures.
     *
     * @param timing - `{ main, cleanup, total }` in milliseconds.
     * @param diffs - The raw diff tuples from diff-match-patch.
     * @param captures - When expected patterns match, a `Record<string, string>` mapping
     *   group names to their captured values (e.g., `{ year: "2024", holder: "Jason" }`).
     *
     * ## Example
     * ```svelte
     * <SvelteDiff
     *   originalText={template}
     *   modifiedText={actual}
     *   onProcessing={(timing, diffs, captures) => {
     *     console.log(`Diff took ${timing.total}ms`);
     *     if (captures) console.log('Matched:', captures);
     *   }}
     * />
     * ```
     */
    onProcessing?: (
        _timing: SvelteDiffTiming,
        _diffs: SvelteDiffTuple[],
        _captures?: Record<string, string>
    ) => void
    /**
     * Renders a **removed** (deleted) text segment. Receives the removed text.
     *
     * Declared inside the component tags as a child snippet. Takes precedence
     * over `renderers.remove`.
     *
     * ## Example
     * ```svelte
     * <SvelteDiff ...>
     *   {#snippet remove(text: string)}<del>{text}</del>{/snippet}
     * </SvelteDiff>
     * ```
     */
    remove?: Snippet<[string]>
    /**
     * Renders an **inserted** (added) text segment. Receives the inserted text.
     *
     * Declared inside the component tags as a child snippet. Takes precedence
     * over `renderers.insert`.
     */
    insert?: Snippet<[string]>
    /**
     * Renders an **equal** (unchanged) text segment. Receives the unchanged text.
     *
     * Declared inside the component tags as a child snippet. Takes precedence
     * over `renderers.equal`.
     */
    equal?: Snippet<[string]>
    /**
     * Renders an **expected** text segment (matched a named capture group).
     * Receives `(text, groupName)`.
     *
     * Declared inside the component tags as a child snippet. Takes precedence
     * over `renderers.expected`.
     */
    expected?: Snippet<[string, string]>
    /**
     * Renders a line break between diff lines. Receives no arguments.
     *
     * Declared inside the component tags as a child snippet. Takes precedence
     * over `renderers.lineBreak`.
     */
    lineBreak?: Snippet<[]>
    /**
     * Custom Svelte snippets for rendering diff segments.
     *
     * Override the default rendering for `remove`, `insert`, `equal`, `expected`,
     * and `lineBreak` segments.
     *
     * Resolution order per segment type: a child snippet declared inside the
     * component tags wins, then the matching `renderers` entry, then the
     * component's built-in rendering.
     *
     * ## Example
     * ```svelte
     * <SvelteDiff ... renderers={{ remove: myRemove, insert: myInsert }} />
     * ```
     *
     * @see rendererClasses for simple CSS class-based styling
     */
    renderers?: Renderers
    /**
     * Custom CSS classes for each diff type (remove, insert, equal).
     *
     * ## Usage
     *
     * Pass an object with keys for each diff type you want to style:
     *
     * ```js
     * rendererClasses={{
     *   remove: 'bg-red-100 text-red-800',
     *   insert: 'bg-green-100 text-green-800',
     *   equal: 'text-gray-700'
     * }}
     * ```
     *
     * - `remove`: CSS class for removed segments (removed text)
     * - `insert`: CSS class for inserted segments (added text)
     * - `equal`:  CSS class for unchanged segments
     *
     * ## Important
     *
     * - **This only works if you do NOT specify the `renderers` prop.**
     *   If you provide custom `renderers`, you are responsible for all rendering and styling.
     * - If a class is not provided for a type, the component will fall back to its default inline style for that type.
     * - This is a convenient way to style the diff output using Tailwind, custom classes, or your own CSS framework.
     *
     * ## Example
     *
     * ```svelte
     * <SvelteDiff
     *   originalText={a}
     *   modifiedText={b}
     *   rendererClasses={{
     *     remove: 'bg-red-100 text-red-800',
     *     insert: 'bg-green-100 text-green-800',
     *     equal: 'text-gray-700'
     *   }}
     * />
     * ```
     *
     * @see renderers for full custom rendering
     */
    rendererClasses?: RendererClasses
}
/**
 * @deprecated Use {@link SvelteDiffProps} instead. Backward-compatible alias
 * kept from before the component was renamed.
 */
export type SvelteDiffMatchPatchProps = SvelteDiffProps

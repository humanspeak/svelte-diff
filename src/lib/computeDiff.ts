import { DiffMatchPatch } from 'diff-match-patch-ts'
import { computeTokenDiff } from './diffModes.js'
import { extractCaptures, parseExpectedPatterns, tagExpectedRegions } from './expectedPatterns.js'
import type { SvelteDiffComputeOptions, SvelteDiffResult } from './index.js'

/**
 * Computes a diff with caller-owned engine and compiled metadata.
 *
 * @param dmp Engine reused by the component.
 * @param text1 Original source.
 * @param text2 Modified source.
 * @param options Resolved computation options.
 * @param compiledPattern Parsed template, or null for literal comparison.
 * @return Raw tuples, display segments, captures, and millisecond timings.
 * @internal
 */
export const computeDiffWithEngine = (
    dmp: DiffMatchPatch,
    text1: string,
    text2: string,
    options: Required<SvelteDiffComputeOptions>,
    compiledPattern: ReturnType<typeof parseExpectedPatterns>
): SvelteDiffResult => {
    dmp.Diff_Timeout = options.timeout
    dmp.Diff_EditCost = options.cleanupEfficiency

    let diffText1 = text1
    let captures: Record<string, string> | undefined
    let captureRanges: import('./expectedPatterns.js').CaptureRange[] = []

    if (compiledPattern) {
        const extractResult = extractCaptures(text1, text2, compiledPattern)
        if (extractResult) {
            diffText1 = extractResult.resolvedText
            captures = extractResult.captures
            captureRanges = extractResult.captureRangesInText2
        } else {
            // Regex didn't match — clean template so users see <name> not (?<name>...)
            diffText1 = compiledPattern.cleanedText
        }
    }

    const startTotal = performance.now()
    const diffs =
        options.diffMode === 'character'
            ? dmp.diff_main(diffText1, text2)
            : computeTokenDiff(dmp, diffText1, text2, options.diffMode, options.timeout)
    const endMain = performance.now()

    const startCleanup = performance.now()
    if (options.diffMode === 'character' && options.cleanupSemantic) {
        dmp.diff_cleanupSemantic(diffs)
    } else if (options.diffMode === 'character' && options.cleanupEfficiency > 0) {
        dmp.diff_cleanupEfficiency(diffs)
    }
    const endTotal = performance.now()

    const timing = {
        main: endMain - startTotal,
        cleanup: options.diffMode === 'character' ? endTotal - startCleanup : 0,
        total: endTotal - startTotal
    }
    const displayDiffs =
        captureRanges.length > 0
            ? tagExpectedRegions(diffs as [number, string][], captureRanges)
            : diffs.map(([operation, text]) => ({ operation, text }))

    return {
        timing,
        diffs,
        captures,
        displayDiffs
    }
}

/**
 * Computes a synchronous diff within a Svelte-aware toolchain.
 *
 * @param originalText Original source or an explicitly enabled template.
 * @param modifiedText Modified source.
 * @param options Comparison options; expected patterns default to false.
 * @return Raw tuples, display segments, optional captures, and millisecond timings.
 */
export const computeDiff = (
    originalText: string,
    modifiedText: string,
    options: SvelteDiffComputeOptions = {}
): SvelteDiffResult => {
    const resolved = {
        diffMode: options.diffMode ?? 'character',
        timeout: options.timeout ?? 1,
        cleanupSemantic: options.cleanupSemantic ?? false,
        cleanupEfficiency: options.cleanupEfficiency ?? 4,
        expectedPatterns: options.expectedPatterns ?? false
    }
    return computeDiffWithEngine(
        new DiffMatchPatch(),
        originalText,
        modifiedText,
        resolved,
        resolved.expectedPatterns ? parseExpectedPatterns(originalText) : null
    )
}

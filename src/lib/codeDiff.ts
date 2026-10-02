import type { HighlightToken, HighlightTokenResult } from '@tanstack/highlight/core'
import { DiffOp, type Diff } from 'diff-match-patch-ts'

/** A literal source fragment with its complete-source syntax classification. @internal */
export type CodePiece = HighlightToken
/** One raw diff operation split at syntax boundaries. @internal */
export type CodeRun = { operation: Diff[0]; pieces: CodePiece[] }

/** Create a monotonic UTF-16 source cursor, including unclassified intervals. */
const sourceCursor = (result: HighlightTokenResult) => {
    let offset = 0
    const intervals = result.tokens.flatMap((token) => {
        const start = offset
        offset += token.value.length
        return token.value.length ? [{ start, end: offset, token }] : []
    })
    let index = 0
    return (start: number, length: number): CodePiece[] => {
        const end = start + length
        const pieces: CodePiece[] = []
        while (index < intervals.length && intervals[index].end <= start) index++
        while (index < intervals.length && intervals[index].start < end) {
            const interval = intervals[index]
            const from = Math.max(start, interval.start)
            const to = Math.min(end, interval.end)
            pieces.push({
                className: interval.token.className,
                value: interval.token.value.slice(from - interval.start, to - interval.start)
            })
            if (interval.end > end) break
            index++
        }
        return pieces
    }
}

/**
 * Compose existing raw diffs and complete-source token results without tokenizing.
 * Deletions read original syntax; equals and insertions read modified syntax.
 * Cursors only move forward; joining either side preserves every UTF-16 unit.
 * @internal
 */
export const composeCodeDiff = (
    diffs: readonly Diff[],
    original: HighlightTokenResult,
    modified: HighlightTokenResult
): CodeRun[] => {
    const before = sourceCursor(original)
    const after = sourceCursor(modified)
    let beforePos = 0
    let afterPos = 0
    return diffs.map(([operation, text]) => {
        const pieces =
            operation === DiffOp.Delete
                ? before(beforePos, text.length)
                : after(afterPos, text.length)
        if (operation !== DiffOp.Insert) beforePos += text.length
        if (operation !== DiffOp.Delete) afterPos += text.length
        return { operation, pieces }
    })
}

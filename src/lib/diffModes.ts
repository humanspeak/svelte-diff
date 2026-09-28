import type { Diff, DiffMatchPatch } from 'diff-match-patch-ts'

/**
 * Compares lossless word or line tokens using one shared UTF-16 dictionary.
 *
 * @param dmp - Configured engine; its timeout setting is preserved.
 * @param before - Resolved source text.
 * @param after - Target text.
 * @param mode - Token granularity.
 * @param timeout - Best-effort deadline in seconds; zero means unlimited.
 * @returns Original-text tuples, or a complete replacement on capacity/deadline expiry.
 */
export const computeTokenDiff = (
    dmp: DiffMatchPatch,
    before: string,
    after: string,
    mode: 'word' | 'line',
    timeout: number
): Diff[] => {
    const deadline = timeout > 0 ? Date.now() + timeout * 1000 : Number.MAX_VALUE
    if (before === after) return before ? [[0, before]] : []
    if (!before) return [[1, after]]
    if (!after) return [[-1, before]]
    const replacement = (): Diff[] => [
        [-1, before],
        [1, after]
    ]
    const expired = (): boolean => timeout > 0 && Date.now() >= deadline
    const dictionary = new Map<string, number>()
    const tokens = ['']
    const encode = (text: string): string | undefined => {
        const lexer =
            mode === 'word'
                ? /\r\n|[\r\n]|[^\S\r\n]+|[\p{L}\p{M}\p{N}_]+|[^\s\p{L}\p{M}\p{N}_]/gu
                : /[^\r\n]*(?:\r\n|[\r\n])|[^\r\n]+$/g
        const encoded: string[] = []
        for (const match of text.matchAll(lexer)) {
            if (encoded.length % 1024 === 0 && expired()) return undefined
            const token = match[0]
            let id = dictionary.get(token)
            if (id === undefined) {
                if (tokens.length > 65535) return undefined
                id = tokens.length
                dictionary.set(token, id)
                tokens.push(token)
            }
            encoded.push(String.fromCharCode(id))
        }
        return expired() ? undefined : encoded.join('')
    }
    const encodedBefore = encode(before)
    if (encodedBefore === undefined) return replacement()
    const encodedAfter = encode(after)
    if (encodedAfter === undefined || expired()) return replacement()
    const encodedDiffs = dmp.diff_main(encodedBefore, encodedAfter, false, deadline)
    const result: Diff[] = []
    for (const [operation, encoded] of encodedDiffs) {
        if (expired()) return replacement()
        const decoded: string[] = []
        // IDs in the surrogate range are independent code units, not code points.
        for (let index = 0; index < encoded.length; index++) {
            if (index % 1024 === 0 && expired()) return replacement()
            decoded.push(tokens[encoded.charCodeAt(index)])
        }
        const text = decoded.join('')
        if (text) result.push([operation, text])
    }
    return expired() ? replacement() : result
}

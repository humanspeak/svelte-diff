/**
 * Describes the position of a named capture group match within the modified text.
 *
 * Used to track where dynamic "expected" regions (e.g., year, holder name)
 * appear in `modifiedText` so they can be tagged with distinct styling.
 */
export interface CaptureRange {
    /** The name of the capture group (e.g., `"year"`, `"holder"`). */
    name: string
    /** The start index (inclusive) in `modifiedText`. */
    start: number
    /** The end index (exclusive) in `modifiedText`. */
    end: number
}

/**
 * A single segment of a diff result, optionally tagged as an "expected" region.
 *
 * - `operation` follows diff-match-patch conventions: `-1` = remove, `0` = equal, `1` = insert.
 * - When `expected` is set, this segment matched a named capture group and should
 *   render with "expected" styling rather than insert/remove colors.
 */
export interface DisplayDiff {
    /** The diff operation: `-1` (remove), `0` (equal), or `1` (insert). */
    operation: number
    /** The text content of this diff segment. */
    text: string
    /** If set, the name of the capture group this segment matched (e.g., `"year"`). */
    expected?: string
}

/**
 * The result of matching expected patterns against modified text.
 *
 * Returned by {@link extractCaptures} when all capture groups successfully match.
 */
export interface PatternMatchResult {
    /** The template with capture group syntax replaced by actual captured values. */
    resolvedText: string
    /** A map of capture group names to their matched values. */
    captures: Record<string, string>
    /** The positions of each capture in `modifiedText`. */
    captureRanges: CaptureRange[]
}

interface ParsedGroup {
    name: string
    pattern: string
}

/**
 * Information about a group's position in the original template line.
 */
interface LineGroup {
    name: string
    pattern: string
    /** Index within the line where the full group syntax starts. */
    indexInLine: number
}

/**
 * Immutable extraction metadata for one template line containing groups.
 */
interface CompiledLinePattern {
    lineText: string
    groups: LineGroup[]
    regex: RegExp
}

interface ParseResult {
    groups: ParsedGroup[]
    /** Literal text and full group syntax interleaved in source order. */
    parts: string[]
    /** Ordered source matches retained from the single template scan. */
    matches: GroupMatch[]
    /** Template text with named groups replaced by readable placeholders. */
    cleanedText: string
    /** Ordered, compiled extraction plans for lines containing named groups. */
    linePatterns: CompiledLinePattern[]
}

/**
 * Represents a named capture group match found by the iterative parser.
 */
interface GroupMatch {
    /** The full `(?<name>pattern)` string. */
    fullMatch: string
    /** The capture group name. */
    name: string
    /** The pattern inside the group (between `>` and closing `)`). */
    pattern: string
    /** The start index of the full match in the source text. */
    index: number
}

/**
 * Finds all `(?<name>pattern)` named capture groups using an iterative
 * parenthesis-counting parser. Runs in O(n) time with no backtracking,
 * eliminating ReDoS risk from nested quantifiers.
 *
 * Rejects nested named groups (`(?<` inside the pattern body) to match
 * the previous regex behavior.
 *
 * @param text - The text to scan for named capture groups.
 * @returns An array of matched groups with their positions.
 */
const findNamedGroups = (text: string): GroupMatch[] => {
    const results: GroupMatch[] = []
    let i = 0

    while (i < text.length) {
        // Look for `(?<` marker
        if (text[i] === '(' && text[i + 1] === '?' && text[i + 2] === '<') {
            const startIndex = i

            // Parse the name: must be [a-zA-Z_][a-zA-Z0-9_]*
            const nameStart = i + 3
            if (nameStart >= text.length || !/[a-zA-Z_]/.test(text[nameStart])) {
                i++
                continue
            }

            let nameEnd = nameStart + 1
            while (nameEnd < text.length && /[a-zA-Z0-9_]/.test(text[nameEnd])) {
                nameEnd++
            }

            // Expect `>` after the name
            if (nameEnd >= text.length || text[nameEnd] !== '>') {
                i++
                continue
            }

            const name = text.slice(nameStart, nameEnd)
            const patternStart = nameEnd + 1

            // Count parenthesis depth to find balanced closing `)`
            // We start at depth 1 (for the opening `(` at startIndex)
            let depth = 1
            let j = patternStart
            let hasNestedNamedGroup = false
            let inCharacterClass = false

            while (j < text.length && depth > 0) {
                if (text[j] === '\\') {
                    j += 2 // skip escaped character
                    continue
                }
                if (text[j] === '[' && !inCharacterClass) {
                    inCharacterClass = true
                } else if (text[j] === ']' && inCharacterClass) {
                    inCharacterClass = false
                } else if (text[j] === '(' && !inCharacterClass) {
                    // Check for nested named group
                    if (
                        text[j + 1] === '?' &&
                        text[j + 2] === '<' &&
                        j + 3 < text.length &&
                        /[a-zA-Z_]/.test(text[j + 3])
                    ) {
                        hasNestedNamedGroup = true
                    }
                    depth++
                } else if (text[j] === ')' && !inCharacterClass) {
                    depth--
                    if (depth === 0) break
                }
                j++
            }

            if (depth === 0 && !hasNestedNamedGroup) {
                const pattern = text.slice(patternStart, j)
                const fullMatch = text.slice(startIndex, j + 1)
                results.push({ fullMatch, name, pattern, index: startIndex })
                i = j + 1
            } else {
                i++
            }
        } else {
            i++
        }
    }

    return results
}

/**
 * Escapes special regex characters in a string for use as a literal pattern.
 *
 * @param str - The string to escape.
 * @returns The escaped string safe for use in a RegExp constructor.
 */
const escapeRegExp = (str: string): string => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Computes the length of the full `(?<name>pattern)` syntax for a group.
 *
 * @param group - The line group whose syntax length to compute.
 * @returns The character length of the `(?<name>pattern)` string.
 */
const groupSyntaxLength = (group: LineGroup): number => {
    // (?< + name + > + pattern + )
    return 5 + group.name.length + group.pattern.length
}

/**
 * Builds a context-anchored, gap-flexible regex for a template line containing groups.
 *
 * The resulting regex:
 * - Uses the literal text before the first group as an escaped context anchor.
 * - Inserts a flexible `[\s\S]*?` gap between the prefix and the first group
 *   to tolerate extra content (e.g., "(c)") in text2.
 * - Preserves literal text between groups as escaped anchors.
 * - Keeps named groups as-is.
 * - Is unanchored (no `^`/`$`) so it can search anywhere in text2.
 * - Uses the `d` flag for `match.indices` (no `s` flag so `.` doesn't match `\n`).
 *
 * @param lineText - The template line text containing capture group syntax.
 * @param groups - The capture groups found on this line with their positions.
 * @returns A RegExp that can extract captures from text2.
 */
const buildLineRegex = (lineText: string, groups: LineGroup[]): RegExp => {
    const sorted = [...groups].sort((a, b) => a.indexInLine - b.indexInLine)

    let pattern = ''

    // Context anchor: literal text before the first group
    const firstGroup = sorted[0]
    const contextPrefix = lineText.slice(0, firstGroup.indexInLine)
    if (contextPrefix.length > 0) {
        pattern += escapeRegExp(contextPrefix)
    }

    // Flexible gap between context prefix and first group
    pattern += '[\\s\\S]*?'

    // First group
    pattern += `(?<${sorted[0].name}>${sorted[0].pattern})`

    // Subsequent groups with literal anchors between them
    for (let i = 1; i < sorted.length; i++) {
        const prevGroup = sorted[i - 1]
        const currGroup = sorted[i]

        const prevGroupEndIndex = prevGroup.indexInLine + groupSyntaxLength(prevGroup)
        const literalBetween = lineText.slice(prevGroupEndIndex, currGroup.indexInLine)

        if (literalBetween.length > 0) {
            pattern += escapeRegExp(literalBetween)
        }

        pattern += `(?<${currGroup.name}>${currGroup.pattern})`
    }

    return new RegExp(pattern, 'd')
}

/**
 * Creates ordered, compiled extraction plans for lines containing named groups.
 *
 * @param text - The full template text containing named capture groups.
 * @param matches - Ordered group matches from the template's single source scan.
 * @returns Compiled line patterns in source order.
 */
const compileLinePatterns = (text: string, matches: GroupMatch[]): CompiledLinePattern[] => {
    const lines = text.split('\n')
    const lineStarts: number[] = []
    let lineStart = 0

    for (const line of lines) {
        lineStarts.push(lineStart)
        lineStart += line.length + 1
    }

    const linePatterns: CompiledLinePattern[] = []
    let matchIndex = 0

    for (let lineIndex = 0; lineIndex < lines.length && matchIndex < matches.length; lineIndex++) {
        const lineText = lines[lineIndex]
        const currentLineStart = lineStarts[lineIndex]
        const currentLineEnd = currentLineStart + lineText.length
        const groups: LineGroup[] = []

        while (matchIndex < matches.length && matches[matchIndex].index <= currentLineEnd) {
            const match = matches[matchIndex]
            groups.push({
                name: match.name,
                pattern: match.pattern,
                indexInLine: match.index - currentLineStart
            })
            matchIndex++
        }

        if (groups.length > 0) {
            linePatterns.push({
                lineText,
                groups,
                regex: buildLineRegex(lineText, groups)
            })
        }
    }

    return linePatterns
}

/**
 * Parses and compiles `(?<name>pattern)` named capture groups from text.
 *
 * Extracts all named capture groups and retains the immutable metadata used by
 * repeated capture extraction, including cleaned fallback text and line regexes.
 *
 * @param text - The template text containing named capture group syntax.
 * @returns The compiled parse result, or null if no named groups are found.
 */
export const parseExpectedPatterns = (text: string): ParseResult | null => {
    const matches = findNamedGroups(text)
    if (matches.length === 0) return null

    const groups: ParsedGroup[] = []
    const parts: string[] = []
    let cleanedText = ''
    let lastIndex = 0

    for (const match of matches) {
        const literal = text.slice(lastIndex, match.index)
        groups.push({ name: match.name, pattern: match.pattern })
        parts.push(literal, match.fullMatch)
        cleanedText += `${literal}<${match.name}>`
        lastIndex = match.index + match.fullMatch.length
    }

    const trailingLiteral = text.slice(lastIndex)
    parts.push(trailingLiteral)
    cleanedText += trailingLiteral

    return {
        groups,
        parts,
        matches,
        cleanedText,
        linePatterns: compileLinePatterns(text, matches)
    }
}

/**
 * Replaces named capture groups with readable placeholders.
 *
 * This standalone compatibility helper scans its input once. Component updates
 * use the precomputed `cleanedText` on {@link parseExpectedPatterns} instead.
 *
 * @param text - Template text that may contain named capture group syntax.
 * @returns The template with each valid group replaced by `<name>`.
 * @example
 * ```ts
 * cleanTemplate('Copyright (?<year>\\d{4})') // 'Copyright <year>'
 * ```
 */
export const cleanTemplate = (text: string): string => {
    const matches = findNamedGroups(text)
    if (matches.length === 0) return text

    let cleanedText = ''
    let lastIndex = 0

    for (const match of matches) {
        cleanedText += `${text.slice(lastIndex, match.index)}<${match.name}>`
        lastIndex = match.index + match.fullMatch.length
    }

    return cleanedText + text.slice(lastIndex)
}

interface ExtractResult {
    resolvedText: string
    captures: Record<string, string>
    captureRangesInText2: CaptureRange[]
}

/**
 * Extracts captures from modifiedText using context-anchored, gap-flexible regexes.
 *
 * Reuses compiled per-line regexes to search text2 with the `d` flag for
 * `match.indices`, then builds resolvedText from the retained source matches.
 *
 * @param originalText - The template text containing named capture groups.
 * @param modifiedText - The actual text (text2) to extract captures from.
 * @param parseResult - The result of parsing capture groups from originalText.
 * @returns The resolved text, captures, and capture ranges in text2,
 *     or null if any line's regex fails to match.
 */
export const extractCaptures = (
    originalText: string,
    modifiedText: string,
    parseResult: ParseResult
): ExtractResult | null => {
    const allCaptures: Record<string, string> = {}
    const captureRangesInText2: CaptureRange[] = []

    for (const { groups, regex } of parseResult.linePatterns) {
        const match = regex.exec(modifiedText)

        if (!match || !match.groups || !match.indices?.groups) {
            return null
        }

        for (const group of groups) {
            const value = match.groups[group.name]
            if (value === undefined) return null

            allCaptures[group.name] = value

            const indices = match.indices.groups[group.name]
            if (!indices) return null

            captureRangesInText2.push({
                name: group.name,
                start: indices[0],
                end: indices[1]
            })
        }
    }

    const resolvedText = resolveTemplate(originalText, parseResult.matches, allCaptures)

    captureRangesInText2.sort((a, b) => a.start - b.start)

    return { resolvedText, captures: allCaptures, captureRangesInText2 }
}

/**
 * Replaces named capture group syntax in a template with actual captured values.
 *
 * Substitutes each `(?<name>pattern)` occurrence with the corresponding
 * captured value from the captures record.
 *
 * @param text - The template text containing capture group syntax.
 * @param matches - Ordered named-group matches retained while parsing the template.
 * @param captures - A record mapping group names to their captured values.
 * @returns The template with capture groups replaced by their captured values.
 */
const resolveTemplate = (
    text: string,
    matches: GroupMatch[],
    captures: Record<string, string>
): string => {
    let result = ''
    let lastIndex = 0
    for (const match of matches) {
        result += text.slice(lastIndex, match.index)
        result += captures[match.name] ?? ''
        lastIndex = match.index + match.fullMatch.length
    }
    result += text.slice(lastIndex)
    return result
}

/**
 * Walks through diffs and tags segments that overlap with capture ranges in text2.
 *
 * Tracks position in text2 (modifiedText) as it processes each diff segment:
 * - **Equal (0):** Advances text2Pos. Splits at capture boundaries and tags
 *   overlapping parts with the capture group name.
 * - **Insert (1):** Advances text2Pos only. Checks for overlap with capture
 *   ranges and tags overlapping parts.
 * - **Remove (-1):** Does not advance text2Pos. Passes through as-is.
 *
 * @param diffs - The diff tuples from diff-match-patch (resolvedText vs modifiedText).
 * @param captureRanges - The capture ranges with positions in text2.
 * @returns An array of DisplayDiff objects with expected group tagging applied.
 */
export const tagExpectedRegions = (
    diffs: [number, string][],
    captureRanges: CaptureRange[]
): DisplayDiff[] => {
    if (captureRanges.length === 0) {
        return diffs.map(([operation, text]) => ({ operation, text }))
    }

    const result: DisplayDiff[] = []
    let text2Pos = 0
    // Capture ranges must remain sorted by start so this cursor only moves forward.
    let captureCursor = 0

    for (const [operation, text] of diffs) {
        if (operation === -1) {
            result.push({ operation, text })
            continue
        }

        const segStart = text2Pos
        const segEnd = text2Pos + text.length

        while (
            captureCursor < captureRanges.length &&
            captureRanges[captureCursor].end <= segStart
        ) {
            captureCursor++
        }

        let rangeIndex = captureCursor
        let sliceCursor = segStart

        while (rangeIndex < captureRanges.length && captureRanges[rangeIndex].start < segEnd) {
            const range = captureRanges[rangeIndex]

            if (sliceCursor < range.start) {
                const beforeEnd = Math.min(range.start, segEnd)
                result.push({
                    operation,
                    text: text.slice(sliceCursor - segStart, beforeEnd - segStart)
                })
                sliceCursor = beforeEnd
            }

            const overlapStart = Math.max(sliceCursor, range.start)
            const overlapEnd = Math.min(segEnd, range.end)
            if (overlapStart < overlapEnd) {
                result.push({
                    operation: 0,
                    text: text.slice(overlapStart - segStart, overlapEnd - segStart),
                    expected: range.name
                })
                sliceCursor = overlapEnd
            }

            rangeIndex++
        }

        if (sliceCursor < segEnd) {
            result.push({
                operation,
                text: text.slice(sliceCursor - segStart)
            })
        }

        text2Pos = segEnd
    }

    return result
}

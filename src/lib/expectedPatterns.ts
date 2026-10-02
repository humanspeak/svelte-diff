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

/**
 * Compiled result of parsing named capture groups from a template.
 *
 * Returned by {@link parseExpectedPatterns}; carries the immutable metadata
 * reused by {@link extractCaptures} for repeated extraction against modified text.
 */
export interface ParseResult {
    /**
     * @internal Engine detail — not part of the stable public API; may change in
     * any future release. Parsed capture groups in source order.
     */
    groups: ParsedGroup[]
    /**
     * @internal Engine detail — not part of the stable public API; may change in
     * any future release. Literal text and full group syntax interleaved in source order.
     */
    parts: string[]
    /**
     * @internal Engine detail — not part of the stable public API; may change in
     * any future release. Ordered source matches retained from the single template scan.
     */
    matches: GroupMatch[]
    /** Template text with named groups replaced by readable placeholders. */
    cleanedText: string
    /**
     * @internal Engine detail — not part of the stable public API; may change in
     * any future release. Ordered, compiled extraction plans for lines containing named groups.
     */
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
 * Finds all `(?<name>pattern)` named capture groups with O(n) source discovery
 * and O(n) boundary metadata. This does not bound compilation or execution of
 * user-supplied regular expressions.
 *
 * Rejects nested named groups (`(?<` inside the pattern body) to match
 * the previous regex behavior.
 *
 * @param text - The text to scan for named capture groups.
 * @returns An array of matched groups with their positions.
 */
const findNamedGroups = (text: string): GroupMatch[] => {
    const results: GroupMatch[] = []
    const length = text.length
    // Each suffix has two candidate-local entry states. A boundary is the first
    // unmatched `)` reached from that state; -1 means the suffix never closes.
    const outsideEnd = new Int32Array(length + 2).fill(-1)
    const insideEnd = new Int32Array(length + 2).fill(-1)
    const outsideNested = new Uint8Array(length + 2)
    const insideNested = new Uint8Array(length + 2)

    for (let position = length - 1; position >= 0; position--) {
        const character = text[position]
        const next = position + 1
        if (character === '\\') {
            // Escapes skip exactly one character in either entry state.
            outsideEnd[position] = outsideEnd[position + 2]
            insideEnd[position] = insideEnd[position + 2]
            outsideNested[position] = outsideNested[position + 2]
            insideNested[position] = insideNested[position + 2]
            continue
        }

        if (character === ']') {
            insideEnd[position] = outsideEnd[next]
            insideNested[position] = outsideNested[next]
        } else {
            insideEnd[position] = insideEnd[next]
            insideNested[position] = insideNested[next]
        }

        if (character === '[') {
            outsideEnd[position] = insideEnd[next]
            outsideNested[position] = insideNested[next]
        } else if (character === ')') {
            outsideEnd[position] = position
        } else if (character === '(') {
            const close = outsideEnd[next]
            if (close !== -1) {
                // Compose the balanced child and its following suffix once,
                // rather than walking the child again for every ancestor.
                outsideEnd[position] = outsideEnd[close + 1]
                outsideNested[position] =
                    outsideNested[next] |
                    outsideNested[close + 1] |
                    Number(
                        text[next] === '?' &&
                            text[position + 2] === '<' &&
                            position + 3 < length &&
                            /[a-zA-Z_]/.test(text[position + 3])
                    )
            }
        } else {
            outsideEnd[position] = outsideEnd[next]
            outsideNested[position] = outsideNested[next]
        }
    }

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

            const patternStart = nameEnd + 1
            // Discovery stays literal even after rejection: an inner candidate
            // starts outside a class regardless of the rejected outer's state.
            const j = outsideEnd[patternStart]
            if (j !== -1 && !outsideNested[patternStart]) {
                const name = text.slice(nameStart, nameEnd)
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
 * - Uses `dg` for absolute UTF-16 indices and whole-target search from a cursor.
 *   Extraction resets each regex's lastIndex after use (no `s` flag).
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

    return new RegExp(pattern, 'dg')
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
 * Names must be unique across the entire template.
 *
 * @param text - The template text containing named capture group syntax.
 * @returns The compiled parse result, or null if no supported named groups are
 *     found, recognized groups fail regex compilation, or names are duplicated.
 */
export const parseExpectedPatterns = (text: string): ParseResult | null => {
    const matches = findNamedGroups(text)
    if (matches.length === 0) return null

    const names = new Set<string>()
    for (const match of matches) {
        if (names.has(match.name)) return null
        names.add(match.name)
    }

    let linePatterns: CompiledLinePattern[]
    try {
        linePatterns = compileLinePatterns(text, matches)
    } catch (error) {
        if (error instanceof SyntaxError) return null
        throw error
    }

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
        linePatterns
    }
}

/**
 * Replaces named capture groups with readable placeholders.
 *
 * This standalone compatibility helper parses and validates its input once.
 * Component updates use the precomputed `cleanedText` on
 * {@link parseExpectedPatterns} instead.
 *
 * @param text - Template text that may contain named capture group syntax.
 * @returns The template with each group replaced by `<name>`, or the original
 *     literal input if no supported groups are found, recognized groups fail
 *     regex compilation, or names are duplicated anywhere in the template.
 * @example
 * ```ts
 * cleanTemplate('Copyright (?<year>\\d{4})') // 'Copyright <year>'
 * ```
 */
export const cleanTemplate = (text: string): string => {
    const parsed = parseExpectedPatterns(text)
    return parsed?.cleanedText ?? text
}

/**
 * Result of extracting capture values and positions from modified text.
 *
 * Returned by {@link extractCaptures} when every compiled line pattern matches.
 */
export interface ExtractResult {
    resolvedText: string
    captures: Record<string, string>
    captureRangesInText2: CaptureRange[]
}

/**
 * Extracts captures from modifiedText using context-anchored, gap-flexible regexes.
 *
 * Reuses compiled per-line regexes to search the whole target in source order,
 * starting after the previous full match. Indices remain absolute UTF-16 offsets.
 * Each invocation owns its cursor and resets each used regex's lastIndex to zero
 * immediately after exec, including on failure or throw. Zero-width matches allow
 * the next finite source line to search from the same boundary.
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
    let cursor = 0

    for (const { groups, regex } of parseResult.linePatterns) {
        let match: RegExpExecArray | null
        regex.lastIndex = cursor
        try {
            match = regex.exec(modifiedText)
        } finally {
            regex.lastIndex = 0
        }

        if (!match || !match.groups || !match.indices?.groups) {
            return null
        }

        for (const group of groups) {
            const value = match.groups[group.name]
            if (value === undefined) return null

            // Preserve accepted names such as __proto__ without invoking inherited setters.
            Object.defineProperty(allCaptures, group.name, {
                value,
                enumerable: true,
                writable: true,
                configurable: true
            })

            const indices = match.indices.groups[group.name]
            if (!indices) return null

            captureRangesInText2.push({
                name: group.name,
                start: indices[0],
                end: indices[1]
            })
        }

        cursor = match.index + match[0].length
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

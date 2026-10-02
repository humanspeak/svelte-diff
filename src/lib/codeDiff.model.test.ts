import { createHighlighter, type HighlightTokenResult } from '@tanstack/highlight/core'
import { ts } from '@tanstack/highlight/languages/ts'
import { DiffOp } from 'diff-match-patch-ts'
import { describe, expect, it, vi } from 'vitest'
import { composeCodeDiff } from './codeDiff.js'
import { computeDiff } from './computeDiff.js'

const highlighter = createHighlighter({ languages: [ts] })
const classes = (result: HighlightTokenResult) =>
    result.tokens.flatMap((token) =>
        Array.from({ length: token.value.length }, () => token.className)
    )
const cases = [
    ['', ''],
    ['', 'const x = 1;'],
    ['const x = 1;', ''],
    [
        '/* repeat\nrepeat old repeat */\nconst x = "repeat old repeat";\n',
        '/* repeat\nrepeat new repeat */\nconst x = "repeat new repeat";\n'
    ],
    ['const same = "same"; // same\n', 'const same = "same same"; // same\n'],
    ['\tconst x = "👩‍💻";\r\n// old\r\n\nlast\r', '\tconst x = "😀";\r\n// new\r\nlast\r\n'],
    ['x\n', 'x'],
    [
        'const re = /(?<year>\\d{4})/;\nconst html = "<script>&</script>";',
        'const re = /(?<year>\\d{2})/g;\nconst html = "<img onerror=alert(1)>";'
    ]
]

describe('whole-source code composition', () => {
    for (const mode of ['character', 'word', 'line'] as const) {
        it.each(cases)(
            `${mode} reconstructs independent sides and classifications: %j → %j`,
            (before, after) => {
                const original = highlighter.tokenize(before, { lang: 'typescript' })
                const modified = highlighter.tokenize(after, { lang: 'typescript' })
                const tokenize = vi.spyOn(highlighter, 'tokenize')
                const runs = composeCodeDiff(
                    computeDiff(before, after, {
                        diffMode: mode,
                        expectedPatterns: false,
                        cleanupEfficiency: 0
                    }).diffs,
                    original,
                    modified
                )
                expect(tokenize).not.toHaveBeenCalled()
                tokenize.mockRestore()
                const text = (excluded: DiffOp) =>
                    runs
                        .filter((run) => run.operation !== excluded)
                        .flatMap((run) => run.pieces.map((piece) => piece.value))
                        .join('')
                expect(text(DiffOp.Insert)).toBe(before)
                expect(text(DiffOp.Delete)).toBe(after)
                // Independent full-source tokenization is the oracle at each offset.
                const originalClasses = classes(original)
                const modifiedClasses = classes(modified)
                let beforePos = 0
                let afterPos = 0
                for (const run of runs) {
                    for (const piece of run.pieces) {
                        const sourceClasses =
                            run.operation === DiffOp.Delete ? originalClasses : modifiedClasses
                        const offset = run.operation === DiffOp.Delete ? beforePos : afterPos
                        expect(sourceClasses.slice(offset, offset + piece.value.length)).toEqual(
                            Array.from({ length: piece.value.length }, () => piece.className)
                        )
                        if (run.operation !== DiffOp.Insert) beforePos += piece.value.length
                        if (run.operation !== DiffOp.Delete) afterPos += piece.value.length
                    }
                }
            }
        )
    }
    it.each(['plaintext', 'unregistered'])('retains unclassified text for %s', (lang) => {
        const before = '\t<foo>\r\n'
        const after = '\t<bar>\r\n'
        const runs = composeCodeDiff(
            computeDiff(before, after).diffs,
            highlighter.tokenize(before, { lang }),
            highlighter.tokenize(after, { lang })
        )
        expect(runs.flatMap((run) => run.pieces).every((piece) => !piece.className)).toBe(true)
        expect(
            runs
                .filter((run) => run.operation !== DiffOp.Insert)
                .flatMap((run) => run.pieces.map((piece) => piece.value))
                .join('')
        ).toBe(before)
        expect(
            runs
                .filter((run) => run.operation !== DiffOp.Delete)
                .flatMap((run) => run.pieces.map((piece) => piece.value))
                .join('')
        ).toBe(after)
    })
    it('skips empty tokens and advances original over equal runs before repeated deletions', () => {
        const result = {
            code: 'aaa',
            lang: 'test',
            tokens: [
                { value: '' },
                { value: 'a', className: 'keyword' as const },
                { value: 'a', className: 'string' as const },
                { value: 'a', className: 'comment' as const }
            ]
        }
        const runs = composeCodeDiff(
            [
                [0, 'a'],
                [-1, 'a'],
                [0, 'a']
            ],
            result,
            { ...result, code: 'aa', tokens: [{ value: 'aa' }] }
        )
        expect(runs[1].pieces).toEqual([{ value: 'a', className: 'string' }])
    })
})

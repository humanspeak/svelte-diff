import { DiffMatchPatch, DiffOp } from 'diff-match-patch-ts'
import { describe, expect, it, vi } from 'vitest'
import { computeDiff } from './computeDiff.js'
import * as patterns from './expectedPatterns.js'
import type { SvelteDiffTuple } from './index.js'

vi.mock('./expectedPatterns.js', async (importOriginal) => {
    const actual = await importOriginal<typeof patterns>()
    return { ...actual, parseExpectedPatterns: vi.fn(actual.parseExpectedPatterns) }
})

const project = (diffs: SvelteDiffTuple[], omitted: DiffOp) =>
    diffs
        .filter(([op]) => op !== omitted)
        .map(([, text]) => text)
        .join('')

describe('computeDiff', () => {
    it.each(['character', 'word', 'line'] as const)('reconstructs exact %s inputs', (diffMode) => {
        const pairs = [
            ['', ''],
            ['', 'added'],
            ['removed', ''],
            ['\tα e\u0301 😀\r\n\nend\rfinal', '\tβ é 🐈\r\n\nend\rfinal\n'],
            ['const re = /(?<year>\\d{4})/;', 'const re = /(?<year>\\d{2})/g;'],
            ['lone \ud800\t\r\n', 'lone \udfff\t\n']
        ]
        for (const [before, after] of pairs) {
            const result = computeDiff(before, after, { diffMode, timeout: 0 })
            expect(project(result.diffs, DiffOp.Insert)).toBe(before)
            expect(project(result.diffs, DiffOp.Delete)).toBe(after)
            expect(result.captures).toBeUndefined()
            expect(result.displayDiffs.some((diff) => diff.expected)).toBe(false)
            expect(result.diffs.every(([op]) => [-1, 0, 1].includes(op))).toBe(true)
            if (diffMode !== 'character') expect(result.timing.cleanup).toBe(0)
        }
    })

    it('bypasses the parser for default and explicit literal calls', () => {
        const parser = vi.mocked(patterns.parseExpectedPatterns)
        parser.mockClear()
        const source = '/(?<year>\\d{4})/'
        expect(computeDiff(source, source).diffs).toEqual([[0, source]])
        expect(computeDiff(source, source, { expectedPatterns: false }).diffs).toEqual([
            [0, source]
        ])
        expect(parser).not.toHaveBeenCalled()
    })

    it.each(['character', 'word', 'line'] as const)(
        'resolves and tags explicit %s templates',
        (diffMode) => {
            const before = 'Year (?<year>\\d{4})'
            const result = computeDiff(before, 'Year 2026 ready', {
                expectedPatterns: true,
                diffMode
            })
            expect(project(result.diffs, DiffOp.Insert)).toBe('Year 2026')
            expect(project(result.diffs, DiffOp.Delete)).toBe('Year 2026 ready')
            expect(result.captures).toEqual({ year: '2026' })
            expect(
                result.displayDiffs
                    .filter((diff) => diff.expected === 'year')
                    .map((diff) => diff.text)
                    .join('')
            ).toBe('2026')
            const mismatch = computeDiff(before, 'Year unknown', {
                expectedPatterns: true,
                diffMode
            })
            expect(project(mismatch.diffs, DiffOp.Insert)).toBe('Year <year>')
            expect(project(mismatch.diffs, DiffOp.Delete)).toBe('Year unknown')
            expect(mismatch.captures).toBeUndefined()
        }
    )

    it.each(['(?<bad>*)', '(?<same>a) (?<same>b)'])('preserves rejected template %s', (source) => {
        const result = computeDiff(source, 'changed', { expectedPatterns: true })
        expect(project(result.diffs, DiffOp.Insert)).toBe(source)
        expect(project(result.diffs, DiffOp.Delete)).toBe('changed')
        expect(result.captures).toBeUndefined()
    })

    it('configures independent engines and respects cleanup priority', () => {
        const main = vi.spyOn(DiffMatchPatch.prototype, 'diff_main')
        const semantic = vi.spyOn(DiffMatchPatch.prototype, 'diff_cleanupSemantic')
        const efficiency = vi.spyOn(DiffMatchPatch.prototype, 'diff_cleanupEfficiency')
        try {
            computeDiff('alpha old', 'alpha new')
            const first = main.mock.instances[0]
            if (!(first instanceof DiffMatchPatch)) throw new Error('Expected first diff engine')
            expect(first.Diff_Timeout).toBe(1)
            expect(first.Diff_EditCost).toBe(4)
            expect(efficiency).toHaveBeenCalledTimes(1)
            main.mockClear()
            efficiency.mockClear()
            semantic.mockClear()
            computeDiff('alpha old', 'alpha new', {
                timeout: 0,
                cleanupSemantic: true,
                cleanupEfficiency: 8
            })
            const second = main.mock.instances[0]
            if (!(second instanceof DiffMatchPatch)) throw new Error('Expected second diff engine')
            expect(second).not.toBe(first)
            expect(second.Diff_Timeout).toBe(0)
            expect(second.Diff_EditCost).toBe(8)
            expect(semantic).toHaveBeenCalledTimes(1)
            expect(efficiency).not.toHaveBeenCalled()
            semantic.mockClear()
            computeDiff('alpha old', 'alpha new', { cleanupEfficiency: 0 })
            for (const diffMode of ['word', 'line'] as const) {
                computeDiff('alpha old', 'alpha new', {
                    diffMode,
                    cleanupSemantic: true,
                    cleanupEfficiency: 8
                })
            }
            expect(semantic).not.toHaveBeenCalled()
            expect(efficiency).not.toHaveBeenCalled()
        } finally {
            main.mockRestore()
            semantic.mockRestore()
            efficiency.mockRestore()
        }
    })
})

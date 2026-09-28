import { DiffMatchPatch, type Diff } from 'diff-match-patch-ts'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { computeTokenDiff } from './diffModes.js'

const project = (diffs: Diff[], excluded: number) =>
    diffs
        .filter(([op]) => op !== excluded)
        .map(([, text]) => text)
        .join('')
const boundaries = (text: string, mode: 'word' | 'line') => {
    const regex =
        mode === 'word'
            ? /\r\n|[\r\n]|[^\S\r\n]+|[\p{L}\p{M}\p{N}_]+|[^\s\p{L}\p{M}\p{N}_]/gu
            : /[^\r\n]*(?:\r\n|[\r\n])|[^\r\n]+$/g
    return new Set([
        0,
        ...Array.from(text.matchAll(regex), (match) => match.index + match[0].length)
    ])
}
const verify = (before: string, after: string, mode: 'word' | 'line') => {
    const diffs = computeTokenDiff(new DiffMatchPatch(), before, after, mode, 0)
    expect(project(diffs, 1)).toBe(before)
    expect(project(diffs, -1)).toBe(after)
    let source = 0
    let target = 0
    for (const [operation, text] of diffs) {
        expect(text.length).toBeGreaterThan(0)
        if (operation !== 1) source += text.length
        if (operation !== -1) target += text.length
        expect(boundaries(before, mode).has(source)).toBe(true)
        expect(boundaries(after, mode).has(target)).toBe(true)
    }
    return diffs
}
afterEach(() => vi.restoreAllMocks())

describe('token diff', () => {
    it('compares complete words and lines', () => {
        expect(verify('cat', 'car', 'word')).toEqual([
            [-1, 'cat'],
            [1, 'car']
        ])
        expect(verify('count=10\nkeep=true\n', 'count=20\nkeep=true\n', 'line')).toEqual([
            [-1, 'count=10\n'],
            [1, 'count=20\n'],
            [0, 'keep=true\n']
        ])
    })
    it.each(['word', 'line'] as const)('preserves exact text in %s mode', (mode) => {
        for (const [before, after] of [
            ['', ''],
            ['', 'insert'],
            ['delete', ''],
            ['same', 'same'],
            ['a  b\tc\u00a0d', 'a b\tC\u00a0d'],
            ["can't foo-bar _123!", 'can’t foo–bar _124?'],
            ['é e\u0301 中文 العربية 👩‍💻 \ud800', 'É é 中文字 العربية 😀 \udc00'],
            ['one\r\ntwo\rthree\n\nlast', 'one\r\nTWO\rthree\nlast\n'],
            ['a\na\nb\n', 'b\na\na\n'],
            ['x\n', 'x'],
            ['x'.repeat(10000), 'y'.repeat(10000)]
        ])
            verify(before, after, mode)
    })
    it.each([65534, 65535, 65536])('handles %i distinct tokens across both sides', (count) => {
        const lines = Array.from({ length: count }, (_, index) => `token${index}\n`)
        const before = lines.slice(0, count - 1).join('')
        const after = lines.slice(1).join('')
        const engine = new DiffMatchPatch()
        const spy = vi.spyOn(engine, 'diff_main')
        const diffs = computeTokenDiff(engine, before, after, 'line', 0)
        expect(project(diffs, 1)).toBe(before)
        expect(project(diffs, -1)).toBe(after)
        if (count > 65535) {
            expect(diffs).toEqual([
                [-1, before],
                [1, after]
            ])
            expect(spy).not.toHaveBeenCalled()
        } else expect(spy).toHaveBeenCalled()
    })
    it('decodes adjacent high and low surrogate IDs as separate tokens', () => {
        const lines = Array.from({ length: 56320 }, (_, index) => `${index}\n`)
        const before = lines.join('')
        const after = `${lines[55295]}${lines[56319]}`
        const diffs = computeTokenDiff(new DiffMatchPatch(), before, after, 'line', 0)
        expect(project(diffs, 1)).toBe(before)
        expect(project(diffs, -1)).toBe(after)
    })
    it('passes one absolute deadline and disables line encoding', () => {
        vi.spyOn(Date, 'now').mockReturnValue(100)
        const engine = new DiffMatchPatch()
        const spy = vi.spyOn(engine, 'diff_main')
        computeTokenDiff(engine, 'cat', 'car', 'word', 2)
        expect(spy).toHaveBeenCalledWith('\u0001', '\u0002', false, 2100)
        computeTokenDiff(engine, 'cat', 'car', 'word', 0)
        expect(spy).toHaveBeenLastCalledWith('\u0001', '\u0002', false, Number.MAX_VALUE)
    })
    it('returns complete replacement when preparation expires', () => {
        vi.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValue(2000)
        expect(computeTokenDiff(new DiffMatchPatch(), 'cat', 'car', 'word', 1)).toEqual([
            [-1, 'cat'],
            [1, 'car']
        ])
    })
    it('returns complete replacement when decoding expires', () => {
        const clock = vi.spyOn(Date, 'now').mockReturnValue(0)
        const engine = new DiffMatchPatch()
        vi.spyOn(engine, 'diff_main').mockImplementation(() => {
            clock.mockReturnValue(2000)
            return [[0, '\u0001']]
        })
        expect(computeTokenDiff(engine, 'cat', 'car', 'word', 1)).toEqual([
            [-1, 'cat'],
            [1, 'car']
        ])
    })
})

describe('deadline progress and fast paths', () => {
    it('checks preparation progress within a long token stream', () => {
        const clock = vi
            .spyOn(Date, 'now')
            .mockReturnValueOnce(0)
            .mockReturnValueOnce(0)
            .mockReturnValue(2000)
        const before = 'a '.repeat(2048)
        const after = 'b '.repeat(2048)
        const engine = new DiffMatchPatch()
        const main = vi.spyOn(engine, 'diff_main')
        expect(computeTokenDiff(engine, before, after, 'word', 1)).toEqual([
            [-1, before],
            [1, after]
        ])
        expect(clock).toHaveBeenCalledTimes(3)
        expect(main).not.toHaveBeenCalled()
    })
    it('checks decoding progress within a long tuple', () => {
        const clock = vi.spyOn(Date, 'now').mockReturnValue(0)
        const engine = new DiffMatchPatch()
        vi.spyOn(engine, 'diff_main').mockImplementation((before) => {
            clock.mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValue(2000)
            return [[-1, before]]
        })
        const before = 'a '.repeat(2048)
        const after = 'b '.repeat(2048)
        expect(computeTokenDiff(engine, before, after, 'word', 1)).toEqual([
            [-1, before],
            [1, after]
        ])
    })
    it('preserves equality and empty fast paths even when the deadline expires', () => {
        vi.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValue(2000)
        const engine = new DiffMatchPatch()
        expect(computeTokenDiff(engine, 'same', 'same', 'word', 1)).toEqual([[0, 'same']])
        expect(computeTokenDiff(engine, '', '', 'line', 1)).toEqual([])
        expect(computeTokenDiff(engine, '', 'after', 'line', 1)).toEqual([[1, 'after']])
        expect(computeTokenDiff(engine, 'before', '', 'word', 1)).toEqual([[-1, 'before']])
    })
})

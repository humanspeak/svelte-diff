import { createHighlighter } from '@tanstack/highlight/core'
import { ts } from '@tanstack/highlight/languages/ts'
import { render } from '@testing-library/svelte'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CodeDiff from './CodeDiff.svelte'
import * as core from './computeDiff.js'

vi.mock('./computeDiff.js', async (importOriginal) => {
    const actual = await importOriginal<typeof core>()
    return { ...actual, computeDiff: vi.fn(actual.computeDiff) }
})
beforeEach(() => vi.clearAllMocks())
const setup = () => {
    const highlighter = createHighlighter({ languages: [ts] })
    const tokenize = vi.spyOn(highlighter, 'tokenize')
    const props = {
        originalText: 'const value = "old";\n',
        modifiedText: 'const value = "new";\n',
        highlighter,
        language: 'typescript'
    }
    return { ...render(CodeDiff, props), props, tokenize }
}

describe('CodeDiff', () => {
    it('renders one named focusable pre/code with semantic operations and whole-source syntax', () => {
        const { container, getByRole, props, tokenize } = setup()
        expect(container.querySelectorAll('pre')).toHaveLength(1)
        expect(container.querySelectorAll('code')).toHaveLength(1)
        expect(getByRole('region', { name: 'Code differences' }).getAttribute('tabindex')).toBe('0')
        expect(container.querySelector('del .th-string')?.textContent).toBe('old')
        expect(container.querySelector('ins .th-string')?.textContent).toBe('new')
        expect(container.querySelector('[data-diff="equal"] .th-keyword')?.textContent).toBe(
            'const'
        )
        expect(container.querySelector('code')?.textContent).toBe('const value = "oldnew";\n')
        expect(container.querySelectorAll('br')).toHaveLength(0)
        expect(tokenize.mock.calls).toEqual([
            [props.originalText, { lang: 'typescript' }],
            [props.modifiedText, { lang: 'typescript' }]
        ])
        expect(core.computeDiff).toHaveBeenCalledWith(props.originalText, props.modifiedText, {
            diffMode: 'word',
            timeout: 1,
            cleanupSemantic: false,
            cleanupEfficiency: 0,
            expectedPatterns: false
        })
    })
    it('escapes HTML and preserves regex braces, tabs, raw endings and emoji', () => {
        const text =
            '\t<script>alert(1)</script>\r\n<img onerror="alert(2)"> & (?<year>\\d{4}) 😀\r\n'
        const { container } = render(CodeDiff, {
            originalText: text,
            modifiedText: text,
            highlighter: createHighlighter({ languages: [ts] }),
            language: 'typescript'
        })
        expect(container.querySelector('code')?.textContent).toBe(text)
        expect(container.querySelectorAll('script,img,br')).toHaveLength(0)
        expect(container.innerHTML).toContain('&lt;')
    })
    it('caches each source and computation independently across prop replacement', async () => {
        const { rerender, props, tokenize } = setup()
        await rerender({ ...props, modifiedText: 'const value = "next";\n' })
        expect(tokenize).toHaveBeenCalledTimes(3)
        expect(tokenize.mock.calls[2][0]).toBe('const value = "next";\n')
        expect(core.computeDiff).toHaveBeenCalledTimes(2)
        await rerender({
            ...props,
            modifiedText: 'const value = "next";\n',
            class: 'dark',
            rendererClasses: { remove: 'removed', insert: 'added' },
            ariaLabel: 'Named code'
        })
        expect(tokenize).toHaveBeenCalledTimes(3)
        expect(core.computeDiff).toHaveBeenCalledTimes(2)
        await rerender({ ...props, modifiedText: 'const value = "next";\n', diffMode: 'line' })
        expect(tokenize).toHaveBeenCalledTimes(3)
        expect(core.computeDiff).toHaveBeenCalledTimes(3)
        await rerender({
            ...props,
            modifiedText: 'const value = "next";\n',
            diffMode: 'line',
            language: 'javascript'
        })
        expect(tokenize).toHaveBeenCalledTimes(5)
        expect(core.computeDiff).toHaveBeenCalledTimes(3)
        const other = createHighlighter({ languages: [ts] })
        const otherTokens = vi.spyOn(other, 'tokenize')
        await rerender({
            ...props,
            highlighter: other,
            modifiedText: 'const value = "next";\n',
            diffMode: 'line',
            language: 'javascript'
        })
        expect(otherTokens).toHaveBeenCalledTimes(2)
        expect(core.computeDiff).toHaveBeenCalledTimes(3)
    })
    it('does not share caches between mounted instances and falls back for unknown languages', () => {
        const { props, tokenize } = setup()
        const { container } = render(CodeDiff, { ...props, language: 'unregistered' })
        expect(tokenize).toHaveBeenCalledTimes(4)
        expect(container.querySelectorAll('[class^="th-"] span[class^="th-"]')).toHaveLength(0)
        expect(container.querySelector('del')?.textContent).toBe('old')
    })
})

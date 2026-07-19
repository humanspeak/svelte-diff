import { render, waitFor } from '@testing-library/svelte'
import { createRawSnippet } from 'svelte'
import { describe, expect, it, vi } from 'vitest'
import SvelteDiff from './SvelteDiff.svelte'

const textSnippet = (className: string) =>
    createRawSnippet<[string]>((text) => ({
        render: () => `<span class="${className}">${text()}</span>`
    }))

// Note: Svelte 5 snippets cannot be directly tested as functions, so we focus on prop and DOM behavior

describe('SvelteDiff component', () => {
    it('renders a basic diff between two strings', () => {
        const { container } = render(SvelteDiff, {
            originalText: 'hello world',
            modifiedText: 'hello brave world'
        })
        expect(container.textContent).toContain('hello')
        expect(container.textContent).toContain('brave')
        expect(container.textContent).toContain('world')
    })

    it('applies rendererClasses for styling', () => {
        const { container } = render(SvelteDiff, {
            originalText: 'foo shoo',
            modifiedText: 'bar shoo',
            rendererClasses: {
                remove: 'test-remove',
                insert: 'test-insert',
                equal: 'test-equal'
            }
        })
        expect(container.querySelector('.test-remove')).toBeTruthy()
        expect(container.querySelector('.test-insert')).toBeTruthy()
        expect(container.querySelector('.test-equal')).toBeTruthy()
    })

    it('calls onProcessing with timing info', async () => {
        const onProcessing = vi.fn()
        render(SvelteDiff, {
            originalText: 'a',
            modifiedText: 'b',
            onProcessing
        })
        await waitFor(() => {
            expect(onProcessing).toHaveBeenCalled()
        })
        const timing = onProcessing.mock.calls[0][0]
        expect(typeof timing.main).toBe('number')
        expect(typeof timing.cleanup).toBe('number')
        expect(typeof timing.total).toBe('number')
    })

    it('reuses the computed diff when only onProcessing changes', async () => {
        const firstCallback = vi.fn()
        const secondCallback = vi.fn()
        const props = {
            originalText: 'The quick brown fox jumps over the lazy dog.',
            modifiedText: 'The quick red fox leaped over the very lazy dog.',
            timeout: 1,
            cleanupSemantic: true,
            cleanupEfficiency: 4
        }
        const { rerender } = render(SvelteDiff, {
            ...props,
            onProcessing: firstCallback
        })

        await waitFor(() => {
            expect(firstCallback).toHaveBeenCalled()
        })
        const firstDiffs = firstCallback.mock.calls[0][1]

        await rerender({
            ...props,
            onProcessing: secondCallback
        })

        await waitFor(() => {
            expect(secondCallback).toHaveBeenCalled()
        })
        expect(secondCallback.mock.calls[0][1]).toBe(firstDiffs)
    })

    it.each([
        {
            dependency: 'originalText',
            value: 'alpha source charlie delta',
            expectedText: 'source'
        },
        {
            dependency: 'modifiedText',
            value: 'alpha beta charlie target',
            expectedText: 'target'
        },
        { dependency: 'cleanupSemantic', value: true },
        { dependency: 'cleanupEfficiency', value: 8 }
    ] as const)(
        'recomputes when $dependency changes',
        async ({ dependency, value, ...testCase }) => {
            const firstCallback = vi.fn()
            const secondCallback = vi.fn()
            const props = {
                originalText: 'alpha bravo charlie delta',
                modifiedText: 'alpha beta charlie echo',
                timeout: 1,
                cleanupSemantic: false,
                cleanupEfficiency: 4
            }
            const { container, rerender } = render(SvelteDiff, {
                ...props,
                onProcessing: firstCallback
            })

            await waitFor(() => {
                expect(firstCallback).toHaveBeenCalled()
            })
            const firstDiffs = firstCallback.mock.calls[0][1]
            Object.assign(props, { [dependency]: value })

            await rerender({
                ...props,
                onProcessing: secondCallback
            })

            await waitFor(() => {
                expect(secondCallback).toHaveBeenCalled()
            })
            expect(secondCallback.mock.calls[0][1]).not.toBe(firstDiffs)
            if ('expectedText' in testCase) {
                expect(container.textContent).toContain(testCase.expectedText)
            }
        }
    )

    it('uses default values for optional props', () => {
        const { component } = render(SvelteDiff, {
            originalText: 'foo',
            modifiedText: 'bar'
        })
        expect(component).toBeTruthy()
    })

    it('accepts all documented props', () => {
        const onProcessing = vi.fn()
        expect(() =>
            render(SvelteDiff, {
                originalText: 'a',
                modifiedText: 'b',
                timeout: 2,
                cleanupSemantic: true,
                cleanupEfficiency: 8,
                compact: true,
                onProcessing,
                rendererClasses: { remove: 'del', insert: 'ins', equal: 'eq' },
                renderers: {}
            })
        ).not.toThrow()
    })
})

describe('SvelteDiff snippet precedence', () => {
    it('renders child snippets passed directly as props', () => {
        const { container } = render(SvelteDiff, {
            originalText: 'foo shoo',
            modifiedText: 'bar shoo',
            remove: textSnippet('child-remove'),
            insert: textSnippet('child-insert'),
            equal: textSnippet('child-equal')
        })
        expect(container.querySelector('.child-remove')).toBeTruthy()
        expect(container.querySelector('.child-insert')).toBeTruthy()
        expect(container.querySelector('.child-equal')).toBeTruthy()
    })

    it('child snippet wins over the matching renderers entry', () => {
        const { container } = render(SvelteDiff, {
            originalText: 'foo shoo',
            modifiedText: 'bar shoo',
            remove: textSnippet('child-remove'),
            renderers: {
                remove: textSnippet('renderers-remove'),
                insert: textSnippet('renderers-insert')
            }
        })
        expect(container.querySelector('.child-remove')).toBeTruthy()
        expect(container.querySelector('.renderers-remove')).toBeFalsy()
        expect(container.querySelector('.renderers-insert')).toBeTruthy()
    })

    it('falls back per segment type: renderers entry, then built-in rendering', () => {
        const { container } = render(SvelteDiff, {
            originalText: 'foo shoo',
            modifiedText: 'bar shoo',
            renderers: { remove: textSnippet('renderers-remove') },
            rendererClasses: { insert: 'class-insert' }
        })
        expect(container.querySelector('.renderers-remove')).toBeTruthy()
        expect(container.querySelector('.class-insert')).toBeTruthy()
    })
})

describe('SvelteDiff expected patterns', () => {
    it('reuses expected-pattern metadata when only modifiedText changes', async () => {
        const onProcessing = vi.fn()
        const originalText = 'Copyright (?<year>\\d{4}) MIT'
        const { container, rerender } = render(SvelteDiff, {
            originalText,
            modifiedText: 'Copyright 2024 MIT',
            onProcessing
        })

        await waitFor(() => {
            expect(container.querySelector('span[title="year"]')?.textContent).toBe('2024')
            expect(onProcessing).toHaveBeenCalledWith(
                expect.any(Object),
                expect.any(Array),
                expect.objectContaining({ year: '2024' })
            )
        })

        await rerender({
            originalText,
            modifiedText: 'Copyright 2025 MIT',
            onProcessing
        })

        await waitFor(() => {
            expect(container.querySelector('span[title="year"]')?.textContent).toBe('2025')
            expect(onProcessing).toHaveBeenCalledWith(
                expect.any(Object),
                expect.any(Array),
                expect.objectContaining({ year: '2025' })
            )
        })
    })

    it('renders expected regions with default styling and title attribute', () => {
        const { container } = render(SvelteDiff, {
            originalText: 'Copyright (?<year>\\d{4}) MIT',
            modifiedText: 'Copyright 2024 MIT'
        })
        const expectedSpan = container.querySelector('span[title="year"]')
        expect(expectedSpan).toBeTruthy()
        expect(expectedSpan!.textContent).toBe('2024')
        expect(expectedSpan!.getAttribute('style')).toContain('background-color')
    })

    it('falls back to normal diff with cleaned template when regex does not match', () => {
        const { container } = render(SvelteDiff, {
            originalText: 'Copyright (?<year>\\d{4}) MIT',
            modifiedText: 'completely different text'
        })
        const expectedSpan = container.querySelector('span[title="year"]')
        expect(expectedSpan).toBeNull()
        // Should show cleaned placeholder <year>, not raw (?<year>\\d{4})
        expect(container.textContent).toContain('<year>')
        expect(container.textContent).not.toContain('(?<year>')
    })

    it('renders expected regions even when text2 has extra content (partial match)', () => {
        const { container } = render(SvelteDiff, {
            originalText: 'Copyright (?<year>\\d{4}) (?<holder>.+)',
            modifiedText: 'MIT License\n\nCopyright (c) 2024 Jason Kummerl'
        })
        // "2024" should be tagged as expected with title="year"
        const yearSpan = container.querySelector('span[title="year"]')
        expect(yearSpan).toBeTruthy()
        expect(yearSpan!.textContent).toBe('2024')

        // "Jason Kummerl" should be tagged as expected with title="holder"
        const holderSpan = container.querySelector('span[title="holder"]')
        expect(holderSpan).toBeTruthy()
        expect(holderSpan!.textContent).toBe('Jason Kummerl')
    })

    it('passes captures to onProcessing as 3rd arg', async () => {
        const onProcessing = vi.fn()
        render(SvelteDiff, {
            originalText: 'Copyright (?<year>\\d{4}) MIT',
            modifiedText: 'Copyright 2024 MIT',
            onProcessing
        })
        await waitFor(() => {
            expect(onProcessing).toHaveBeenCalled()
        })
        const captures = onProcessing.mock.calls[0][2]
        expect(captures).toBeDefined()
        expect(captures.year).toBe('2024')
    })

    it('applies rendererClasses.expected with title still present', () => {
        const { container } = render(SvelteDiff, {
            originalText: 'Copyright (?<year>\\d{4}) MIT',
            modifiedText: 'Copyright 2024 MIT',
            rendererClasses: { expected: 'test-expected' }
        })
        const expectedSpan = container.querySelector('.test-expected')
        expect(expectedSpan).toBeTruthy()
        expect(expectedSpan!.getAttribute('title')).toBe('year')
    })

    it('no change in behavior when no capture groups in originalText', () => {
        const { container } = render(SvelteDiff, {
            originalText: 'hello world',
            modifiedText: 'hello brave world'
        })
        // No title attributes should be present (no expected regions)
        const titledSpans = container.querySelectorAll('span[title]')
        expect(titledSpans.length).toBe(0)
        expect(container.textContent).toContain('brave')
    })
})

describe('SvelteDiff compact rendering', () => {
    it('renders unstyled equal multiline text without span wrappers', () => {
        const lines = Array.from({ length: 100 }, () => 'unchanged line')
        const text = lines.join('\n')
        const { container } = render(SvelteDiff, {
            originalText: text,
            modifiedText: text,
            compact: true
        })

        expect(container.textContent).toBe(lines.join(''))
        expect(container.querySelectorAll('br')).toHaveLength(99)
        expect(container.querySelectorAll('span')).toHaveLength(0)
    })

    it('keeps the default equal span when compact is omitted', () => {
        const { container } = render(SvelteDiff, {
            originalText: 'unchanged',
            modifiedText: 'unchanged'
        })

        expect(container.querySelector('span')?.textContent).toBe('unchanged')
    })

    it('keeps classed equal spans in compact mode', () => {
        const { container } = render(SvelteDiff, {
            originalText: 'unchanged',
            modifiedText: 'unchanged',
            compact: true,
            rendererClasses: { equal: 'test-equal' }
        })

        expect(container.querySelector('.test-equal')?.textContent).toBe('unchanged')
    })

    it('keeps a child equal snippet in compact mode', () => {
        const { container } = render(SvelteDiff, {
            originalText: 'unchanged',
            modifiedText: 'unchanged',
            compact: true,
            equal: textSnippet('child-equal')
        })

        expect(container.querySelector('.child-equal')?.textContent).toBe('unchanged')
    })

    it('keeps renderers.equal in compact mode', () => {
        const { container } = render(SvelteDiff, {
            originalText: 'unchanged',
            modifiedText: 'unchanged',
            compact: true,
            renderers: { equal: textSnippet('renderers-equal') }
        })

        expect(container.querySelector('.renderers-equal')?.textContent).toBe('unchanged')
    })

    it('keeps insert, remove, and expected spans in compact mode', () => {
        const changed = render(SvelteDiff, {
            originalText: 'shared old',
            modifiedText: 'shared new',
            compact: true
        }).container
        const expected = render(SvelteDiff, {
            originalText: 'Version (?<version>\\d+)',
            modifiedText: 'Version 2',
            compact: true
        }).container

        expect(changed.querySelector('span[style*="background-color: red"]')?.textContent).toBe(
            'old'
        )
        expect(changed.querySelector('span[style*="background-color: green"]')?.textContent).toBe(
            'new'
        )
        expect(expected.querySelector('span[title="version"]')?.textContent).toBe('2')
    })

    it('preserves leading, trailing, and consecutive line breaks', () => {
        const text = '\nalpha\n\nomega\n'
        const { container } = render(SvelteDiff, {
            originalText: text,
            modifiedText: text,
            compact: true
        })
        const readableOutput = container.cloneNode(true) as HTMLElement
        readableOutput.querySelectorAll('br').forEach((lineBreak) => lineBreak.replaceWith('|'))

        expect(readableOutput.textContent).toBe('|alpha||omega|')
        expect(container.querySelectorAll('br')).toHaveLength(4)
        expect(container.querySelectorAll('span')).toHaveLength(0)
    })

    it('keeps a custom line-break renderer in compact mode', () => {
        const { container } = render(SvelteDiff, {
            originalText: 'alpha\nbeta\ngamma',
            modifiedText: 'alpha\nbeta\ngamma',
            compact: true,
            renderers: {
                lineBreak: createRawSnippet<[]>(() => ({
                    render: () => '<hr class="custom-break">'
                }))
            }
        })

        expect(container.textContent).toBe('alphabetagamma')
        expect(container.querySelectorAll('.custom-break')).toHaveLength(2)
        expect(container.querySelectorAll('br')).toHaveLength(0)
        expect(container.querySelectorAll('span')).toHaveLength(0)
    })
})

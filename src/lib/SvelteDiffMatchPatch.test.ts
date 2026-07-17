import { render, waitFor } from '@testing-library/svelte'
import { createRawSnippet } from 'svelte'
import { describe, expect, it, vi } from 'vitest'
import SvelteDiffMatchPatch from './SvelteDiffMatchPatch.svelte'

const textSnippet = (className: string) =>
    createRawSnippet<[string]>((text) => ({
        render: () => `<span class="${className}">${text()}</span>`
    }))

// Note: Svelte 5 snippets cannot be directly tested as functions, so we focus on prop and DOM behavior

describe('SvelteDiffMatchPatch component', () => {
    it('renders a basic diff between two strings', () => {
        const { container } = render(SvelteDiffMatchPatch, {
            originalText: 'hello world',
            modifiedText: 'hello brave world'
        })
        expect(container.textContent).toContain('hello')
        expect(container.textContent).toContain('brave')
        expect(container.textContent).toContain('world')
    })

    it('applies rendererClasses for styling', () => {
        const { container } = render(SvelteDiffMatchPatch, {
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
        render(SvelteDiffMatchPatch, {
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

    it('uses default values for optional props', () => {
        const { component } = render(SvelteDiffMatchPatch, {
            originalText: 'foo',
            modifiedText: 'bar'
        })
        expect(component).toBeTruthy()
    })

    it('accepts all documented props', () => {
        const onProcessing = vi.fn()
        expect(() =>
            render(SvelteDiffMatchPatch, {
                originalText: 'a',
                modifiedText: 'b',
                timeout: 2,
                cleanupSemantic: true,
                cleanupEfficiency: 8,
                onProcessing,
                rendererClasses: { remove: 'del', insert: 'ins', equal: 'eq' },
                renderers: {}
            })
        ).not.toThrow()
    })
})

describe('SvelteDiffMatchPatch snippet precedence', () => {
    it('renders child snippets passed directly as props', () => {
        const { container } = render(SvelteDiffMatchPatch, {
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
        const { container } = render(SvelteDiffMatchPatch, {
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
        const { container } = render(SvelteDiffMatchPatch, {
            originalText: 'foo shoo',
            modifiedText: 'bar shoo',
            renderers: { remove: textSnippet('renderers-remove') },
            rendererClasses: { insert: 'class-insert' }
        })
        expect(container.querySelector('.renderers-remove')).toBeTruthy()
        expect(container.querySelector('.class-insert')).toBeTruthy()
    })
})

describe('SvelteDiffMatchPatch expected patterns', () => {
    it('renders expected regions with default styling and title attribute', () => {
        const { container } = render(SvelteDiffMatchPatch, {
            originalText: 'Copyright (?<year>\\d{4}) MIT',
            modifiedText: 'Copyright 2024 MIT'
        })
        const expectedSpan = container.querySelector('span[title="year"]')
        expect(expectedSpan).toBeTruthy()
        expect(expectedSpan!.textContent).toBe('2024')
        expect(expectedSpan!.getAttribute('style')).toContain('background-color')
    })

    it('falls back to normal diff with cleaned template when regex does not match', () => {
        const { container } = render(SvelteDiffMatchPatch, {
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
        const { container } = render(SvelteDiffMatchPatch, {
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
        render(SvelteDiffMatchPatch, {
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
        const { container } = render(SvelteDiffMatchPatch, {
            originalText: 'Copyright (?<year>\\d{4}) MIT',
            modifiedText: 'Copyright 2024 MIT',
            rendererClasses: { expected: 'test-expected' }
        })
        const expectedSpan = container.querySelector('.test-expected')
        expect(expectedSpan).toBeTruthy()
        expect(expectedSpan!.getAttribute('title')).toBe('year')
    })

    it('no change in behavior when no capture groups in originalText', () => {
        const { container } = render(SvelteDiffMatchPatch, {
            originalText: 'hello world',
            modifiedText: 'hello brave world'
        })
        const expectedSpan = container.querySelector('span[title]')
        // No title attributes should be present (no expected regions)
        const titledSpans = container.querySelectorAll('span[title]')
        expect(titledSpans.length).toBe(0)
        expect(container.textContent).toContain('brave')
    })
})

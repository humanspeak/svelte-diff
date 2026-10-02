import { fireEvent, render, waitFor } from '@testing-library/svelte'
import { DiffOp } from 'diff-match-patch-ts'
import { createRawSnippet, flushSync, tick } from 'svelte'
import { describe, expect, it, vi } from 'vitest'
import DiffModesFixture from '../routes/tests/diff-modes/+page.svelte'
import SvelteDiff from './SvelteDiff.svelte'
import * as patterns from './expectedPatterns.js'
import type { SvelteDiffProps, SvelteDiffTuple } from './index.js'
import ProcessingCallbackFixture from './test/ProcessingCallbackFixture.svelte'

vi.mock('./expectedPatterns.js', async (importOriginal) => {
    const actual = await importOriginal<typeof patterns>()
    return { ...actual, parseExpectedPatterns: vi.fn(actual.parseExpectedPatterns) }
})

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

    it('does not subscribe to state read and written by onProcessing', async () => {
        const observe = vi.fn()
        const { getByTestId } = render(ProcessingCallbackFixture, { observe })

        flushSync()
        await tick()

        expect(observe).toHaveBeenCalledTimes(1)
        expect(getByTestId('counter').textContent).toBe('1')
    })

    it('does not notify when state only read by onProcessing changes', async () => {
        const observe = vi.fn()
        const { getByRole } = render(ProcessingCallbackFixture, {
            observe,
            incrementOnProcessing: false
        })

        flushSync()
        await tick()
        expect(observe).toHaveBeenCalledTimes(1)

        await fireEvent.click(getByRole('button', { name: 'Increment counter' }))
        flushSync()
        await tick()

        expect(observe).toHaveBeenCalledTimes(1)
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
        { dependency: 'timeout', value: 0 },
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

describe('SvelteDiff literal source', () => {
    it('supports literal source without interpreting named groups', async () => {
        const source = 'const pattern = /(?<year>\\d{4})/;'
        const onProcessing = vi.fn()
        const props: SvelteDiffProps = {
            originalText: source,
            modifiedText: source,
            expectedPatterns: false,
            onProcessing,
            rendererClasses: { expected: 'test-expected' }
        }
        const { container } = render(SvelteDiff, props)

        await waitFor(() => expect(onProcessing).toHaveBeenCalled())
        const [, diffs, captures] = onProcessing.mock.lastCall!
        expect(diffs).toEqual([[0, source]])
        expect(captures).toBeUndefined()
        expect(container.querySelectorAll('.test-expected, [data-capture-name]')).toHaveLength(0)
        expect(container.textContent).toBe(source)
    })

    it('reconstructs both sides of changed literal source from raw tuples', async () => {
        const originalText = 'const pattern = /(?<year>\\d{4})/;'
        const modifiedText = 'const pattern = /(?<year>\\d{2})/g;'
        const onProcessing = vi.fn()
        const props: SvelteDiffProps = {
            originalText,
            modifiedText,
            expectedPatterns: false,
            onProcessing,
            rendererClasses: { expected: 'test-expected' }
        }
        const { container } = render(SvelteDiff, props)

        await waitFor(() => expect(onProcessing).toHaveBeenCalled())
        const diffs = onProcessing.mock.lastCall![1] as SvelteDiffTuple[]
        expect(
            diffs
                .filter(([op]) => op !== DiffOp.Insert)
                .map(([, text]) => text)
                .join('')
        ).toBe(originalText)
        expect(
            diffs
                .filter(([op]) => op !== DiffOp.Delete)
                .map(([, text]) => text)
                .join('')
        ).toBe(modifiedText)
        expect(onProcessing.mock.lastCall![2]).toBeUndefined()
        expect(container.querySelectorAll('.test-expected, [data-capture-name]')).toHaveLength(0)
    })
})

describe('SvelteDiff expected patterns', () => {
    it('compares invalid templates literally and recovers after valid edits', async () => {
        const onProcessing = vi.fn()
        const invalid = '(?<bad>*)'
        const { container, rerender } = render(SvelteDiff, {
            originalText: invalid,
            modifiedText: invalid,
            onProcessing,
            rendererClasses: { expected: 'test-expected' }
        })
        const assertResult = async (
            source: string,
            target: string,
            captures: Record<string, string> | undefined
        ) => {
            await waitFor(() => {
                expect(onProcessing).toHaveBeenCalled()
                const [, diffs, actualCaptures] = onProcessing.mock.lastCall!
                expect(actualCaptures).toEqual(captures)
                expect(
                    diffs
                        .filter(([op]: [number, string]) => op <= 0)
                        .map(([, text]: [number, string]) => text)
                        .join('')
                ).toBe(source)
                expect(
                    diffs
                        .filter(([op]: [number, string]) => op >= 0)
                        .map(([, text]: [number, string]) => text)
                        .join('')
                ).toBe(target)
            })
            expect(container.querySelectorAll('.test-expected')).toHaveLength(captures ? 1 : 0)
        }
        await assertResult(invalid, invalid, undefined)

        for (const duplicate of ['(?<id>\\d+) (?<id>\\w+)', 'A: (?<id>\\w+)\nB: (?<id>\\w+)']) {
            onProcessing.mockClear()
            await rerender({ originalText: duplicate, modifiedText: duplicate })
            await assertResult(duplicate, duplicate, undefined)
        }

        const valid = 'Copyright (?<year>\\d{4}) MIT'
        onProcessing.mockClear()
        await rerender({ originalText: valid, modifiedText: 'different text' })
        await assertResult('Copyright <year> MIT', 'different text', undefined)

        onProcessing.mockClear()
        await rerender({ originalText: valid, modifiedText: 'Copyright 2024 MIT' })
        await assertResult('Copyright 2024 MIT', 'Copyright 2024 MIT', { year: '2024' })
        expect(container.querySelector('span[title="year"]')?.textContent).toBe('2024')
    })

    it('renders distinct repeated-context captures and updates them independently', async () => {
        const onProcessing = vi.fn()
        const originalText = 'Item: (?<first>\\w+)\nItem: (?<second>\\w+)'
        const props = {
            originalText,
            modifiedText: 'Item: Alpha\nItem: Beta',
            onProcessing,
            rendererClasses: { remove: 'removed', insert: 'inserted' }
        }
        const { container, rerender } = render(SvelteDiff, props)
        const assertResult = async (second: string) => {
            const target = `Item: Alpha\nItem: ${second}`
            await waitFor(() => {
                expect(container.querySelectorAll('span[title="first"]')).toHaveLength(1)
                expect(container.querySelector('span[title="first"]')?.textContent).toBe('Alpha')
                expect(container.querySelectorAll('span[title="second"]')).toHaveLength(1)
                expect(container.querySelector('span[title="second"]')?.textContent).toBe(second)
                expect(container.querySelectorAll('.removed, .inserted')).toHaveLength(0)
                expect(onProcessing.mock.lastCall?.[2]).toEqual({ first: 'Alpha', second })
            })
            const tuples = onProcessing.mock.lastCall![1] as [number, string][]
            for (const excluded of [-1, 1]) {
                expect(
                    tuples
                        .filter(([op]) => op !== excluded)
                        .map(([, text]) => text)
                        .join('')
                ).toBe(target)
            }
        }
        await assertResult('Beta')
        await rerender({ ...props, modifiedText: 'Item: Alpha\nItem: Gamma' })
        await assertResult('Gamma')
        expect(container.textContent).not.toContain('Beta')
    })

    it.each([
        [
            'Item: (?<first>\\w+)\nItem: (?<second>\\w+)',
            'Item: Alpha',
            'Item: <first>\nItem: <second>'
        ],
        ['A: (?<first>\\w+)\nB: (?<second>\\w+)', 'B: Beta\nA: Alpha', 'A: <first>\nB: <second>']
    ])(
        'keeps cleaned fallback for unmatched ordered template %s',
        async (originalText, modifiedText, cleaned) => {
            const onProcessing = vi.fn()
            const { container } = render(SvelteDiff, { originalText, modifiedText, onProcessing })
            await waitFor(() => expect(onProcessing).toHaveBeenCalled())
            const tuples = onProcessing.mock.lastCall![1] as [number, string][]
            expect(
                tuples
                    .filter(([op]) => op !== 1)
                    .map(([, text]) => text)
                    .join('')
            ).toBe(cleaned)
            expect(container.querySelectorAll('span[title]')).toHaveLength(0)
        }
    )

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

    it('renders expected regions with default styling and capture metadata', () => {
        const { container } = render(SvelteDiff, {
            originalText: 'Copyright (?<year>\\d{4}) MIT',
            modifiedText: 'Copyright 2024 MIT'
        })
        const expectedSpan = container.querySelector('span[title="year"]')
        expect(expectedSpan).toBeTruthy()
        expect(expectedSpan!.textContent).toBe('2024')
        expect(expectedSpan!.getAttribute('data-capture-name')).toBe('year')
        expect(expectedSpan!.getAttribute('data-capture-value')).toBe('2024')
        expect(container.querySelectorAll('[data-capture-name]')).toHaveLength(1)
        expect(expectedSpan!.getAttribute('style')).toContain('background-color')
    })

    it('renders multiline expected regions across line breaks', () => {
        const { container } = render(SvelteDiff, {
            originalText: 'Value: (?<value>[\\s\\S]+)',
            modifiedText: 'Value: alpha\nbeta'
        })

        const expectedSpans = container.querySelectorAll('span[title="value"]')
        expect([...expectedSpans].map((span) => span.textContent)).toEqual(['alpha', 'beta'])
        expect([...expectedSpans].map((span) => span.getAttribute('data-capture-name'))).toEqual([
            'value',
            'value'
        ])
        expect([...expectedSpans].map((span) => span.getAttribute('data-capture-value'))).toEqual([
            'alpha\nbeta',
            'alpha\nbeta'
        ])
        expect(container.querySelectorAll('br')).toHaveLength(1)
    })

    it('preserves literal capture values in metadata without creating HTML', () => {
        const value = '<img src="x" onerror="alert(1)"> & \'quoted\''
        const { container } = render(SvelteDiff, {
            originalText: 'Value: (?<value>.+)',
            modifiedText: `Value: ${value}`
        })
        const capture = container.querySelector('[data-capture-name="value"]')
        expect(capture?.getAttribute('data-capture-value')).toBe(value)
        expect(capture?.textContent).toBe(value)
        expect(container.querySelector('img')).toBeNull()
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

    it('renders and delivers own __proto__ capture values', async () => {
        const onProcessing = vi.fn()
        const { container } = render(SvelteDiff, {
            originalText: 'Value: (?<__proto__>\\w+)',
            modifiedText: 'Value: Alpha',
            onProcessing
        })
        expect(container.querySelector('span[title="__proto__"]')?.textContent).toBe('Alpha')
        await waitFor(() => expect(onProcessing).toHaveBeenCalled())

        const captures = onProcessing.mock.calls[0][2]
        expect(captures).toBeDefined()
        expect(Object.hasOwn(captures, '__proto__')).toBe(true)
        expect(captures['__proto__']).toBe('Alpha')
        expect(Object.keys(captures)).toEqual(['__proto__'])
        expect(Object.getPrototypeOf(captures)).toBe(Object.prototype)
        const tuples: [number, string][] = onProcessing.mock.calls[0][1]
        expect(
            tuples
                .filter(([op]) => op !== 1)
                .map(([, text]) => text)
                .join('')
        ).toBe('Value: Alpha')
        expect(
            tuples
                .filter(([op]) => op !== -1)
                .map(([, text]) => text)
                .join('')
        ).toBe('Value: Alpha')
    })

    it('applies rendererClasses.expected with capture metadata still present', () => {
        const { container } = render(SvelteDiff, {
            originalText: 'Copyright (?<year>\\d{4}) MIT',
            modifiedText: 'Copyright 2024 MIT',
            rendererClasses: { expected: 'test-expected' }
        })
        const expectedSpan = container.querySelector('.test-expected')
        expect(expectedSpan).toBeTruthy()
        expect(expectedSpan!.getAttribute('title')).toBe('year')
        expect(expectedSpan!.getAttribute('data-capture-name')).toBe('year')
        expect(expectedSpan!.getAttribute('data-capture-value')).toBe('2024')
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
        expect(
            container.querySelectorAll('[data-capture-name], [data-capture-value]')
        ).toHaveLength(0)
    })
})

describe('SvelteDiff compact rendering', () => {
    it.each(['character', 'word', 'line'] as const)(
        'reuses compact text and break nodes during %s updates',
        async (diffMode) => {
            const props = { originalText: 'alpha\nbeta\n', modifiedText: 'alpha\nbeta\n', diffMode }
            const { container, rerender } = render(SvelteDiff, props)
            const breaks = [...container.querySelectorAll('br')]
            const firstText = [...container.childNodes].find(
                (node) => node.nodeType === Node.TEXT_NODE && node.textContent === 'alpha'
            )
            expect(firstText).toBeDefined()

            await rerender({
                ...props,
                originalText: 'gamma\ndelta\n',
                modifiedText: 'gamma\ndelta\n'
            })

            expect(container.textContent).toBe('gammadelta')
            expect(container.querySelector('span')).toBeNull()
            const updatedBreaks = [...container.querySelectorAll('br')]
            expect(updatedBreaks).toHaveLength(breaks.length)
            updatedBreaks.forEach((node, index) => expect(node).toBe(breaks[index]))
            expect(firstText?.isConnected).toBe(true)
            expect(firstText?.textContent).toBe('gamma')

            await rerender({ ...props, originalText: '\n\nomega\n', modifiedText: '\n\nomega\n' })
            const readableOutput = container.cloneNode(true) as HTMLElement
            readableOutput.querySelectorAll('br').forEach((node) => node.replaceWith('|'))
            expect(readableOutput.textContent).toBe('||omega|')
            expect(container.querySelector('span')).toBeNull()
        }
    )

    it('switches between built-in compact lines and custom line-break markup', async () => {
        const props = { originalText: 'alpha\nbeta\n', modifiedText: 'alpha\nbeta\n' }
        const { container, rerender } = render(SvelteDiff, props)
        const lineBreak = createRawSnippet<[]>(() => ({
            render: () => '<hr class="custom-break">'
        }))

        await rerender({ ...props, renderers: { lineBreak } })
        expect(container.textContent).toBe('alphabeta')
        expect(container.querySelectorAll('.custom-break')).toHaveLength(2)
        expect(container.querySelectorAll('br')).toHaveLength(0)

        await rerender({ ...props, renderers: {} })
        expect(container.textContent).toBe('alphabeta')
        expect(container.querySelectorAll('.custom-break')).toHaveLength(0)
        expect(container.querySelectorAll('br')).toHaveLength(2)
        expect(container.querySelector('span')).toBeNull()
    })

    it('renders multiline equal text without wrapper elements in compact mode', () => {
        const lines = Array.from({ length: 100 }, () => 'unchanged line')
        const text = lines.join('\n')
        const { container } = render(SvelteDiff, {
            originalText: text,
            modifiedText: text
        })

        expect(container.textContent).toBe(lines.join(''))
        expect(container.querySelectorAll('br')).toHaveLength(99)
        expect(container.querySelectorAll('span')).toHaveLength(0)
    })

    it('restores legacy equal spans when compact is false', () => {
        const { container } = render(SvelteDiff, {
            originalText: 'unchanged',
            modifiedText: 'unchanged',
            compact: false
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

describe('diff modes', () => {
    it('replaces whole words', () => {
        const props = {
            originalText: 'cat',
            modifiedText: 'car',
            diffMode: 'word' as const,
            cleanupEfficiency: 0,
            rendererClasses: { remove: 'removed', insert: 'inserted' }
        }
        const { container } = render(SvelteDiff, props)
        expect(container.querySelector('.removed')?.textContent).toBe('cat')
        expect(container.querySelector('.inserted')?.textContent).toBe('car')
    })

    it('replaces whole lines in raw tuples', async () => {
        const onProcessing = vi.fn()
        const props = {
            originalText: 'count=10\nkeep=true\n',
            modifiedText: 'count=20\nkeep=true\n',
            diffMode: 'line' as const,
            cleanupEfficiency: 0,
            onProcessing
        }
        render(SvelteDiff, props)
        await waitFor(() => expect(onProcessing).toHaveBeenCalled())
        expect(onProcessing.mock.calls[0][1]).toEqual([
            [-1, 'count=10\n'],
            [1, 'count=20\n'],
            [0, 'keep=true\n']
        ])
    })
})

describe('diff mode integration', () => {
    it('keeps omitted and explicit character output identical', async () => {
        const callback = vi.fn()
        const props = { originalText: 'cat', modifiedText: 'car', onProcessing: callback }
        const { container, rerender } = render(SvelteDiff, props)
        await waitFor(() => expect(callback).toHaveBeenCalled())
        const html = container.innerHTML
        const tuples = callback.mock.calls[0][1]
        await rerender({ ...props, diffMode: 'character' })
        expect(container.innerHTML).toBe(html)
        expect(callback.mock.lastCall?.[1]).toBe(tuples)
    })
    it.each(['word', 'line'] as const)(
        'recomputes %s edits but reuses callback-only tuples',
        async (diffMode) => {
            const callback = vi.fn()
            const next = vi.fn()
            const props = {
                originalText: 'cat',
                modifiedText: 'car',
                diffMode,
                cleanupSemantic: true,
                cleanupEfficiency: 8
            }
            const { rerender } = render(SvelteDiff, { ...props, onProcessing: callback })
            await waitFor(() => expect(callback).toHaveBeenCalled())
            const tuples = callback.mock.calls[0][1]
            expect(tuples).toEqual([
                [-1, 'cat'],
                [1, 'car']
            ])
            expect(callback.mock.calls[0][0].cleanup).toBe(0)
            await rerender({ ...props, onProcessing: next })
            await waitFor(() => expect(next).toHaveBeenCalled())
            expect(next.mock.calls[0][1]).toBe(tuples)
            await rerender({ ...props, modifiedText: 'dog', onProcessing: next })
            expect(next.mock.lastCall?.[1]).not.toBe(tuples)
            expect(next.mock.lastCall?.[1]).toEqual([
                [-1, 'cat'],
                [1, 'dog']
            ])
            await rerender({ ...props, diffMode: 'character', onProcessing: next })
            expect(next.mock.lastCall?.[1]).not.toEqual(tuples)
        }
    )
    it.each(['word', 'line'] as const)(
        'tags captures after resolving %s source',
        async (diffMode) => {
            const onProcessing = vi.fn()
            const { container } = render(SvelteDiff, {
                originalText: 'Release (?<version>v\\d+)',
                modifiedText: 'Release v2 ready',
                diffMode,
                onProcessing,
                rendererClasses: { remove: 'removed', expected: 'expected' }
            })
            await waitFor(() => expect(onProcessing).toHaveBeenCalled())
            const [, tuples, captures] = onProcessing.mock.calls[0]
            expect(
                tuples
                    .filter(([op]: [number, string]) => op !== 1)
                    .map(([, text]: [number, string]) => text)
                    .join('')
            ).toBe('Release v2')
            expect(captures).toEqual({ version: 'v2' })
            expect(container.querySelector('.expected')?.textContent).toBe('v2')
            if (diffMode === 'line')
                expect(container.querySelector('.removed')?.textContent).toBe('Release v2')
        }
    )
    it.each(['word', 'line'] as const)(
        'preserves %s mismatch placeholders and renderer precedence',
        async (diffMode) => {
            const callback = vi.fn()
            const { container } = render(SvelteDiff, {
                originalText: 'Year (?<year>\\d{4})\n',
                modifiedText: 'Year unknown\n',
                diffMode,
                onProcessing: callback,
                remove: textSnippet('child'),
                renderers: { remove: textSnippet('loser'), insert: textSnippet('insert') },
                compact: false
            })
            await waitFor(() => expect(callback).toHaveBeenCalled())
            expect(
                callback.mock.calls[0][1]
                    .filter(([op]: [number, string]) => op !== 1)
                    .map(([, text]: [number, string]) => text)
                    .join('')
            ).toBe('Year <year>\n')
            expect(container.querySelector('.child')).toBeTruthy()
            expect(container.querySelector('.loser')).toBeNull()
            expect(container.querySelector('.insert')).toBeTruthy()
            expect(container.querySelector('br')).toBeTruthy()
        }
    )
})

describe('token mode display contracts', () => {
    it.each(['word', 'line'] as const)(
        'renders %s captures spanning words and lines through custom snippets',
        async (diffMode) => {
            const onProcessing = vi.fn()
            const expected = createRawSnippet<[string, string]>((text, group) => ({
                render: () => `<mark title="${group()}">${text()}</mark>`
            }))
            const lineBreak = createRawSnippet<[]>(() => ({
                render: () => '<br class="custom-break" />'
            }))
            const { container } = render(SvelteDiff, {
                originalText: 'Value: (?<value>[\\s\\S]+)',
                modifiedText: 'Value: alpha beta\ngamma',
                diffMode,
                onProcessing,
                expected,
                lineBreak,
                renderers: {
                    expected: createRawSnippet<[string, string]>(() => ({
                        render: () => '<i>loser</i>'
                    }))
                }
            })
            await waitFor(() => expect(onProcessing).toHaveBeenCalled())
            expect(onProcessing.mock.calls[0][1]).toEqual([[0, 'Value: alpha beta\ngamma']])
            expect(onProcessing.mock.calls[0][2]).toEqual({ value: 'alpha beta\ngamma' })
            expect([...container.querySelectorAll('mark')].map((node) => node.textContent)).toEqual(
                ['alpha beta', 'gamma']
            )
            expect(
                [...container.querySelectorAll('mark')].every((node) => node.title === 'value')
            ).toBe(true)
            expect(container.querySelector('i')).toBeNull()
            expect(container.querySelectorAll('.custom-break')).toHaveLength(1)
        }
    )
    it.each(['word', 'line'] as const)(
        'preserves %s compact and equal renderer behavior',
        async (diffMode) => {
            const props = { originalText: 'same\ntext', modifiedText: 'same\ntext', diffMode }
            const { container, rerender } = render(SvelteDiff, props)
            expect(container.querySelector('span')).toBeNull()
            expect(container.querySelectorAll('br')).toHaveLength(1)
            await rerender({ ...props, compact: false })
            expect(container.querySelectorAll('span')).toHaveLength(2)
            await rerender({
                ...props,
                compact: true,
                equal: textSnippet('equal-child'),
                renderers: { equal: textSnippet('equal-map') }
            })
            expect(container.querySelectorAll('.equal-child')).toHaveLength(2)
            expect(container.querySelector('.equal-map')).toBeNull()
            await rerender({
                ...props,
                compact: true,
                equal: undefined,
                renderers: { equal: textSnippet('equal-map') }
            })
            expect(container.querySelectorAll('.equal-map')).toHaveLength(2)
        }
    )
})

describe('display shape transitions', () => {
    it('retains renderer nodes for same-shape text changes', async () => {
        const props = { originalText: 'cat', modifiedText: 'car', diffMode: 'line' as const }
        const { container, rerender } = render(SvelteDiff, props)
        const removed = container.querySelector('span')
        await rerender({ ...props, originalText: 'dog' })
        expect(container.querySelector('span')).toBe(removed)
        expect(removed?.textContent).toBe('dog')
    })

    it('updates expected captures across display shapes in both directions', async () => {
        const props = {
            originalText: 'Value: (?<value>[\\s\\S]+)',
            modifiedText: 'Value: alpha',
            compact: false
        }
        const { container, rerender } = render(SvelteDiff, props)
        await rerender({ ...props, modifiedText: 'Value: beta\ngamma' })
        expect(
            [...container.querySelectorAll('[title="value"]')].map((node) => node.textContent)
        ).toEqual(['beta', 'gamma'])
        expect(
            [...container.querySelectorAll('[data-capture-name="value"]')].map((node) =>
                node.getAttribute('data-capture-value')
            )
        ).toEqual(['beta\ngamma', 'beta\ngamma'])
        expect(container.textContent).toBe('Value: betagamma')
        expect(container.querySelectorAll('br')).toHaveLength(1)
        await rerender(props)
        expect(container.textContent).toBe('Value: alpha')
        expect(container.querySelectorAll('[title="value"]')).toHaveLength(1)
        expect(
            container
                .querySelector('[data-capture-name="value"]')
                ?.getAttribute('data-capture-value')
        ).toBe('alpha')
        expect(container.querySelectorAll('br')).toHaveLength(0)
    })

    it('clears old snippet DOM after mode changes and bound input edits', async () => {
        const { getByLabelText, getByRole } = render(DiffModesFixture)
        const result = getByRole('region', { name: 'Interactive result' })
        await fireEvent.change(getByLabelText(/Diff mode/), { target: { value: 'line' } })
        await fireEvent.input(getByLabelText('Before'), {
            target: { value: 'count=10\nkeep=true\n' }
        })
        await fireEvent.input(getByLabelText('After'), {
            target: { value: 'count=20\nkeep=true\n' }
        })
        expect(result.textContent).toBe('count=10count=20keep=true')
        expect(getByRole('region', { name: 'Default character' }).textContent).toBe(
            'count=120keep=true'
        )
    })

    it('replaces custom snippets when line edits become multiline', async () => {
        const props = {
            originalText: 'The cat sleeps.',
            modifiedText: 'The car sleeps.',
            diffMode: 'line' as const,
            remove: textSnippet('removed'),
            insert: textSnippet('inserted'),
            equal: textSnippet('equal')
        }
        const { container, rerender } = render(SvelteDiff, props)
        await rerender({ ...props, originalText: 'count=10\nkeep=true\n' })
        await rerender({
            ...props,
            originalText: 'count=10\nkeep=true\n',
            modifiedText: 'count=20\nkeep=true\n'
        })
        expect([...container.querySelectorAll('.removed')].map((node) => node.textContent)).toEqual(
            ['count=10']
        )
        expect(
            [...container.querySelectorAll('.inserted')].map((node) => node.textContent)
        ).toEqual(['count=20'])
        expect(container.textContent).toBe('count=10count=20keep=true')
        await rerender(props)
        expect(container.textContent).toBe('The cat sleeps.The car sleeps.')
        expect(container.querySelectorAll('br')).toHaveLength(0)
    })

    it.each(['character', 'word', 'line'] as const)(
        'matches a fresh %s render after sequential input edits in both directions',
        async (diffMode) => {
            vi.useRealTimers()
            const props = {
                cleanupEfficiency: 0,
                originalText: 'The cat sleeps.',
                modifiedText: 'The car sleeps.',
                diffMode
            }
            const { container, rerender } = render(SvelteDiff, props)
            const edits = [
                { originalText: 'count=10\nkeep=true\n' },
                { modifiedText: 'count=20\nkeep=true\n' },
                { originalText: 'The cat sleeps.' },
                { modifiedText: 'The car sleeps.' }
            ]
            for (const edit of edits) {
                Object.assign(props, edit)
                await rerender(props)
                const fresh = render(SvelteDiff, props)
                expect(container.innerHTML).toBe(fresh.container.innerHTML)
                fresh.unmount()
            }
        }
    )
})

describe('pattern computation boundaries', () => {
    it('caches parsing across target, mode, options and callback edits and bypasses literal parsing', async () => {
        const parser = vi.mocked(patterns.parseExpectedPatterns)
        parser.mockClear()
        const callback = vi.fn()
        const props: SvelteDiffProps = {
            originalText: 'Year (?<year>\\d{4})',
            modifiedText: 'Year 2026',
            onProcessing: callback
        }
        const { container, rerender } = render(SvelteDiff, props)
        await waitFor(() => expect(callback).toHaveBeenCalled())
        expect(parser).toHaveBeenCalledTimes(1)
        const initial = callback.mock.lastCall![1]
        const html = container.innerHTML
        await rerender({ ...props, expectedPatterns: true })
        expect(callback.mock.lastCall![1]).toBe(initial)
        expect(container.innerHTML).toBe(html)
        const next = vi.fn()
        await rerender({ ...props, onProcessing: next })
        await waitFor(() => expect(next).toHaveBeenCalled())
        expect(next.mock.lastCall![1]).toBe(initial)
        for (const diffMode of ['word', 'line', 'character'] as const) {
            const previous = next.mock.lastCall![1]
            await rerender({ ...props, modifiedText: 'Year 2027', diffMode, onProcessing: next })
            expect(next.mock.lastCall![1]).not.toBe(previous)
            expect(next.mock.lastCall![2]).toEqual({ year: '2027' })
        }
        await rerender({ ...props, timeout: 0, cleanupEfficiency: 0, onProcessing: next })
        expect(parser).toHaveBeenCalledTimes(1)
        for (const expectedPatterns of [false, true, false]) {
            const previous = next.mock.lastCall![1]
            await rerender({ ...props, expectedPatterns, onProcessing: next })
            expect(next.mock.lastCall![1]).not.toBe(previous)
            const tuples = next.mock.lastCall![1] as SvelteDiffTuple[]
            expect(
                tuples
                    .filter(([op]) => op !== DiffOp.Insert)
                    .map(([, text]) => text)
                    .join('')
            ).toBe(expectedPatterns ? 'Year 2026' : props.originalText)
            expect(next.mock.lastCall![2]).toEqual(expectedPatterns ? { year: '2026' } : undefined)
            expect(container.querySelectorAll('[data-capture-name]')).toHaveLength(
                expectedPatterns ? 1 : 0
            )
        }
        expect(parser).toHaveBeenCalledTimes(1)
        await rerender({
            ...props,
            originalText: '(?<bad>*)',
            expectedPatterns: false,
            onProcessing: next
        })
        expect(parser).toHaveBeenCalledTimes(1)
        const literalTuples = next.mock.lastCall![1]
        const literalCallback = vi.fn()
        await rerender({
            ...props,
            originalText: '(?<bad>*)',
            expectedPatterns: false,
            onProcessing: literalCallback
        })
        await waitFor(() => expect(literalCallback).toHaveBeenCalled())
        expect(literalCallback.mock.lastCall![1]).toBe(literalTuples)
        await rerender({
            ...props,
            originalText: 'Year (?<value>\\d+)',
            expectedPatterns: true,
            onProcessing: next
        })
        expect(parser).toHaveBeenCalledTimes(2)
        expect(next.mock.lastCall![2]).toEqual({ value: '2026' })
    })
})

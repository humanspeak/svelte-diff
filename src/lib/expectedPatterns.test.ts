import { describe, expect, it } from 'vitest'
import {
    cleanTemplate,
    extractCaptures,
    parseExpectedPatterns,
    tagExpectedRegions
} from './expectedPatterns.js'

describe('parseExpectedPatterns', () => {
    it('returns null when no groups are present', () => {
        expect(parseExpectedPatterns('hello world')).toBeNull()
    })

    it('returns null for plain parentheses without named groups', () => {
        expect(parseExpectedPatterns('foo (bar) baz')).toBeNull()
    })

    it('parses a single named group', () => {
        const result = parseExpectedPatterns('Copyright (?<year>\\d{4}) MIT')
        expect(result).not.toBeNull()
        if (result === null) throw new Error('Expected named group to parse')
        expect(result.groups).toHaveLength(1)
        expect(result.groups[0]).toEqual({ name: 'year', pattern: '\\d{4}' })
        expect(result.parts).toEqual(['Copyright ', '(?<year>\\d{4})', ' MIT'])
    })

    it('parses multiple named groups', () => {
        const result = parseExpectedPatterns('(?<year>.*?) (?<holder>.*?)')
        expect(result).not.toBeNull()
        expect(result!.groups).toHaveLength(2)
        expect(result!.groups[0].name).toBe('year')
        expect(result!.groups[1].name).toBe('holder')
    })

    it('handles groups at the start and end of text', () => {
        const result = parseExpectedPatterns('(?<start>\\w+) middle (?<end>\\w+)')
        expect(result).not.toBeNull()
        expect(result!.groups).toHaveLength(2)
        expect(result!.groups[0].name).toBe('start')
        expect(result!.groups[1].name).toBe('end')
    })

    it('handles groups with dotAll pattern', () => {
        const result = parseExpectedPatterns('(?<content>.*)')
        expect(result).not.toBeNull()
        expect(result!.groups[0].pattern).toBe('.*')
    })

    it('preserves empty parts around adjacent groups at both boundaries', () => {
        const result = parseExpectedPatterns('(?<first>\\w+)(?<second>\\d+)')
        if (result === null) throw new Error('Expected adjacent named groups to parse')

        expect(result.parts).toEqual(['', '(?<first>\\w+)', '', '(?<second>\\d+)', ''])
    })

    it('preserves multiline Unicode literals around group parts', () => {
        const text = 'α\n(?<word>\\w+)\n終'
        const result = parseExpectedPatterns(text)
        if (result === null) throw new Error('Expected multiline named group to parse')

        expect(result.parts).toEqual(['α\n', '(?<word>\\w+)', '\n終'])
        expect(cleanTemplate(text)).toBe('α\n<word>\n終')
    })

    it('leaves malformed group syntax unchanged', () => {
        const malformed = 'before (?<broken>abc after 🌍'

        expect(parseExpectedPatterns(malformed)).toBeNull()
        expect(cleanTemplate(malformed)).toBe(malformed)
    })

    it.each(['(?<1invalid>\\w+)', '(?<missing-close\\w+)'])(
        'rejects malformed named-group marker %s',
        (malformed) => {
            expect(parseExpectedPatterns(malformed)).toBeNull()
            expect(cleanTemplate(malformed)).toBe(malformed)
        }
    )
})

describe('invalid expected templates', () => {
    it('rethrows unexpected regex compilation errors', () => {
        const nativeRegExp = globalThis.RegExp
        const sentinel = new TypeError('Unexpected compilation failure')
        const throwingRegExp = new Proxy(nativeRegExp, {
            construct: () => {
                throw sentinel
            }
        })
        try {
            globalThis.RegExp = throwingRegExp
            let caught: unknown
            try {
                parseExpectedPatterns('(?<value>\\w+)')
            } catch (error) {
                caught = error
            }
            expect(caught).toBe(sentinel)
        } finally {
            globalThis.RegExp = nativeRegExp
        }
    })

    const invalidBodies = ['(?<bad>*)', '(?<bad>[z-a])']
    const duplicateNames = [
        '(?<id>\\d+) (?<id>\\w+)',
        'A: (?<id>\\w+)\nB: (?<id>\\w+)',
        '(?<id>same) (?<id>same)'
    ]
    const mixedTemplate = 'Year: (?<year>\\d{4})\nBad: (?<bad>*)'

    it.each(invalidBodies)('returns null for invalid balanced regex bodies: %s', (input) => {
        expect(parseExpectedPatterns(input)).toBeNull()
    })

    it.each(duplicateNames)(
        'rejects duplicate capture names across a whole template: %s',
        (input) => {
            expect(parseExpectedPatterns(input)).toBeNull()
        }
    )

    it('rejects mixed valid and invalid source as a whole', () => {
        expect(parseExpectedPatterns(mixedTemplate)).toBeNull()
    })

    it.each([...invalidBodies, ...duplicateNames, mixedTemplate])(
        'leaves invalid expected templates literal in cleanTemplate: %s',
        (input) => {
            expect(cleanTemplate(input)).toBe(input)
        }
    )
})

describe('cleanTemplate', () => {
    it('replaces named groups with readable placeholders', () => {
        expect(cleanTemplate('Copyright (?<year>\\d{4}) (?<holder>.+)')).toBe(
            'Copyright <year> <holder>'
        )
    })

    it('returns text unchanged when no groups are present', () => {
        expect(cleanTemplate('hello world')).toBe('hello world')
    })

    it('handles groups with complex patterns', () => {
        expect(cleanTemplate('(?<name>.*?) end')).toBe('<name> end')
    })
})

describe('compiled expected-pattern metadata', () => {
    it('reuses compiled expected-pattern metadata for multiple extractions', () => {
        const original = 'Year: (?<year>\\d{4})\nHolder: (?<holder>[A-Za-z]+)'
        const parsed = parseExpectedPatterns(original)!

        expect(parsed.matches).toEqual([
            {
                fullMatch: '(?<year>\\d{4})',
                name: 'year',
                pattern: '\\d{4}',
                index: 6
            },
            {
                fullMatch: '(?<holder>[A-Za-z]+)',
                name: 'holder',
                pattern: '[A-Za-z]+',
                index: 29
            }
        ])
        expect(parsed.cleanedText).toBe('Year: <year>\nHolder: <holder>')
        expect(parsed.linePatterns).toHaveLength(2)
        expect(parsed.linePatterns.map(({ lineText, groups }) => ({ lineText, groups }))).toEqual([
            {
                lineText: 'Year: (?<year>\\d{4})',
                groups: [{ name: 'year', pattern: '\\d{4}', indexInLine: 6 }]
            },
            {
                lineText: 'Holder: (?<holder>[A-Za-z]+)',
                groups: [{ name: 'holder', pattern: '[A-Za-z]+', indexInLine: 8 }]
            }
        ])

        const regexes = parsed.linePatterns.map(({ regex }) => regex)
        const first = extractCaptures(original, 'Year: 2024\nHolder: Alice', parsed)
        const second = extractCaptures(original, 'Year: 2025\nHolder: Bob', parsed)

        expect(first).toMatchObject({
            captures: { year: '2024', holder: 'Alice' },
            resolvedText: 'Year: 2024\nHolder: Alice'
        })
        expect(second).toMatchObject({
            captures: { year: '2025', holder: 'Bob' },
            resolvedText: 'Year: 2025\nHolder: Bob'
        })
        expect(parsed.linePatterns.map(({ regex }) => regex)).toEqual(regexes)
        parsed.linePatterns.forEach(({ regex }, index) => {
            expect(regex).toBe(regexes[index])
        })
    })
})

describe('extractCaptures', () => {
    it('returns null when capture patterns are genuinely absent', () => {
        const text = 'Copyright (?<year>\\d{4}) MIT'
        const parsed = parseExpectedPatterns(text)!
        const result = extractCaptures(text, 'completely different text', parsed)
        expect(result).toBeNull()
    })

    it('extracts captures on a perfect match', () => {
        const original = 'Copyright (?<year>\\d{4}) (?<holder>.+)'
        const modified = 'Copyright 2024 Jason Kummerl'
        const parsed = parseExpectedPatterns(original)!
        const result = extractCaptures(original, modified, parsed)

        expect(result).not.toBeNull()
        expect(result!.captures.year).toBe('2024')
        expect(result!.captures.holder).toBe('Jason Kummerl')
        expect(result!.resolvedText).toBe('Copyright 2024 Jason Kummerl')
    })

    it('preserves __proto__ as an own enumerable capture property', () => {
        const original = 'Value: (?<__proto__>\\w+)'
        const modified = 'Value: Alpha'
        const parsed = parseExpectedPatterns(original)!
        const result = extractCaptures(original, modified, parsed)

        expect(result).not.toBeNull()
        expect.soft(result!.resolvedText).toBe('Value: Alpha')
        expect(result!.captureRangesInText2).toEqual([{ name: '__proto__', start: 7, end: 12 }])
        const { captures } = result!
        expect.soft(Object.hasOwn(captures, '__proto__')).toBe(true)
        expect.soft(captures['__proto__']).toBe('Alpha')
        expect.soft(Object.keys(captures)).toEqual(['__proto__'])
        expect.soft(JSON.parse(JSON.stringify(captures))['__proto__']).toBe('Alpha')
        expect(Object.getPrototypeOf(captures)).toBe(Object.prototype)
    })

    it.each([
        ['constructor', 'Constructor', 'Alpha'],
        ['toString', 'String', 'Beta'],
        ['hasOwnProperty', 'Property', 'Gamma']
    ])('preserves %s as an own enumerable capture property', (name, label, value) => {
        const original = `${label}: (?<${name}>\\w+)`
        const modified = `${label}: ${value}`
        const parsed = parseExpectedPatterns(original)!
        const result = extractCaptures(original, modified, parsed)

        expect(result).not.toBeNull()
        expect(result!.resolvedText).toBe(modified)
        const { captures } = result!
        expect(Object.hasOwn(captures, name)).toBe(true)
        expect(captures[name]).toBe(value)
        expect(Object.getOwnPropertyDescriptor(captures, name)).toEqual({
            value,
            enumerable: true,
            writable: true,
            configurable: true
        })
        expect(Object.getPrototypeOf(captures)).toBe(Object.prototype)
        expect(Object.entries(captures)).toEqual([[name, value]])
        expect(JSON.parse(JSON.stringify(captures))).toEqual({ [name]: value })
    })

    it('preserves mixed __proto__ and constructor capture values', () => {
        const original = 'Values: (?<__proto__>\\w+) and (?<constructor>\\w+)'
        const modified = 'Values: Alpha and Beta'
        const parsed = parseExpectedPatterns(original)!
        const result = extractCaptures(original, modified, parsed)

        expect(result).not.toBeNull()
        expect(result!.resolvedText).toBe(modified)
        const { captures } = result!
        expect(Object.hasOwn(captures, '__proto__')).toBe(true)
        expect(Object.hasOwn(captures, 'constructor')).toBe(true)
        expect(captures['__proto__']).toBe('Alpha')
        expect(captures['constructor']).toBe('Beta')
        expect(Object.getPrototypeOf(captures)).toBe(Object.prototype)
        expect(Object.entries(captures)).toEqual([
            ['__proto__', 'Alpha'],
            ['constructor', 'Beta']
        ])
        expect(JSON.parse(JSON.stringify(captures))).toEqual({
            ['__proto__']: 'Alpha',
            constructor: 'Beta'
        })
    })

    it('computes correct capture ranges in text2', () => {
        const original = 'Copyright (?<year>\\d{4}) MIT'
        const modified = 'Copyright 2024 MIT'
        const parsed = parseExpectedPatterns(original)!
        const result = extractCaptures(original, modified, parsed)

        expect(result).not.toBeNull()
        expect(result!.captureRangesInText2).toHaveLength(1)
        // "Copyright " is 10 chars, then "2024" at [10, 14]
        expect(result!.captureRangesInText2[0]).toEqual({ name: 'year', start: 10, end: 14 })
    })

    it('handles partial match with extra content in text2', () => {
        const original = 'Copyright (?<year>\\d{4}) (?<holder>.+)'
        const modified = 'MIT License\n\nCopyright (c) 2024 Jason Kummerl'
        const parsed = parseExpectedPatterns(original)!
        const result = extractCaptures(original, modified, parsed)

        expect(result).not.toBeNull()
        expect(result!.captures.year).toBe('2024')
        expect(result!.captures.holder).toBe('Jason Kummerl')
        // Verify ranges point into modified text
        expect(
            modified.slice(
                result!.captureRangesInText2[0].start,
                result!.captureRangesInText2[0].end
            )
        ).toBe('2024')
        expect(
            modified.slice(
                result!.captureRangesInText2[1].start,
                result!.captureRangesInText2[1].end
            )
        ).toBe('Jason Kummerl')
    })

    it('handles multiple groups on same line', () => {
        const original = '(?<a>\\w+) and (?<b>\\w+)'
        const modified = 'foo and bar'
        const parsed = parseExpectedPatterns(original)!
        const result = extractCaptures(original, modified, parsed)

        expect(result).not.toBeNull()
        expect(result!.captures.a).toBe('foo')
        expect(result!.captures.b).toBe('bar')
        expect(
            modified.slice(
                result!.captureRangesInText2[0].start,
                result!.captureRangesInText2[0].end
            )
        ).toBe('foo')
        expect(
            modified.slice(
                result!.captureRangesInText2[1].start,
                result!.captureRangesInText2[1].end
            )
        ).toBe('bar')
    })

    it('handles groups on different lines', () => {
        const original = 'Name: (?<name>.+)\nYear: (?<year>\\d{4})'
        const modified = 'Name: Alice\nYear: 2025'
        const parsed = parseExpectedPatterns(original)!
        const result = extractCaptures(original, modified, parsed)

        expect(result).not.toBeNull()
        expect(result!.captures.name).toBe('Alice')
        expect(result!.captures.year).toBe('2025')
        expect(
            modified.slice(
                result!.captureRangesInText2[0].start,
                result!.captureRangesInText2[0].end
            )
        ).toBe('Alice')
        expect(
            modified.slice(
                result!.captureRangesInText2[1].start,
                result!.captureRangesInText2[1].end
            )
        ).toBe('2025')
    })

    it('builds resolvedText by substituting captures into template', () => {
        const original = 'START (?<val>\\d+) END'
        const modified = 'START 42 END'
        const parsed = parseExpectedPatterns(original)!
        const result = extractCaptures(original, modified, parsed)

        expect(result).not.toBeNull()
        expect(result!.resolvedText).toBe('START 42 END')
    })
})

describe('tagExpectedRegions', () => {
    it('reads sorted capture ranges approximately linearly', () => {
        const diffs: [number, string][] = Array.from({ length: 400 }, () => [0, 'x'])
        const ranges = Array.from({ length: 200 }, (_, index) => ({
            name: `range_${index}`,
            start: index * 2,
            end: index * 2 + 1
        }))
        let numericRangeReads = 0
        const observedRanges = new Proxy(ranges, {
            get(target, property, receiver) {
                if (typeof property === 'string' && /^\d+$/.test(property)) {
                    numericRangeReads++
                }
                return Reflect.get(target, property, receiver)
            }
        })

        const result = tagExpectedRegions(diffs, observedRanges)

        expect(result.map(({ text }) => text).join('')).toBe('x'.repeat(400))
        expect(result.filter(({ expected }) => expected !== undefined)).toHaveLength(200)
        expect(numericRangeReads).toBeLessThan(5000)
    })

    it('passes through when no capture ranges', () => {
        const diffs: [number, string][] = [
            [0, 'hello '],
            [-1, 'world'],
            [1, 'there']
        ]
        const result = tagExpectedRegions(diffs, [])
        expect(result).toEqual([
            { operation: 0, text: 'hello ' },
            { operation: -1, text: 'world' },
            { operation: 1, text: 'there' }
        ])
    })

    it('tags an equal segment that overlaps a capture range in text2', () => {
        // resolvedText: "Copyright 2024 MIT" vs text2: "Copyright 2024 MIT"
        // Both identical, so single equal diff. Capture at [10,14] in text2.
        const diffs: [number, string][] = [[0, 'Copyright 2024 MIT']]
        const ranges = [{ name: 'year', start: 10, end: 14 }]
        const result = tagExpectedRegions(diffs, ranges)

        expect(result).toEqual([
            { operation: 0, text: 'Copyright ' },
            { operation: 0, text: '2024', expected: 'year' },
            { operation: 0, text: ' MIT' }
        ])
    })

    it('handles inserts before equal segments (text2 position tracking)', () => {
        // resolvedText: "Hello World"
        // text2:        "PREFIX Hello World"
        // diffs: [1, "PREFIX "], [0, "Hello World"]
        // Capture range in text2: "World" at [13, 18]
        const diffs: [number, string][] = [
            [1, 'PREFIX '],
            [0, 'Hello World']
        ]
        const ranges = [{ name: 'g', start: 13, end: 18 }]
        const result = tagExpectedRegions(diffs, ranges)

        expect(result).toEqual([
            { operation: 1, text: 'PREFIX ' },
            { operation: 0, text: 'Hello ' },
            { operation: 0, text: 'World', expected: 'g' }
        ])
    })

    it('preserves remove diffs without advancing text2 position', () => {
        // resolvedText: "ab cd"
        // text2:        "cd"
        // diffs: [-1, "ab "], [0, "cd"]
        // Capture at text2 [0, 2] ("cd")
        const diffs: [number, string][] = [
            [-1, 'ab '],
            [0, 'cd']
        ]
        const ranges = [{ name: 'g', start: 0, end: 2 }]
        const result = tagExpectedRegions(diffs, ranges)

        expect(result).toEqual([
            { operation: -1, text: 'ab ' },
            { operation: 0, text: 'cd', expected: 'g' }
        ])
    })

    it('handles multiple captures in one equal segment', () => {
        // text2: "A B C" — captures at [0,1] and [4,5]
        const diffs: [number, string][] = [[0, 'A B C']]
        const ranges = [
            { name: 'first', start: 0, end: 1 },
            { name: 'second', start: 4, end: 5 }
        ]
        const result = tagExpectedRegions(diffs, ranges)

        expect(result).toEqual([
            { operation: 0, text: 'A', expected: 'first' },
            { operation: 0, text: ' B ' },
            { operation: 0, text: 'C', expected: 'second' }
        ])
    })

    it('splits at capture boundaries correctly', () => {
        // text2: "hello2024world"
        const diffs: [number, string][] = [[0, 'hello2024world']]
        const ranges = [{ name: 'year', start: 5, end: 9 }]
        const result = tagExpectedRegions(diffs, ranges)

        expect(result).toEqual([
            { operation: 0, text: 'hello' },
            { operation: 0, text: '2024', expected: 'year' },
            { operation: 0, text: 'world' }
        ])
    })

    it('tags one expected range spanning two consecutive equal diff segments', () => {
        const diffs: [number, string][] = [
            [0, 'ab'],
            [0, 'cd']
        ]
        const ranges = [{ name: 'middle', start: 1, end: 3 }]

        expect(tagExpectedRegions(diffs, ranges)).toEqual([
            { operation: 0, text: 'a' },
            { operation: 0, text: 'b', expected: 'middle' },
            { operation: 0, text: 'c', expected: 'middle' },
            { operation: 0, text: 'd' }
        ])
    })

    it('tags a multiline Unicode range across diff-segment boundaries', () => {
        const diffs: [number, string][] = [
            [0, 'A\n😀'],
            [0, 'BC']
        ]
        const ranges = [{ name: 'multiline', start: 1, end: 5 }]

        expect(tagExpectedRegions(diffs, ranges)).toEqual([
            { operation: 0, text: 'A' },
            { operation: 0, text: '\n😀', expected: 'multiline' },
            { operation: 0, text: 'B', expected: 'multiline' },
            { operation: 0, text: 'C' }
        ])
    })

    it('tags one expected range spanning an insert followed by an equal segment', () => {
        const diffs: [number, string][] = [
            [1, 'ab'],
            [0, 'cd']
        ]
        const ranges = [{ name: 'middle', start: 1, end: 3 }]

        expect(tagExpectedRegions(diffs, ranges)).toEqual([
            { operation: 1, text: 'a' },
            { operation: 0, text: 'b', expected: 'middle' },
            { operation: 0, text: 'c', expected: 'middle' },
            { operation: 0, text: 'd' }
        ])
    })

    it('handles ranges ending at a segment start and starting at a segment end', () => {
        const diffs: [number, string][] = [
            [0, 'ab'],
            [0, 'cd']
        ]
        const ranges = [
            { name: 'first', start: 0, end: 2 },
            { name: 'second', start: 2, end: 4 }
        ]

        expect(tagExpectedRegions(diffs, ranges)).toEqual([
            { operation: 0, text: 'ab', expected: 'first' },
            { operation: 0, text: 'cd', expected: 'second' }
        ])
    })

    it('preserves several remove segments between text2-advancing segments', () => {
        const diffs: [number, string][] = [
            [0, 'a'],
            [-1, 'x'],
            [-1, 'y'],
            [1, 'b'],
            [-1, 'z'],
            [0, 'c']
        ]
        const ranges = [{ name: 'tail', start: 1, end: 3 }]

        expect(tagExpectedRegions(diffs, ranges)).toEqual([
            { operation: 0, text: 'a' },
            { operation: -1, text: 'x' },
            { operation: -1, text: 'y' },
            { operation: 0, text: 'b', expected: 'tail' },
            { operation: -1, text: 'z' },
            { operation: 0, text: 'c', expected: 'tail' }
        ])
    })
})

describe('findNamedGroups (via parseExpectedPatterns)', () => {
    it('completes in under 100ms on malformed input with 50k trailing chars (ReDoS regression)', () => {
        const malicious = '(?<A>' + 'a'.repeat(50000)
        const start = performance.now()
        const result = parseExpectedPatterns(malicious)
        const elapsed = performance.now() - start

        expect(result).toBeNull()
        expect(elapsed).toBeLessThan(100)
    })

    it('handles deep nesting (3+ levels) inside a group', () => {
        const text = '(?<name>(?:a|(?:b|(?:c|d))))'
        const result = parseExpectedPatterns(text)

        expect(result).not.toBeNull()
        expect(result!.groups).toHaveLength(1)
        expect(result!.groups[0].name).toBe('name')
        expect(result!.groups[0].pattern).toBe('(?:a|(?:b|(?:c|d)))')
    })

    it('rejects the outer group when it contains a nested named group', () => {
        const text = '(?<outer>(?<inner>foo))'
        const result = parseExpectedPatterns(text)

        // The outer group is rejected due to nested named group,
        // but the inner group is still found as a standalone match
        expect(result).not.toBeNull()
        expect(result!.groups).toHaveLength(1)
        expect(result!.groups[0].name).toBe('inner')
        expect(result!.groups[0].pattern).toBe('foo')
    })

    it('handles escaped parentheses inside groups', () => {
        const text = 'before (?<name>\\(escaped\\)) after'
        const result = parseExpectedPatterns(text)

        expect(result).not.toBeNull()
        expect(result!.groups[0].name).toBe('name')
        expect(result!.groups[0].pattern).toBe('\\(escaped\\)')
    })

    it('ignores parentheses inside character classes while finding the group boundary', () => {
        const text = 'Symbol: (?<symbol>[)])'
        const result = parseExpectedPatterns(text)
        if (result === null) throw new Error('Expected character-class group to parse')

        expect(result.groups[0].pattern).toBe('[)]')
        expect(result.parts).toEqual(['Symbol: ', '(?<symbol>[)])', ''])
        expect(result.cleanedText).toBe('Symbol: <symbol>')
        expect(cleanTemplate(text)).toBe('Symbol: <symbol>')
    })

    it('handles empty pattern in group', () => {
        const text = '(?<empty>)'
        const result = parseExpectedPatterns(text)

        expect(result).not.toBeNull()
        expect(result!.groups[0].name).toBe('empty')
        expect(result!.groups[0].pattern).toBe('')
    })
})

/** Observes source access while forwarding boxed-string behavior to native strings. */
const countSourceTraversal = (primitive: string) => {
    let traversed = 0
    const value = new Proxy(new String(primitive), {
        get(target, property) {
            if (typeof property === 'string' && /^(0|[1-9]\d*)$/.test(property)) {
                if (Number(property) < primitive.length) traversed++
                return Reflect.get(target, property)
            }
            if (property === Symbol.iterator) {
                return function* () {
                    for (const character of primitive) {
                        traversed += character.length
                        yield character
                    }
                }
            }
            if (property === Symbol.toPrimitive) {
                return () => {
                    traversed += primitive.length
                    return primitive
                }
            }
            const member: unknown = Reflect.get(target, property)
            if (typeof member !== 'function') return member
            return (...args: unknown[]) => {
                const result: unknown = Reflect.apply(member, primitive, args)
                if (property === 'charAt' || property === 'at') {
                    traversed += typeof result === 'string' ? result.length : 0
                } else if (property === 'charCodeAt' || property === 'codePointAt') {
                    if (typeof result === 'number' && Number.isFinite(result)) {
                        traversed += property === 'codePointAt' && result > 0xffff ? 2 : 1
                    }
                } else if (
                    property === 'slice' ||
                    property === 'substring' ||
                    property === 'substr'
                ) {
                    traversed += typeof result === 'string' ? result.length : 0
                } else {
                    // Native conversion/search/transformation work can traverse the whole source.
                    traversed += primitive.length
                }
                return result
            }
        }
    })
    return { value, reads: () => traversed }
}

it('rejected candidates have bounded source traversal', () => {
    for (const markers of [64, 128, 256]) {
        const primitiveInput = '(?<A>'.repeat(markers)
        const budget = 64 * primitiveInput.length + 128
        const parsedInput = countSourceTraversal(primitiveInput)
        const parsed = parseExpectedPatterns(parsedInput.value as unknown as string)
        expect(parsed).toBeNull()
        expect
            .soft(
                parsedInput.reads(),
                `parse: ${markers} markers, ${primitiveInput.length} chars, budget ${budget}`
            )
            .toBeLessThanOrEqual(budget)

        const cleanedInput = countSourceTraversal(primitiveInput)
        const cleaned = cleanTemplate(cleanedInput.value as unknown as string)
        expect(String(cleaned)).toBe(primitiveInput)
        expect
            .soft(
                cleanedInput.reads(),
                `clean: ${markers} markers, ${primitiveInput.length} chars, budget ${budget}`
            )
            .toBeLessThanOrEqual(budget)
    }
})

describe('scanner compatibility', () => {
    const cases = [
        {
            title: 'closed rejected outer retains its valid inner',
            text: '(?<outer>(?<inner>foo))',
            groups: [{ name: 'inner', pattern: 'foo' }],
            matches: [{ fullMatch: '(?<inner>foo)', name: 'inner', pattern: 'foo', index: 9 }],
            parts: ['(?<outer>', '(?<inner>foo)', ')'],
            cleaned: '(?<outer><inner>)'
        },
        {
            title: 'several rejected ancestors retain their valid inner',
            text: '(?<a>(?<b>(?<c>foo)))',
            groups: [{ name: 'c', pattern: 'foo' }],
            matches: [{ fullMatch: '(?<c>foo)', name: 'c', pattern: 'foo', index: 10 }],
            parts: ['(?<a>(?<b>', '(?<c>foo)', '))'],
            cleaned: '(?<a>(?<b><c>))'
        },
        {
            title: 'unclosed outer retains its closed valid inner',
            text: '(?<outer>before (?<inner>foo) tail',
            groups: [{ name: 'inner', pattern: 'foo' }],
            matches: [{ fullMatch: '(?<inner>foo)', name: 'inner', pattern: 'foo', index: 16 }],
            parts: ['(?<outer>before ', '(?<inner>foo)', ' tail'],
            cleaned: '(?<outer>before <inner> tail'
        },
        {
            title: 'escaped parentheses and brackets preserve the boundary',
            text: 'x (?<value>\\(a\\)\\[b\\]) y',
            groups: [{ name: 'value', pattern: '\\(a\\)\\[b\\]' }],
            matches: [
                {
                    fullMatch: '(?<value>\\(a\\)\\[b\\])',
                    name: 'value',
                    pattern: '\\(a\\)\\[b\\]',
                    index: 2
                }
            ],
            parts: ['x ', '(?<value>\\(a\\)\\[b\\])', ' y'],
            cleaned: 'x <value> y'
        },
        {
            title: 'parentheses and marker text inside a class stay in the accepted group',
            text: '(?<value>[()(?<inner>]) tail',
            groups: [{ name: 'value', pattern: '[()(?<inner>]' }],
            matches: [
                {
                    fullMatch: '(?<value>[()(?<inner>])',
                    name: 'value',
                    pattern: '[()(?<inner>]',
                    index: 0
                }
            ],
            parts: ['', '(?<value>[()(?<inner>])', ' tail'],
            cleaned: '<value> tail'
        },
        {
            title: 'escaped closing parenthesis does not end a group',
            text: '(?<value>a\\)b)',
            groups: [{ name: 'value', pattern: 'a\\)b' }],
            matches: [{ fullMatch: '(?<value>a\\)b)', name: 'value', pattern: 'a\\)b', index: 0 }],
            parts: ['', '(?<value>a\\)b)', ''],
            cleaned: '<value>'
        },
        {
            title: 'valid group following malformed name syntax is retained',
            text: '(?<1bad>oops) (?<ok>foo)',
            groups: [{ name: 'ok', pattern: 'foo' }],
            matches: [{ fullMatch: '(?<ok>foo)', name: 'ok', pattern: 'foo', index: 14 }],
            parts: ['(?<1bad>oops) ', '(?<ok>foo)', ''],
            cleaned: '(?<1bad>oops) <ok>'
        },
        {
            title: 'adjacent valid groups retain empty literal parts',
            text: '(?<a>x)(?<b>y)',
            groups: [
                { name: 'a', pattern: 'x' },
                { name: 'b', pattern: 'y' }
            ],
            matches: [
                { fullMatch: '(?<a>x)', name: 'a', pattern: 'x', index: 0 },
                { fullMatch: '(?<b>y)', name: 'b', pattern: 'y', index: 7 }
            ],
            parts: ['', '(?<a>x)', '', '(?<b>y)', ''],
            cleaned: '<a><b>'
        },
        {
            title: 'multiline Unicode literals retain UTF-16 indices',
            text: 'α😀\n(?<word>\\w+)\n終',
            groups: [{ name: 'word', pattern: '\\w+' }],
            matches: [{ fullMatch: '(?<word>\\w+)', name: 'word', pattern: '\\w+', index: 4 }],
            parts: ['α😀\n', '(?<word>\\w+)', '\n終'],
            cleaned: 'α😀\n<word>\n終'
        }
    ]

    it.each(cases)('$title', ({ text, groups, matches, parts, cleaned }) => {
        const result = parseExpectedPatterns(text)
        if (result === null) throw new Error(`Expected primitive template to parse: ${text}`)
        expect(result.groups).toEqual(groups)
        expect(result.matches).toEqual(matches)
        expect(result.parts).toEqual(parts)
        expect(result.cleanedText).toBe(cleaned)
        expect(cleanTemplate(text)).toBe(cleaned)
    })

    it.each(['(?<value>[abc)', '(?<1bad>foo)', '(?<ébad>foo)', '(?<-bad>foo)'])(
        'retains rejected primitive input %s',
        (text) => {
            expect(parseExpectedPatterns(text)).toBeNull()
            expect(cleanTemplate(text)).toBe(text)
        }
    )
})

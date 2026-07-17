import SvelteDiffDefault, {
    SvelteDiff,
    SvelteDiffMatchPatch,
    type CaptureRange,
    type DisplayDiff,
    type PatternMatchResult,
    type RendererClasses,
    type Renderers,
    type SvelteDiffProps,
    type SvelteDiffTiming,
    type SvelteDiffTuple
} from './index.js'

describe('index exports', () => {
    it('should export SvelteDiff as default', () => {
        expect(SvelteDiffDefault).toBeDefined()
    })

    it('should export SvelteDiff as a named export equal to the default', () => {
        expect(SvelteDiff).toBeDefined()
        expect(SvelteDiff).toBe(SvelteDiffDefault)
    })

    it('should export SvelteDiffMatchPatch as a deprecated alias of SvelteDiff', () => {
        expect(SvelteDiffMatchPatch).toBe(SvelteDiff)
    })

    it('should export Renderers type', () => {
        const renderers: Renderers = {}
        expect(renderers).toBeDefined()
    })

    it('should export RendererClasses type', () => {
        const classes: RendererClasses = {}
        expect(classes).toBeDefined()
    })

    it('should export SvelteDiffTiming type', () => {
        const timing: SvelteDiffTiming = { main: 0, cleanup: 0, total: 0 }
        expect(timing).toBeDefined()
    })

    it('should export SvelteDiffTuple type', () => {
        const diffs: SvelteDiffTuple[] = []
        expect(diffs).toBeDefined()
    })

    it('should export SvelteDiffProps type', () => {
        const props: SvelteDiffProps = {
            originalText: '',
            modifiedText: ''
        }
        expect(props).toBeDefined()
    })

    it('should keep deprecated SvelteDiffMatchPatch* type aliases assignable', () => {
        const props: import('./index.js').SvelteDiffMatchPatchProps = {
            originalText: '',
            modifiedText: ''
        }

        const timing: import('./index.js').SvelteDiffMatchPatchTiming = {
            main: 0,
            cleanup: 0,
            total: 0
        }

        const diffs: import('./index.js').SvelteDiffMatchPatchDiff[] = []
        expect(props).toBeDefined()
        expect(timing).toBeDefined()
        expect(diffs).toBeDefined()
    })

    it('should export CaptureRange type', () => {
        const range: CaptureRange = { name: 'year', start: 0, end: 4 }
        expect(range).toBeDefined()
    })

    it('should export DisplayDiff type', () => {
        const diff: DisplayDiff = { operation: 0, text: 'hello' }
        expect(diff).toBeDefined()
        const expectedDiff: DisplayDiff = { operation: 0, text: '2024', expected: 'year' }
        expect(expectedDiff).toBeDefined()
    })

    it('should export PatternMatchResult type', () => {
        const result: PatternMatchResult = {
            resolvedText: 'hello',
            captures: { year: '2024' },
            captureRanges: [{ name: 'year', start: 0, end: 4 }]
        }
        expect(result).toBeDefined()
    })
})

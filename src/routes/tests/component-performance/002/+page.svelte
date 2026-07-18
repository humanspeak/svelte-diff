<script lang="ts">
    import {
        tagExpectedRegions,
        type CaptureRange,
        type DisplayDiff
    } from '$lib/expectedPatterns.js'
    import { onMount, tick } from 'svelte'

    type DiagnosticStatus = 'running' | 'pass' | 'fail'

    interface DiagnosticResult {
        status: DiagnosticStatus
        samples: number[]
        maximum: number
        output: DisplayDiff[]
        failureReasons: string[]
    }

    const SEGMENT_COUNT = 10000
    const RANGE_COUNT = 5000
    const SAMPLE_COUNT = 3
    const PREVIEW_COUNT = 120
    const CEILING_MS = 100
    const RUNNING_STATE_HOLD_MS = 250
    const diffs: [number, string][] = Array.from({ length: SEGMENT_COUNT }, () => [0, 'x'])
    const captureRanges: CaptureRange[] = Array.from({ length: RANGE_COUNT }, (_, index) => ({
        name: `range_${index}`,
        start: index * 2,
        end: index * 2 + 1
    }))

    let activeRunId = 0
    let diagnostic = $state<DiagnosticResult>({
        status: 'running',
        samples: [],
        maximum: 0,
        output: [],
        failureReasons: []
    })
    const preview = $derived(diagnostic.output.slice(0, PREVIEW_COUNT))
    const diagnosticText = $derived(
        [
            `Workload: ${SEGMENT_COUNT} equal segments / ${RANGE_COUNT} sorted ranges`,
            `Samples: ${diagnostic.samples.map((sample) => `${sample.toFixed(2)} ms`).join(', ') || 'Not measured'}`,
            `Ceiling: ${CEILING_MS.toFixed(2)} ms per run`,
            `Observed maximum: ${diagnostic.maximum.toFixed(2)} ms`,
            `Output segments: ${diagnostic.output.length}`,
            `Failure reasons: ${diagnostic.failureReasons.join('; ') || 'None'}`
        ].join('\n')
    )

    /** Paints the running state before any measured work starts. */
    const waitForPaint = async (): Promise<void> => {
        await tick()
        await new Promise<void>((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        })
        await new Promise<void>((resolve) => setTimeout(resolve, RUNNING_STATE_HOLD_MS))
    }

    /** Validates the complete tagging result rather than only the visible preview. */
    const validateOutput = (output: DisplayDiff[]): string[] => {
        const failureReasons: string[] = []
        if (output.length !== SEGMENT_COUNT) {
            failureReasons.push(
                `Expected ${SEGMENT_COUNT} output segments, received ${output.length}`
            )
        }
        if (output.map(({ text }) => text).join('') !== 'x'.repeat(SEGMENT_COUNT)) {
            failureReasons.push('Output text did not reconstruct the input')
        }

        for (let index = 0; index < output.length; index++) {
            const expectedName = index % 2 === 0 ? `range_${index / 2}` : undefined
            if (output[index].expected !== expectedName) {
                failureReasons.push(
                    `Segment ${index} was tagged ${output[index].expected ?? 'untagged'}, expected ${expectedName ?? 'untagged'}`
                )
                break
            }
        }
        return failureReasons
    }

    /** Runs one warmup and three measured forward-sweep tagging calls. */
    const runDiagnostic = async (): Promise<void> => {
        const runId = ++activeRunId
        diagnostic = {
            status: 'running',
            samples: [],
            maximum: 0,
            output: [],
            failureReasons: []
        }

        try {
            await waitForPaint()
            if (runId !== activeRunId) return

            tagExpectedRegions(diffs, captureRanges)
            const samples: number[] = []
            let output: DisplayDiff[] = []
            for (let sample = 0; sample < SAMPLE_COUNT; sample++) {
                const start = performance.now()
                output = tagExpectedRegions(diffs, captureRanges)
                samples.push(performance.now() - start)
            }

            const maximum = Math.max(...samples)
            const failureReasons = validateOutput(output)
            if (maximum > CEILING_MS) {
                failureReasons.push(
                    `Maximum ${maximum.toFixed(2)} ms exceeded the ${CEILING_MS.toFixed(2)} ms ceiling`
                )
            }
            diagnostic = {
                status: failureReasons.length === 0 ? 'pass' : 'fail',
                samples,
                maximum,
                output,
                failureReasons
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            diagnostic = {
                ...diagnostic,
                status: 'fail',
                failureReasons: [`Unexpected diagnostic error: ${message}`]
            }
        }
    }

    onMount(() => {
        void runDiagnostic()
        return () => {
            activeRunId++
        }
    })
</script>

<svelte:head>
    <title>002 — Forward-sweep expected-region tagging</title>
</svelte:head>

<main>
    <nav>
        <a href="/tests/component-performance">← All diagnostics</a>
        <a href="/tests/component-performance/001">← Previous: 001</a>
    </nav>
    <p class="eyebrow">DIAGNOSTIC 002</p>
    <h1>Tag expected regions in one forward sweep</h1>
    <p class="intro">
        This page times and validates 10,000 real diff segments against 5,000 sorted capture ranges,
        then paints the tagged result so the capability is visible to a human.
    </p>

    <div
        class="overall-banner"
        data-status={diagnostic.status}
        data-testid="diagnostic-overall"
        role="status"
        aria-live="polite"
        aria-atomic="true"
    >
        002: {diagnostic.status.toUpperCase()}
    </div>
    <button type="button" onclick={runDiagnostic} disabled={diagnostic.status === 'running'}>
        Run diagnostic 002
    </button>

    <section
        class="diagnostic-card"
        data-testid="diagnostic-002"
        data-status={diagnostic.status}
        data-ceiling-ms={CEILING_MS}
        data-elapsed-ms={diagnostic.maximum}
        data-samples-ms={diagnostic.samples.join(',')}
        data-segment-count={SEGMENT_COUNT}
        data-range-count={RANGE_COUNT}
        data-output-count={diagnostic.output.length}
        data-failure-reasons={diagnostic.failureReasons.join('; ')}
    >
        <header>
            <div>
                <p class="number">002</p>
                <h2>Measured result</h2>
            </div>
            <strong>{diagnostic.status.toUpperCase()}</strong>
        </header>
        <dl>
            <div>
                <dt>Workload</dt>
                <dd>{SEGMENT_COUNT} equal segments / {RANGE_COUNT} sorted ranges</dd>
            </div>
            <div>
                <dt>Samples</dt>
                <dd>
                    <ol data-testid="diagnostic-002-samples">
                        {#each diagnostic.samples as sample, index (index)}
                            <li>Run {index + 1}: {sample.toFixed(2)} ms</li>
                        {:else}
                            <li>Measurements are running…</li>
                        {/each}
                    </ol>
                </dd>
            </div>
            <div>
                <dt>Ceiling</dt>
                <dd>{CEILING_MS.toFixed(2)} ms per run</dd>
            </div>
            <div>
                <dt>Observed maximum</dt>
                <dd>{diagnostic.maximum.toFixed(2)} ms</dd>
            </div>
            <div>
                <dt>Output</dt>
                <dd>{diagnostic.output.length} validated segments</dd>
            </div>
            <div>
                <dt>Failure reasons</dt>
                <dd>{diagnostic.failureReasons.join('; ') || 'None'}</dd>
            </div>
        </dl>
        <pre>{diagnosticText}</pre>
    </section>

    <section class="capability-preview" data-testid="tagging-capability-preview">
        <header>
            <div>
                <p class="number">VISIBLE OUTPUT</p>
                <h2>Expected-region tagging checkerboard</h2>
            </div>
            <strong>{preview.length} / {SEGMENT_COUNT}</strong>
        </header>
        <p>
            Every tile is one actual output segment. Blue tiles are named expected captures; white
            tiles are unchanged, untagged text. Hover a blue tile to see its capture name.
        </p>
        <div class="legend" aria-label="Preview legend">
            <span class="legend-swatch expected"></span> Expected capture
            <span class="legend-swatch unchanged"></span> Unchanged text
        </div>
        <div
            class="preview-grid"
            data-testid="tagging-preview-segments"
            aria-label="First 120 tagged output segments"
        >
            {#each preview as segment, index (index)}
                <span
                    class:expected={Boolean(segment.expected)}
                    class:unchanged={!segment.expected}
                    data-index={index}
                    data-expected={segment.expected ?? ''}
                    title={segment.expected ?? `unchanged_${index}`}>{segment.text}</span
                >
            {:else}
                <p>The tagged output will appear here when the run completes.</p>
            {/each}
        </div>
        <p class="preview-note">
            Showing the first {PREVIEW_COUNT} of {SEGMENT_COUNT} validated output segments.
        </p>
    </section>
</main>

<style>
    :global(body) {
        margin: 0;
        background: #f1f5f9;
        color: #0f172a;
        font-family: ui-sans-serif, system-ui, sans-serif;
    }
    main {
        box-sizing: border-box;
        width: min(72rem, 100%);
        margin: 0 auto;
        padding: 2rem 1rem 4rem;
    }
    nav {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 2rem;
    }
    nav a {
        color: #0369a1;
        font-weight: 900;
    }
    .eyebrow,
    .number {
        margin: 0;
        color: #0369a1;
        font-weight: 950;
        letter-spacing: 0.1em;
    }
    h1 {
        max-width: 16ch;
        margin: 0.5rem 0;
        font-size: clamp(2.5rem, 7vw, 5rem);
        line-height: 0.95;
    }
    .intro {
        max-width: 52rem;
        font-size: 1.15rem;
        line-height: 1.5;
    }
    .overall-banner,
    .diagnostic-card,
    .capability-preview {
        border: 0.25rem solid;
        border-radius: 0.75rem;
        box-shadow: 0.35rem 0.35rem 0 #0f172a;
    }
    .overall-banner {
        margin-top: 1.5rem;
        padding: 1rem;
        font-size: 1.5rem;
        font-weight: 950;
    }
    .overall-banner[data-status='running'],
    .diagnostic-card[data-status='running'] {
        border-color: #1d4ed8;
        background: #dbeafe;
        color: #1e3a8a;
    }
    .overall-banner[data-status='pass'],
    .diagnostic-card[data-status='pass'] {
        border-color: #15803d;
        background: #dcfce7;
        color: #14532d;
    }
    .overall-banner[data-status='fail'],
    .diagnostic-card[data-status='fail'] {
        border-color: #b91c1c;
        background: #fee2e2;
        color: #7f1d1d;
    }
    button {
        margin: 1rem 0 1.5rem;
        border: 0;
        border-radius: 0.5rem;
        padding: 0.8rem 1.2rem;
        background: #0f172a;
        color: white;
        font: inherit;
        font-weight: 900;
        cursor: pointer;
    }
    button:disabled {
        cursor: wait;
        opacity: 0.55;
    }
    .diagnostic-card,
    .capability-preview {
        margin-bottom: 1.5rem;
        padding: 1.25rem;
    }
    .capability-preview {
        border-color: #0369a1;
        background: #e0f2fe;
        color: #0c4a6e;
    }
    header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
    }
    header h2 {
        margin: 0.25rem 0 0;
    }
    dl {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
        gap: 0.75rem;
    }
    dl div,
    pre {
        border: 2px solid currentColor;
        border-radius: 0.4rem;
        padding: 0.75rem;
        background: rgb(255 255 255 / 65%);
    }
    dt {
        font-weight: 900;
    }
    dd {
        margin: 0.25rem 0 0;
    }
    ol {
        margin: 0;
        padding-left: 1.25rem;
    }
    pre {
        overflow-x: auto;
        white-space: pre-wrap;
    }
    .legend {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.5rem;
        margin: 1rem 0;
        font-weight: 800;
    }
    .legend-swatch {
        width: 1.5rem;
        height: 1.5rem;
        border: 2px solid #0f172a;
        margin-left: 0.75rem;
    }
    .legend-swatch:first-child {
        margin-left: 0;
    }
    .preview-grid {
        display: grid;
        grid-template-columns: repeat(20, minmax(1.5rem, 1fr));
        gap: 0.25rem;
        border: 3px solid #0369a1;
        border-radius: 0.5rem;
        padding: 1rem;
        background: white;
    }
    .preview-grid > span {
        display: grid;
        min-height: 2.25rem;
        place-items: center;
        border: 2px solid #0f172a;
        border-radius: 0.25rem;
        color: #0f172a;
        font:
            900 1rem ui-monospace,
            monospace;
    }
    .expected {
        background: #38bdf8;
    }
    .unchanged {
        background: #f8fafc;
    }
    .preview-note {
        margin-bottom: 0;
        font-weight: 800;
    }
    @media (max-width: 42rem) {
        .preview-grid {
            grid-template-columns: repeat(10, minmax(1.5rem, 1fr));
        }
    }
</style>

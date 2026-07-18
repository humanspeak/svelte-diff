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
    const CEILING_MS = 10
    const RUNNING_STATE_HOLD_MS = 250
    const diffs: [number, string][] = Array.from({ length: SEGMENT_COUNT }, () => [0, 'x'])
    const captureRanges: CaptureRange[] = Array.from({ length: RANGE_COUNT }, (_, index) => ({
        name: `range_${index}`,
        start: index * 2,
        end: index * 2 + 1
    }))
    const demoText =
        'Invoice ACME-1042 is due July 31, 2026 for $12,450.00. Contact billing@northstar.example.'
    const demoCaptures = [
        { name: 'invoice_id', value: 'ACME-1042' },
        { name: 'due_date', value: 'July 31, 2026' },
        { name: 'amount', value: '$12,450.00' },
        { name: 'contact_email', value: 'billing@northstar.example' }
    ].map(({ name, value }) => {
        const start = demoText.indexOf(value)
        return { name, value, start, end: start + value.length }
    })
    const demoOutput = tagExpectedRegions(
        [[0, demoText]],
        demoCaptures.map(({ name, start, end }) => ({ name, start, end }))
    )

    let activeRunId = 0
    let diagnostic = $state<DiagnosticResult>({
        status: 'running',
        samples: [],
        maximum: 0,
        output: [],
        failureReasons: []
    })
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
        while the example below shows what expected-region tagging means in a real document.
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
                <p class="number">EYEBALL TEST</p>
                <h2>What the tagging actually does</h2>
            </div>
            <strong>4 NAMED CAPTURES</strong>
        </header>
        <p>
            The algorithm receives ordinary diff text plus sorted character ranges. It splits the
            text at each boundary and labels the matching values without changing the document.
        </p>
        <div class="comparison">
            <section class="document-panel" aria-labelledby="input-heading">
                <p class="panel-label" id="input-heading">BEFORE — PLAIN DIFF TEXT</p>
                <div class="document" data-testid="tagging-demo-input">{demoText}</div>
            </section>

            <div class="direction" aria-hidden="true">↓</div>

            <section class="document-panel output-panel" aria-labelledby="output-heading">
                <p class="panel-label" id="output-heading">AFTER — TAGGED DISPLAY SEGMENTS</p>
                <div class="document tagged-document" data-testid="tagging-demo-output">
                    {#each demoOutput as segment, index (index)}
                        {#if segment.expected}
                            <span
                                class="tagged-segment"
                                data-expected={segment.expected}
                                title={`${segment.expected}: ${segment.text}`}
                            >
                                <span>{segment.text}</span>
                            </span>
                        {:else}
                            <span>{segment.text}</span>
                        {/if}
                    {/each}
                </div>
            </section>
        </div>

        <h3>Exact capture boundaries</h3>
        <div class="capture-table-wrapper">
            <table data-testid="tagging-demo-captures">
                <thead>
                    <tr><th>Capture name</th><th>Matched value</th><th>Start</th><th>End</th></tr>
                </thead>
                <tbody>
                    {#each demoCaptures as capture (capture.name)}
                        <tr data-capture={capture.name}>
                            <th>{capture.name}</th>
                            <td>{capture.value}</td>
                            <td>{capture.start}</td>
                            <td>{capture.end}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
        <p class="preview-note">
            The benchmark above runs the same tagging function at 10,000 segments and 5,000 ranges;
            this smaller document exists so a human can verify the behavior at a glance.
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
    .comparison {
        margin: 1.25rem 0;
    }
    .document-panel {
        border: 3px solid #0369a1;
        border-radius: 0.5rem;
        background: white;
        overflow: hidden;
    }
    .panel-label {
        margin: 0;
        border-bottom: 3px solid #0369a1;
        padding: 0.65rem 1rem;
        background: #0c4a6e;
        color: white;
        font-size: 0.8rem;
        font-weight: 950;
        letter-spacing: 0.08em;
    }
    .document {
        padding: 1.5rem;
        color: #0f172a;
        font:
            700 clamp(1.05rem, 2.5vw, 1.45rem) / 2.7 ui-monospace,
            monospace;
    }
    .direction {
        color: #0369a1;
        font-size: 2.5rem;
        font-weight: 950;
        line-height: 1;
        text-align: center;
    }
    .output-panel {
        border-color: #15803d;
    }
    .output-panel .panel-label {
        border-color: #15803d;
        background: #14532d;
    }
    .tagged-segment {
        position: relative;
        display: inline-block;
        margin: 0.7rem 0.18rem 0;
        border: 2px solid #075985;
        border-radius: 0.35rem;
        padding: 0 0.25rem;
        background: #7dd3fc;
        box-shadow: 0.15rem 0.15rem 0 #075985;
    }
    .tagged-segment::before {
        content: attr(data-expected);
        position: absolute;
        bottom: calc(100% - 0.15rem);
        left: -2px;
        border-radius: 0.25rem 0.25rem 0 0;
        padding: 0.05rem 0.3rem;
        background: #075985;
        color: white;
        font:
            800 0.62rem/1.3 ui-sans-serif,
            system-ui,
            sans-serif;
        letter-spacing: 0.04em;
    }
    h3 {
        margin: 1.75rem 0 0.75rem;
    }
    .capture-table-wrapper {
        overflow-x: auto;
    }
    table {
        width: 100%;
        border-collapse: collapse;
        background: white;
        color: #0f172a;
    }
    th,
    td {
        border: 2px solid #0369a1;
        padding: 0.65rem;
        text-align: left;
    }
    thead th {
        background: #0c4a6e;
        color: white;
    }
    tbody th {
        color: #075985;
        font-family: ui-monospace, monospace;
    }
    .preview-note {
        margin-bottom: 0;
        font-weight: 800;
    }
</style>

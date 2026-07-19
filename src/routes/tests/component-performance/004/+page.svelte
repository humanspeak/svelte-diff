<script lang="ts">
    import SvelteDiff, { type SvelteDiffProps } from '$lib/index.js'
    import { onMount, tick } from 'svelte'

    type DiagnosticStatus = 'running' | 'pass' | 'fail'
    type ProcessingCallback = NonNullable<SvelteDiffProps['onProcessing']>

    interface TimingSample {
        update: number
        elapsed: number
    }

    interface ProbeResult {
        elapsed: number
        spanCount: number
        breakCount: number
        textLength: number
        failureReasons: string[]
    }

    interface DiagnosticResult {
        status: DiagnosticStatus
        samples: TimingSample[]
        maximum: number
        spanCount: number
        breakCount: number
        textLength: number
        failureReasons: string[]
    }

    interface PendingProcessing {
        expectedText: string
        resolve: () => void
    }

    const LINE_COUNT = 2000
    const SAMPLE_COUNT = 5
    const CEILING_MS = 25
    const PROCESSING_TIMEOUT_MS = 5000
    const RUNNING_STATE_HOLD_MS = 250
    const PREVIEW_TEXT = [
        'First unchanged line',
        'Second unchanged line',
        'Third unchanged line'
    ].join('\n')
    const createDocument = (revision: number) =>
        Array.from(
            { length: LINE_COUNT },
            () => `Default compact revision ${revision}: unchanged content`
        ).join('\n')

    let revision = 0
    let activeRunId = 0
    let pendingProcessing: PendingProcessing | null = null
    let probeWrapper: HTMLDivElement
    let legacyPreview: HTMLDivElement
    let defaultPreview: HTMLDivElement
    let activeText = $state(createDocument(revision))
    let legacyPreviewSpans = $state(3)
    let defaultPreviewSpans = $state(0)
    let diagnostic = $state<DiagnosticResult>({
        status: 'running',
        samples: [],
        maximum: 0,
        spanCount: 0,
        breakCount: 0,
        textLength: 0,
        failureReasons: []
    })
    const diagnosticText = $derived(
        [
            `Workload: ${LINE_COUNT} identical lines rendered with the compact default`,
            `Samples: ${diagnostic.samples.map((sample) => `${sample.elapsed.toFixed(2)} ms`).join(', ') || 'Not measured'}`,
            `Ceiling: ${CEILING_MS.toFixed(2)} ms per settled render`,
            `Observed maximum: ${diagnostic.maximum.toFixed(2)} ms`,
            `Equal spans: ${diagnostic.spanCount}`,
            `Line breaks: ${diagnostic.breakCount}`,
            `Text length: ${diagnostic.textLength}`,
            `Failure reasons: ${diagnostic.failureReasons.join('; ') || 'None'}`
        ].join('\n')
    )

    /** Resolves only the processing callback produced for the pending document. */
    const handleProcessing: ProcessingCallback = (_timing, diffs) => {
        if (!pendingProcessing) return
        const renderedText = diffs.map(([, text]) => text).join('')
        if (renderedText !== pendingProcessing.expectedText) return

        const { resolve } = pendingProcessing
        pendingProcessing = null
        resolve()
    }

    /** Paints the running state before the mounted workload changes. */
    const waitForPaint = async (): Promise<void> => {
        await tick()
        await new Promise<void>((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        })
        await new Promise<void>((resolve) => setTimeout(resolve, RUNNING_STATE_HOLD_MS))
    }

    /** Reconstructs rendered text by treating each configured line break as a newline. */
    const reconstructText = (wrapper: HTMLDivElement): string => {
        const clone = wrapper.cloneNode(true) as HTMLDivElement
        clone.querySelectorAll('br').forEach((lineBreak) => lineBreak.replaceWith('\n'))
        return clone.textContent ?? ''
    }

    /** Validates all DOM invariants for one fully settled compact render. */
    const validateProbe = (expectedText: string, update: string): Omit<ProbeResult, 'elapsed'> => {
        const spanCount = probeWrapper.querySelectorAll('span').length
        const breakCount = probeWrapper.querySelectorAll('br').length
        const actualText = reconstructText(probeWrapper)
        const failureReasons: string[] = []

        if (spanCount !== 0) {
            failureReasons.push(`${update}: expected 0 equal spans, received ${spanCount}`)
        }
        if (breakCount !== LINE_COUNT - 1) {
            failureReasons.push(
                `${update}: expected ${LINE_COUNT - 1} line breaks, received ${breakCount}`
            )
        }
        if (actualText !== expectedText) {
            failureReasons.push(
                `${update}: rendered text mismatch (${actualText.length}/${expectedText.length} characters)`
            )
        }
        if (
            probeWrapper.querySelector(
                'span[title], span[style*="background-color: red"], span[style*="background-color: green"]'
            )
        ) {
            failureReasons.push(`${update}: found insert, remove, or expected markup`)
        }

        return {
            spanCount,
            breakCount,
            textLength: actualText.length,
            failureReasons
        }
    }

    /** Changes both source texts, waits for their matching result and DOM flush, then measures. */
    const settleTextUpdate = async (nextText: string, update: string): Promise<ProbeResult> => {
        const start = performance.now()
        const processing = new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                if (pendingProcessing?.expectedText === nextText) pendingProcessing = null
                reject(new Error(`${update}: matching processing result did not arrive`))
            }, PROCESSING_TIMEOUT_MS)
            pendingProcessing = {
                expectedText: nextText,
                resolve: () => {
                    clearTimeout(timeout)
                    resolve()
                }
            }
        })

        activeText = nextText
        await processing
        await tick()
        const elapsed = performance.now() - start
        return { elapsed, ...validateProbe(nextText, update) }
    }

    /** Runs one warmup followed by five measured, fully validated compact renders. */
    const runDiagnostic = async (): Promise<void> => {
        const runId = ++activeRunId
        diagnostic = {
            status: 'running',
            samples: [],
            maximum: 0,
            spanCount: 0,
            breakCount: 0,
            textLength: 0,
            failureReasons: []
        }

        try {
            await waitForPaint()
            if (runId !== activeRunId) return

            const warmupText = createDocument(++revision)
            const warmup = await settleTextUpdate(warmupText, 'Warmup')
            if (runId !== activeRunId) return

            const failureReasons = [...warmup.failureReasons]
            const samples: TimingSample[] = []
            let latestProbe = warmup
            for (let update = 1; update <= SAMPLE_COUNT; update++) {
                latestProbe = await settleTextUpdate(
                    createDocument(++revision),
                    `Measured update ${update}`
                )
                if (runId !== activeRunId) return
                samples.push({ update, elapsed: latestProbe.elapsed })
                failureReasons.push(...latestProbe.failureReasons)
                if (latestProbe.elapsed > CEILING_MS) {
                    failureReasons.push(
                        `Measured update ${update}: ${latestProbe.elapsed.toFixed(2)} ms exceeded ${CEILING_MS.toFixed(2)} ms`
                    )
                }
            }

            const maximum = Math.max(...samples.map((sample) => sample.elapsed))
            diagnostic = {
                status: failureReasons.length === 0 ? 'pass' : 'fail',
                samples,
                maximum,
                spanCount: latestProbe.spanCount,
                breakCount: latestProbe.breakCount,
                textLength: latestProbe.textLength,
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
        void (async () => {
            await tick()
            legacyPreviewSpans = legacyPreview.querySelectorAll('span').length
            defaultPreviewSpans = defaultPreview.querySelectorAll('span').length
        })()
        void runDiagnostic()
        return () => {
            activeRunId++
            pendingProcessing = null
        }
    })
</script>

<svelte:head>
    <title>004 — Compact equal-text rendering</title>
</svelte:head>

<main>
    <nav>
        <a href="/tests/component-performance">← All diagnostics</a>
        <a href="/tests/component-performance/003">← Previous: 003</a>
    </nav>
    <p class="eyebrow">DIAGNOSTIC 004</p>
    <h1>Render unstyled equal text without wrappers by default</h1>
    <p class="intro">
        This page updates one real 2,000-line diff five times using the default compact behavior.
        Every settled render must preserve the complete document and all line breaks while creating
        zero equal spans.
    </p>

    <div
        class="overall-banner"
        data-status={diagnostic.status}
        data-testid="diagnostic-overall"
        role="status"
        aria-live="polite"
        aria-atomic="true"
    >
        004: {diagnostic.status.toUpperCase()}
    </div>
    <button type="button" onclick={runDiagnostic} disabled={diagnostic.status === 'running'}>
        Run diagnostic 004
    </button>

    <section
        class="diagnostic-card"
        data-testid="diagnostic-004"
        data-status={diagnostic.status}
        data-ceiling-ms={CEILING_MS}
        data-elapsed-ms={diagnostic.maximum}
        data-samples-ms={diagnostic.samples.map((sample) => sample.elapsed).join(',')}
        data-line-count={LINE_COUNT}
        data-span-count={diagnostic.spanCount}
        data-break-count={diagnostic.breakCount}
        data-text-length={diagnostic.textLength}
        data-failure-reasons={diagnostic.failureReasons.join('; ')}
    >
        <header>
            <div>
                <p class="number">004</p>
                <h2>Measured result</h2>
            </div>
            <strong>{diagnostic.status.toUpperCase()}</strong>
        </header>
        <dl>
            <div>
                <dt>Workload</dt>
                <dd>{LINE_COUNT} identical lines using the compact default</dd>
            </div>
            <div>
                <dt>Samples</dt>
                <dd>
                    <ol data-testid="diagnostic-004-samples">
                        {#each diagnostic.samples as sample (sample.update)}
                            <li>Settled render {sample.update}: {sample.elapsed.toFixed(2)} ms</li>
                        {:else}
                            <li>Measurements are running…</li>
                        {/each}
                    </ol>
                </dd>
            </div>
            <div>
                <dt>Ceiling</dt>
                <dd>{CEILING_MS.toFixed(2)} ms per settled render</dd>
            </div>
            <div>
                <dt>Observed maximum</dt>
                <dd>{diagnostic.maximum.toFixed(2)} ms</dd>
            </div>
            <div>
                <dt>DOM counts</dt>
                <dd data-testid="compact-dom-counts">
                    spans: {diagnostic.spanCount}, breaks: {diagnostic.breakCount}
                </dd>
            </div>
            <div>
                <dt>Complete text</dt>
                <dd>{diagnostic.textLength} characters</dd>
            </div>
            <div>
                <dt>Failure reasons</dt>
                <dd>{diagnostic.failureReasons.join('; ') || 'None'}</dd>
            </div>
        </dl>
        <pre>{diagnosticText}</pre>
    </section>

    <section class="capability-preview" data-testid="compact-capability-preview">
        <header>
            <div>
                <p class="number">EYEBALL TEST</p>
                <h2>What compact rendering actually removes</h2>
            </div>
            <strong>THE TEXT IS IDENTICAL</strong>
        </header>
        <p>
            Both panels are live SvelteDiff output for the same three unchanged lines. The new
            default keeps the text and breaks but removes the otherwise-unneeded equal wrappers;
            <code>compact=false</code> restores the legacy DOM.
        </p>
        <div class="preview-comparison">
            <section>
                <p class="preview-label">LEGACY OPT-OUT</p>
                <strong>compact=false: {legacyPreviewSpans} equal spans</strong>
                <div class="preview-output" bind:this={legacyPreview}>
                    <SvelteDiff
                        originalText={PREVIEW_TEXT}
                        modifiedText={PREVIEW_TEXT}
                        compact={false}
                    />
                </div>
            </section>
            <div class="arrow" aria-hidden="true">→</div>
            <section class="default-panel">
                <p class="preview-label">NEW DEFAULT</p>
                <strong>Default compact mode: {defaultPreviewSpans} equal spans</strong>
                <div class="preview-output" bind:this={defaultPreview}>
                    <SvelteDiff originalText={PREVIEW_TEXT} modifiedText={PREVIEW_TEXT} />
                </div>
            </section>
        </div>
        <p class="preview-note">
            The measured probe scales the new default to 2,000 lines: spans: 0, breaks: 1999,
            complete text preserved.
        </p>
    </section>

    <details data-testid="mounted-compact-probe">
        <summary>Inspect the mounted 2,000-line compact output</summary>
        <p>
            The full workload stays mounted in this collapsed panel. Open it to inspect the exact
            text and line breaks used by the measurements.
        </p>
        <div class="probe-output" bind:this={probeWrapper}>
            <SvelteDiff
                originalText={activeText}
                modifiedText={activeText}
                onProcessing={handleProcessing}
            />
        </div>
    </details>
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
        width: min(76rem, 100%);
        margin: 0 auto;
        padding: 2rem 1rem 4rem;
    }
    nav,
    header,
    .preview-comparison {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
    }
    nav a {
        color: #6d28d9;
        font-weight: 800;
    }
    .eyebrow,
    .number,
    .preview-label {
        margin: 0;
        color: #6d28d9;
        font-weight: 950;
        letter-spacing: 0.12em;
    }
    h1 {
        max-width: 17ch;
        margin: 0.5rem 0;
        font-size: clamp(2.5rem, 7vw, 5rem);
        line-height: 0.95;
    }
    h2 {
        margin: 0.25rem 0 0;
    }
    .intro {
        max-width: 56rem;
        font-size: 1.15rem;
        line-height: 1.5;
    }
    .overall-banner,
    .diagnostic-card,
    .capability-preview,
    details {
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
    .capability-preview,
    details {
        margin-bottom: 1.5rem;
        padding: 1.25rem;
    }
    .capability-preview {
        border-color: #6d28d9;
        background: #ede9fe;
        color: #4c1d95;
    }
    dl {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
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
        margin: 0.3rem 0 0;
    }
    ol {
        margin: 0;
        padding-left: 1.2rem;
    }
    pre {
        overflow: auto;
        white-space: pre-wrap;
    }
    .preview-comparison {
        align-items: stretch;
        margin-top: 1rem;
    }
    .preview-comparison section {
        flex: 1;
        border: 3px solid #0f172a;
        border-radius: 0.6rem;
        padding: 1rem;
        background: white;
        color: #0f172a;
    }
    .preview-comparison .default-panel {
        border-color: #15803d;
        background: #f0fdf4;
    }
    .preview-output {
        margin-top: 0.75rem;
        border: 2px dashed currentColor;
        padding: 0.75rem;
        font-family: ui-monospace, monospace;
        line-height: 1.7;
    }
    .arrow {
        align-self: center;
        font-size: 2.5rem;
        font-weight: 950;
    }
    .preview-note {
        margin-bottom: 0;
        font-weight: 800;
    }
    details {
        border-color: #334155;
        background: white;
    }
    summary {
        cursor: pointer;
        font-weight: 900;
    }
    .probe-output {
        margin-top: 1rem;
        font-family: ui-monospace, monospace;
    }
    @media (max-width: 45rem) {
        nav,
        header,
        .preview-comparison {
            align-items: stretch;
            flex-direction: column;
        }
        .arrow {
            transform: rotate(90deg);
        }
    }
</style>

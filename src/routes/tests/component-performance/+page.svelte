<script lang="ts">
    import SvelteDiff, { type SvelteDiffProps } from '$lib/index.js'
    import { onMount, tick } from 'svelte'

    type DiagnosticStatus = 'running' | 'pass' | 'fail'

    interface TimingSample {
        change: number
        elapsed: number
    }

    interface DiagnosticResult {
        status: DiagnosticStatus
        samples: TimingSample[]
        maximum: number
        failureReasons: string[]
    }

    interface CurrentRunDetails {
        context: string
        change: string
        boundaryCaptures: string
        boundaryRendered: string
    }

    interface PendingProcessingRequest {
        id: number
        expectedFirst: string
        expectedLast: string
        resolve: (_captures: Record<string, string> | undefined) => void
        timeout?: ReturnType<typeof setTimeout>
    }

    interface ChangeResult {
        elapsed: number
        failureReasons: string[]
    }

    const LINE_COUNT = 750
    const SAMPLE_COUNT = 5
    const CEILING_MS = 250
    const RUNNING_STATE_HOLD_MS = 250
    const originalText = Array.from(
        { length: LINE_COUNT },
        (_, line) => `Line ${line}: (?<value_${line}>\\d+)`
    ).join('\n')

    const createModifiedText = (change: number) =>
        Array.from(
            { length: LINE_COUNT },
            (_, line) => `Line ${line}: ${change * 1000 + line}`
        ).join('\n')

    let modifiedText = $state(createModifiedText(0))
    let diagnosticOutput: HTMLDivElement
    let pendingProcessing: PendingProcessingRequest | undefined
    let nextProcessingRequestId = 0
    let activeRunId = 0
    let overallStatus = $state<DiagnosticStatus>('running')
    let diagnostic001 = $state<DiagnosticResult>({
        status: 'running',
        samples: [],
        maximum: 0,
        failureReasons: []
    })
    let currentRun = $state<CurrentRunDetails>({
        context: 'Waiting for the automatic run',
        change: 'Not started',
        boundaryCaptures: 'Not measured',
        boundaryRendered: 'Not measured'
    })

    const diagnosticText = $derived(
        [
            `Workload: ${LINE_COUNT} template lines, one named group per line`,
            `Samples: ${diagnostic001.samples.map((sample) => `${sample.elapsed.toFixed(2)} ms`).join(', ') || 'Not measured'}`,
            `Ceiling: ${CEILING_MS.toFixed(2)} ms per change`,
            `Observed maximum: ${diagnostic001.maximum.toFixed(2)} ms`,
            `Failure reasons: ${diagnostic001.failureReasons.join('; ') || 'None'}`
        ].join('\n')
    )

    /**
     * Resolves the pending request only when the emitted boundary captures identify it.
     *
     * @param _timing - Timing information emitted by the mounted SvelteDiff component.
     * @param _diffs - Diff tuples emitted by the mounted SvelteDiff component.
     * @param captures - Named captures used to correlate this callback with its request.
     * @returns Nothing; matching captures settle the pending processing promise.
     */
    const handleProcessing: NonNullable<SvelteDiffProps['onProcessing']> = (
        _timing,
        _diffs,
        captures
    ) => {
        const request = pendingProcessing
        if (
            !request ||
            captures?.value_0 !== request.expectedFirst ||
            captures[`value_${LINE_COUNT - 1}`] !== request.expectedLast
        )
            return

        clearTimeout(request.timeout)
        pendingProcessing = undefined
        request.resolve(captures)
    }

    /**
     * Clears and settles the currently pending component callback request, if any.
     *
     * @returns Nothing; a pending promise is resolved with `undefined` to signal cancellation.
     */
    const cancelPendingProcessing = () => {
        const request = pendingProcessing
        if (!request) return

        clearTimeout(request.timeout)
        pendingProcessing = undefined
        request.resolve(undefined)
    }

    /**
     * Paints the diagnostic's running state and holds it long enough to remain visible.
     *
     * @returns A promise that resolves after two animation frames and the visible-state hold.
     */
    const waitForPaint = async () => {
        await tick()
        await new Promise<void>((resolve) => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => resolve())
            })
        })
        await new Promise<void>((resolve) => {
            setTimeout(resolve, RUNNING_STATE_HOLD_MS)
        })
    }

    /**
     * Applies one modified-text sample and validates its callback and rendered boundaries.
     *
     * @param change - Unique numeric input used to generate this sample's expected captures.
     * @param context - Human-readable label displayed while the sample is running.
     * @param runId - Identity of the diagnostic run that owns this sample.
     * @returns Timing and failures, or `null` when navigation or a newer run cancels the sample.
     */
    const runChange = async (
        change: number,
        context: string,
        runId: number
    ): Promise<ChangeResult | null> => {
        currentRun = {
            context,
            change: `Applying modified-text change ${change}`,
            boundaryCaptures: 'Waiting for onProcessing captures',
            boundaryRendered: 'Waiting for the component render'
        }
        await tick()
        if (runId !== activeRunId) return null

        const requestId = ++nextProcessingRequestId
        const expectedText = createModifiedText(requestId)
        const expectedFirst = String(requestId * 1000)
        const expectedLast = String(requestId * 1000 + LINE_COUNT - 1)

        const processing = new Promise<Record<string, string> | undefined>((resolve) => {
            const request: PendingProcessingRequest = {
                id: requestId,
                expectedFirst,
                expectedLast,
                resolve
            }
            request.timeout = setTimeout(() => {
                if (pendingProcessing?.id !== request.id) return
                pendingProcessing = undefined
                resolve(undefined)
            }, 1000)
            pendingProcessing = request
        })

        const start = performance.now()
        modifiedText = expectedText
        const captures = await processing
        if (runId !== activeRunId) return null
        await tick()
        if (runId !== activeRunId) return null
        const elapsed = performance.now() - start
        const failureReasons: string[] = []

        if (!captures) {
            failureReasons.push(`Change ${change}: onProcessing did not return captures`)
        } else {
            const captureNames = Object.keys(captures)
            if (captureNames.length !== LINE_COUNT) {
                failureReasons.push(
                    `Change ${change}: expected ${LINE_COUNT} captures, received ${captureNames.length}`
                )
            }

            for (let line = 0; line < LINE_COUNT; line++) {
                const expectedValue = String(requestId * 1000 + line)
                if (captures[`value_${line}`] !== expectedValue) {
                    failureReasons.push(
                        `Change ${change}: value_${line} was ${captures[`value_${line}`] ?? 'missing'}, expected ${expectedValue}`
                    )
                    break
                }
            }
        }

        const firstOutput = diagnosticOutput.querySelector('[title="value_0"]')?.textContent
        const lastOutput = diagnosticOutput.querySelector(
            `[title="value_${LINE_COUNT - 1}"]`
        )?.textContent
        const firstCapture = captures?.value_0
        const lastCapture = captures?.[`value_${LINE_COUNT - 1}`]
        currentRun = {
            context: `${context} complete`,
            change: `Modified-text change ${change} / request ${requestId}`,
            boundaryCaptures: `value_0=${firstCapture ?? 'missing'}, value_${LINE_COUNT - 1}=${lastCapture ?? 'missing'}`,
            boundaryRendered: `value_0=${firstOutput ?? 'missing'}, value_${LINE_COUNT - 1}=${lastOutput ?? 'missing'}`
        }
        if (firstOutput !== expectedFirst || lastOutput !== expectedLast) {
            failureReasons.push(
                `Change ${change}: rendered boundary outputs were ${firstOutput ?? 'missing'} and ${lastOutput ?? 'missing'}`
            )
        }

        return { elapsed, failureReasons }
    }

    /**
     * Runs the warmup and all measured samples for diagnostic 001.
     *
     * Expected failures are rendered in the diagnostic card; unexpected errors are caught and
     * converted to a visible failure instead of escaping the event handler.
     *
     * @returns A promise that resolves after the active run completes or is cancelled.
     */
    const runAllDiagnostics = async () => {
        cancelPendingProcessing()
        const runId = ++activeRunId
        overallStatus = 'running'
        diagnostic001 = {
            status: 'running',
            samples: [],
            maximum: 0,
            failureReasons: []
        }
        currentRun = {
            context: 'Painting the RUNNING state before measurements',
            change: 'Warmup is next',
            boundaryCaptures: 'Waiting for this run',
            boundaryRendered: 'Waiting for this run'
        }

        try {
            await waitForPaint()
            if (runId !== activeRunId) return

            const warmup = await runChange(100, 'Warmup', runId)
            if (!warmup) return
            const failureReasons = warmup.failureReasons.map((reason) => `Warmup: ${reason}`)
            const samples: TimingSample[] = []

            for (let change = 1; change <= SAMPLE_COUNT; change++) {
                const sample = await runChange(
                    100 + change,
                    `Measured sample ${change} of ${SAMPLE_COUNT}`,
                    runId
                )
                if (!sample) return
                samples.push({ change, elapsed: sample.elapsed })
                failureReasons.push(...sample.failureReasons)
            }

            const maximum = Math.max(...samples.map(({ elapsed }) => elapsed))
            if (maximum > CEILING_MS) {
                failureReasons.push(
                    `Maximum ${maximum.toFixed(2)} ms exceeded the ${CEILING_MS.toFixed(2)} ms ceiling`
                )
            }

            const status = failureReasons.length === 0 ? 'pass' : 'fail'
            diagnostic001 = { status, samples, maximum, failureReasons }
            overallStatus = status
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            diagnostic001 = {
                ...diagnostic001,
                status: 'fail',
                failureReasons: [`Unexpected diagnostic error: ${message}`]
            }
            overallStatus = 'fail'
        }
    }

    onMount(() => {
        void runAllDiagnostics()

        return () => {
            cancelPendingProcessing()
            activeRunId++
        }
    })
</script>

<svelte:head>
    <title>Component performance diagnostics</title>
</svelte:head>

<main>
    <h1>Component performance diagnostics</h1>

    <div
        class="overall-banner"
        data-status={overallStatus}
        data-testid="diagnostic-overall"
        role="status"
        aria-live="polite"
        aria-atomic="true"
    >
        Overall: {overallStatus.toUpperCase()}
    </div>

    <button type="button" onclick={runAllDiagnostics} disabled={overallStatus === 'running'}>
        Run all diagnostics
    </button>

    <section
        class="diagnostic-card"
        data-testid="diagnostic-001"
        data-status={diagnostic001.status}
        data-ceiling-ms={CEILING_MS}
        data-elapsed-ms={diagnostic001.maximum}
    >
        <header>
            <div>
                <p class="diagnostic-number">001</p>
                <h2>Compile expected-pattern metadata once</h2>
            </div>
            <strong class="status">{diagnostic001.status.toUpperCase()}</strong>
        </header>

        <dl>
            <div>
                <dt>Workload</dt>
                <dd>{LINE_COUNT} lines / {LINE_COUNT} named groups</dd>
            </div>
            <div>
                <dt>Sample values</dt>
                <dd>
                    <ol data-testid="diagnostic-001-samples">
                        {#each diagnostic001.samples as sample (sample.change)}
                            <li>Change {sample.change}: {sample.elapsed.toFixed(2)} ms</li>
                        {:else}
                            <li>Measurements are running…</li>
                        {/each}
                    </ol>
                </dd>
            </div>
            <div>
                <dt>Ceiling</dt>
                <dd>{CEILING_MS.toFixed(2)} ms per change</dd>
            </div>
            <div>
                <dt>Observed maximum</dt>
                <dd>{diagnostic001.maximum.toFixed(2)} ms</dd>
            </div>
            <div>
                <dt>Failure reasons</dt>
                <dd>{diagnostic001.failureReasons.join('; ') || 'None'}</dd>
            </div>
        </dl>

        <pre>{diagnosticText}</pre>
    </section>

    <section class="capability-preview" data-testid="live-capability-preview">
        <header>
            <div>
                <p class="diagnostic-number">LIVE</p>
                <h2>Live capability preview</h2>
            </div>
            <strong class="status">ACTUAL COMPONENT</strong>
        </header>
        <p>
            This is the full mounted <code>SvelteDiff</code> workload used by diagnostic 001. Its original
            template stays fixed at 750 named groups while modified text changes for the warmup and five
            samples. Blue highlights are the expected captures produced by the live component.
        </p>
        <dl class="current-run-details">
            <div>
                <dt>Current change / sample</dt>
                <dd data-testid="current-run-context">{currentRun.context}</dd>
            </div>
            <div>
                <dt>Change</dt>
                <dd>{currentRun.change}</dd>
            </div>
            <div>
                <dt>Boundary captures</dt>
                <dd data-testid="boundary-captures">{currentRun.boundaryCaptures}</dd>
            </div>
            <div>
                <dt>Boundary rendered values</dt>
                <dd data-testid="boundary-rendered">{currentRun.boundaryRendered}</dd>
            </div>
        </dl>
        <div class="preview-scroll" data-testid="live-preview-scroll">
            <div
                class="live-component-output"
                data-testid="live-component-output"
                bind:this={diagnosticOutput}
            >
                <SvelteDiff {originalText} {modifiedText} onProcessing={handleProcessing} />
            </div>
        </div>
    </section>

    {#each ['002', '003', '004', '005'] as number (number)}
        <section class="diagnostic-card" data-testid={`diagnostic-${number}`} data-status="pending">
            <header>
                <div>
                    <p class="diagnostic-number">{number}</p>
                    <h2>Reserved component performance diagnostic</h2>
                </div>
                <strong class="status">PENDING</strong>
            </header>
            <p>This diagnostic will be activated by component performance Plan {number}.</p>
        </section>
    {/each}
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

    h1 {
        margin: 0 0 1rem;
        font-size: clamp(2.25rem, 6vw, 4.5rem);
        line-height: 1;
    }

    button {
        margin: 1rem 0 1.5rem;
        border: 0;
        border-radius: 0.5rem;
        padding: 0.8rem 1.2rem;
        background: #0f172a;
        color: white;
        font: inherit;
        font-weight: 800;
        cursor: pointer;
    }

    button:disabled {
        cursor: wait;
        opacity: 0.55;
    }

    .overall-banner,
    .diagnostic-card,
    .capability-preview {
        border: 0.25rem solid;
        border-radius: 0.75rem;
        box-shadow: 0.35rem 0.35rem 0 #0f172a;
    }

    .overall-banner {
        padding: 1rem;
        font-size: 1.5rem;
        font-weight: 900;
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

    .diagnostic-card[data-status='pending'] {
        border-color: #b45309;
        background: #fef3c7;
        color: #78350f;
    }

    .diagnostic-card {
        margin-bottom: 1.5rem;
        padding: 1.25rem;
    }

    .capability-preview {
        margin-bottom: 1.5rem;
        border-color: #0369a1;
        padding: 1.25rem;
        background: #e0f2fe;
        color: #0c4a6e;
    }

    header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
    }

    h2,
    .diagnostic-number {
        margin: 0;
    }

    .diagnostic-number,
    .status {
        font-size: 1.25rem;
        font-weight: 900;
        letter-spacing: 0.08em;
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

    .current-run-details {
        grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
    }

    .preview-scroll {
        box-sizing: border-box;
        width: 100%;
        height: 28rem;
        overflow: auto;
        border: 3px solid #0369a1;
        border-radius: 0.5rem;
        padding: 1rem;
        background: white;
        color: #0f172a;
    }

    .live-component-output {
        min-width: 36rem;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 0.875rem;
        line-height: 1.7;
    }

    .live-component-output :global(span[title^='value_']) {
        border-radius: 0.2rem;
        padding: 0 0.1rem;
    }
</style>

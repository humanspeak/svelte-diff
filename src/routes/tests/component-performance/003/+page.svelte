<script lang="ts">
    import SvelteDiff, { type SvelteDiffProps, type SvelteDiffTuple } from '$lib/index.js'
    import { onMount, tick } from 'svelte'

    type DiagnosticStatus = 'running' | 'pass' | 'fail'
    type ProcessingCallback = NonNullable<SvelteDiffProps['onProcessing']>

    interface TimingSample {
        swap: number
        elapsed: number
        identityMatches: boolean
    }

    interface DiagnosticResult {
        status: DiagnosticStatus
        samples: TimingSample[]
        maximum: number
        diffCount: number
        failureReasons: string[]
    }

    interface CallbackResult {
        elapsed: number
        diffs: SvelteDiffTuple[]
    }

    const LINE_COUNT = 3000
    const SAMPLE_COUNT = 5
    const CEILING_MS = 75
    const CALLBACK_TIMEOUT_MS = 2000
    const RUNNING_STATE_HOLD_MS = 250
    const createLine = (line: number, value: string) =>
        `Quarterly report line ${String(line).padStart(4, '0')}: ${value}`
    const originalText = Array.from({ length: LINE_COUNT }, (_, line) =>
        createLine(line, 'baseline revenue is $10,000')
    ).join('\n')
    const modifiedText = Array.from({ length: LINE_COUNT }, (_, line) =>
        createLine(
            line,
            line % 10 === 0 ? 'updated revenue is $12,500' : 'baseline revenue is $10,000'
        )
    ).join('\n')

    let retainedDiffs: SvelteDiffTuple[] | null = null
    let initialResultResolvers: Array<() => void> = []
    let activeRunId = 0
    let retainedDiffCount = $state(0)

    /** Retains the exact raw diff array produced by the initial computation. */
    const handleInitialProcessing: ProcessingCallback = (_timing, diffs) => {
        if (retainedDiffs) return
        retainedDiffs = diffs
        retainedDiffCount = diffs.length
        for (const resolve of initialResultResolvers) resolve()
        initialResultResolvers = []
    }

    let activeCallback = $state<ProcessingCallback>(handleInitialProcessing)
    let diagnostic = $state<DiagnosticResult>({
        status: 'running',
        samples: [],
        maximum: 0,
        diffCount: 0,
        failureReasons: []
    })
    const identityMatches = $derived(
        diagnostic.samples.filter((sample) => sample.identityMatches).length
    )
    const diagnosticText = $derived(
        [
            `Workload: ${LINE_COUNT} lines with changes on every tenth line`,
            `Samples: ${diagnostic.samples.map((sample) => `${sample.elapsed.toFixed(2)} ms`).join(', ') || 'Not measured'}`,
            `Ceiling: ${CEILING_MS.toFixed(2)} ms per callback-only swap`,
            `Observed maximum: ${diagnostic.maximum.toFixed(2)} ms`,
            `Callbacks received: ${diagnostic.samples.length}/${SAMPLE_COUNT}`,
            `Identity matches: ${identityMatches}/${SAMPLE_COUNT}`,
            `Raw diff segments: ${diagnostic.diffCount}`,
            `Failure reasons: ${diagnostic.failureReasons.join('; ') || 'None'}`
        ].join('\n')
    )

    /** Waits until the mounted component has produced its one retained result. */
    const waitForInitialResult = async (): Promise<void> => {
        if (retainedDiffs) return

        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                initialResultResolvers = initialResultResolvers.filter(
                    (candidate) => candidate !== complete
                )
                reject(new Error('Initial onProcessing callback did not arrive'))
            }, CALLBACK_TIMEOUT_MS)
            const complete = () => {
                clearTimeout(timeout)
                resolve()
            }
            initialResultResolvers.push(complete)
        })
    }

    /** Paints the RUNNING state before callback swaps begin. */
    const waitForPaint = async (): Promise<void> => {
        await tick()
        await new Promise<void>((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        })
        await new Promise<void>((resolve) => setTimeout(resolve, RUNNING_STATE_HOLD_MS))
    }

    /** Replaces only the callback prop and resolves with the observer's exact raw diff object. */
    const swapCallback = async (): Promise<CallbackResult> => {
        const start = performance.now()
        return new Promise<CallbackResult>((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Replacement onProcessing callback did not arrive'))
            }, CALLBACK_TIMEOUT_MS)
            activeCallback = (_timing, diffs) => {
                clearTimeout(timeout)
                resolve({ elapsed: performance.now() - start, diffs })
            }
        })
    }

    /** Runs one warm observer swap followed by five measured callback-only swaps. */
    const runDiagnostic = async (): Promise<void> => {
        const runId = ++activeRunId
        diagnostic = {
            status: 'running',
            samples: [],
            maximum: 0,
            diffCount: retainedDiffCount,
            failureReasons: []
        }

        try {
            await waitForPaint()
            if (runId !== activeRunId) return
            await waitForInitialResult()
            if (runId !== activeRunId || !retainedDiffs) return

            const failureReasons: string[] = []
            const warmup = await swapCallback()
            if (warmup.diffs !== retainedDiffs) {
                failureReasons.push('Warm callback received a newly allocated diff array')
            }

            const samples: TimingSample[] = []
            for (let swap = 1; swap <= SAMPLE_COUNT; swap++) {
                const result = await swapCallback()
                if (runId !== activeRunId) return
                samples.push({
                    swap,
                    elapsed: result.elapsed,
                    identityMatches: result.diffs === retainedDiffs
                })
            }

            const maximum = Math.max(...samples.map((sample) => sample.elapsed))
            const matches = samples.filter((sample) => sample.identityMatches).length
            if (samples.length !== SAMPLE_COUNT) {
                failureReasons.push(
                    `Expected ${SAMPLE_COUNT} measured callbacks, received ${samples.length}`
                )
            }
            if (matches !== SAMPLE_COUNT) {
                failureReasons.push(
                    `Only ${matches}/${SAMPLE_COUNT} callbacks received the retained diff array`
                )
            }
            for (const sample of samples) {
                if (sample.elapsed > CEILING_MS) {
                    failureReasons.push(
                        `Swap ${sample.swap} took ${sample.elapsed.toFixed(2)} ms, exceeding ${CEILING_MS.toFixed(2)} ms`
                    )
                }
            }

            diagnostic = {
                status: failureReasons.length === 0 ? 'pass' : 'fail',
                samples,
                maximum,
                diffCount: retainedDiffs.length,
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
            initialResultResolvers = []
        }
    })
</script>

<svelte:head>
    <title>003 — Decouple processing callbacks</title>
</svelte:head>

<main>
    <nav>
        <a href="/tests/component-performance">← All diagnostics</a>
        <a href="/tests/component-performance/002">← Previous: 002</a>
    </nav>
    <p class="eyebrow">DIAGNOSTIC 003</p>
    <h1>Decouple diff computation from callbacks</h1>
    <p class="intro">
        This page keeps one real 3,000-line diff mounted, then replaces only its processing
        observer. Every new observer must receive the exact same raw diff array without rerunning
        the algorithm.
    </p>

    <div
        class="overall-banner"
        data-status={diagnostic.status}
        data-testid="diagnostic-overall"
        role="status"
        aria-live="polite"
        aria-atomic="true"
    >
        003: {diagnostic.status.toUpperCase()}
    </div>
    <button type="button" onclick={runDiagnostic} disabled={diagnostic.status === 'running'}>
        Run diagnostic 003
    </button>

    <section
        class="diagnostic-card"
        data-testid="diagnostic-003"
        data-status={diagnostic.status}
        data-ceiling-ms={CEILING_MS}
        data-elapsed-ms={diagnostic.maximum}
        data-samples-ms={diagnostic.samples.map((sample) => sample.elapsed).join(',')}
        data-line-count={LINE_COUNT}
        data-diff-count={diagnostic.diffCount}
        data-callback-count={diagnostic.samples.length}
        data-identity-matches={identityMatches}
        data-failure-reasons={diagnostic.failureReasons.join('; ')}
    >
        <header>
            <div>
                <p class="number">003</p>
                <h2>Measured result</h2>
            </div>
            <strong>{diagnostic.status.toUpperCase()}</strong>
        </header>
        <dl>
            <div>
                <dt>Workload</dt>
                <dd>{LINE_COUNT} lines / changes every tenth line</dd>
            </div>
            <div>
                <dt>Samples</dt>
                <dd>
                    <ol data-testid="diagnostic-003-samples">
                        {#each diagnostic.samples as sample (sample.swap)}
                            <li>
                                Callback swap {sample.swap}: {sample.elapsed.toFixed(2)} ms — {sample.identityMatches
                                    ? 'same diff array'
                                    : 'new diff array'}
                            </li>
                        {:else}
                            <li>Measurements are running…</li>
                        {/each}
                    </ol>
                </dd>
            </div>
            <div>
                <dt>Ceiling</dt>
                <dd>{CEILING_MS.toFixed(2)} ms per callback-only swap</dd>
            </div>
            <div>
                <dt>Observed maximum</dt>
                <dd>{diagnostic.maximum.toFixed(2)} ms</dd>
            </div>
            <div>
                <dt>Callbacks received</dt>
                <dd>{diagnostic.samples.length}/{SAMPLE_COUNT}</dd>
            </div>
            <div>
                <dt>Identity results</dt>
                <dd data-testid="callback-identity-summary">
                    Identity matches: {identityMatches}/{SAMPLE_COUNT}
                </dd>
            </div>
            <div>
                <dt>Raw diff segments</dt>
                <dd>{diagnostic.diffCount}</dd>
            </div>
            <div>
                <dt>Failure reasons</dt>
                <dd>{diagnostic.failureReasons.join('; ') || 'None'}</dd>
            </div>
        </dl>
        <pre>{diagnosticText}</pre>
    </section>

    <section class="capability-preview" data-testid="callback-capability-preview">
        <header>
            <div>
                <p class="number">EYEBALL TEST</p>
                <h2>What callback swapping actually does</h2>
            </div>
            <strong>ONE COMPUTATION</strong>
        </header>
        <p>
            The document and every algorithm setting stay fixed. Five replacement observers receive
            the already-computed result, proving callback changes do not allocate another diff.
        </p>
        <div class="document-change">
            <div>
                <span>ORIGINAL LINE 0000</span>
                <strong>Quarterly report line 0000: baseline revenue is $10,000</strong>
            </div>
            <div class="arrow" aria-hidden="true">→</div>
            <div>
                <span>MODIFIED LINE 0000</span>
                <strong>Quarterly report line 0000: updated revenue is $12,500</strong>
            </div>
        </div>
        <div class="retained-result">
            <span>RETAINED RAW DIFF OBJECT</span>
            <strong>{retainedDiffCount} segments, computed once</strong>
        </div>
        <div class="observer-flow" aria-label="Callback identity results">
            {#each Array(SAMPLE_COUNT) as _, index (index)}
                {@const sample = diagnostic.samples[index]}
                <div data-identity-result={sample?.identityMatches ?? false}>
                    <span>OBSERVER {index + 1}</span>
                    <strong>
                        {sample
                            ? sample.identityMatches
                                ? 'SAME DIFF ARRAY'
                                : 'NEW DIFF ARRAY'
                            : 'WAITING'}
                    </strong>
                </div>
            {/each}
        </div>
        <p class="preview-note">
            Identity, not matching text, is the proof: every green observer points to the exact
            array retained from the initial 3,000-line computation.
        </p>
    </section>

    <details data-testid="mounted-diff-probe">
        <summary>Inspect the mounted 3,000-line SvelteDiff output</summary>
        <p>
            The full component remains mounted inside this collapsed panel so its lifecycle and DOM
            behavior are real while the page stays readable.
        </p>
        <div class="probe-output">
            <SvelteDiff {originalText} {modifiedText} onProcessing={activeCallback} />
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
    .diagnostic-card header,
    .capability-preview header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
    }
    nav a {
        color: #1d4ed8;
        font-weight: 700;
    }
    h1 {
        margin: 0.25rem 0 0.75rem;
        font-size: clamp(2rem, 5vw, 3.5rem);
        line-height: 1;
    }
    h2,
    p {
        margin-top: 0;
    }
    .eyebrow,
    .number {
        margin: 2rem 0 0.35rem;
        color: #1d4ed8;
        font-size: 0.85rem;
        font-weight: 900;
        letter-spacing: 0.18em;
    }
    .intro {
        max-width: 60rem;
        font-size: 1.1rem;
        line-height: 1.6;
    }
    .overall-banner {
        margin: 1.5rem 0 1rem;
        border: 3px solid;
        border-radius: 0.75rem;
        padding: 1rem;
        font-size: 1.5rem;
        font-weight: 900;
        text-align: center;
    }
    [data-status='running'] {
        border-color: #a16207;
        background: #fef9c3;
        color: #713f12;
    }
    [data-status='pass'] {
        border-color: #15803d;
        background: #dcfce7;
        color: #14532d;
    }
    [data-status='fail'] {
        border-color: #b91c1c;
        background: #fee2e2;
        color: #7f1d1d;
    }
    button {
        border: 0;
        border-radius: 0.5rem;
        background: #1d4ed8;
        color: white;
        padding: 0.8rem 1rem;
        font: inherit;
        font-weight: 800;
        cursor: pointer;
    }
    button:disabled {
        cursor: wait;
        opacity: 0.55;
    }
    .diagnostic-card,
    .capability-preview,
    details {
        margin-top: 1.5rem;
        border: 3px solid #1e3a5f;
        border-radius: 0.8rem;
        background: white;
        padding: 1.25rem;
        box-shadow: 0.45rem 0.45rem 0 #0f172a;
    }
    .diagnostic-card header .number,
    .capability-preview header .number {
        margin-top: 0;
    }
    dl {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
        gap: 0.8rem;
    }
    dl > div,
    .retained-result {
        border: 2px solid #334155;
        border-radius: 0.6rem;
        background: #f8fafc;
        padding: 0.9rem;
    }
    dt,
    .retained-result span,
    .document-change span,
    .observer-flow span {
        display: block;
        margin-bottom: 0.3rem;
        color: #475569;
        font-size: 0.75rem;
        font-weight: 900;
        letter-spacing: 0.08em;
    }
    dd {
        margin: 0;
    }
    ol {
        margin: 0;
        padding-left: 1.25rem;
    }
    pre {
        overflow: auto;
        border-radius: 0.5rem;
        background: #0f172a;
        color: #e2e8f0;
        padding: 1rem;
        white-space: pre-wrap;
    }
    .capability-preview {
        background: #eff6ff;
    }
    .document-change {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: stretch;
        gap: 0.8rem;
        margin: 1rem 0;
    }
    .document-change > div:not(.arrow) {
        border: 2px solid #475569;
        border-radius: 0.6rem;
        background: white;
        padding: 1rem;
    }
    .arrow {
        display: grid;
        place-items: center;
        color: #1d4ed8;
        font-size: 2rem;
        font-weight: 900;
    }
    .retained-result {
        border-color: #1d4ed8;
        background: #dbeafe;
        text-align: center;
    }
    .observer-flow {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 0.6rem;
        margin-top: 0.8rem;
    }
    .observer-flow > div {
        border: 2px solid #64748b;
        border-radius: 0.6rem;
        background: #f8fafc;
        padding: 0.8rem;
        text-align: center;
    }
    .observer-flow > div[data-identity-result='true'] {
        border-color: #15803d;
        background: #dcfce7;
        color: #14532d;
    }
    .preview-note {
        margin: 1rem 0 0;
        font-weight: 700;
    }
    details summary {
        cursor: pointer;
        font-size: 1.1rem;
        font-weight: 900;
    }
    .probe-output {
        max-height: 24rem;
        overflow: auto;
        border: 2px solid #94a3b8;
        background: white;
        padding: 1rem;
        font-family: ui-monospace, monospace;
        white-space: pre-wrap;
    }
    @media (max-width: 760px) {
        .document-change,
        .observer-flow {
            grid-template-columns: 1fr;
        }
        .arrow {
            transform: rotate(90deg);
        }
    }
</style>

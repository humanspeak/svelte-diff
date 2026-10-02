<script lang="ts">
    import { parseExpectedPatterns } from '$lib/expectedPatterns.js'
    import { onMount, tick } from 'svelte'

    interface DiagnosticResult {
        status: 'running' | 'pass' | 'fail'
        samples: number[]
        outputValidity: boolean[]
        maximum: number
        failureReasons: string[]
    }

    const MARKER_COUNT = 16000
    const SAMPLE_COUNT = 3
    const CEILING_MS = 2000
    const input = '(?<A>'.repeat(MARKER_COUNT)
    let activeRunId = 0
    let diagnostic = $state<DiagnosticResult>({
        status: 'running',
        samples: [],
        outputValidity: [],
        maximum: 0,
        failureReasons: []
    })

    /** Paints the running state before the synchronous scanner workload. */
    const waitForPaint = async (): Promise<void> => {
        await tick()
        await new Promise<void>((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        })
        await new Promise<void>((resolve) => setTimeout(resolve, 250))
    }

    /** Retains samples and failure reasons, including exceptions, for independent inspection. */
    const runDiagnostic = async (): Promise<void> => {
        const runId = ++activeRunId
        diagnostic = {
            status: 'running',
            samples: [],
            outputValidity: [],
            maximum: 0,
            failureReasons: []
        }
        const samples: number[] = []
        const outputValidity: boolean[] = []
        const failureReasons: string[] = []
        try {
            await waitForPaint()
            if (runId !== activeRunId) return
            if (parseExpectedPatterns('(?<A>'.repeat(16)) !== null) {
                failureReasons.push('Warmup output was not null')
            }
            for (let sample = 0; sample < SAMPLE_COUNT; sample++) {
                const start = performance.now()
                let valid = false
                try {
                    valid = parseExpectedPatterns(input) === null
                } finally {
                    samples.push(performance.now() - start)
                    outputValidity.push(valid)
                }
                if (!valid) failureReasons.push(`Sample ${sample + 1} output was not null`)
                if (samples[sample] > CEILING_MS) {
                    failureReasons.push(
                        `Sample ${sample + 1}: ${samples[sample].toFixed(2)} ms exceeded the ${CEILING_MS} ms ceiling`
                    )
                }
            }
        } catch (error) {
            failureReasons.push(
                `Unexpected diagnostic error: ${error instanceof Error ? error.message : String(error)}`
            )
        }
        if (runId !== activeRunId) return
        diagnostic = {
            status: failureReasons.length === 0 ? 'pass' : 'fail',
            samples,
            outputValidity,
            maximum: Math.max(0, ...samples),
            failureReasons
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
    <title>006 — Rejected expected-pattern discovery</title>
</svelte:head>

<main>
    <a href="/tests/component-performance">← All diagnostics</a>
    <h1>Bound rejected expected-pattern discovery</h1>
    <p>Three primitive-string parser calls with 80000 characters / 16000 unclosed named markers.</p>
    <div
        data-testid="diagnostic-overall"
        data-status={diagnostic.status}
        role="status"
        aria-live="polite"
        aria-atomic="true"
    >
        006: {diagnostic.status.toUpperCase()}
    </div>
    <button type="button" onclick={runDiagnostic} disabled={diagnostic.status === 'running'}
        >Run diagnostic 006</button
    >
    <section
        data-testid="diagnostic-006"
        data-status={diagnostic.status}
        data-elapsed-ms={diagnostic.maximum}
        data-ceiling-ms={CEILING_MS}
        data-samples-ms={diagnostic.samples.join(',')}
        data-input-length={input.length}
        data-marker-count={MARKER_COUNT}
        data-output-valid={diagnostic.outputValidity.length === SAMPLE_COUNT &&
            diagnostic.outputValidity.every(Boolean)}
        data-output-validity={diagnostic.outputValidity.join(',')}
        data-failure-reasons={diagnostic.failureReasons.join('; ')}
    >
        <h2>{diagnostic.status.toUpperCase()} — Measured discovery</h2>
        <p>Input: {input.length} characters / {MARKER_COUNT} unclosed named markers</p>
        <p>Ceiling: {CEILING_MS} ms per call</p>
        <p>Observed maximum: {diagnostic.maximum.toFixed(2)} ms</p>
        <ol data-testid="diagnostic-006-samples">
            {#each diagnostic.samples as sample, index (index)}
                <li>
                    Run {index + 1}: {sample.toFixed(2)} ms; output null: {String(
                        diagnostic.outputValidity[index]
                    )}
                </li>
            {:else}
                <li>Measurements are running…</li>
            {/each}
        </ol>
        <p>Failure reasons: {diagnostic.failureReasons.join('; ') || 'None'}</p>
    </section>
</main>

<style>
    main {
        max-width: 60rem;
        margin: 2rem auto;
        padding: 1rem;
        font-family: sans-serif;
    }
    section {
        margin-top: 1rem;
        padding: 1rem;
        border: 1px solid currentColor;
    }
    button {
        margin-top: 1rem;
        padding: 0.5rem 1rem;
    }
    [data-status='fail'] {
        color: #b91c1c;
    }
    [data-status='pass'] {
        color: #15803d;
    }
</style>

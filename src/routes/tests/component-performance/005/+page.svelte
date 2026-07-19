<script lang="ts">
    import SvelteDiff from '$lib/index.js'
    import { onMount } from 'svelte'

    type DiagnosticStatus = 'running' | 'pass' | 'fail'

    const CEILING_MS = 3000
    const ORIGINAL_TEXT = 'Server proof: amber lighthouse remains steady.'
    const MODIFIED_TEXT = 'Server proof: cobalt lighthouse remains bright.'
    const REQUIRED_CLASSES = [
        'ssr-diagnostic-equal',
        'ssr-diagnostic-remove',
        'ssr-diagnostic-insert'
    ] as const

    let diagnosticProbe: HTMLDivElement
    let status = $state<DiagnosticStatus>('running')
    let elapsed = $state(0)
    let missingClasses = $state<string[]>([])

    const failureReasons = $derived([
        ...missingClasses.map((className) => `Missing .${className}`),
        ...(elapsed > CEILING_MS
            ? [`Navigation took ${elapsed.toFixed(2)} ms, exceeding ${CEILING_MS} ms`]
            : [])
    ])
    const diagnosticText = $derived(
        [
            'Workload: one fixed server-rendered equal/remove/insert diff',
            `Required classes: ${REQUIRED_CLASSES.map((className) => `.${className}`).join(', ')}`,
            `Ceiling: ${CEILING_MS} ms local preview navigation`,
            `Actual navigation: ${elapsed > 0 ? `${elapsed.toFixed(2)} ms` : 'waiting for window load'}`,
            `Failure reasons: ${failureReasons.join('; ') || 'None'}`
        ].join('\n')
    )

    /** Reads the hydrated probe and the current navigation entry. */
    const runDiagnostic = (): void => {
        const navigation = performance.getEntriesByType('navigation')[0] as
            PerformanceNavigationTiming | undefined
        elapsed = navigation?.duration ?? performance.now()
        missingClasses = REQUIRED_CLASSES.filter(
            (className) => !diagnosticProbe.querySelector(`.${className}`)
        )
        status = missingClasses.length === 0 && elapsed <= CEILING_MS ? 'pass' : 'fail'
    }

    onMount(() => {
        const measureAfterLoad = () => setTimeout(runDiagnostic, 0)
        if (document.readyState === 'complete') {
            measureAfterLoad()
        } else {
            window.addEventListener('load', measureAfterLoad, { once: true })
        }

        return () => window.removeEventListener('load', measureAfterLoad)
    })
</script>

<svelte:head>
    <title>005 — Server-rendered initial diff</title>
</svelte:head>

<main>
    <nav>
        <a href="/tests/component-performance">← All diagnostics</a>
        <a href="/tests/component-performance/004">← Previous: 004</a>
    </nav>
    <p class="eyebrow">DIAGNOSTIC 005</p>
    <h1>Render the initial diff during SSR</h1>
    <p class="intro">
        This page proves that useful equal, removed, and inserted content arrives in the server HTML
        before hydration. The proof remains loud and legible with JavaScript disabled.
    </p>

    <div
        class="overall-banner"
        data-status={status}
        data-testid="diagnostic-overall"
        role="status"
        aria-live="polite"
        aria-atomic="true"
    >
        005: {status.toUpperCase()}
    </div>
    <button type="button" onclick={runDiagnostic}>Run diagnostic 005</button>

    <section
        class="diagnostic-card"
        data-testid="diagnostic-005"
        data-status={status}
        data-ceiling-ms={CEILING_MS}
        data-elapsed-ms={elapsed.toFixed(2)}
        data-failure-reasons={failureReasons.join('; ')}
    >
        <header>
            <div>
                <p class="number">005</p>
                <h2>Server HTML result</h2>
            </div>
            <strong class="no-js-fail">FAIL — diff missing from server HTML</strong>
            <strong class="no-js-pass">PASS — diff present in server HTML</strong>
        </header>

        <div class="diff-probe" data-testid="ssr-diff-probe" bind:this={diagnosticProbe}>
            <SvelteDiff
                originalText={ORIGINAL_TEXT}
                modifiedText={MODIFIED_TEXT}
                rendererClasses={{
                    equal: 'ssr-diagnostic-equal',
                    remove: 'ssr-diagnostic-remove',
                    insert: 'ssr-diagnostic-insert'
                }}
            />
        </div>

        <dl>
            <div>
                <dt>Workload</dt>
                <dd>One fixed equal/remove/insert diff rendered during SSR</dd>
            </div>
            <div>
                <dt>Required classes</dt>
                <dd>{REQUIRED_CLASSES.map((className) => `.${className}`).join(', ')}</dd>
            </div>
            <div>
                <dt>Committed ceiling</dt>
                <dd>{CEILING_MS} ms local preview navigation</dd>
            </div>
            <div>
                <dt>Actual navigation</dt>
                <dd>{elapsed > 0 ? `${elapsed.toFixed(2)} ms` : 'Available after window load'}</dd>
            </div>
            <div>
                <dt>Failure reasons</dt>
                <dd>{failureReasons.join('; ') || 'None'}</dd>
            </div>
        </dl>
        <pre>{diagnosticText}</pre>
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
        padding: 3rem 1rem 5rem;
    }

    nav {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        margin-bottom: 2rem;
    }

    nav a {
        color: #0369a1;
        font-weight: 800;
    }

    .eyebrow,
    .number {
        margin: 0 0 0.75rem;
        color: #0369a1;
        font-weight: 950;
        letter-spacing: 0.14em;
    }

    h1 {
        max-width: 13ch;
        margin: 0;
        font-size: clamp(2.75rem, 8vw, 6rem);
        line-height: 0.9;
    }

    .intro {
        max-width: 50rem;
        margin: 1.5rem 0 2rem;
        font-size: 1.2rem;
        line-height: 1.6;
    }

    .overall-banner,
    .diagnostic-card {
        border: 0.3rem solid #991b1b;
        border-radius: 0.8rem;
        background: #fee2e2;
        box-shadow: 0.5rem 0.5rem 0 #991b1b;
    }

    .overall-banner {
        margin-bottom: 1rem;
        padding: 1rem;
        color: #991b1b;
        font-size: clamp(1.5rem, 5vw, 3rem);
        font-weight: 950;
    }

    .overall-banner[data-status='pass'] {
        border-color: #166534;
        background: #dcfce7;
        color: #166534;
        box-shadow: 0.5rem 0.5rem 0 #166534;
    }

    button {
        margin: 0 0 1.5rem;
        border: 0.2rem solid #0f172a;
        border-radius: 0.5rem;
        padding: 0.75rem 1rem;
        background: white;
        color: #0f172a;
        font: inherit;
        font-weight: 900;
        cursor: pointer;
    }

    .diagnostic-card {
        padding: clamp(1rem, 4vw, 2rem);
    }

    .diagnostic-card:has(:global(.ssr-diagnostic-equal)):has(:global(.ssr-diagnostic-remove)):has(
            :global(.ssr-diagnostic-insert)
        ) {
        border-color: #166534;
        background: #dcfce7;
        box-shadow: 0.5rem 0.5rem 0 #166534;
    }

    .diagnostic-card header {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
    }

    .diagnostic-card h2 {
        margin: 0;
        font-size: clamp(1.5rem, 4vw, 2.5rem);
    }

    .no-js-fail,
    .no-js-pass {
        border: 0.2rem solid currentColor;
        padding: 0.75rem;
        font-size: clamp(1.5rem, 4vw, 2.5rem);
    }

    .no-js-fail {
        display: block;
        color: #991b1b;
    }

    .no-js-pass {
        display: none;
        color: #166534;
    }

    .diagnostic-card:has(:global(.ssr-diagnostic-equal)):has(:global(.ssr-diagnostic-remove)):has(
            :global(.ssr-diagnostic-insert)
        )
        .no-js-fail {
        display: none;
    }

    .diagnostic-card:has(:global(.ssr-diagnostic-equal)):has(:global(.ssr-diagnostic-remove)):has(
            :global(.ssr-diagnostic-insert)
        )
        .no-js-pass {
        display: block;
    }

    .diff-probe {
        margin: 2rem 0;
        border: 0.25rem solid #0f172a;
        border-radius: 0.6rem;
        padding: 1.5rem;
        background: white;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: clamp(1rem, 3vw, 1.5rem);
        line-height: 1.6;
    }

    :global(.ssr-diagnostic-equal) {
        background: #e0f2fe;
    }

    :global(.ssr-diagnostic-remove) {
        background: #fecaca;
        text-decoration: line-through;
    }

    :global(.ssr-diagnostic-insert) {
        background: #bbf7d0;
        text-decoration: underline;
    }

    dl {
        display: grid;
        gap: 0.75rem;
    }

    dl div {
        display: grid;
        grid-template-columns: minmax(10rem, 0.35fr) 1fr;
        gap: 1rem;
    }

    dt {
        font-weight: 900;
    }

    dd {
        margin: 0;
    }

    pre {
        overflow-x: auto;
        border: 0.15rem solid #0f172a;
        padding: 1rem;
        background: #fff;
        white-space: pre-wrap;
    }

    @media (max-width: 42rem) {
        dl div {
            grid-template-columns: 1fr;
            gap: 0.2rem;
        }
    }
</style>

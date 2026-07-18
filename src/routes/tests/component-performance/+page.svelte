<script lang="ts">
    const diagnostics = [
        {
            number: '001',
            title: 'Compile expected-pattern metadata once',
            summary:
                'Mounted component changes, capture correctness, rendering, and a 250 ms ceiling.',
            href: '/tests/component-performance/001',
            status: 'ACTIVE'
        },
        {
            number: '002',
            title: 'Tag expected regions in one forward sweep',
            summary:
                '10,000 diff segments, 5,000 ranges, visible tagged output, and a 100 ms ceiling.',
            href: '/tests/component-performance/002',
            status: 'ACTIVE'
        }
    ]
</script>

<svelte:head>
    <title>Component performance diagnostics</title>
</svelte:head>

<main>
    <p class="eyebrow">EYEBALL TESTS</p>
    <h1>Component performance diagnostics</h1>
    <p class="intro">
        Each capability now has its own page, workload, controls, PASS/FAIL state, and visual
        evidence. Pick one diagnostic instead of scrolling through every test at once.
    </p>

    <div class="diagnostic-grid">
        {#each diagnostics as diagnostic (diagnostic.number)}
            <a
                class="diagnostic-link"
                href={diagnostic.href}
                data-testid={`diagnostic-link-${diagnostic.number}`}
            >
                <span class="number">{diagnostic.number}</span>
                <span class="copy">
                    <strong>{diagnostic.title}</strong>
                    <span>{diagnostic.summary}</span>
                </span>
                <span class="status">{diagnostic.status} →</span>
            </a>
        {/each}
    </div>

    <section class="pending" aria-labelledby="pending-heading">
        <h2 id="pending-heading">Coming next</h2>
        <div>
            {#each ['003', '004', '005'] as number (number)}
                <span data-testid={`diagnostic-${number}`} data-status="pending"
                    ><strong>{number}</strong> PENDING</span
                >
            {/each}
        </div>
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

    .eyebrow {
        margin: 0 0 0.75rem;
        color: #0369a1;
        font-size: 1rem;
        font-weight: 950;
        letter-spacing: 0.14em;
    }

    h1 {
        max-width: 14ch;
        margin: 0;
        font-size: clamp(2.75rem, 8vw, 6rem);
        line-height: 0.9;
    }

    .intro {
        max-width: 48rem;
        margin: 1.5rem 0 2rem;
        font-size: 1.2rem;
        line-height: 1.6;
    }

    .diagnostic-grid {
        display: grid;
        gap: 1.25rem;
    }

    .diagnostic-link {
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
        gap: 1.25rem;
        border: 0.25rem solid #0f172a;
        border-radius: 0.8rem;
        padding: 1.25rem;
        background: white;
        color: inherit;
        box-shadow: 0.4rem 0.4rem 0 #0f172a;
        text-decoration: none;
    }

    .diagnostic-link:hover,
    .diagnostic-link:focus-visible {
        border-color: #0369a1;
        outline: 0;
        box-shadow: 0.4rem 0.4rem 0 #0369a1;
        transform: translate(-0.1rem, -0.1rem);
    }

    .number {
        color: #0369a1;
        font-size: clamp(1.75rem, 5vw, 3.5rem);
        font-weight: 950;
    }

    .copy {
        display: grid;
        gap: 0.35rem;
    }

    .copy strong {
        font-size: 1.25rem;
    }

    .copy span {
        color: #475569;
        line-height: 1.45;
    }

    .status {
        color: #15803d;
        font-weight: 950;
    }

    .pending {
        margin-top: 2rem;
        border: 0.2rem dashed #b45309;
        border-radius: 0.75rem;
        padding: 1.25rem;
        background: #fef3c7;
        color: #78350f;
    }

    .pending h2 {
        margin: 0 0 0.75rem;
    }

    .pending div {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
    }

    .pending span {
        border: 2px solid currentColor;
        border-radius: 999px;
        padding: 0.45rem 0.75rem;
        background: white;
    }

    @media (max-width: 42rem) {
        .diagnostic-link {
            grid-template-columns: auto 1fr;
        }

        .status {
            grid-column: 2;
        }
    }
</style>

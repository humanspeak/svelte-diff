<script lang="ts">
    let { siblingHref, siblingLabel }: { siblingHref: string; siblingLabel: string } = $props()
</script>

<nav aria-label="Related reading" class="related-reading">
    <span class="label">Related reading</span>
    <a href="/docs/guides/diff-modes">Diff modes guide</a>
    <a href="/docs/api/svelte-diff">API</a>
    <a href={siblingHref}>{siblingLabel}</a>
    <a href="/docs/guides/expected-patterns">Expected patterns</a>
</nav>

<style>
    .related-reading {
        display: grid;
        gap: 0.5rem;
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px dashed var(--brut-rule);
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 0.75rem;
    }

    .label {
        color: var(--brut-ink-3);
        font-size: 0.6875rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
    }

    a {
        color: var(--brut-ink);
        text-decoration: underline;
        text-underline-offset: 0.2em;
    }

    a:hover,
    a:focus-visible {
        color: var(--brut-accent);
        background: var(--brut-accent-soft);
    }

    a:focus-visible {
        outline: 2px solid var(--brut-accent);
        outline-offset: 3px;
    }
</style>

<script lang="ts">
    import { CodeReferenceV2, ExampleV2, formatSheetLabel, type ExampleSection } from '@humanspeak/docs-kit'
    import { Regex, ShieldCheck } from '@lucide/svelte'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import { demoCodeSample } from '$lib/demo-loaders'
    import ExpectedPatterns from '$lib/examples/expected-patterns/demos/ExpectedPatterns.svelte'

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Expected Patterns | Examples | Svelte Diff'
        seo.description = 'Match dynamic versions, dates, and names as expected values and inspect captured groups live.'
        seo.ogTitle = 'Expected Patterns'
        seo.ogTagline = 'Intentional variation without noisy red and green edits.'
        seo.ogFeatures = ['Named Groups', 'Live Captures', 'Expected Styling', 'Fallback Diffs']
        seo.ogSlug = 'examples-expected-patterns'
    }

    const sourceUrl = 'https://github.com/humanspeak/svelte-diff/blob/main/docs/src/lib/examples/expected-patterns/demos/ExpectedPatterns.svelte'
    const sections: ExampleSection[] = [{
        figId: 'FIG-001',
        tag: 'PATTERNS',
        title: { prefix: 'expected ', accent: 'values', end: '.' },
        description: 'Named patterns distinguish intentional dynamic values from genuine edits. Successful matches get expected styling and structured captures; invalid formats remain visible as normal diffs.',
        snippet: demo,
        codeSnippet: code,
        notes,
        barCells: [{ k: 'groups', v: '3 named' }, { k: 'callback', v: 'captures' }],
        sourceUrl
    }]
</script>

{#snippet demo()}<ExpectedPatterns />{/snippet}

{#snippet code()}
    <CodeReferenceV2 samples={[demoCodeSample('expected-patterns/demos/ExpectedPatterns.svelte', 'expected-patterns', 'ExpectedPatterns.svelte')]} columns={1} />
{/snippet}

{#snippet notes()}
    <ul>
        <li>
            <Regex />
            <span>
                Name dynamic groups such as <code>version</code>, <code>date</code>, and
                <code>team</code>.
            </span>
        </li>
        <li>
            <ShieldCheck />
            <span>
                A format mismatch falls back to the normal readable diff.
            </span>
        </li>
    </ul>
{/snippet}

{#each sections as section, index (section.figId)}
    <ExampleV2
        figId={section.figId}
        tag={section.tag}
        title={section.title}
        description={section.description}
        mode={section.mode ?? 'live'}
        sheetLabel={formatSheetLabel(index, sections.length)}
        barCells={section.barCells}
        sourceUrl={section.sourceUrl}
        codeSnippet={section.codeSnippet}
        codeLabel="show code"
        notes={section.notes}
    >
        {@render section.snippet()}
    </ExampleV2>
{/each}

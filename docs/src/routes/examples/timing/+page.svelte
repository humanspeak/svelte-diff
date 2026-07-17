<script lang="ts">
    import { CodeReferenceV2, ExampleV2, formatSheetLabel, type ExampleSection } from '@humanspeak/docs-kit'
    import { Activity, Timer } from '@lucide/svelte'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import { demoCodeSample } from '$lib/demo-loaders'
    import Timing from '$lib/examples/timing/demos/Timing.svelte'

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Timing | Examples | Svelte Diff'
        seo.description = 'Scale a generated text diff and inspect core algorithm, cleanup, total time, and segment counts.'
        seo.ogTitle = 'Timing'
        seo.ogTagline = 'Watch onProcessing telemetry update live.'
        seo.ogFeatures = ['Core Timing', 'Cleanup Timing', 'Total Time', 'Segment Count']
        seo.ogSlug = 'examples-timing'
    }

    const sourceUrl = 'https://github.com/humanspeak/svelte-diff/blob/main/docs/src/lib/examples/timing/demos/Timing.svelte'
    const sections: ExampleSection[] = [{
        figId: 'FIG-001',
        tag: 'PERFORMANCE',
        title: { prefix: 'processing ', accent: 'timing', end: '.' },
        description: 'The `onProcessing` callback reports core diff time, cleanup time, total time, and final tuples together. Scale the generated documents to profile realistic content.',
        snippet: demo,
        codeSnippet: code,
        notes,
        barCells: [{ k: 'callback', v: 'onProcessing' }, { k: 'unit', v: 'ms' }],
        sourceUrl
    }]
</script>

{#snippet demo()}<Timing />{/snippet}

{#snippet code()}
    <CodeReferenceV2 samples={[demoCodeSample('timing/demos/Timing.svelte', 'timing', 'Timing.svelte')]} columns={1} />
{/snippet}

{#snippet notes()}
    <ul>
        <li>
            <Timer />
            <span>
                Durations use <code>performance.now()</code> and report milliseconds.
            </span>
        </li>
        <li>
            <Activity />
            <span>
                Timing and tuple count always describe the same rendered result.
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

<script lang="ts">
    import { CodeReferenceV2, ExampleV2, formatSheetLabel, type ExampleSection } from '@humanspeak/docs-kit'
    import { ListTree, WandSparkles } from '@lucide/svelte'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import { demoCodeSample } from '$lib/demo-loaders'
    import CleanupModes from '$lib/examples/cleanup-modes/demos/CleanupModes.svelte'

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Cleanup Modes | Examples | Svelte Diff'
        seo.description = 'Compare raw, efficiency-cleaned, and semantic diff output for the same before and after strings.'
        seo.ogTitle = 'Cleanup Modes'
        seo.ogTagline = 'Three cleanup strategies. One input pair.'
        seo.ogFeatures = ['Raw Output', 'Efficiency Cleanup', 'Semantic Cleanup', 'Side-by-Side']
        seo.ogSlug = 'examples-cleanup-modes'
    }

    const sourceUrl = 'https://github.com/humanspeak/svelte-diff/blob/main/docs/src/lib/examples/cleanup-modes/demos/CleanupModes.svelte'
    const sections: ExampleSection[] = [{
        figId: 'FIG-001',
        tag: 'READABILITY',
        title: { prefix: 'cleanup ', accent: 'modes', end: '.' },
        description: 'One edit can have several valid segmentations. Compare raw, efficiency-cleaned, and semantic output for the same input before choosing a default.',
        snippet: demo,
        codeSnippet: code,
        notes,
        barCells: [{ k: 'modes', v: '3' }, { k: 'input', v: 'identical' }],
        sourceUrl
    }]
</script>

{#snippet demo()}<CleanupModes />{/snippet}

{#snippet code()}
    <CodeReferenceV2 samples={[demoCodeSample('cleanup-modes/demos/CleanupModes.svelte', 'cleanup-modes', 'CleanupModes.svelte')]} columns={1} />
{/snippet}

{#snippet notes()}
    <ul>
        <li>
            <ListTree />
            <span>
                Raw mode exposes the tuple boundaries returned directly by diff-match-patch.
            </span>
        </li>
        <li>
            <WandSparkles />
            <span>
                Semantic cleanup prefers word, sentence, and paragraph boundaries.
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

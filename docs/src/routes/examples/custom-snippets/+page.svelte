<script lang="ts">
    import { CodeReferenceV2, ExampleV2, formatSheetLabel, type ExampleSection } from '@humanspeak/docs-kit'
    import { CodeXml, Layers } from '@lucide/svelte'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import { demoCodeSample } from '$lib/demo-loaders'
    import CustomSnippets from '$lib/examples/custom-snippets/demos/CustomSnippets.svelte'

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Custom Snippets | Examples | Svelte Diff'
        seo.description = 'Replace SvelteDiff fallback spans with semantic del and ins elements using Svelte 5 snippets.'
        seo.ogTitle = 'Custom Snippets'
        seo.ogTagline = 'Own the markup for every segment type.'
        seo.ogFeatures = ['Svelte 5 Snippets', 'Semantic HTML', 'Per-Type Overrides', 'Accessible Labels']
        seo.ogSlug = 'examples-custom-snippets'
    }

    const sourceUrl = 'https://github.com/humanspeak/svelte-diff/blob/main/docs/src/lib/examples/custom-snippets/demos/CustomSnippets.svelte'
    const sections: ExampleSection[] = [{
        figId: 'FIG-001',
        tag: 'RENDERING',
        title: { prefix: 'custom ', accent: 'snippets', end: '.' },
        description: 'Direct Svelte 5 snippets replace the fallback renderer one segment at a time. Own the markup you need while every omitted segment keeps its default behavior.',
        snippet: demo,
        codeSnippet: code,
        notes,
        barCells: [{ k: 'markup', v: 'del + ins' }, { k: 'precedence', v: 'child first' }],
        sourceUrl
    }]
</script>

{#snippet demo()}<CustomSnippets />{/snippet}

{#snippet code()}
    <CodeReferenceV2 samples={[demoCodeSample('custom-snippets/demos/CustomSnippets.svelte', 'custom-snippets', 'CustomSnippets.svelte')]} columns={1} />
{/snippet}

{#snippet notes()}
    <ul>
        <li>
            <CodeXml />
            <span>
                Render removals with <code>del</code> and additions with <code>ins</code>.
            </span>
        </li>
        <li>
            <Layers />
            <span>
                Child snippets win before renderer maps and built-in fallbacks.
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

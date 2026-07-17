<script lang="ts">
    import { CodeReferenceV2, ExampleV2, formatSheetLabel, type ExampleSection } from '@humanspeak/docs-kit'
    import { Gauge, RefreshCw } from '@lucide/svelte'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import { demoCodeSample } from '$lib/demo-loaders'
    import LiveEditor from '$lib/examples/live-editor/demos/LiveEditor.svelte'

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Live Editor | Examples | Svelte Diff'
        seo.description = 'Edit before and after text and watch SvelteDiff recompute semantic output reactively.'
        seo.ogTitle = 'Live Editor'
        seo.ogTagline = 'Reactive before, after, and rendered diff.'
        seo.ogFeatures = ['Live Inputs', 'Reactive Diffs', 'Semantic Cleanup', 'Svelte 5 Runes']
        seo.ogSlug = 'examples-live-editor'
    }

    const sourceUrl = 'https://github.com/humanspeak/svelte-diff/blob/main/docs/src/lib/examples/live-editor/demos/LiveEditor.svelte'
    const sections: ExampleSection[] = [{
        figId: 'FIG-001',
        tag: 'REACTIVE',
        title: { prefix: 'live ', accent: 'editor', end: '.' },
        description: 'Two rune-backed textareas feed `SvelteDiff` directly. Edit either document and normal Svelte reactivity produces the next comparison without an imperative recompute call.',
        snippet: demo,
        codeSnippet: code,
        notes,
        barCells: [{ k: 'inputs', v: 'reactive' }, { k: 'cleanup', v: 'semantic' }],
        sourceUrl
    }]
</script>

{#snippet demo()}<LiveEditor />{/snippet}

{#snippet code()}
    <CodeReferenceV2 samples={[demoCodeSample('live-editor/demos/LiveEditor.svelte', 'live-editor', 'LiveEditor.svelte')]} columns={1} />
{/snippet}

{#snippet notes()}
    <ul>
        <li>
            <RefreshCw />
            <span>
                Changing either prop automatically runs a fresh comparison.
            </span>
        </li>
        <li>
            <Gauge />
            <span>
                Debounce editor-sized documents before updating the diff props.
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

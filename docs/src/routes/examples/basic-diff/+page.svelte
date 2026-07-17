<script lang="ts">
    import { CodeReferenceV2, ExampleV2, formatSheetLabel, type ExampleSection } from '@humanspeak/docs-kit'
    import { GitCompareArrows, Sparkles } from '@lucide/svelte'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import { demoCodeSample } from '$lib/demo-loaders'
    import BasicDiff from '$lib/examples/basic-diff/demos/BasicDiff.svelte'

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Basic Diff | Examples | Svelte Diff'
        seo.description = 'Render a readable Svelte 5 text diff with two strings, semantic cleanup, and class-based styling.'
        seo.ogTitle = 'Basic Diff'
        seo.ogTagline = 'The smallest useful SvelteDiff setup.'
        seo.ogFeatures = ['Two Strings', 'Semantic Cleanup', 'CSS Classes', 'Copyable Source']
        seo.ogSlug = 'examples-basic-diff'
    }

    const sourceUrl = 'https://github.com/humanspeak/svelte-diff/blob/main/docs/src/lib/examples/basic-diff/demos/BasicDiff.svelte'
    const sections: ExampleSection[] = [{
        figId: 'FIG-001',
        tag: 'START',
        title: { prefix: 'basic ', accent: 'diff', end: '.' },
        description: 'Start with two plain strings and let `SvelteDiff` own the comparison. Semantic cleanup makes the result readable while stable classes provide the styling hooks.',
        snippet: demo,
        codeSnippet: code,
        notes,
        barCells: [{ k: 'cleanup', v: 'semantic' }, { k: 'rendering', v: 'classes' }],
        sourceUrl
    }]
</script>

{#snippet demo()}<BasicDiff />{/snippet}

{#snippet code()}
    <CodeReferenceV2 samples={[demoCodeSample('basic-diff/demos/BasicDiff.svelte', 'basic-diff', 'BasicDiff.svelte')]} columns={1} />
{/snippet}

{#snippet notes()}
    <ul>
        <li>
            <GitCompareArrows />
            <span>
                Pass before and after values directly; no parser or operation loop is required.
            </span>
        </li>
        <li>
            <Sparkles />
            <span>
                <code>cleanupSemantic</code> shifts edit boundaries toward readable words.
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

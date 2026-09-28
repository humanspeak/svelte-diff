<script lang="ts">
    import { CodeReferenceV2, ExampleV2, formatSheetLabel, type ExampleSection } from '@humanspeak/docs-kit'
    import { ListTree, WandSparkles } from '@lucide/svelte'
    import RelatedReading from '$lib/components/RelatedReading.svelte'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import { demoCodeSample } from '$lib/demo-loaders'
    import WordDiff from '$lib/examples/word-diff/demos/WordDiff.svelte'

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Word Diff | Examples | Svelte Diff'
        seo.description = 'Edit before and after text to compare word and raw character diff output.'
        seo.ogTitle = 'Word Diff'
        seo.ogTagline = 'Compare complete words with raw character edits.'
        seo.ogFeatures = ['Editable Text', 'Whole Tokens', 'Lossless Whitespace', 'Raw Character Comparison']
        seo.ogSlug = 'examples-word-diff'
    }

    const sourceUrl = 'https://github.com/humanspeak/svelte-diff/blob/main/docs/src/lib/examples/word-diff/demos/WordDiff.svelte'
    const sections: ExampleSection[] = [{
        figId: 'FIG-001',
        tag: 'READABILITY',
        title: { prefix: 'compare ', accent: 'words', end: '.' },
        description: 'Word tokens preserve spaces, tabs, punctuation, and case. Apostrophes and hyphens separate word runs. Unicode letters, marks, numbers, and underscores form runs; continuous CJK text is one token and emoji grapheme clusters are not guaranteed atomic. Cleanup applies only to character mode.',
        snippet: demo,
        codeSnippet: code,
        notes,
        barCells: [{ k: 'modes', v: '2' }, { k: 'input', v: 'identical' }],
        sourceUrl
    }]
</script>

<h1 class="sr-only">Word Diff</h1>

{#snippet demo()}<WordDiff />{/snippet}

{#snippet code()}
    <CodeReferenceV2 samples={[demoCodeSample('word-diff/demos/WordDiff.svelte', 'word-diff', 'WordDiff.svelte')]} columns={1} />
{/snippet}

{#snippet notes()}
    <ul>
        <li>
            <ListTree />
            <span>
                The raw character pane disables efficiency cleanup; word mode skips cleanup.
            </span>
        </li>
        <li>
            <WandSparkles />
            <span>
                Raw tuples preserve whole tokens. Expected annotations and newline renderers may split displayed segments.
            </span>
        </li>
    </ul>
    <RelatedReading siblingHref="/examples/line-diff" siblingLabel="Line example" />
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

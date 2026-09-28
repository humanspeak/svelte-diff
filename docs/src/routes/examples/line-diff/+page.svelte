<script lang="ts">
    import { CodeReferenceV2, ExampleV2, formatSheetLabel, type ExampleSection } from '@humanspeak/docs-kit'
    import { ListTree, WandSparkles } from '@lucide/svelte'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import { demoCodeSample } from '$lib/demo-loaders'
    import LineDiff from '$lib/examples/line-diff/demos/LineDiff.svelte'

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Line Diff | Examples | Svelte Diff'
        seo.description = 'Edit before and after text to compare line and raw character diff output.'
        seo.ogTitle = 'Line Diff'
        seo.ogTagline = 'Compare complete lines with raw character edits.'
        seo.ogFeatures = ['Editable Text', 'Whole Tokens', 'Lossless Whitespace', 'Raw Character Comparison']
        seo.ogSlug = 'examples-line-diff'
    }

    const sourceUrl = 'https://github.com/humanspeak/svelte-diff/blob/main/docs/src/lib/examples/line-diff/demos/LineDiff.svelte'
    const sections: ExampleSection[] = [{
        figId: 'FIG-001',
        tag: 'READABILITY',
        title: { prefix: 'compare ', accent: 'lines', end: '.' },
        description: 'Line tokens include their original LF, CRLF, or lone-CR endings, blank lines, and an unterminated final line. JSON and configuration are plain text: nothing is parsed, sorted, or normalized. Cleanup applies only to character mode.',
        snippet: demo,
        codeSnippet: code,
        notes,
        barCells: [{ k: 'modes', v: '2' }, { k: 'input', v: 'identical' }],
        sourceUrl
    }]
</script>

<h1 class="sr-only">Line Diff</h1>

{#snippet demo()}<LineDiff />{/snippet}

{#snippet code()}
    <CodeReferenceV2 samples={[demoCodeSample('line-diff/demos/LineDiff.svelte', 'line-diff', 'LineDiff.svelte')]} columns={1} />
{/snippet}

{#snippet notes()}
    <ul>
        <li>
            <ListTree />
            <span>
                The raw character pane disables efficiency cleanup; line mode skips cleanup.
            </span>
        </li>
        <li>
            <WandSparkles />
            <span>
                Raw tuples preserve whole tokens. Expected annotations and newline renderers may split displayed segments.
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

<p><a href="/docs/guides/diff-modes">Diff modes guide</a> · <a href="/docs/api/svelte-diff">API</a> · <a href="/examples/word-diff">Word example</a> · <a href="/docs/guides/expected-patterns">Expected patterns</a></p>

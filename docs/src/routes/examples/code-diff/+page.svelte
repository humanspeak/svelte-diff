<script lang="ts">
    import {
        CodeReferenceV2,
        ExampleV2,
        formatSheetLabel,
        type ExampleSection
    } from '@humanspeak/docs-kit'
    import { ListTree, WandSparkles } from '@lucide/svelte'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import { demoCodeSample } from '$lib/demo-loaders'
    import CodeDiffDemo from '$lib/examples/code-diff/demos/CodeDiffDemo.svelte'

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Code Diff | Examples | Svelte Diff'
        seo.description =
            'Compare editable source with full-source syntax colors and literal code diffs.'
        seo.ogTitle = 'Code Diff'
        seo.ogTagline = 'Syntax context inside literal source changes.'
        seo.ogFeatures = [
            'Selective Languages',
            'Literal Source',
            'Syntax Context',
            'Native Svelte'
        ]
        seo.ogSlug = 'examples-code-diff'
    }

    const sourceUrl =
        'https://github.com/humanspeak/svelte-diff/blob/main/docs/src/lib/examples/code-diff/demos/CodeDiffDemo.svelte'
    const sections: ExampleSection[] = [
        {
            figId: 'FIG-001',
            tag: 'READABILITY',
            title: { prefix: 'compare ', accent: 'code', end: '.' },
            description:
                'Each complete source is highlighted before composing character, word, or line diffs. Comments and strings keep their syntax context. Register only the languages you use.',
            snippet: demo,
            codeSnippet: code,
            notes,
            barCells: [
                { k: 'modes', v: '3' },
                { k: 'input', v: 'identical' }
            ],
            sourceUrl
        }
    ]
</script>

<h1 class="sr-only">Code Diff</h1>

{#snippet demo()}<CodeDiffDemo />{/snippet}

{#snippet code()}
    <CodeReferenceV2
        samples={[
            demoCodeSample(
                'code-diff/demos/CodeDiffDemo.svelte',
                'code-diff',
                'CodeDiffDemo.svelte'
            )
        ]}
        columns={1}
    />
{/snippet}

{#snippet notes()}
    <ul>
        <li>
            <ListTree />
            <span>
                The optional /code entry requires TanStack Highlight. The ordinary package root
                remains independent.
            </span>
        </li>
        <li>
            <WandSparkles />
            <span>
                Source is literal, including regex capture groups and HTML. Theme CSS controls
                syntax colors; diff backgrounds use CSS variables.
            </span>
        </li>
    </ul>
    <nav aria-label="Related reading">
        <a href="/docs/guides/code-diffs">Code diffs guide</a>
        <a href="/docs/api/code-diff">CodeDiff API</a>
        <a href="/docs/guides/diff-modes">Diff modes guide</a>
    </nav>
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

<style>
    nav {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        margin-top: 1rem;
    }
</style>

<script lang="ts">
    import { BrutIndexV2 } from '@humanspeak/docs-kit'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import rootPkg from '../../../../package.json'

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Interactive Examples | Svelte Diff'
        seo.description =
            'Live Svelte 5 text-diff examples covering reactive editing, expected patterns, cleanup modes, custom snippets, and timing.'
        seo.ogTitle = 'Interactive Examples'
        seo.ogTagline = 'Edit text, compare cleanup, inspect captures, and copy source.'
        seo.ogFeatures = ['Live Editor', 'Expected Patterns', 'Custom Snippets', 'Timing']
        seo.ogSlug = 'examples'
    }

    const examples = [
        {
            slug: 'basic-diff',
            title: 'Basic Diff',
            tag: 'START',
            description: 'The smallest useful setup: two strings, semantic cleanup, and class-based styling.'
        },
        {
            slug: 'live-editor',
            title: 'Live Editor',
            tag: 'REACTIVE',
            description: 'Edit both strings and watch Svelte recompute a readable diff immediately.'
        },
        {
            slug: 'expected-patterns',
            title: 'Expected Patterns',
            tag: 'PATTERNS',
            description: 'Match versions, dates, and names as intentional variation and inspect captures.'
        },
        {
            slug: 'custom-snippets',
            title: 'Custom Snippets',
            tag: 'RENDERING',
            description: 'Replace default spans with semantic del/ins markup and your own visual language.'
        },
        {
            slug: 'cleanup-modes',
            title: 'Cleanup Modes',
            tag: 'READABILITY',
            description: 'Compare raw, efficiency-cleaned, and semantically-cleaned output side by side.'
        },
        {
            slug: 'timing',
            title: 'Timing',
            tag: 'PERFORMANCE',
            description: 'Scale the input and watch core, cleanup, total, and segment metrics update.'
        }
    ]

    const items = examples.map((example, index) => ({
        href: `/examples/${example.slug}`,
        id: `№ ${String(index + 1).padStart(2, '0')} / ${String(examples.length).padStart(2, '0')}`,
        title: `${example.title.toLowerCase()}.`,
        tag: example.tag,
        line: example.description
    }))
</script>

<BrutIndexV2
    hero={{
        figLabel: 'FIG-001 · EXAMPLES INDEX',
        figId: 'FIG-001',
        sheetLabel: 'SHEET 01 / 02',
        meta: [
            { k: 'demos', v: String(examples.length) },
            { k: 'format', v: 'live svelte' },
            { k: 'source', v: 'copyable', accent: true },
            { rule: 'dashed' },
            { k: 'library', v: rootPkg.name },
            { k: 'framework', v: 'svelte 5' }
        ],
        metaFooter: '// choose a sheet',
        kicker: '// examples / text comparison',
        title: { accent: 'examples', end: '.' },
        subHtml:
            'Hands-on demos of <b>@humanspeak/svelte-diff</b>. Change inputs, compare cleanup strategies, inspect expected captures and timings, then open the exact Svelte source.',
        ctas: [
            { label: 'open live editor ↗', href: '/examples/live-editor', primary: true },
            { label: 'get started', href: '/docs/getting-started' },
            { label: 'api', href: '/docs/api/svelte-diff' }
        ]
    }}
    lede={{
        kicker: 'FIG-002 / DEMOS',
        title: { prefix: 'pick a ', accent: 'diff', suffix: '.' },
        body: 'Every page is a self-contained example with live output and the implementation source.'
    }}
    {items}
    footer={{
        big: {
            prefix: 'edit ',
            accent: 'the live diff',
            href: '/examples/live-editor',
            hint: 'before / after / output'
        }
    }}
/>

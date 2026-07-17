import type { DocsKitConfig } from '@humanspeak/docs-kit'

export const docsConfig: DocsKitConfig = {
    name: 'Svelte Diff',
    slug: 'diff',
    npmPackage: '@humanspeak/svelte-diff',
    repo: 'humanspeak/svelte-diff',
    url: 'https://diff.svelte.page',
    description:
        'Render readable, customizable text diffs in Svelte 5 with semantic cleanup, expected patterns, typed snippets, and detailed timing.',
    keywords: [
        'svelte',
        'diff',
        'diff-match-patch',
        'text-comparison',
        'svelte-5',
        'typescript',
        'semantic-diff',
        'expected-patterns',
        'custom-renderers'
    ],
    defaultFeatures: [
        'Readable Text Diffs',
        'Expected Patterns',
        'Semantic Cleanup',
        'Svelte 5 Snippets',
        'TypeScript First',
        'Timing Callbacks'
    ],
    fallbackStars: 20
}

import type { Competitor, ComparisonOurs } from '@humanspeak/docs-kit'

export const ours: ComparisonOurs = {
    name: 'Svelte Diff',
    npmPackage: '@humanspeak/svelte-diff',
    slug: 'svelte-diff',
    url: 'https://diff.svelte.page'
}

const shared = {
    prosUs: [
        'Drop-in Svelte 5 component — two strings in, rendered diff out',
        'Svelte 5 runes-native — reactive to prop changes, no manual recompute',
        'Semantic and efficiency cleanup built in (readable diffs, not character noise)',
        'Expected patterns — mark dynamic regions (dates, names, versions) as "expected" with named regex capture groups instead of showing them as diffs',
        'Full rendering control via Svelte snippets (remove / insert / equal / expected / lineBreak) or plain CSS classes',
        'TypeScript-first with typed props, timing stats, and diff results',
        'Configurable timeout guard for large text comparisons'
    ],
    consUs: [
        'Smaller community (newer project)',
        'Character-level diffing with cleanup — no word / line / sentence granularity modes',
        'A Svelte component — not for diffing data in Node scripts or CLIs'
    ]
}

export const competitors: Competitor[] = [
    {
        slug: 'vs-jsdiff',
        name: 'jsdiff',
        tagline: 'Hand-Rolled Rendering vs Drop-In Component',
        description:
            'jsdiff (the npm "diff" package) is the default answer for text diffing in JavaScript — and it is excellent at computing diffs. But it renders nothing: every Svelte project that uses it re-implements the same change-object-to-markup loop. @humanspeak/svelte-diff is that missing rendering layer as a Svelte 5 component.',
        website: 'https://github.com/kpdecker/jsdiff',
        github: 'https://github.com/kpdecker/jsdiff',
        npm: 'diff',
        type: 'Diff algorithm library',
        approach: 'Compute change objects in JS, build your own rendering',
        features: [
            { name: 'Computes text diffs', us: true, them: true },
            {
                name: 'Drop-in Svelte 5 component',
                us: true,
                them: false,
                note: 'jsdiff returns change objects; the UI is up to you'
            },
            { name: 'Renders the diff for you', us: true, them: false },
            {
                name: 'Custom rendering',
                us: 'Svelte snippets (remove / insert / equal / expected)',
                them: 'Build your own from change objects'
            },
            {
                name: 'Semantic cleanup',
                us: 'cleanupSemantic prop',
                them: false,
                note: 'jsdiff returns minimal diffs with no human-readability cleanup pass'
            },
            {
                name: 'Word / line / sentence modes',
                us: false,
                them: true,
                note: 'jsdiff ships diffWords, diffLines, diffSentences, diffJson'
            },
            {
                name: 'Expected patterns (ignore dynamic regions)',
                us: 'Named regex capture groups',
                them: false
            },
            {
                name: 'Reactive updates',
                us: 'Recomputes when props change',
                them: 'Manual recompute wiring'
            },
            { name: 'Timing statistics', us: 'onProcessing callback', them: false },
            { name: 'Patch create / apply utilities', us: false, them: true },
            { name: 'TypeScript support', us: true, them: true },
            { name: 'Framework-agnostic', us: false, them: true }
        ],
        prosUs: shared.prosUs,
        prosThem: [
            'Ubiquitous and battle-tested — the de-facto JS diffing library',
            'Framework-agnostic — works in Node, CLIs, workers, any frontend',
            'Multiple granularities: characters, words, lines, sentences, JSON',
            'Patch utilities (createPatch / applyPatch) for unified diff text',
            'Zero dependencies and actively maintained'
        ],
        consUs: shared.consUs,
        consThem: [
            'Renders nothing — every Svelte project re-implements the same {#each} rendering loop',
            'No semantic cleanup, so character-level diffs can be noisy',
            'No Svelte integration — reactivity and recompute wiring are on you',
            'Styling, escaping, and edge cases are your responsibility'
        ],
        verdict:
            'Choose jsdiff when you need diff data — in Node, a CLI, or a fully custom UI you want to build from scratch. Choose @humanspeak/svelte-diff when the goal is a diff on screen in a Svelte app: it is the component you would otherwise hand-roll around a diff library, with cleanup, reactivity, and rendering already done.',
        keywords: [
            'jsdiff svelte',
            'svelte text diff',
            'render diff in svelte',
            'jsdiff vs svelte-diff',
            'svelte diff component'
        ]
    },
    {
        slug: 'vs-diff-match-patch',
        name: 'diff-match-patch',
        tagline: 'Raw Algorithm vs Wired-Up Component',
        description:
            "Google's diff-match-patch is the canonical text-diffing algorithm — and it is exactly what @humanspeak/svelte-diff runs internally (via the TypeScript port diff-match-patch-ts). The difference is everything around the algorithm: reactivity, cleanup wiring, rendering, and types, packaged as a Svelte 5 component instead of an imperative API you integrate by hand.",
        website: 'https://github.com/google/diff-match-patch',
        github: 'https://github.com/google/diff-match-patch',
        npm: 'diff-match-patch',
        type: 'Diff algorithm library (Google)',
        approach: 'Imperative diff_main() API you wire into Svelte yourself',
        features: [
            {
                name: 'Diff algorithm',
                us: 'diff-match-patch (same core, TypeScript port)',
                them: 'diff-match-patch'
            },
            { name: 'Drop-in Svelte 5 component', us: true, them: false },
            {
                name: 'Semantic cleanup',
                us: 'cleanupSemantic prop',
                them: 'Manual diff_cleanupSemantic() call'
            },
            {
                name: 'Efficiency cleanup',
                us: 'cleanupEfficiency prop (0–4)',
                them: 'Manual call + editCost tuning'
            },
            {
                name: 'Timeout guard',
                us: 'timeout prop',
                them: 'Diff_Timeout setting'
            },
            {
                name: 'Expected patterns (ignore dynamic regions)',
                us: 'Named regex capture groups',
                them: false
            },
            {
                name: 'Rendering',
                us: 'Svelte snippets or CSS classes',
                them: 'diff_prettyHtml() — inline-styled, not customizable'
            },
            {
                name: 'TypeScript',
                us: 'First-class',
                them: 'Via separate @types/diff-match-patch package'
            },
            {
                name: 'Actively maintained',
                us: true,
                them: false,
                note: 'Last npm release in 2019; Google archived the upstream repository'
            },
            { name: 'Fuzzy match & patch APIs', us: false, them: true }
        ],
        prosUs: shared.prosUs,
        prosThem: [
            'The canonical diff algorithm, ported to many languages',
            'Proven at scale (originally built for Google Docs)',
            'Includes fuzzy match and patch application APIs',
            'Tiny with zero dependencies'
        ],
        consUs: shared.consUs,
        consThem: [
            'Unmaintained — last npm release in 2019, upstream repository archived',
            'Imperative API: you own the compute-on-change wiring, cleanup calls, and rendering',
            'diff_prettyHtml() output is inline-styled HTML you cannot customize',
            'No bundled TypeScript types'
        ],
        verdict:
            'If you were about to wire diff-match-patch into a Svelte component by hand — recomputing on prop changes, running cleanup, mapping operations to styled spans — that wrapper is literally what @humanspeak/svelte-diff is, built on a maintained TypeScript port. Reach for the raw library only when you need its fuzzy match / patch APIs or you are working outside Svelte.',
        keywords: [
            'diff-match-patch svelte',
            'google diff match patch',
            'diff match patch component',
            'svelte diff match patch',
            'diff-match-patch alternative'
        ]
    },
    {
        slug: 'vs-diff2html',
        name: 'diff2html',
        tagline: 'Git Patch Viewer vs Inline Text Diff',
        description:
            'diff2html turns unified diff text — git patches — into polished, GitHub-style side-by-side or line-by-line HTML. It is the right tool for visualizing patches, and the wrong shape for comparing two strings inside a Svelte app: it needs pre-generated diff text as input and renders via HTML strings and a global stylesheet rather than Svelte components.',
        website: 'https://diff2html.xyz',
        github: 'https://github.com/rtfpessoa/diff2html',
        npm: 'diff2html',
        type: 'Git diff HTML renderer',
        approach: 'Convert unified diff / patch text into pre-styled HTML',
        features: [
            {
                name: 'Input',
                us: 'Two plain strings',
                them: 'Unified diff / git patch text',
                note: 'To compare two strings with diff2html you must generate patch text first (e.g. jsdiff createPatch)'
            },
            {
                name: 'Drop-in Svelte component',
                us: true,
                them: false,
                note: 'Framework-agnostic HTML generator'
            },
            { name: 'Inline character-level diff', us: true, them: 'Within changed lines' },
            { name: 'Side-by-side file view', us: false, them: true },
            { name: 'Git patch awareness (files, hunks, headers)', us: false, them: true },
            {
                name: 'Custom rendering',
                us: 'Svelte snippets',
                them: 'Template + CSS overrides'
            },
            {
                name: 'Output',
                us: 'Real DOM via Svelte',
                them: 'HTML string ({@html}) + required stylesheet'
            },
            {
                name: 'Expected patterns (ignore dynamic regions)',
                us: 'Named regex capture groups',
                them: false
            },
            { name: 'Semantic cleanup', us: 'cleanupSemantic prop', them: false },
            { name: 'TypeScript support', us: true, them: true }
        ],
        prosUs: shared.prosUs,
        prosThem: [
            'Polished GitHub-style diff UI out of the box',
            'Side-by-side and line-by-line view modes',
            'Understands real git patches — files, hunks, renames',
            'Framework-agnostic and actively maintained'
        ],
        consUs: [...shared.consUs, 'No side-by-side or per-file patch view'],
        consThem: [
            'Requires unified diff text as input — comparing two strings means generating a patch first',
            'Renders via HTML strings and a global stylesheet, not components',
            'Customization is CSS overrides, not your own markup',
            'Heavier payload than a single-purpose component'
        ],
        verdict:
            'Choose diff2html to display git patches — PR-style file views with side-by-side layout. Choose @humanspeak/svelte-diff to compare two strings inline in a Svelte app, without generating patch text as an intermediate step.',
        keywords: [
            'diff2html svelte',
            'svelte git diff view',
            'diff2html vs svelte-diff',
            'svelte diff viewer',
            'svelte side by side diff'
        ]
    }
]

/** Look up a competitor by slug (used by the /compare/[slug] load + breadcrumbs). */
export const getCompetitor = (slug: string): Competitor | undefined =>
    competitors.find((c) => c.slug === slug)

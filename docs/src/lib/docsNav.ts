import type { Breadcrumb, NavSection } from '@humanspeak/docs-kit'
import {
    Activity,
    ArrowRightLeft,
    BookOpen,
    Braces,
    Code,
    Gauge,
    GitCompareArrows,
    Paintbrush,
    Play,
    Regex,
    Rocket,
    Settings2,
    Sparkles,
    Swords,
    Timer,
    Type
} from '@lucide/svelte'

export const headerNav = [
    { label: 'docs', href: '/docs' },
    { label: 'examples', href: '/examples' },
    { label: 'compare', href: '/compare' }
]

export const docsSections: NavSection[] = [
    {
        title: 'Get Started',
        icon: Rocket,
        items: [
            { title: 'Getting Started', href: '/docs/getting-started', icon: Rocket },
            { title: 'Migration Guide', href: '/docs/migration', icon: ArrowRightLeft }
        ]
    },
    {
        title: 'API Reference',
        icon: BookOpen,
        items: [
            { title: 'SvelteDiff', href: '/docs/api/svelte-diff', icon: GitCompareArrows },
            { title: 'Types & Exports', href: '/docs/api/types', icon: Type }
        ]
    },
    {
        title: 'Guides',
        icon: Settings2,
        items: [
            { title: 'Custom Rendering', href: '/docs/guides/custom-rendering', icon: Paintbrush },
            { title: 'Expected Patterns', href: '/docs/guides/expected-patterns', icon: Regex },
            { title: 'Cleanup Modes', href: '/docs/guides/cleanup', icon: Sparkles },
            { title: 'Timing & Performance', href: '/docs/guides/performance', icon: Gauge }
        ]
    },
    {
        title: 'Interactive Examples',
        icon: Play,
        items: [
            { title: 'All Examples', href: '/examples', icon: Play, exact: true },
            { title: 'Basic Diff', href: '/examples/basic-diff', icon: GitCompareArrows },
            { title: 'Live Editor', href: '/examples/live-editor', icon: Activity },
            { title: 'Expected Patterns', href: '/examples/expected-patterns', icon: Regex },
            { title: 'Custom Snippets', href: '/examples/custom-snippets', icon: Braces },
            { title: 'Cleanup Modes', href: '/examples/cleanup-modes', icon: Sparkles },
            { title: 'Timing', href: '/examples/timing', icon: Timer }
        ]
    },
    {
        title: 'Compare',
        icon: Swords,
        items: [
            { title: 'All Comparisons', href: '/compare', icon: Swords, exact: true },
            { title: 'vs jsdiff', href: '/compare/vs-jsdiff', icon: Code },
            {
                title: 'vs diff-match-patch',
                href: '/compare/vs-diff-match-patch',
                icon: Code
            },
            { title: 'vs diff2html', href: '/compare/vs-diff2html', icon: Code }
        ]
    }
]

const itemTitle = (pathname: string) => {
    for (const section of docsSections) {
        const item = section.items.find((candidate) => candidate.href === pathname)
        if (item) return { section: section.title, title: item.title }
    }
    return undefined
}

export const buildBreadcrumbs = (pathname: string): Breadcrumb[] => {
    if (pathname === '/docs') return [{ title: 'Docs' }]
    if (pathname === '/examples') return [{ title: 'Examples' }]
    if (pathname === '/compare') return [{ title: 'Compare' }]

    const match = itemTitle(pathname)
    if (!match) return [{ title: 'Docs' }]
    if (pathname.startsWith('/examples/')) {
        return [{ title: 'Examples', href: '/examples' }, { title: match.title }]
    }
    if (pathname.startsWith('/compare/')) {
        return [{ title: 'Compare', href: '/compare' }, { title: match.title }]
    }
    if (pathname.startsWith('/docs/')) {
        return [
            { title: 'Docs', href: '/docs/getting-started' },
            { title: match.section },
            { title: match.title }
        ]
    }
    return [{ title: match.title }]
}

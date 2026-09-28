import { Activity, Braces, GitCompareArrows, Regex, Sparkles, Timer, Type } from '@lucide/svelte'

export const examples = [
    {
        slug: 'basic-diff',
        icon: GitCompareArrows,
        title: 'Basic Diff',
        tag: 'START',
        description: 'The smallest useful setup: two strings, semantic cleanup, and class-based styling.'
    },
    {
        slug: 'word-diff',
        icon: Type,
        title: 'Word Diff',
        tag: 'GRANULARITY',
        description: 'Compare whole words with raw character edits using editable prose.'
    },
    {
        slug: 'line-diff',
        icon: Type,
        title: 'Line Diff',
        tag: 'GRANULARITY',
        description: 'Compare complete configuration lines, preserving blank lines and endings.'
    },
    {
        slug: 'live-editor',
        icon: Activity,
        title: 'Live Editor',
        tag: 'REACTIVE',
        description: 'Edit both strings and watch Svelte recompute a readable diff immediately.'
    },
    {
        slug: 'expected-patterns',
        icon: Regex,
        title: 'Expected Patterns',
        tag: 'PATTERNS',
        description: 'Match versions, dates, and names as intentional variation and inspect captures.'
    },
    {
        slug: 'custom-snippets',
        icon: Braces,
        title: 'Custom Snippets',
        tag: 'RENDERING',
        description: 'Replace default spans with semantic del/ins markup and your own visual language.'
    },
    {
        slug: 'cleanup-modes',
        icon: Sparkles,
        title: 'Cleanup Modes',
        tag: 'READABILITY',
        description: 'Compare raw, efficiency-cleaned, and semantically-cleaned output side by side.'
    },
    {
        slug: 'timing',
        icon: Timer,
        title: 'Timing',
        tag: 'PERFORMANCE',
        description: 'Scale the input and watch core, cleanup, total, and segment metrics update.'
    }
]

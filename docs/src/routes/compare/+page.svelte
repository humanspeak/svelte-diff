<script lang="ts">
    import * as Card from '$lib/shadcn/components/ui/card/index.js'
    import { Badge } from '$lib/shadcn/components/ui/badge/index.js'
    import { competitors, ours } from '$lib/compare-data'

    const title = 'Svelte Diff vs jsdiff, diff-match-patch & diff2html — Comparisons'
    const description =
        'Honest, side-by-side comparisons of @humanspeak/svelte-diff — the Svelte 5 diff component — against jsdiff, Google diff-match-patch, and diff2html. Feature matrices, pros and cons, verdicts. No spin.'

    const jsonLd = JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'WebPage',
                name: title,
                description,
                url: `${ours.url}/compare`
            },
            {
                '@type': 'FAQPage',
                mainEntity: [
                    {
                        '@type': 'Question',
                        name: 'Is there a Svelte component for rendering text diffs?',
                        acceptedAnswer: {
                            '@type': 'Answer',
                            text: 'Yes — @humanspeak/svelte-diff is a Svelte 5 runes-native diff component. Pass it two strings and it renders the diff, with semantic cleanup, custom rendering via Svelte snippets, expected-pattern matching for dynamic regions, and full TypeScript support.'
                        }
                    },
                    {
                        '@type': 'Question',
                        name: 'Should I use jsdiff or a diff component in a Svelte app?',
                        acceptedAnswer: {
                            '@type': 'Answer',
                            text: 'jsdiff computes diff data but renders nothing — in a Svelte app you would hand-roll the rendering loop, cleanup, and reactivity yourself. If the goal is a diff on screen, @humanspeak/svelte-diff does that as a single drop-in Svelte 5 component. Use jsdiff directly when you need diff data in Node, a CLI, or a fully custom UI.'
                        }
                    },
                    {
                        '@type': 'Question',
                        name: "Is Google's diff-match-patch library still maintained?",
                        acceptedAnswer: {
                            '@type': 'Answer',
                            text: 'The diff-match-patch npm package last shipped in 2019 and Google archived the upstream repository. @humanspeak/svelte-diff runs the same algorithm via the maintained TypeScript port diff-match-patch-ts, wrapped in a Svelte 5 component.'
                        }
                    }
                ]
            }
        ]
    })
</script>

<svelte:head>
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href="https://diff.svelte.page/compare" />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:url" content="https://diff.svelte.page/compare" />
    <meta
        name="keywords"
        content="svelte diff component, svelte text diff, jsdiff svelte, diff-match-patch svelte, diff2html svelte, render diff in svelte"
    />
    <!-- trunk-ignore(eslint/svelte/no-at-html-tags): static, self-authored JSON-LD -->
    {@html `<script type="application/ld+json">${jsonLd}${'</'}script>`}
</svelte:head>

<div class="mx-auto w-full max-w-4xl px-4 py-10">
    <p class="text-muted-foreground mb-2 font-mono text-sm">// compare</p>
    <h1 class="mb-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
        The Svelte diff component, compared honestly
    </h1>

    <div class="text-muted-foreground mb-10 space-y-4 leading-relaxed">
        <p>
            Ask how to render a text diff in Svelte and the usual answer is: install
            <b>jsdiff</b>, then hand-roll the rendering with an
            <code class="bg-muted rounded px-1 py-0.5 font-mono text-sm">{'{#each}'}</code>
            block. That answer exists because there was no dominant Svelte-native diff component.
        </p>
        <p>
            <b>@humanspeak/svelte-diff</b> is that component — Svelte 5 runes-native, TypeScript-first,
            built on the diff-match-patch algorithm, with semantic cleanup, snippet-based rendering, and
            expected-pattern matching built in. Below are honest, side-by-side comparisons against everything
            you would otherwise reach for. Feature matrices, pros and cons, verdicts. No spin.
        </p>
    </div>

    <div class="grid gap-6 sm:grid-cols-2">
        {#each competitors as competitor (competitor.slug)}
            <a href="/compare/{competitor.slug}" class="group">
                <Card.Root class="h-full transition-colors group-hover:border-primary">
                    <Card.Header>
                        <div class="flex items-center justify-between gap-2">
                            <Card.Title class="text-xl">
                                svelte-diff <span class="text-muted-foreground">vs</span>
                                {competitor.name}
                            </Card.Title>
                            <Badge variant="secondary">{competitor.type}</Badge>
                        </div>
                        <Card.Description>{competitor.tagline}</Card.Description>
                    </Card.Header>
                    <Card.Content>
                        <p class="text-muted-foreground line-clamp-4 text-sm leading-relaxed">
                            {competitor.description}
                        </p>
                        <p class="text-primary mt-4 text-sm font-medium">
                            Read the comparison
                            <span class="inline-block transition-transform group-hover:translate-x-1"
                                >&rarr;</span
                            >
                        </p>
                    </Card.Content>
                </Card.Root>
            </a>
        {/each}
    </div>

    <div class="bg-muted/50 mt-10 rounded-lg border p-6">
        <h2 class="mb-2 text-lg font-bold">Try it in 30 seconds</h2>
        <pre class="bg-background overflow-x-auto rounded border p-3 font-mono text-sm"><code
                >npm i -S @humanspeak/svelte-diff</code
            ></pre>
        <p class="text-muted-foreground mt-3 text-sm">
            Or play with the <a href="/" class="text-primary underline underline-offset-4"
                >live playground</a
            > — paste two strings, see the diff.
        </p>
    </div>
</div>

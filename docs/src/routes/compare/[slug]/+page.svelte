<script lang="ts">
    import * as Card from '$lib/shadcn/components/ui/card/index.js'
    import * as Table from '$lib/shadcn/components/ui/table/index.js'
    import { Badge } from '$lib/shadcn/components/ui/badge/index.js'
    import { Separator } from '$lib/shadcn/components/ui/separator/index.js'
    import { competitors, ours } from '$lib/compare-data'
    import type { PageProps } from './$types'

    const { data }: PageProps = $props()
    const competitor = $derived(data.competitor)
    const others = $derived(competitors.filter((c) => c.slug !== competitor.slug))

    const title = $derived(
        `${ours.npmPackage} vs ${competitor.name} — ${competitor.tagline}`
    )
    const canonical = $derived(`${ours.url}/compare/${competitor.slug}`)

    const jsonLd = $derived(
        JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'TechArticle',
            headline: title,
            description: competitor.description,
            url: canonical,
            keywords: competitor.keywords.join(', '),
            author: {
                '@type': 'Organization',
                name: 'Humanspeak, Inc.',
                url: 'https://humanspeak.com'
            },
            about: {
                '@type': 'SoftwareApplication',
                name: ours.name,
                applicationCategory: 'DeveloperApplication',
                operatingSystem: 'Any',
                url: ours.url,
                downloadUrl: `https://www.npmjs.com/package/${ours.npmPackage}`
            }
        })
    )
</script>

{#snippet cell(value: string | boolean)}
    {#if value === true}
        <span class="font-bold text-green-600 dark:text-green-400" aria-label="yes">✓</span>
    {:else if value === false}
        <span class="text-red-500 dark:text-red-400" aria-label="no">✕</span>
    {:else}
        <span class="text-sm">{value}</span>
    {/if}
{/snippet}

<svelte:head>
    <title>{title}</title>
    <meta name="description" content={competitor.description} />
    <link rel="canonical" href={canonical} />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={competitor.description} />
    <meta property="og:url" content={canonical} />
    <meta name="keywords" content={competitor.keywords.join(', ')} />
    <!-- trunk-ignore(eslint/svelte/no-at-html-tags): static, self-authored JSON-LD -->
    {@html `<script type="application/ld+json">${jsonLd}${'</'}script>`}
</svelte:head>

<div class="mx-auto w-full max-w-4xl px-4 py-10">
    <p class="text-muted-foreground mb-2 font-mono text-sm">
        <a href="/compare" class="hover:text-primary underline-offset-4 hover:underline"
            >// compare</a
        >
        / {ours.slug} vs {competitor.name.toLowerCase()}
    </p>
    <h1 class="mb-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
        {ours.slug} <span class="text-muted-foreground">vs</span>
        {competitor.name.toLowerCase()}
    </h1>
    <p class="text-muted-foreground mb-6 text-lg">{competitor.tagline}</p>

    <div class="mb-8 flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{competitor.type}</Badge>
        <Badge variant="outline">{competitor.approach}</Badge>
        {#if competitor.npm}
            <a
                href="https://www.npmjs.com/package/{competitor.npm}"
                target="_blank"
                rel="noopener"
                class="text-primary text-sm underline underline-offset-4">npm: {competitor.npm}</a
            >
        {/if}
        {#if competitor.github}
            <a
                href={competitor.github}
                target="_blank"
                rel="noopener"
                class="text-primary text-sm underline underline-offset-4">GitHub</a
            >
        {/if}
    </div>

    <p class="text-muted-foreground mb-10 leading-relaxed">{competitor.description}</p>

    <h2 class="mb-4 text-2xl font-bold">Feature matrix</h2>
    <div class="mb-10 overflow-x-auto rounded-lg border">
        <Table.Root>
            <Table.Header>
                <Table.Row>
                    <Table.Head class="min-w-44">Feature</Table.Head>
                    <Table.Head class="min-w-40">{ours.npmPackage}</Table.Head>
                    <Table.Head class="min-w-40">{competitor.name}</Table.Head>
                </Table.Row>
            </Table.Header>
            <Table.Body>
                {#each competitor.features as feature (feature.name)}
                    <Table.Row>
                        <Table.Cell class="align-top font-medium">
                            {feature.name}
                            {#if feature.note}
                                <p class="text-muted-foreground mt-1 text-xs font-normal">
                                    {feature.note}
                                </p>
                            {/if}
                        </Table.Cell>
                        <Table.Cell class="align-top">{@render cell(feature.us)}</Table.Cell>
                        <Table.Cell class="align-top">{@render cell(feature.them)}</Table.Cell>
                    </Table.Row>
                {/each}
            </Table.Body>
        </Table.Root>
    </div>

    <div class="mb-10 grid gap-6 sm:grid-cols-2">
        <Card.Root>
            <Card.Header>
                <Card.Title class="text-base">Where {ours.slug} wins</Card.Title>
            </Card.Header>
            <Card.Content>
                <ul class="text-muted-foreground list-disc space-y-2 pl-4 text-sm">
                    {#each competitor.prosUs as pro (pro)}
                        <li>{pro}</li>
                    {/each}
                </ul>
            </Card.Content>
        </Card.Root>
        <Card.Root>
            <Card.Header>
                <Card.Title class="text-base">Where {competitor.name} wins</Card.Title>
            </Card.Header>
            <Card.Content>
                <ul class="text-muted-foreground list-disc space-y-2 pl-4 text-sm">
                    {#each competitor.prosThem as pro (pro)}
                        <li>{pro}</li>
                    {/each}
                </ul>
            </Card.Content>
        </Card.Root>
        <Card.Root>
            <Card.Header>
                <Card.Title class="text-base">Limitations of {ours.slug}</Card.Title>
            </Card.Header>
            <Card.Content>
                <ul class="text-muted-foreground list-disc space-y-2 pl-4 text-sm">
                    {#each competitor.consUs as con (con)}
                        <li>{con}</li>
                    {/each}
                </ul>
            </Card.Content>
        </Card.Root>
        <Card.Root>
            <Card.Header>
                <Card.Title class="text-base">Limitations of {competitor.name}</Card.Title>
            </Card.Header>
            <Card.Content>
                <ul class="text-muted-foreground list-disc space-y-2 pl-4 text-sm">
                    {#each competitor.consThem as con (con)}
                        <li>{con}</li>
                    {/each}
                </ul>
            </Card.Content>
        </Card.Root>
    </div>

    <div class="border-primary bg-muted/50 mb-10 rounded-lg border-l-4 p-6">
        <h2 class="mb-2 text-lg font-bold">Verdict</h2>
        <p class="text-muted-foreground leading-relaxed">{competitor.verdict}</p>
    </div>

    <div class="bg-muted/50 mb-10 rounded-lg border p-6">
        <h2 class="mb-2 text-lg font-bold">Try {ours.slug}</h2>
        <pre class="bg-background overflow-x-auto rounded border p-3 font-mono text-sm"><code
                >npm i -S {ours.npmPackage}</code
            ></pre>
        <p class="text-muted-foreground mt-3 text-sm">
            Then see it running in the <a
                href="/"
                class="text-primary underline underline-offset-4">live playground</a
            >.
        </p>
    </div>

    <Separator class="mb-6" />
    <h2 class="mb-4 text-lg font-bold">Other comparisons</h2>
    <ul class="space-y-2">
        {#each others as other (other.slug)}
            <li>
                <a
                    href="/compare/{other.slug}"
                    class="text-primary underline underline-offset-4"
                    >{ours.slug} vs {other.name.toLowerCase()}</a
                >
                <span class="text-muted-foreground text-sm">— {other.tagline}</span>
            </li>
        {/each}
    </ul>
</div>

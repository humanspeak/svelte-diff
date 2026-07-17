<script lang="ts">
    import { localStore } from '$lib/state/localStore.svelte'
    import { Textarea } from '$lib/shadcn/components/ui/textarea/index.js'
    import SvelteDiffMatchPatch, { type SvelteDiffMatchPatchTiming, type SvelteDiffMatchPatchDiff } from '@humanspeak/svelte-diff'
    import * as Card from '$lib/shadcn/components/ui/card/index.js'
    import MainContainer from '$lib/components/MainContainer.svelte'

      let originalText = $state(`I am the very model of a modern Major-General,
I've information vegetable, animal, and mineral,
I know the kings of England, and I quote the fights historical,
From Marathon to Waterloo, in order categorical.`)

    let modifiedText = $state(`I am the very model of a cartoon individual,
My animation's comical, unusual, and whimsical,
I'm quite adept at funny gags, comedic theory I have read,
From wicked puns and stupid jokes to anvils that drop on your head.`)

    let original = localStore<string>('original', originalText)
    let modified = localStore<string>('modified', modifiedText)
    let diffTimeout = localStore<number>('diffTimeout', 1)
    let cleanupSemantic = localStore<boolean>('cleanupSemantic', false)
    let cleanupEfficiency = localStore<number>('cleanupEfficiency', 4)


    const onProcessing = (timing: SvelteDiffMatchPatchTiming, diff: SvelteDiffMatchPatchDiff) => {
        console.log('timing', timing)
        console.log('diff', diff)
    }
</script>

<svelte:head>
    <title>Svelte Diff - High Performance Diff Match Patch for Svelte 5</title>
    <meta
        name="description"
        content="A powerful, customizable diff match patch for Svelte 5 with TypeScript support. Features include custom snippets, and extensive testing coverage."
    />

    <!-- Open Graph / Social Media -->
    <meta property="og:title" content="Svelte Diff - Modern Diff Match Patch for Svelte" />
    <meta
        property="og:description"
        content="Transform diff into Svelte components with support for custom snippets and TypeScript. Perfect for documentation, blogs, and content-rich applications."
    />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://diff.svelte.page" />
    <meta property="og:image" content="https://diff.svelte.page/svelte-diff-opengraph.png" />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Svelte Diff - TypeScript-Ready Parser" />
    <meta
        name="twitter:description"
        content="Build better documentation and content-rich applications with this modern Diff parser for Svelte 5"
    />
    <meta name="twitter:image" content="https://diff.svelte.page/svelte-diff-twitter.png" />

    <!-- Keywords -->
    <meta
        name="keywords"
        content="svelte, diff-match-patch, parser, typescript, svelte5, documentation, converter, component, sveltekit, formatting, content management"
    />

    <!-- Additional Meta -->
    <meta name="author" content="Humanspeak, Inc." />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="https://diff.svelte.page" />

    <!-- JSON-LD structured data -->
    <script type="application/ld+json">
        {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Svelte Diff",
            "applicationCategory": "DeveloperApplication",
            "operatingSystem": "Any",
            "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
            },
            "author": {
                "@type": "Organization",
                "name": "Humanspeak, Inc.",
                "url": "https://humanspeak.com"
            },
            "programmingLanguage": ["Svelte", "TypeScript"],
            "description": "A powerful diff parser for Svelte 5 that transforms text into diffs with TypeScript support and extensive testing coverage.",
            "license": "MIT",
            "url": "https://diff.svelte.page",
            "downloadUrl": "https://www.npmjs.com/package/@humanspeak/svelte-diff",
            "requirements": "Svelte 5.0 or higher",
            "releaseNotes": "https://github.com/humanspeak/svelte-diff/releases",
            "keywords": "svelte, diff-match-patch, parser, typescript, documentation"
        }
    </script>
</svelte:head>

<MainContainer>
    <div class="flex h-full w-full min-h-0">
        <div class="flex h-full justify-center p-4 min-h-0 w-full">
            <div class="grid h-full w-full min-h-0 grid-cols-[25%_25%_auto] gap-8">
                <div class="h-full min-h-0">
                    <Card.Root class="flex h-full flex-col gap-2">
                        <Card.Header>
                            <Card.Title>Editor</Card.Title>
                            <Card.Description>Edit the text to see the diff 🥰</Card.Description>
                        </Card.Header>
                        <Card.Content class="flex flex-1 flex-col gap-2">
                            <label for="original" class="block text-sm font-medium">Original</label>
                            <Textarea
                                bind:value={original.value}
                                id="original"
                                class="w-full flex-1 resize-none"
                            />
                            <label for="modified" class="block text-sm font-medium">Modified</label>
                            <Textarea
                                bind:value={modified.value}
                                id="modified"
                                class="w-full flex-1 resize-none"
                            />
                        </Card.Content>
                    </Card.Root>
                </div>
                <div class="h-full space-y-4">
                    <Card.Root class="flex h-full flex-col gap-2">
                        <Card.Header>
                            <Card.Title>Diff Settings</Card.Title>
                            <Card.Description>Configure the diff behavior ⚙️</Card.Description>
                        </Card.Header>
                        <Card.Content class="space-y-4">
                            <div>
                                <label for="diff-timeout" class="block text-sm font-medium mb-2">
                                    Diff timeout (seconds):
                                </label>
                                <input
                                    id="diff-timeout"
                                    type="number"
                                    bind:value={diffTimeout.value}
                                    min="0"
                                    step="0.1"
                                    class="w-24 p-2 border rounded"
                                />
                                <p class="text-sm text-muted-foreground mt-1">
                                    Timeout for diff computation. '0' allows unlimited computation.
                                </p>
                            </div>

                            <div>
                                <label class="block text-sm font-medium mb-2">Post-diff cleanup:</label>
                                <div class="space-y-2">
                                    <label class="flex items-center">
                                        <input type="radio" bind:group={cleanupSemantic.value} value={true} class="mr-2" />
                                        Semantic Cleanup
                                    </label>
                                    <p class="text-sm text-muted-foreground ml-6">
                                        Increase human readability by factoring out commonalities.
                                    </p>

                                    <label class="flex items-center">
                                        <input type="radio" bind:group={cleanupSemantic.value} value={false} class="mr-2" />
                                        Efficiency Cleanup
                                    </label>
                                    <div class="ml-6">
                                        <label for="edit-cost" class="text-sm">Edit cost:</label>
                                        <input
                                            id="edit-cost"
                                            type="number"
                                            bind:value={cleanupEfficiency.value}
                                            min="0"
                                            class="w-24 p-2 border rounded ml-2"
                                            disabled={cleanupSemantic.value}
                                        />
                                        <p class="text-sm text-muted-foreground mt-1">
                                            Higher values mean more aggressive cleanup.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </Card.Content>
                    </Card.Root>
                </div>

                <div class="h-auto min-h-max">
                    <Card.Root class="flex h-full w-full flex-col gap-2 gap-2">
                        <Card.Header>
                            <Card.Title>Diff Result</Card.Title>
                            <Card.Description>See the changes in real-time 👩🏼‍💻</Card.Description>
                        </Card.Header>
                        <Card.Content class="flex-1">
                            <div class="h-full w-full overflow-y-auto rounded-md border p-4 prose max-w-none">
                                <SvelteDiffMatchPatch
                                    originalText={original.value}
                                    modifiedText={modified.value}
                                    timeout={diffTimeout.value}
                                    cleanupSemantic={cleanupSemantic.value}
                                    cleanupEfficiency={cleanupEfficiency.value}
                                    {onProcessing}
                                    rendererClasses={{
                                        remove: 'diff-remove',
                                        insert: 'diff-insert',
                                        equal: 'diff-equal'
                                    }}
                                />
                            </div>
                        </Card.Content>
                    </Card.Root>
                </div>
            </div>
        </div>
    </div>
</MainContainer>

<style>
    :global(.diff-remove) {
        background-color: #ffd7d5;
        text-decoration: line-through;
    }
    :global(.diff-insert) {
        background-color: #d4ffd4;
    }

    :global(.dark .diff-remove) {
        background-color: #ff0000;
        text-decoration: line-through;
    }
    :global(.dark .diff-insert) {
        background-color: #00ff00;
    }
</style>

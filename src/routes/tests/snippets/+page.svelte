<script lang="ts">
    import SvelteDiffMatchPatch from '$lib/index.js'

    let text1 = $state(`I am the very model of a modern Major-General,
I've information vegetable, animal, and mineral,
I know the kings of England, and I quote the fights historical,
From Marathon to Waterloo, in order categorical.`)

    let text2 = $state(`I am the very model of a cartoon individual,
My animation's comical, unusual, and whimsical,
I'm quite adept at funny gags, comedic theory I have read,
From wicked puns and stupid jokes to anvils that drop on your head.`)

    let diffTimeout = $state(1)
    let cleanupSemantic = $state(false)
    let cleanupEfficiency = $state(4)
</script>

<div class="max-w-4xl mx-auto p-4 space-y-6">
    <h1 class="text-2xl font-bold mb-4">Diff, Match and Patch</h1>
    <h2 class="text-xl font-semibold mb-4">Demo of Diff</h2>

    <p class="mb-4">
        Diff takes two texts and finds the differences. This implementation works on a character by
        character basis. The result of any diff may contain 'chaff', irrelevant small commonalities
        which complicate the output. A post-diff cleanup algorithm factors out these trivial
        commonalities.
    </p>

    <div class="grid grid-cols-2 gap-4 mb-4">
        <div>
            <label for="text1" class="block text-sm font-medium mb-2">Text Version 1:</label>
            <textarea
                id="text1"
                data-testid="text1"
                bind:value={text1}
                class="w-full h-48 p-2 border rounded"
                rows="6"></textarea>
        </div>
        <div>
            <label for="text2" class="block text-sm font-medium mb-2">Text Version 2:</label>
            <textarea
                id="text2"
                data-testid="text2"
                bind:value={text2}
                class="w-full h-48 p-2 border rounded"
                rows="6"></textarea>
        </div>
    </div>

    <div class="space-y-4 mb-6">
        <div>
            <label for="diff-timeout" class="block text-sm font-medium mb-2"
                >Diff timeout (seconds):</label
            >
            <input
                id="diff-timeout"
                type="number"
                bind:value={diffTimeout}
                min="0"
                step="0.1"
                class="w-24 p-2 border rounded"
            />
            <p class="text-sm text-gray-600 mt-1">
                If the mapping phase of the diff computation takes longer than this, then the
                computation is truncated and the best solution to date is returned. While guaranteed
                to be correct, it may not be optimal. A timeout of '0' allows for unlimited
                computation.
            </p>
        </div>

        <div>
            <label for="post-diff-cleanup" class="block text-sm font-medium mb-2"
                >Post-diff cleanup:</label
            >
            <div class="space-y-2">
                <label for="semantic-cleanup" class="flex items-center">
                    <input type="radio" bind:group={cleanupSemantic} value={true} class="mr-2" />
                    Semantic Cleanup
                </label>
                <p class="text-sm text-gray-600 ml-6">
                    Increase human readability by factoring out commonalities which are likely to be
                    coincidental.
                </p>

                <label class="flex items-center">
                    <input type="radio" bind:group={cleanupSemantic} value={false} class="mr-2" />
                    Efficiency Cleanup
                </label>
                <div class="ml-6">
                    <label for="edit-cost" class="text-sm">Edit cost:</label>
                    <input
                        id="edit-cost"
                        type="number"
                        bind:value={cleanupEfficiency}
                        min="0"
                        class="w-24 p-2 border rounded ml-2"
                        disabled={cleanupSemantic}
                    />
                    <p class="text-sm text-gray-600 mt-1">
                        Increase computational efficiency by factoring out short commonalities which
                        are not worth the overhead. The larger the edit cost, the more aggressive
                        the cleanup.
                    </p>
                </div>
            </div>
        </div>
    </div>

    <div class="border rounded p-4 bg-white">
        <h3 class="text-lg font-medium mb-2">Diff Result:</h3>
        <div data-testid="diff-result" class="prose max-w-none">
            <SvelteDiffMatchPatch
                originalText={text1}
                modifiedText={text2}
                timeout={diffTimeout}
                {cleanupSemantic}
                {cleanupEfficiency}
            >
                {#snippet remove(text: string)}
                    <span class="diff-snippet-remove">{text}</span>
                {/snippet}
                {#snippet insert(text: string)}
                    <span class="diff-snippet-insert">{text}</span>
                {/snippet}
                {#snippet equal(text: string)}
                    <span class="diff-snippet-equal">{text}</span>
                {/snippet}
                {#snippet lineBreak()}
                    <br /><br />
                {/snippet}
            </SvelteDiffMatchPatch>
        </div>
    </div>
</div>

<style>
    :global(.diff-snippet-remove) {
        background-color: #ffd7d5;
        text-decoration: line-through;
    }
    :global(.diff-snippet-insert) {
        background-color: #d4ffd4;
    }
</style>

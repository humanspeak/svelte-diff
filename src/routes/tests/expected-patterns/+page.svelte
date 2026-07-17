<script lang="ts">
    import SvelteDiffMatchPatch from '$lib/index.js'

    let text1 = $state(`Copyright (?<year>\\d{4}) (?<holder>.+)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.`)

    let text2 = $state(`MIT License

Copyright (c) 2024 Humanspeak

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the 'Software'), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.`)
</script>

<div class="max-w-4xl mx-auto p-4 space-y-6">
    <h1 class="text-2xl font-bold mb-4">Expected Patterns Demo</h1>
    <h2 class="text-xl font-semibold mb-4">License Template Matching</h2>

    <p class="mb-4">
        This demo shows how named regex capture groups in the original text define "expected"
        variable regions. Matched regions render with distinct styling and hoverable tooltips
        showing the group name, while real deviations still show as insert/remove.
    </p>

    <div class="grid grid-cols-2 gap-4 mb-4">
        <div>
            <label for="text1" class="block text-sm font-medium mb-2"
                >Template (with capture groups):</label
            >
            <textarea
                id="text1"
                data-testid="text1"
                bind:value={text1}
                class="w-full h-48 p-2 border rounded font-mono text-sm"
                rows="10"></textarea>
        </div>
        <div>
            <label for="text2" class="block text-sm font-medium mb-2">Actual License:</label>
            <textarea
                id="text2"
                data-testid="text2"
                bind:value={text2}
                class="w-full h-48 p-2 border rounded font-mono text-sm"
                rows="10"></textarea>
        </div>
    </div>

    <div class="border rounded p-4 bg-white">
        <h3 class="text-lg font-medium mb-2">Diff Result:</h3>
        <div data-testid="diff-result" class="prose max-w-none">
            <SvelteDiffMatchPatch
                originalText={text1}
                modifiedText={text2}
                cleanupSemantic={true}
                rendererClasses={{
                    remove: 'diff-remove',
                    insert: 'diff-insert',
                    equal: 'diff-equal',
                    expected: 'diff-expected'
                }}
            />
        </div>
    </div>
</div>

<style>
    :global(.diff-remove) {
        background-color: #ffd7d5;
        text-decoration: line-through;
    }
    :global(.diff-insert) {
        background-color: #d4ffd4;
    }
    :global(.diff-expected) {
        background-color: #dbeafe;
        border-bottom: 1px dashed #3b82f6;
    }
</style>

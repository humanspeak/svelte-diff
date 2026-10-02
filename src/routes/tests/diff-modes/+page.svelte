<script lang="ts">
    import SvelteDiff, { type SvelteDiffMode } from '$lib/index.js'

    const initialLineOriginalText = 'count=10\r\nkeep=true\n'
    const initialLineModifiedText = 'count=20\r\nkeep=true\n'

    const literalSource = 'const pattern = /(?<year>\\d{4})/;'
    let expectedPatterns = $state(false)

    let originalText = $state('The cat sleeps.')
    let modifiedText = $state('The car sleeps.')
    let diffMode = $state<SvelteDiffMode>('character')
</script>

<h1>Diff modes</h1>
<section aria-label="Initial word">
    <SvelteDiff originalText="cat" modifiedText="car" diffMode="word">
        {#snippet remove(text)}<del>{text}</del>{/snippet}
        {#snippet insert(text)}<ins>{text}</ins>{/snippet}
    </SvelteDiff>
</section>
<section aria-label="Initial line">
    <SvelteDiff
        originalText={initialLineOriginalText}
        modifiedText={initialLineModifiedText}
        diffMode="line"
    >
        {#snippet remove(text)}<del>{text}</del>{/snippet}
        {#snippet insert(text)}<ins>{text}</ins>{/snippet}
        {#snippet lineBreak()}<br data-custom-break />{/snippet}
    </SvelteDiff>
</section>
<label>Before<textarea bind:value={originalText}></textarea></label>
<label>After<textarea bind:value={modifiedText}></textarea></label>
<label
    >Diff mode<select bind:value={diffMode}>
        <option value="character">Character</option><option value="word">Word</option><option
            value="line">Line</option
        >
    </select></label
>
<section aria-label="Interactive result">
    <SvelteDiff {originalText} {modifiedText} {diffMode} cleanupEfficiency={0}>
        {#snippet remove(text)}<del>{text}</del>{/snippet}
        {#snippet insert(text)}<ins>{text}</ins>{/snippet}
        {#snippet equal(text)}<span data-equal>{text}</span>{/snippet}
    </SvelteDiff>
</section>
<section aria-label="Default character">
    <SvelteDiff {originalText} {modifiedText} cleanupEfficiency={0}>
        {#snippet remove(text)}<del>{text}</del>{/snippet}
        {#snippet insert(text)}<ins>{text}</ins>{/snippet}
        {#snippet equal(text)}<span data-equal>{text}</span>{/snippet}
    </SvelteDiff>
</section>
<section aria-label="Compact equal text">
    <SvelteDiff originalText={modifiedText} {modifiedText} {diffMode} />
</section>
<section aria-label="Expected capture">
    <SvelteDiff
        originalText="Release (?<version>v\d+)"
        modifiedText="Release v2 ready"
        diffMode="line"
    >
        {#snippet remove(text)}<del>{text}</del>{/snippet}
        {#snippet insert(text)}<ins>{text}</ins>{/snippet}
        {#snippet expected(text, group)}<mark title={group}>{text}</mark>{/snippet}
    </SvelteDiff>
</section>

<section aria-label="Literal code">
    <SvelteDiff
        originalText={literalSource}
        modifiedText={literalSource}
        expectedPatterns={false}
        {diffMode}
    />
</section>
<label><input type="checkbox" bind:checked={expectedPatterns} />Enable template patterns</label>
<section aria-label="Template comparison">
    <SvelteDiff
        originalText={'Year (?<year>\\d{4})'}
        modifiedText="Year 2026"
        {expectedPatterns}
        {diffMode}
    >
        {#snippet remove(text)}<del>{text}</del>{/snippet}
        {#snippet insert(text)}<ins>{text}</ins>{/snippet}
    </SvelteDiff>
</section>

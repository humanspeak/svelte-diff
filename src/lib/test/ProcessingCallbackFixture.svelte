<script lang="ts">
    import SvelteDiff from '../SvelteDiff.svelte'

    const {
        observe,
        incrementOnProcessing = true
    }: {
        observe: (value: number) => void
        incrementOnProcessing?: boolean
    } = $props()

    let counter = $state(0)

    /** Bounds callback feedback to four notifications so regression tests cannot loop. */
    const handleProcessing: () => void = () => {
        observe(counter)
        if (incrementOnProcessing && counter < 3) counter += 1
    }
</script>

<SvelteDiff originalText="a" modifiedText="b" onProcessing={handleProcessing} />
<output data-testid="counter">{counter}</output>
<button onclick={() => (counter += 1)}>Increment counter</button>

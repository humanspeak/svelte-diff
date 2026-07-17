<script lang="ts">
    import MainContainer from '$lib/components/MainContainer.svelte'

    const { children } = $props()
</script>

<MainContainer>
    {@render children?.()}
</MainContainer>

<script lang="ts">
    import '../app.css'
    import { ModeWatcher } from 'mode-watcher'

    const { children } = $props()
</script>

<!-- Per-page <svelte:head> lives in each route (the homepage carries the
     site-default meta) so nested pages like /compare/* can set their own
     titles and canonicals without duplicate tags. -->
<ModeWatcher />

{@render children?.()}

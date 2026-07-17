<script lang="ts">
    import { Button } from '$lib/shadcn/components/ui/button'
    import { mode } from 'mode-watcher'
    import ModeChanger from './ModeChanger.svelte'
    import * as Sidebar from '$lib/shadcn/components/ui/sidebar/index.js'
</script>

<div class="grid grid-cols-3 items-center">
    <div class="flex justify-start">
        <Sidebar.Trigger />
    </div>
    <!-- Empty left column -->
    <h1 class="text-center text-4xl font-extrabold">
        <div class="flex w-full items-center justify-center gap-2">
            {#if mode.current === 'dark'}
                <img src="/humanspeak-dark.svg" alt="humanspeak logo" class="h-10" />
            {:else}
                <img src="/humanspeak.svg" alt="humanspeak logo" class="h-10" />
            {/if}
            <span>/diff</span>
        </div>
    </h1>
    <div class="flex items-center justify-end">
        <Button variant="ghost" href="/compare" class="font-mono text-sm">compare</Button>
        <ModeChanger />
        <Button
            variant="ghost"
            size="icon"
            href="https://github.com/humanspeak/svelte-diff"
            target="_blank"
        >
            <i class="fa-brands fa-github text-xl"></i>
        </Button>
        <Button
            variant="ghost"
            size="icon"
            href="https://www.npmjs.com/package/@humanspeak/svelte-diff"
            target="_blank"
        >
            <i class="fa-brands fa-npm text-xl"></i>
        </Button>
    </div>
</div>

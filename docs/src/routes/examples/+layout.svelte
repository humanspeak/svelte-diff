<script lang="ts">
    import { ExampleLayoutV2, PagerV2, enhanceCodeBlocks } from '@humanspeak/docs-kit'
    import { examples } from '$lib/examplesIndex'
    import favicon from '$lib/assets/logo.svg'
    import { docsConfig } from '$lib/docs-config'
    import { buildBreadcrumbs, headerNav } from '$lib/docsNav'
    import rootPkg from '../../../../package.json'
    import '@fontsource-variable/inter/index.css'
    import '@fontsource-variable/jetbrains-mono/index.css'

    const { children } = $props()
    const pagerItems = examples.map(({ slug }) => ({ href: `/examples/${slug}`, label: `${slug}.` }))
</script>

<ExampleLayoutV2
    config={docsConfig}
    {favicon}
    version={rootPkg.version}
    nav={headerNav}
    breadcrumbResolver={buildBreadcrumbs}
>
    <div class="flex flex-1 flex-col" use:enhanceCodeBlocks>
        {@render children?.()}
        <PagerV2 items={pagerItems} ariaLabel="Example pagination" />
    </div>
</ExampleLayoutV2>

<style>
    /* A long lede must not stretch a short demo into an empty bordered column. */
    :global(.dk-ex-panel) {
        align-self: start;
        width: 100%;
    }

    @media (max-width: 720px) {
        :global(.dk-ex) {
            min-width: 0;
            max-width: 100vw;
            overflow: hidden;
        }

        :global(.dk-ex-panel) {
            min-width: 0;
            max-width: 100%;
        }

        :global(.dk-ex .dk-ex-bar) {
            gap: 8px 12px;
        }

        :global(.dk-ex .dk-ex-bar-grow) {
            display: none;
        }

        :global(.dk-ex .dk-ex-foot-cell.right) {
            width: 100%;
            margin-left: 0;
        }
    }
</style>

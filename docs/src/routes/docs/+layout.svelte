<script lang="ts">
    import { DocsLayoutV2 } from '@humanspeak/docs-kit'
    import favicon from '$lib/assets/logo.svg'
    import { docsConfig } from '$lib/docs-config'
    import { buildBreadcrumbs, docsSections, headerNav } from '$lib/docsNav'
    import sitemapManifest from '$lib/sitemap-manifest.json'
    import rootPkg from '../../../../package.json'
    import '@fontsource-variable/inter/index.css'
    import '@fontsource-variable/jetbrains-mono/index.css'

    const { children, data } = $props()
</script>

<DocsLayoutV2
    config={docsConfig}
    {favicon}
    sections={docsSections}
    otherProjects={data.otherProjects}
    version={rootPkg.version}
    nav={headerNav}
    siteUrl={docsConfig.url}
    breadcrumbResolver={buildBreadcrumbs}
    sitemapManifest={sitemapManifest as Record<string, string>}
>
    {@render children()}
</DocsLayoutV2>

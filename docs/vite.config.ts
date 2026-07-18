import {
    demoManifestPlugin,
    docMirrorsPlugin,
    exampleMirrorsPlugin,
    indexNowPlugin,
    llmsFullPlugin,
    llmsPlugin,
    sitemapManifestPlugin,
    socialCardsPlugin
} from '@humanspeak/docs-kit/vite'
import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

import { competitors } from './src/lib/compare-data'
import { docsConfig } from './src/lib/docs-config'

const indexNowKey = '3f47a8d0c1be4b0ca5f8d7e2a9136c44'

export default defineConfig({
    plugins: [
        sitemapManifestPlugin({
            blogDir: false,
            extraPages: competitors.map((competitor) => ({
                route: `/compare/${competitor.slug}`,
                source: 'src/lib/compare-data.ts'
            }))
        }),
        demoManifestPlugin({ split: true }),
        docMirrorsPlugin({ siteUrl: docsConfig.url }),
        exampleMirrorsPlugin({
            siteUrl: docsConfig.url,
            sourceBaseUrl: 'https://github.com/humanspeak/svelte-diff/blob/main/docs'
        }),
        llmsFullPlugin({
            siteUrl: docsConfig.url,
            pkgName: docsConfig.npmPackage,
            prepend: 'static/llms-prepend.md',
            append: 'static/llms-append.md'
        }),
        llmsPlugin({
            siteUrl: docsConfig.url,
            pkgName: docsConfig.name,
            description:
                'A Svelte 5 text-diff component with semantic cleanup, expected-pattern matching, typed custom renderers, reactive updates, and timing callbacks.',
            prepend: 'static/llms-prepend.md',
            append: 'static/llms-append.md'
        }),
        socialCardsPlugin({
            npmPackage: docsConfig.npmPackage,
            defaultTitle: docsConfig.name,
            defaultDescription:
                'Readable, reactive text diffs for Svelte 5 with full rendering control.',
            defaultFeatures: docsConfig.defaultFeatures,
            extraPages: [
                {
                    ogSlug: 'compare',
                    ogTitle: 'Compare',
                    ogTagline: 'Honest comparisons with the major JavaScript diff options.',
                    ogFeatures: ['Feature Matrices', 'Pros & Cons', 'Use-Case Guidance']
                },
                ...competitors.map((competitor) => ({
                    ogSlug: `compare-${competitor.slug}`,
                    ogTitle: `vs ${competitor.name}`,
                    ogTagline: competitor.tagline,
                    ogFeatures: [
                        'Feature Comparison',
                        'Pros & Cons',
                        'Use-Case Guidance',
                        'Honest Verdict'
                    ]
                }))
            ]
        }),
        indexNowPlugin({
            siteUrl: docsConfig.url,
            key: indexNowKey,
            productionMode: 'indexnow',
            failOnError: false
        }),
        tailwindcss(),
        sveltekit()
    ],
    server: {
        port: 8523,
        fs: { allow: ['..'] }
    },
    optimizeDeps: {
        exclude: [
            '@humanspeak/docs-kit',
            '@humanspeak/svelte-satori-fix',
            '@resvg/resvg-js',
            'satori',
            'satori-html'
        ]
    }
})

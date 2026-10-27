import { rehypeKeepCase } from '@humanspeak/docs-kit/mdsvex'
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
import adapter from '@sveltejs/adapter-cloudflare'
import { sveltekit } from '@sveltejs/kit/vite'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import { mdsvex } from 'mdsvex'
import { createHighlighter } from 'shiki'
import { defineConfig } from 'vite'

import { competitors, ours } from './src/lib/compare-data.js'
import { docsConfig } from './src/lib/docs-config.js'

const indexNowKey = '3f47a8d0c1be4b0ca5f8d7e2a9136c44'

const highlighter = await createHighlighter({
    themes: ['github-light', 'one-dark-pro'],
    langs: [
        'javascript',
        'typescript',
        'html',
        'svelte',
        'css',
        'json',
        'bash',
        'shell',
        'markdown',
        'diff'
    ]
})

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
            comparisons: { ours, competitors },
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
        sveltekit({
            preprocess: [
                vitePreprocess(),
                mdsvex({
                    rehypePlugins: [rehypeKeepCase],
                    extensions: ['.md', '.svx'],
                    highlight: {
                        highlighter: async (code, lang) => {
                            lang ??= 'text'
                            const lightHtml = highlighter.codeToHtml(code, {
                                lang,
                                theme: 'github-light'
                            })
                            const darkHtml = highlighter.codeToHtml(code, {
                                lang,
                                theme: 'one-dark-pro'
                            })
                            const encoded = Buffer.from(code).toString('base64')
                            const combinedHtml = `<div class="shiki-container" data-code="${encoded}" data-lang="${lang}"><div class="shiki-light">${lightHtml}</div><div class="shiki-dark">${darkHtml}</div></div>`
                            return `{@html ${JSON.stringify(combinedHtml)}}`
                        }
                    }
                })
            ],
            extensions: ['.svelte', '.svx'],
            adapter: adapter(),
            csp: {
                mode: 'hash',
                directives: {
                    'default-src': ['self'],
                    'script-src': ['self', 'unsafe-inline', 'https://j.svelte.page'],
                    'style-src': ['self', 'unsafe-inline'],
                    'img-src': ['self', 'data:', 'https:'],
                    'font-src': ['self', 'data:'],
                    'connect-src': ['self', 'https:'],
                    'frame-ancestors': ['none'],
                    'form-action': ['self'],
                    'base-uri': ['self'],
                    'upgrade-insecure-requests': true
                }
            }
        })
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

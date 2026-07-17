# Svelte Diff documentation

The Brutist v2 documentation site for [`@humanspeak/svelte-diff`](https://www.npmjs.com/package/@humanspeak/svelte-diff), built with SvelteKit and [`@humanspeak/docs-kit`](https://github.com/humanspeak/docs-kit).

## Development

From the repository root:

```bash
pnpm install
pnpm --filter docs dev
```

The local server runs on <http://localhost:8235>.

## Verification

```bash
pnpm --filter docs check
pnpm --filter docs build
```

The production build also regenerates:

- the route-driven sitemap manifest and `/sitemap.xml`
- Markdown mirrors under `/docs/*.md` and `/examples/*.md`
- `/llms.txt` and `/llms-full.txt`
- Open Graph and Twitter social cards
- GitHub star data used by the shared site chrome

## Deployment

The site targets Cloudflare Workers through `@sveltejs/adapter-cloudflare`.

```bash
pnpm --filter docs deploy
```

The deploy build uses Vite's `indexnow` mode, which submits the generated route manifest to IndexNow on a best-effort basis.

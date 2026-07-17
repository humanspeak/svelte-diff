import { fetchGitHubStats } from '@humanspeak/docs-kit/scripts/fetch-github-stats'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { docsConfig } from '../src/lib/docs-config'

const directory = path.dirname(fileURLToPath(import.meta.url))

await fetchGitHubStats({
    repo: docsConfig.repo,
    fallbackStars: docsConfig.fallbackStars,
    outputPath: path.resolve(directory, '..', 'src', 'lib', 'github-stats.json')
})

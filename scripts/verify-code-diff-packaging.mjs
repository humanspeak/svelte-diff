import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** Run a named package-manager gate, retaining tool output on failure.
 * @param {string[]} args
 * @param {string} cwd
 * @returns {string}
 */
const pnpm = (args, cwd) => {
    try {
        return execFileSync('pnpm', args, {
            cwd,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe']
        })
    } catch (error) {
        if (error instanceof Error) {
            const failure = /** @type {Error & { stdout?: string; stderr?: string }} */ (error)
            throw new Error(
                `pnpm ${args.join(' ')} failed in ${cwd}\n${failure.stdout ?? ''}\n${failure.stderr ?? ''}`,
                { cause: error }
            )
        }
        throw error
    }
}

/** Read a JSON file.
 * @param {string} path
 * @returns {Promise<ReturnType<typeof JSON.parse>>}
 */
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'))

/** Use the installed framework versions rather than floating fixture majors.
 * @param {string} name
 * @returns {Promise<string>}
 */
const installedVersion = async (name) =>
    (await readJson(join(repository, 'node_modules', name, 'package.json'))).version

/** Check local root declaration imports recursively, without loading Svelte in Node.
 * @param {string} path
 * @param {Set<string>} [seen]
 * @returns {Promise<void>}
 */
const checkTextDeclarations = async (path, seen = new Set()) => {
    if (seen.has(path)) return
    seen.add(path)
    const source = await readFile(path, 'utf8')
    assert(
        !source.includes('@tanstack/highlight'),
        `Optional peer leaked into root declarations: ${path}`
    )
    for (const match of source.matchAll(/(?:from\s+|import\()['"](\.[^'"]+)['"]/g)) {
        const relative = match[1].replace(/\.js$/, '.d.ts')
        const dependency = resolve(
            dirname(path),
            relative.endsWith('.svelte') ? `${relative}.d.ts` : relative
        )
        if (existsSync(dependency)) await checkTextDeclarations(dependency, seen)
    }
}

/** Install and build one isolated Svelte consumer, then inspect emitted modules.
 * @param {string} directory
 * @param {string} artifact
 * @param {Record<string, string>} framework
 * @param {boolean} code
 * @returns {Promise<void>}
 */
const consumer = async (directory, artifact, framework, code) => {
    await writeFile(
        join(directory, 'package.json'),
        JSON.stringify(
            {
                name: code ? 'code-consumer' : 'text-consumer',
                private: true,
                type: 'module',
                dependencies: {
                    '@humanspeak/svelte-diff': `file:${artifact}`,
                    svelte: framework.svelte,
                    ...(code ? { '@tanstack/highlight': '1.0.0' } : {})
                },
                devDependencies: {
                    vite: framework.vite,
                    '@sveltejs/vite-plugin-svelte': framework['@sveltejs/vite-plugin-svelte']
                }
            },
            null,
            2
        )
    )
    // Preserve the repository safeguards, including only its exact TanStack exception.
    const policy = await readFile(join(repository, 'pnpm-workspace.yaml'), 'utf8')
    await writeFile(
        join(directory, 'pnpm-workspace.yaml'),
        policy.replace(/packages:\n(?:[ \t]+-[^\n]*\n)+/, 'packages:\n    - .\n')
    )
    await writeFile(
        join(directory, 'index.html'),
        '<!doctype html><html><head><title>Package consumer</title></head><body><div id="app"></div><script type="module" src="/main.js"></script></body></html>'
    )
    await writeFile(
        join(directory, 'main.js'),
        "import { mount } from 'svelte'; import App from './App.svelte'; mount(App, { target: document.getElementById('app') });"
    )
    await writeFile(
        join(directory, 'App.svelte'),
        code
            ? `<script>
import CodeDiff from '@humanspeak/svelte-diff/code';
import { createHighlighter } from '@tanstack/highlight/core';
import { ts } from '@tanstack/highlight/languages/ts';
const highlighter = createHighlighter({ languages: [ts] });
</script>
<CodeDiff originalText={'const x = 1;'} modifiedText={'const x = 2;'} language="typescript" {highlighter} />`
            : `<script>import SvelteDiff from '@humanspeak/svelte-diff';</script><SvelteDiff originalText="cat" modifiedText="car" />`
    )
    await writeFile(
        join(directory, 'vite.config.js'),
        `import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
export default defineConfig({ plugins: [svelte(), {
    name: 'emitted-module-report',
    generateBundle(_options, bundle) {
        const chunks = Object.values(bundle).filter((output) => output.type === 'chunk');
        const reports = chunks.map((chunk) => ({ file: chunk.fileName,
            modules: Object.keys(chunk.modules || {}), moduleIds: chunk.moduleIds || [] }));
        this.emitFile({ type: 'asset', fileName: 'module-report.json', source: JSON.stringify({ chunks: reports, graph: [...this.getModuleIds()] }) });
    }
}] });`
    )
    pnpm(['install'], directory)
    const require = createRequire(join(directory, 'package.json'))
    const installed = await readdir(join(directory, 'node_modules', '.pnpm'))
    if (!code) {
        assert(
            !installed.some((entry) => entry.startsWith('@tanstack+highlight@')),
            'STOP: text consumer installed optional TanStack peer'
        )
        assert.throws(
            () => require.resolve('@tanstack/highlight/core'),
            'Text consumer can resolve optional peer'
        )
        const manifest = await readJson(
            join(directory, 'node_modules', '@humanspeak/svelte-diff/package.json')
        )
        assert.equal(manifest.peerDependenciesMeta['@tanstack/highlight'].optional, true)
        assert(!manifest.dependencies['@tanstack/highlight'])
        await checkTextDeclarations(
            join(directory, 'node_modules', '@humanspeak/svelte-diff/dist/index.d.ts')
        )
    } else {
        assert.equal(
            (await readJson(join(directory, 'node_modules/@tanstack/highlight/package.json')))
                .version,
            '1.0.0'
        )
    }
    pnpm(['exec', 'vite', 'build'], directory)
    const report = await readJson(join(directory, 'dist/module-report.json'))
    /** @type {string[]} */
    const modules = report.chunks.flatMap(
        (/** @type {{ modules: string[]; moduleIds: string[] }} */ chunk) =>
            chunk.modules.length ? chunk.modules : chunk.moduleIds
    )
    assert(
        modules.length > 0,
        'STOP: bundler emitted no module identifiers; inspect Vite/Rolldown report'
    )
    const normalize = (/** @type {string} */ id) => id.replaceAll('\\', '/')
    const tanstack = modules
        .map(normalize)
        .filter((id) => id.includes('@tanstack/highlight/') || id.includes('@tanstack+highlight@'))
    const graph = report.graph
        .map(normalize)
        .filter(
            (/** @type {string} */ id) =>
                id.includes('@tanstack/highlight/') || id.includes('@tanstack+highlight@')
        )
    if (!code) {
        assert.equal(tanstack.length, 0, `Text bundle contains TanStack: ${tanstack.join('\n')}`)
        assert.equal(graph.length, 0, `Text build resolved TanStack: ${graph.join('\n')}`)
        console.log(
            'PASS text-only isolation: optional peer absent, root declarations clean, no emitted/resolved TanStack module'
        )
    } else {
        assert(
            tanstack.some((id) => /\/dist\/languages\/ts\.js(?:\?|$)/.test(id)),
            'STOP: emitted TS module missing; inspect module-report.json for bundler reporting changes'
        )
        assert(
            tanstack.some((id) => /\/dist\/core\.js(?:\?|$)/.test(id)),
            'Emitted core module missing'
        )
        for (const id of [...tanstack, ...graph]) {
            assert(!/\/dist\/index\.js(?:\?|$)/.test(id), `All-language root present: ${id}`)
            assert(
                !/\/dist\/languages\/(?!ts\.js(?:\?|$))/.test(id),
                `Unregistered language present: ${id}`
            )
        }
        console.log(
            'PASS selective code-language bundling: exact TanStack 1.0.0, individual TS only, no all-language root'
        )
    }
}

const temporary = await mkdtemp(join(tmpdir(), 'svelte-code-diff-packaging-'))
try {
    const framework = Object.fromEntries(
        await Promise.all(
            ['svelte', 'vite', '@sveltejs/vite-plugin-svelte'].map(async (name) => [
                name,
                await installedVersion(name)
            ])
        )
    )
    pnpm(['run', 'package'], repository)
    const artifact = join(temporary, 'svelte-diff.tgz')
    const packed = pnpm(['pack', '--out', artifact, '--json'], repository)
    assert(existsSync(artifact), `pnpm pack did not create ${artifact}: ${packed}`)
    for (const code of [false, true]) {
        const directory = join(temporary, code ? 'code' : 'text')
        await mkdir(directory)
        await consumer(directory, artifact, framework, code)
    }
} finally {
    await rm(temporary, { recursive: true, force: true })
}

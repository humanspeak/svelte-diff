import console from 'node:console'
import { appendFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import {
    cleanup,
    createRelease,
    initialize,
    pushArtifacts,
    readState,
    selectTagBaseline,
    transport,
    writeState
} from './release-publication.mjs'

const requireValue = (condition, message) => {
    if (!condition) throw new Error(message)
}
const run = (exec, command, args) => {
    const result = exec(command, args)
    requireValue(result.code === 0, `${command} operation failed; reconcile identifiers manually`)
    return result.stdout.trim()
}
export const nextCalver = (tags, date) => {
    const year = date.getUTCFullYear(),
        month = date.getUTCMonth() + 1
    requireValue(year >= 2000 && year < 10000, 'Invalid release date')
    let highest = 0
    for (const row of tags.trim().split('\n').filter(Boolean)) {
        const match = row.match(/^[a-f0-9]{40}\s+refs\/tags\/(\d+)\.(\d+)\.(\d+)(\^\{\})?$/)
        if (!match) {
            // Foreign tags are allowed, but a malformed tag in this month is ambiguous.
            requireValue(
                !row.includes(`refs/tags/${year}.${month}.`),
                'Malformed monthly CalVer tag'
            )
            continue
        }
        if (Number(match[1]) === year && Number(match[2]) === month) {
            const micro = Number(match[3])
            requireValue(Number.isSafeInteger(micro) && micro > 0, 'Invalid CalVer micro')
            highest = Math.max(highest, micro)
        }
    }
    requireValue(Number.isSafeInteger(highest + 1), 'CalVer micro exhausted')
    return `${year}.${month}.${highest + 1}`
}
export const createOwnedCalverTag = (path, identity, date = new Date(), exec = transport) => {
    const state = readState(path, identity)
    requireValue(state.version === null && state.tag === 'not-attempted', 'Tag already attempted')
    const tags = run(exec, 'git', ['ls-remote', '--tags', 'origin'])
    const version = nextCalver(tags, date)
    run(exec, 'git', ['fetch', '--no-tags', 'origin', 'refs/heads/main'])
    requireValue(
        run(exec, 'git', ['rev-parse', 'FETCH_HEAD']) === state.base,
        'Stale tested CalVer baseline'
    )
    requireValue(run(exec, 'git', ['rev-parse', 'HEAD']) === state.base, 'Untested CalVer checkout')
    state.scheme = 'calver'
    state.version = version
    state.commit = state.base
    run(exec, 'git', ['tag', '-a', version, '-m', `Release ${version}`])
    state.tagOid = run(exec, 'git', ['rev-parse', `refs/tags/${version}`])
    requireValue(
        run(exec, 'git', ['cat-file', '-t', state.tagOid]) === 'tag',
        'Annotated tag required'
    )
    requireValue(
        run(exec, 'git', ['rev-parse', `refs/tags/${version}^{}`]) === state.base,
        'Invalid CalVer tag target'
    )
    writeState(path, state, identity)
    return version
}

const cli = () => {
    const env = process.env
    const identity = { run: env.GITHUB_RUN_ID, attempt: env.GITHUB_RUN_ATTEMPT }
    const path = env.RELEASE_STATE
    const output = (key, value) => appendFileSync(env.GITHUB_OUTPUT, `${key}=${value}\n`)
    switch (process.argv[2]) {
        case 'prepare': {
            let skip = false
            if (env.EVENT_NAME === 'push') {
                const prs = JSON.parse(
                    run(transport, 'gh', [
                        'api',
                        `repos/${env.GITHUB_REPOSITORY}/commits/${env.EVENT_SHA}/pulls`
                    ])
                )
                requireValue(Array.isArray(prs), 'Malformed original-event PR lookup')
                skip = prs.some(
                    (pr) =>
                        pr.merged_at && pr.labels?.some((label) => label.name === 'skip-publish')
                )
            }
            const result = selectTagBaseline({
                event: env.EVENT_NAME,
                eventSha: env.EVENT_SHA,
                ref: env.EVENT_REF,
                skip
            })
            output('ready', result.ready)
            output('checkout_sha', result.checkoutSha || '')
            console.log(
                `${result.outcome}: ${result.checkoutSha || 'no release; retry from current main'}`
            )
            break
        }
        case 'begin': {
            const result = initialize(path, identity, env.PREPARED_SHA)
            output('ready', result.ready)
            break
        }
        case 'tag':
            output('tag', createOwnedCalverTag(path, identity))
            break
        case 'push':
            pushArtifacts(path, identity)
            break
        case 'release':
            createRelease(path, identity, '', transport, true)
            break
        case 'cleanup':
            cleanup(path, identity, env.RELEASE_SUCCESS === 'success')
            break
        default:
            throw new Error('Unsupported CalVer release operation')
    }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try {
        cli()
    } catch (error) {
        console.error(
            `CalVer release stopped: ${error instanceof SyntaxError ? 'malformed response' : error.code ? 'state operation failed' : error.message}`
        )
        process.exitCode = 1
    }
}

import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { URL } from 'node:url'
import { createOwnedCalverTag, nextCalver } from './calver-release.mjs'
import { pushArtifacts, readState, selectTagBaseline } from './release-publication.mjs'

const sha = 'a'.repeat(40),
    oid = 'b'.repeat(40),
    newer = 'c'.repeat(40)
const identity = { run: '17', attempt: '2' }
const date = new Date('2026-10-02T01:00:00Z')
const fixture = (t, changes = {}) => {
    const dir = mkdtempSync(join(tmpdir(), 'calver-release-'))
    t.after(() => rmSync(dir, { recursive: true, force: true }))
    const path = join(dir, 'state.json')
    writeFileSync(
        path,
        JSON.stringify({
            ...identity,
            base: sha,
            version: null,
            commit: null,
            tagOid: null,
            tag: 'not-attempted',
            release: 'not-attempted',
            releaseId: null,
            registry: 'not-attempted',
            canonical: false,
            ...changes
        })
    )
    return path
}
const scripted = (expected) => {
    let index = 0
    return {
        exec: (command, args) => {
            const row = expected[index++]
            assert.ok(row, 'Unexpected transport call')
            assert.deepEqual([command, ...args], row[0])
            return { code: 0, stdout: '', ...row[1] }
        },
        done: () => assert.equal(index, expected.length)
    }
}
const fetch = (head) => [
    [['git', 'fetch', '--no-tags', 'origin', 'refs/heads/main'], {}],
    [['git', 'rev-parse', 'FETCH_HEAD'], { stdout: head }]
]

test('CalVer selects UTC month and highest remote micro, rejecting malformed monthly identities', () => {
    assert.equal(nextCalver('', date), '2026.10.1')
    assert.equal(
        nextCalver(
            `${sha}\trefs/tags/2026.10.2\n${oid}\trefs/tags/2026.10.11\n${sha}\trefs/tags/2026.10.11^{}\n`,
            date
        ),
        '2026.10.12'
    )
    assert.equal(
        nextCalver(`${sha}\trefs/tags/foreign\n${sha}\trefs/tags/2026.9.99\n`, date),
        '2026.10.1'
    )
    assert.throws(() => nextCalver('bad refs/tags/2026.10.2', date))
    assert.throws(() => nextCalver(`${sha}\trefs/tags/2026.10.9007199254740992`, date))
})

test('CalVer automatic stale baseline skips all advancement; manual main resolves before testing', () => {
    const input = { event: 'push', eventSha: sha, ref: 'refs/heads/main', skip: false }
    const stale = scripted(fetch(newer))
    assert.equal(selectTagBaseline(input, stale.exec).outcome, 'stale')
    stale.done()
    const manual = scripted(fetch(newer))
    assert.equal(
        selectTagBaseline({ ...input, event: 'workflow_dispatch' }, manual.exec).checkoutSha,
        newer
    )
    manual.done()
    const none = scripted([])
    assert.equal(selectTagBaseline({ ...input, skip: true }, none.exec).ready, false)
    assert.equal(selectTagBaseline({ ...input, ref: 'refs/heads/feature' }, none.exec).ready, false)
    none.done()
})

test('CalVer main recheck occurs before tag mutation and stale run creates nothing', (t) => {
    const path = fixture(t)
    const stale = scripted([[['git', 'ls-remote', '--tags', 'origin'], {}], ...fetch(newer)])
    assert.throws(() => createOwnedCalverTag(path, identity, date, stale.exec), /Stale tested/)
    stale.done()
    assert.equal(readState(path, identity).version, null)
})

test('CalVer records exact annotated tag and tested commit without a version commit', (t) => {
    const path = fixture(t)
    const mock = scripted([
        [['git', 'ls-remote', '--tags', 'origin'], {}],
        ...fetch(sha),
        [['git', 'rev-parse', 'HEAD'], { stdout: sha }],
        [['git', 'tag', '-a', '2026.10.1', '-m', 'Release 2026.10.1'], {}],
        [['git', 'rev-parse', 'refs/tags/2026.10.1'], { stdout: oid }],
        [['git', 'cat-file', '-t', oid], { stdout: 'tag' }],
        [['git', 'rev-parse', 'refs/tags/2026.10.1^{}'], { stdout: sha }]
    ])
    assert.equal(createOwnedCalverTag(path, identity, date, mock.exec), '2026.10.1')
    mock.done()
    assert.equal(readState(path, identity).scheme, 'calver')
    assert.equal(readState(path, identity).commit, sha)
    assert.equal(readState(path, identity).tagOid, oid)
})

test('CalVer push publishes only intended tag and forbids untested commit', (t) => {
    const path = fixture(t, { scheme: 'calver', version: '2026.10.1', commit: sha, tagOid: oid })
    const mock = scripted([
        [['git', 'ls-remote', 'origin', 'refs/tags/2026.10.1', 'refs/tags/2026.10.1^{}'], {}],
        [
            ['gh', 'api', '--include', 'repos/{owner}/{repo}/releases/tags/2026.10.1'],
            { code: 1, stdout: 'HTTP/2.0 404 Not found\r\nContent-Type: application/json\r\n\r\n' }
        ],
        [
            ['git', 'push', '--porcelain', 'origin', 'refs/tags/2026.10.1:refs/tags/2026.10.1'],
            { stdout: '*\trefs/tags/2026.10.1:refs/tags/2026.10.1\t[new tag]\n' }
        ],
        [
            ['git', 'ls-remote', 'origin', 'refs/tags/2026.10.1', 'refs/tags/2026.10.1^{}'],
            { stdout: `${oid}\trefs/tags/2026.10.1\n${sha}\trefs/tags/2026.10.1^{}\n` }
        ]
    ])
    pushArtifacts(path, identity, mock.exec)
    mock.done()
    assert.equal(readState(path, identity).tag, 'created')
    const wrong = fixture(t, { scheme: 'calver', version: '2026.10.1', commit: newer, tagOid: oid })
    const reject = scripted([
        [['git', 'ls-remote', 'origin', 'refs/tags/2026.10.1', 'refs/tags/2026.10.1^{}'], {}],
        [
            ['gh', 'api', '--include', 'repos/{owner}/{repo}/releases/tags/2026.10.1'],
            { code: 1, stdout: 'HTTP/2.0 404 Not found\r\nContent-Type: application/json\r\n\r\n' }
        ]
    ])
    assert.throws(() => pushArtifacts(wrong, identity, reject.exec), /Untested CalVer/)
    reject.done()
})

test('CalVer workflow tests and releases one baseline without package mutation or registry publication', () => {
    const policy = JSON.parse(
        readFileSync(new URL('../release-policy.json', import.meta.url), 'utf8')
    )
    if (policy.event !== 'calver') return
    const workflow = readFileSync(new URL('../workflows/release.yml', import.meta.url), 'utf8')
    assert.match(workflow, /group: repository-release\n {4}cancel-in-progress: false/)
    assert.match(workflow, /ref: \$\{\{ needs.prepare.outputs.checkout_sha \}\}/)
    assert.ok(workflow.indexOf('pnpm run check') < workflow.indexOf('pnpm build'))
    assert.ok(workflow.indexOf('.mjs begin') < workflow.indexOf('.mjs tag'))
    assert.ok(workflow.indexOf('.mjs push') < workflow.indexOf('.mjs release'))
    assert.match(workflow, /steps.created.outcome != 'success'/)
    assert.ok(!/pnpm version|pnpm publish|git push --tags|gh release delete/.test(workflow))
})

test('CalVer release creation preserves generated notes and records numeric ownership', async (t) => {
    const { createRelease } = await import('./release-publication.mjs')
    const path = fixture(t, {
        scheme: 'calver',
        version: '2026.10.1',
        commit: sha,
        tagOid: oid,
        tag: 'created'
    })
    let calls = 0
    createRelease(
        path,
        identity,
        '',
        (command, args) => {
            assert.equal(command, 'gh')
            if (++calls === 1) {
                assert.deepEqual(args, [
                    'api',
                    '--include',
                    'repos/{owner}/{repo}/releases/tags/2026.10.1'
                ])
                return {
                    code: 1,
                    stdout: 'HTTP/2.0 404 Fixture\r\nContent-Type: application/json\r\n\r\n'
                }
            }
            assert.deepEqual(args, [
                'api',
                '--include',
                '--method',
                'POST',
                'repos/{owner}/{repo}/releases',
                '--input',
                `${path}.request.json`
            ])
            const request = JSON.parse(readFileSync(`${path}.request.json`, 'utf8'))
            assert.equal(request.generate_release_notes, true)
            assert.equal(request.target_commitish, sha)
            assert.ok(!Object.hasOwn(request, 'body'))
            return {
                code: 0,
                stdout: `HTTP/2.0 201 Fixture\r\nContent-Type: application/json\r\n\r\n{"id":37,"tag_name":"2026.10.1","target_commitish":"${sha}"}`
            }
        },
        true
    )
    assert.equal(calls, 2)
    assert.equal(readState(path, identity).releaseId, 37)
})

test('CalVer cleanup leases exact numeric tag identity and is safe to repeat', async (t) => {
    const { cleanup } = await import('./release-publication.mjs')
    const path = fixture(t, {
        scheme: 'calver',
        version: '2026.10.1',
        commit: sha,
        tagOid: oid,
        tag: 'created',
        release: 'created',
        releaseId: 37
    })
    const api = (status, body = '') => ({
        code: status === 404 ? 1 : 0,
        stdout: `HTTP/2.0 ${status} Fixture\r\nContent-Type: application/json\r\n\r\n${body}`
    })
    const tag = ['git', 'ls-remote', 'origin', 'refs/tags/2026.10.1', 'refs/tags/2026.10.1^{}']
    const data = `{"id":37,"tag_name":"2026.10.1","target_commitish":"${sha}"}`
    const expected = [
        [tag, { stdout: `${oid}\trefs/tags/2026.10.1\n${sha}\trefs/tags/2026.10.1^{}\n` }],
        [['gh', 'api', '--include', 'repos/{owner}/{repo}/releases/37'], api(200, data)],
        [
            ['gh', 'api', '--include', 'repos/{owner}/{repo}/releases/tags/2026.10.1'],
            api(200, data)
        ],
        [
            ['gh', 'api', '--include', '--method', 'DELETE', 'repos/{owner}/{repo}/releases/37'],
            api(204)
        ],
        [
            [
                'git',
                'push',
                `--force-with-lease=refs/tags/2026.10.1:${oid}`,
                'origin',
                ':refs/tags/2026.10.1'
            ],
            {}
        ]
    ]
    const first = scripted(expected)
    cleanup(path, identity, false, first.exec, () => assert.fail('Unexpected retention'))
    first.done()
    const repeated = scripted([
        [tag, {}],
        [['gh', 'api', '--include', 'repos/{owner}/{repo}/releases/37'], api(404)],
        [['gh', 'api', '--include', 'repos/{owner}/{repo}/releases/tags/2026.10.1'], api(404)]
    ])
    cleanup(path, identity, false, repeated.exec, () => assert.fail('Unexpected retention'))
    repeated.done()
})

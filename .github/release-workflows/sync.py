#!/usr/bin/env python3
"""Sync release safety from the svelte-diff reference without replacing consumer jobs."""

import argparse
import hashlib
import json
import re
import subprocess
import textwrap
from pathlib import Path

SOURCE = Path(__file__).resolve().parents[2]
BUNDLE = [
    'release-publication.mjs',
    'release-publication.test.mjs',
    'refresh-release-readme.sh',
    'refresh-release-readme.test.mjs',
    'release-workflow.test.mjs',
    'calver-release.mjs',
    'calver-release.test.mjs',
]
HEADER = '# Release safety managed by humanspeak/svelte-diff .github/release-workflows/sync.py\n'


def once(text, old, new):
    if text.count(old) != 1:
        raise ValueError(f'Expected unique workflow boundary: {old!r}')
    return text.replace(old, new, 1)


def fragment(name):
    text = (SOURCE / '.github/release-workflows/templates' / f'{name}.yml').read_text()
    width = 0 if name in ['calver', 'package-tests'] else (4 if name == 'prepare' else 12)
    return textwrap.indent(text, ' ' * width)


def step(text, name):
    marker = f'            - name: {name}\n'
    start = text.index(marker)
    match = re.search(r'\n            - (?:name:|uses:)', text[start + len(marker):])
    end = start + len(marker) + match.start() + 1 if match else len(text)
    return text[start:end]


def replace_step(text, name, value):
    return once(text, step(text, name), value)


def prepare_fragment(policy):
    prepare = fragment('prepare')
    if policy['event'] != 'push':
        prepare = prepare.replace("        needs: check-if-merged\n        if: needs.check-if-merged.outputs.should_run == 'true'\n", '')
        prepare = prepare.replace('${{ github.sha }}', '${{ github.event.pull_request.merge_commit_sha || github.sha }}')
        prepare = prepare.replace('${{ needs.check-if-merged.outputs.should_run }}', '${{ github.event.pull_request.merged }}')
        prepare = prepare.replace('${{ needs.check-if-merged.outputs.has_skip_label }}', "${{ contains(github.event.pull_request.labels.*.name, 'skip-publish') }}")
    return prepare + '\n'


def release_fragment(policy):
    release = fragment('release')
    if policy['event'] != 'push':
        release = release.replace('${{ needs.check-if-merged.outputs.pr_title }}', '${{ github.event.pull_request.title }}')
        release = release.replace('${{ needs.check-if-merged.outputs.pr_url }}', '${{ github.event.pull_request.html_url }}')
    return release + '\n'


def paths(text, manager, publish):
    # Preserve trigger policy, exclusions, and all consumer configuration filters.
    keys = ['package-lock.json'] if manager == 'npm' else ['pnpm-lock.yaml', 'pnpm-workspace.yaml']
    keys += ['tsconfig*.json', 'svelte.config.*', 'vite.config.*', 'vitest.config.*',
             'vitest.setup.*', 'playwright.config.*', 'eslint.config.*', '.npmrc',
             '.github/scripts/**', '.github/release-policy.json', '.github/release-source.json']
    if publish:
        keys += ['.github/workflows/npm-publish.yml']
    else:
        keys += ['.github/workflows/run-tests.yml']
    if '        paths-ignore:\n' in text:
        # Removing the broad GitHub exclusion lets helper/workflow changes reach CI.
        text = text.replace('            - .github/**\n', '')
        return text
    if '        paths:\n' not in text:
        return text
    start = text.index('        paths:\n')
    match = re.search(r'\n(?:    [a-z]|[a-z])', text[start + 1:])
    end = start + 1 + match.start() if match else len(text)
    old = text[start:end]
    new = old.rstrip('\n') + '\n'
    if manager == 'pnpm':
        new = new.replace('            - package-lock.json\n', '')
    for key in keys:
        if f'            - {key}\n' not in new:
            new += f'            - {key}\n'
    return text[:start] + new + text[end:]


def type_gate(text, manager, offline):
    if 'name: Check library types\n' in text:
        return text
    # Find the first build/test command, split a combined install/build step if necessary.
    lines = text.splitlines(keepends=True)
    index = next(i for i, line in enumerate(lines)
                 if re.match(r'\s+(?:run: )?(?:pnpm (?:build|test)|npm (?:run build|test))\b', line))
    start = max(i for i in range(index + 1) if lines[i].startswith('            - '))
    if 'name: Install' in lines[start] and 'run: |' in ''.join(lines[start:index]):
        # npm's legacy workflow builds inside Install; move only that command after check.
        command = lines.pop(index).strip()
        index = next(i for i in range(start + 1, len(lines)) if lines[i].startswith('            - '))
        lines[index:index] = ['            - name: Build\n', f'              run: {command}\n', '\n']
        start = index
    gate = ['            - name: Check library types\n', f'              run: {manager} run check\n', '\n']
    if offline:
        gate += ['            - name: Test release safety offline\n',
                 '              run: node --test .github/scripts/*.test.mjs\n', '\n']
    lines[start:start] = gate
    return ''.join(lines)


def harden(text, policy):
    manager = policy['manager']
    if HEADER in text:
        match = re.search(r'^    prepare:\n[\s\S]*?(?=^    [a-z][\w-]*:\n|\Z)', text, re.M)
        if not match:
            raise ValueError('Missing prepared baseline job')
        text = once(text, match.group(0), prepare_fragment(policy))
        text = replace_step(text, 'Recheck tested main and initialize ownership', fragment('ownership') + '\n')
        text = replace_step(text, 'Create Release', release_fragment(policy))
        text = replace_step(text, 'Cleanup on failure', fragment('cleanup') + '\n')
        return paths(text, manager, True)
    # The source workflow is already hardened; retain its shim and integration policy.
    if '    prepare:\n' in text:
        return HEADER + paths(text, manager, True)
    if policy['event'] == 'manual':
        start = text.index('    pull_request:\n')
        end = text.index('    workflow_dispatch:\n', start)
        text = text[:start] + text[end:]
        suppression = '            # trunk-ignore(checkov/CKV_GHA_7): We need manual version control for releases\n'
        present = suppression in text
        text = text.replace(suppression, '')
        text = once(text, '        inputs:\n', '        inputs:\n' + (suppression if present else '') +
                    '            dist_tag:\n                description: npm distribution tag\n'
                    '                required: true\n                type: choice\n'
                    '                default: alpha\n                options: [alpha, beta, latest]\n')
    text = paths(text, manager, True)
    text = once(text, 'jobs:\n', '# Pending runs may be replaced; neither every event nor trigger order is guaranteed.\n'
                'concurrency:\n    group: repository-release\n    cancel-in-progress: false\n\njobs:\n')
    prepare = prepare_fragment(policy)
    event = policy['event']
    first = re.search(r'^    [a-z][\w-]*:\n', text[text.index('jobs:\n') + 6:], re.M)
    # Place prepare before existing jobs without moving or replacing those jobs.
    location = text.index('jobs:\n') + 6 + first.start()
    text = text[:location] + prepare + text[location:]
    # Every code-consuming job shares prepare's SHA and retains its existing dependencies.
    chunks = re.split(r'(?=^    [a-z][\w-]*:\n)', text, flags=re.M)
    for i, chunk in enumerate(chunks):
        if chunk.startswith('    prepare:') or 'uses: actions/checkout@' not in chunk:
            continue
        name = chunk.split(':')[0].strip()
        needs = re.search(r'^        needs: (.+)$', chunk, re.M)
        if needs:
            original = needs.group(1).strip('[]')
            chunk = once(chunk, needs.group(0), f'        needs: [{original}, prepare]')
        else:
            chunk = once(chunk, f'    {name}:\n', f'    {name}:\n        needs: [prepare]\n')
        if '        if: |\n' in chunk:
            chunk = once(chunk, '        if: |\n', "        if: |\n            needs.prepare.outputs.ready == 'true' &&\n")
        elif re.search(r'^        if: ', chunk, re.M):
            chunk = re.sub(r'^        if: (.+)$', r"        if: needs.prepare.outputs.ready == 'true' && \1", chunk, count=1, flags=re.M)
        else:
            chunk = once(chunk, f'    {name}:\n', f"    {name}:\n        if: needs.prepare.outputs.ready == 'true'\n")
        if name == 'publish-github-packages':
            # Legacy jobs lacked explicit failure gates. A successful prepare alone cannot authorize publish.
            chunk = re.sub(r"^        if: needs.prepare.outputs.ready == 'true'$",
                           "        if: needs.prepare.outputs.ready == 'true' && needs.build.result == 'success' && needs.coverage-report.result == 'success'",
                           chunk, count=1, flags=re.M)
            if '        if: |\n' not in chunk:
                gates = [gate for gate in ['build', 'playwright-tests', 'coverage-report'] if f'    {gate}:\n' in text and f'needs.{gate}.result' not in chunk]
                extra = ''.join(f" && needs.{gate}.result == 'success'" for gate in gates)
                chunk = re.sub(r'^        if: (.+)$', lambda match: match.group(0) + extra, chunk, count=1, flags=re.M)
            if 'debug-check' in text and 'needs.debug-check.result' not in chunk:
                chunk = chunk.replace('build,', 'debug-check, build,', 1)
                if '        if: |\n' in chunk:
                    chunk = once(chunk, '        if: |\n', "        if: |\n            needs.debug-check.result == 'success' &&\n")
                else:
                    chunk = re.sub(r'^        if: (.+)$', r"        if: needs.debug-check.result == 'success' && \1", chunk, count=1, flags=re.M)
            chunk = once(chunk, '        permissions:\n', '        env:\n'
                         '            RELEASE_STATE: ${{ runner.temp }}/release-${{ github.run_id }}-${{ github.run_attempt }}.json\n'
                         '            PREPARED_SHA: ${{ needs.prepare.outputs.checkout_sha }}\n        permissions:\n')
        chunk = re.sub(r'(uses: actions/checkout@[^\n]+\n              with:\n)',
                       r'\1                  ref: ${{ needs.prepare.outputs.checkout_sha }}\n', chunk)
        chunks[i] = chunk
    text = ''.join(chunks)
    # Recheck main immediately before any version mutation and establish run ownership.
    text = once(text, '            - name: Bump version\n', fragment('ownership') + '\n' + '            - name: Bump version\n')
    bump = step(text, 'Bump version')
    bump = bump.replace("if: steps.publish-check.outputs.should_publish == 'true'", "if: steps.ownership.outputs.ready == 'true'")
    auth_start = bump.index('                  # Set up authentication for push\n')
    auth_end = bump.index('\n\n', auth_start) + 2
    authentication = bump[auth_start:auth_end]
    bump = bump[:auth_start] + bump[auth_end:]
    # Keep the manager and manifest mutations; use package.json rather than version command stdout.
    bump = re.sub(r'                  NEW_VERSION=\$\((?:pnpm|npm) version "\$BUMP_TYPE" --no-git-tag-version\)\n',
                  f'                  {manager} version "$BUMP_TYPE" --no-git-tag-version\n'
                  '                  PACKAGE_VERSION=$(node -p "require(\'./package.json\').version")\n'
                  '                  NEW_VERSION="v${PACKAGE_VERSION}"\n', bump)
    if '                  # Refresh the managed README footer' in bump:
        start = bump.index('                  # Refresh the managed README footer')
        end = bump.index('                  # Commit the version changes', start)
        tail = bump[end:]
        bump = bump[:start] + '                  # Run the immutable updater with only PATH before Git write authentication.\n'
        bump += '                  bash .github/scripts/refresh-release-readme.sh\n\n' + tail
        # The original tail above may contain removed authentication only before refresh, never after it.
    commit = bump.index('                  # Commit the version changes')
    bump = bump[:commit] + authentication + '                  node .github/scripts/release-publication.mjs validate\n\n' + bump[commit:]
    bump = bump.replace('                  git push\n                  git push --tags\n',
                        '                  node .github/scripts/release-publication.mjs push\n')
    text = replace_step(text, 'Bump version', bump)
    text = replace_step(text, 'Create Release', release_fragment(policy))
    publish = step(text, 'Publish')
    match = re.search(r'^\s+(?:run: )?((?:npm|pnpm) publish[^\n]*)$', publish, re.M)
    if not match:
        raise ValueError('Unrecognized canonical publication command')
    command = match.group(1)
    if event == 'manual':
        command += ' --tag "$DIST_TAG"'
    setup = publish[publish.index('              run: |\n') + len('              run: |\n'):match.start()]
    # Credentials on npm's original publication step must remain scoped to that step.
    env = publish[publish.index('              env:\n'):] if '              env:\n' in publish else ''
    prepared = '            - name: Prepare canonical publication\n'
    prepared += "              if: steps.ownership.outputs.ready == 'true'\n              run: |\n"
    if event == 'manual':
        setup += '                  case "$DIST_TAG" in alpha|beta|latest) ;; *) exit 1 ;; esac\n'
        prepared += '              env:\n                  DIST_TAG: ${{ github.event.inputs.dist_tag }}\n'
        # env must precede run, rather than becoming part of a block scalar.
        prepared = prepared.replace('              run: |\n              env:', '              env:')
        prepared += '              run: |\n'
        env = '              env:\n                  DIST_TAG: ${{ github.event.inputs.dist_tag }}\n'
    prepared += setup + '                  node .github/scripts/release-publication.mjs registry-attempt\n\n'
    prepared += '            - name: Publish\n              id: canonical\n'
    prepared += "              if: steps.ownership.outputs.ready == 'true'\n"
    prepared += f'              run: {command}\n' + env + '\n'
    prepared += '            - name: Record canonical publication\n'
    prepared += "              if: steps.canonical.outcome == 'success'\n"
    prepared += '              run: node .github/scripts/release-publication.mjs registry-success\n\n'
    text = replace_step(text, 'Publish', prepared)
    text = replace_step(text, 'Cleanup on failure', fragment('cleanup') + '\n')
    text = type_gate(text, manager, True)
    return HEADER + text


def sync(target, revision, check=False):
    policy_path = target / '.github/release-policy.json'
    policy = json.loads(policy_path.read_text())
    if policy['manager'] not in ['npm', 'pnpm'] or policy['event'] not in ['push', 'pull_request', 'manual', 'calver']:
        raise ValueError('Unsupported consumer policy')
    outputs = {}
    for name in BUNDLE:
        if policy['event'] != 'calver' and name.startswith('calver-release'):
            continue
        if policy['readme'] != 'managed' and name.startswith('refresh-release-readme'):
            continue
        outputs[f'.github/scripts/{name}'] = (SOURCE / '.github/scripts' / name).read_bytes()
    if policy['event'] == 'calver':
        outputs['.github/workflows/release.yml'] = fragment('calver').encode()
    else:
        workflow = target / '.github/workflows/npm-publish.yml'
        outputs[str(workflow.relative_to(target))] = harden(workflow.read_text(), policy).encode()
        tests = target / '.github/workflows/run-tests.yml'
        if tests.exists():
            text = type_gate(paths(tests.read_text(), policy['manager'], False), policy['manager'], False)
            # Verify workflow helper changes during ordinary PR CI as well as release CI.
            if 'node --test .github/scripts/*.test.mjs' not in text:
                gate = f'              run: {policy["manager"]} run check\n'
                text = once(text, gate, gate + '\n            - name: Test release safety offline\n'
                            '              run: node --test .github/scripts/*.test.mjs\n')
            outputs[str(tests.relative_to(target))] = text.encode()
    tests = target / '.github/workflows/run-tests.yml'
    if not tests.exists() or tests.read_text().startswith('# Test workflow managed by humanspeak/svelte-diff'):
        text = fragment('package-tests')
        manager = policy['manager']
        text = text.replace('__LOCKFILE__', 'package-lock.json' if manager == 'npm' else 'pnpm-lock.yaml')
        text = text.replace('__NODE_MATRIX__', '[20, 22]' if manager == 'npm' else '[22, 24]')
        text = text.replace('            # __MANAGER_SETUP__\n',
                            '            - uses: pnpm/action-setup@0977fd99725f1db4007ccb2928dbb4e90d06cc86 # v6\n'
                            if manager == 'pnpm' else '')
        text = text.replace('__INSTALL__', 'npm ci' if manager == 'npm' else 'pnpm install --frozen-lockfile --ignore-scripts')
        text = text.replace('__MANAGER__', manager)
        outputs['.github/workflows/run-tests.yml'] = paths(text, manager, False).encode()
    coverage = target / '.github/workflows/coveralls.yml'
    if coverage.exists() and policy['manager'] == 'npm':
        outputs['.github/workflows/coveralls.yml'] = type_gate(coverage.read_text(), 'npm', True).encode()
    source = {'repository': 'humanspeak/svelte-diff', 'revision': revision,
              'files': {path: hashlib.sha256(data).hexdigest() for path, data in outputs.items()}}
    if not policy.get('reference'):
        outputs['.github/release-source.json'] = (json.dumps(source, indent=4, sort_keys=True) + '\n').encode()
    drift = []
    for path, data in outputs.items():
        file = target / path
        if not file.exists() or file.read_bytes() != data:
            drift.append(path)
            if not check:
                file.parent.mkdir(parents=True, exist_ok=True)
                file.write_bytes(data)
    if check and drift:
        raise ValueError(f'Release source drift: {", ".join(drift)}')
    return drift


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('checkout', type=Path)
    parser.add_argument('--revision', required=True, help='Immutable source commit SHA')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    if not re.fullmatch('[a-f0-9]{40}', args.revision):
        parser.error('--revision requires a full commit SHA')
    current = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=SOURCE, capture_output=True, text=True, check=True).stdout.strip()
    dirty = subprocess.run(['git', 'status', '--porcelain', '--', '.github/scripts', '.github/release-workflows',
                            '.github/release-policy.json', '.github/workflows/npm-publish.yml',
                            '.github/workflows/run-tests.yml'], cwd=SOURCE, capture_output=True, text=True, check=True).stdout.strip()
    if args.revision != current or dirty:
        parser.error('--revision must identify this clean, committed source checkout')
    try:
        for changed in sync(args.checkout.resolve(), args.revision, args.check):
            print(changed)
    except (ValueError, KeyError, StopIteration) as error:
        parser.exit(1, f'{error}\n')

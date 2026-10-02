"""Offline sync regressions for manager variants, trigger policies, and workflow drift."""
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('release_sync', Path(__file__).with_name('sync.py'))
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)


def legacy(manager='pnpm', managed=True):
    install = 'pnpm install --frozen-lockfile' if manager == 'pnpm' else 'npm ci\n                  npm run build'
    test = 'pnpm build\n                  pnpm test' if manager == 'pnpm' else 'npm test'
    updater = '''                  # Refresh the managed README footer
                  UPDATER="$RUNNER_TEMP/updater.mjs"
                  curl -fsSL https://example.invalid/main/updater.mjs -o "$UPDATER"
                  node "$UPDATER"

''' if managed else ''
    return '''name: Publish
on:
    pull_request:
        types: [closed]
        paths:
            - src/**
            - package.json
            - package-lock.json
    workflow_dispatch:
        inputs:
            version_bump:
                type: choice
                options: [skip, patch, minor, major]
jobs:
    build:
        runs-on: ubuntu-latest
        steps:
            - name: Checkout
              uses: actions/checkout@v7
              with:
                  persist-credentials: false
            - name: Install
              run: |
                  INSTALL
            - name: Test
              run: |
                  TEST
    coverage-report:
        needs: [build]
        runs-on: ubuntu-latest
        steps:
            - run: echo coverage
    publish-github-packages:
        needs: [build, coverage-report]
        runs-on: ubuntu-latest
        permissions:
            contents: write
        steps:
            - name: Checkout
              uses: actions/checkout@v7
              with:
                  persist-credentials: false
                  fetch-depth: 0
            - name: Check Publishing Status
              id: publish-check
              run: echo ready
            - name: Determine version bump type
              id: version-type
              run: echo patch
            - name: Bump version
              if: steps.publish-check.outputs.should_publish == 'true'
              id: version
              run: |
                  # Set up authentication for push
                  git remote set-url origin "$GITHUB_TOKEN"

                  NEW_VERSION=$(MANAGER version "$BUMP_TYPE" --no-git-tag-version)
UPDATER                  # Commit the version changes
                  git add package.json
                  git commit -m bump
                  git tag -a "$NEW_VERSION" -m release
                  git push
                  git push --tags

            - name: Create Release
              run: gh release create "$NEW_VERSION"

            - name: Publish
              run: |
                  MANAGER config set registry https://registry.npmjs.org/
                  MANAGER publish --provenance --access public
              env:
                  NODE_AUTH_TOKEN: ${{ secrets.NPM_GITHUB_TOKEN }}

            - name: Cleanup on failure
              if: failure()
              run: gh release delete "$NEW_VERSION"

            - name: Notify on failure
              if: failure()
              run: echo failed
'''.replace('INSTALL', install).replace('TEST', test).replace('MANAGER', manager).replace('UPDATER', updater)


class SyncTests(unittest.TestCase):
    def policy(self, manager='pnpm', managed=True, event='pull_request'):
        return {'manager': manager, 'event': event, 'manifests': ['package.json'],
                'lockfile': 'package-lock.json' if manager == 'npm' else None,
                'readme': 'managed' if managed else 'unchanged'}

    def test_manager_variants_are_idempotent_and_preserve_publication(self):
        for manager in ['npm', 'pnpm']:
            for managed in [False, True]:
                with self.subTest(manager=manager, managed=managed):
                    policy = self.policy(manager, managed)
                    text = sync.harden(legacy(manager, managed), policy)
                    self.assertEqual(sync.harden(text, policy), text)
                    self.assertIn('needs.build.result', text)
                    self.assertIn('needs.coverage-report.result', text)
                    self.assertIn('NODE_AUTH_TOKEN: ${{ secrets.NPM_GITHUB_TOKEN }}', text)
                    self.assertIn(f'run: {manager} publish --provenance --access public', text)
                    self.assertLess(text.index(f'{manager} run check'), text.index(f'{manager} ' + ('build' if manager == 'pnpm' else 'run build')))
                    self.assertEqual(text.count('bash .github/scripts/refresh-release-readme.sh'), int(managed))
                    self.assertNotIn('git push --tags', text)
                    self.assertNotIn('gh release delete', text)

    def test_generated_ci_is_pinned_and_has_no_whitespace_only_lines(self):
        for manager in ['npm', 'pnpm']:
            with self.subTest(manager=manager), tempfile.TemporaryDirectory(prefix='release-sync-') as directory:
                target = Path(directory)
                (target / '.github/workflows').mkdir(parents=True)
                (target / '.github/release-policy.json').write_text(json.dumps(self.policy(manager)))
                (target / '.github/workflows/npm-publish.yml').write_text(legacy(manager))
                sync.sync(target, 'a' * 40)
                text = (target / '.github/workflows/run-tests.yml').read_text()
                self.assertFalse(any(line and not line.strip() for line in text.splitlines()))
                self.assertNotIn('pnpm/action-setup@v6', text)
                self.assertEqual('pnpm/action-setup@0977fd99725f1db4007ccb2928dbb4e90d06cc86' in text,
                                 manager == 'pnpm')
                self.assertEqual(sync.sync(target, 'a' * 40, check=True), [])

    def test_manual_policy_restores_tag_choices_and_removes_automatic_release(self):
        policy = self.policy(event='manual')
        text = sync.harden(legacy(), policy)
        self.assertNotIn('    pull_request:\n', text)
        self.assertIn('default: alpha', text)
        self.assertIn('options: [alpha, beta, latest]', text)
        self.assertIn('--tag "$DIST_TAG"', text)
        self.assertLess(text.index('case "$DIST_TAG"'), text.index('.mjs registry-attempt'))
        self.assertEqual(sync.harden(text, policy), text)

    def test_sync_check_detects_workflow_drift_and_failure_writes_no_partial_bundle(self):
        with tempfile.TemporaryDirectory(prefix='release-sync-') as directory:
            target = Path(directory)
            (target / '.github/workflows').mkdir(parents=True)
            (target / '.github/release-policy.json').write_text(json.dumps(self.policy()))
            workflow = target / '.github/workflows/npm-publish.yml'
            workflow.write_text(legacy())
            sync.sync(target, 'a' * 40)
            self.assertEqual(sync.sync(target, 'a' * 40, check=True), [])
            original = workflow.read_text()
            workflow.write_text(original.replace('cancel-in-progress: false', 'cancel-in-progress: true'))
            with self.assertRaisesRegex(ValueError, 'Release source drift'):
                sync.sync(target, 'a' * 40, check=True)
        with tempfile.TemporaryDirectory(prefix='release-sync-') as directory:
            target = Path(directory)
            (target / '.github/workflows').mkdir(parents=True)
            (target / '.github/release-policy.json').write_text(json.dumps(self.policy()))
            workflow = target / '.github/workflows/npm-publish.yml'
            workflow.write_text(legacy().replace('            - name: Bump version', '            - name: Unexpected versioning'))
            with self.assertRaises(ValueError):
                sync.sync(target, 'a' * 40)
            self.assertFalse((target / '.github/scripts').exists())
            self.assertIn('Unexpected versioning', workflow.read_text())


if __name__ == '__main__':
    unittest.main()

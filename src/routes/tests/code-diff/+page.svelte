<script lang="ts">
    import { onDestroy } from 'svelte'
    import CodeDiff from '$lib/code.js'
    import type { SvelteDiffMode } from '$lib/index.js'
    import { createHighlighter } from '@tanstack/highlight/core'
    import { js } from '@tanstack/highlight/languages/js'
    import { json } from '@tanstack/highlight/languages/json'
    import { ts } from '@tanstack/highlight/languages/ts'
    import { createThemeCss, themeTokenClasses } from '@tanstack/highlight/theme'
    import { githubDarkTheme } from '@tanstack/highlight/themes/github-dark'
    import { githubLightTheme } from '@tanstack/highlight/themes/github-light'

    const whitespaceOriginal = '\tconst emoji = "😀";\r\n// old\rnext\n'
    const whitespaceModified = '\tconst emoji = "👩‍💻";\r\n// new\rnext\n'
    const highlighter = createHighlighter({ languages: [ts, js, json] })
    // Only theme CSS goes in this style element; source is always escaped by CodeDiff.
    const themeCss =
        createThemeCss({
            light: githubLightTheme,
            dark: githubDarkTheme,
            lightSelector: '.code-fixture',
            darkSelector: '.code-fixture:not([data-theme="light"])',
            includeBaseStyles: false
        }) +
        themeTokenClasses
            .map((token) => `.code-fixture .th-${token} { color: var(--th-${token}); }`)
            .join('\n')
    const asyncPreset = {
        name: 'Async refactor',
        language: 'typescript',
        before: `type User = { name: string; active: boolean }

export function loadTeam(ids: string[]): Promise<User[]> {
    // Fetch each teammate, then keep the active ones.
    return Promise.all(ids.map(id =>
        fetch('/api/users/' + id).then(res => res.json())
    )).then(users => users.filter(user => user.active));
}
`,
        after: `type User = { name: string; active: boolean }

export async function loadTeam(ids: string[]): Promise<User[]> {
    // Fetch in parallel; fail early on a bad response.
    const users = await Promise.all(ids.map(async id => {
        const res = await fetch(\`/api/users/\${encodeURIComponent(id)}\`);
        if (!res.ok) throw new Error(\`User \${id}: \${res.status}\`);
        return await res.json() as User;
    }));
    return users.filter(({ active }) => active);
}
`
    }
    const contextOriginal =
        '/* repeated text\nold repeated text */\nconst text = "old repeated text";\nconst re = /(?<year>\\d{4})/;\nconst html = "<script>&</scr' +
        'ipt>";\n'
    const contextModified =
        '/* repeated text\nnew repeated text */\nconst text = "new repeated text";\nconst re = /(?<year>\\d{2})/g;\nconst html = "<img onerror=alert(1)>";\n'
    let originalText = $state(asyncPreset.before)
    let modifiedText = $state(asyncPreset.after)
    let language = $state(asyncPreset.language)
    let diffMode = $state<SvelteDiffMode>('line')
    let theme = $state('system')
    const presets = [
        {
            name: 'Multiline context',
            before: contextOriginal,
            after: contextModified,
            language: 'typescript'
        },
        asyncPreset,
        {
            name: 'JSON upgrade',
            language: 'json',
            before: `{
  "name": "orbit",
  "version": 1,
  "theme": "light",
  "features": ["search"],
  "cache": { "enabled": false, "ttl": 0 }
}
`,
            after: `{
  "name": "orbit",
  "version": 2,
  "theme": "system",
  "features": ["search", "replay", "shortcuts"],
  "cache": { "enabled": true, "ttl": 300 },
  "shortcuts": { "search": "cmd+k" }
}
`
        }
    ]
    let scenario = $state(asyncPreset.name)
    let replaying = $state(false)
    let replayStep = $state(0)
    let replayTimer: ReturnType<typeof setTimeout> | undefined
    const cancelReplay = () => {
        clearTimeout(replayTimer)
        replayTimer = undefined
        replaying = false
    }
    onDestroy(cancelReplay)
    const edited = () => {
        cancelReplay()
        scenario = 'Custom edit'
    }
    const selectPreset = (preset: (typeof presets)[number]) => {
        cancelReplay()
        originalText = preset.before
        modifiedText = preset.after
        language = preset.language
        scenario = preset.name
    }
    const replay = () => {
        cancelReplay()
        const target = modifiedText
        if (
            originalText === target ||
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
        )
            return
        // Keep shared edges; replace only the changed region, in Unicode-safe chunks.
        const before = Array.from(originalText)
        const after = Array.from(target)
        let start = 0
        while (start < Math.min(before.length, after.length) && before[start] === after[start])
            start++
        let end = 0
        while (
            end < Math.min(before.length, after.length) - start &&
            before[before.length - 1 - end] === after[after.length - 1 - end]
        )
            end++
        const prefix = before.slice(0, start).join('')
        const suffix = end ? after.slice(-end).join('') : ''
        const removed = before.slice(start, before.length - end)
        const inserted = after.slice(start, after.length - end)
        modifiedText = originalText
        replaying = true
        replayStep = 0
        const tick = () => {
            replayStep++
            const progress = replayStep / 20
            modifiedText =
                prefix +
                inserted.slice(0, Math.ceil(inserted.length * progress)).join('') +
                removed.slice(Math.ceil(removed.length * progress)).join('') +
                suffix
            if (replayStep < 20) replayTimer = setTimeout(tick, 75)
            else {
                modifiedText = target
                cancelReplay()
            }
        }
        replayTimer = setTimeout(tick, 75)
    }
    const reset = () => {
        cancelReplay()
        scenario = asyncPreset.name
        originalText = asyncPreset.before
        modifiedText = asyncPreset.after
        language = asyncPreset.language
        diffMode = 'line'
        theme = 'system'
    }
</script>

<svelte:head><svelte:element this={"style"}>{themeCss}</svelte:element></svelte:head>

<div class="playground">
    <div class="shell">
        <header class="intro">
            <p class="eyebrow">Humanspeak / code playground</p>
            <h1>Small edits. <span>Big difference.</span></h1>
            <p>
                Pick a refactor, make it yours, then replay the edit. Every change keeps its syntax
                colors.
            </p>
        </header>
        <div class="code-fixture" data-theme={theme}>
            <div class="controls">
                <label
                    >Language<select bind:value={language}>
                        <option value="typescript">TypeScript</option><option value="javascript"
                            >JavaScript</option
                        ><option value="json">JSON</option><option value="plaintext"
                            >Plain text</option
                        ><option value="unregistered">Unknown language</option>
                    </select></label
                >
                <label
                    >Diff mode<select bind:value={diffMode}>
                        <option value="character">Character</option><option value="word"
                            >Word</option
                        ><option value="line">Line</option>
                    </select></label
                >
                <label
                    >Theme<select bind:value={theme}>
                        <option value="system">Site theme</option><option value="light"
                            >Light</option
                        ><option value="dark">Dark</option>
                    </select></label
                >
                <button class="reset" type="button" onclick={reset}>Reset</button>
            </div>
            <div class="scenarios" aria-label="Source presets">
                <span class="strip-label">Try a change</span>
                {#each presets as preset (preset.name)}
                    <button
                        type="button"
                        aria-pressed={scenario === preset.name}
                        onclick={() => selectPreset(preset)}>{preset.name}</button
                    >
                {/each}
            </div>
            <div class="inputs">
                <div class="editor">
                    <div class="pane-header">
                        <label for="before-source">Before</label><span>original source</span>
                    </div>
                    <textarea
                        id="before-source"
                        aria-label="Before"
                        autocomplete="off"
                        bind:value={originalText}
                        oninput={edited}
                        spellcheck="false"
                        style:height={scenario === 'Async refactor' ? '220px' : '160px'}></textarea>
                </div>
                <div class="editor">
                    <div class="pane-header">
                        <label for="after-source">After</label><span>modified source</span>
                    </div>
                    <textarea
                        id="after-source"
                        aria-label="After"
                        autocomplete="off"
                        bind:value={modifiedText}
                        oninput={edited}
                        spellcheck="false"
                        style:height={scenario === 'Async refactor' ? '220px' : '160px'}></textarea>
                </div>
            </div>
            <section class="result" aria-label="Combined diff">
                <div class="pane-header result-header">
                    <h2>Combined diff</h2>
                    <div class="legend">
                        <span class="removed">Removed</span><span class="inserted">Inserted</span>
                    </div>
                </div>
                <CodeDiff {originalText} {modifiedText} {highlighter} {language} {diffMode} />
                <div class="result-footer">
                    <span class="status" role="status"
                        >{replaying ? `Replaying · ${replayStep * 5}%` : scenario}</span
                    >
                    <span class="replay-hint">Watch the change unfold</span>
                    <button
                        class="replay"
                        type="button"
                        onclick={replay}
                        disabled={replaying || originalText === modifiedText}>Replay edit</button
                    >
                </div>
            </section>

            <section class="whitespace">
                <div class="pane-header">
                    <h2>Whitespace &amp; Unicode</h2>
                    <span>tabs / mixed line endings / emoji</span>
                </div>
                <CodeDiff
                    originalText={whitespaceOriginal}
                    modifiedText={whitespaceModified}
                    {highlighter}
                    language="typescript"
                    ariaLabel="Whitespace code differences"
                />
            </section>
        </div>
    </div>
</div>

<style>
    .code-fixture {
        --mono:
            'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, SFMono-Regular, Consolas,
            monospace;
        min-width: 0;
        background: var(--brut-bg, #fbfcfc);
        color: var(--brut-ink, #172521);
        font: 11px/1.5 var(--mono);
        --svelte-diff-remove-bg: #ffd5d7;
        --svelte-diff-insert-bg: #b9efd9;
    }
    .code-fixture[data-theme='dark'],
    :global(.dark) .code-fixture:not([data-theme='light']) {
        --svelte-diff-remove-bg: #642e39;
        --svelte-diff-insert-bg: #184c3b;
    }
    .controls,
    .scenarios,
    .result-footer {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        padding: 12px 16px;
    }
    .controls {
        gap: 12px 20px;
        border-bottom: 1px solid var(--brut-rule, #d4ded9);
    }
    .controls label {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--brut-ink-2, #52645d);
    }
    button,
    select {
        appearance: none;
        border: 1px solid var(--brut-rule, #d4ded9);
        border-radius: 0;
        background: var(--brut-bg-2, #eff3f1);
        color: var(--brut-ink, #172521);
        padding: 6px 10px;
        font: 11px/1.4 var(--mono);
        cursor: pointer;
    }
    select {
        padding-right: 26px;
        background-image:
            linear-gradient(45deg, transparent 50%, currentColor 50%),
            linear-gradient(135deg, currentColor 50%, transparent 50%);
        background-position:
            calc(100% - 12px) 50%,
            calc(100% - 8px) 50%;
        background-size: 4px 4px;
        background-repeat: no-repeat;
    }
    button:hover:not(:disabled),
    select:hover {
        border-color: var(--brut-accent, #16846a);
    }
    button[aria-pressed='true'] {
        border-color: var(--brut-accent, #16846a);
        color: var(--brut-accent, #16846a);
        background: color-mix(in srgb, var(--brut-accent, #54dbbc) 10%, var(--brut-bg, #fbfcfc));
    }
    button:disabled {
        opacity: 0.5;
        cursor: default;
    }
    .reset {
        margin-left: auto;
    }
    .strip-label {
        color: var(--brut-ink-3, #64776e);
        margin-right: 4px;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
    }
    .inputs {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        margin: 0 16px 16px;
        border: 1px solid var(--brut-rule, #d4ded9);
    }
    .editor {
        min-width: 0;
    }
    .editor + .editor {
        border-left: 1px solid var(--brut-rule, #d4ded9);
    }
    .pane-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 8px;
        padding: 8px 12px;
        background: var(--brut-bg-2, #eff3f1);
        border-bottom: 1px solid var(--brut-rule, #d4ded9);
    }
    .pane-header label,
    h2 {
        margin: 0;
        font: 500 10px/1.5 var(--mono);
        text-transform: uppercase;
        letter-spacing: 0.12em;
    }
    .pane-header > span {
        color: var(--brut-ink-3, #64776e);
        font-size: 10px;
    }
    textarea {
        display: block;
        box-sizing: border-box;
        width: 100%;
        min-height: 160px;
        max-height: 420px;
        resize: vertical;
        border: 0;
        border-radius: 0;
        padding: 12px;
        background: var(--brut-bg, #fbfcfc);
        color: var(--brut-ink, #172521);
        font: 12px/1.65 var(--mono);
        tab-size: 4;
    }
    .result {
        margin: 0 16px 16px;
        border: 1px solid var(--brut-rule, #d4ded9);
        border-top: 2px solid var(--brut-accent, #16846a);
        min-width: 0;
    }
    .legend {
        display: flex;
        gap: 12px;
        font-size: 10px;
        color: var(--brut-ink-2, #52645d);
    }
    .legend span {
        display: inline-flex;
        align-items: center;
        gap: 5px;
    }
    .legend span::before {
        content: '';
        width: 8px;
        height: 8px;
        border: 1px solid currentColor;
    }
    .removed::before {
        background: #d97180;
    }
    .inserted::before {
        background: #54dbbc;
    }
    .code-fixture :global(pre.svelte-code-diff) {
        box-sizing: border-box;
        min-height: 80px;
        max-height: 360px;
        overflow: auto;
        margin: 0;
        padding: 16px;
        background: var(--th-background);
        color: var(--th-token);
        font: 13px/1.7 var(--mono);
        tab-size: 4;
    }
    .result-footer {
        border-top: 1px solid var(--brut-rule, #d4ded9);
        padding: 10px 12px;
    }
    .status {
        color: var(--brut-accent, #16846a);
    }
    .replay-hint {
        margin-left: auto;
        color: var(--brut-ink-3, #64776e);
        font-size: 10px;
    }
    .replay {
        background: var(--brut-accent, #54dbbc);
        color: var(--brut-accent-ink, #08271f);
        border-color: var(--brut-accent, #54dbbc);
        font-weight: 600;
    }
    .replay:hover:not(:disabled) {
        background: var(--brut-accent-hover, #78e5cb);
        color: var(--brut-accent-ink, #08271f);
    }
    button:focus-visible,
    select:focus-visible,
    textarea:focus-visible,
    .code-fixture :global(pre:focus-visible) {
        outline: 2px solid var(--brut-accent, #16846a);
        outline-offset: -2px;
    }
    @media (max-width: 700px) {
        .inputs {
            grid-template-columns: minmax(0, 1fr);
        }
        .editor + .editor {
            border-left: 0;
            border-top: 1px solid var(--brut-rule, #d4ded9);
        }
        .controls,
        .scenarios {
            padding: 10px;
            gap: 8px;
        }
        .controls label {
            flex: 1 1 auto;
            justify-content: space-between;
        }
        .inputs,
        .result {
            margin-left: 10px;
            margin-right: 10px;
        }
        .replay-hint {
            display: none;
        }
        .replay {
            margin-left: auto;
        }
    }

    :global(body:has(.playground)) {
        margin: 0;
        background: #060a09;
    }
    .playground {
        --brut-bg: #0b1210;
        --brut-bg-2: #111c18;
        --brut-rule: #294038;
        --brut-ink: #e5f0eb;
        --brut-ink-2: #adc4b8;
        --brut-ink-3: #8ba699;
        --brut-accent: #54dbbc;
        --brut-accent-hover: #83ead2;
        --brut-accent-ink: #08271f;
        min-height: 100vh;
        padding: 48px 24px;
        box-sizing: border-box;
        background:
            radial-gradient(ellipse at 85% 0%, #54dbbc12, transparent 55%),
            linear-gradient(#54dbbc06 1px, transparent 1px) 0 0 / 32px 32px,
            linear-gradient(90deg, #54dbbc06 1px, transparent 1px) 0 0 / 32px 32px;
        color: var(--brut-ink);
        font-family: system-ui, sans-serif;
    }
    .shell {
        max-width: 1060px;
        margin: auto;
    }
    .intro {
        margin-bottom: 28px;
    }
    .eyebrow {
        font:
            11px/1.5 ui-monospace,
            monospace;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        color: var(--brut-accent);
    }
    h1 {
        font-size: clamp(26px, 4vw, 42px);
        letter-spacing: -0.045em;
        font-weight: 600;
        margin: 12px 0;
        line-height: 1.15;
    }
    h1 span {
        color: var(--brut-accent);
    }
    .intro > p:last-child {
        max-width: 560px;
        font-size: 14px;
        line-height: 1.65;
        color: var(--brut-ink-2);
    }
    .code-fixture {
        position: relative;
        border: 1px solid var(--brut-rule);
        box-shadow: 0 16px 64px #0005;
    }
    .code-fixture::before {
        content: '';
        position: absolute;
        top: -1px;
        left: 0;
        width: 30%;
        height: 1px;
        background: linear-gradient(90deg, transparent, #54dbbc, transparent);
        pointer-events: none;
        animation: drift 8s ease-in-out infinite alternate;
    }
    .code-fixture:not([data-theme='light']) {
        --svelte-diff-remove-bg: #642e39;
        --svelte-diff-insert-bg: #184c3b;
    }
    .whitespace {
        margin: 24px 16px 16px;
        border: 1px solid var(--brut-rule);
    }
    .whitespace :global(pre.svelte-code-diff) {
        font-size: 12px;
        padding: 12px;
    }
    @keyframes drift {
        to {
            transform: translateX(230%);
        }
    }
    @media (prefers-reduced-motion: reduce) {
        .code-fixture::before {
            animation: none;
        }
    }
    @media (max-width: 700px) {
        .playground {
            padding: 28px 12px;
        }
        .whitespace {
            margin: 20px 10px 10px;
        }
    }
</style>

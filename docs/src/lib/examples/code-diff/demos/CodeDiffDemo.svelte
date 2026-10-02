<script lang="ts">
    import CodeDiff from '@humanspeak/svelte-diff/code'
    import type { SvelteDiffMode } from '@humanspeak/svelte-diff'
    import { createHighlighter } from '@tanstack/highlight/core'
    import { js } from '@tanstack/highlight/languages/js'
    import { json } from '@tanstack/highlight/languages/json'
    import { ts } from '@tanstack/highlight/languages/ts'
    import { createThemeCss, themeTokenClasses } from '@tanstack/highlight/theme'
    import { githubDarkTheme } from '@tanstack/highlight/themes/github-dark'
    import { githubLightTheme } from '@tanstack/highlight/themes/github-light'

    const highlighter = createHighlighter({ languages: [ts, js, json] })
    // Only theme CSS goes in this style element; source is always escaped by CodeDiff.
    const themeCss =
        createThemeCss({
            light: githubLightTheme,
            dark: githubDarkTheme,
            lightSelector: '.code-demo',
            darkSelector:
                '.dark .code-demo:not([data-theme="light"]), .code-demo[data-theme="dark"]',
            includeBaseStyles: false
        }) +
        themeTokenClasses
            .map((token) => `.code-demo .th-${token} { color: var(--th-${token}); }`)
            .join('\n')
    const initialOriginal = 'const count: number = 10;\r\n\tconst label = "old";\n'
    const initialModified = 'const count: number = 20;\r\n\tconst label = "new";\n'
    const contextOriginal =
        '/* repeated text\nold repeated text */\nconst text = "old repeated text";\nconst re = /(?<year>\\d{4})/;\nconst html = "<script>&</scr' +
        'ipt>";\n'
    const contextModified =
        '/* repeated text\nnew repeated text */\nconst text = "new repeated text";\nconst re = /(?<year>\\d{2})/g;\nconst html = "<img onerror=alert(1)>";\n'
    let originalText = $state(initialOriginal)
    let modifiedText = $state(initialModified)
    let language = $state('typescript')
    let diffMode = $state<SvelteDiffMode>('word')
    let theme = $state('system')
    const reset = () => {
        originalText = initialOriginal
        modifiedText = initialModified
        language = 'typescript'
        diffMode = 'word'
        theme = 'system'
    }
</script>

<svelte:head><svelte:element this={"style"}>{themeCss}</svelte:element></svelte:head>

<div class="code-demo" data-theme={theme}>
    <div class="inputs">
        <label>Before<textarea bind:value={originalText} spellcheck="false"></textarea></label>
        <label>After<textarea bind:value={modifiedText} spellcheck="false"></textarea></label>
    </div>
    <div class="controls">
        <label
            >Language<select bind:value={language}>
                <option value="typescript">TypeScript</option><option value="javascript"
                    >JavaScript</option
                ><option value="json">JSON</option><option value="plaintext">Plain text</option
                ><option value="unregistered">Unknown language</option>
            </select></label
        >
        <label
            >Diff mode<select bind:value={diffMode}
                ><option value="character">Character</option><option value="word">Word</option
                ><option value="line">Line</option></select
            ></label
        >
        <button type="button" onclick={reset}>Reset</button>
        <button
            type="button"
            onclick={() => {
                originalText = contextOriginal
                modifiedText = contextModified
            }}>Multiline context</button
        >
        <label
            >Theme<select bind:value={theme}
                ><option value="system">Site theme</option><option value="light">Light</option
                ><option value="dark">Dark</option></select
            ></label
        >
    </div>
    <CodeDiff {originalText} {modifiedText} {highlighter} {language} {diffMode} />
</div>

<style>
    .code-demo {
        min-width: 0;
    }
    .inputs {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: 1rem;
        padding: 1rem;
    }
    label {
        display: grid;
        gap: 0.5rem;
        min-width: 0;
        font-size: 0.8rem;
    }
    textarea {
        width: 100%;
        box-sizing: border-box;
        min-height: 8rem;
        resize: vertical;
        padding: 0.75rem;
        font: 0.8rem/1.6 monospace;
        background: var(--th-background);
        color: var(--th-token);
        border: 1px solid #888;
    }
    .controls {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 1rem;
        padding: 1rem;
    }
    button,
    select {
        padding: 0.4rem 0.7rem;
        background: var(--th-background);
        color: var(--th-token);
        border: 1px solid #888;
    }
    button {
        cursor: pointer;
    }
    .code-demo :global(pre.svelte-code-diff) {
        box-sizing: border-box;
        min-height: 8rem;
        max-height: 24rem;
        margin: 0;
        padding: 1rem;
        background: var(--th-background);
        color: var(--th-token);
        font: 0.85rem/1.6 monospace;
    }
    .code-demo :global(pre:focus-visible) {
        outline: 2px solid #888;
        outline-offset: -2px;
    }
    @media (max-width: 700px) {
        .inputs {
            grid-template-columns: minmax(0, 1fr);
        }
    }
</style>

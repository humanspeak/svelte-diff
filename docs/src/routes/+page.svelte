<script lang="ts">
    import {
        FooterV2,
        HeaderV2,
        getBreadcrumbContext,
        getSeoContext
    } from '@humanspeak/docs-kit'
    import SvelteDiff, {
        type SvelteDiffTiming,
        type SvelteDiffTuple
    } from '@humanspeak/svelte-diff'
    import favicon from '$lib/assets/logo.svg'
    import { docsConfig } from '$lib/docs-config'
    import { headerNav } from '$lib/docsNav'
    import type { PageData } from './$types'
    import '@fontsource-variable/inter/index.css'
    import '@fontsource-variable/jetbrains-mono/index.css'

    const { data }: { data: PageData } = $props()
    const packageStats = $derived(data.packageStats)
    const tarballKb = $derived(
        packageStats.tarballBytes === null
            ? null
            : Math.round(packageStats.tarballBytes / 102.4) / 10
    )

    const breadcrumbs = getBreadcrumbContext()
    if (breadcrumbs) breadcrumbs.breadcrumbs = []

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'svelte-diff · readable text diffs for Svelte 5'
        seo.description =
            'Render readable text diffs in Svelte 5 with semantic cleanup, expected patterns, typed snippets, reactive updates, and timing callbacks.'
    }

    const initialOriginal = `Release v1.8.0 is ready for review.
The documentation will ship after launch.
Owner: Product Engineering`
    const initialModified = `Release v2.0.0 is ready for final review.
The documentation will ship with the launch.
Owner: Developer Experience`

    let originalText = $state(initialOriginal)
    let modifiedText = $state(initialModified)
    let timing = $state<SvelteDiffTiming>({ main: 0, cleanup: 0, total: 0 })
    let segmentCount = $state(0)
    let copied = $state(false)

    const onProcessing = (nextTiming: SvelteDiffTiming, diffs: SvelteDiffTuple[]) => {
        timing = nextTiming
        segmentCount = diffs.length
    }

    const resetDemo = () => {
        originalText = initialOriginal
        modifiedText = initialModified
    }

    const copyInstall = async () => {
        await navigator.clipboard.writeText(`npm i ${packageStats.name}`)
        copied = true
        window.setTimeout(() => (copied = false), 1800)
    }

    const kpis = $derived([
        { k: 'component', v: '1', note: 'drop-in svelte', accent: true },
        { k: 'segment types', v: '4', note: 'remove / insert / equal / expected' },
        { k: 'cleanup modes', v: '3', note: 'raw / efficiency / semantic', accent: true },
        { k: 'timeout', v: '1', unit: 's', note: 'configurable default' },
        {
            k: 'tarball',
            v: tarballKb === null ? '—' : String(tarballKb),
            unit: tarballKb === null ? undefined : 'kB',
            note: 'packed from npm'
        },
        { k: 'licence', v: 'MIT', note: 'open source' }
    ])

    const features = [
        {
            title: 'Reactive text comparison',
            body: 'Pass before and after strings. The rendered diff recomputes whenever either prop changes.'
        },
        {
            title: 'Semantic cleanup',
            body: 'Move edit boundaries toward changes a person can scan instead of raw character noise.'
        },
        {
            title: 'Expected patterns',
            body: 'Mark dates, versions, names, and generated values with named capture groups.'
        },
        {
            title: 'Svelte 5 snippets',
            body: 'Own removed, inserted, equal, expected, and line-break markup independently.'
        },
        {
            title: 'Class-based styling',
            body: 'Keep the default spans and apply semantic classes when full custom rendering is unnecessary.'
        },
        {
            title: 'Processing telemetry',
            body: 'Inspect core, cleanup, and total timing alongside the raw diff tuples.'
        }
    ]
</script>

<div class="brut-wrap flex min-h-svh flex-col">
    <HeaderV2 config={docsConfig} {favicon} version={packageStats.version} nav={headerNav} />

    <main class="brut" id="top">
        <div class="coord" aria-hidden="true">
            {#each Array(12) as _, index (index)}
                <div>{String(index + 1).padStart(2, '0')}</div>
            {/each}
        </div>

        <section class="hero">
            <div class="corner tr">FIG-001 · MASTHEAD</div>
            <aside class="meta">
                <div><span>pkg</span> · {packageStats.name}</div>
                <div><span>version</span> · {packageStats.version}</div>
                <div><span>framework</span> · svelte 5</div>
                <div><span>algorithm</span> · diff-match-patch</div>
                <hr />
                <div><span>rendering</span> · snippets / classes</div>
                <div><span>cleanup</span> · semantic / efficiency</div>
                <div class="accent"><span>status</span> · production ready</div>
                <hr />
                <div><span>// scroll for live spec</span></div>
            </aside>

            <div class="hero-body">
                <h1>svelte<span>/</span>diff<span class="end">.</span></h1>
                <p>
                    Readable, reactive text diffs for <b>Svelte 5</b>. Semantic cleanup,
                    expected-pattern matching, typed snippets, CSS classes, and processing telemetry
                    in one focused component.
                </p>
                <div class="actions">
                    <a class="primary" href="/docs/getting-started">get started ↗</a>
                    <a href="/examples">examples</a>
                    <a href="/docs/api/svelte-diff">api reference</a>
                    <a href="/compare">compare</a>
                    <button type="button" onclick={copyInstall}>
                        <span class="prompt">$</span>
                        npm i {packageStats.name}
                        <span class:copied>{copied ? '✓ copied' : 'copy'}</span>
                    </button>
                </div>
            </div>
            <div class="corner bl">FIG-001</div>
            <div class="corner br">SHEET 01 / 05</div>
        </section>

        <section class="kpis" aria-label="Package key performance indicators">
            {#each kpis as kpi, index (kpi.k)}
                <div class:accent={kpi.accent} class="kpi" data-index="/0{index + 1}">
                    <div class="key">{kpi.k}</div>
                    <div class="value">
                        {kpi.v}{#if kpi.unit}<small>{kpi.unit}</small>{/if}
                    </div>
                    <div class="note">{kpi.note}</div>
                </div>
            {/each}
        </section>

        <section class="demo-section">
            <div class="lede">
                <div>FIG-002 / LIVE DIFF</div>
                <h2>edit the <span>comparison</span>.</h2>
                <p>
                    Change either document. SvelteDiff reacts immediately, applies semantic cleanup,
                    and reports the work it performed.
                </p>
                <a href="/examples/live-editor">open full example ↗</a>
            </div>

            <div class="demo-panel">
                <div class="panel-bar">
                    <span><i>file</i> · <b>homepage-diff.svelte</b></span>
                    <span><i>main</i> <b>{timing.main.toFixed(2)}ms</b></span>
                    <span><i>cleanup</i> <b>{timing.cleanup.toFixed(2)}ms</b></span>
                    <span><i>segments</i> <b>{segmentCount}</b></span>
                    <span class="live">● LIVE</span>
                    <button type="button" onclick={resetDemo}>↻ reset</button>
                </div>

                <div class="editors">
                    <label>
                        <span>SRC-A / BEFORE</span>
                        <textarea bind:value={originalText} spellcheck="false"></textarea>
                    </label>
                    <label>
                        <span>SRC-B / AFTER</span>
                        <textarea bind:value={modifiedText} spellcheck="false"></textarea>
                    </label>
                </div>

                <div class="output">
                    <div class="output-label">
                        <span>OUT / SEMANTIC DIFF</span>
                        <span>total · {timing.total.toFixed(2)}ms</span>
                    </div>
                    <div class="diff-output rendered-diff">
                        <SvelteDiff
                            {originalText}
                            {modifiedText}
                            cleanupSemantic
                            {onProcessing}
                            rendererClasses={{
                                remove: 'diff-remove',
                                insert: 'diff-insert',
                                equal: 'diff-equal'
                            }}
                        />
                    </div>
                </div>

                <div class="panel-footer">
                    <span>algorithm · <b>diff-match-patch</b></span>
                    <span>cleanup · <b>semantic</b></span>
                    <span>render · <b>svelte spans</b></span>
                    <span>thread · <b>main</b></span>
                </div>
            </div>
        </section>

        <section class="features">
            <div class="lede">
                <div>FIG-003 / CAPABILITIES</div>
                <h2>why <span>svelte-diff</span>.</h2>
                <p>A compact API with deliberate escape hatches for styling, markup, and telemetry.</p>
            </div>
            <div class="feature-grid">
                {#each features as feature, index (feature.title)}
                    <a href={index === 2 ? '/docs/guides/expected-patterns' : index === 3 ? '/docs/guides/custom-rendering' : '/docs/api/svelte-diff'}>
                        <div class="id">№ {String(index + 1).padStart(2, '0')} / 06</div>
                        <div class="arrow">↗</div>
                        <h3>{feature.title}</h3>
                        <p>{feature.body}</p>
                        <i></i>
                    </a>
                {/each}
            </div>
        </section>

        <section class="ai-section" id="ai-ready">
            <div class="lede">
                <div>FIG-004 / AI-READY</div>
                <h2>built for <span>ai-assisted</span> code.</h2>
                <p>
                    Point Cursor, Claude Code, or any LLM at the manifests below and it gets the
                    complete SvelteDiff contract: cleanup precedence, expected patterns, renderer
                    snippets, callback types, and runnable examples.
                </p>
            </div>

            <div class="ai-panel">
                <div class="ai-head">
                    <span class="active">llms.txt</span>
                    <span>llms-full.txt</span>
                    <span class="spacer"></span>
                    <span>/llmstxt.org</span>
                </div>
                <div class="ai-grid">
                    <a href="/llms.txt" target="_blank" rel="noopener">
                        <div class="index">01 · index</div>
                        <h3><code>/llms.txt</code></h3>
                        <p>
                            Compact discovery map with the install command, important behavior,
                            canonical documentation links, and every example mirror.
                        </p>
                        <div class="foot">compact context · open ↗</div>
                    </a>
                    <a href="/llms-full.txt" target="_blank" rel="noopener">
                        <div class="index">02 · full</div>
                        <h3><code>/llms-full.txt</code></h3>
                        <p>
                            One-file reference containing the complete API, guides, migration notes,
                            expected-pattern semantics, and performance guidance.
                        </p>
                        <div class="foot">full context · open ↗</div>
                    </a>
                    <a href="/docs/getting-started.md" target="_blank" rel="noopener">
                        <div class="index">03 · page mirrors</div>
                        <h3><code>/docs/&lt;slug&gt;.md</code></h3>
                        <p>
                            Every guide mirrored as clean Markdown, plus runnable Svelte source under
                            <code>/examples/&lt;slug&gt;.md</code> for agents that need implementation detail.
                        </p>
                        <div class="foot">15 mirrors · open ↗</div>
                    </a>
                </div>
                <div class="prompt-example">
                    <span>// example prompt</span>
                    <code>
                        Use <em>https://diff.svelte.page/llms.txt</em> as the source for
                        <em>@humanspeak/svelte-diff</em>. Build a Svelte 5 review panel that compares
                        two editable documents, enables semantic cleanup, styles insertions and
                        removals, and reports <em>onProcessing</em> timing.
                    </code>
                </div>
            </div>
        </section>

        <section class="big-footer">
            <div class="info">
                <div>SET / JETBRAINS MONO + INTER</div>
                <div>HUMANSPEAK · 2026</div>
                <div>MIT LICENCE</div>
                <div class="v">● {packageStats.version}</div>
            </div>
            <button type="button" onclick={copyInstall}>
                npm&nbsp;i&nbsp;<span>@humanspeak/</span><br />svelte-diff
                <small>{copied ? '✓ copied to clipboard' : 'click to copy'}</small>
            </button>
            <div class="info right">
                <div>SHEET 05 / 05</div>
                <div>END OF DOCUMENT</div>
                <a class="v" href="#top">↩ TO TOP</a>
            </div>
        </section>
    </main>

    <FooterV2 version={packageStats.version} />
</div>

<style>
    .brut {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
    }

    .coord {
        display: grid;
        grid-template-columns: repeat(12, 1fr);
        border-bottom: 1px solid var(--brut-rule);
        color: var(--brut-ink-3);
        font-size: 10px;
        letter-spacing: 0.14em;
    }

    .coord div {
        border-right: 1px solid var(--brut-rule);
        padding: 6px 8px;
    }

    .coord div:last-child {
        border-right: 0;
    }

    .hero {
        position: relative;
        display: grid;
        grid-template-columns: 220px 1fr;
        gap: 24px;
        border-bottom: 1px solid var(--brut-rule);
        padding: 80px 24px 32px;
    }

    .meta {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin: 0;
        color: var(--brut-ink);
        font-size: 11px;
    }

    .meta span,
    .corner {
        color: var(--brut-ink-3);
    }

    .meta .accent {
        color: var(--brut-accent);
    }

    .meta hr {
        margin: 8px 0;
        border: 0;
        border-top: 1px dashed var(--brut-rule);
    }

    .hero h1 {
        margin: 0;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: clamp(56px, 11vw, 152px);
        font-weight: 500;
        line-height: 0.88;
        letter-spacing: -0.06em;
        text-transform: lowercase;
    }

    .hero h1 span {
        color: var(--brut-accent);
    }

    .hero h1 .end {
        color: var(--brut-ink-3);
    }

    .hero-body > p {
        max-width: 760px;
        margin: 28px 0 0;
        color: var(--brut-ink-2);
        font: 17px/1.5 'Inter Variable', 'Inter', system-ui, sans-serif;
        letter-spacing: -0.01em;
    }

    .hero-body > p b {
        color: var(--brut-ink);
        font-weight: 600;
    }

    .actions {
        display: flex;
        flex-wrap: wrap;
        align-items: stretch;
        width: fit-content;
        max-width: 100%;
        margin-top: 28px;
    }

    .actions > * {
        position: relative;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin-left: -1px;
        border: 1px solid var(--brut-rule);
        background: var(--brut-bg);
        color: var(--brut-ink);
        padding: 10px 14px;
        font: 13px inherit;
        text-decoration: none;
        cursor: pointer;
    }

    .actions > *:first-child {
        margin-left: 0;
    }

    .actions > *:hover {
        z-index: 2;
        border-color: var(--brut-rule-2);
        background: var(--brut-bg-2);
    }

    .actions .primary {
        border-color: var(--brut-accent);
        background: var(--brut-accent);
        color: var(--brut-accent-ink);
        font-weight: 600;
    }

    .actions .primary:hover {
        border-color: var(--brut-accent-hover);
        background: var(--brut-accent-hover);
    }

    .actions button > span:last-child {
        display: inline-grid;
        height: 20px;
        align-items: center;
        justify-items: center;
        margin-left: 4px;
        overflow: hidden;
        min-width: 62px;
        border: 1px solid var(--brut-rule);
        padding: 2px 8px;
        color: var(--brut-accent);
        font-size: 10.5px;
        text-align: center;
        text-transform: uppercase;
        letter-spacing: 0.14em;
    }

    .actions button {
        gap: 10px;
        background: var(--brut-bg-2);
        color: var(--brut-ink-2);
        padding-right: 18px;
        padding-left: 18px;
    }

    .actions button > span.copied {
        border-color: var(--brut-accent);
        background: var(--brut-accent-soft);
    }

    .prompt {
        color: var(--brut-ink-3);
    }

    .corner {
        position: absolute;
        font-size: 10px;
        letter-spacing: 0.14em;
    }

    .corner.tr { top: 12px; right: 24px; }
    .corner.bl { bottom: 12px; left: 24px; }
    .corner.br { right: 24px; bottom: 12px; }

    .kpis {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        border-bottom: 1px solid var(--brut-rule);
    }

    .kpi {
        position: relative;
        display: flex;
        min-height: 160px;
        flex-direction: column;
        justify-content: space-between;
        border-right: 1px solid var(--brut-rule);
        padding: 28px 24px;
    }

    .kpi:last-child { border-right: 0; }
    .kpi::after { content: attr(data-index); position: absolute; top: 12px; right: 14px; color: var(--brut-ink-3); font-size: 10px; }
    .kpi .key { color: var(--brut-ink-3); font-size: 10.5px; letter-spacing: 0.14em; }
    .kpi .value { display: flex; align-items: baseline; gap: 4px; white-space: nowrap; font-size: 64px; font-weight: 500; line-height: 1; letter-spacing: -0.04em; }
    .kpi .value small { color: inherit; font-size: 22px; font-weight: 500; line-height: 1; letter-spacing: 0; }
    .kpi .note { color: var(--brut-ink-2); font-size: 11px; }
    .kpi.accent .value { color: var(--brut-accent); }

    .demo-section,
    .features,
    .ai-section {
        display: grid;
        grid-template-columns: 220px 1fr;
        gap: 24px;
        border-bottom: 1px solid var(--brut-rule);
        padding: 28px 24px;
    }

    .lede {
        color: var(--brut-ink-3);
        font-size: 10.5px;
        letter-spacing: 0.14em;
    }

    .lede h2 {
        margin: 12px 0 0;
        color: var(--brut-ink);
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 28px;
        font-weight: 500;
        letter-spacing: -0.02em;
        text-transform: lowercase;
    }

    .lede h2 span { color: var(--brut-accent); }
    .lede p { margin: 12px 0 0; color: var(--brut-ink-2); font: 13px/1.55 'Inter Variable', 'Inter', system-ui, sans-serif; letter-spacing: 0; }
    .lede > a { display: inline-block; margin-top: 18px; color: var(--brut-accent); font-size: 11px; text-decoration: none; }
    .lede > a:hover { text-decoration: underline; text-underline-offset: 4px; }

    .demo-panel,
    .ai-panel {
        overflow: hidden;
        border: 1px solid var(--brut-rule);
        background: var(--brut-bg);
    }

    .panel-bar,
    .panel-footer,
    .ai-head {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 18px;
        border-bottom: 1px solid var(--brut-rule);
        background: var(--brut-bg-2);
        padding: 8px 14px;
        color: var(--brut-ink-2);
        font-size: 10.5px;
    }

    .panel-bar i { color: var(--brut-ink-3); font-style: normal; }
    .panel-bar b, .panel-footer b { color: var(--brut-ink); font-weight: 500; }
    .panel-bar .live { margin-left: auto; color: var(--brut-accent); }
    .panel-bar button { border: 1px solid var(--brut-rule); background: transparent; padding: 4px 10px; color: var(--brut-ink-2); font: 11px inherit; cursor: pointer; }
    .panel-bar button:hover { border-color: var(--brut-accent); color: var(--brut-accent); }

    .editors { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid var(--brut-rule); }
    .editors label { display: grid; grid-template-rows: auto 1fr; min-width: 0; }
    .editors label + label { border-left: 1px solid var(--brut-rule); }
    .editors label > span, .output-label { border-bottom: 1px solid var(--brut-rule); padding: 7px 12px; color: var(--brut-ink-3); font-size: 10px; letter-spacing: 0.1em; }
    .editors textarea { min-height: 155px; resize: vertical; border: 0; outline: 0; background: var(--brut-bg); padding: 16px; color: var(--brut-ink-2); font: 12px/1.7 inherit; }
    .editors textarea:focus { box-shadow: inset 0 0 0 1px var(--brut-accent); }

    .output-label { display: flex; justify-content: space-between; border-bottom: 1px solid var(--brut-rule); }
    .rendered-diff { min-height: 130px; padding: 22px; color: var(--brut-ink); font-size: 13px; }
    .panel-footer { justify-content: flex-end; border-top: 1px solid var(--brut-rule); border-bottom: 0; }

    .feature-grid { display: grid; grid-template-columns: repeat(3, 1fr); border-top: 1px solid var(--brut-rule); border-left: 1px solid var(--brut-rule); }
    .feature-grid a { position: relative; min-height: 200px; border-right: 1px solid var(--brut-rule); border-bottom: 1px solid var(--brut-rule); padding: 20px 22px; color: var(--brut-ink); text-decoration: none; }
    .feature-grid a::after { position: absolute; inset: 8px; border: 1px solid transparent; content: ''; pointer-events: none; transition: border-color 0.2s; }
    .feature-grid a:hover::after { border-color: var(--brut-accent); }
    .feature-grid .id { color: var(--brut-ink-3); font-size: 10.5px; letter-spacing: 0.14em; }
    .feature-grid .arrow { position: absolute; top: 14px; right: 16px; color: var(--brut-ink-3); font-size: 10.5px; }
    .feature-grid h3 { position: relative; z-index: 1; margin: 30px 0 8px; color: var(--brut-ink); font: 500 22px 'Inter Variable', 'Inter', system-ui, sans-serif; letter-spacing: -0.02em; }
    .feature-grid p { position: relative; z-index: 1; max-width: 320px; margin: 0; color: var(--brut-ink-2); font: 13.5px/1.55 'Inter Variable', 'Inter', system-ui, sans-serif; }
    .feature-grid i { position: absolute; right: 16px; bottom: 16px; width: 14px; height: 14px; border: 1px solid var(--brut-ink-3); }
    .feature-grid a:nth-child(3n + 1) i { border-color: var(--brut-accent); background: var(--brut-accent); }

    .ai-head { gap: 0; border-bottom: 1px solid var(--brut-rule); padding: 0; font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; }
    .ai-head span { border-right: 1px solid var(--brut-rule); padding: 9px 14px; color: var(--brut-ink-3); }
    .ai-head .active { background: var(--brut-bg); color: var(--brut-ink); }
    .ai-head .spacer { flex: 1; border-right: 0; padding: 0; }
    .ai-head span:last-child { border-right: 0; border-left: 1px solid var(--brut-rule); }
    .ai-grid { display: grid; grid-template-columns: repeat(3, 1fr); }
    .ai-grid > a { display: flex; min-height: 200px; flex-direction: column; border-right: 1px solid var(--brut-rule); padding: 20px 22px 18px; color: var(--brut-ink); text-decoration: none; transition: background 0.16s; }
    .ai-grid > a:last-child { border-right: 0; }
    .ai-grid > a:hover { background: var(--brut-accent-soft); }
    .ai-grid .index { color: var(--brut-ink-3); font-size: 10.5px; letter-spacing: 0.14em; text-transform: uppercase; }
    .ai-grid h3 { margin: 22px 0 10px; color: var(--brut-ink); font: 500 22px 'Inter Variable', 'Inter', system-ui, sans-serif; letter-spacing: -0.02em; }
    .ai-grid h3 code { color: var(--brut-accent); font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace; font-size: 0.85em; }
    .ai-grid p { margin: 0; color: var(--brut-ink-2); font: 13.5px/1.55 'Inter Variable', 'Inter', system-ui, sans-serif; }
    .ai-grid p code { border-radius: 2px; background: var(--brut-bg-2); color: var(--brut-ink); font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace; font-size: 0.92em; }
    .ai-grid .foot { margin-top: auto; padding-top: 22px; color: var(--brut-ink-3); font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; }

    .prompt-example { border-top: 1px solid var(--brut-rule); background: var(--brut-bg-2); padding: 16px 22px; }
    .prompt-example > span { display: block; margin-bottom: 6px; color: var(--brut-ink-3); font-size: 10.5px; letter-spacing: 0.14em; text-transform: uppercase; }
    .prompt-example code { color: var(--brut-ink-2); font: 13px/1.6 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace; }
    .prompt-example em { color: var(--brut-accent); font-style: normal; }

    .big-footer { display: grid; grid-template-columns: 200px 1fr 200px; gap: 24px; align-items: end; border-top: 1px solid var(--brut-rule); padding: 60px 24px 36px; }
    .big-footer > button { position: relative; border: 0; background: transparent; color: var(--brut-ink); padding: 0; font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace; font-size: clamp(40px, 7vw, 96px); line-height: 0.9; letter-spacing: -0.06em; text-align: left; text-transform: lowercase; cursor: pointer; }
    .big-footer > button > span { color: var(--brut-accent); }
    .big-footer > button > small { display: block; height: 16px; min-width: 200px; margin-top: 16px; overflow: hidden; color: var(--brut-ink-3); font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; }
    .big-footer .info { color: var(--brut-ink-3); font-size: 11px; line-height: 1.8; letter-spacing: 0.12em; }
    .big-footer .info.right { text-align: right; }
    .big-footer .info .v,
    .big-footer .info a.v { display: block; margin-top: 12px; color: var(--brut-ink); text-decoration: none; }
    .big-footer .info a.v:hover { color: var(--brut-accent); }

    @media (max-width: 1000px) {
        .kpis { grid-template-columns: repeat(3, 1fr); }
        .kpi:nth-child(3n) { border-right: 0; }
        .kpi:nth-child(-n + 3) { border-bottom: 1px solid var(--brut-rule); }
        .feature-grid { grid-template-columns: repeat(2, 1fr); }
        .ai-grid { grid-template-columns: 1fr; }
        .ai-grid > a { min-height: 185px; border-right: 0; border-bottom: 1px solid var(--brut-rule); }
        .ai-grid > a:last-child { border-bottom: 0; }
    }

    @media (max-width: 760px) {
        .coord { display: none; }
        .hero,
        .demo-section,
        .features,
        .ai-section { grid-template-columns: 1fr; }
        .hero { padding-top: 58px; }
        .hero .meta { display: none; }
        .kpis { grid-template-columns: repeat(2, 1fr); }
        .kpi { min-height: 130px; padding: 22px 18px; }
        .kpi .value { font-size: 44px; }
        .kpi:nth-child(3n) { border-right: 1px solid var(--brut-rule); }
        .kpi:nth-child(2n) { border-right: 0; }
        .kpi:not(:nth-last-child(-n + 2)) { border-bottom: 1px solid var(--brut-rule); }
        .editors { grid-template-columns: 1fr; }
        .editors label + label { border-top: 1px solid var(--brut-rule); border-left: 0; }
        .panel-bar { gap: 10px; }
        .panel-bar .live { margin-left: 0; }
        .feature-grid { grid-template-columns: 1fr; }
        .prompt-example { grid-template-columns: 1fr; }
        .big-footer { grid-template-columns: 1fr; }
        .big-footer .info.right { text-align: left; }
    }
</style>

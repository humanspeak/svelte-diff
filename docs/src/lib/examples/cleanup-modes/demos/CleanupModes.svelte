<script lang="ts">
    import SvelteDiff from '@humanspeak/svelte-diff'

    const originalText = 'The quick brown fox jumps over the lazy dog.'
    const modifiedText = 'The quick red fox leaped over a very lazy dog.'
</script>

<div class="modes">
    <section><h3>raw / no cleanup</h3><div class="diff-output"><SvelteDiff {originalText} {modifiedText} cleanupEfficiency={0} rendererClasses={{ remove: 'diff-remove', insert: 'diff-insert', equal: 'diff-equal' }} /></div></section>
    <section><h3>efficiency / cost 4</h3><div class="diff-output"><SvelteDiff {originalText} {modifiedText} cleanupEfficiency={4} rendererClasses={{ remove: 'diff-remove', insert: 'diff-insert', equal: 'diff-equal' }} /></div></section>
    <section><h3>semantic / readable</h3><div class="diff-output"><SvelteDiff {originalText} {modifiedText} cleanupSemantic rendererClasses={{ remove: 'diff-remove', insert: 'diff-insert', equal: 'diff-equal' }} /></div></section>
</div>

<style>
    .modes { display: grid; grid-template-columns: repeat(3, 1fr); }
    section + section { border-left: 1px solid var(--brut-rule); }
    h3 { margin: 0; padding: 0.65rem 1rem; border-bottom: 1px solid var(--brut-rule); font: 0.65rem var(--font-mono); text-transform: uppercase; letter-spacing: 0.08em; }
    section div { padding: 1.25rem; min-height: 12rem; }
    @media (max-width: 800px) { .modes { grid-template-columns: 1fr; } section + section { border-left: 0; border-top: 1px solid var(--brut-rule); } }
</style>

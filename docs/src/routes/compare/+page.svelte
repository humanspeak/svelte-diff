<script lang="ts">
    import { CompareIndexV2 } from '@humanspeak/docs-kit'
    import { competitors, ours } from '$lib/compare-data'
</script>

<CompareIndexV2
    {competitors}
    {ours}
    introHtml="Honest, side-by-side comparisons of <b>@humanspeak/svelte-diff</b> against the JavaScript diff tools you would otherwise reach for — <b>jsdiff</b>, <b>diff-match-patch</b>, and <b>diff2html</b>. Feature matrices, strengths, limitations, and the use case each tool actually fits."
/>

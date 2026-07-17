import { error } from '@sveltejs/kit'
import { competitors, getCompetitor } from '$lib/compare-data'
import type { EntryGenerator, PageLoad } from './$types'

export const prerender = true

export const entries: EntryGenerator = () => competitors.map((c) => ({ slug: c.slug }))

export const load: PageLoad = ({ params }) => {
    const competitor = getCompetitor(params.slug)
    if (!competitor) {
        error(404, `No comparison found for "${params.slug}"`)
    }
    return { competitor }
}

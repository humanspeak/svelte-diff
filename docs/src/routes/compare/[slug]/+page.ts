import { createCompareSlugLoad } from '@humanspeak/docs-kit'
import { competitors } from '$lib/compare-data'

export const prerender = true
export const { entries, load } = createCompareSlugLoad(competitors)
